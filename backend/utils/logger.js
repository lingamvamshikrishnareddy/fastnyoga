// backend/utils/logger.js

const getTimestamp = () => new Date().toISOString();

// Helper to format arguments, including objects and errors
const formatArgs = (args) => {
  return args.map(arg => {
    if (arg instanceof Error) {
      // Include stack trace for errors
      return `\n${arg.stack || arg.message}`;
    }
    if (typeof arg === 'object' && arg !== null) {
      // Pretty print objects
      try {
        return JSON.stringify(arg, null, 2); // Indent with 2 spaces
      } catch (e) {
        return '[Unserializable Object]';
      }
    }
    // Keep strings, numbers, etc. as they are
    return arg;
  });
};

const info = (...args) => {
  const formattedArgs = formatArgs(args);
  console.info(`[INFO] ${getTimestamp()}:`, ...formattedArgs);
};

const warn = (...args) => {
  const formattedArgs = formatArgs(args);
  console.warn(`[WARN] ${getTimestamp()}:`, ...formattedArgs);
};

const error = (...args) => {
  const formattedArgs = formatArgs(args);
  // Log errors to stderr using console.error
  console.error(`[ERROR] ${getTimestamp()}:`, ...formattedArgs);
};

const debug = (...args) => {
  // Only log debug messages if NODE_ENV is not 'production'
  if (process.env.NODE_ENV !== 'production') {
    const formattedArgs = formatArgs(args);
    // Use console.debug (might render same as log in some terminals, but semantically correct)
    console.debug(`[DEBUG] ${getTimestamp()}:`, ...formattedArgs);
  }
};

// Basic log function (less structured)
const log = (...args) => {
   console.log(...args);
}

module.exports = {
  info,
  warn,  // Now included
  error,
  debug, // Now included
  log,   // Basic log included
};