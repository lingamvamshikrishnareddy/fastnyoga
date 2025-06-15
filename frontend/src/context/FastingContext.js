import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext'; // Import useAuth hook

// Create the context
const FastingContext = createContext();

// Custom hook to use the fasting context
export const useFasting = () => {
  const context = useContext(FastingContext);
  if (!context) {
    throw new Error('useFasting must be used within a FastingProvider');
  }
  return context;
};

// Provider component
export const FastingProvider = ({ children, apiService }) => {
  // Get auth state from AuthContext
  const { user, isAuthenticated, authInitialized } = useAuth();

  const [fastState, setFastState] = useState({
    isRunning: false,
    startTime: null,
    elapsedTime: 0,
    targetHours: 16,
    fastId: null
  });

  // --- ADD THIS LINE ---
  const [lastCompletedFast, setLastCompletedFast] = useState(null);
  // --- END OF ADDITION ---

  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  
  const timerRef = useRef(null);
  const mountedRef = useRef(true);
  const lastFetchRef = useRef(0);
  const retryTimeoutRef = useRef(null);
  
  const authoritativeStartTimeRef = useRef(null);
  
  const isFetchingRef = useRef(false);
  const authStateRef = useRef({ isAuthenticated: false, user: null, authInitialized: false });

  // Update auth state ref to prevent dependency issues
  useEffect(() => {
    authStateRef.current = { isAuthenticated, user, authInitialized };
  }, [isAuthenticated, user, authInitialized]);

  // Utility functions
  const formatTime = (ms) => {
    if (!ms || ms < 0) return '00:00:00';
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const calculateCurrentElapsedTime = useCallback(() => {
    if (!authoritativeStartTimeRef.current) {
      return 0;
    }
    return Math.max(0, Date.now() - authoritativeStartTimeRef.current);
  }, []);

  const calculateProgress = useCallback(() => {
    if (!fastState.isRunning || !fastState.elapsedTime) return 0;
    const progress = (fastState.elapsedTime / (fastState.targetHours * 3600000)) * 100;
    return Math.min(Math.max(0, progress), 100);
  }, [fastState.elapsedTime, fastState.targetHours, fastState.isRunning]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      console.log('🔄 Timer cleared');
    }
  }, []);

  const clearRetryTimeout = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  // Reset fasting state to default
  const resetFastingState = useCallback(() => {
    console.log('🔄 Resetting fasting state');
    clearTimer();
    clearRetryTimeout();
    authoritativeStartTimeRef.current = null;
    
    const defaultState = {
      isRunning: false,
      startTime: null,
      elapsedTime: 0,
      targetHours: 16,
      fastId: null
    };
    
    setFastState(defaultState);
    setLastCompletedFast(null); // Reset completed fast as well
    setError(null);
    setIsLoading(false);
    setIsInitialized(false);
    setConnectionStatus('disconnected');
  }, [clearTimer, clearRetryTimeout]);

  const updateElapsedTime = useCallback(() => {
    if (!mountedRef.current || !authoritativeStartTimeRef.current) return;
    
    const currentElapsed = calculateCurrentElapsedTime();
    
    setFastState(prev => {
      if (!prev.isRunning || !authoritativeStartTimeRef.current) {
        return prev;
      }
      return {
        ...prev,
        elapsedTime: currentElapsed
      };
    });
  }, [calculateCurrentElapsedTime]);

  const startTimer = useCallback(() => {
    clearTimer();
    
    if (!authoritativeStartTimeRef.current || !mountedRef.current) {
      console.log('⚠️ Cannot start timer: no start time or component unmounted');
      return;
    }
    
    console.log('⏰ Starting timer with start time:', new Date(authoritativeStartTimeRef.current).toISOString());
    updateElapsedTime();
    
    timerRef.current = setInterval(() => {
      if (mountedRef.current && authoritativeStartTimeRef.current) {
        updateElapsedTime();
      } else {
        clearTimer();
      }
    }, 1000);
    
    console.log('✅ Timer started successfully');
  }, [updateElapsedTime, clearTimer]);

  const isNoActiveFastError = useCallback((err) => {
    if (!err) return false;
    
    const errorIndicators = [
      err.status === 404,
      err.statusCode === 404,
      err.response?.status === 404,
      err.message?.toLowerCase().includes('no active fast found'),
      err.error?.toLowerCase().includes('no active fast found'),
      err.message?.toLowerCase().includes('not found'),
      err.response?.data?.message?.toLowerCase().includes('no active fast found')
    ];
    
    return errorIndicators.some(indicator => indicator === true);
  }, []);

  const scheduleRetry = useCallback((retryAttempt = 0, maxRetries = 3) => {
    if (retryAttempt >= maxRetries || !mountedRef.current) {
      return;
    }

    // Check current auth state
    if (!authStateRef.current.isAuthenticated) {
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, retryAttempt), 10000);
    
    retryTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current && authStateRef.current.isAuthenticated) {
        console.log(`🔄 Retry attempt ${retryAttempt + 1}/${maxRetries}`);
        fetchCurrentFast(true, retryAttempt + 1);
      }
    }, delay);
  }, []); // Remove dependencies to prevent loops

  const fetchCurrentFast = useCallback(async (skipLoadingState = false, retryAttempt = 0) => {
    // CRITICAL: Check current auth state from ref to avoid dependency issues
    const currentAuth = authStateRef.current;
    
    if (!currentAuth.isAuthenticated || !currentAuth.user) {
      console.log('⚠️ User not authenticated, skipping fetch');
      if (!skipLoadingState) {
        setIsLoading(false);
        setIsInitialized(true);
        setConnectionStatus('disconnected');
      }
      return;
    }

    if (!apiService) {
      console.error('❌ API service not provided to FastingProvider');
      setError('API service not configured');
      setIsInitialized(true);
      setIsLoading(false);
      return;
    }

    if (isFetchingRef.current) {
      console.log('⚠️ Fetch already in progress, skipping');
      return;
    }

    const now = Date.now();
    if (now - lastFetchRef.current < 2000 && retryAttempt === 0) { // Increased debounce time
      console.log('⚠️ Too soon since last fetch, skipping');
      return;
    }
    
    isFetchingRef.current = true;
    lastFetchRef.current = now;
    clearRetryTimeout();

    try {
      if (!skipLoadingState && retryAttempt === 0) {
        setIsLoading(true);
      }
      
      setError(null);
      setConnectionStatus('connecting');
      
      console.log('📡 Fetching current fast from server...');
      const response = await apiService.getCurrentFast();
      
      if (!mountedRef.current) return;
      
      console.log('📡 Server response:', response);
      
      if (response.success && response.fast) {
        const { fast } = response;
        const serverStartTime = new Date(fast.startTime).getTime();
        
        authoritativeStartTimeRef.current = serverStartTime;
        const currentElapsed = Math.max(0, now - serverStartTime);
        
        const newState = {
          isRunning: fast.isRunning,
          startTime: serverStartTime,
          elapsedTime: currentElapsed,
          targetHours: fast.targetHours || 16,
          fastId: fast._id
        };
        
        setFastState(newState);
        setIsInitialized(true);
        setConnectionStatus('connected');
        
        console.log('✅ Fast state updated from server:', {
          ...newState,
          startTimeFormatted: new Date(serverStartTime).toISOString(),
          elapsedTimeFormatted: formatTime(currentElapsed),
          isRunning: fast.isRunning
        });
        
        if (fast.isRunning) {
          console.log('⏰ Fast is running, starting timer...');
          setTimeout(() => {
            if (mountedRef.current && authoritativeStartTimeRef.current) {
              startTimer();
            }
          }, 100);
        } else {
          console.log('⏹️ Fast is not running, clearing timer...');
          clearTimer();
        }
      } else {
        console.log('ℹ️ No active fast found on server');
        authoritativeStartTimeRef.current = null;
        
        const defaultState = {
          isRunning: false,
          startTime: null,
          elapsedTime: 0,
          targetHours: 16,
          fastId: null
        };
        setFastState(defaultState);
        setIsInitialized(true);
        setConnectionStatus('connected');
        clearTimer();
      }
    } catch (err) {
      if (!mountedRef.current) return;
      
      console.log('❌ Error fetching current fast:', err);
      
      if (isNoActiveFastError(err)) {
        console.log('ℹ️ No active fast error detected - setting default state');
        authoritativeStartTimeRef.current = null;
        
        const defaultState = {
          isRunning: false,
          startTime: null,
          elapsedTime: 0,
          targetHours: 16,
          fastId: null
        };
        setFastState(defaultState);
        setIsInitialized(true);
        setConnectionStatus('connected');
        clearTimer();
      } else {
        console.error('❌ Network/server error fetching current fast:', err);
        setConnectionStatus('error');
        
        if (retryAttempt === 0) {
          setError(err.message || 'Failed to fetch current fast');
        }
        
        setIsInitialized(true);
        scheduleRetry(retryAttempt, 3);
      }
    } finally {
      isFetchingRef.current = false;
      if (mountedRef.current && (!skipLoadingState || retryAttempt === 0)) {
        setIsLoading(false);
      }
    }
  }, [clearTimer, isNoActiveFastError, scheduleRetry, clearRetryTimeout, apiService, formatTime, startTimer]);

  const handleStart = async () => {
    const currentAuth = authStateRef.current;
    
    if (!currentAuth.isAuthenticated || !currentAuth.user) {
      setError('You must be logged in to start a fast');
      return;
    }

    if (!apiService) {
      setError('API service not configured');
      return;
    }
     
    setLastCompletedFast(null);
    setError(null);
    setIsLoading(true);

    try {
      const startTime = Date.now();
      
      console.log('🚀 Starting fast...');
      const response = await apiService.create({
        targetHours: fastState.targetHours,
        startTime: new Date(startTime).toISOString()
      });

      if (!mountedRef.current) return;

      if (response?.success && response?.fast) {
        const serverStartTime = new Date(response.fast.startTime).getTime();
        authoritativeStartTimeRef.current = serverStartTime;
        
        const newState = {
          isRunning: true,
          startTime: serverStartTime,
          elapsedTime: 0,
          fastId: response.fast._id,
          targetHours: response.fast.targetHours || fastState.targetHours
        };
        
        setFastState(newState);
        setConnectionStatus('connected');
        
        console.log('✅ Fast started successfully:', {
          fastId: response.fast._id,
          startTime: new Date(serverStartTime).toISOString()
        });
        
        setTimeout(() => {
          if (mountedRef.current && authoritativeStartTimeRef.current) {
            startTimer();
          }
        }, 100);
        
      } else {
        throw new Error(response?.message || 'Invalid response from server');
      }
    } catch (err) {
      if (!mountedRef.current) return;
      
      console.error('❌ Error starting fast:', err);

      const isAlreadyActiveError = err.message?.toLowerCase().includes('already have an active fast');

      if (isAlreadyActiveError) {
        console.warn('⚠️ State desync detected: "active fast" error received. Forcing a refresh.');
        setError('Your fast is already running. Syncing now...');
        fetchCurrentFast(); 
      } else {
        setError(err.message || 'Failed to start fast. Please try again.');
        setConnectionStatus('error');
        
        authoritativeStartTimeRef.current = null;
        setFastState(prev => ({
          ...prev,
          isRunning: false,
          startTime: null,
          elapsedTime: 0,
          fastId: null
        }));
        clearTimer();
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  };

 const handleStop = async () => {
  const currentAuth = authStateRef.current;
  if (!currentAuth.isAuthenticated || !currentAuth.user) {
    setError('You must be logged in to stop a fast');
    return;
  }
  if (!apiService) {
    setError('API service not configured');
    return;
  }

  const currentFastId = fastState.fastId;
  
  if (!currentFastId) {
    setError('No active fast to stop');
    if (fastState.isRunning) {
      // If state is inconsistent, do a hard reset
      resetFastingState();
    }
    return;
  }

  setError(null);
  setIsLoading(true);

  try {
    console.log('🛑 Calling apiService.end with fastId:', currentFastId);
    
    const endData = {}; // Optional data like mood, notes, etc.
    
    const response = await apiService.end(currentFastId, endData);
    
    if (!mountedRef.current) return;
    
    console.log('✅ Fast stopped on server:', response);
    
    // Clear the timer and reset authoritative start time
    clearTimer();
    authoritativeStartTimeRef.current = null;
    
    // Store the completed fast details for summary/history
    setLastCompletedFast(response.fast);

    // Reset the fasting state to show 00:00:00
    setFastState({
      isRunning: false,
      startTime: null,
      elapsedTime: 0,  // Reset to 0 to show 00:00:00
      targetHours: fastState.targetHours, // Keep target hours for next fast
      fastId: null
    });

    setConnectionStatus('connected');
    
  } catch (err) {
    if (!mountedRef.current) return;
    
    console.error('❌ Error ending fast - Full error object:', err);
    setError(err.message || 'Failed to end fast');
    setConnectionStatus('error');
    
    // If the error means the fast is already gone, do a hard reset.
    if (err.status === 404 || err.status === 400) {
      console.log(`Syncing UI because fast is already considered stopped on the server (Status: ${err.status}).`);
      resetFastingState(); // Use the full reset function
    }
    
  } finally {
    if (mountedRef.current) {
      setIsLoading(false);
    }
  }
};

  const handleTargetHoursChange = (newTargetHours) => {
    if (!fastState.isRunning) {
      setFastState(prev => ({
        ...prev,
        targetHours: newTargetHours
      }));
    }
  };

  const handleRefresh = () => {
    console.log('🔄 Manual refresh requested');
    const currentAuth = authStateRef.current;
    if (currentAuth.isAuthenticated && currentAuth.user) {
      fetchCurrentFast();
    } else {
      console.log('⚠️ Cannot refresh: user not authenticated');
      setError('Please log in to refresh fasting data');
    }
  };

  const handleDismissError = () => {
    setError(null);
  };

  // FIXED: Auth state synchronization effect with proper dependency management
  useEffect(() => {
    console.log('🔄 Auth state changed:', { isAuthenticated, user: !!user, authInitialized });
    
    if (authInitialized) {
      if (isAuthenticated && user) {
        // User just logged in or auth was restored
        console.log('✅ User authenticated, will fetch fasting data...');
        // Use timeout to prevent rapid succession calls
        const timeoutId = setTimeout(() => {
          if (mountedRef.current) {
            fetchCurrentFast();
          }
        }, 300);
        
        return () => clearTimeout(timeoutId);
      } else {
        // User logged out or auth failed
        console.log('🔄 User not authenticated, resetting fasting state...');
        resetFastingState();
      }
    }
  }, [isAuthenticated, user, authInitialized]); // Removed fetchCurrentFast and resetFastingState from deps

  // Component mount/unmount effect
  useEffect(() => {
    console.log('🔧 FastingProvider mounted');
    mountedRef.current = true;
    
    return () => {
      console.log('🔧 FastingProvider unmounting');
      mountedRef.current = false;
      clearTimer();
      clearRetryTimeout();
      authoritativeStartTimeRef.current = null;
    };
  }, []); // Empty dependency array

  // Enhanced visibility change handling
  useEffect(() => {
    const handleVisibilityChange = () => {
      const currentAuth = authStateRef.current;
      
      if (!document.hidden && mountedRef.current && isInitialized && currentAuth.isAuthenticated && currentAuth.user) {
        console.log('👁️ Page became visible - refreshing state');
        
        if (authoritativeStartTimeRef.current && fastState.isRunning) {
          const currentElapsed = calculateCurrentElapsedTime();
          console.log('⏰ Updating elapsed time after visibility change:', formatTime(currentElapsed));
          
          setFastState(prev => ({ ...prev, elapsedTime: currentElapsed }));
          
          if (!timerRef.current) {
            console.log('⏰ Restarting timer after visibility change');
            startTimer();
          }
        }
        
        setTimeout(() => { 
          if (mountedRef.current) {
            fetchCurrentFast(true); 
          }
        }, 500);
      } else if (document.hidden) {
        console.log('👁️ Page became hidden');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => { document.removeEventListener('visibilitychange', handleVisibilityChange); };
  }, [isInitialized, fastState.isRunning, calculateCurrentElapsedTime, startTimer, formatTime]);

  // Page focus/blur handling
  useEffect(() => {
    const handleFocus = () => {
      const currentAuth = authStateRef.current;
      
      if (mountedRef.current && isInitialized && fastState.isRunning && authoritativeStartTimeRef.current && currentAuth.isAuthenticated && currentAuth.user) {
        console.log('🎯 Window focused - syncing timer');
        updateElapsedTime();
        if (!timerRef.current) {
          startTimer();
        }
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => { window.removeEventListener('focus', handleFocus); };
  }, [isInitialized, fastState.isRunning, updateElapsedTime, startTimer]);

  const progress = calculateProgress();
  const caloriesBurned = Math.round((fastState.elapsedTime / 3600000) * 50);

  const contextValue = {
    fastState,
    error,
    isLoading,
    isInitialized,
    connectionStatus,
    progress,
    caloriesBurned,
    lastCompletedFast,
    handleStart,
    handleStop,
    handleTargetHoursChange,
    handleRefresh,
    handleDismissError,
    formatTime,
    calculateProgress,
    isAuthenticated, // Expose auth state for components
    user // Expose user for components
  };

  return (
    <FastingContext.Provider value={contextValue}>
      {children}
    </FastingContext.Provider>
  );
};