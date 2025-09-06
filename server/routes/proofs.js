"use strict";

const express = require("express");
const Joi = require("joi");
const { enqueueProofGeneration } = require("../services/queueService");
const { findCircuitById } = require("../services/circuitService");
const {
  createProofRequest,
  getProofRequestById,
} = require("../services/proofService");

const router = express.Router();

const schema = Joi.object({
  circuitId: Joi.string().required(),
  privateInputs: Joi.object().required(),
  publicInputs: Joi.object().default({}),
});

router.post("/", async (req, res, next) => {
  try {
    const { value, error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    const circuit = await findCircuitById(value.circuitId);
    if (
      !circuit ||
      !["ready_for_deployment", "deploying", "deployed"].includes(
        circuit.status
      )
    ) {
      return res
        .status(400)
        .json({ message: "Circuit not ready for proof generation" });
    }

    const proofRequest = await createProofRequest({
      circuitId: value.circuitId,
    });
    await enqueueProofGeneration({
      proofRequestId: proofRequest._id.toString(),
      circuitId: value.circuitId,
      privateInputs: value.privateInputs,
      publicInputs: value.publicInputs,
    });

    return res
      .status(202)
      .json({ proofRequestId: proofRequest._id.toString() });
  } catch (err) {
    next(err);
  }
});

// GET route to retrieve proof by proofRequestId
router.get("/:proofRequestId", async (req, res, next) => {
  try {
    const { proofRequestId } = req.params;

    // Validate proofRequestId format (MongoDB ObjectId)
    if (!proofRequestId || !/^[0-9a-fA-F]{24}$/.test(proofRequestId)) {
      return res.status(400).json({
        message: "Invalid proofRequestId format",
      });
    }

    const proofRequest = await getProofRequestById(proofRequestId);

    if (!proofRequest) {
      return res.status(404).json({
        message: "Proof request not found",
      });
    }

    // Return different responses based on status
    switch (proofRequest.status) {
      case "completed":
        return res.status(200).json({
          status: "completed",
          proofRequestId: proofRequest._id,
          artifacts: proofRequest.artifacts,
          createdAt: proofRequest.created_at,
          completedAt: proofRequest.updated_at,
        });

      case "failed":
        return res.status(400).json({
          status: "failed",
          proofRequestId: proofRequest._id,
          error: proofRequest.error,
          createdAt: proofRequest.created_at,
          failedAt: proofRequest.updated_at,
        });

      case "pending":
        return res.status(202).json({
          status: "pending",
          proofRequestId: proofRequest._id,
          createdAt: proofRequest.created_at,
          message: "Proof generation is still in progress",
        });

      default:
        return res.status(500).json({
          message: "Unknown proof request status",
        });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = { proofsRouter: router };
