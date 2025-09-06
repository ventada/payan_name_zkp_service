"use strict";

const client = require("prom-client");

// Register default metrics
const register = new client.Registry();
client.collectDefaultMetrics({ register });

module.exports = register;
