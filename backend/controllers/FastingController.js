const mongoose = require('mongoose');
const Fast = require('../models/Fast');
const User = require('../models/User');
const { isValidDate } = require('../utils/validation');
const logger = require('../utils/logger');


// Constants
const STREAK_RESET_HOURS = 48;
const MAX_FASTING_HOURS = 168; // 7 days
const MIN_FASTING_HOURS = 1;
const DEFAULT_PAGE_SIZE = 10;

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
 * Uses efficient MongoDB update operations
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

        if (updatedUser) {
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
    // In controllers/FastingController.js

    /**
     * Start a new fasting session with optimized DB operations
     */
    // In controllers/FastingController.js

    // In controllers/FastingController.js
    // In controllers/FastingController.js

    async startFast(req, res) {
        const logPrefix = '[startFast]';
        logger.info(`${logPrefix} Received request to start fast.`);

        try {
            const userId = req.user.id || req.user._id;

            if (!userId) {
                logger.error(`${logPrefix} Critical: User ID not found after authentication.`);
                return res.status(500).json({ success: false, message: 'Internal Server Error: User identification failed.' });
            }
            const userIdStr = userId.toString();
            
            const existingFast = await Fast.findOne({ user: userIdStr, isRunning: true }).lean();
            if (existingFast) {
                logger.warn(`${logPrefix} User ${userIdStr} already has an active fast.`);
                return res.status(400).json({
                    success: false,
                    message: 'You already have an active fast. Please end it before starting a new one.'
                });
            }

            // --- THIS IS THE MANDATORY FIX ---
            // The server is the single source of truth for time.
            // IGNORE any startTime from the client and ALWAYS use the server's current time.
            const { targetHours } = req.body;
            const startTimeDate = new Date(); // ALWAYS use the server's current time.
            
            const numericTargetHours = Number(targetHours);
            if (!Number.isFinite(numericTargetHours) || numericTargetHours < 1 || numericTargetHours > 168) {
                logger.warn(`${logPrefix} Invalid targetHours: ${targetHours}`);
                return res.status(400).json({
                    success: false,
                    message: `Invalid target hours. Please enter a duration between 1 and 168 hours.`
                });
            }

            const newFast = new Fast({
                user: userIdStr,
                startTime: startTimeDate, // Use the guaranteed-correct server time
                endTime: new Date(startTimeDate.getTime() + (numericTargetHours * 3600000)),
                targetHours: numericTargetHours,
                isRunning: true,
                completed: false,
            });

            const savedFast = await newFast.save();
            logger.info(`${logPrefix} Fast ${savedFast._id} started successfully for user ${userIdStr}.`);

            res.status(201).json({
                success: true,
                fast: savedFast.toObject(),
                message: 'Fast started successfully'
            });

        } catch (error) {
            logger.error(`${logPrefix} Error during execution: ${error.message}`, { stack: error.stack });
            res.status(500).json({
                success: false,
                message: 'Server error while starting fast.'
            });
        }
    },
    
    // In controllers/FastingController.js
     async endFast(req, res) {
    const logPrefix = '[endFast]';
    logger.debug(`${logPrefix} Function entered.`);

    try {
        const { fastId } = req.params;
        const { mood, weightEnd, notes } = req.body;

        logger.debug(`${logPrefix} Request details: fastId='${fastId}', body='${JSON.stringify(req.body)}'`);

        if (!mongoose.Types.ObjectId.isValid(fastId)) {
            logger.warn(`${logPrefix} Invalid fastId format received: ${fastId}`);
            return res.status(400).json({ success: false, message: 'Invalid Fast ID format.' });
        }

        // ADD THIS: Extract userId from authenticated user
        const userId = req.user.id || req.user._id;
        
        if (!userId) {
            logger.error(`${logPrefix} Critical: User ID not found after authentication.`);
            return res.status(500).json({ success: false, message: 'Internal Server Error: User identification failed.' });
        }
        
        const userIdStr = userId.toString();
        logger.info(`${logPrefix} Proceeding for user: ${userIdStr}`);
        
        // --- Fetch and Update the Fast Document ---
        const fast = await Fast.findOne({
            _id: fastId,
            user: userIdStr, // Use userIdStr instead of userId
        });

        if (!fast) {
            logger.warn(`${logPrefix} Fast not found (ID: ${fastId}, User: ${userIdStr}) or does not belong to user.`);
            return res.status(404).json({
                success: false,
                message: 'Active fast not found for this user.'
            });
        }

        if (!fast.isRunning) {
            logger.warn(`${logPrefix} Attempted to end fast ${fastId} which is already completed or cancelled (isRunning=false).`);
            return res.status(400).json({
                success: false,
                message: 'This fast is not currently running.'
            });
        }

        // --- Update Fast Details ---
        const now = new Date();
        const startTime = fast.startTime instanceof Date ? fast.startTime : new Date(fast.startTime);
        const elapsedTime = Math.max(0, now.getTime() - startTime.getTime());

        fast.endTime = now;
        fast.completed = true;
        fast.isRunning = false;
        fast.elapsedTime = elapsedTime;
        
        // Update optional fields if provided
        if (mood) fast.mood = mood;
        if (weightEnd) fast.weightEnd = weightEnd;
        if (notes) fast.notes = notes;

        // --- Save Updated Fast ---
        const savedFast = await fast.save();
        logger.info(`${logPrefix} Successfully saved updated fast document ${savedFast._id}.`);

        // --- Update achievements if needed ---
        const lastCompletedFast = await Fast.findOne(
            { user: userIdStr, completed: true, _id: { $ne: savedFast._id } },
            { endTime: 1 },
            { sort: { endTime: -1 }, lean: true }
        );
        
        // Call your updateUserAchievements function here if you have one
        // await updateUserAchievements(userIdStr, savedFast, lastCompletedFast);

        // --- Response ---
        const responsePayload = {
            success: true,
            message: 'Fast ended successfully',
            fast: savedFast.toObject(),
            elapsedTime: elapsedTime,
            elapsedHours: Math.round((elapsedTime / (1000 * 60 * 60)) * 100) / 100
        };

        res.json(responsePayload);

    } catch (error) {
        logger.error(`${logPrefix} Error caught during execution...`, error);
        res.status(500).json({
            success: false,
            message: 'Server error while ending fast.',
            error: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : error.message
        });
    }
},
    /**
     * Get current active fasting session
     */
    async getCurrentFast(req, res) {
        try {
            const userId = req.user.id;
            
            // Get from DB
            const currentFast = await Fast.findOne(
                { user: userId, isRunning: true },
                null, // Select all fields or specify needed ones
                { lean: true } // Use lean for read-only operation
            );

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
                 fast: currentFast, // The raw fast object from DB
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
     * Get user stats with efficient aggregation pipeline
     */
    async getUserStats(req, res) {
        try {
            const userId = req.user.id;
            // Validate userId if necessary, though req.user.id should be reliable
             if (!mongoose.Types.ObjectId.isValid(userId)) {
                 return res.status(400).json({ success: false, message: 'Invalid user ID format.' });
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


            // Get user streak and badges from DB
            const user = await User.findById(userId).select('streak badges').lean();
            const userAchievements = {
                streak: user?.streak || 0,
                badges: user?.badges || []
            };


            // Add streak and badges to the stats object
            stats.streak = userAchievements.streak;
            stats.badges = userAchievements.badges;

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

            // Use Promise.all for parallel data fetching
            const [basicStats, userAchievements, recentFasts, currentFastData] = await Promise.all([
                // Fetch basic stats (total fasts, longest) via aggregation
                 (async () => {
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

                // Get user streak/badges from DB
                (async () => {
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

                // Get current ACTIVE fast data (if any) from DB
                 (async () => {
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
     * Delete a fast with proper validation and streak management
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
                { _id: 1, isRunning: 1, completed: 1, endTime: 1 } // Get fields needed for logic
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

module.exports = FastingController;