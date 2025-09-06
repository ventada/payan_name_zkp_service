pragma circom 2.1.3;
include "circomlib/circuits/comparators.circom";

template RangeCheck() {
    signal input in;
    signal input randomPublicSignal;

    component gte = GreaterEqThan(32);
    gte.in[0] <== in;
    gte.in[1] <== {{min}};
    gte.out === 1;

    component lte = LessEqThan(32);
    lte.in[0] <== in;
    lte.in[1] <== {{max}};
    lte.out === 1;
}

component main { public [randomPublicSignal] } = RangeCheck();


