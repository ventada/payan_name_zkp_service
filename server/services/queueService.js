"use strict";

const { Queue } = require("bullmq");
const IORedis = require("ioredis");

const connection = new IORedis(
  process.env.REDIS_URL || "redis://127.0.0.1:6379",
  { maxRetriesPerRequest: null, enableReadyCheck: false }
);

const keyGenerationQueue = new Queue("key-generation", { connection });
const proofGenerationQueue = new Queue("proof-generation", { connection });
const cleanupQueue = new Queue("cleanup", { connection });
const deployQueue = new Queue("deploy", { connection });
const deploymentQueue = new Queue("deployment", { connection });

async function enqueueKeyGeneration(data) {
  await keyGenerationQueue.add(`keygen:${data.circuitId}`, data, {
    removeOnComplete: true,
    removeOnFail: false,
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
  });
}

async function enqueueProofGeneration(data) {
  await proofGenerationQueue.add(`proof:${data.proofRequestId}`, data, {
    removeOnComplete: true,
    removeOnFail: false,
    attempts: 2,
    backoff: { type: "fixed", delay: 3000 },
  });
}

async function enqueueCleanup(data) {
  await cleanupQueue.add(`cleanup:${data.path}`, data, {
    removeOnComplete: true,
    removeOnFail: true,
  });
}

async function enqueueDeploy(data) {
  await deployQueue.add(`deploy:${data.circuitId}`, data, {
    removeOnComplete: true,
    removeOnFail: false,
    attempts: 2,
    backoff: { type: "fixed", delay: 5000 },
  });
}

async function enqueueDeployment(data) {
  await deploymentQueue.add(`deployment:${data.circuitId}`, data, {
    removeOnComplete: true,
    removeOnFail: false,
    attempts: 2,
    backoff: { type: "exponential", delay: 10000 },
  });
}

module.exports = {
  enqueueKeyGeneration,
  enqueueProofGeneration,
  enqueueCleanup,
  enqueueDeploy,
  enqueueDeployment,
};
