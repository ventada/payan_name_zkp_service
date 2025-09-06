"use strict";

require("dotenv").config();
const { Worker } = require("bullmq");
const IORedis = require("ioredis");
const fs = require("fs").promises;

const connection = new IORedis(
  process.env.REDIS_URL || "redis://127.0.0.1:6379"
);

async function processJob(job) {
  const { path: targetPath } = job.data;
  if (!targetPath) return;
  await fs.rm(targetPath, { recursive: true, force: true });
}

new Worker("cleanup", processJob, { connection, concurrency: 1 });
