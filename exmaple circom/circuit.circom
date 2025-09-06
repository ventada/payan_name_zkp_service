// Specify the circom compiler version
pragma circom 2.1.3;

// Import the comparators from the circomlib library
include "../node_modules/circomlib/circuits/comparators.circom";

/*
 * @title RangeCheck
 * @dev This template verifies that a private input signal 'in' is within a specific range.
 * It also includes an unused public signal.
 * @param in - The private input signal to be checked.
 * @param randomPublicSignal - A public signal that is not used in any constraints.
 * @constraint in >= 1000
 * @constraint in <= 1500
 */
template RangeCheck() {
    // A private input signal that the prover wants to prove is within the range.
    signal input in;
    // A public input signal that is not used in the circuit's logic.
    // This demonstrates that you can have public signals for various purposes.
    signal input randomPublicSignal;

    // --- Constraints to check if 'in' is within the range [1000, 1500] ---

    // 1. Check if 'in' is greater than or equal to 1000.
    
    // The GreaterEqThan component requires specifying the number of bits for the inputs.
    // Our largest value is 1500. To represent 1500 in binary, we need 11 bits 
    // (since 2^10 = 1024 and 2^11 = 2048).
    component gte = GreaterEqThan(11);

    // Set the inputs for the comparator.
    gte.in[0] <== in;
    gte.in[1] <== 1000;

    // The component's output will be 1 if in >= 1000, and 0 otherwise.
    // We add a constraint to enforce that the output must be 1.
    // If it's not, the proof generation will fail.
    gte.out === 1;


    // 2. Check if 'in' is less than or equal to 1500.

    // We use the same bit-width (11) for consistency.
    component lte = LessEqThan(11);

    // Set the inputs for the comparator.
    lte.in[0] <== in;
    lte.in[1] <== 1500;

    // Similarly, we constrain the output to be 1, ensuring that in <= 1500.
    lte.out === 1;
}

// Instantiate the main component for the circuit.
// To declare a signal as public for the whole circuit, you must list it here.
component main { public [randomPublicSignal] } = RangeCheck();
