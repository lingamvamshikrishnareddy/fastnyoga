import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Trophy, Flame, Clock, Medal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/card';

function Dashboard() {
  const { user, setUser } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/dashboard/stats');
      const data = response.data;

      if (!data || !data.stats) {
        throw new Error('Invalid response from server');
      }

      setStats(data.stats);

      if (setUser && data.user) {
        setUser(prevUser => ({
          ...prevUser,
          streak: data.user.streak,
          badges: data.user.badges,
        }));
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [setUser]);

  useEffect(() => {
    let isMounted = true;

    const handleFastingStateChange = () => {
      if (isMounted) {
        fetchStats();
      }
    };

    // Set up event listener for fasting state changes
    window.addEventListener('fastingStateChanged', handleFastingStateChange);

    fetchStats();

    // Cleanup
    return () => {
      isMounted = false;
      window.removeEventListener('fastingStateChanged', handleFastingStateChange);
    };
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 p-4 rounded-lg text-red-800">{error}</div>
      </div>
    );
  }

  if (!stats || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">No stats available</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Welcome, {user.username}!
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center space-x-2">
              <Flame className="h-6 w-6 text-orange-500" />
              <CardTitle>Current Streak</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{user.streak} days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-x-2">
              <Trophy className="h-6 w-6 text-yellow-500" />
              <CardTitle>Total Fasts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalFasts}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center space-x-2">
              <Clock className="h-6 w-6 text-blue-500" />
              <CardTitle>Longest Fast</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.longestFast} hours</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Medal className="h-6 w-6 text-purple-500" />
              <span>Badges</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {user.badges && user.badges.map((badge, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800"
                >
                  {badge}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Dashboard;
