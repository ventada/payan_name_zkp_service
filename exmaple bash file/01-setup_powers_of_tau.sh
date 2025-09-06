#!/bin/bash

# Exit on error
set -e

echo "Starting Powers of Tau ceremony setup..."

# Generate random entropy
ENTROPY=$(openssl rand -hex 32)

# Phase 1: Initialize the ceremony
echo "Phase 1: Initializing ceremony..."
snarkjs powersoftau new bn128 14 pot14_0000.ptau -v

# Phase 2: First contribution
echo "Phase 2: First contribution..."
snarkjs powersoftau contribute pot14_0000.ptau pot14_0001.ptau --name="First contribution" -v --entropy="$ENTROPY"

# Phase 3: Second contribution
echo "Phase 3: Second contribution..."
snarkjs powersoftau contribute pot14_0001.ptau pot14_0002.ptau --name="Second contribution" -v -e="$ENTROPY"

# Phase 4: Challenge and response
echo "Phase 4: Challenge and response..."
snarkjs powersoftau export challenge pot14_0002.ptau challenge_0003
snarkjs powersoftau challenge contribute bn128 challenge_0003 response_0003 -e="$ENTROPY"
snarkjs powersoftau import response pot14_0002.ptau response_0003 pot14_0003.ptau -n="Third contribution name"

# Phase 5: Verification
echo "Phase 5: Verifying contributions..."
snarkjs powersoftau verify pot14_0003.ptau

# Phase 6: Beacon
echo "Phase 6: Creating beacon..."
snarkjs powersoftau beacon pot14_0003.ptau pot14_beacon.ptau 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon"

# Phase 7: Prepare phase 2
echo "Phase 7: Preparing phase 2..."
snarkjs powersoftau prepare phase2 pot14_beacon.ptau pot14_final.ptau -v

# Phase 8: Final verification
echo "Phase 8: Final verification..."
snarkjs powersoftau verify pot14_final.ptau

echo "Powers of Tau ceremony setup completed successfully!" 