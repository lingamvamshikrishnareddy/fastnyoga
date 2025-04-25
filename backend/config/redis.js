// config/redis.js
const { createClient } = require('redis');
require('dotenv').config();

// Extract credentials from environment variables
const password = process.env.REDIS_PASSWORD;
const host = 'redis-13661.c57.us-east-1-4.ec2.redns.redis-cloud.com';
const port = 13661;

// Create the Redis client
const client = createClient({
  username: 'default',
  password: password,
  socket: {
    host: host,
    port: port
  }
});

// Error handling
client.on('error', (err) => {
  console.error('Redis Client Error', err);
});

// Connection status events
client.on('connect', () => {
  console.log('Redis client connecting...');
});

client.on('ready', () => {
  console.log('Redis client connected and ready');
});

client.on('end', () => {
  console.log('Redis connection ended');
});

// Connect to Redis
async function connectRedis() {
  try {
    await client.connect();
    console.log('Redis connection established successfully');
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
  }
}

// Attempt connection
connectRedis();

// Export the client
module.exports = client;
