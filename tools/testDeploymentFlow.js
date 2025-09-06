"use strict";

require("dotenv").config();
const { connect } = require("../server/services/db");
const { createNewCircuit } = require("../server/services/circuitService");
const { enqueueKeyGeneration } = require("../server/services/queueService");

async function testDeploymentFlow() {
  try {
    await connect();
    console.log("Connected to database");

    // Create a simple test circuit
    const testParams = { n: 4 }; // Simple parameters
    const templateName = "sudokuVerifier"; // Use an existing template

    console.log("Creating test circuit...");
    const circuit = await createNewCircuit(templateName, testParams);

    console.log(
      `Created circuit ${circuit._id} with status: ${circuit.status}`
    );

    if (circuit.status === "pending") {
      console.log("Enqueueing key generation...");
      await enqueueKeyGeneration({
        circuitId: circuit._id.toString(),
        templateName,
        params: testParams,
      });
      console.log("Key generation enqueued successfully");
      console.log(
        "Now monitor the logs to see if deployment is triggered automatically"
      );
      console.log(`Circuit ID: ${circuit._id}`);
    } else {
      console.log("Circuit already processed, status:", circuit.status);
    }

    // Check environment
    console.log("\n=== Environment Check ===");
    console.log(
      "CONTRACT_DEPLOY_URL:",
      process.env.CONTRACT_DEPLOY_URL || "NOT SET"
    );
    console.log(
      "REDIS_URL:",
      process.env.REDIS_URL || "redis://127.0.0.1:6379"
    );
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    process.exit(0);
  }
}

testDeploymentFlow();
