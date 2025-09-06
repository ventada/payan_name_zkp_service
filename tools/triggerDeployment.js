"use strict";

require("dotenv").config();
const { connect } = require("../server/services/db");
const { findCircuitsByStatus } = require("../server/services/circuitService");
const { enqueueDeployment } = require("../server/services/queueService");

async function triggerDeploymentForReadyCircuits() {
  try {
    await connect();
    console.log("Connected to database");

    // Find all circuits that are ready for deployment
    const readyCircuits = await findCircuitsByStatus("ready_for_deployment");
    console.log(`Found ${readyCircuits.length} circuits ready for deployment`);

    if (readyCircuits.length === 0) {
      // Also check for old "ready" status circuits
      const oldReadyCircuits = await findCircuitsByStatus("ready");
      if (oldReadyCircuits.length > 0) {
        console.log(
          `Found ${oldReadyCircuits.length} circuits with old "ready" status`
        );
        console.log(
          "These need to be manually updated to 'ready_for_deployment' status"
        );

        for (const circuit of oldReadyCircuits) {
          console.log(
            `Circuit ${circuit._id}: ${circuit.template} - Status: ${circuit.status}`
          );
        }
      }
      return;
    }

    // Trigger deployment for each ready circuit
    for (const circuit of readyCircuits) {
      console.log(
        `Triggering deployment for circuit ${circuit._id} (${circuit.template})`
      );
      try {
        await enqueueDeployment({ circuitId: circuit._id.toString() });
        console.log(`✓ Deployment enqueued for circuit ${circuit._id}`);
      } catch (error) {
        console.error(
          `✗ Failed to enqueue deployment for circuit ${circuit._id}:`,
          error.message
        );
      }
    }

    console.log("Deployment triggering completed");
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    process.exit(0);
  }
}

async function listCircuitStatuses() {
  try {
    await connect();
    console.log("=== Circuit Status Summary ===");

    const statuses = [
      "pending",
      "ready",
      "ready_for_deployment",
      "deploying",
      "deployed",
      "failed",
    ];

    for (const status of statuses) {
      const circuits = await findCircuitsByStatus(status);
      console.log(`${status}: ${circuits.length} circuits`);

      if (circuits.length > 0 && circuits.length <= 5) {
        circuits.forEach((circuit) => {
          console.log(`  - ${circuit._id} (${circuit.template})`);
        });
      }
    }
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    process.exit(0);
  }
}

// Check command line arguments
const command = process.argv[2];

if (command === "trigger") {
  triggerDeploymentForReadyCircuits();
} else if (command === "status") {
  listCircuitStatuses();
} else {
  console.log("Usage:");
  console.log(
    "  node tools/triggerDeployment.js trigger  - Trigger deployment for ready circuits"
  );
  console.log(
    "  node tools/triggerDeployment.js status   - List circuit statuses"
  );
  process.exit(1);
}
