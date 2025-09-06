#!/bin/bash

# Exit on error
set -e

# Generate random entropy
ENTROPY=$(openssl rand -hex 32)
ENTROPY2=$(openssl rand -hex 32)
 
echo "Starting circuit setup process..."

cat <<EOT > input.json
{"in":"1200","randomPublicSignal":"12"}
EOT

# Calculate witness
echo "Calculating witness..."
snarkjs wtns calculate  circuit_js/circuit.wasm input.json witness.wtns

# Setup phase 1
echo "Setting up phase 1..."
snarkjs groth16 setup circuit.r1cs tau/pot14_final.ptau circuit_0000.zkey

# First contribution
echo "Making first contribution..."
snarkjs zkey contribute circuit_0000.zkey circuit_0001.zkey --name="1st Contributor Name" -v --entropy="$ENTROPY"

# Second contribution
echo "Making second contribution..."
snarkjs zkey contribute circuit_0001.zkey circuit_0002.zkey --name="Second contribution Name" -v --entropy="$ENTROPY2"

# Third contribution using Bellman
echo "Making third contribution using Bellman..."
snarkjs zkey export bellman circuit_0002.zkey challenge_phase2_0003
snarkjs zkey bellman contribute bn128 challenge_phase2_0003 response_phase2_0003 -e="some random text"
snarkjs zkey import bellman circuit_0002.zkey response_phase2_0003 circuit_0003.zkey -n="Third contribution name"

# Verify the circuit
echo "Verifying circuit..."
snarkjs zkey verify circuit.r1cs tau/pot14_final.ptau circuit_0003.zkey

# Final beacon phase
echo "Running final beacon phase..."
snarkjs zkey beacon circuit_0003.zkey circuit_final.zkey 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon phase2"

# Final verification
echo "Performing final verification..."
snarkjs zkey verify circuit.r1cs tau/pot14_final.ptau circuit_final.zkey

# Export verification key
echo "Exporting verification key..."
snarkjs zkey export verificationkey circuit_final.zkey verification_key.json

# # Generate proof
echo "Generating proof..."
snarkjs groth16 fullprove input.json circuit_js/circuit.wasm circuit_final.zkey proof.json public.json

# # Verify proof
echo "Verifying proof..."
snarkjs groth16 verify verification_key.json public.json proof.json

# Export Solidity verifier
echo "Exporting Solidity verifier..."
snarkjs zkey export solidityverifier circuit_final.zkey contract/verifier.sol

echo "Setup process completed successfully!" 