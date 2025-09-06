"use strict";

const express = require("express");
const {
  markCircuitDeployed,
  markCircuitDeploymentFailed,
} = require("../services/deploymentService");
const { findCircuitById } = require("../services/circuitService");

const router = express.Router();

// Webhook endpoint for deployment status updates
router.post("/deployment-status", async (req, res, next) => {
  try {
    const { circuitId, status, contractAddress, txHash, deployedAt, error } =
      req.body;

    if (!circuitId) {
      return res.status(400).json({ message: "circuitId is required" });
    }

    // Verify circuit exists
    const circuit = await findCircuitById(circuitId);
    if (!circuit) {
      return res.status(404).json({ message: "Circuit not found" });
    }

    console.log(
      `[webhook] Received deployment status update for circuit ${circuitId}: ${status}`
    );

    if (status === "deployed" && contractAddress) {
      // Mark as successfully deployed
      await markCircuitDeployed(circuitId, {
        contractAddress,
        txHash,
        deployedAt: deployedAt ? new Date(deployedAt) : new Date(),
      });

      console.log(
        `[webhook] Circuit ${circuitId} marked as deployed to ${contractAddress}`
      );
    } else if (status === "failed" || status === "error") {
      // Mark as failed
      const errorMessage = error || "Deployment failed (webhook notification)";
      await markCircuitDeploymentFailed(circuitId, errorMessage);

      console.log(
        `[webhook] Circuit ${circuitId} marked as deployment failed: ${errorMessage}`
      );
    } else {
      console.log(
        `[webhook] Ignoring status update for circuit ${circuitId}: ${status}`
      );
    }

    return res.status(200).json({
      message: "Status update processed",
      circuitId,
      status,
    });
  } catch (err) {
    console.error("[webhook] Error processing deployment status:", err.message);
    next(err);
  }
});

module.exports = { webhooksRouter: router };
