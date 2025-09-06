"use strict";

const mongoose = require("mongoose");

const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/zkflow";
let isConnected = false;

async function connect() {
  if (isConnected) return mongoose.connection;
  await mongoose.connect(mongoUri, {
    autoIndex: true,
  });
  isConnected = true;
  // TTL index removed - proof requests will not auto-delete
  return mongoose.connection;
}

module.exports = { connect };
