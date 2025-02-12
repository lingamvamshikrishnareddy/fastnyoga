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

// API client configuration
const createAPIClient = () => {
  const baseURL = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
  
  const client = axios.create({
    baseURL,
    timeout: DEFAULT_TIMEOUT,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
  });

  // Request interceptor with enhanced logging and error handling
  client.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Update to match the allowed header case in backend
      config.headers['X-Request-ID'] = crypto.randomUUID();
      
      config.url = config.url.startsWith('/') ? config.url : `/${config.url}`;
      
      logger.debug('API Request:', {
        requestId: config.headers['X-Request-ID'],
        url: `${config.baseURL}${config.url}`,
        method: config.method?.toUpperCase(),
        headers: { ...config.headers, Authorization: '[REDACTED]' },
        data: config.data,
        params: config.params,
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

  // Response interceptor with enhanced logging and error handling
  client.interceptors.response.use(
    (response) => {
      logger.debug('API Response:', {
        requestId: response.config.headers['X-Request-ID'],
        status: response.status,
        statusText: response.statusText,
        url: `${response.config.baseURL}${response.config.url}`,
        method: response.config.method?.toUpperCase(),
        data: response.data,
        timestamp: new Date().toISOString()
      });
      return response;
    },
    (error) => {
      logger.error('API Error:', {
        requestId: error.config?.headers['X-Request-ID'],
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        requestData: error.config?.data,
        responseData: error.response?.data,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      return handleResponseError(error);
    }
  );

  return client;
};

// Enhanced error handlers
const handleResponseError = async (error) => {
  const { response, config: originalRequest } = error;

  // Network errors
  if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
    throw new APIError(
      'Unable to connect to the server. Please check your internet connection.',
      0,
      ERROR_CODES.NETWORK_ERROR,
      { originalError: error }
    );
  }

  // Timeout errors
  if (error.code === 'ECONNABORTED') {
    throw new APIError(
      'Request timed out. Please try again.',
      0,
      ERROR_CODES.TIMEOUT_ERROR,
      { originalError: error }
    );
  }

  // Rate limit errors
  if (response?.status === 429) {
    const retryAfter = response.headers['retry-after'];
    throw new APIError(
      'Too many requests. Please try again later.',
      429,
      ERROR_CODES.RATE_LIMIT_ERROR,
      { retryAfter, originalError: error }
    );
  }

  // Authentication errors
  if (response?.status === 401 && !originalRequest._retry) {
    localStorage.removeItem('token');
    window?.dispatchEvent(new CustomEvent('auth:expired'));
    window?.location.assign('/login');
    throw new APIError('Session expired. Please log in again.', 401, ERROR_CODES.AUTH_ERROR);
  }

  // Forbidden errors
  if (response?.status === 403) {
    throw new APIError(
      'Access denied. You do not have permission to perform this action.',
      403,
      ERROR_CODES.FORBIDDEN_ERROR,
      { originalError: error }
    );
  }

  // Validation errors
  if (response?.status === 422) {
    throw new APIError(
      'Validation failed. Please check your input.',
      422,
      ERROR_CODES.VALIDATION_ERROR,
      { validationErrors: response.data.errors }
    );
  }

  // Server errors
  if (response?.status >= 500) {
    throw new APIError(
      'Server error. Please try again later.',
      response.status,
      ERROR_CODES.SERVER_ERROR,
      { serverError: response.data }
    );
  }

  // Unknown errors
  throw new APIError(
    error.response?.data?.message || 'An unexpected error occurred.',
    response?.status || 0,
    ERROR_CODES.UNKNOWN_ERROR,
    { originalError: error }
  );
};

// Enhanced retry mechanism with exponential backoff
const retryRequest = async (error, retryCount, retryDelay, attempt = 0) => {
  if (attempt >= retryCount) throw error;
  
  const delay = retryDelay * Math.pow(2, attempt);
  logger.info(`Retrying request (attempt ${attempt + 1}/${retryCount}) after ${delay}ms`);
  
  await new Promise((resolve) => setTimeout(resolve, delay));
  return api(error.config);
};

// Enhanced error handler with retry support
const handleAPIError = async (error, customMessage, options = {}) => {
  const {
    retryCount = 1,
    retryDelay = 1000,
    shouldRetry = (err) => {
      const status = err.response?.status;
      return status >= 500 || status === 429 || err.code === 'ERR_NETWORK';
    }
  } = options;

  if (shouldRetry(error) && retryCount > 0) {
    return retryRequest(error, retryCount, retryDelay);
  }

  throw new APIError(
    error.response?.data?.message || error.message || customMessage,
    error.response?.status,
    error.code || ERROR_CODES.UNKNOWN_ERROR,
    { originalError: error }
  );
};

// Enhanced endpoint factory with retry options
const createEndpoint = (method, path, errorMessage, options = {}) => 
  async (data = {}, config = {}) => {
    try {
      const response = await api[method](path, data, { ...config, ...options });
      return response.data;
    } catch (error) {
      return handleAPIError(error, errorMessage, options);
    }
  };

// Initialize API client
const api = createAPIClient();

// API endpoints with retry options
export const auth = {
  register: createEndpoint('post', '/auth/register', 'Registration failed'),
  login: createEndpoint('post', '/auth/login', 'Login failed'),
  logout: createEndpoint('post', '/auth/logout', 'Logout failed'),
  getCurrentUser: createEndpoint('get', '/auth/user', 'Failed to fetch user data', {
    retryCount: 2,
    retryDelay: 1000
  }),
};



export const fasts = {
  getAll: async () => {
    const response = await api.get('/fasts');
    return response.data;
  },

  getCurrentFast: async () => {
    const response = await api.get('/fasts/current');
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/fasts', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.patch(`/fasts/${id}`, data);
    return response.data;
  },

  end: async (id) => {
    const response = await api.post(`/fasts/${id}/end`);
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/fasts/stats');
    return response.data;
  }
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

export { api as default, APIError, ERROR_CODES };