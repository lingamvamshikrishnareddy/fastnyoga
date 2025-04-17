const redis = require('redis');

const client = redis.createClient({
  url: 'redis://localhost:6379' // update if your Redis runs on another host or port
});

client.on('error', (err) => {
  console.error('Redis Client Error', err);
});

client.connect();

module.exports = client;
