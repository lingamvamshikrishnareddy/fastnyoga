import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, Flame, Activity, DropletIcon, History } from 'lucide-react';
import { fasts } from '../utils/api';

const FASTING_STAGES = {
  INITIAL: {
    maxHours: 2,
    description: 'Blood sugar rises: Pancreas releases insulin',
    color: '#60A5FA',
    icon: '🌅',
    label: 'Initial'
  },
  EARLY: {
    maxHours: 5,
    description: 'Blood sugar falls: Using stored glucose',
    color: '#34D399',
    icon: '📉',
    label: 'Early'
  },
  GLUCOSE_DEPLETION: {
    maxHours: 8,
    description: 'Blood sugar normal: Depleting glucose stores',
    color: '#FBBF24',
    icon: '⚡',
    label: 'Glucose Depletion'
  },
  FAT_BURNING_INIT: {
    maxHours: 10,
    description: 'Fasting mode: Starting fat breakdown',
    color: '#F87171',
    icon: '🔥',
    label: 'Fat Burning Initiation'
  },
  FAT_BURNING: {
    maxHours: 12,
    description: 'Fat burning mode: Primary energy source',
    color: '#EC4899',
    icon: '⚡',
    label: 'Fat Burning'
  },
  KETOSIS: {
    maxHours: 18,
    description: 'Ketosis: Producing ketones for energy',
    color: '#8B5CF6',
    icon: '🎯',
    label: 'Ketosis'
  },
  DEEP_KETOSIS: {
    maxHours: Infinity,
    description: 'Deep ketosis: Maximum fat burning',
    color: '#6366F1',
    icon: '⭐',
    label: 'Deep Ketosis'
  }
};

const PRESET_HOURS = [
  { value: 16, label: '16 Hours' },
  { value: 18, label: '18 Hours' },
  { value: 24, label: '24 Hours' },
  { value: 36, label: '36 Hours' },
  { value: 'custom', label: 'Custom' }
];

const FastingTimer = () => {
  const [userPreferences, setUserPreferences] = useState(() => {
    const stored = localStorage.getItem('fastingPreferences');
    return stored ? JSON.parse(stored) : {
      targetHours: 16,
      customHours: '',
      lastStartTime: null,
      lastFastId: null
    };
  });

  const [fastState, setFastState] = useState({
    isRunning: false,
    startTime: null,
    elapsedTime: 0,
    targetHours: userPreferences.targetHours,
    caloriesBurned: 0,
    currentStage: FASTING_STAGES.INITIAL,
    fastId: null
  });

  const [fastingHistory, setFastingHistory] = useState([]);
  const [customHours, setCustomHours] = useState(userPreferences.customHours);
  const [selectedDateTime, setSelectedDateTime] = useState(new Date());
  const [showTips, setShowTips] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const progressRef = useRef(null);
  const timerRef = useRef(null);

  const formatTime = useCallback((ms) => {
    if (!ms || ms < 0) return '00:00:00';
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  const formatDate = useCallback((dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const calculateProgress = useCallback(() => {
    if (!fastState.isRunning) return 0;
    const progress = (fastState.elapsedTime / (fastState.targetHours * 3600000)) * 100;
    return Math.min(Math.max(0, progress), 100);
  }, [fastState.elapsedTime, fastState.targetHours, fastState.isRunning]);

  const getCurrentStage = useCallback((elapsedHours) => {
    if (elapsedHours <= 0) return FASTING_STAGES.INITIAL;
    const stages = Object.values(FASTING_STAGES);
    for (const stage of stages) {
      if (elapsedHours <= stage.maxHours) {
        return stage;
      }
    }
    return FASTING_STAGES.DEEP_KETOSIS;
  }, []);

  const calculateCalories = useCallback((elapsedMs) => {
    if (elapsedMs <= 0) return 0;
    const BASE_RATE = 2000;
    const FASTING_MULTIPLIER = 1.1;
    const hoursElapsed = elapsedMs / 3600000;
    return Math.max(0, Math.round((BASE_RATE * FASTING_MULTIPLIER / 24) * hoursElapsed));
  }, []);

  const loadFastingHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fasts.getAll();
      
      if (response?.fasts) {
        setFastingHistory(response.fasts);
        
        const activeFast = response.fasts.find(fast => !fast.endTime);
        if (activeFast) {
          const now = Date.now();
          const startTime = new Date(activeFast.startTime).getTime();
          const elapsedTime = now - startTime;
          
          setFastState(prev => ({
            ...prev,
            isRunning: true,
            startTime,
            elapsedTime,
            fastId: activeFast._id,
            targetHours: activeFast.targetHours,
            currentStage: getCurrentStage(elapsedTime / 3600000)
          }));
          
          setUserPreferences(prev => ({
            ...prev,
            lastStartTime: startTime,
            lastFastId: activeFast._id,
            targetHours: activeFast.targetHours
          }));
        }
      }
    } catch (err) {
      console.error('Failed to load fasting history:', err);
      setError('Unable to load fasting history. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  }, [getCurrentStage]);

  const handleStart = useCallback(async () => {
    try {
      setError(null);
      const now = Date.now();
      const startTime = Math.max(now, selectedDateTime.getTime());
      
      let targetHrs = fastState.targetHours;
      if (targetHrs === 'custom') {
        targetHrs = parseFloat(customHours);
        if (isNaN(targetHrs) || targetHrs <= 0 || targetHrs > 72) {
          throw new Error('Please enter valid custom hours between 1 and 72');
        }
      } else {
        targetHrs = parseFloat(targetHrs);
      }

      const response = await fasts.create({
        targetHours: targetHrs,
        startTime: new Date(startTime).toISOString()
      });

      if (!response?.fast?._id) {
        throw new Error('Failed to create fast. Please try again.');
      }

      const newPreferences = {
        ...userPreferences,
        targetHours: targetHrs,
        customHours,
        lastStartTime: startTime,
        lastFastId: response.fast._id
      };

      setUserPreferences(newPreferences);
      localStorage.setItem('fastingPreferences', JSON.stringify(newPreferences));

      setFastState(prev => ({
        ...prev,
        isRunning: true,
        startTime,
        elapsedTime: 0,
        targetHours: targetHrs,
        currentStage: FASTING_STAGES.INITIAL,
        fastId: response.fast._id
      }));

      await loadFastingHistory();

    } catch (err) {
      console.error('Failed to start fast:', err);
      setError(err.message || 'Failed to start fast. Please try again.');
    }
  }, [selectedDateTime, customHours, fastState.targetHours, userPreferences, loadFastingHistory]);

  const handleStop = useCallback(async () => {
    if (!window.confirm('Are you sure you want to end your fast?')) {
      return;
    }

    try {
      setError(null);
      const fastId = fastState.fastId || userPreferences.lastFastId;

      if (!fastId) {
        throw new Error('No active fast found');
      }

      await fasts.end(fastId);

      const newPreferences = {
        ...userPreferences,
        lastStartTime: null,
        lastFastId: null
      };
      
      setUserPreferences(newPreferences);
      localStorage.setItem('fastingPreferences', JSON.stringify(newPreferences));

      setFastState(prev => ({
        ...prev,
        isRunning: false,
        startTime: null,
        elapsedTime: 0,
        caloriesBurned: 0,
        currentStage: FASTING_STAGES.INITIAL,
        fastId: null
      }));

      await loadFastingHistory();
      window.dispatchEvent(new CustomEvent('fastingStateChanged'));

    } catch (err) {
      console.error('Failed to end fast:', err);
      if (err.status === 404) {
        setFastState(prev => ({
          ...prev,
          isRunning: false,
          startTime: null,
          elapsedTime: 0,
          fastId: null
        }));
        setUserPreferences(prev => ({
          ...prev,
          lastStartTime: null,
          lastFastId: null
        }));
        await loadFastingHistory();
      } else {
        setError(err.message || 'Failed to end fast. Please try again.');
      }
    }
  }, [fastState.fastId, userPreferences, loadFastingHistory]);

  useEffect(() => {
    localStorage.setItem('fastingPreferences', JSON.stringify(userPreferences));
  }, [userPreferences]);

  useEffect(() => {
    loadFastingHistory();
  }, [loadFastingHistory]);

  useEffect(() => {
    if (!fastState.isRunning) return;

    timerRef.current = setInterval(() => {
      const now = Date.now();
      setFastState(prev => {
        const newElapsedTime = now - prev.startTime;

        if (newElapsedTime >= prev.targetHours * 3600000) {
          clearInterval(timerRef.current);
          handleStop();
          return prev;
        }

        const elapsedHours = newElapsedTime / 3600000;
        return {
          ...prev,
          elapsedTime: newElapsedTime,
          caloriesBurned: calculateCalories(newElapsedTime),
          currentStage: getCurrentStage(elapsedHours)
        };
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [fastState.isRunning, getCurrentStage, calculateCalories, handleStop]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8 bg-gray-50 min-h-screen font-sans">
      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white rounded-3xl p-10 shadow-lg transition-all duration-300 hover:translate-y-[-5px] hover:shadow-xl">
        <div className="relative w-80 h-80 mx-auto mb-12">
          <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 100 100">
            <circle
              className="fill-none stroke-gray-200 stroke-[10] opacity-30"
              cx="50"
              cy="50"
              r="45"
            />
            <circle
              ref={progressRef}
              className="fill-none stroke-[10] rounded-full transition-all duration-500"
              cx="50"
              cy="50"
              r="45"
              style={{
                stroke: fastState.currentStage.color,
                strokeDasharray: 283,
                strokeDashoffset: 283 - (283 * calculateProgress()) / 100
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
              <span className="block text-sm text-gray-600 uppercase tracking-wide">Calories</span>
              <span className="text-2xl font-semibold text-gray-900">{fastState.caloriesBurned}</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-md flex items-center">
            <Activity className="w-7 h-7 text-gray-600 mr-5" />
            <div>
              <span className="block text-sm text-gray-600 uppercase tracking-wide">Progress</span>
              <span className="text-2xl font-semibold text-gray-900">
                {Math.min(100, Math.round(calculateProgress()))}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-md mb-10">
          <div className="flex items-center mb-4">
            <span className="text-3xl mr-4">{fastState.currentStage.icon}</span>
            <span className="text-xl font-semibold text-gray-900">
              {fastState.currentStage.label}
            </span>
          </div>
          <p className="text-gray-600 leading-relaxed">{fastState.currentStage.description}</p>
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
              <Activity className="w-5 h-5 mr-3" />
              End Fast
            </button>
          )}

          <select
            className="w-full p-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300"
            value={fastState.targetHours}
            onChange={(e) => setFastState(prev => ({ ...prev, targetHours: e.target.value }))}
            disabled={fastState.isRunning}
          >
            {PRESET_HOURS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          {fastState.targetHours === 'custom' && (
            <input
              type="number"
              className="w-full p-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300"
              value={customHours}
              onChange={(e) => {
                const value = Math.min(Math.max(1, e.target.value), 72);
                setCustomHours(value);
              }}
              placeholder="Custom hours (1-72)"
              min="1"
              max="72"
              disabled={fastState.isRunning}
            />
          )}

          <input
            type="datetime-local"
            className="w-full p-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300"
            value={selectedDateTime.toISOString().slice(0, 16)}
            onChange={(e) => {
              const newDate = new Date(e.target.value);
              if (newDate >= new Date()) {
                setSelectedDateTime(newDate);
              }
            }}
            min={new Date().toISOString().slice(0, 16)}
            disabled={fastState.isRunning}
          />
        </div>

        <div className="mt-8">
          <button
            onClick={() => setShowTips(!showTips)}
            className="text-gray-600 hover:text-blue-500 font-medium flex items-center transition-all duration-300"
          >
            <DropletIcon className="w-5 h-5 mr-3" />
            Fasting Tips
          </button>
          {showTips && (
            <ul className="mt-4 space-y-3">
              <li className="text-gray-600 pb-3 border-b border-gray-200 flex items-center">
                <span className="text-blue-500 font-bold mr-3">•</span>
                Stay hydrated with water and electrolytes
              </li>
              <li className="text-gray-600 pb-3 border-b border-gray-200 flex items-center">
                <span className="text-blue-500 font-bold mr-3">•</span>
                Keep yourself busy with activities
              </li>
              <li className="text-gray-600 pb-3 border-gray-200 flex items-center">
                <span className="text-blue-500 font-bold mr-3">•</span>
                Get adequate sleep and rest
              </li>
              <li className="text-gray-600 pb-3 border-b border-gray-200 flex items-center">
                <span className="text-blue-500 font-bold mr-3">•</span>
                Avoid looking at food content
              </li>
              <li className="text-gray-600 pb-3 border-b border-gray-200 flex items-center">
                <span className="text-blue-500 font-bold mr-3">•</span>
                Practice mindfulness or meditation
              </li>
            </ul>
          )}
        </div>

        <div className="mt-12 bg-white rounded-3xl p-10 shadow-lg">
          <div className="flex items-center mb-6">
            <History className="w-6 h-6 mr-3 text-gray-600" />
            <h2 className="text-2xl font-semibold text-gray-900">Fasting History</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4">Start Time</th>
                  <th className="text-left py-3 px-4">End Time</th>
                  <th className="text-left py-3 px-4">Duration</th>
                  <th className="text-left py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {fastingHistory.map((fast) => (
                  <tr key={fast._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">{formatDate(fast.startTime)}</td>
                    <td className="py-3 px-4">
                      {fast.endTime ? formatDate(fast.endTime) : 'In Progress'}
                    </td>
                    <td className="py-3 px-4">
                      {fast.endTime
                        ? `${((new Date(fast.endTime) - new Date(fast.startTime)) / (1000 * 60 * 60)).toFixed(1)}h`
                        : 'Ongoing'
                      }
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        fast.completed
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {fast.completed ? 'Completed' : 'In Progress'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FastingTimer;