import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, Flame, Activity, DropletIcon } from 'lucide-react';
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
      lastStartTime: null
    };
  });

  const [fastState, setFastState] = useState({
    isRunning: false,
    startTime: null,
    elapsedTime: 0,
    targetHours: userPreferences.targetHours,
    caloriesBurned: 0,
    currentStage: FASTING_STAGES.INITIAL, // Initialize with the full INITIAL stage object
    fastId: null
  });

  const [customHours, setCustomHours] = useState(userPreferences.customHours);
  const [selectedDateTime, setSelectedDateTime] = useState(new Date());
  const [showTips, setShowTips] = useState(false);

  const circleRef = useRef(null);
  const progressRef = useRef(null);
  const timerRef = useRef(null);

  const formatTime = useCallback((ms) => {
    if (!ms || ms < 0) return '00:00:00';
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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

  useEffect(() => {
    localStorage.setItem('fastingPreferences', JSON.stringify(userPreferences));
  }, [userPreferences]);

  useEffect(() => {
    const { lastStartTime, targetHours } = userPreferences;
    if (!lastStartTime) return;

    const now = Date.now();
    const elapsedTime = now - lastStartTime;
    const targetMs = (targetHours || 16) * 3600000;

    if (elapsedTime > 0 && elapsedTime < targetMs) {
      setFastState(prev => ({
        ...prev,
        isRunning: true,
        startTime: lastStartTime,
        elapsedTime,
        targetHours
      }));
    } else if (elapsedTime >= targetMs) {
      setUserPreferences(prev => ({ ...prev, lastStartTime: null }));
    }
  }, [userPreferences]);

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
  }, [fastState.isRunning, getCurrentStage, calculateCalories]);

  const handleStart = useCallback(async () => {
    try {
      const now = Date.now();
      const startTime = Math.max(now, selectedDateTime.getTime());
      const targetHrs = customHours || fastState.targetHours;

      const response = await fasts.create({
        targetHours: targetHrs,
        startTime: new Date(startTime).toISOString()
      });

      const { fast } = response;

      setUserPreferences(prev => ({
        ...prev,
        targetHours: targetHrs,
        customHours,
        lastStartTime: startTime
      }));

      setFastState(prev => ({
        ...prev,
        isRunning: true,
        startTime,
        elapsedTime: 0,
        targetHours: targetHrs,
        currentStage: FASTING_STAGES.INITIAL,
        fastId: fast._id
      }));
    } catch (error) {
      console.error('Failed to start fast:', error);
      alert('Failed to start fast. Please try again.');
    }
  }, [customHours, fastState.targetHours, selectedDateTime]);

  const handleStop = useCallback(async () => {
    if (!window.confirm('Are you sure you want to end your fast?')) return;

    try {
      if (fastState.fastId) {
        await fasts.update(fastState.fastId, {
          endTime: new Date().toISOString(),
          completed: true
        });
      }

      setUserPreferences(prev => ({ ...prev, lastStartTime: null }));
      setFastState(prev => ({
        ...prev,
        isRunning: false,
        startTime: null,
        elapsedTime: 0,
        caloriesBurned: 0,
        currentStage: FASTING_STAGES.INITIAL,
        fastId: null
      }));

      window.dispatchEvent(new CustomEvent('fastingStateChanged'));
    } catch (error) {
      console.error('Failed to end fast:', error);
      alert('Failed to end fast. Please try again.');
    }
  }, [fastState.fastId]);

  return (
    <div className="max-w-4xl mx-auto p-8 bg-gray-50 min-h-screen font-sans">
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
      </div>
    </div>
  );
};

export default FastingTimer;
