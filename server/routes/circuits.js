"use strict";

const express = require("express");
const Joi = require("joi");
const {
  enqueueKeyGeneration,
  enqueueDeploy,
  enqueueDeployment,
} = require("../services/queueService");
const {
  findOrCreateCircuit,
  createNewCircuit,
  findCircuitById,
} = require("../services/circuitService");

const router = express.Router();

const schema = Joi.object({
  templateName: Joi.string().trim().required(),
  params: Joi.object()
    .pattern(/.*/, Joi.alternatives(Joi.number(), Joi.string()))
    .required(),
});

router.post("/", async (req, res, next) => {
  try {
    const { value, error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    const circuit = await createNewCircuit(value.templateName, value.params);

    if (
      circuit.status === "ready_for_deployment" ||
      circuit.status === "deploying" ||
      circuit.status === "deployed"
    ) {
      return res.status(200).json(circuit);
    }

    // Enqueue if pending and not already enqueued (idempotent by circuitId)
    await enqueueKeyGeneration({
      circuitId: circuit._id.toString(),
      templateName: value.templateName,
      params: value.params,
    });
    return res.status(202).json(circuit);
  } catch (err) {
    next(err);
  }
});

// Get circuit info by ID
router.get("/:id", async (req, res, next) => {
  try {
    const circuit = await findCircuitById(req.params.id);
    if (!circuit) {
      return res.status(404).json({ message: "Circuit not found" });
    }

    return res.status(200).json(circuit);
  } catch (err) {
    // Handle invalid ObjectId format
    if (err.name === "CastError") {
      return res.status(400).json({ message: "Invalid circuit ID format" });
    }
    next(err);
  }
});

// Deploy verifier to external service
router.post("/:id/deploy", async (req, res, next) => {
  try {
    const circuit = await findCircuitById(req.params.id);
    if (!circuit) return res.status(404).json({ message: "Circuit not found" });

    if (circuit.status !== "ready_for_deployment") {
      return res.status(400).json({
        message: `Circuit not ready for deployment. Current status: ${circuit.status}`,
      });
    }

    if (!circuit.artifacts?.verifier) {
      return res
        .status(400)
        .json({ message: "Verifier contract not available" });
    }

    // Enqueue deployment to external service
    await enqueueDeployment({ circuitId: circuit._id.toString() });

    return res.status(202).json({
      message: "Circuit deployment enqueued",
      circuitId: circuit._id.toString(),
      status: "deployment_queued",
    });
  } catch (err) {
    next(err);
  }
});

// Legacy deploy endpoint (kept for backward compatibility)
router.post("/:id/deploy-legacy", async (req, res, next) => {
  try {
    const circuit = await findCircuitById(req.params.id);
    if (!circuit) return res.status(404).json({ message: "Not found" });
    if (circuit.status !== "ready_for_deployment")
      return res.status(400).json({ message: "Circuit not ready" });
    if (!circuit.artifacts?.verifier)
      return res.status(400).json({ message: "Verifier not available" });

    const { chainId, rpcUrl, privateKey } = req.body || {};
    if (!rpcUrl || !privateKey)
      return res
        .status(400)
        .json({ message: "rpcUrl and privateKey are required" });

    await enqueueDeploy({
      circuitId: circuit._id.toString(),
      artifacts: circuit.artifacts,
      chainId,
      rpcUrl,
      privateKey,
    });
    return res.status(202).json({ message: "Deployment enqueued" });
  } catch (err) {
    next(err);
  }
});

// Get deployment status
router.get("/:id/deployment", async (req, res, next) => {
  try {
    const circuit = await findCircuitById(req.params.id);
    if (!circuit) return res.status(404).json({ message: "Circuit not found" });

    const response = {
      circuitId: circuit._id.toString(),
      status: circuit.status,
      deployment: circuit.deployment || null,
    };

    return res.status(200).json(response);
  } catch (err) {
    next(err);
  }
});

module.exports = { circuitsRouter: router };
