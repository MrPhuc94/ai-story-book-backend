require('dotenv').config(); // Load environment variables
const { Client } = require('pg');

// Create a client instance
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for NeonDatabase
  },
});

// Connect to the database
const connectDb = async () => {
  try {
    await client.connect();
    console.log('Connected to NeonDatabase successfully');

    // Test Query
    const res = await client.query('SELECT NOW()');
    console.log('Current Time:', res.rows[0].now);

    // Close the connection
    await client.end();
  } catch (err) {
    console.error('Error connecting to NeonDatabase:', err);
  }
};

// Query wrapper to avoid reconnecting each time
const queryDb = async (query, params) => {
  try {
    const res = await client.query(query, params);
    return res.rows;
  } catch (err) {
    console.error('Database query error:', err);
    throw err;
  }
};

module.exports = { connectDb, queryDb };
