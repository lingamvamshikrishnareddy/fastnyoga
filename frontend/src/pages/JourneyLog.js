import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { getUserFasts, getUserJourneys } from '../utils/api';
import { Clock, Calendar, Target, FileText, AlertCircle, RotateCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function JourneyLog() {
  const navigate = useNavigate();
  const [fasts, setFasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('startTime');
  const [sortDirection, setSortDirection] = useState('desc');
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchFasts = useCallback(async () => {
    try {
      setLoading(true);
      const [fastsRes, journeysRes] = await Promise.all([
        getUserFasts(),
        getUserJourneys()
      ]);

      const fastsData = Array.isArray(fastsRes?.data) ? fastsRes.data : [];
      const journeysData = Array.isArray(journeysRes?.data) ? journeysRes.data : [];

      const mergedData = fastsData.map(fast => {
        const matchingJourney = journeysData.find(journey =>
          journey.fastId === fast._id ||
          Math.abs(
            new Date(journey.startTime).getTime() -
            new Date(fast.startTime).getTime()
          ) < 60000 // 1 minute tolerance
        );

        const startTime = fast.startTime || matchingJourney?.startTime;
        const endTime = fast.endTime || matchingJourney?.endTime;
        const isCompleted = !!endTime;

        const duration = isCompleted
          ? new Date(endTime) - new Date(startTime)
          : Date.now() - new Date(startTime);

        return {
          ...fast,
          ...(matchingJourney || {}),
          _id: fast._id || matchingJourney?._id || `temp-${Date.now()}`,
          duration,
          hoursFasted: matchingJourney?.hoursFasted || fast.hoursFasted || 0,
          status: isCompleted ? 'completed' : 'in-progress',
          startTime,
          endTime,
          notes: fast.notes || matchingJourney?.notes || ''
        };
      });

      setFasts(mergedData);
      setError(null);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error?.message || 'Failed to fetch fasting data');
      setFasts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const handleFastingStateChange = () => {
      if (isMounted) {
        fetchFasts();
      }
    };

    fetchFasts();

    window.addEventListener('fastingStateChanged', handleFastingStateChange);
    const updateInterval = setInterval(() => {
      if (isMounted) {
        fetchFasts();
      }
    }, 60000);

    return () => {
      isMounted = false;
      clearInterval(updateInterval);
      window.removeEventListener('fastingStateChanged', handleFastingStateChange);
    };
  }, [fetchFasts]);

  const processedFasts = useMemo(() => {
    const filtered = filterStatus === 'all'
      ? fasts
      : fasts.filter(fast => fast.status === filterStatus);

    return [...filtered].sort((a, b) => {
      const modifier = sortDirection === 'desc' ? -1 : 1;

      switch (sortBy) {
        case 'duration':
          return ((a.duration || 0) - (b.duration || 0)) * modifier;
        case 'hoursFasted':
          return ((a.hoursFasted || 0) - (b.hoursFasted || 0)) * modifier;
        case 'startTime':
        default:
          return (new Date(a.startTime) - new Date(b.startTime)) * modifier;
      }
    });
  }, [fasts, sortBy, sortDirection, filterStatus]);

  const formatDuration = useCallback((durationMs) => {
    if (!durationMs || isNaN(durationMs) || durationMs < 0) return '0h 0m';
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-lg text-gray-600">Loading your fasting journey...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <h2 className="text-2xl font-semibold text-gray-800">Oops! Something went wrong</h2>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={fetchFasts}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            <RotateCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Fasting Journey
              <span className="text-gray-500 ml-2 text-lg">({processedFasts.length})</span>
            </h1>

            <div className="flex flex-wrap gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-48">
                <label className="sr-only" htmlFor="sort-by">Sort by</label>
                <select
                  id="sort-by"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="startTime">Date</option>
                  <option value="duration">Duration</option>
                  <option value="hoursFasted">Hours Fasted</option>
                </select>
              </div>

              <div className="relative w-full sm:w-48">
                <label className="sr-only" htmlFor="sort-direction">Sort direction</label>
                <select
                  id="sort-direction"
                  value={sortDirection}
                  onChange={(e) => setSortDirection(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>

              <div className="relative w-full sm:w-48">
                <label className="sr-only" htmlFor="filter-status">Filter status</label>
                <select
                  id="filter-status"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Fasts</option>
                  <option value="completed">Completed</option>
                  <option value="in-progress">In Progress</option>
                </select>
              </div>
            </div>
          </div>

          {processedFasts.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <p className="text-lg text-gray-600">
                No fasting sessions found. Ready to start your journey?
              </p>
              <button
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
                onClick={() => {
                  navigate('./FastingTimer.js');
                }}
              >
                Start New Fast
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {processedFasts.map((fast) => (
                <article
                  key={fast._id}
                  className="bg-gray-50 rounded-xl p-6 hover:shadow-md transition-shadow"
                >
                  <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-gray-500 flex-shrink-0" />
                      <time
                        className="text-lg font-medium text-gray-900"
                        dateTime={fast.startTime}
                      >
                        {new Date(fast.startTime).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </time>
                    </div>
                    <span
                      className={`px-4 py-1 rounded-full text-sm font-medium ${
                        fast.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {fast.status === 'completed' ? 'Completed' : 'In Progress'}
                    </span>
                  </header>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-gray-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-500">Start Time</p>
                        <p className="text-gray-600">
                          {new Date(fast.startTime).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>

                    {fast.endTime && (
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-gray-500 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-gray-500">End Time</p>
                          <p className="text-gray-600">
                            {new Date(fast.endTime).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <Target className="w-5 h-5 text-gray-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-500">Target</p>
                        <p className="text-gray-600">
                          {fast.targetHours || 0} hours
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-gray-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-500">Duration</p>
                        <p className="text-gray-600">
                          {formatDuration(fast.duration)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-gray-500 mt-1 flex-shrink-0" />
                      <div className="w-full">
                        <p className="text-sm text-gray-500 mb-1">Notes</p>
                        <p className="text-gray-600 whitespace-pre-wrap">
                          {fast.notes || 'No notes provided for this session'}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default JourneyLog;
