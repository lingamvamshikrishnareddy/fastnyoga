import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from "../components/card";
import { Input } from "../components/input";
import { Button } from "../components/button";
import { Plus } from "lucide-react";

const WeightTracker = () => {
  const [weights, setWeights] = useState([]);
  const [newWeight, setNewWeight] = useState('');
  const [newDate, setNewDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchWeights();
  }, []);

  const fetchWeights = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/weights/user');
      if (!res.ok) throw new Error('Failed to fetch weights');
      const data = await res.json();
      setWeights(data.sort((a, b) => new Date(a.date) - new Date(b.date)));
      setError(null);
    } catch (err) {
      setError('Failed to load weight data');
      console.error('Error fetching weights:', err);
    } finally {
      setLoading(false);
    }
  };

  const addWeight = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/weights/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weight: parseFloat(newWeight),
          date: newDate,
        }),
      });
      
      if (!res.ok) throw new Error('Failed to add weight');
      
      await fetchWeights();
      setNewWeight('');
      setNewDate('');
    } catch (err) {
      setError('Failed to add weight');
      console.error('Error adding weight:', err);
    }
  };

  const formattedData = weights.map(w => ({
    date: new Date(w.date).toLocaleDateString(),
    weight: parseFloat(w.weight)
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">Weight Progress</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        <div className="h-64 mb-8">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
              <XAxis dataKey="date" />
              <YAxis domain={['auto', 'auto']} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <form onSubmit={addWeight} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              type="number"
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              placeholder="Weight (kg)"
              step="0.1"
              required
              className="w-full"
            />
            <Input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              required
              className="w-full"
            />
            <Button type="submit" className="w-full flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" />
              Add Weight
            </Button>
          </div>
        </form>

        {weights.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-2">Recent Entries</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 px-4 text-left">Date</th>
                    <th className="py-2 px-4 text-right">Weight (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {weights.slice(-5).reverse().map((weight, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2 px-4">
                        {new Date(weight.date).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-4 text-right">
                        {weight.weight.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WeightTracker;