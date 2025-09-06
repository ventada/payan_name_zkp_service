"use strict";

require("dotenv").config();
const path = require("path");
const fs = require("fs").promises;
const { runCommand } = require("../server/workers/common/processUtils");

(async () => {
  const tauDir = path.join(process.cwd(), "tau");
  await fs.mkdir(tauDir, { recursive: true });

  const pot0 = "tau/pot14_0000.ptau";
  const pot1 = "tau/pot14_0001.ptau";
  const pot2 = "tau/pot14_0002.ptau";
  const pot3 = "tau/pot14_0003.ptau";
  const potBeacon = "tau/pot14_beacon.ptau";
  const potFinal = "tau/pot14_final.ptau";

  try {
    console.log("Starting Powers of Tau ceremony...");

    await runCommand("npx", [
      "snarkjs",
      "powersoftau",
      "new",
      "bn128",
      "14",
      pot0,
    ]);

    await runCommand("npx", [
      "snarkjs",
      "powersoftau",
      "contribute",
      pot0,
      pot1,
      '--name="First contribution"',
      `--entropy=${Math.random().toString(36).slice(2)}`,
    ]);

    await runCommand("npx", [
      "snarkjs",
      "powersoftau",
      "contribute",
      pot1,
      pot2,
      '--name="Second contribution"',
      `--entropy=${Math.random().toString(36).slice(2)}`,
    ]);

    await runCommand("npx", [
      "snarkjs",
      "powersoftau",
      "export",
      "challenge",
      pot2,
      "tau/challenge_0003",
    ]);

    await runCommand("npx", [
      "snarkjs",
      "powersoftau",
      "challenge",
      "contribute",
      "bn128",
      "tau/challenge_0003",
      "tau/response_0003",
      `-e=${Math.random().toString(36).slice(2)}`,
    ]);

    await runCommand("npx", [
      "snarkjs",
      "powersoftau",
      "import",
      "response",
      pot2,
      "tau/response_0003",
      pot3,
      '-n="Third contribution name"',
    ]);

    await runCommand("npx", ["snarkjs", "powersoftau", "verify", pot3]);

    await runCommand("npx", [
      "snarkjs",
      "powersoftau",
      "beacon",
      pot3,
      potBeacon,
      "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
      "10",
      '-n="Final Beacon"',
    ]);

    await runCommand("npx", [
      "snarkjs",
      "powersoftau",
      "prepare",
      "phase2",
      potBeacon,
      potFinal,
    ]);

    await runCommand("npx", ["snarkjs", "powersoftau", "verify", potFinal]);

    console.log("Powers of Tau complete at:", potFinal);
  } catch (err) {
    console.error("Powers of Tau failed:", err);
    process.exit(1);
  }
})();
