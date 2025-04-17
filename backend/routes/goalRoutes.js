// routes/goalRoutes.js

const express = require('express');
const router = express.Router();
// --- CORRECT IMPORT ---
const { protect } = require('../middleware/authMiddleware'); // Use destructuring

// Placeholder controllers (replace with actual logic later)
const goalController = {
    getAllGoals: (req, res) => res.status(200).json({ message: `Fetch all goals for user ${req.user.id}` }),
    createGoal: (req, res) => res.status(201).json({ message: `Create a new goal for user ${req.user.id}`, data: req.body }),
    getGoalById: (req, res) => res.status(200).json({ message: `Fetch goal with id ${req.params.id} for user ${req.user.id}` }),
    updateGoal: (req, res) => res.status(200).json({ message: `Update goal with id ${req.params.id} for user ${req.user.id}`, data: req.body }),
    deleteGoal: (req, res) => res.status(200).json({ message: `Delete goal with id ${req.params.id} for user ${req.user.id}` })
};

// GET all goals - Use 'protect'
router.get('/', protect, goalController.getAllGoals);

// POST a new goal - Use 'protect'
router.post('/', protect, goalController.createGoal);

// GET a specific goal - Use 'protect'
router.get('/:id', protect, goalController.getGoalById);

// PUT update a goal - Use 'protect'
router.put('/:id', protect, goalController.updateGoal);

// DELETE a goal - Use 'protect'
router.delete('/:id', protect, goalController.deleteGoal);

module.exports = router;