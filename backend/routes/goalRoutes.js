const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware'); // Assuming you have an auth middleware

// GET all goals
router.get('/', auth, (req, res) => {
  res.status(200).json({ message: 'Fetch all goals' });
});

// POST a new goal
router.post('/', auth, (req, res) => {
  res.status(201).json({ message: 'Create a new goal' });
});

// GET a specific goal
router.get('/:id', auth, (req, res) => {
  res.status(200).json({ message: `Fetch goal with id ${req.params.id}` });
});

// PUT update a goal
router.put('/:id', auth, (req, res) => {
  res.status(200).json({ message: `Update goal with id ${req.params.id}` });
});

// DELETE a goal
router.delete('/:id', auth, (req, res) => {
  res.status(200).json({ message: `Delete goal with id ${req.params.id}` });
});

module.exports = router;