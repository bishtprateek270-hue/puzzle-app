package com.puzzle.service;

import com.puzzle.model.PuzzleBoard;
import org.springframework.stereotype.Service;

/**
 * Service layer for puzzle game logic.
 */
@Service
public class PuzzleService {

    /**
     * Creates a new, shuffled puzzle board.
     */
    public PuzzleBoard createNewGame() {
        PuzzleBoard board = new PuzzleBoard();
        board.shuffle();
        return board;
    }

    /**
     * Attempts to move a tile on the given board.
     * Returns true if the move was successful.
     */
    public boolean moveTile(PuzzleBoard board, int tileNumber) {
        if (board == null) return false;
        return board.move(tileNumber);
    }

    /**
     * Checks if the puzzle is solved.
     */
    public boolean isSolved(PuzzleBoard board) {
        if (board == null) return false;
        return board.isSolved();
    }
}
