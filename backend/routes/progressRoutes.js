// routes/progressRoutes.js

const express = require('express');
const router = express.Router();
// --- CORRECT IMPORT ---
const { protect } = require('../middleware/authMiddleware'); // Use destructuring

// Placeholder controllers (replace with actual logic later)
const progressController = {
    getAllProgress: (req, res) => res.status(200).json({ message: `Fetch all progress for user ${req.user.id}` }),
    createProgress: (req, res) => res.status(201).json({ message: `Create new progress for user ${req.user.id}`, data: req.body }),
    getProgressById: (req, res) => res.status(200).json({ message: `Fetch progress entry ${req.params.id} for user ${req.user.id}` }),
    updateProgress: (req, res) => res.status(200).json({ message: `Update progress entry ${req.params.id} for user ${req.user.id}`, data: req.body }),
    deleteProgress: (req, res) => res.status(200).json({ message: `Delete progress entry ${req.params.id} for user ${req.user.id}` })
};


// GET all progress entries - Use 'protect'
router.get('/', protect, progressController.getAllProgress);

// POST a new progress entry - Use 'protect'
router.post('/', protect, progressController.createProgress);

// GET a specific progress entry - Use 'protect'
router.get('/:id', protect, progressController.getProgressById);

// PUT update a progress entry - Use 'protect'
router.put('/:id', protect, progressController.updateProgress);

// DELETE a progress entry - Use 'protect'
router.delete('/:id', protect, progressController.deleteProgress);

module.exports = router;