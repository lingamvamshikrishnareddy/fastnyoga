const redis = require('redis');
require('dotenv').config();

const client = redis.createClient({
  url: process.env.REDIS_URL,
  socket: {
    tls: true,
    rejectUnauthorized: false, // Required for Redis Cloud
  },
});

client.on('error', (err) => {
  console.error('Redis Client Error', err);
});

client.connect();

module.exports = client;
