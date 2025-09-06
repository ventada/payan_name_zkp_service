pragma circom 2.1.5;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";

/*
 * @title SocialSecurityProof
 * @dev Proves valid Social Security Number format without revealing the actual number
 * @param ssn - Private input: 9-digit SSN
 * @param salt - Private input: random salt for privacy
 * @param commitment - Public input: commitment to the SSN
 */
template SocialSecurityProof() {
    signal input ssn;         // Private
    signal input salt;        // Private
    signal input commitment;  // Public

    // Verify SSN is 9 digits (100000000 <= ssn <= 999999999)
    component minCheck = GreaterEqThan(32);
    minCheck.in[0] <== ssn;
    minCheck.in[1] <== 100000000;
    minCheck.out === 1;

    component maxCheck = LessEqThan(32);
    maxCheck.in[0] <== ssn;
    maxCheck.in[1] <== 999999999;
    maxCheck.out === 1;

    // Extract area, group, and serial numbers
    signal area;
    signal group;
    signal serial;
    
    area <== ssn \ 1000000;
    group <== (ssn \ 10000) % 100;
    serial <== ssn % 10000;

    // Verify area code is valid (001-899, excluding 666)
    component areaMin = GreaterEqThan(10);
    areaMin.in[0] <== area;
    areaMin.in[1] <== 1;
    areaMin.out === 1;

    component areaMax = LessEqThan(10);
    areaMax.in[0] <== area;
    areaMax.in[1] <== 899;
    areaMax.out === 1;

    // Ensure area is not 666
    component not666 = IsEqual();
    not666.in[0] <== area;
    not666.in[1] <== 666;
    not666.out === 0;

    // Verify group code is valid (01-99)
    component groupMin = GreaterEqThan(8);
    groupMin.in[0] <== group;
    groupMin.in[1] <== 1;
    groupMin.out === 1;

    component groupMax = LessEqThan(8);
    groupMax.in[0] <== group;
    groupMax.in[1] <== 99;
    groupMax.out === 1;

    // Verify serial number is valid (0001-9999)
    component serialMin = GreaterEqThan(14);
    serialMin.in[0] <== serial;
    serialMin.in[1] <== 1;
    serialMin.out === 1;

    component serialMax = LessEqThan(14);
    serialMax.in[0] <== serial;
    serialMax.in[1] <== 9999;
    serialMax.out === 1;

    // Verify commitment
    component hasher = Poseidon(2);
    hasher.inputs[0] <== ssn;
    hasher.inputs[1] <== salt;
    
    commitment === hasher.out;
}

component main { public [commitment] } = SocialSecurityProof();
