require('dotenv').config();
const app = require('./app');
const { connectDb } = require('./database/index');

const PORT = process.env.PORT || 5001;

// Start the server
const startServer = async () => {
  await connectDb(); // Connect to the database first
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
};

startServer();