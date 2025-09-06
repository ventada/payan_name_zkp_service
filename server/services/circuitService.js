"use strict";

const crypto = require("crypto");
const { connect } = require("./db");
const Circuit = require("../models/Circuit");

function stableHash(obj) {
  const json = JSON.stringify(obj, Object.keys(obj).sort());
  return crypto.createHash("sha256").update(json).digest("hex");
}

async function findOrCreateCircuit(templateName, params) {
  await connect();
  const circuitHash = stableHash({ templateName, params });

  let doc = await Circuit.findOne({ circuit_hash: circuitHash }).lean();
  if (doc) return doc;

  doc = await Circuit.create({
    circuit_hash: circuitHash,
    template: templateName,
    params,
    status: "pending",
  });
  return doc.toObject();
}

async function markCircuitReady(circuitId, artifacts) {
  await connect();
  await Circuit.findByIdAndUpdate(circuitId, {
    status: "ready_for_deployment",
    artifacts,
  });
}

async function markCircuitFailed(circuitId, errorMessage) {
  await connect();
  await Circuit.findByIdAndUpdate(circuitId, {
    status: "failed",
    error: errorMessage,
  });
}

async function findCircuitById(circuitId) {
  await connect();
  return Circuit.findById(circuitId).lean();
}

async function createNewCircuit(templateName, params) {
  await connect();
  // Create a unique hash by including timestamp and random value
  const uniqueData = {
    templateName,
    params,
    timestamp: Date.now(),
    random: Math.random().toString(36).substring(7),
  };
  const circuitHash = stableHash(uniqueData);

  const doc = await Circuit.create({
    circuit_hash: circuitHash,
    template: templateName,
    params,
    status: "pending",
  });
  return doc.toObject();
}

async function updateCircuitStatus(circuitId, status, updateData = {}) {
  await connect();
  const updateFields = { status, ...updateData };
  return Circuit.findByIdAndUpdate(circuitId, updateFields, { new: true });
}

async function findCircuitsByStatus(status) {
  await connect();
  return Circuit.find({ status }).lean();
}

module.exports = {
  findOrCreateCircuit,
  createNewCircuit,
  markCircuitReady,
  markCircuitFailed,
  findCircuitById,
  updateCircuitStatus,
  findCircuitsByStatus,
};
