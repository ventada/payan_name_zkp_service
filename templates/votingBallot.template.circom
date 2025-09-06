pragma circom 2.1.5;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/poseidon.circom";

/*
 * @title VotingBallot
 * @dev Anonymous voting system - proves valid vote without revealing voter identity
 * @param voterSecret - Private input: voter's secret key
 * @param vote - Private input: the vote (0 or 1, or candidate number)
 * @param nullifier - Private input: prevents double voting
 * @param voterCommitment - Public input: commitment to voter eligibility
 */
template VotingBallot() {
    signal input voterSecret;      // Private
    signal input vote;             // Private
    signal input nullifier;       // Private
    signal input voterCommitment; // Public

    // Ensure vote is valid (within allowed range)
    component voteRangeCheck = LessEqThan(8);
    voteRangeCheck.in[0] <== vote;
    voteRangeCheck.in[1] <== {{maxCandidates}} - 1; // 0-indexed candidates
    voteRangeCheck.out === 1;

    // Generate nullifier hash to prevent double voting
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== voterSecret;
    nullifierHasher.inputs[1] <== nullifier;
    
    signal nullifierHash;
    nullifierHash <== nullifierHasher.out;

    // Verify voter eligibility
    component voterHasher = Poseidon(1);
    voterHasher.inputs[0] <== voterSecret;
    
    voterCommitment === voterHasher.out;

    // Output the vote and nullifier hash
    signal output voteOutput;
    signal output nullifierOutput;
    
    voteOutput <== vote;
    nullifierOutput <== nullifierHash;
}

component main { public [voterCommitment] } = VotingBallot();
