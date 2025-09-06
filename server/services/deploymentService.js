"use strict";

const axios = require("axios");
const { connect } = require("./db");
const Circuit = require("../models/Circuit");

const DEPLOY_BASE_URL = process.env.CONTRACT_DEPLOY_URL;

if (!DEPLOY_BASE_URL) {
  console.warn("CONTRACT_DEPLOY_URL environment variable not set");
}

/**
 * Start deployment by calling external deployment API
 */
async function startDeployment(circuitId) {
  if (!DEPLOY_BASE_URL) {
    throw new Error("CONTRACT_DEPLOY_URL not configured");
  }

  try {
    const response = await axios.post(
      `${DEPLOY_BASE_URL}/api/deploy`,
      { circuitId },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 30000, // 30 second timeout
      }
    );

    return response.data;
  } catch (error) {
    console.error("Failed to start deployment:", error.message);
    throw new Error(`Deployment API call failed: ${error.message}`);
  }
}

/**
 * Check deployment job status
 */
async function checkDeploymentStatus(jobId) {
  if (!DEPLOY_BASE_URL) {
    throw new Error("CONTRACT_DEPLOY_URL not configured");
  }

  try {
    const response = await axios.get(
      `${DEPLOY_BASE_URL}/api/deploy/status/${jobId}`,
      {
        timeout: 10000, // 10 second timeout
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      `Failed to check deployment status for job ${jobId}:`,
      error.message
    );
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
    throw new Error(`Status check failed: ${error.message}`);
  }
}

/**
 * Get contract deployment info
 */
async function getContractInfo(circuitId) {
  if (!DEPLOY_BASE_URL) {
    throw new Error("CONTRACT_DEPLOY_URL not configured");
  }

  try {
    const response = await axios.get(
      `${DEPLOY_BASE_URL}/api/deploy/contract/${circuitId}`,
      {
        timeout: 10000, // 10 second timeout
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      `Failed to get contract info for circuit ${circuitId}:`,
      error.message
    );
    throw new Error(`Contract info retrieval failed: ${error.message}`);
  }
}

/**
 * Mark circuit as ready for deployment
 */
async function markCircuitReadyForDeployment(circuitId) {
  await connect();
  await Circuit.findByIdAndUpdate(circuitId, {
    status: "ready_for_deployment",
  });
}

/**
 * Mark circuit as deploying with job info
 */
async function markCircuitDeploying(circuitId, jobId) {
  await connect();
  await Circuit.findByIdAndUpdate(circuitId, {
    status: "deploying",
    "deployment.jobId": jobId,
  });
}

/**
 * Mark circuit as deployed with contract info
 */
async function markCircuitDeployed(circuitId, contractInfo) {
  await connect();
  await Circuit.findByIdAndUpdate(circuitId, {
    status: "deployed",
    "deployment.contractAddress": contractInfo.contractAddress,
    "deployment.txHash": contractInfo.txHash,
    "deployment.deployedAt": contractInfo.deployedAt
      ? new Date(contractInfo.deployedAt)
      : new Date(),
  });
}

/**
 * Mark circuit deployment as failed
 */
async function markCircuitDeploymentFailed(circuitId, errorMessage) {
  await connect();
  await Circuit.findByIdAndUpdate(circuitId, {
    status: "failed",
    "deployment.error": errorMessage,
  });
}

module.exports = {
  startDeployment,
  checkDeploymentStatus,
  getContractInfo,
  markCircuitReadyForDeployment,
  markCircuitDeploying,
  markCircuitDeployed,
  markCircuitDeploymentFailed,
};
