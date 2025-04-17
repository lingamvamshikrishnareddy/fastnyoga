import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Trophy, Flame, Clock, Medal } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/card';
import api from '../utils/api';
import { dashboard } from '../utils/api'; // Assuming dashboard is exported from api.js

// Define ERROR_CODES
const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  // Add other error codes as needed
};

function Dashboard() {
  const { user, refreshUser, isAuthenticated, authInitialized } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modified fetchStats to ensure auth is initialized first
  const fetchStats = useCallback(async (retryCount = 0, maxRetries = 2) => {
    try {
      setLoading(true);
      setError(null);

      // Wait for auth to be initialized
      if (!authInitialized) {
        console.log('Auth not yet initialized, waiting...');
        await new Promise(resolve => setTimeout(resolve, 300));
        return fetchStats(retryCount, maxRetries);
      }

      // If not authenticated, don't even try
      if (!isAuthenticated) {
        console.log('Not authenticated, cannot fetch stats');
        throw new Error('Authentication required');
      }

      // Log token presence for debugging
      const token = localStorage.getItem('token');
      console.log(`Dashboard attempting to fetch stats with token: ${token ? 'Yes' : 'No'}`);

      try {
        // Use the dashboard endpoint from api utils
        const data = await dashboard.getStats();

        if (!data || !data.stats) {
          throw new Error('Invalid response from server');
        }

        console.log('Stats loaded successfully:', data);
        setStats(data.stats);
      } catch (err) {
        // Existing retry logic
        if (retryCount < maxRetries &&
            (err.code === ERROR_CODES.NETWORK_ERROR || err.status >= 500)) {
          const delay = Math.pow(2, retryCount) * 1000;
          console.log(`Retrying after ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return fetchStats(retryCount + 1, maxRetries);
        }
        throw err;
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError(err.message || 'Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [refreshUser, isAuthenticated, authInitialized]);

  // Use effect with dependencies on auth state
  useEffect(() => {
    let isMounted = true;

    if (isAuthenticated && authInitialized) {
      fetchStats();
    }

    const handleFastingStateChange = () => {
      if (isMounted && isAuthenticated) {
        fetchStats();
      }
    };

    window.addEventListener('fastingStateChanged', handleFastingStateChange);

    return () => {
      isMounted = false;
      window.removeEventListener('fastingStateChanged', handleFastingStateChange);
    };
  }, [fetchStats, isAuthenticated, authInitialized]);


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