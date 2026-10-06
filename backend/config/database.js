const mongoose = require('mongoose');
const dns = require('dns');
require('dotenv').config();

// Fix for Windows DNS querySrv EREFUSED with MongoDB Atlas (8.8.8.8 & 1.1.1.1)
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  // Ignore
}

const connect = async () => {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  const uri = process.env.MONGODB;
  const fallbackUri = process.env.MONGODB_SUPPORT 
    ? (process.env.MONGODB_SUPPORT.startsWith('mongodb://') ? process.env.MONGODB_SUPPORT : `mongodb://${process.env.MONGODB_SUPPORT}`)
    : 'mongodb://127.0.0.1:27017/vanban-project';

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 6000
    });
    console.log("✅ Connected to MongoDB Atlas");
  } catch (error) {
    console.warn(`⚠️ Failed to connect to primary MongoDB Atlas: ${error.message}`);
    console.log(`Attempting fallback to: ${fallbackUri}...`);
    try {
      await mongoose.connect(fallbackUri, {
        serverSelectionTimeoutMS: 5000
      });
      console.log("✅ Connected to MongoDB (Fallback/Local)");
    } catch (fallbackError) {
      console.error("❌ Connect to MongoDB failed, retrying after 5s...");
      setTimeout(connect, 5000);
    }
  }
};

module.exports = { connect };
