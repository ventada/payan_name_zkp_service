pragma circom 2.1.5;

/*
 * @title SudokuVerifier
 * @dev Proves knowledge of a valid Sudoku solution without revealing it
 * @param solution - Private input: 9x9 Sudoku solution
 * @param puzzle - Public input: 9x9 Sudoku puzzle (0 for empty cells)
 */
template SudokuVerifier() {
    signal input solution[9][9];  // Private
    signal input puzzle[9][9];    // Public

    // Verify each cell contains a digit 1-9
    component digitChecks[9][9];
    for (var i = 0; i < 9; i++) {
        for (var j = 0; j < 9; j++) {
            digitChecks[i][j] = DigitCheck();
            digitChecks[i][j].digit <== solution[i][j];
        }
    }

    // Verify solution matches puzzle for non-zero cells
    for (var i = 0; i < 9; i++) {
        for (var j = 0; j < 9; j++) {
            // If puzzle[i][j] != 0, then solution[i][j] must equal puzzle[i][j]
            component isZero = IsZero();
            isZero.in <== puzzle[i][j];
            
            component enforcer = ForceEqualIfEnabled();
            enforcer.enabled <== 1 - isZero.out;
            enforcer.in[0] <== solution[i][j];
            enforcer.in[1] <== puzzle[i][j];
        }
    }

    // Verify rows contain all digits 1-9
    component rowChecks[9];
    for (var i = 0; i < 9; i++) {
        rowChecks[i] = AllDifferent();
        for (var j = 0; j < 9; j++) {
            rowChecks[i].in[j] <== solution[i][j];
        }
    }

    // Verify columns contain all digits 1-9
    component colChecks[9];
    for (var j = 0; j < 9; j++) {
        colChecks[j] = AllDifferent();
        for (var i = 0; i < 9; i++) {
            colChecks[j].in[i] <== solution[i][j];
        }
    }

    // Verify 3x3 boxes contain all digits 1-9
    component boxChecks[9];
    for (var box = 0; box < 9; box++) {
        boxChecks[box] = AllDifferent();
        var boxRow = box \ 3;
        var boxCol = box % 3;
        for (var i = 0; i < 9; i++) {
            var row = boxRow * 3 + i \ 3;
            var col = boxCol * 3 + i % 3;
            boxChecks[box].in[i] <== solution[row][col];
        }
    }
}

// Helper templates
template DigitCheck() {
    signal input digit;
    
    component gte = GreaterEqThan(4);
    gte.in[0] <== digit;
    gte.in[1] <== 1;
    gte.out === 1;
    
    component lte = LessEqThan(4);
    lte.in[0] <== digit;
    lte.in[1] <== 9;
    lte.out === 1;
}

template AllDifferent() {
    signal input in[9];
    
    // Check all pairs are different
    component eq[36];
    var idx = 0;
    for (var i = 0; i < 8; i++) {
        for (var j = i + 1; j < 9; j++) {
            eq[idx] = IsEqual();
            eq[idx].in[0] <== in[i];
            eq[idx].in[1] <== in[j];
            eq[idx].out === 0; // Must be different
            idx++;
        }
    }
}

template ForceEqualIfEnabled() {
    signal input enabled;
    signal input in[2];
    
    component isEqual = IsEqual();
    isEqual.in[0] <== in[0];
    isEqual.in[1] <== in[1];
    
    enabled * (1 - isEqual.out) === 0;
}

include "circomlib/circuits/comparators.circom";

component main { public [puzzle] } = SudokuVerifier();
