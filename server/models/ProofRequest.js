"use strict";

const mongoose = require("mongoose");

const ProofRequestSchema = new mongoose.Schema(
  {
    circuit_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Circuit",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
      index: true,
    },
    user_id: { type: String, default: null, index: true },
    artifacts: { type: mongoose.Schema.Types.Mixed, default: null },
    error: { type: String, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// Proof requests will persist indefinitely - no automatic deletion

module.exports =
  mongoose.models.ProofRequest ||
  mongoose.model("ProofRequest", ProofRequestSchema);
