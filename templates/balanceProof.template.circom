pragma circom 2.1.5;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/poseidon.circom";

/*
 * @title BalanceProof
 * @dev Proves that someone has at least a minimum balance without revealing exact amount
 * @param balance - Private input: actual balance
 * @param salt - Private input: random salt for privacy
 * @param minBalance - Public input: minimum required balance
 * @param commitment - Public input: commitment to the balance
 */
template BalanceProof() {
    signal input balance;        // Private
    signal input salt;          // Private
    signal input minBalance;    // Public
    signal input commitment;    // Public

    // Prove balance >= minBalance
    component balanceCheck = GreaterEqThan(64); // 64 bits for large balances
    balanceCheck.in[0] <== balance;
    balanceCheck.in[1] <== minBalance;
    balanceCheck.out === 1;

    // Verify commitment
    component hasher = Poseidon(2);
    hasher.inputs[0] <== balance;
    hasher.inputs[1] <== salt;
    
    commitment === hasher.out;

    // Optional: Prove balance is not too large (prevent overflow attacks)
    component maxCheck = LessEqThan(64);
    maxCheck.in[0] <== balance;
    maxCheck.in[1] <== {{maxBalance}};
    maxCheck.out === 1;
}

component main { public [minBalance, commitment] } = BalanceProof();
