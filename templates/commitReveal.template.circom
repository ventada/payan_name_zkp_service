pragma circom 2.1.5;

include "circomlib/circuits/poseidon.circom";

/*
 * @title CommitReveal
 * @dev Commit-reveal scheme for fair random number generation or auctions
 * @param secret - Private input: the secret value
 * @param nonce - Private input: random nonce for security
 * @param commitment - Public input: the commitment hash
 */
template CommitReveal() {
    signal input secret;      // Private
    signal input nonce;       // Private  
    signal input commitment;  // Public

    // Verify that commitment = hash(secret, nonce)
    component hasher = Poseidon(2);
    hasher.inputs[0] <== secret;
    hasher.inputs[1] <== nonce;
    
    commitment === hasher.out;

    // Optional: constrain secret to be in valid range
    component rangeCheck = LessEqThan({{secretBits}});
    rangeCheck.in[0] <== secret;
    rangeCheck.in[1] <== {{maxSecret}};
    rangeCheck.out === 1;

    // Output the revealed secret
    signal output revealedSecret;
    revealedSecret <== secret;
}

include "circomlib/circuits/comparators.circom";

component main { public [commitment] } = CommitReveal();
