import axios from 'axios';

// Constants
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const DEFAULT_TIMEOUT = 15000;

// Error handling
const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  FORBIDDEN_ERROR: 'FORBIDDEN_ERROR'
};

class APIError extends Error {
  constructor(message, status = 0, code = ERROR_CODES.UNKNOWN_ERROR, details = {}) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

// Logger utility with log levels
const logger = {
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'error',

  debug: (...args) => {
    if (logger.level === 'debug') console.debug('🔍 [DEBUG]:', ...args);
  },

  info: (...args) => {
    if (['debug', 'info'].includes(logger.level)) console.log('ℹ️ [INFO]:', ...args);
  },

  warn: (...args) => {
    if (['debug', 'info', 'warn'].includes(logger.level)) console.warn('⚠️ [WARN]:', ...args);
  },

  error: (...args) => {
    console.error('❌ [ERROR]:', ...args);
  }
};

// Token validation helper
const isValidToken = (token) => {
  if (!token) return false;

  try {
    const parts = token.split('.');
    return parts.length === 3 && parts.every(part => part.length > 0);
  } catch (e) {
    logger.error('[Auth] Token validation error:', e);
    return false;
  }
};

// Keep track of auth state to prevent infinite redirect loops
let isAuthExpired = false;
let authExpirationTimer = null;

// API client configuration
const createAPIClient = () => {
  const baseURL = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;

  const client = axios.create({
    baseURL,
    timeout: DEFAULT_TIMEOUT,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
  });

  client.interceptors.request.use(
    (config) => {
      const isAuthEndpoint = config.url.includes('/auth/login') ||
                            config.url.includes('/auth/register');

      if (!isAuthEndpoint) {
        // Get a fresh token for each request
        const token = localStorage.getItem('token');

        if (token) {
          // Log token for debugging (you can remove this in production)
          logger.debug(`Using token for request: ${token.substring(0, 10)}...`);
          config.headers['Authorization'] = `Bearer ${token}`;
        } else {
          logger.warn('No token found for authenticated request');
        }
      }

      // Rest remains the same
      config.headers['X-Request-ID'] = crypto.randomUUID();
      config.url = config.url.startsWith('/') ? config.url : `/${config.url}`;

      logger.debug('API Request:', {
        requestId: config.headers['X-Request-ID'],
        url: `${config.baseURL}${config.url}`,
        method: config.method?.toUpperCase(),
        timestamp: new Date().toISOString()
      });

      return config;
    },
    (error) => {
      logger.error('Request Configuration Error:', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      return Promise.reject(
        new APIError('Failed to setup request', 0, ERROR_CODES.UNKNOWN_ERROR, { originalError: error })
      );
    }
  );

  // Response interceptor with improved error handling
  client.interceptors.response.use(
    (response) => {
      logger.debug('API Response:', {
        requestId: response.config.headers['X-Request-ID'],
        status: response.status,
        statusText: response.statusText,
        url: `${response.config.baseURL}${response.config.url}`,
        method: response.config.method?.toUpperCase(),
        timestamp: new Date().toISOString()
      });

      return response;
    },
    (error) => {
      const errorDetails = {
        requestId: error.config?.headers?.['X-Request-ID'],
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: `${error.config?.baseURL || ''}${error.config?.url || ''}`,
        method: error.config?.method?.toUpperCase(),
        timestamp: new Date().toISOString()
      };

      if (error.message === 'Network Error') {
        logger.error('Network connection failed:', {
          baseURL: client.defaults.baseURL,
          message: error.message
        });
        console.log('🔌 Check if your backend server is running at:', client.defaults.baseURL);
      }

      logger.error('API Error:', errorDetails);

      // Handle 401 errors for non-auth endpoints with existing token
      if (error.response?.status === 401) {
        const isAuthEndpoint = error.config?.url?.includes('/auth/login') ||
                              error.config?.url?.includes('/auth/register') ||
                              error.config?.url?.includes('/auth/refresh');

        const token = localStorage.getItem('token');

        if (!isAuthEndpoint && token && !isAuthExpired) {
          logger.warn('Authentication token expired or invalid, triggering session expiration');
          isAuthExpired = true;

          if (authExpirationTimer) {
            clearTimeout(authExpirationTimer);
          }

          setTimeout(() => {
            window?.dispatchEvent(new CustomEvent('auth:expired'));
          }, 100);

          authExpirationTimer = setTimeout(() => {
            isAuthExpired = false;
            authExpirationTimer = null;
          }, 5000);
        }
      }

      return handleResponseError(error);
    }
  );

  return client;
};

// Enhanced error handlers
const handleResponseError = async (error) => {
  const { response, config: originalRequest } = error;
  const url = originalRequest?.url || 'Unknown URL';
  const method = originalRequest?.method?.toUpperCase() || 'Unknown Method';
  const requestId = originalRequest?.headers?.['X-Request-ID'] || 'N/A';

  const errorDetails = {
    requestId,
    message: error.message,
    status: response?.status,
    statusText: response?.statusText,
    url: `${originalRequest?.baseURL || ''}${url}`,
    method,
    timestamp: new Date().toISOString(),
    responseData: response?.data, // Include response data if available
  };

  logger.error('API Error Encountered:', errorDetails); // Log the detailed error first

  // --- Network & Timeout Errors ---
  if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
    logger.error('Network connection failed:', { baseURL: api.defaults.baseURL, message: error.message });
    console.log('🔌 Check if your backend server is running at:', api.defaults.baseURL);
    throw new APIError(
      'Unable to connect to the server. Check connection and if the server is running.',
      0,
      ERROR_CODES.NETWORK_ERROR,
      { originalError: error }
    );
  }
  if (error.code === 'ECONNABORTED') {
    throw new APIError(
      'Request timed out. Please try again.',
      0,
      ERROR_CODES.TIMEOUT_ERROR,
      { originalError: error }
    );
  }

  // --- Specific Status Code Handling (if response exists) ---
  if (response) {
    const status = response.status;
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register'); // Add other auth paths if needed

    // --- Handle 401 Unauthorized ---
    if (status === 401) {
      logger.warn(`Received 401 Unauthorized for URL: ${url}`);
      const tokenExistsLocally = !!localStorage.getItem('token');

      // Scenario 1: 401 on an auth endpoint (login/register) OR no token was stored locally anyway.
      // This is a clear authentication failure.
      if (isAuthEndpoint || !tokenExistsLocally) {
          logger.error(`401 received for [${method} ${url}]. Reason: Auth endpoint failure or no local token found.`);
          if (tokenExistsLocally) {
            // Clean up potentially invalid token if it existed
            localStorage.removeItem('token');
            logger.info('Removed local token due to 401 on auth endpoint or missing token.');
          }
          window?.dispatchEvent(new CustomEvent('auth:expired')); // Trigger logout flow
          throw new APIError('Authentication failed. Please log in.', 401, ERROR_CODES.AUTH_ERROR);
      }
      // Scenario 2: 401 on a PROTECTED route DESPITE having a local token.
      // This is the CONTRADICTORY case based on backend logs showing success.
      else {
          logger.error(`CRITICAL: Received 401 for protected route [${method} ${url}] even though a local token exists.`);
          logger.error(`Backend logs might show successful authentication for this request ID [${requestId}], but the frontend received 401.`);
          logger.error('Possible causes: Proxy/Load Balancer interference, CORS issue, unexpected backend behavior after auth middleware.');

          // Action: Even though it's contradictory, the safest default is to assume the session is invalid from the frontend's perspective.
          window?.dispatchEvent(new CustomEvent('auth:expired')); // Trigger logout flow
          throw new APIError('Session expired or invalid. Please log in again.', 401, ERROR_CODES.AUTH_ERROR);
          // NOTE: In a system with refresh tokens, you might attempt a token refresh here first.
      }
    }
    // --- Handle 403 Forbidden ---
    else if (status === 403) {
      throw new APIError(
        'Access denied. You do not have permission.',
        403,
        ERROR_CODES.FORBIDDEN_ERROR,
        { originalError: error }
      );
    }
    // --- Handle 429 Rate Limit ---
    else if (status === 429) {
       const retryAfter = response.headers['retry-after'];
       throw new APIError(
         'Too many requests. Please try again later.',
         429,
         ERROR_CODES.RATE_LIMIT_ERROR,
         { retryAfter, originalError: error }
       );
    }
    // --- Handle 422 Validation Error ---
     else if (status === 422) {
       throw new APIError(
         'Validation failed. Please check your input.',
         422,
         ERROR_CODES.VALIDATION_ERROR,
         { validationErrors: response.data?.errors, originalError: error }
       );
     }
    // --- Handle Server Errors (5xx) ---
    else if (status >= 500) {
      throw new APIError(
        'Server error. Please try again later.',
        status,
        ERROR_CODES.SERVER_ERROR,
        { serverError: response.data, originalError: error }
      );
    }
  }

  // --- Fallback for other errors or no response ---
  logger.warn('Unhandled API error type:', { message: error.message, code: error.code });
  throw new APIError(
    response?.data?.message || error.message || 'An unexpected error occurred.',
    response?.status || 0,
    ERROR_CODES.UNKNOWN_ERROR,
    { originalError: error }
  );
};

// Initialize API client
const api = createAPIClient();

// Generate a unique request ID
const generateRequestId = () => crypto.randomUUID();

const createEndpoint = (method, urlTemplate, defaultErrorMessage, options = {}) => {
  return async (pathParamsOrData, data) => {
    let url = urlTemplate;
    let payload = data;

    // Simple check if the first arg is an object (potentially path params) and data is the second
    if (typeof pathParamsOrData === 'object' && pathParamsOrData !== null && !Array.isArray(pathParamsOrData) && data !== undefined) {
       // Replace path parameters like :id or {id}
       Object.keys(pathParamsOrData).forEach(key => {
           url = url.replace(`:${key}`, pathParamsOrData[key]);
           url = url.replace(`{${key}}`, pathParamsOrData[key]);
       });
       payload = data;
    } else {
        // Assume first arg is data if data is undefined
        payload = pathParamsOrData;
    }

    const requestId = generateRequestId();
    try {
      console.log(`[API]: ${method.toUpperCase()} ${url}`, payload ? 'with payload' : '');
      const response = await api[method](url, payload); // Pass payload correctly based on method
      console.log(`✅ [API]: ${method.toUpperCase()} ${url} Success`);
      return response.data;
    } catch (error) {
       console.error(`❌ [ERROR]: API Error: `, {
         requestId,
         message: error.message,
         status: error.response?.status,
         statusText: error.response?.statusText,
         url: error.config?.url || url, // Get URL from error config if possible
         method: method.toUpperCase(),
         // responseData: error.response?.data // Be careful logging sensitive data
       });
      handleResponseError(error, url, defaultErrorMessage, requestId); // Pass requestId
      throw error; // Re-throw after handling
    }
  };
};

export const auth = {
  register: createEndpoint('post', '/auth/register', 'Registration failed'),
  login: createEndpoint('post', '/auth/login', 'Login failed'),
  logout: createEndpoint('post', '/auth/logout', 'Logout failed'),
  // getCurrentUser remains the same, relying on the interceptor is better now
  getCurrentUser: createEndpoint('get', '/auth/user', 'Failed to fetch user data'),
};

// --- Keep working endpoints that use createEndpoint ---
export const fasts = {
  getAll: createEndpoint('get', '/fasts/user', 'Failed to fetch fast history', {
    retryCount: 2,
    retryDelay: 1000
  }),

  getCurrentFast: createEndpoint('get', '/fasts/current', 'Failed to fetch current fast', {
    retryCount: 2,
    retryDelay: 1000
  }),

  create: createEndpoint('post', '/fasts/start', 'Failed to start fast'),

  getStats: createEndpoint('get', '/fasts/stats', 'Failed to fetch stats', {
    retryCount: 2,
    retryDelay: 1000
  }),

  getDashboard: createEndpoint('get', '/fasts/dashboard', 'Failed to fetch dashboard data'),

  getInsights: createEndpoint('get', '/fasts/insights', 'Failed to fetch insights'),


  // --- FIX for fasts.end ---
  end: async (fastId, data = {}) => {
    const errorMessage = 'Failed to end fast';
    if (!fastId) {
      logger.error(`[API Error] ${errorMessage}: Fast ID is missing.`);
      throw new APIError(errorMessage + ': Fast ID is missing.', 0, ERROR_CODES.UNKNOWN_ERROR); // Use APIError
    }
    const url = `/fasts/end/${fastId}`;
    logger.debug(`[API] Calling PUT ${url} with data:`, data);
    try {
      // --- Use 'api' instead of 'axiosInstance' ---
      const response = await api.put(url, data);
      return response.data;
    } catch (error) {
      // Log here for immediate context
      logger.error(`[API Error] ${errorMessage} (URL: ${url}):`, error.response?.status, error.message);
      // Let the interceptor/global handler process it for consistent error object creation
      throw error; // Re-throw for the main handler/interceptor
      // Alternatively, call handleResponseError directly if interceptor doesn't catch re-thrown errors well:
      // return handleResponseError(error); // This would throw the APIError
    }
  },

  // --- FIX for fasts.update ---
   update: async (fastId, data = {}) => {
     const errorMessage = 'Failed to update fast';
     if (!fastId) {
       logger.error(`[API Error] ${errorMessage}: Fast ID is missing.`);
       throw new APIError(errorMessage + ': Fast ID is missing.', 0, ERROR_CODES.UNKNOWN_ERROR);
     }
     const url = `/fasts/${fastId}`;
     logger.debug(`[API] Calling PUT ${url} with data:`, data);
     try {
       // --- Use 'api' instead of 'axiosInstance' ---
       const response = await api.put(url, data);
       return response.data;
     } catch (error) {
       logger.error(`[API Error] ${errorMessage} (URL: ${url}):`, error.response?.status, error.message);
       throw error; // Re-throw for the main handler/interceptor
       // return handleResponseError(error);
     }
   },

  // --- FIX for fasts.delete ---
   delete: async (fastId) => {
     const errorMessage = 'Failed to delete fast';
     if (!fastId) {
       logger.error(`[API Error] ${errorMessage}: Fast ID is missing.`);
       throw new APIError(errorMessage + ': Fast ID is missing.', 0, ERROR_CODES.UNKNOWN_ERROR);
     }
     const url = `/fasts/${fastId}`;
     logger.debug(`[API] Calling DELETE ${url}`);
     try {
       // --- Use 'api' instead of 'axiosInstance' ---
       const response = await api.delete(url);
       return response.data;
     } catch (error) {
       logger.error(`[API Error] ${errorMessage} (URL: ${url}):`, error.response?.status, error.message);
       throw error; // Re-throw for the main handler/interceptor
       // return handleResponseError(error);
     }
   },

};

export const weights = {
  add: createEndpoint('post', '/weights/add', 'Failed to add weight'),
  getAll: createEndpoint('get', '/weights/user', 'Failed to fetch user weights', {
    retryCount: 2,
    retryDelay: 1000
  }),
};

export const dashboard = {
  getStats: createEndpoint('get', '/dashboard/stats', 'Failed to fetch dashboard stats', {
    retryCount: 2,
    retryDelay: 1000
  }),
};

// --- Exports ---
export { api as default, APIError, ERROR_CODES };
