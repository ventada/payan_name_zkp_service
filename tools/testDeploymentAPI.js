"use strict";

require("dotenv").config();
const axios = require("axios");

const DEPLOY_BASE_URL = process.env.CONTRACT_DEPLOY_URL;

async function testDeploymentAPI() {
  if (!DEPLOY_BASE_URL) {
    console.error("CONTRACT_DEPLOY_URL environment variable not set");
    process.exit(1);
  }

  console.log("Testing deployment API at:", DEPLOY_BASE_URL);

  try {
    // Test 1: Start deployment
    console.log("\n=== Test 1: Start Deployment ===");
    const testCircuitId = "test_circuit_" + Date.now();

    const deployResponse = await axios.post(
      `${DEPLOY_BASE_URL}/api/deploy`,
      { circuitId: testCircuitId },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 30000,
      }
    );

    console.log(
      "Deploy response:",
      JSON.stringify(deployResponse.data, null, 2)
    );

    if (deployResponse.data.success && deployResponse.data.data.jobId) {
      const jobId = deployResponse.data.data.jobId;
      console.log(`✓ Deployment started with job ID: ${jobId}`);

      // Test 2: Check status
      console.log("\n=== Test 2: Check Status ===");
      const statusResponse = await axios.get(
        `${DEPLOY_BASE_URL}/api/deploy/status/${jobId}`,
        { timeout: 10000 }
      );

      console.log(
        "Status response:",
        JSON.stringify(statusResponse.data, null, 2)
      );
      console.log(
        `✓ Status check successful. Status: ${statusResponse.data.data?.status}`
      );

      // Test 3: Get contract info (this might fail if deployment isn't complete)
      console.log("\n=== Test 3: Get Contract Info ===");
      try {
        const contractResponse = await axios.get(
          `${DEPLOY_BASE_URL}/api/deploy/contract/${testCircuitId}`,
          { timeout: 10000 }
        );
        console.log(
          "Contract response:",
          JSON.stringify(contractResponse.data, null, 2)
        );
        console.log("✓ Contract info retrieved successfully");
      } catch (contractError) {
        console.log(
          "Contract info not available yet (expected if deployment not complete)"
        );
        console.log(
          "Error:",
          contractError.response?.data || contractError.message
        );
      }
    } else {
      console.error("✗ Deployment start failed");
    }
  } catch (error) {
    console.error("API test failed:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
  }
}

testDeploymentAPI();
