// controllers/dashboardController.js
const Dashboard = require('../models/Dashboard');
const User = require('../models/User');
const Fast = require('../models/Fast');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const logger = require('../utils/logger'); // Assumes logger utility exists

// --- Redis Client & Cache Setup ---
let redisClient;
const CACHE_TTL = 300; // 5 minutes cache TTL
const REQUEST_TIMEOUT = 10000; // 10 seconds timeout

if (process.env.REDIS_URL) {
  redisClient = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
    enableOfflineQueue: false,
    retryStrategy(times) {
      const delay = Math.min(times * 100, 3000);
      logger.warn(`Redis retrying connection (attempt ${times})...`);
      return delay;
    },
  });

  redisClient.on('error', (err) => {
    logger.error('Redis Client Error:', err);
  });

  redisClient.on('connect', () => {
    logger.info('Redis connected successfully');
  });

  redisClient.on('ready', () => {
    logger.info('Redis client is ready.');
  });

  redisClient.on('reconnecting', () => {
    logger.warn('Redis client is reconnecting...');
  });

  redisClient.on('end', () => {
    logger.warn('Redis connection closed.');
  });
} else {
  logger.warn('REDIS_URL not set. Redis caching disabled. Falling back to memory cache.');
}

// --- In-memory Cache ---
const localCache = new Map();
const localCacheTTL = new Map();
const memoryCache = {
  get: async (key) => {
    const now = Date.now();
    if (localCache.has(key) && localCacheTTL.get(key) > now) {
      return localCache.get(key);
    }
    localCache.delete(key); // Clean up expired key
    localCacheTTL.delete(key);
    return null;
  },
  set: async (key, value, ttl) => {
    localCache.set(key, JSON.parse(JSON.stringify(value))); // Store a clone
    localCacheTTL.set(key, Date.now() + ttl * 1000);
    return 'OK';
  },
  del: async (key) => {
    const deleted = localCache.delete(key);
    localCacheTTL.delete(key);
    return deleted ? 1 : 0;
  },
};

// --- Generic Cache Functions ---
async function getCache(key) {
  try {
    if (redisClient && redisClient.status === 'ready') {
      logger.debug(`CACHE: GET ${key} (Redis)`);
      const data = await redisClient.get(key);
      if (data) return JSON.parse(data);
    } else {
      logger.debug(`CACHE: GET ${key} (Memory)`);
      const memoryData = await memoryCache.get(key);
      if (memoryData) return memoryData; // Already parsed/cloned in set
    }
    return null; // Explicitly return null if not found in either
  } catch (error) {
    logger.error('Cache GET error:', { key, error: error.message });
    logger.debug(`CACHE: GET ${key} (Memory - Fallback on error)`);
    return await memoryCache.get(key); // Fallback to memory cache on Redis error
  }
}

async function setCache(key, data, ttl = CACHE_TTL) {
  try {
    const stringData = JSON.stringify(data);
    const clonedData = JSON.parse(stringData); // Ensure we have a clone for memory cache

    if (redisClient && redisClient.status === 'ready') {
      logger.debug(`CACHE: SET ${key} (Redis) TTL=${ttl}s`);
      await redisClient.set(key, stringData, 'EX', ttl);
    }
    // Always update memory cache as well, or as primary if Redis unavailable
    logger.debug(`CACHE: SET ${key} (Memory) TTL=${ttl}s`);
    await memoryCache.set(key, clonedData, ttl);

  } catch (error) {
    logger.error('Cache SET error:', { key, error: error.message });
    // Avoid setting fallback here if primary set failed, could lead to inconsistency
  }
}

/**
 * Get user dashboard statistics with caching and optimized queries
 */
exports.getStats = async (req, res) => {
  const startTime = Date.now();
  logger.info(`---> ENTERING Dashboard Controller: getStats handler. User from middleware: ${req.user?._id}`);

  const userId = req.user?._id;
  if (!userId) {
    logger.error('DASHBOARD_CTRL_ERROR: req.user._id not found AFTER protect middleware!');
    return res.status(401).json({ message: 'Unauthorized - User context missing' });
  }
  logger.info(`DASHBOARD_CTRL: Processing stats for validated userId: ${userId}`);

  let timeoutId = null; // <--- Variable to hold the timeout ID

  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      logger.error(`DASHBOARD_CTRL_ERROR: Invalid ObjectId format for userId: ${userId}`);
      return res.status(400).json({ message: 'Invalid user identifier' });
    }
    const userObjectId = new mongoose.Types.ObjectId(userId);
    logger.debug(`DASHBOARD_CTRL: Converted userId to ObjectId: ${userObjectId}`);

    // Request timeout handler
    const timeoutPromise = new Promise((_, reject) => {
      // Store the timer ID
      timeoutId = setTimeout(() => {
        logger.warn(`DASHBOARD_CTRL_WARN: Request timeout triggered for user ${userId}`); // Log timeout trigger
        reject(new Error('Request timeout'));
      }, REQUEST_TIMEOUT);
    });

    const cacheKey = `dashboard:${userId}`;
    logger.debug(`DASHBOARD_CTRL: Cache key: ${cacheKey}`);

    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      // *** FIX: Clear the timeout if cache is hit ***
      if (timeoutId) {
        clearTimeout(timeoutId);
        logger.debug(`DASHBOARD_CTRL: Cleared timeout due to cache hit for ${cacheKey}`);
      }
      // ********************************************

      const elapsedCache = Date.now() - startTime;
      logger.info(`DASHBOARD_CTRL: Cache HIT for ${cacheKey}. Time: ${elapsedCache}ms`);
      res.set('X-Cache', 'HIT');
      res.set('X-Response-Time', `${elapsedCache}ms`);
      logger.info(`---> EXITING Dashboard Controller (Cache Hit): Sending 200 OK`);
      return res.json(cachedData);
    }
    logger.info(`DASHBOARD_CTRL: Cache MISS for ${cacheKey}. Fetching from DB.`);

    const dataPromise = (async () => {
      logger.debug(`DASHBOARD_CTRL: DB Query - Finding User, Count Fasts, Find Longest Fast for ${userObjectId}`);
      const [user, totalFasts, longestFastDoc] = await Promise.all([
        User.findById(userObjectId).select('streak badges username').lean().exec(),
        Fast.countDocuments({ user: userObjectId, completed: true }).exec(),
        Fast.findOne({ user: userObjectId, completed: true })
          .sort({ elapsedTime: -1 })
          .select('elapsedTime')
          .lean()
          .exec(),
      ]);

      if (!user) {
        logger.warn(`DASHBOARD_CTRL_WARN: User not found in DB for ID: ${userObjectId}`);
        // Throw an error that can be caught by the main try/catch
        const notFoundError = new Error('User associated with token not found');
        notFoundError.status = 404; // Add status for specific handling
        throw notFoundError;
      }
      logger.debug(`DASHBOARD_CTRL: DB Query - User found: ${user.username}, Total Fasts: ${totalFasts}`);

      const longestFastHours = longestFastDoc ? Math.round((longestFastDoc.elapsedTime || 0) / 3600000) : 0; // Add default 0 for elapsedTime
      logger.debug(`DASHBOARD_CTRL: Calculated longest fast: ${longestFastHours} hours`);

      logger.debug(`DASHBOARD_CTRL: DB Write - Updating Dashboard document for user ${userObjectId}`);
      // Consider making this optional or less frequent if it's just for stats
      await Dashboard.findOneAndUpdate(
        { user: userObjectId },
        {
          $set: {
            totalFasts,
            longestFast: longestFastHours,
            streak: user.streak || 0,
            badges: user.badges || [],
            lastUpdated: new Date(),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).exec();
      logger.debug(`DASHBOARD_CTRL: DB Write - Dashboard document updated/created.`);

      const responseData = {
        stats: {
          totalFasts,
          longestFast: longestFastHours,
        },
        streak: user.streak || 0,
        badges: user.badges || [],
        user: {
          username: user.username,
          // Redundant info below, already top-level? Keep if frontend expects it.
          // streak: user.streak || 0,
          // badges: user.badges || [],
        },
        success: true, // Add success flag for consistency
      };
      logger.debug(`DASHBOARD_CTRL: Prepared response data.`);

      logger.debug(`DASHBOARD_CTRL: Attempting to cache result for ${cacheKey}`);
      await setCache(cacheKey, responseData); // Cache the prepared data

      res.set('X-Cache', 'MISS'); // Set cache miss header here
      return responseData; // Return data for Promise.race
    })();

    logger.debug(`DASHBOARD_CTRL: Racing data promise against ${REQUEST_TIMEOUT}ms timeout.`);
    const responseData = await Promise.race([dataPromise, timeoutPromise]);

    // *** FIX: Clear the timeout if data promise wins ***
    if (timeoutId) {
      clearTimeout(timeoutId);
      logger.debug(`DASHBOARD_CTRL: Cleared timeout after data promise resolved for ${cacheKey}`);
    }
    // ************************************************

    const elapsed = Date.now() - startTime;
    res.set('X-Response-Time', `${elapsed}ms`);
    logger.info(`---> EXITING Dashboard Controller (Success): Sending 200 OK. Time: ${elapsed}ms`);
    return res.status(200).json(responseData);

  } catch (error) {
    // *** FIX: Ensure timeout is cleared in case of errors during data fetching ***
    if (timeoutId) {
      clearTimeout(timeoutId);
      logger.debug(`DASHBOARD_CTRL: Cleared timeout due to error for user ${userId}`);
    }
    // **************************************************************************

    const elapsedError = Date.now() - startTime;
    logger.error(`--- DASHBOARD_CTRL_ERROR in getStats for user ${userId}. Time: ${elapsedError}ms ---`, {
      message: error.message,
      // Only log stack in development or if specifically needed
      stack: process.env.NODE_ENV !== 'production' ? error.stack : 'Stack trace hidden in production',
      status: error.status, // Log custom status if available
    });

    // Handle specific error types
    if (error.message === 'Request timeout') {
      logger.info(`---> EXITING Dashboard Controller (Timeout): Sending 504`);
      return res.status(504).json({ success: false, message: 'Request timed out while fetching dashboard data' });
    }
    if (error.status === 404) {
      logger.info(`---> EXITING Dashboard Controller (Not Found): Sending 404`);
      return res.status(404).json({ success: false, message: error.message || 'User not found' });
    }
    if (error instanceof mongoose.Error.CastError) {
      logger.info(`---> EXITING Dashboard Controller (Cast Error): Sending 400`);
      return res.status(400).json({ success: false, message: 'Invalid identifier format' });
    }

    // Generic internal server error
    logger.info(`---> EXITING Dashboard Controller (Internal Error): Sending 500`);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching dashboard stats',
      // Avoid sending detailed error messages in production
      error: process.env.NODE_ENV !== 'production' ? error.message : 'An unexpected error occurred',
    });
  }
  // No finally needed as timeoutId is cleared within try/catch paths
};

/**
 * Get admin dashboard statistics with pagination and caching
 */
exports.getBulkStats = async (req, res) => {
  const startTime = Date.now();
  logger.info(
    `---> ENTERING Dashboard Controller: getBulkStats handler. User: ${req.user?._id}, isAdmin: ${req.user?.isAdmin}`
  );

  try {
    if (!req.user?.isAdmin) {
      logger.warn(`DASHBOARD_CTRL_WARN: Forbidden attempt to access getBulkStats by user ${req.user?._id}`);
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }

    const { page = 1, limit = 10, sortBy = 'lastUpdated', sortOrder = -1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const cacheKey = `bulkStats:${page}:${limit}:${sortBy}:${sortOrder}`;
    logger.debug(`DASHBOARD_CTRL: Cache key: ${cacheKey}`);

    // Try cache
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      const elapsedCache = Date.now() - startTime;
      logger.info(`DASHBOARD_CTRL: Cache HIT for ${cacheKey}. Time: ${elapsedCache}ms`);
      res.set('X-Cache', 'HIT');
      res.set('X-Response-Time', `${elapsedCache}ms`);
      logger.info(`---> EXITING Dashboard Controller (Cache Hit): Sending 200 OK`);
      return res.json(cachedData);
    }
    logger.info(`DASHBOARD_CTRL: Cache MISS for ${cacheKey}. Fetching from DB.`);

    const sortOptions = { [sortBy]: parseInt(sortOrder) };
    const pipeline = [
      { $sort: sortOptions },
      { $skip: parseInt(skip) },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userDetails',
          pipeline: [{ $project: { username: 1, email: 1 } }],
        },
      },
      { $unwind: { path: '$userDetails', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          userId: '$user',
          username: '$userDetails.username',
          email: '$userDetails.email',
          totalFasts: 1,
          longestFast: 1,
          streak: 1,
          badges: 1,
          lastUpdated: 1,
        },
      },
    ];

    logger.debug(`DASHBOARD_CTRL: DB Query - Executing aggregation pipeline for bulk stats`);
    const [stats, totalDocuments] = await Promise.all([
      Dashboard.aggregate(pipeline).exec(),
      Dashboard.estimatedDocumentCount(),
    ]);

    const responseData = {
      stats,
      pagination: {
        total: totalDocuments,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalDocuments / parseInt(limit)),
      },
    };

    logger.debug(`DASHBOARD_CTRL: Caching result for ${cacheKey} with TTL=60s`);
    await setCache(cacheKey, responseData, 60);

    const elapsed = Date.now() - startTime;
    res.set('X-Response-Time', `${elapsed}ms`);
    res.set('X-Cache', 'MISS');
    logger.info(`---> EXITING Dashboard Controller (Success): Sending 200 OK. Time: ${elapsed}ms`);
    return res.json(responseData);
  } catch (error) {
    const elapsedError = Date.now() - startTime;
    logger.error(`--- DASHBOARD_CTRL_ERROR in getBulkStats. Time: ${elapsedError}ms ---`, {
      message: error.message,
      stack: error.stack,
    });

    if (error instanceof mongoose.Error) {
      logger.info(`---> EXITING Dashboard Controller (Mongoose Error): Sending 400`);
      return res.status(400).json({ message: 'Invalid query parameters' });
    }

    logger.info(`---> EXITING Dashboard Controller (Internal Error): Sending 500`);
    return res.status(500).json({
      message: 'Internal server error',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined,
    });
  }
};

/**
 * Get user fast history with analytics
 */
exports.getFastHistory = async (req, res) => {
  const startTime = Date.now();
  logger.info(`---> ENTERING Dashboard Controller: getFastHistory handler. User: ${req.user?._id}`);

  const userId = req.user?._id;
  if (!userId) {
    logger.error('DASHBOARD_CTRL_ERROR: req.user._id not found!');
    return res.status(401).json({ message: 'Unauthorized - User context missing' });
  }

  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      logger.error(`DASHBOARD_CTRL_ERROR: Invalid ObjectId format for userId: ${userId}`);
      return res.status(400).json({ message: 'Invalid user identifier' });
    }
    const objectId = new mongoose.Types.ObjectId(userId);

    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const cacheKey = `fastHistory:${userId}:${page}:${limit}`;
    logger.debug(`DASHBOARD_CTRL: Cache key: ${cacheKey}`);

    // Try cache
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      const elapsedCache = Date.now() - startTime;
      logger.info(`DASHBOARD_CTRL: Cache HIT for ${cacheKey}. Time: ${elapsedCache}ms`);
      res.set('X-Cache', 'HIT');
      res.set('X-Response-Time', `${elapsedCache}ms`);
      logger.info(`---> EXITING Dashboard Controller (Cache Hit): Sending 200 OK`);
      return res.json(cachedData);
    }
    logger.info(`DASHBOARD_CTRL: Cache MISS for ${cacheKey}. Fetching from DB.`);

    logger.debug(`DASHBOARD_CTRL: DB Query - Fetching fast history for user ${objectId}`);
    const [fasts, totalFasts, averageDuration] = await Promise.all([
      Fast.find({ user: objectId, completed: true })
        .sort({ endDate: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('startDate endDate elapsedTime notes')
        .lean()
        .exec(),
      Fast.countDocuments({ user: objectId, completed: true }),
      Fast.aggregate([
        { $match: { user: objectId, completed: true } },
        { $group: { _id: null, avg: { $avg: '$elapsedTime' } } },
      ]).exec(),
    ]);

    const formattedFasts = fasts.map((fast) => ({
      ...fast,
      durationHours: Math.round(fast.elapsedTime / 3600000 * 10) / 10,
      date: fast.endDate,
    }));

    const responseData = {
      fasts: formattedFasts,
      analytics: {
        totalFasts,
        averageHours: averageDuration.length > 0 ? Math.round(averageDuration[0].avg / 3600000 * 10) / 10 : 0,
      },
      pagination: {
        total: totalFasts,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalFasts / parseInt(limit)),
      },
    };

    logger.debug(`DASHBOARD_CTRL: Caching result for ${cacheKey}`);
    await setCache(cacheKey, responseData);

    const elapsed = Date.now() - startTime;
    res.set('X-Response-Time', `${elapsed}ms`);
    res.set('X-Cache', 'MISS');
    logger.info(`---> EXITING Dashboard Controller (Success): Sending 200 OK. Time: ${elapsed}ms`);
    return res.json(responseData);
  } catch (error) {
    const elapsedError = Date.now() - startTime;
    logger.error(`--- DASHBOARD_CTRL_ERROR in getFastHistory for user ${userId}. Time: ${elapsedError}ms ---`, {
      message: error.message,
      stack: error.stack,
    });

    if (error instanceof mongoose.Error.CastError) {
      logger.info(`---> EXITING Dashboard Controller (Cast Error): Sending 400`);
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    logger.info(`---> EXITING Dashboard Controller (Internal Error): Sending 500`);
    return res.status(500).json({
      message: 'Internal server error',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined,
    });
  }
};

/**
 * Get leaderboard data with optimized caching
 */
exports.getLeaderboard = async (req, res) => {
  const startTime = Date.now();
  logger.info(`---> ENTERING Dashboard Controller: getLeaderboard handler. Type: ${req.query.type}`);

  try {
    const { limit = 10, type = 'streak' } = req.query;
    const validTypes = ['streak', 'longestFast', 'totalFasts'];
    if (!validTypes.includes(type)) {
      logger.warn(`DASHBOARD_CTRL_WARN: Invalid leaderboard type: ${type}`);
      return res.status(400).json({ message: 'Invalid leaderboard type' });
    }

    const cacheKey = `leaderboard:${type}:${limit}`;
    logger.debug(`DASHBOARD_CTRL: Cache key: ${cacheKey}`);

    // Try cache
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      const elapsedCache = Date.now() - startTime;
      logger.info(`DASHBOARD_CTRL: Cache HIT for ${cacheKey}. Time: ${elapsedCache}ms`);
      res.set('X-Cache', 'HIT');
      res.set('X-Response-Time', `${elapsedCache}ms`);
      logger.info(`---> EXITING Dashboard Controller (Cache Hit): Sending 200 OK`);
      return res.json(cachedData);
    }
    logger.info(`DASHBOARD_CTRL: Cache MISS for ${cacheKey}. Fetching from DB.`);

    const sortField = type === 'streak' ? 'streak' : type;
    const sortOptions = { [sortField]: -1 };
    let pipeline;

    if (type === 'streak') {
      pipeline = [
        { $match: { streak: { $gt: 0 } } },
        { $sort: { streak: -1 } },
        { $limit: parseInt(limit) },
        { $project: { _id: 1, username: 1, streak: 1 } },
      ];
    } else {
      pipeline = [
        { $sort: sortOptions },
        { $limit: parseInt(limit) },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'userDetails',
          },
        },
        { $unwind: '$userDetails' },
        {
          $project: {
            _id: 0,
            userId: '$user',
            username: '$userDetails.username',
            [type]: 1,
          },
        },
      ];
    }

    logger.debug(`DASHBOARD_CTRL: DB Query - Executing ${type} leaderboard query`);
    const leaderboard = type === 'streak'
      ? await User.aggregate(pipeline).exec()
      : await Dashboard.aggregate(pipeline).exec();

    const processedData = leaderboard.map((entry, index) => ({
      rank: index + 1,
      username: entry.username,
      value: entry[type],
      userId: entry.userId || entry._id,
    }));

    const responseData = { type, leaderboard: processedData };

    logger.debug(`DASHBOARD_CTRL: Caching result for ${cacheKey} with TTL=600s`);
    await setCache(cacheKey, responseData, 600);

    const elapsed = Date.now() - startTime;
    res.set('X-Response-Time', `${elapsed}ms`);
    res.set('X-Cache', 'MISS');
    logger.info(`---> EXITING Dashboard Controller (Success): Sending 200 OK. Time: ${elapsed}ms`);
    return res.json(responseData);
  } catch (error) {
    const elapsedError = Date.now() - startTime;
    logger.error(`--- DASHBOARD_CTRL_ERROR in getLeaderboard. Time: ${elapsedError}ms ---`, {
      message: error.message,
      stack: error.stack,
    });

    logger.info(`---> EXITING Dashboard Controller (Internal Error): Sending 500`);
    return res.status(500).json({
      message: 'Internal server error',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined,
    });
  }
};

// --- Clean up resources on application shutdown ---
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, cleaning up Redis connection');
  if (redisClient) {
    await redisClient.quit();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, cleaning up Redis connection');
  if (redisClient) {
    await redisClient.quit();
  }
  process.exit(0);
});
