"use strict";

require("dotenv").config();
const { Worker } = require("bullmq");
const IORedis = require("ioredis");
const path = require("path");
const fs = require("fs").promises;
const os = require("os");
const { runCommand } = require("./common/processUtils");
const {
  markProofCompleted,
  markProofFailed,
} = require("../services/proofService");
const { getObjectStream } = require("../services/storageService");
const { connect } = require("../services/db");

const connection = new IORedis(
  process.env.REDIS_URL || "redis://127.0.0.1:6379",
  { maxRetriesPerRequest: null, enableReadyCheck: false }
);

async function streamToFile(stream, destPath) {
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  const ws = require("fs").createWriteStream(destPath);
  await new Promise((resolve, reject) => {
    stream.pipe(ws);
    ws.on("finish", resolve);
    ws.on("error", reject);
  });
}

async function processJob(job) {
  const {
    proofRequestId,
    circuitId,
    privateInputs,
    publicInputs = {},
  } = job.data;

  const tmpDir = await fs.mkdtemp(
    path.join(os.tmpdir(), `proof-${proofRequestId}-`)
  );
  const wasmLocal = path.join(tmpDir, "circuit.wasm");
  const zkeyLocal = path.join(tmpDir, "circuit_final.zkey");

  // 1) Download artifacts
  await streamToFile(
    await getObjectStream(`circuits/${circuitId}/circuit.wasm`),
    wasmLocal
  );
  await streamToFile(
    await getObjectStream(`circuits/${circuitId}/circuit_final.zkey`),
    zkeyLocal
  );

  // 2) Build input.json only in tmpDir
  const input = { ...publicInputs, ...privateInputs };
  const inputPath = path.join(tmpDir, "input.json");
  await fs.writeFile(inputPath, JSON.stringify(input));

  // 3) Witness + proof
  const witnessPath = path.join(tmpDir, "witness.wtns");
  await runCommand("npx", [
    "snarkjs",
    "wtns",
    "calculate",
    wasmLocal,
    inputPath,
    witnessPath,
  ]);

  const proofPath = path.join(tmpDir, "proof.json");
  const publicPath = path.join(tmpDir, "public.json");
  await runCommand("npx", [
    "snarkjs",
    "groth16",
    "prove",
    zkeyLocal,
    witnessPath,
    proofPath,
    publicPath,
  ]);

  // 4) Upload proof files (caller may move them to S3 via another service; here we store inline as artifacts)
  const proof = JSON.parse(await fs.readFile(proofPath, "utf8"));
  const pub = JSON.parse(await fs.readFile(publicPath, "utf8"));

  await markProofCompleted(proofRequestId, { proof, public: pub });

  // 5) Secure cleanup
  try {
    await fs.rm(tmpDir, { recursive: true, force: true });
  } catch (_) {}
}

const worker = new Worker(
  "proof-generation",
  async (job) => {
    await connect();
    return processJob(job);
  },
  {
    connection,
    concurrency: Number(process.env.PROOF_CONCURRENCY || 1),
  }
);

worker.on("completed", (job) => {
  console.log(`[proof] Completed job ${job.id}`);
});

worker.on("failed", async (job, err) => {
  console.error(`[proof] Failed job ${job?.id}:`, err);
  try {
    if (job?.data?.proofRequestId)
      await markProofFailed(job.data.proofRequestId, err.message);
  } catch (_) {}
});
