const Weight = require('../models/Weight');

exports.addWeight = async (req, res) => {
  try {
    const { weight, date } = req.body;
    const newWeight = new Weight({
      user: req.user.id,
      weight,
      date
    });
    await newWeight.save();
    res.status(201).json(newWeight);
  } catch (error) {
    res.status(500).json({ message: 'Error adding weight', error: error.message });
  }
};

exports.getUserWeights = async (req, res) => {
  try {
    const weights = await Weight.find({ user: req.user.id }).sort({ date: -1 });
    res.json(weights);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching weights', error: error.message });
  }
};
