import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Square, Flame, Activity } from 'lucide-react';
import { fasts } from '../utils/api';

const FastingTimer = () => {
  const [fastState, setFastState] = useState({
    isRunning: false,
    startTime: null,
    elapsedTime: 0,
    targetHours: 16
  });

  const [error, setError] = useState(null);

  const formatTime = (ms) => {
    if (!ms || ms < 0) return '00:00:00';
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const calculateProgress = useCallback(() => {
    if (!fastState.isRunning) return 0;
    const progress = (fastState.elapsedTime / (fastState.targetHours * 3600000)) * 100;
    return Math.min(Math.max(0, progress), 100);
  }, [fastState.elapsedTime, fastState.targetHours, fastState.isRunning]);

  const handleStart = async () => {
    try {
      setError(null);
      const startTime = Date.now();
      
      const response = await fasts.create({
        targetHours: fastState.targetHours,
        startTime: new Date(startTime).toISOString()
      });

      if (response?.fast) {
        setFastState(prev => ({
          ...prev,
          isRunning: true,
          startTime,
          elapsedTime: 0,
          fastId: response.fast._id
        }));
      }
    } catch (err) {
      setError(err.message || 'Failed to start fast');
    }
  };

  const handleStop = async () => {
    try {
      setError(null);
      if (fastState.fastId) {
        await fasts.end(fastState.fastId);
      }
      
      setFastState(prev => ({
        ...prev,
        isRunning: false,
        startTime: null,
        elapsedTime: 0,
        fastId: null
      }));
    } catch (err) {
      setError(err.message || 'Failed to end fast');
    }
  };

  useEffect(() => {
    let timer;
    if (fastState.isRunning) {
      timer = setInterval(() => {
        setFastState(prev => ({
          ...prev,
          elapsedTime: Date.now() - prev.startTime
        }));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [fastState.isRunning]);

  const progress = calculateProgress();
  const caloriesBurned = Math.round((fastState.elapsedTime / 3600000) * 50); // Rough estimate

  return (
    <div className="max-w-4xl mx-auto p-8 bg-gray-50 min-h-screen font-sans">
      <div className="bg-white rounded-3xl p-10 shadow-lg transition-all duration-300 hover:translate-y-[-5px] hover:shadow-xl">
        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="relative w-80 h-80 mx-auto mb-12">
          <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 100 100">
            <circle
              className="fill-none stroke-gray-200 stroke-[10] opacity-30"
              cx="50"
              cy="50"
              r="45"
            />
            <circle
              className="fill-none stroke-blue-500 stroke-[10] transition-all duration-500"
              cx="50"
              cy="50"
              r="45"
              style={{
                strokeDasharray: 283,
                strokeDashoffset: 283 - (283 * progress) / 100
              }}
            />
          </svg>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center w-4/5">
            <span className="block text-4xl font-bold text-gray-900 mb-2">
              {formatTime(fastState.elapsedTime)}
            </span>
            <span className="block text-lg text-gray-600">
              {fastState.targetHours}h Target
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="bg-white p-6 rounded-2xl shadow-md flex items-center">
            <Flame className="w-7 h-7 text-gray-600 mr-5" />
            <div>
              <span className="block text-sm text-gray-600 uppercase tracking-wide">
                Calories Burned
              </span>
              <span className="text-2xl font-semibold text-gray-900">
                {caloriesBurned}
              </span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-md flex items-center">
            <Activity className="w-7 h-7 text-gray-600 mr-5" />
            <div>
              <span className="block text-sm text-gray-600 uppercase tracking-wide">
                Progress
              </span>
              <span className="text-2xl font-semibold text-gray-900">
                {Math.min(100, Math.round(progress))}%
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {!fastState.isRunning ? (
            <button
              onClick={handleStart}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-4 px-8 rounded-xl font-semibold flex items-center justify-center transition-all duration-300"
            >
              <Clock className="w-5 h-5 mr-3" />
              Start Fast
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="w-full bg-red-500 hover:bg-red-600 text-white py-4 px-8 rounded-xl font-semibold flex items-center justify-center transition-all duration-300"
            >
              <Square className="w-5 h-5 mr-3" />
              End Fast
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FastingTimer;