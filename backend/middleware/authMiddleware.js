// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // 1. Extract token from header
            token = req.headers.authorization.split(' ')[1];
            
            // 2. Verify JWT_SECRET is available
            if (!process.env.JWT_SECRET) {
                logger.error('JWT_SECRET environment variable is not set');
                return res.status(500).json({ message: 'Server configuration error' });
            }
            
            // 3. Verify the token using the secret
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // 4. Optional: Fetch full user data from database
            // This ensures the user still exists and gets latest user data
            const user = await User.findById(decoded.id).select('-password').lean();
            
            if (!user) {
                logger.warn('Token valid but user not found:', { userId: decoded.id });
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }
            
            // 5. Attach user data to request
            req.user = {
                id: user._id,
                _id: user._id,
                username: user.username,
                email: user.email
            };
            
            // 6. Proceed to the next step (the route handler)
            next();
            
        } catch (error) {
            logger.error('Token verification failed in authMiddleware:', {
                name: error.name,
                message: error.message,
                token: token ? `${token.substring(0, 10)}...` : 'none'
            });
            
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Not authorized, token has expired' });
            }
            
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({ message: 'Not authorized, token is invalid' });
            }
            
            return res.status(401).json({ message: 'Not authorized, token verification failed' });
        }
    } else {
        // No token provided
        logger.warn('No authorization token provided');
        return res.status(401).json({ message: 'Not authorized, no token provided' });
    }
};

module.exports = { protect };
