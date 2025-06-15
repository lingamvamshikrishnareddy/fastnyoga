import React from 'react';
import { Clock, Square, Flame, Activity, RefreshCw, AlertCircle } from 'lucide-react';
import { useFasting } from '../context/FastingContext';

const FastingTimer = () => {
  // Use the context instead of local state
  const {
    fastState,
    error,
    isLoading,
    isInitialized,
    connectionStatus,
    progress,
    caloriesBurned,
    handleStart,
    handleStop,
    handleTargetHoursChange,
    handleRefresh,
    handleDismissError,
    formatTime
  } = useFasting();

  // Show loading state only during initial load
  if (isLoading && !isInitialized) {
    return (
      <div className="max-w-4xl mx-auto p-8 bg-gray-50 min-h-screen font-sans">
        <div className="bg-white rounded-3xl p-10 shadow-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your fast...</p>
            <p className="text-sm text-gray-400 mt-2">
              Status: {connectionStatus === 'connecting' ? 'Connecting...' : connectionStatus}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8 bg-gray-50 min-h-screen font-sans">
      <div className="bg-white rounded-3xl p-10 shadow-lg transition-all duration-300 hover:translate-y-[-5px] hover:shadow-xl">
        
        {/* Connection Status Indicator */}
        <div className="mb-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' : 
              connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
              'bg-red-500'
            }`}></div>
            <span className="text-sm text-gray-600">
              {connectionStatus === 'connected' ? 'Connected' : 
               connectionStatus === 'connecting' ? 'Connecting...' : 
               'Connection Error'}
            </span>
          </div>
          
          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="text-sm text-gray-600 hover:text-gray-800 underline disabled:no-underline disabled:text-gray-400 flex items-center"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Syncing...' : 'Refresh'}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button 
              onClick={handleDismissError}
              className="text-red-700 hover:text-red-900 font-bold ml-4"
            >
              ×
            </button>
          </div>
        )}

        {/* Fast Status Indicator */}
        {fastState.isRunning && (
          <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-lg text-center">
            <span className="flex items-center justify-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              Fast is running
            </span>
          </div>
        )}

        {/* Circular Progress Timer */}
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="bg-white p-6 rounded-2xl shadow-md flex items-center">
            <Flame className="w-7 h-7 text-orange-500 mr-5" />
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
            <Activity className="w-7 h-7 text-green-500 mr-5" />
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

        {/* Target Hours Selector - only show when not running */}
        {!fastState.isRunning && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Duration (hours)
            </label>
            <select
              value={fastState.targetHours}
              onChange={(e) => handleTargetHoursChange(Number(e.target.value))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={12}>12 hours</option>
              <option value={16}>16 hours</option>
              <option value={18}>18 hours</option>
              <option value={20}>20 hours</option>
              <option value={24}>24 hours</option>
              <option value={36}>36 hours</option>
              <option value={48}>48 hours</option>
            </select>
          </div>
        )}

        {/* Control Buttons */}
        <div className="space-y-4">
          {!fastState.isRunning ? (
            <button
              onClick={handleStart}
              disabled={isLoading || connectionStatus === 'error'}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed text-white py-4 px-8 rounded-xl font-semibold flex items-center justify-center transition-all duration-300 transform hover:scale-105"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Starting...
                </>
              ) : (
                <>
                  <Clock className="w-5 h-5 mr-3" />
                  Start Fast
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleStop}
              disabled={isLoading}
              className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-300 disabled:cursor-not-allowed text-white py-4 px-8 rounded-xl font-semibold flex items-center justify-center transition-all duration-300 transform hover:scale-105"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Ending...
                </>
              ) : (
                <>
                  <Square className="w-5 h-5 mr-3" />
                  End Fast
                </>
              )}
            </button>
          )}
        </div>

        {/* Connection info */}
        {connectionStatus === 'error' && (
          <div className="mt-4 text-center text-sm text-gray-500">
            Having trouble connecting? The app will automatically retry.
          </div>
        )}
      </div>
    </div>
  );
};

export default FastingTimer;