const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware'); // Assuming you have an auth middleware

// GET all progress entries
router.get('/', auth, (req, res) => {
  res.status(200).json({ message: 'Fetch all progress entries' });
});

// POST a new progress entry
router.post('/', auth, (req, res) => {
  res.status(201).json({ message: 'Create a new progress entry' });
});

// GET a specific progress entry
router.get('/:id', auth, (req, res) => {
  res.status(200).json({ message: `Fetch progress entry with id ${req.params.id}` });
});

// PUT update a progress entry
router.put('/:id', auth, (req, res) => {
  res.status(200).json({ message: `Update progress entry with id ${req.params.id}` });
});

// DELETE a progress entry
router.delete('/:id', auth, (req, res) => {
  res.status(200).json({ message: `Delete progress entry with id ${req.params.id}` });
});

module.exports = router;