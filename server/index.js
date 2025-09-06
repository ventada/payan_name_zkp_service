"use strict";

require("dotenv").config();
const express = require("express");
const pino = require("pino");
const registerMetrics = require("./metrics");
const { healthRouter } = require("./routes/health");
const { circuitsRouter } = require("./routes/circuits");
const { proofsRouter } = require("./routes/proofs");
const { templatesRouter } = require("./routes/templates");
const { webhooksRouter } = require("./routes/webhooks");
const { connect } = require("./services/db");

const app = express();
const logger = pino({ level: process.env.LOG_LEVEL || "info" });

// Middleware
app.use(require("cors")());
app.use(express.json({ limit: "1mb" }));

// Security headers (basic)
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

// Routes
app.use("/v1/circuits", circuitsRouter);
app.use("/v1/proofs", proofsRouter);
app.use("/v1/templates", templatesRouter);
app.use("/v1/webhooks", webhooksRouter);
app.use("/health", healthRouter);
app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", registerMetrics.contentType);
    res.end(await registerMetrics.metrics());
  } catch (err) {
    res.status(500).send("metrics error");
  }
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error({ err }, "Unhandled error");
  res
    .status(err.status || 500)
    .json({ message: err.message || "Internal Server Error" });
});

const port = Number(process.env.PORT || 3000);
connect()
  .then(() => {
    app.listen(port, () => {
      logger.info({ port }, "API server listening");
    });
  })
  .catch((err) => {
    logger.error({ err }, "DB connection failed");
    process.exit(1);
  });
