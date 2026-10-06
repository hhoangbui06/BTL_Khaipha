const mongoose = require('mongoose');
const dns = require('dns');
require('dotenv').config();

// Fix for Windows DNS querySrv EREFUSED with MongoDB Atlas (8.8.8.8 & 1.1.1.1)
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  // Ignore
}

const DEFAULT_URI = 'mongodb+srv://hhoang06:hoang30109@cluster0.lp1x925.mongodb.net/vanban-project';

const connect = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const uri = process.env.MONGODB || DEFAULT_URI;
  const fallbackUri = process.env.MONGODB_SUPPORT 
    ? (process.env.MONGODB_SUPPORT.startsWith('mongodb://') ? process.env.MONGODB_SUPPORT : `mongodb://${process.env.MONGODB_SUPPORT}`)
    : 'mongodb://127.0.0.1:27017/vanban-project';

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000
    });
    console.log("✅ Connected to MongoDB Atlas");
    return mongoose.connection;
  } catch (error) {
    console.warn(`⚠️ Failed to connect to primary MongoDB Atlas: ${error.message}`);
    console.log(`Attempting fallback to: ${fallbackUri}...`);
    try {
      await mongoose.connect(fallbackUri, {
        serverSelectionTimeoutMS: 5000
      });
      console.log("✅ Connected to MongoDB (Fallback/Local)");
      return mongoose.connection;
    } catch (fallbackError) {
      console.error("❌ Connect to MongoDB failed:", fallbackError.message);
      throw new Error(`Lỗi kết nối cơ sở dữ liệu MongoDB Atlas: ${error.message}`);
    }
  }
};

module.exports = { connect };
