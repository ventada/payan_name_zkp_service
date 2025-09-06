pragma circom 2.1.5;

// We use the Poseidon hash function from circomlib because it's efficient inside a circuit.
include "circomlib/circuits/poseidon.circom";

 
template PasswordChecker() {
     
    signal input password;
 // Public input: a dummy random number (does nothing)
    signal input randomPublicSignal;
   
    signal correctPasswordHash;
    correctPasswordHash <== {{passwordHash}};  

   
    component hasher = Poseidon(1);
    hasher.inputs[0] <== password;

   
    // The circuit's only constraint is that the hash of the user's private password
    // must be equal to the hardcoded `correctPasswordHash`.
    // If they don't match, proof generation will fail.
    correctPasswordHash === hasher.out;
}

// Instantiate the main component for the circuit.
// Since the hash is hardcoded, there are no public inputs.
component main { public [randomPublicSignal] } = PasswordChecker();
