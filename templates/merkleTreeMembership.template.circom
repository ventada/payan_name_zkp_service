pragma circom 2.1.5;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/switcher.circom";

/*
 * @title MerkleTreeMembership
 * @dev Proves membership in a Merkle tree without revealing which leaf
 * @param leaf - Private input: the leaf value
 * @param pathElements - Private input: sibling hashes along the path
 * @param pathIndices - Private input: direction bits (0 = left, 1 = right)
 * @param root - Public input: the Merkle tree root
 */
template MerkleTreeMembership(levels) {
    signal input leaf;
    signal input pathElements[levels];
    signal input pathIndices[levels];
    signal input root;

    component hashers[levels];
    component switchers[levels];

    signal hashes[levels + 1];
    hashes[0] <== leaf;

    for (var i = 0; i < levels; i++) {
        switchers[i] = Switcher();
        switchers[i].sel <== pathIndices[i];
        switchers[i].L <== hashes[i];
        switchers[i].R <== pathElements[i];

        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== switchers[i].outL;
        hashers[i].inputs[1] <== switchers[i].outR;

        hashes[i + 1] <== hashers[i].out;
    }

    root === hashes[levels];
}

component main { public [root] } = MerkleTreeMembership({{levels}});
