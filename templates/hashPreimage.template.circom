pragma circom 2.1.5;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/sha256/sha256.circom";

/*
 * @title HashPreimage
 * @dev Proves knowledge of preimage for a given hash without revealing the preimage
 * @param preimage - Private input: the secret preimage
 * @param hash - Public input: the target hash
 */
template HashPreimage() {
    signal input preimage;  // Private
    signal input hash;      // Public

    // Choose hash function based on template parameter
    {{#if useSHA256}}
    // SHA256 version (more expensive but standard)
    component hasher = Sha256(256);
    
    // Convert preimage to bits
    component preimageToBytes = Num2Bits(256);
    preimageToBytes.in <== preimage;
    
    for (var i = 0; i < 256; i++) {
        hasher.in[i] <== preimageToBytes.out[i];
    }
    
    // Convert hash output back to number
    component hashToNum = Bits2Num(256);
    for (var i = 0; i < 256; i++) {
        hashToNum.in[i] <== hasher.out[i];
    }
    
    hash === hashToNum.out;
    {{else}}
    // Poseidon version (more efficient in circuits)
    component hasher = Poseidon(1);
    hasher.inputs[0] <== preimage;
    
    hash === hasher.out;
    {{/if}}
}

component main { public [hash] } = HashPreimage();
