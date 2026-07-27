package com.puzzle.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Represents a dynamic sliding puzzle board (e.g. 3x3, 4x4, 5x5).
 * Tile values 1 to (size*size - 1) are numbered tiles; 0 is the empty space.
 */
public class PuzzleBoard implements Serializable {

    private int size;
    private int[][] board;
    private int emptyRow;
    private int emptyCol;
    private int moveCount;
    private boolean solved;

    public PuzzleBoard() {
        this(4); // Default to 4x4
    }

    public PuzzleBoard(int size) {
        this.size = size;
        this.board = new int[size][size];
        this.moveCount = 0;
        this.solved = false;
    }

    /**
     * Initializes the board in solved state.
     */
    public void initSolved() {
        int value = 1;
        for (int r = 0; r < size; r++) {
            for (int c = 0; c < size; c++) {
                if (r == size - 1 && c == size - 1) {
                    board[r][c] = 0;
                    emptyRow = r;
                    emptyCol = c;
                } else {
                    board[r][c] = value++;
                }
            }
        }
        moveCount = 0;
        solved = false;
    }

    /**
     * Shuffles the board into a random, solvable configuration.
     */
    public void shuffle() {
        List<Integer> tiles = new ArrayList<>();
        for (int i = 0; i < size * size; i++) {
            tiles.add(i);
        }

        do {
            Collections.shuffle(tiles);
        } while (!isSolvable(tiles) || isAlreadySolved(tiles));

        int index = 0;
        for (int r = 0; r < size; r++) {
            for (int c = 0; c < size; c++) {
                board[r][c] = tiles.get(index);
                if (board[r][c] == 0) {
                    emptyRow = r;
                    emptyCol = c;
                }
                index++;
            }
        }
        moveCount = 0;
        solved = false;
    }

    /**
     * Checks whether a flat list of tiles represents a solvable puzzle.
     * - Odd size: solvable if inversions is even.
     * - Even size: solvable if blank row from bottom and inversions have opposite parities.
     */
    private boolean isSolvable(List<Integer> tiles) {
        int inversions = 0;
        for (int i = 0; i < tiles.size(); i++) {
            for (int j = i + 1; j < tiles.size(); j++) {
                if (tiles.get(i) != 0 && tiles.get(j) != 0 && tiles.get(i) > tiles.get(j)) {
                    inversions++;
                }
            }
        }

        if (size % 2 != 0) {
            return inversions % 2 == 0;
        } else {
            int blankIndex = tiles.indexOf(0);
            int blankRowFromBottom = size - (blankIndex / size);

            if (blankRowFromBottom % 2 == 0) {
                return inversions % 2 != 0;
            } else {
                return inversions % 2 == 0;
            }
        }
    }

    /**
     * Checks if the tile list is already in solved order.
     */
    private boolean isAlreadySolved(List<Integer> tiles) {
        for (int i = 0; i < tiles.size() - 1; i++) {
            if (tiles.get(i) != i + 1) return false;
        }
        return tiles.get(tiles.size() - 1) == 0;
    }

    /**
     * Attempts to move a numbered tile into the empty space.
     * Returns true if the move was valid and executed.
     */
    public boolean move(int tileNumber) {
        if (solved || tileNumber < 1 || tileNumber > (size * size - 1)) return false;

        // Find the tile
        int tileRow = -1, tileCol = -1;
        for (int r = 0; r < size; r++) {
            for (int c = 0; c < size; c++) {
                if (board[r][c] == tileNumber) {
                    tileRow = r;
                    tileCol = c;
                    break;
                }
            }
            if (tileRow != -1) break;
        }

        // Check adjacency to empty space
        if (isAdjacent(tileRow, tileCol, emptyRow, emptyCol)) {
            // Swap tile with empty space
            board[emptyRow][emptyCol] = tileNumber;
            board[tileRow][tileCol] = 0;
            emptyRow = tileRow;
            emptyCol = tileCol;
            moveCount++;

            // Check if puzzle is now solved
            solved = checkSolved();
            return true;
        }

        return false;
    }

    private boolean isAdjacent(int r1, int c1, int r2, int c2) {
        return (Math.abs(r1 - r2) + Math.abs(c1 - c2)) == 1;
    }

    /**
     * Checks if the board is in the solved configuration.
     */
    private boolean checkSolved() {
        int expected = 1;
        for (int r = 0; r < size; r++) {
            for (int c = 0; c < size; c++) {
                if (r == size - 1 && c == size - 1) {
                    if (board[r][c] != 0) return false;
                } else {
                    if (board[r][c] != expected++) return false;
                }
            }
        }
        return true;
    }

    // Getters

    public int getSize() {
        return size;
    }

    public int[][] getBoard() {
        return board;
    }

    public int[][] getBoardCopy() {
        int[][] copy = new int[size][size];
        for (int r = 0; r < size; r++) {
            System.arraycopy(board[r], 0, copy[r], 0, size);
        }
        return copy;
    }

    public int getMoveCount() {
        return moveCount;
    }

    public boolean isSolved() {
        return solved;
    }

    public int getEmptyRow() {
        return emptyRow;
    }

    public int getEmptyCol() {
        return emptyCol;
    }

    /**
     * Returns the board as a flat list (row-major order) for JSON serialization.
     */
    public List<Integer> getFlatBoard() {
        List<Integer> flat = new ArrayList<>();
        for (int r = 0; r < size; r++) {
            for (int c = 0; c < size; c++) {
                flat.add(board[r][c]);
            }
        }
        return flat;
    }
}
