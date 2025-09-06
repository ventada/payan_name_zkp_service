"use strict";

const { connect } = require("./db");
const ProofRequest = require("../models/ProofRequest");

async function createProofRequest({ circuitId, userId = null }) {
  await connect();
  const doc = await ProofRequest.create({
    circuit_id: circuitId,
    status: "pending",
    user_id: userId,
  });
  return doc.toObject();
}

async function markProofCompleted(proofRequestId, artifacts) {
  await connect();
  await ProofRequest.findByIdAndUpdate(proofRequestId, {
    status: "completed",
    artifacts,
  });
}

async function markProofFailed(proofRequestId, errorMessage) {
  await connect();
  await ProofRequest.findByIdAndUpdate(proofRequestId, {
    status: "failed",
    error: errorMessage,
  });
}

async function getProofRequestById(proofRequestId) {
  await connect();
  const proofRequest = await ProofRequest.findById(proofRequestId);
  return proofRequest ? proofRequest.toObject() : null;
}

module.exports = {
  createProofRequest,
  markProofCompleted,
  markProofFailed,
  getProofRequestById,
};
