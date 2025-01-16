const express = require('express');
const bodyParser = require('body-parser');
const authRouters = require('./routes/auth/auth.router')

const app = express();

// Middleware
app.use(bodyParser.json());

// Routes
app.use('/api/auth/', authRouters);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

module.exports = app;
