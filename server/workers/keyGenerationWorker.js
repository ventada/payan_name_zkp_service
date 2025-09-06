"use strict";

require("dotenv").config();
const { Worker, QueueEvents } = require("bullmq");
const IORedis = require("ioredis");
const path = require("path");
const fs = require("fs").promises;
const { runCommand } = require("./common/processUtils");
const { generateCircuitFile } = require("./common/templateEngine");
const { putObject, stringToStream } = require("../services/storageService");
const { connect } = require("../services/db");
const {
  markCircuitReady,
  markCircuitFailed,
} = require("../services/circuitService");
const { enqueueDeployment } = require("../services/queueService");

const connection = new IORedis(
  process.env.REDIS_URL || "redis://127.0.0.1:6379",
  { maxRetriesPerRequest: null, enableReadyCheck: false }
);

new QueueEvents("key-generation", { connection });

async function processJob(job) {
  const { circuitId, templateName, params } = job.data;

  // 1) Generate dynamic circuit
  const { outputPath, processingDir } = await generateCircuitFile(
    templateName,
    params
  );

  // 2) Compile circuit
  const outputDir = processingDir;
  console.log(`[keygen] Compiling circuit: ${outputPath}`);
  console.log(`[keygen] Output directory: ${outputDir}`);
  console.log(`[keygen] Working directory: ${process.cwd()}`);

  try {
    await runCommand("circom", [
      outputPath,
      "--r1cs",
      "--wasm",
      "--sym",
      "--output",
      outputDir,
      "-l",
      "node_modules",
    ]);
  } catch (error) {
    console.error(`[keygen] Circuit compilation failed:`, error.message);
    throw error;
  }

  const baseName = path.basename(outputPath, ".circom");
  const r1csPath = path.join(outputDir, `${baseName}.r1cs`);
  const wasmPath = path.join(outputDir, `${baseName}_js`, `${baseName}.wasm`);

  // 3) Key setup using global Powers of Tau (must exist beforehand)
  const ptauPath =
    process.env.PTAU_PATH ||
    path.join(process.cwd(), "tau", "pot14_final.ptau");
  const zkey0 = path.join(outputDir, "circuit_0000.zkey");
  const zkeyFinal = path.join(outputDir, "circuit_final.zkey");

  await runCommand("npx", [
    "snarkjs",
    "groth16",
    "setup",
    r1csPath,
    ptauPath,
    zkey0,
  ]);
  await runCommand("npx", [
    "snarkjs",
    "zkey",
    "beacon",
    zkey0,
    zkeyFinal,
    "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
    "10",
    '-n="Final Beacon"',
  ]);

  // 4) Export verification key
  const vkeyPath = path.join(outputDir, "verification_key.json");
  await runCommand("npx", [
    "snarkjs",
    "zkey",
    "export",
    "verificationkey",
    zkeyFinal,
    vkeyPath,
  ]);

  // 4.1) Export Solidity verifier contract
  const verifierPath = path.join(outputDir, "verifier.sol");
  await runCommand("npx", [
    "snarkjs",
    "zkey",
    "export",
    "solidityverifier",
    zkeyFinal,
    verifierPath,
  ]);

  // 5) Upload artifacts
  const prefix = `circuits/${circuitId}/`;
  await putObject(prefix + "circuit.wasm", await fs.readFile(wasmPath));
  await putObject(prefix + "circuit_final.zkey", await fs.readFile(zkeyFinal));
  await putObject(
    prefix + "verification_key.json",
    await fs.readFile(vkeyPath),
    "application/json"
  );
  await putObject(
    prefix + "verifier.sol",
    await fs.readFile(verifierPath),
    "text/plain"
  );

  await markCircuitReady(circuitId, {
    wasm: prefix + "circuit.wasm",
    zkey: prefix + "circuit_final.zkey",
    vkey: prefix + "verification_key.json",
    verifier: prefix + "verifier.sol",
  });

  // 6) Automatically trigger deployment
  console.log(`[keygen] Circuit ${circuitId} ready, enqueueing deployment`);
  await enqueueDeployment({ circuitId });

  // 7) Minimal cleanup: do not upload inputs, only artifacts
  await fs.rm(processingDir, { recursive: true, force: true });
}

const worker = new Worker(
  "key-generation",
  async (job) => {
    await connect();
    return processJob(job);
  },
  {
    connection,
    concurrency: Number(process.env.KEYGEN_CONCURRENCY || 1),
  }
);

worker.on("completed", (job) => {
  console.log(`[keygen] Completed job ${job.id}`);
});

worker.on("failed", async (job, err) => {
  console.error(`[keygen] Failed job ${job?.id}:`, err);
  try {
    if (job?.data?.circuitId)
      await markCircuitFailed(job.data.circuitId, err.message);
  } catch (_) {}
});
