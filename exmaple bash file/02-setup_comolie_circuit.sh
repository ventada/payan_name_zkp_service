#!/bin/bash

# Exit on error
set -e

# Generate random entropy
ENTROPY=$(openssl rand -hex 32)
ENTROPY2=$(openssl rand -hex 32)

echo "Starting circuit setup process..."

# Compile the circuit
echo "Compiling circuit..."
circom --r1cs --wasm --c --sym --inspect circuits/circuit.circom

# Get circuit info
echo "Getting circuit info..."
snarkjs r1cs info circuit.r1cs

# Export R1CS to JSON
echo "Exporting R1CS to JSON..."
snarkjs r1cs export json circuit.r1cs circuit.r1cs.json
cat circuit.r1cs.json