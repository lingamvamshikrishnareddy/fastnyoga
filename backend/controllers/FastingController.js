console.log(`[FastingController.js] --- STARTING FILE EXECUTION ---`);

const mongoose = require('mongoose');
const Fast = require('../models/Fast');
const User = require('../models/User');
const { isValidDate } = require('../utils/validation');
const redis = require('../config/redis');
const logger = require('../utils/logger');


// Constants
const STREAK_RESET_HOURS = 48;
const MAX_FASTING_HOURS = 168; // 7 days
const MIN_FASTING_HOURS = 1;
const DEFAULT_PAGE_SIZE = 10;
const CACHE_TTL = 3600; // 1 hour cache TTL

/**
 * Get fasting tips based on elapsed hours - using cache-friendly approach
 */
const fastingTips = {
    12: "Stay hydrated and try to keep busy to distract from hunger.",
    16: "Your body is entering ketosis. Stay hydrated and consider light exercise.",
    24: "You're in deep ketosis. Listen to your body and break the fast if you feel unwell.",
    36: "Extended fasting requires careful monitoring. Consider consulting a healthcare professional.",
    48: "You're in an extended fast. Focus on electrolytes and rest if needed.",
    72: "Multi-day fasting can have powerful benefits but should be done with caution.",
    default: "Extended fasting requires careful monitoring. Consider consulting a healthcare professional."
};

const getFastingTips = (hours) => {
    const thresholds = Object.keys(fastingTips)
        .map(Number)
        .sort((a, b) => a - b);

    for (const threshold of thresholds) {
        // Check against numeric thresholds, excluding 'default'
        if (!isNaN(threshold) && hours <= threshold) {
            return fastingTips[threshold];
        }
    }
    // If hours exceed all numeric thresholds or thresholds array is empty
    return fastingTips.default;
};


/**
 * Batch update user achievements
 * Uses efficient MongoDB update operations and caching
 */
const updateUserAchievements = async (userId, lastFastEndTime) => {
    const now = new Date();
    let updateOps = {};
    let needsBadgeCheck = false; // Flag to check if badge calculation is needed

    // --- Streak Logic ---
    // Use lean for performance when only checking existence/time
    const userForStreak = await User.findById(userId).select('streak lastFastEndTime badges').lean();

    // If lastFastEndTime is passed, use it; otherwise, use the one from the user doc
    const relevantLastEndTime = lastFastEndTime || userForStreak?.lastFastEndTime;

    if (!relevantLastEndTime || (now.getTime() - new Date(relevantLastEndTime).getTime()) > STREAK_RESET_HOURS * 60 * 60 * 1000) {
        updateOps.streak = 1;
        updateOps.lastFastEndTime = now; // Set the end time of the *current* fast
        needsBadgeCheck = true; // Resetting streak might affect badges
    } else {
        // Check if the current fast's end time is significantly different from the stored one
        // Avoid incrementing streak multiple times for the same logical "day" or period if updates happen close together.
        // This logic depends heavily on how `lastFastEndTime` is managed elsewhere. Assuming it's the end of the *previous* completed fast.
        // Let's simplify: We increment based on the `lastFastEndTime` passed from the `endFast` context.
        updateOps.$inc = { streak: 1 };
        updateOps.lastFastEndTime = now; // Update with the end time of the *current* fast
        needsBadgeCheck = true; // Incrementing streak always requires badge check
    }

    // --- Badge Logic ---
    // We need the potentially updated streak value for calculations
    // If streak is being reset to 1, newStreak is 1.
    // If streak is being incremented, newStreak is user's current streak + 1.
    const currentStreak = userForStreak?.streak || 0;
    const newStreak = updateOps.streak === 1 ? 1 : currentStreak + 1;
    const currentBadges = userForStreak?.badges || [];

    if (needsBadgeCheck) {
        const badgesToAdd = [];

        // Weekly Warrior badge
        if (newStreak > 0 && newStreak % 7 === 0 && !currentBadges.includes('Weekly Warrior')) {
            badgesToAdd.push('Weekly Warrior');
        }

        // Monthly Master badge
        if (newStreak > 0 && newStreak % 30 === 0 && !currentBadges.includes('Monthly Master')) {
            badgesToAdd.push('Monthly Master');
        }

        // Ketosis King/Queen badge - based on completing 24+ hour fasts
        // Run this check only if the badge isn't already present
        if (!currentBadges.includes('Ketosis Champion')) {
            const longFastsCount = await Fast.countDocuments({
                user: userId,
                completed: true,
                elapsedTime: { $gte: 24 * 60 * 60 * 1000 }
            });

            // Count includes the fast just completed if it meets the criteria
            if (longFastsCount >= 5) {
                badgesToAdd.push('Ketosis Champion');
            }
        }

        if (badgesToAdd.length > 0) {
            // Ensure $addToSet exists and is an object
             updateOps.$addToSet = updateOps.$addToSet || {};
             // Ensure badges field inside $addToSet exists and is an array
             updateOps.$addToSet.badges = updateOps.$addToSet.badges || [];
             // Add new badges ensuring no duplicates if called multiple times within this logic
             updateOps.$addToSet.badges = [...new Set([...updateOps.$addToSet.badges, ...badgesToAdd])];
        }
    }


    // Update user with all changes in one operation
    if (Object.keys(updateOps).length > 0) {
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateOps,
            { new: true, select: 'streak badges lastFastEndTime' } // Select fields needed later or for response
        ).lean(); // Use lean if you don't need mongoose methods afterwards

        // Update cache
        if (updatedUser) {
            try {
                await redis.setex(`user:${userId}:achievements`, CACHE_TTL, JSON.stringify({
                    streak: updatedUser.streak,
                    badges: updatedUser.badges
                }));
                // Also clear general user stats cache as streak changed
                await redis.del(`user:${userId}:stats`);
                await redis.del(`user:${userId}:dashboard`);
            } catch (err) {
                logger.warn('Redis caching error during achievement update:', err);
                // Non-critical error, continue execution
            }
            return updatedUser; // Return the updated user data
        }
    }

    // If no updates were needed, return the necessary current data
    return {
      streak: newStreak, // Return the calculated potential new streak
      badges: currentBadges, // Return existing badges if no updates occurred
      lastFastEndTime: userForStreak?.lastFastEndTime // Return existing end time
    };
};


/**
 * FastingController with optimizations for high scalability
 */
const FastingController = {
    /**
     * Start a new fasting session with optimized DB operations
     */
    async startFast(req, res) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // --- Enhanced Logging & userId Retrieval ---
            logger.debug('[startFast] Function entered.');
            // Log the raw req.user object received from middleware
            // Use JSON.stringify to handle potential circular references or complex objects gracefully
            try {
                 logger.debug('[startFast] Raw req.user object received:', JSON.stringify(req.user, null, 2));
             } catch (stringifyError) {
                 logger.warn('[startFast] Could not stringify req.user object. Raw object:', req.user);
             }


            let userId = null;
            let userIdSource = 'none'; // Track where we got the ID from

            if (req.user) {
                // Prefer 'id' if it exists (often set by JWT strategies using 'id' in payload)
                if (req.user.id) {
                    userId = req.user.id;
                    userIdSource = 'req.user.id';
                // Fallback to '_id' (common for Mongoose documents attached directly)
                } else if (req.user._id) {
                    userId = req.user._id;
                    userIdSource = 'req.user._id';
                // Add another fallback if user object *is* the ID string directly (less common)
                 } else if (typeof req.user === 'string' && mongoose.Types.ObjectId.isValid(req.user)) {
                     userId = req.user;
                     userIdSource = 'req.user (as string)';
                 } else {
                      logger.warn(`[startFast] Found req.user object, but neither 'id' nor '_id' property contains the user ID. req.user keys: ${Object.keys(req.user).join(', ')}`);
                  }
                logger.debug(`[startFast] Attempted retrieval: Found potential ID from ${userIdSource}. Raw Value: ${userId}`);
            } else {
                logger.warn('[startFast] req.user object itself is missing or falsy!');
            }

            // Convert potential ObjectId to string (Crucial for Mongoose queries/validation consistency)
            if (userId && typeof userId !== 'string') {
                // Check if it's a Mongoose ObjectId or looks like one before converting
                 if (userId instanceof mongoose.Types.ObjectId || (typeof userId === 'object' && userId.toString && typeof userId.toString === 'function')) {
                     try {
                         const originalId = userId;
                         userId = userId.toString(); // Convert ObjectId/compatible object to string
                         logger.debug(`[startFast] Converted userId (Type: ${typeof originalId}) to string: ${userId}`);
                     } catch (conversionError) {
                         logger.error(`[startFast] Error converting userId object from ${userIdSource} to string:`, conversionError);
                         userId = null; // Invalidate if conversion fails
                     }
                 } else {
                      logger.warn(`[startFast] userId from ${userIdSource} is an object but not a recognizable ObjectId or convertible type. Type: ${typeof userId}. Value: ${JSON.stringify(userId)}`);
                      userId = null; // Invalidate if it's an unexpected object type
                 }
            } else if (userId && typeof userId === 'string') {
                 logger.debug(`[startFast] userId from ${userIdSource} is already a string: ${userId}`);
            }


            // Final validation of userId BEFORE proceeding
            if (!userId || typeof userId !== 'string' || !mongoose.Types.ObjectId.isValid(userId)) {
                 logger.error(`[startFast] Critical Error: Invalid or missing userId after all checks. Final Value: '${userId}' (Type: ${typeof userId}). Source: ${userIdSource}. req.user dump: ${JSON.stringify(req.user)}`);
                 await session.abortTransaction();
                 // Send a generic 500 but log specifics server-side
                 return res.status(500).json({ success: false, message: 'Internal Server Error (User identification failed)' });
            }
            logger.info(`[startFast] Proceeding with valid userId: ${userId} (Source: ${userIdSource})`);
            // --- End Enhanced Logging ---


            // Now extract body parameters - AFTER userId is confirmed valid
            const { targetHours, startTime } = req.body;


            // Check if an active fast already exists for this user
            const existingFast = await Fast.findOne(
                { user: userId, isRunning: true }, // Use the validated string userId
                { _id: 1 }, // Only need to check for existence
                { session, lean: true } // Use lean for performance
            );

            if (existingFast) {
                logger.warn(`[startFast] User ${userId} already has an active fast.`);
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    message: 'You already have an active fast. Please end it before starting a new one.'
                });
            }

            // --- Input Validation ---
            const numericTargetHours = Number(targetHours);
            if (targetHours === undefined || !Number.isFinite(numericTargetHours) ||
                numericTargetHours < MIN_FASTING_HOURS || numericTargetHours > MAX_FASTING_HOURS) {
                logger.warn(`[startFast] Invalid targetHours received: ${targetHours}`);
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    message: `Invalid target hours. Please enter a duration between ${MIN_FASTING_HOURS} and ${MAX_FASTING_HOURS} hours.`
                });
            }

            const startTimeDate = startTime ? new Date(startTime) : new Date();

            if (!isValidDate(startTimeDate)) {
                logger.warn(`[startFast] Invalid startTime received: ${startTime}`);
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    message: 'Invalid start time provided.'
                });
            }

            // Check if start time is in the future
            const now = new Date();
            if (startTimeDate > now) {
                 logger.warn(`[startFast] Future startTime received: ${startTimeDate.toISOString()}`);
                 await session.abortTransaction();
                 return res.status(400).json({
                     success: false,
                     message: 'Start time cannot be in the future.'
                 });
             }

            const endTimeDate = new Date(startTimeDate.getTime() + (numericTargetHours * 60 * 60 * 1000));

            // --- Prepare Fast Document Data ---
            const fastData = {
                user: userId, // Use the validated userId string
                startTime: startTimeDate,
                endTime: endTimeDate, // Predicted end time based on target
                targetHours: numericTargetHours,
                isRunning: true,
                completed: false, // Explicitly false on start
            };
            logger.debug('[startFast] Prepared fast data for creation:', fastData);


            // --- Create Fast Document in DB ---
            // Use Model.create within the session. It expects an array.
            const creationResult = await Fast.create([fastData], { session });
            logger.debug('[startFast] Fast.create executed. Result:', creationResult);

            // Validate creation result
            if (!creationResult || creationResult.length === 0 || !creationResult[0]) {
                 logger.error('[startFast] Fast.create did not return the expected document.');
                 throw new Error('Database error: Failed to create fast record.');
            }
            const createdFastDocument = creationResult[0]; // Get the created document


            // --- Cache the Current Fast ---
            try {
                // Ensure we use the document returned from create/save and convert to plain object
                await redis.setex(`user:${userId}:currentFast`, CACHE_TTL, JSON.stringify(createdFastDocument.toObject()));
                logger.info(`[startFast] Cached new current fast ${createdFastDocument._id} for user ${userId}`);
            } catch (err) {
                // Log cache error but don't fail the request
                logger.warn(`[startFast] Redis caching error for user ${userId} (non-critical):`, err);
            }

            // --- Commit Transaction ---
            await session.commitTransaction();
            logger.info(`[startFast] Transaction committed. Fast ${createdFastDocument._id} started successfully for user ${userId}.`);


            // --- Send Success Response ---
            res.status(201).json({
                success: true,
                // Return the plain object version of the created document
                fast: createdFastDocument.toObject(),
                message: 'Fast started successfully'
            });

        } catch (error) {
            // --- Error Handling & Transaction Rollback ---
            logger.error(`[startFast] Error caught during execution: ${error.message}`, error.stack);
            if (session.inTransaction()) {
                try {
                     await session.abortTransaction();
                     logger.info('[startFast] Transaction aborted due to error.');
                 } catch (abortError) {
                     logger.error('[startFast] Error aborting transaction:', abortError);
                 }
            }

            // Check for specific Mongoose validation error
            if (error instanceof mongoose.Error.ValidationError) {
                 logger.error('[startFast] Validation Error Details:', error.errors);
                 // Send 400 for validation errors
                 res.status(400).json({
                     success: false,
                     message: 'Validation failed.',
                     error: error.message, // Mongoose provides a descriptive message
                     details: error.errors // Optionally include detailed field errors
                 });
             } else {
                 // Send 500 for other server errors
                 res.status(500).json({
                     success: false,
                     message: 'Server error while starting fast.',
                     // Avoid sending raw error messages in production if they might leak sensitive info
                     error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : error.message
                 });
             }
        } finally {
            // --- End Session ---
            // Ensure the session is always closed
            if (session) {
                 session.endSession();
                 logger.debug('[startFast] Mongoose session ended.');
             }
        }
    },

    /**
     * End current fasting session with optimized performance
     */
    async endFast(req, res) {
        // Use more specific logging tag
        const logPrefix = '[endFast]';
        logger.debug(`${logPrefix} Function entered.`);

        let session; // Define session variable

        try {
            // Start session early
            session = await mongoose.startSession();
            session.startTransaction();
            logger.debug(`${logPrefix} Mongoose session started and transaction initiated.`);

            // --- Extract Request Parameters ---
            const { fastId } = req.params;
            const { mood, weightEnd, notes } = req.body; // Extract optional fields

            logger.debug(`${logPrefix} Request details: fastId='${fastId}', body='${JSON.stringify(req.body)}'`);

            // Validate fastId format
            if (!mongoose.Types.ObjectId.isValid(fastId)) {
                logger.warn(`${logPrefix} Invalid fastId format received: ${fastId}`);
                await session.abortTransaction(); // Abort before sending response
                return res.status(400).json({ success: false, message: 'Invalid Fast ID format.' });
            }


            // --- Robust User ID Retrieval ---
            logger.debug(`${logPrefix} Retrieving user ID.`);
            try {
                 logger.debug(`${logPrefix} Raw req.user object received:`, JSON.stringify(req.user, null, 2));
             } catch (stringifyError) {
                 logger.warn(`${logPrefix} Could not stringify req.user object. Raw object:`, req.user);
             }

            let userId = null;
            let userIdSource = 'none';

            if (req.user) {
                if (req.user.id) { userId = req.user.id; userIdSource = 'req.user.id'; }
                else if (req.user._id) { userId = req.user._id; userIdSource = 'req.user._id'; }
                else if (typeof req.user === 'string' && mongoose.Types.ObjectId.isValid(req.user)) { userId = req.user; userIdSource = 'req.user (as string)';}
                 else { logger.warn(`${logPrefix} Found req.user object, but no 'id' or '_id'. Keys: ${Object.keys(req.user).join(', ')}`); }
                logger.debug(`${logPrefix} Attempted retrieval from ${userIdSource}. Raw Value: ${userId}`);
            } else {
                logger.warn(`${logPrefix} req.user object is missing or falsy!`);
            }

            if (userId && typeof userId !== 'string') {
                 if (userId instanceof mongoose.Types.ObjectId || (typeof userId === 'object' && userId.toString && typeof userId.toString === 'function')) {
                     try { userId = userId.toString(); logger.debug(`${logPrefix} Converted userId to string: ${userId}`); }
                     catch (conversionError) { logger.error(`${logPrefix} Error converting userId to string:`, conversionError); userId = null; }
                 } else { logger.warn(`${logPrefix} userId from ${userIdSource} is unexpected object type. Type: ${typeof userId}.`); userId = null; }
            } else if (userId && typeof userId === 'string') {
                 logger.debug(`${logPrefix} userId from ${userIdSource} is already string: ${userId}`);
            }

            if (!userId || typeof userId !== 'string' || !mongoose.Types.ObjectId.isValid(userId)) {
                 logger.error(`${logPrefix} Critical Error: Invalid or missing userId after checks. Final Value: '${userId}' (Type: ${typeof userId}). Source: ${userIdSource}.`);
                 await session.abortTransaction();
                 return res.status(500).json({ success: false, message: 'Internal Server Error (User identification failed)' });
            }
            logger.info(`${logPrefix} Proceeding for user ${userId} to end fast ${fastId}.`);
            // --- End User ID Retrieval ---


            // --- Fetch the Fast Document ---
            // Find the specific fast belonging to the user, ensuring it's currently running
            // IMPORTANT: Do NOT use .lean() here because we need to .save() the document later.
            const fast = await Fast.findOne({
                _id: fastId,
                user: userId, // Match user ID
            }).session(session); // Execute within the transaction

            // Check if fast was found
            if (!fast) {
                logger.warn(`${logPrefix} Fast not found (ID: ${fastId}, User: ${userId}) or does not belong to user.`);
                await session.abortTransaction();
                return res.status(404).json({
                    success: false,
                    message: 'Active fast not found for this user.'
                });
            }
            logger.debug(`${logPrefix} Found fast document: ${fast._id}`);

            // Check if the fast is actually running
            if (!fast.isRunning) {
                logger.warn(`${logPrefix} Attempted to end fast ${fastId} which is already completed or cancelled (isRunning=false).`);
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    message: 'This fast is not currently running.'
                });
            }

            // --- Update Fast Details ---
            logger.debug(`${logPrefix} Updating fast document details for ${fastId}.`);
            const now = new Date();
            // Ensure startTime is a Date object before calculation
            const startTime = fast.startTime instanceof Date ? fast.startTime : new Date(fast.startTime);
            const elapsedTime = Math.max(0, now.getTime() - startTime.getTime()); // Calculate elapsed time in ms

            fast.endTime = now;
            fast.completed = true;
            fast.isRunning = false;
            fast.elapsedTime = elapsedTime;

            // Add optional fields IF they were provided in the request body
            if (mood !== undefined && mood !== null) {
                const numericMood = Number(mood);
                if (!isNaN(numericMood)) { // Basic validation
                    fast.mood = numericMood;
                    logger.debug(`${logPrefix} Updated mood to: ${fast.mood}`);
                } else {
                    logger.warn(`${logPrefix} Invalid mood value received: ${mood}. Skipping update.`);
                }
            }
            if (weightEnd !== undefined && weightEnd !== null) {
                 const numericWeight = Number(weightEnd);
                 if (!isNaN(numericWeight) && numericWeight > 0) { // Basic validation
                     fast.weightEnd = numericWeight;
                     logger.debug(`${logPrefix} Updated weightEnd to: ${fast.weightEnd}`);
                 } else {
                     logger.warn(`${logPrefix} Invalid weightEnd value received: ${weightEnd}. Skipping update.`);
                 }
             }
            if (notes !== undefined) { // Allow empty string for notes
                fast.notes = notes;
                logger.debug(`${logPrefix} Updated notes.`);
            }

            // --- Save Updated Fast ---
            // Save the modified fast document within the session
            const savedFast = await fast.save({ session });
            logger.info(`${logPrefix} Successfully saved updated fast document ${savedFast._id}.`);


            // --- Update User Achievements ---
            // Get the end time of the *previous* completed fast for accurate streak calculation
            logger.debug(`${logPrefix} Fetching last completed fast for user ${userId} (excluding current one ${savedFast._id}) for streak calculation.`);
            const lastCompletedFast = await Fast.findOne(
                {
                    user: userId,
                    completed: true,
                    _id: { $ne: savedFast._id } // Exclude the one we just saved
                },
                { endTime: 1 }, // Only need the endTime field
                { session, sort: { endTime: -1 }, lean: true } // Find the most recent one, use lean is ok here
            );
            logger.debug(`${logPrefix} Last completed fast found: ${lastCompletedFast ? lastCompletedFast._id : 'None'}`);

            // Call achievement update function, passing the validated userId and the end time of the previous fast
            logger.debug(`${logPrefix} Updating user achievements for user ${userId}. Previous fast end time: ${lastCompletedFast?.endTime}`);
            const updatedUserAchievements = await updateUserAchievements(userId, lastCompletedFast?.endTime); // Ensure this function exists and works
            logger.info(`${logPrefix} User achievements updated for user ${userId}. New streak: ${updatedUserAchievements?.streak}`);


            // --- Invalidate Cache ---
            logger.debug(`${logPrefix} Invalidating relevant Redis caches for user ${userId}.`);
            try {
                const cacheKeysToDelete = [
                    `user:${userId}:currentFast`,    // Remove current fast
                    `user:${userId}:fastHistory`, // History list will change
                    `user:${userId}:stats`,       // Stats will change
                    `user:${userId}:dashboard`,   // Dashboard data will change
                    `user:${userId}:insights` ,    // Insights might change
                    `user:${userId}:achievements` // Achievements (streak/badges) changed
                ];
                // Use Promise.allSettled for robustness - don't fail request if one key fails
                const results = await Promise.allSettled(cacheKeysToDelete.map(key => redis.del(key)));
                results.forEach((result, index) => {
                    if (result.status === 'rejected') {
                        logger.warn(`${logPrefix} Failed to delete cache key '${cacheKeysToDelete[index]}':`, result.reason);
                    }
                });
                logger.info(`${logPrefix} Cache invalidation process completed for user ${userId}.`);
            } catch (err) {
                // Log but don't fail the request for cache errors
                logger.warn(`${logPrefix} Redis cache invalidation error during endFast for user ${userId} (non-critical):`, err);
            }

            // --- Commit Transaction ---
            await session.commitTransaction();
            logger.info(`${logPrefix} Transaction committed successfully for ending fast ${fastId}.`);


            // --- WebSocket Notification ---
            // Dispatch event for WebSocket notification if configured
            if (global.io && global.io.sockets) {
                const notificationData = {
                    type: 'fastCompleted',
                    fastId: savedFast._id.toString(),
                    streak: updatedUserAchievements?.streak,
                    badges: updatedUserAchievements?.badges
                };
                 global.io.to(`user:${userId}`).emit('fastingUpdated', notificationData);
                 logger.info(`${logPrefix} WebSocket event 'fastingUpdated' emitted for user ${userId}. Data: ${JSON.stringify(notificationData)}`);
             } else {
                 logger.debug(`${logPrefix} WebSocket server (global.io) not available, skipping notification.`);
             }


            // --- Prepare and Send Response ---
            // Convert savedFast to a plain object for the response
            const responseFast = savedFast.toObject();
            const responsePayload = {
                success: true,
                fast: { // Send back relevant details of the ended fast
                    _id: responseFast._id,
                    startTime: responseFast.startTime,
                    endTime: responseFast.endTime,
                    elapsedTime: responseFast.elapsedTime,
                    completed: responseFast.completed,
                    isRunning: responseFast.isRunning,
                    mood: responseFast.mood,
                    weightEnd: responseFast.weightEnd,
                    notes: responseFast.notes,
                    targetHours: responseFast.targetHours,
                },
                user: { // Send back updated user achievement info
                    streak: updatedUserAchievements?.streak,
                    badges: updatedUserAchievements?.badges
                },
                message: 'Fast ended successfully.'
            };
             logger.debug(`${logPrefix} Sending success response for fast ${fastId}. Payload: ${JSON.stringify(responsePayload)}`);
             res.json(responsePayload);

        } catch (error) {
            // --- Error Handling & Rollback ---
            logger.error(`${logPrefix} Error caught during execution for fast ${req.params.fastId}, user ${req.user?.id || 'UNKNOWN'}: ${error.message}`, error.stack);
            // Abort transaction if it's still active and an error occurred
            if (session && session.inTransaction()) {
                 try {
                     await session.abortTransaction();
                     logger.info(`${logPrefix} Transaction aborted due to error.`);
                 } catch (abortError) {
                     // Log error during abort, but proceed with sending error response
                     logger.error(`${logPrefix} Error aborting transaction:`, abortError);
                 }
             }

            // Send appropriate error response
            // Check for specific error types if needed (e.g., validation)
             res.status(500).json({
                 success: false,
                 message: 'Server error while ending fast.',
                 error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : error.message
             });
        } finally {
            // --- End Session ---
            // Ensure the session is always closed
            if (session) {
                 session.endSession();
                 logger.debug(`${logPrefix} Mongoose session ended.`);
             }
        }
    }, // End of endFast method

    /**
     * Get current active fasting session with caching
     */
    async getCurrentFast(req, res) {
        try {
            const userId = req.user.id;
            const cacheKey = `user:${userId}:currentFast`;
            let currentFast;

            // Try to get from cache first
            try {
                const cachedFast = await redis.get(cacheKey);
                if (cachedFast) {
                    currentFast = JSON.parse(cachedFast);
                    logger.info(`Current fast cache hit for user ${userId}`);
                } else {
                    logger.info(`Current fast cache miss for user ${userId}`);
                }
            } catch (err) {
                logger.warn(`Redis get error for ${cacheKey}:`, err);
                // Continue to DB on cache error
            }

            // If not in cache or cache failed, get from DB
            if (!currentFast) {
                currentFast = await Fast.findOne(
                    { user: userId, isRunning: true },
                    null, // Select all fields or specify needed ones
                    { lean: true } // Use lean for read-only operation
                );

                // Update cache if found in DB
                if (currentFast) {
                    try {
                        await redis.setex(
                            cacheKey,
                            CACHE_TTL,
                            JSON.stringify(currentFast)
                        );
                         logger.info(`Current fast cache set for user ${userId}`);
                    } catch (err) {
                        logger.warn(`Redis set error for ${cacheKey}:`, err);
                    }
                }
            }

            if (!currentFast) {
                return res.status(404).json({
                    success: false,
                    message: 'No active fast found.'
                });
            }

            // Calculate dynamic properties
            const now = new Date();
            // Ensure startTime is a Date object for calculations
            const startTime = currentFast.startTime instanceof Date ? currentFast.startTime : new Date(currentFast.startTime);
            const elapsedTime = Math.max(0, now.getTime() - startTime.getTime()); // Use getTime()
            const targetHours = currentFast.targetHours || 16; // Default if somehow missing
            const targetMs = targetHours * 60 * 60 * 1000;
            const remainingTime = Math.max(0, targetMs - elapsedTime);
            // Ensure targetMs is not zero to avoid division by zero
            const progressPercentage = targetMs > 0 ? Math.min(100, (elapsedTime / targetMs) * 100) : 0;


            // Calculate elapsed hours for tips
             const elapsedHours = elapsedTime / (60 * 60 * 1000);

             res.json({
                 success: true,
                 fast: currentFast, // The raw fast object from cache/DB
                 elapsedTime,       // Calculated elapsed time in ms
                 remainingTime,     // Calculated remaining time in ms
                 progressPercentage,// Calculated progress
                 tip: getFastingTips(elapsedHours) // Get tip based on hours
             });
        } catch (error) {
            logger.error(`Error fetching current fast for user ${req.user.id}:`, error);
            res.status(500).json({
                success: false,
                message: 'Server error fetching current fast',
                error: error.message
            });
        }
    },


    /**
     * Get paginated list of user's fasting sessions with efficient querying
     */
    async getUserFasts(req, res) {
        try {
            const userId = req.user.id;
            // Sanitize and validate pagination parameters
            const page = Math.max(1, parseInt(req.query.page, 10) || 1);
            const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || DEFAULT_PAGE_SIZE)); // Add max limit
            const sortBy = ['startTime', 'endTime', 'elapsedTime', 'targetHours'].includes(req.query.sortBy) ? req.query.sortBy : 'endTime'; // Default sort and validation
            const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1; // Default desc
            const cacheKey = `user:${userId}:fastHistory:${page}:${limit}:${sortBy}:${sortOrder}`;

            // Try cache first
            try {
                const cachedData = await redis.get(cacheKey);
                if (cachedData) {
                    logger.info(`Fast history cache hit for user ${userId}, page ${page}`);
                    return res.json(JSON.parse(cachedData));
                }
                 logger.info(`Fast history cache miss for user ${userId}, page ${page}`);
            } catch (err) {
                logger.warn(`Redis get error for ${cacheKey}:`, err);
            }

            // Define the query conditions
            const query = { user: userId };

            // Use Promise.all for parallel queries - more efficient
            const [fasts, total] = await Promise.all([
                Fast.find(query)
                    .sort({ [sortBy]: sortOrder })
                    .skip((page - 1) * limit)
                    .limit(limit)
                    .select('-__v -user') // Exclude unnecessary fields, user is known
                    .lean(), // Use lean for better performance on read operations
                Fast.countDocuments(query) // Count documents matching the query
            ]);

            const totalPages = Math.ceil(total / limit);
            const result = {
                success: true,
                data: fasts,
                pagination: {
                    currentPage: page,
                    totalPages: totalPages,
                    totalItems: total,
                    pageSize: limit,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1,
                    sortBy: sortBy,
                    sortOrder: sortOrder === 1 ? 'asc' : 'desc'
                }
            };


            // Cache the result
            if (fasts.length > 0 || total === 0) { // Cache even empty results
                try {
                    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
                     logger.info(`Fast history cache set for user ${userId}, page ${page}`);
                } catch (err) {
                    logger.warn(`Redis set error for ${cacheKey}:`, err);
                }
            }

            res.json(result);
        } catch (error) {
            logger.error(`Error fetching user fasts for user ${req.user.id}:`, error);
            res.status(500).json({
                success: false,
                message: 'Server error fetching fasting history',
                error: error.message
            });
        }
    },

    /**
     * Get user stats with efficient aggregation pipeline and caching
     */
    async getUserStats(req, res) {
        try {
            const userId = req.user.id;
            // Validate userId if necessary, though req.user.id should be reliable
             if (!mongoose.Types.ObjectId.isValid(userId)) {
                 return res.status(400).json({ success: false, message: 'Invalid user ID format.' });
             }
            const cacheKey = `user:${userId}:stats`;

            // Try to get from cache first
            try {
                const cachedStats = await redis.get(cacheKey);
                if (cachedStats) {
                    logger.info(`User stats cache hit for user ${userId}`);
                    return res.json({
                        success: true,
                        stats: JSON.parse(cachedStats)
                    });
                }
                logger.info(`User stats cache miss for user ${userId}`);
            } catch (err) {
                logger.warn(`Redis get error for ${cacheKey}:`, err);
                // Continue to DB on cache miss/error
            }

            // Use MongoDB aggregation pipeline for efficient stats calculation
            const pipeline = [
                {
                    $match: {
                        user: new mongoose.Types.ObjectId(userId), // Ensure ObjectId type
                        completed: true,
                        elapsedTime: { $exists: true, $ne: null, $gt: 0 } // Ensure elapsedTime is valid for calculations
                    }
                },
                {
                    $group: {
                        _id: null, // Group all documents for the user
                        totalFasts: { $sum: 1 },
                        // Calculate hours directly in the aggregation
                        totalHours: { $sum: { $divide: ["$elapsedTime", 3600000] } }, // ms to hours
                        avgDurationMs: { $avg: "$elapsedTime" }, // Keep avg in ms for precision before rounding
                        longestFastMs: { $max: "$elapsedTime" },
                        shortestFastMs: { $min: "$elapsedTime" },
                         // Average mood only if mood exists and is numeric
                         avgMood: { $avg: { $ifNull: ["$mood", null] } } // Use $ifNull to handle missing moods gracefully
                    }
                },
                {
                     $project: {
                         _id: 0, // Exclude the _id field
                         totalFasts: 1,
                         totalHours: { $round: ["$totalHours", 1] }, // Round total hours
                         // Convert avg duration to hours and round
                         avgDuration: { $round: [{ $divide: ["$avgDurationMs", 3600000] }, 1] },
                         longestFast: { $round: [{ $divide: ["$longestFastMs", 3600000] }, 1] },
                         shortestFast: { $round: [{ $divide: ["$shortestFastMs", 3600000] }, 1] },
                         // Round average mood if it was calculated (not null)
                         avgMood: { $cond: { if: { $ne: ["$avgMood", null] }, then: { $round: ["$avgMood", 1] }, else: null } }
                     }
                 }
            ];

            // Execute the aggregation with indexing hint for performance
            // Ensure indexes exist on user, completed, and elapsedTime
             const aggregationResult = await Fast.aggregate(pipeline).hint({ user: 1, completed: 1 }).exec();


            // Format the result, providing defaults if no completed fasts found
             let stats = aggregationResult.length > 0 ? aggregationResult[0] : {
                 totalFasts: 0,
                 totalHours: 0,
                 avgDuration: 0,
                 longestFast: 0,
                 shortestFast: 0,
                 avgMood: null // Default avgMood to null
             };


            // Get user streak and badges - check achievements cache first
             let userAchievements = null;
             const achievementsCacheKey = `user:${userId}:achievements`;
             try {
                 const cachedAchievements = await redis.get(achievementsCacheKey);
                 if (cachedAchievements) {
                     userAchievements = JSON.parse(cachedAchievements);
                      logger.info(`User achievements cache hit for user ${userId}`);
                 } else {
                      logger.info(`User achievements cache miss for user ${userId}`);
                 }
             } catch (err) {
                 logger.warn(`Redis get error for ${achievementsCacheKey}:`, err);
             }


             // If not in cache, fetch from DB
             if (!userAchievements) {
                 const user = await User.findById(userId).select('streak badges').lean();
                 userAchievements = {
                     streak: user?.streak || 0,
                     badges: user?.badges || []
                 };
                 // Optionally cache this if fetched from DB
                  try {
                       await redis.setex(achievementsCacheKey, CACHE_TTL, JSON.stringify(userAchievements));
                        logger.info(`User achievements cache set for user ${userId}`);
                  } catch (setErr) {
                       logger.warn(`Redis set error for ${achievementsCacheKey}:`, setErr);
                  }
             }


            // Add streak and badges to the stats object
            stats.streak = userAchievements.streak;
            stats.badges = userAchievements.badges;

            // Cache the combined result
            try {
                await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(stats));
                logger.info(`User stats cache set for user ${userId}`);
            } catch (err) {
                logger.warn(`Redis set error for ${cacheKey}:`, err);
            }

            res.json({
                success: true,
                stats
            });
        } catch (error) {
            logger.error(`Error fetching user stats for user ${req.user.id}:`, error);
             // Check for specific mongoose errors if needed
             if (error instanceof mongoose.Error.CastError) {
                 return res.status(400).json({ success: false, message: 'Invalid ID format provided.' });
             }
            res.status(500).json({
                success: false,
                message: 'Server error fetching fasting statistics',
                error: error.message
            });
        }
    },

    /**
     * Get dashboard stats with efficient batch processing
     */
    async getDashboardStats(req, res) {
        try {
            const userId = req.user.id;
             if (!mongoose.Types.ObjectId.isValid(userId)) {
                 return res.status(400).json({ success: false, message: 'Invalid user ID format.' });
             }
            const cacheKey = `user:${userId}:dashboard`;

            // Try to get from cache first
            try {
                const cachedData = await redis.get(cacheKey);
                if (cachedData) {
                    logger.info(`Dashboard cache hit for user ${userId}`);
                    return res.json(JSON.parse(cachedData));
                }
                logger.info(`Dashboard cache miss for user ${userId}`);
            } catch (err) {
                logger.warn(`Redis get error for ${cacheKey}:`, err);
            }

            // Use Promise.all for parallel data fetching
            const [basicStats, userAchievements, recentFasts, currentFastData] = await Promise.all([
                // Fetch basic stats (total fasts, longest) - potentially reuse stats logic or cache
                 (async () => {
                     const statsCacheKey = `user:${userId}:stats`;
                     try {
                         const cachedStats = await redis.get(statsCacheKey);
                         if (cachedStats) {
                             const parsedStats = JSON.parse(cachedStats);
                             // Return only needed fields for dashboard
                             return {
                                 totalFasts: parsedStats.totalFasts,
                                 longestFast: parsedStats.longestFast,
                                 avgDuration: parsedStats.avgDuration // Maybe useful for dashboard
                             };
                         }
                     } catch (err) {
                         logger.warn(`Redis get error for ${statsCacheKey} in dashboard fetch:`, err);
                     }
                    // Fallback to aggregation if cache miss/error
                    const pipeline = [
                        {
                            $match: {
                                user: new mongoose.Types.ObjectId(userId),
                                completed: true,
                                elapsedTime: { $exists: true, $ne: null, $gt: 0 }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                totalFasts: { $sum: 1 },
                                longestFastMs: { $max: "$elapsedTime" },
                                avgDurationMs: { $avg: "$elapsedTime" }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                totalFasts: 1,
                                longestFast: { $round: [{ $divide: ["$longestFastMs", 3600000] }, 1] },
                                avgDuration: { $round: [{ $divide: ["$avgDurationMs", 3600000] }, 1] }
                            }
                        }
                    ];
                    const results = await Fast.aggregate(pipeline).hint({ user: 1, completed: 1 }).exec();
                    return results.length > 0 ? results[0] : { totalFasts: 0, longestFast: 0, avgDuration: 0 };
                 })(),

                // Get user streak/badges - check cache first
                (async () => {
                    const achievementsCacheKey = `user:${userId}:achievements`;
                    try {
                        const cachedAch = await redis.get(achievementsCacheKey);
                        if (cachedAch) return JSON.parse(cachedAch);
                    } catch (err) {
                        logger.warn(`Redis get error for ${achievementsCacheKey} in dashboard fetch:`, err);
                    }
                    const user = await User.findById(userId).select('streak badges').lean();
                    return { streak: user?.streak || 0, badges: user?.badges || [] };
                })(),

                // Get recent COMPLETED fasts for history chart with minimal projection
                 Fast.find(
                     { user: userId, completed: true }, // Only completed fasts
                     { endTime: 1, elapsedTime: 1, mood: 1 }, // Select necessary fields
                     {
                         sort: { endTime: -1 }, // Most recent first
                         limit: 7, // Limit for a small chart, e.g., last 7
                         lean: true
                     }
                 ),

                // Get current ACTIVE fast data (if any) - check cache first
                 (async () => {
                     const currentFastCacheKey = `user:${userId}:currentFast`;
                     try {
                         const cachedFast = await redis.get(currentFastCacheKey);
                         if (cachedFast) return JSON.parse(cachedFast);
                     } catch (err) {
                         logger.warn(`Redis get error for ${currentFastCacheKey} in dashboard fetch:`, err);
                     }
                     return Fast.findOne({ user: userId, isRunning: true }, null, { lean: true });
                 })()
            ]);

            // Calculate current fast progress if active
            let currentFastProgress = null;
            if (currentFastData) {
                const now = new Date();
                 const startTime = currentFastData.startTime instanceof Date ? currentFastData.startTime : new Date(currentFastData.startTime);
                 const elapsedTime = Math.max(0, now.getTime() - startTime.getTime());
                 const targetHours = currentFastData.targetHours || 16;
                 const targetMs = targetHours * 60 * 60 * 1000;
                 const remainingTime = Math.max(0, targetMs - elapsedTime);
                 const progressPercentage = targetMs > 0 ? Math.min(100, (elapsedTime / targetMs) * 100) : 0;
                 const elapsedHours = elapsedTime / (60 * 60 * 1000);

                 currentFastProgress = {
                     isActive: true,
                     _id: currentFastData._id,
                     startTime: currentFastData.startTime,
                     targetHours: targetHours,
                     elapsedTime,
                     remainingTime,
                     progressPercentage,
                     tip: getFastingTips(elapsedHours)
                 };
            } else {
                 currentFastProgress = { isActive: false };
             }


            // Format the dashboard data
            const dashboardData = {
                success: true,
                stats: basicStats, // Contains totalFasts, longestFast, avgDuration
                streak: userAchievements.streak,
                badges: userAchievements.badges,
                currentFast: currentFastProgress, // Contains active fast details or { isActive: false }
                recentFasts: recentFasts.map(fast => ({
                     // Format date for display (e.g., 'YYYY-MM-DD') - consider using a date library like moment or date-fns
                     date: fast.endTime.toISOString().split('T')[0], // Simple ISO date string
                     duration: fast.elapsedTime ? parseFloat((fast.elapsedTime / (60 * 60 * 1000)).toFixed(1)) : 0, // Convert ms to hours, rounded
                     mood: fast.mood // Include mood if available
                 })).reverse() // Reverse to show oldest first for chart trends
            };

            // Cache the result
            try {
                await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(dashboardData));
                 logger.info(`Dashboard cache set for user ${userId}`);
            } catch (err) {
                logger.warn(`Redis set error for ${cacheKey}:`, err);
            }

            res.json(dashboardData);
        } catch (error) {
            logger.error(`Error fetching dashboard stats for user ${req.user.id}:`, error);
            res.status(500).json({
                success: false,
                message: 'Server error fetching dashboard statistics',
                error: error.message
            });
        }
    },

    /**
     * Update an existing fast with optimized validation and DB operations
     */
    async updateFast(req, res) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const { fastId } = req.params;
            // Only allow updating specific fields
            const { targetHours, notes, mood, weightStart, weightEnd } = req.body;
            const userId = req.user.id;

            // Fetch the fast document using the session. Don't use lean if we need to save().
            const fast = await Fast.findOne(
                { _id: fastId, user: userId }
            ).session(session);


            if (!fast) {
                await session.abortTransaction();
                return res.status(404).json({
                    success: false,
                    message: 'Fast not found or does not belong to user.'
                });
            }

            // Flag to track if any changes were made
            let updated = false;

            // Update targetHours only if the fast is still running
            if (targetHours !== undefined) {
                if (!fast.isRunning) {
                    await session.abortTransaction();
                    return res.status(400).json({
                        success: false,
                        message: 'Cannot update target hours for a completed or cancelled fast.'
                    });
                }
                const numericTargetHours = Number(targetHours);
                 if (!Number.isFinite(numericTargetHours) ||
                     numericTargetHours < MIN_FASTING_HOURS ||
                     numericTargetHours > MAX_FASTING_HOURS) {
                     await session.abortTransaction();
                     return res.status(400).json({
                         success: false,
                         message: `Invalid target hours. Must be between ${MIN_FASTING_HOURS} and ${MAX_FASTING_HOURS}.`
                     });
                 }
                // Only update if the value actually changed
                if (fast.targetHours !== numericTargetHours) {
                    fast.targetHours = numericTargetHours;
                    // Recalculate predicted endTime based on startTime and new targetHours
                    const startTime = fast.startTime instanceof Date ? fast.startTime : new Date(fast.startTime);
                    fast.endTime = new Date(startTime.getTime() + (numericTargetHours * 60 * 60 * 1000));
                    updated = true;
                }
            }

            // Update optional fields if provided and changed
            if (notes !== undefined && fast.notes !== notes) {
                fast.notes = notes;
                updated = true;
            }
            if (mood !== undefined && fast.mood !== Number(mood)) {
                 fast.mood = Number(mood); // Ensure numeric
                 updated = true;
             }
            if (weightStart !== undefined && fast.weightStart !== Number(weightStart)) {
                 fast.weightStart = Number(weightStart); // Ensure numeric
                 updated = true;
             }
             // Allow updating weightEnd even if fast is completed (e.g., adding it later)
            if (weightEnd !== undefined && fast.weightEnd !== Number(weightEnd)) {
                fast.weightEnd = Number(weightEnd); // Ensure numeric
                updated = true;
            }


            // If no actual changes, commit transaction and return
             if (!updated) {
                 await session.commitTransaction(); // Still commit if no changes but validation passed
                 return res.json({
                     success: true,
                     fast: fast.toObject(), // Return the unchanged fast
                     message: 'No changes detected to update.'
                 });
             }


            // Save the updated fast document
            const updatedFast = await fast.save({ session });


            // Invalidate relevant caches since data has changed
            try {
                const cacheKeysToInvalidate = [
                     // If targetHours/endTime changed for running fast, update currentFast cache
                     ...(fast.isRunning ? [`user:${userId}:currentFast`] : []),
                     `user:${userId}:fastHistory`, // List view might change
                     `user:${userId}:stats`,      // Stats might change (e.g., mood avg)
                     `user:${userId}:dashboard`,  // Dashboard might change
                     `user:${userId}:insights`    // Insights might change
                ];
                // Use Promise.allSettled for robustness
                await Promise.allSettled(cacheKeysToInvalidate.map(key => redis.del(key)));
                logger.info(`Cache invalidated for user ${userId} after updating fast ${fastId}`);
            } catch (err) {
                logger.warn(`Redis cache invalidation error during updateFast for user ${userId}:`, err);
            }

            await session.commitTransaction();

            // Notify connected clients if WebSocket is set up
            if (global.io && global.io.sockets) {
                global.io.to(`user:${userId}`).emit('fastingUpdated', {
                    type: 'fastUpdated',
                    fastId: updatedFast._id,
                    // Optionally send the updated fast data
                     fast: updatedFast.toObject()
                });
                logger.info(`WebSocket event 'fastUpdated' emitted for user ${userId}, fast ${fastId}`);
            }

            res.json({
                success: true,
                fast: updatedFast.toObject(), // Return updated fast as plain object
                message: 'Fast updated successfully.'
            });
        } catch (error) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            logger.error(`Error updating fast ${req.params.fastId} for user ${req.user.id}:`, error);
            res.status(500).json({
                success: false,
                message: 'Server error updating fast',
                error: error.message
            });
        } finally {
            session.endSession();
        }
    },


    /**
     * Delete a fast with proper validation and cache management
     */
    async deleteFast(req, res) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const { fastId } = req.params;
            const userId = req.user.id;

            // Find the fast to ensure it exists and belongs to the user
            // Use lean initially just to check existence quickly
            const fastToDelete = await Fast.findOne(
                { _id: fastId, user: userId },
                { _id: 1, isRunning: 1, completed: 1, endTime: 1 } // Get fields needed for logic/cache invalidation
            ).session(session).lean();


            if (!fastToDelete) {
                await session.abortTransaction();
                return res.status(404).json({
                    success: false,
                    message: 'Fast not found or does not belong to user.'
                });
            }

            // Perform the deletion
             const deleteResult = await Fast.deleteOne({ _id: fastId, user: userId }, { session });


             if (deleteResult.deletedCount === 0) {
                 // Should not happen if findOne succeeded, but good practice to check
                 await session.abortTransaction();
                 throw new Error('Fast deletion failed unexpectedly after finding the document.');
             }


            // --- Streak Recalculation Logic ---
            // Determine if streak recalculation is potentially needed.
            // It's generally needed if a *completed* fast that could have contributed to the current streak is deleted.
             let needsStreakRecalculation = false;
             if (fastToDelete.completed) {
                 // More complex: Check if this deleted fast was the *last* one determining the current streak.
                 // Simpler approach: Recalculate if *any* completed fast is deleted.
                 // Let's use the simpler approach for now, potentially optimize later if performance is an issue.
                 needsStreakRecalculation = true;
             }

             let finalStreak = null; // To store the possibly recalculated streak

            if (needsStreakRecalculation) {
                 logger.info(`Recalculating streak for user ${userId} after deleting fast ${fastId}`);
                 // Get the most recent completed fasts (excluding the deleted one)
                 const recentCompletedFasts = await Fast.find(
                     { user: userId, completed: true },
                     { endTime: 1 }, // Only need endTime
                     { sort: { endTime: -1 }, limit: 31, session, lean: true } // Limit to slightly more than max potential streak period needed (e.g., 30 days + buffer)
                 );

                 let newStreak = 0;
                 let lastFastDate = null;

                 for (const fast of recentCompletedFasts) {
                     const currentFastDate = new Date(fast.endTime);

                     if (lastFastDate === null) {
                         // This is the most recent completed fast remaining
                         newStreak = 1;
                         lastFastDate = currentFastDate;
                     } else {
                         // Calculate the difference in time
                         const timeDiff = lastFastDate.getTime() - currentFastDate.getTime();
                         // Check if the gap is within the allowed streak continuation window (e.g., STREAK_RESET_HOURS)
                         if (timeDiff <= STREAK_RESET_HOURS * 60 * 60 * 1000) {
                             newStreak++;
                             lastFastDate = currentFastDate; // Update lastDate for the next comparison
                         } else {
                             // Gap is too large, streak broken
                             break;
                         }
                     }
                 }


                // Get the end time of the latest fast to store with the user
                const latestEndTime = recentCompletedFasts.length > 0 ? recentCompletedFasts[0].endTime : null;


                 // Update user's streak and lastFastEndTime in the DB
                 await User.updateOne(
                     { _id: userId },
                     { streak: newStreak, lastFastEndTime: latestEndTime },
                     { session }
                 );
                 finalStreak = newStreak; // Store for response/cache update
                 logger.info(`Streak recalculated to ${newStreak} for user ${userId}`);
             }


            // --- Cache Invalidation ---
            // Invalidate all potentially affected caches comprehensively
            try {
                const cacheKeysToInvalidate = [
                    // If the deleted fast was the currently running one
                    ...(fastToDelete.isRunning ? [`user:${userId}:currentFast`] : []),
                    `user:${userId}:fastHistory`, // Always invalidate history
                    `user:${userId}:stats`,       // Always invalidate stats
                    `user:${userId}:dashboard`,   // Always invalidate dashboard
                    `user:${userId}:insights`,    // Always invalidate insights
                    `user:${userId}:achievements` // Always invalidate achievements (streak might have changed)
                ];
                await Promise.allSettled(cacheKeysToInvalidate.map(key => redis.del(key)));
                logger.info(`Cache invalidated for user ${userId} after deleting fast ${fastId}`);
            } catch (err) {
                logger.warn(`Redis cache invalidation error during deleteFast for user ${userId}:`, err);
                // Non-critical, proceed with transaction commit
            }

            await session.commitTransaction();

            // Notify connected clients
            if (global.io && global.io.sockets) {
                global.io.to(`user:${userId}`).emit('fastingUpdated', {
                    type: 'fastDeleted',
                    fastId: fastId,
                    // Optionally send the recalculated streak
                     newStreak: finalStreak // Will be null if streak wasn't recalculated
                });
                logger.info(`WebSocket event 'fastDeleted' emitted for user ${userId}, fast ${fastId}`);
            }

            res.json({
                success: true,
                message: 'Fast deleted successfully.'
                 // Optionally include the new streak if recalculated
                 // ...(finalStreak !== null && { recalculatedStreak: finalStreak })
            });
        } catch (error) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            logger.error(`Error deleting fast ${req.params.fastId} for user ${req.user.id}:`, error);
            res.status(500).json({
                success: false,
                message: 'Server error deleting fast',
                error: error.message
            });
        } finally {
            session.endSession();
        }
    },


    /**
     * Get insights on fasting patterns with optimized aggregation
     */
    async getFastingInsights(req, res) {
        try {
            const userId = req.user.id;
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                return res.status(400).json({ success: false, message: 'Invalid user ID format.' });
            }
            const cacheKey = `user:${userId}:insights`;
            const INSIGHTS_CACHE_TTL = CACHE_TTL * 6; // Cache insights longer (e.g., 6 hours)


            // Try to get from cache first
            try {
                const cachedData = await redis.get(cacheKey);
                if (cachedData) {
                    logger.info(`Fasting insights cache hit for user ${userId}`);
                    return res.json(JSON.parse(cachedData));
                }
                logger.info(`Fasting insights cache miss for user ${userId}`);
            } catch (err) {
                logger.warn(`Redis get error for ${cacheKey}:`, err);
            }

            // Define time ranges
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
            // ninetyDaysAgo seems unused in the pipelines below, remove or use if needed
            // const ninetyDaysAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));


            // Use Promise.all for parallel aggregation queries
            // Ensure indexes exist: { user: 1, completed: 1, endTime: 1 }, { user: 1, completed: 1, startTime: 1 }
             const [monthlyStats, dayOfWeekStats, timeOfDayStats] = await Promise.all([
                 // Monthly performance (Last N months or specific periods)
                 // Let's refine this to group by calendar month for the last ~3 months
                 Fast.aggregate([
                     {
                         $match: {
                             user: new mongoose.Types.ObjectId(userId),
                             completed: true,
                             endTime: { $gte: new Date(now.getFullYear(), now.getMonth() - 2, 1) } // Start of 2 months ago
                         }
                     },
                     {
                         $group: {
                              _id: {
                                  year: { $year: "$endTime" },
                                  month: { $month: "$endTime" }
                              },
                              count: { $sum: 1 },
                              avgDurationMs: { $avg: "$elapsedTime" },
                              avgMood: { $avg: { $ifNull: ["$mood", null] } } // Average mood if available
                         }
                     },
                     { $sort: { "_id.year": 1, "_id.month": 1 } }, // Sort chronologically
                     {
                         $project: {
                             _id: 0,
                             // Format month nicely, e.g., "YYYY-MM"
                             month: {
                                 $concat: [
                                     { $toString: "$_id.year" }, "-",
                                     { $cond: { if: { $lt: ["$_id.month", 10] }, then: "0", else: "" } }, // Add leading zero
                                     { $toString: "$_id.month" }
                                 ]
                             },
                             count: 1,
                             avgDuration: { $round: [{ $divide: ["$avgDurationMs", 3600000] }, 1] },
                             avgMood: { $cond: { if: { $ne: ["$avgMood", null] }, then: { $round: ["$avgMood", 1] }, else: null } }
                         }
                     }
                 ]).hint({ user: 1, completed: 1, endTime: 1 }), // Hint for index usage


                 // Day of week patterns (All time)
                 Fast.aggregate([
                     {
                         $match: {
                             user: new mongoose.Types.ObjectId(userId),
                             completed: true,
                              startTime: { $exists: true } // Ensure startTime exists
                         }
                     },
                     {
                         $group: {
                             _id: { $dayOfWeek: "$startTime" }, // 1 (Sun) to 7 (Sat)
                             count: { $sum: 1 },
                             avgDurationMs: { $avg: "$elapsedTime" }
                         }
                     },
                     { $sort: { _id: 1 } }, // Sort by day index
                     {
                         $project: {
                             _id: 0,
                             dayOfWeekIndex: "$_id", // Keep index for potential sorting/mapping on client
                             dayOfWeek: { // Map index to name
                                 $switch: {
                                     branches: [
                                         { case: { $eq: ["$_id", 1] }, then: "Sunday" },
                                         { case: { $eq: ["$_id", 2] }, then: "Monday" },
                                         { case: { $eq: ["$_id", 3] }, then: "Tuesday" },
                                         { case: { $eq: ["$_id", 4] }, then: "Wednesday" },
                                         { case: { $eq: ["$_id", 5] }, then: "Thursday" },
                                         { case: { $eq: ["$_id", 6] }, then: "Friday" },
                                         { case: { $eq: ["$_id", 7] }, then: "Saturday" }
                                     ],
                                     default: "Unknown"
                                 }
                             },
                             count: 1,
                             avgDuration: { $round: [{ $divide: ["$avgDurationMs", 3600000] }, 1] }
                         }
                     }
                 ]).hint({ user: 1, completed: 1, startTime: 1 }), // Hint for index usage


                 // Time of day patterns (based on start time, all time)
                 Fast.aggregate([
                     {
                         $match: {
                             user: new mongoose.Types.ObjectId(userId),
                             completed: true,
                              startTime: { $exists: true },
                              elapsedTime: { $exists: true },
                              targetHours: { $exists: true } // Needed for success rate
                         }
                     },
                     {
                         $project: {
                             hourOfDay: { $hour: "$startTime" },
                             durationMs: "$elapsedTime",
                             // Success: elapsed time >= target time (in ms)
                             success: { $cond: [{ $gte: ["$elapsedTime", { $multiply: ["$targetHours", 3600000] }] }, 1, 0] }
                         }
                     },
                     {
                         $group: {
                             _id: { // Group by time block
                                 $switch: {
                                     branches: [
                                         // Adjust blocks as needed (e.g., 6-12, 12-18, 18-24, 0-6)
                                         { case: { $and: [{ $gte: ["$hourOfDay", 6] }, { $lt: ["$hourOfDay", 12] }] }, then: "Morning (6am-12pm)" },
                                         { case: { $and: [{ $gte: ["$hourOfDay", 12] }, { $lt: ["$hourOfDay", 18] }] }, then: "Afternoon (12pm-6pm)" },
                                         { case: { $and: [{ $gte: ["$hourOfDay", 18] }, { $lt: ["$hourOfDay", 24] }] }, then: "Evening (6pm-12am)" },
                                         { case: { $and: [{ $gte: ["$hourOfDay", 0] }, { $lt: ["$hourOfDay", 6] }] }, then: "Night (12am-6am)" }
                                     ],
                                     default: "Unknown" // Should not happen with 24hr coverage
                                 }
                             },
                             count: { $sum: 1 },
                             avgSuccessRate: { $avg: "$success" }, // Average of 1s and 0s gives the rate
                             avgDurationMs: { $avg: "$durationMs" }
                         }
                     },
                     {
                         $project: {
                             _id: 0,
                             timeBlock: "$_id",
                             count: 1,
                             successRate: { $round: [{ $multiply: ["$avgSuccessRate", 100] }, 1] }, // Convert rate to percentage
                             avgDuration: { $round: [{ $divide: ["$avgDurationMs", 3600000] }, 1] }
                         }
                     },
                      // Sort by a meaningful order, e.g., time block logical order or count
                      // Manual sort order for time blocks might be best if needed on frontend
                     // { $sort: { count: -1 } } // Or sort by count
                 ]).hint({ user: 1, completed: 1, startTime: 1 }) // Hint for index usage
             ]);


            // --- Generate Recommendations ---
            const recommendations = [];
             const totalCompletedFasts = await Fast.countDocuments({ user: userId, completed: true });


            if (totalCompletedFasts < 5) {
                 recommendations.push("Keep fasting! More data is needed to provide personalized insights.");
             } else {
                 // Day of week recommendations
                 if (dayOfWeekStats && dayOfWeekStats.length > 0) {
                     const sortedDays = [...dayOfWeekStats].sort((a, b) => b.avgDuration - a.avgDuration);
                     const bestDay = sortedDays[0];
                     const worstDay = sortedDays[sortedDays.length - 1];
                     if (bestDay && bestDay.avgDuration > (worstDay?.avgDuration || 0) + 2) { // Significant difference
                         recommendations.push(`You tend to fast longest on ${bestDay.dayOfWeek}s (avg ${bestDay.avgDuration}h). Consider scheduling longer fasts then.`);
                     }
                     if (worstDay && worstDay.count > 3 && bestDay.dayOfWeek !== worstDay.dayOfWeek) { // Only if data exists for worst day
                         recommendations.push(`Your shortest fasts often happen on ${worstDay.dayOfWeek}s (avg ${worstDay.avgDuration}h). Plan for potential challenges or shorter fasts on these days.`);
                     }
                 }


                 // Time of day recommendations
                 if (timeOfDayStats && timeOfDayStats.length > 0) {
                      const sortedTimesBySuccess = [...timeOfDayStats].sort((a, b) => b.successRate - a.successRate);
                      const bestTime = sortedTimesBySuccess[0];
                      const worstTime = sortedTimesBySuccess[sortedTimesBySuccess.length - 1];


                      if (bestTime && bestTime.successRate > 75) {
                           recommendations.push(`Starting fasts in the ${bestTime.timeBlock.toLowerCase()} seems most successful for you (${bestTime.successRate}% completion rate).`);
                       }
                      if (worstTime && worstTime.successRate < 50 && worstTime.count > 3 && bestTime.timeBlock !== worstTime.timeBlock) {
                           recommendations.push(`You have a lower success rate (${worstTime.successRate}%) when starting fasts in the ${worstTime.timeBlock.toLowerCase()}. Be mindful of challenges during these times.`);
                       }


                       const sortedTimesByDuration = [...timeOfDayStats].sort((a, b) => b.avgDuration - a.avgDuration);
                       if (sortedTimesByDuration[0]?.avgDuration > (sortedTimesByDuration[1]?.avgDuration || 0) + 1) {
                           recommendations.push(`Your average fast duration is longest when starting in the ${sortedTimesByDuration[0].timeBlock.toLowerCase()} (${sortedTimesByDuration[0].avgDuration}h avg).`);
                       }
                   }


                 // Trend recommendations (using monthly stats)
                 if (monthlyStats && monthlyStats.length >= 2) {
                     const lastMonth = monthlyStats[monthlyStats.length - 1];
                     const prevMonth = monthlyStats[monthlyStats.length - 2];
                     if (lastMonth.avgDuration > prevMonth.avgDuration + 1) {
                         recommendations.push(`Great progress! Your average fast duration increased from ${prevMonth.avgDuration}h to ${lastMonth.avgDuration}h last month.`);
                     } else if (lastMonth.avgDuration < prevMonth.avgDuration - 1) {
                         recommendations.push(`Your average fast duration decreased slightly last month (${prevMonth.avgDuration}h to ${lastMonth.avgDuration}h). Reflect on any changes or challenges.`);
                     }
                 }
             }


            // Format final insights object
            const insights = {
                // recent: thirtyDayStats[0] || { count: 0, avgDuration: 0, avgMood: null }, // Use monthlyStats instead
                monthlyTrends: monthlyStats || [],
                dayOfWeekPatterns: dayOfWeekStats || [],
                timeOfDayPatterns: timeOfDayStats || [],
                recommendations: recommendations.slice(0, 3) // Limit recommendations
            };

            const result = {
                success: true,
                insights
            };

            // Cache the insights
            try {
                await redis.setex(cacheKey, INSIGHTS_CACHE_TTL, JSON.stringify(result));
                logger.info(`Fasting insights cache set for user ${userId}`);
            } catch (err) {
                logger.warn(`Redis set error for ${cacheKey}:`, err);
            }

            res.json(result);
        } catch (error) {
            logger.error(`Error generating fasting insights for user ${req.user.id}:`, error);
            res.status(500).json({
                success: false,
                message: 'Server error generating fasting insights',
                error: error.message
            });
        }
    }
};

console.log(`[FastingController.js] FastingController object defined. Type: ${typeof FastingController}`);
console.log(`[FastingController.js] Exporting FastingController...`);

module.exports = FastingController;

console.log(`[FastingController.js] --- FINISHED FILE EXECUTION & EXPORT ---`);