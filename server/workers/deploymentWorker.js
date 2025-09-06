"use strict";

require("dotenv").config();
const { Worker, QueueEvents } = require("bullmq");
const IORedis = require("ioredis");
const { connect } = require("../services/db");
const {
  startDeployment,
  checkDeploymentStatus,
  getContractInfo,
  markCircuitDeploying,
  markCircuitDeployed,
  markCircuitDeploymentFailed,
} = require("../services/deploymentService");
const { findCircuitById } = require("../services/circuitService");

const connection = new IORedis(
  process.env.REDIS_URL || "redis://127.0.0.1:6379",
  { maxRetriesPerRequest: null, enableReadyCheck: false }
);

new QueueEvents("deployment", { connection });

async function processJob(job) {
  const { circuitId } = job.data;

  console.log(`[deployment] Starting deployment for circuit ${circuitId}`);

  // Get circuit info
  const circuit = await findCircuitById(circuitId);
  if (!circuit) {
    throw new Error(`Circuit ${circuitId} not found`);
  }

  if (circuit.status !== "ready_for_deployment") {
    throw new Error(
      `Circuit ${circuitId} is not ready for deployment (status: ${circuit.status})`
    );
  }

  try {
    // Step 1: Start deployment
    console.log(`[deployment] Calling deployment API for circuit ${circuitId}`);
    const deploymentResponse = await startDeployment(circuitId);

    if (!deploymentResponse.success) {
      throw new Error(
        `Deployment API returned error: ${deploymentResponse.message}`
      );
    }

    const { jobId } = deploymentResponse.data;
    console.log(`[deployment] Deployment job started with ID: ${jobId}`);

    // Step 2: Mark circuit as deploying
    await markCircuitDeploying(circuitId, jobId);

    // Step 3: Poll for deployment status
    let maxAttempts = 60; // Poll for up to 10 minutes (60 * 10 seconds)
    let attempts = 0;
    let deploymentComplete = false;
    let contractInfoAttempts = 0;
    const maxContractInfoAttempts = 10; // Try contract info up to 10 times after job is completed

    while (attempts < maxAttempts && !deploymentComplete) {
      attempts++;

      try {
        console.log(
          `[deployment] Checking status (attempt ${attempts}/${maxAttempts}) for job ${jobId}`
        );
        const statusResponse = await checkDeploymentStatus(jobId);

        console.log(
          `[deployment] Full status response for job ${jobId}:`,
          JSON.stringify(statusResponse, null, 2)
        );
        console.log(
          `[deployment] Job ${jobId} status: ${statusResponse.data?.status}`
        );

        if (
          statusResponse.data?.status === "completed" ||
          statusResponse.data?.status === "deployed"
        ) {
          // Get contract deployment info
          try {
            const contractInfo = await getContractInfo(circuitId);

            console.log(
              `[deployment] Contract info for circuit ${circuitId}:`,
              JSON.stringify(contractInfo, null, 2)
            );

            if (
              contractInfo.data?.status === "deployed" &&
              contractInfo.data?.contractAddress
            ) {
              console.log(
                `[deployment] Circuit ${circuitId} deployed successfully to ${contractInfo.data.contractAddress}`
              );
              await markCircuitDeployed(circuitId, contractInfo.data);
              deploymentComplete = true;
            } else {
              contractInfoAttempts++;
              console.log(
                `[deployment] Contract info not ready yet for circuit ${circuitId} (attempt ${contractInfoAttempts}/${maxContractInfoAttempts}). Status: ${contractInfo.data?.status}, Address: ${contractInfo.data?.contractAddress}`
              );

              // If we've tried too many times to get contract info, give up
              if (contractInfoAttempts >= maxContractInfoAttempts) {
                throw new Error(
                  `Contract info not available after ${maxContractInfoAttempts} attempts. Job status was completed but contract not deployed.`
                );
              }
            }
          } catch (contractError) {
            console.warn(
              `[deployment] Failed to get contract info for circuit ${circuitId}:`,
              contractError.message
            );
            // Continue polling - the contract info might not be available yet
          }
        } else if (
          statusResponse.data?.status === "failed" ||
          statusResponse.data?.status === "error"
        ) {
          const errorMsg =
            statusResponse.data?.error ||
            statusResponse.error ||
            "Deployment failed";
          throw new Error(`Deployment failed: ${errorMsg}`);
        }

        if (!deploymentComplete) {
          // Wait 10 seconds before next poll
          await new Promise((resolve) => setTimeout(resolve, 10000));
        }
      } catch (error) {
        console.warn(
          `[deployment] Status check attempt ${attempts} failed: ${error.message}`
        );

        // If we're near the end of attempts, throw the error
        if (attempts >= maxAttempts - 5) {
          throw error;
        }

        // Otherwise, wait and continue
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }
    }

    if (!deploymentComplete) {
      throw new Error(`Deployment timed out after ${maxAttempts} attempts`);
    }

    console.log(
      `[deployment] Successfully completed deployment for circuit ${circuitId}`
    );
  } catch (error) {
    console.error(
      `[deployment] Failed to deploy circuit ${circuitId}:`,
      error.message
    );
    await markCircuitDeploymentFailed(circuitId, error.message);
    throw error;
  }
}

const worker = new Worker(
  "deployment",
  async (job) => {
    await connect();
    return processJob(job);
  },
  {
    connection,
    concurrency: Number(process.env.DEPLOYMENT_CONCURRENCY || 2),
  }
);

worker.on("completed", (job) => {
  console.log(`[deployment] Completed job ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(`[deployment] Failed job ${job?.id}:`, err.message);
});

worker.on("error", (err) => {
  console.error("[deployment] Worker error:", err);
});

console.log("[deployment] Deployment worker started");
