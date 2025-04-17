// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger'); // Assuming you have this logger

const protect = async (req, res, next) => {
    console.log('[authMiddleware] Protect middleware called for:', req.method, req.originalUrl); // Log which route is being protected
    let token;

    // 1. Check Authorization header for Bearer token
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            console.log('[authMiddleware] Bearer token found in authorization header.');

            // 2. Extract token from header
            token = req.headers.authorization.split(' ')[1];
            if (!token) {
                console.warn('[authMiddleware] Token format invalid (missing token after Bearer).');
                return res.status(401).json({ message: 'Not authorized, invalid token format' });
            }

            // 3. Check JWT_SECRET environment variable (CRUCIAL!)
            const secretUsed = process.env.JWT_SECRET; // Store it first
            console.log(`PROTECT_MIDDLEWARE: JWT_SECRET Check: ${secretUsed ? 'Set (' + secretUsed.substring(0, 3) + '...)' : '!!! UNDEFINED !!!'}`);
            if (!secretUsed) {
                // Log FATAL error, but send generic message to client
                logger.error('[authMiddleware] FATAL: JWT_SECRET environment variable is not set AT VERIFICATION.');
                return res.status(500).json({ message: 'Server configuration error' });
            }

            // 4. Log token start and Verify the token
            console.log(`PROTECT_MIDDLEWARE: Verifying token starting with: ${token.substring(0, 10)}...`);
            // jwt.verify is synchronous by default if no callback is provided
            const decoded = jwt.verify(token, secretUsed); // Use the stored secret variable

            // 5. Log decoded payload on success
            console.log('[authMiddleware] Token verified successfully. Decoded payload:', decoded);

            // 6. Check if decoded payload is valid and contains user ID (usually 'id' or '_id')
            // Adjust 'decoded.id' if your payload uses a different key like 'userId' or '_id'
            if (!decoded || !decoded.id) {
                logger.warn('[authMiddleware] Token payload is invalid or missing required ID field:', decoded);
                return res.status(401).json({ message: 'Not authorized, invalid token payload' });
            }

            // 7. Find user in database based on token ID
            const userIdFromToken = decoded.id;
            console.log('[authMiddleware] Finding user in database with ID from token:', userIdFromToken);
            // Use .lean() for performance - returns a plain JS object
            // Exclude password hash for security
            const userFromDb = await User.findById(userIdFromToken).select('-password').lean();

            // 8. Check if user associated with token still exists
            if (!userFromDb) {
                console.warn('[authMiddleware] User associated with token not found in DB. ID:', userIdFromToken);
                // This could happen if the user was deleted after the token was issued
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }
            console.log('[authMiddleware] User found from DB:', userFromDb._id); // Log found user ID

            // 9. Attach the plain user object (from .lean()) to the request object
            req.user = userFromDb; // Contains _id, username, email etc. (excluding password)
            console.log('[authMiddleware] User attached to req.user. ID:', req.user._id);

            // 10. Proceed to the next middleware or the actual route handler
            next();

        } catch (error) {
            // Handle errors during token verification or user lookup
            console.error('[authMiddleware] Token verification or user lookup failed:', error.message); // Log the specific error message
            logger.error('[authMiddleware] Error in protect middleware:', {
                name: error.name, // e.g., JsonWebTokenError, TokenExpiredError
                message: error.message,
                tokenProvided: !!token, // Log if a token was extracted
                url: req.originalUrl
            });

            // Send appropriate 401 response based on error type
            if (error.name === 'JsonWebTokenError') {
                // e.g., malformed token, invalid signature
                return res.status(401).json({ message: 'Not authorized, invalid token' });
            } else if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Not authorized, token expired' });
            } else {
                // Catch-all for other unexpected errors during the process
                return res.status(500).json({ message: 'Authentication processing error' });
            }
        }
    } else {
        // Case where 'Authorization' header is missing or doesn't start with 'Bearer '
        console.log('[authMiddleware] No Bearer token found in authorization header.');
        return res.status(401).json({ message: 'Not authorized, no token provided' });
    }
};

module.exports = { protect };