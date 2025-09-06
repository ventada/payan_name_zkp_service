"use strict";

const express = require("express");
const router = express.Router();

// Hardcoded list of available templates
const templates = [
  {
    name: "rangeCheck",
    description: "Verifies that a private input falls within a specified range",
    parameters: ["min", "max"],
    example: {
      templateName: "rangeCheck",
      params: { min: 1000, max: 1500 },
    },
    show: true,
  },
  {
    name: "ageVerification",
    description: "Verifies that a person's age meets certain criteria",
    parameters: ["minAge", "maxAge"],
    example: {
      templateName: "ageVerification",
      params: { minAge: 18, maxAge: 100 },
    },
    show: true,
  },
  {
    name: "balanceProof",
    description: "Proves that an account balance meets certain conditions",
    parameters: ["minBalance"],
    example: {
      templateName: "balanceProof",
      params: { minBalance: 1000 },
    },
    show: false,
  },
  {
    name: "commitReveal",
    description: "Implements a commit-reveal scheme for private data",
    parameters: ["commitment"],
    example: {
      templateName: "commitReveal",
      params: { commitment: "0x123..." },
    },
    show: false,
  },
  {
    name: "hashPreimage",
    description: "Proves knowledge of a preimage for a given hash",
    parameters: ["expectedHash"],
    example: {
      templateName: "hashPreimage",
      params: { expectedHash: "0xabc..." },
    },
    show: false,
  },
  {
    name: "merkleTreeMembership",
    description: "Proves membership in a Merkle tree",
    parameters: ["treeDepth", "root"],
    example: {
      templateName: "merkleTreeMembership",
      params: { treeDepth: 8, root: "0x456..." },
    },
    show: false,
  },
  {
    name: "passwordChecker",
    description: "Verifies a password without revealing it",
    parameters: ["passwordHash"],
    example: {
      templateName: "passwordChecker",
      params: { passwordHash: "0x789..." },
    },
    show: true,
  },
  {
    name: "socialSecurityProof",
    description: "Proves ownership of a social security number",
    parameters: ["ssnHash"],
    example: {
      templateName: "socialSecurityProof",
      params: { ssnHash: "0xdef..." },
    },
    show: false,
  },
  {
    name: "sudokuVerifier",
    description: "Verifies a valid Sudoku solution",
    parameters: ["gridSize"],
    example: {
      templateName: "sudokuVerifier",
      params: { gridSize: 9 },
    },
    show: false,
  },
  {
    name: "votingBallot",
    description: "Enables private voting with verifiable results",
    parameters: ["candidateCount"],
    example: {
      templateName: "votingBallot",
      params: { candidateCount: 3 },
    },
    show: false,
  },
];

router.get("/", (req, res) => {
  const { show } = req.query;
  if (show) {
    const filteredTemplates = templates.filter((template) => template.show);
    res.json({
      templates: filteredTemplates,
      count: filteredTemplates.length,
    });
  } else {
    res.json({
      templates,
      count: templates.length,
      message: "Available ZK circuit templates",
    });
  }
});

module.exports = { templatesRouter: router };
