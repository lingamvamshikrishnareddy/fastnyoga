// In middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // 1. Extract token from header
            token = req.headers.authorization.split(' ')[1];

            // 2. Verify the token using the secret
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // --- THIS IS THE FIX ---
            // The token is verified, so we can TRUST the payload.
            // We will attach the decoded payload directly to the request object.
            // There is no need to make another database call here.
            // The decoded payload already contains the user's ID.
            req.user = {
                id: decoded.id,
                _id: decoded.id // Provide both for compatibility
            };
            
            // 3. Proceed to the next step (the route handler)
            next();

        } catch (error) {
            logger.error('Token verification failed in authMiddleware:', {
                name: error.name,
                message: error.message,
            });
            
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Not authorized, token has expired' });
            }
            
            return res.status(401).json({ message: 'Not authorized, token is invalid' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token provided' });
    }
};

module.exports = { protect };