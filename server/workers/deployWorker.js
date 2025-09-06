"use strict";

require("dotenv").config();
const { Worker } = require("bullmq");
const IORedis = require("ioredis");
const { connect } = require("../services/db");
const { getObjectStream } = require("../services/storageService");
const { markCircuitReady } = require("../services/circuitService");
const fs = require("fs");
const fsp = require("fs").promises;
const path = require("path");
const os = require("os");
const { ethers } = require("ethers");

const connection = new IORedis(
  process.env.REDIS_URL || "redis://127.0.0.1:6379",
  { maxRetriesPerRequest: null, enableReadyCheck: false }
);

async function streamToFile(stream, destPath) {
  await fsp.mkdir(path.dirname(destPath), { recursive: true });
  const ws = fs.createWriteStream(destPath);
  await new Promise((resolve, reject) => {
    stream.pipe(ws);
    ws.on("finish", resolve);
    ws.on("error", reject);
  });
}

async function processJob(job) {
  const { circuitId, artifacts, chainId, rpcUrl, privateKey } = job.data;
  const tmpDir = await fsp.mkdtemp(
    path.join(os.tmpdir(), `deploy-${circuitId}-`)
  );
  const verifierLocal = path.join(tmpDir, "Verifier.sol");

  // Download verifier
  await streamToFile(await getObjectStream(artifacts.verifier), verifierLocal);

  // ethers v6 can deploy using a raw source via a minimal factory if compiled externally.
  // Here we use a basic heuristic: many snarkjs verifier contracts are Solidity 0.8.x and self-contained.
  // We compile using solc-js dynamically for portability.
  const solc = require("solc");
  const source = await fsp.readFile(verifierLocal, "utf8");

  const input = {
    language: "Solidity",
    sources: { "Verifier.sol": { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } },
    },
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  if (output.errors && output.errors.some((e) => e.severity === "error")) {
    const firstErr = output.errors.find((e) => e.severity === "error");
    throw new Error(
      `Solidity compile failed: ${
        firstErr.formattedMessage || firstErr.message
      }`
    );
  }
  const contractName = Object.keys(output.contracts["Verifier.sol"])[0];
  const { abi, evm } = output.contracts["Verifier.sol"][contractName];
  const bytecode = evm.bytecode.object;

  const provider = new ethers.JsonRpcProvider(
    rpcUrl,
    chainId ? Number(chainId) : undefined
  );
  const wallet = new ethers.Wallet(privateKey, provider);

  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy();
  const receipt = await contract.deploymentTransaction().wait();

  // Persist deployment metadata on circuit artifacts
  await markCircuitReady(circuitId, {
    ...artifacts,
    deployment: {
      address: contract.target,
      chainId: await provider.getNetwork().then((n) => Number(n.chainId)),
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      network: await provider.getNetwork().then((n) => n.name || ""),
    },
  });

  await fsp.rm(tmpDir, { recursive: true, force: true });
}

new Worker(
  "deploy",
  async (job) => {
    await connect();
    return processJob(job);
  },
  { connection, concurrency: 1 }
);
