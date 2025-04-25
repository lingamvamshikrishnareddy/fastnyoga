const redis = require('redis');
require('dotenv').config();

const client = redis.createClient({
  url: process.env.REDIS_URL,
  socket: {
    tls: true,
    rejectUnauthorized: false,
    servername: new URL(process.env.REDIS_URL).hostname // Add this line
  },
});

client.on('error', (err) => {
  console.error('Redis Client Error', err);
});

// Add error handling around the connection
async function connectRedis() {
  try {
    await client.connect();
    console.log('Connected to Redis successfully');
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
  }
}

connectRedis();

module.exports = client;
