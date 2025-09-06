"use strict";

require("dotenv").config();
const { connect } = require("../server/services/db");
const Circuit = require("../server/models/Circuit");

async function migrateOldReadyStatus() {
  try {
    await connect();
    console.log("Connected to database");

    // Find all circuits with old "ready" status
    const oldReadyCircuits = await Circuit.find({ status: "ready" });
    console.log(
      `Found ${oldReadyCircuits.length} circuits with old "ready" status`
    );

    if (oldReadyCircuits.length === 0) {
      console.log("No circuits need migration");
      return;
    }

    // Update them to "ready_for_deployment"
    const result = await Circuit.updateMany(
      { status: "ready" },
      { status: "ready_for_deployment" }
    );

    console.log(
      `✓ Updated ${result.modifiedCount} circuits to "ready_for_deployment" status`
    );

    // List the updated circuits
    console.log("Updated circuits:");
    for (const circuit of oldReadyCircuits) {
      console.log(`  - ${circuit._id} (${circuit.template})`);
    }
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    process.exit(0);
  }
}

migrateOldReadyStatus();
