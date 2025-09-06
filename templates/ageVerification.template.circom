pragma circom 2.1.5;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/poseidon.circom";

/*
 * @title AgeVerification
 * @dev Proves that someone is over a certain age without revealing their exact age
 * @param birthYear - Private input: the person's birth year
 * @param currentYear - Public input: the current year
 * @param salt - Private input: random salt for privacy
 * @param commitment - Public input: hash commitment to prevent tampering
 */
template AgeVerification() {
    signal input birthYear;      // Private
    signal input currentYear;    // Public  
    signal input salt;           // Private
    signal input commitment;     // Public

    // Calculate age
    signal age;
    age <== currentYear - birthYear;

    // Check if age >= minimum age (configurable via template)
    component ageCheck = GreaterEqThan(8); // 8 bits = up to 255 years
    ageCheck.in[0] <== age;
    ageCheck.in[1] <== {{minAge}};
    ageCheck.out === 1;

    // Verify commitment to prevent tampering
    component hasher = Poseidon(2);
    hasher.inputs[0] <== birthYear;
    hasher.inputs[1] <== salt;
    
    commitment === hasher.out;
}

component main { public [currentYear, commitment] } = AgeVerification();
