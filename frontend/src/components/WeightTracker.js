import React, { useState, useEffect } from 'react';
import { weights } from '../utils/api';

const WeightTracker = () => {
  const [state, setState] = useState({
    weightData: [],
    loading: true,
    error: null,
    form: {
      weight: '',
      date: ''
    }
  });

  useEffect(() => {
    fetchWeights();
  }, []);

  const fetchWeights = async () => {
    console.log('📊 Fetching weights...');
    setState(prev => ({ ...prev, loading: true }));

    try {
      const response = await weights.getAll();
      console.log('📊 Weights API response:', response);

      if (!response || !Array.isArray(response.data)) {
        throw new Error('Invalid response format from server');
      }

      const sortedData = response.data.sort((a, b) => new Date(a.date) - new Date(b.date));
      console.log('📊 Processed weight data:', {
        count: sortedData.length,
        firstEntry: sortedData[0],
        lastEntry: sortedData[sortedData.length - 1]
      });

      setState(prev => ({
        ...prev,
        weightData: sortedData,
        loading: false,
        error: null
      }));

    } catch (err) {
      console.error('📊 Weight fetching error:', {
        message: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString()
      });

      setState(prev => ({
        ...prev,
        error: 'Failed to load weight data. Please try again.',
        loading: false
      }));
    }
  };

  const addWeight = async (e) => {
    e.preventDefault();
    console.log('📊 Adding new weight entry:', state.form);

    try {
      const { weight, date } = state.form;
      
      // Input validation
      const weightValue = parseFloat(weight);
      if (isNaN(weightValue) || weightValue <= 0) {
        throw new Error('Please enter a valid weight');
      }

      if (!date) {
        throw new Error('Please select a date');
      }

      // Create weight entry
      const weightEntry = {
        weight: weightValue,
        date: new Date(date).toISOString()
      };

      console.log('📊 Sending weight entry to API:', weightEntry);
      await weights.add(weightEntry);

      // Refresh weights data
      await fetchWeights();

      // Reset form
      setState(prev => ({
        ...prev,
        form: { weight: '', date: '' },
        error: null
      }));

      console.log('📊 Weight entry added successfully');

    } catch (err) {
      console.error('📊 Error adding weight:', {
        message: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString()
      });

      setState(prev => ({
        ...prev,
        error: err.message || 'Failed to add weight. Please try again.'
      }));
    }
  };

  const handleInputChange = (name, value) => {
    setState(prev => ({
      ...prev,
      form: {
        ...prev.form,
        [name]: value
      }
    }));
  };

  const getWeightStats = () => {
    const { weightData } = state;
    if (!weightData.length) return null;

    const stats = {
      latest: weightData[weightData.length - 1].weight,
      average: weightData.reduce((sum, entry) => sum + parseFloat(entry.weight), 0) / weightData.length,
      lowest: Math.min(...weightData.map(entry => entry.weight)),
      highest: Math.max(...weightData.map(entry => entry.weight)),
      totalEntries: weightData.length
    };

    if (weightData.length > 1) {
      const firstWeight = parseFloat(weightData[0].weight);
      const lastWeight = parseFloat(weightData[weightData.length - 1].weight);
      stats.netChange = lastWeight - firstWeight;
    }

    console.log('📊 Weight statistics calculated:', stats);
    return stats;
  };

  const getWeightTrend = (days = 7) => {
    const { weightData } = state;
    if (weightData.length < 2) return null;

    const now = new Date();
    const cutoffDate = new Date(now.setDate(now.getDate() - days));
    
    const recentEntries = weightData.filter(entry => new Date(entry.date) >= cutoffDate);
    
    if (recentEntries.length < 2) return null;

    const firstWeight = parseFloat(recentEntries[0].weight);
    const lastWeight = parseFloat(recentEntries[recentEntries.length - 1].weight);
    const change = lastWeight - firstWeight;
    const changePerDay = change / days;

    return {
      change,
      changePerDay,
      direction: change > 0 ? 'increasing' : change < 0 ? 'decreasing' : 'stable',
      period: days
    };
  };

  if (state.loading) {
    return <div>Loading weight data...</div>;
  }

  const stats = getWeightStats();
  const trend = getWeightTrend();
  const recentEntries = state.weightData.slice(-5);

  return (
    <div>
      {state.error && (
        <div>{state.error}</div>
      )}

      <form onSubmit={addWeight}>
        <input
          type="number"
          value={state.form.weight}
          onChange={(e) => handleInputChange('weight', e.target.value)}
          placeholder="Weight (kg)"
          step="0.1"
          required
        />
        <input
          type="date"
          value={state.form.date}
          onChange={(e) => handleInputChange('date', e.target.value)}
          required
        />
        <button type="submit">Add Weight</button>
      </form>

      {stats && (
        <div>
          <h3>Statistics</h3>
          <p>Latest Weight: {stats.latest} kg</p>
          <p>Average Weight: {stats.average.toFixed(1)} kg</p>
          <p>Lowest Weight: {stats.lowest} kg</p>
          <p>Highest Weight: {stats.highest} kg</p>
          {stats.netChange !== undefined && (
            <p>Net Change: {stats.netChange.toFixed(1)} kg</p>
          )}
        </div>
      )}

      {trend && (
        <div>
          <h3>Recent Trend ({trend.period} days)</h3>
          <p>Change: {trend.change.toFixed(1)} kg</p>
          <p>Per Day: {trend.changePerDay.toFixed(2)} kg</p>
          <p>Direction: {trend.direction}</p>
        </div>
      )}

      {recentEntries.length > 0 && (
        <div>
          <h3>Recent Entries</h3>
          {recentEntries.map((entry, index) => (
            <div key={index}>
              <span>{new Date(entry.date).toLocaleDateString()}: </span>
              <span>{entry.weight} kg</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WeightTracker;