package com.puzzle.service;

import com.puzzle.model.PuzzleBoard;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;

/**
 * Service layer for puzzle game logic.
 */
@Service
public class PuzzleService {

    /**
     * Creates a new, shuffled puzzle board of default size (4x4).
     */
    public PuzzleBoard createNewGame() {
        return createNewGame(4);
    }

    /**
     * Creates a new, shuffled puzzle board of specified size.
     */
    public PuzzleBoard createNewGame(int size) {
        PuzzleBoard board = new PuzzleBoard(size);
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

    private List<String> cachedPythonPrefix = null;

    private synchronized List<String> getPythonPrefix() {
        if (cachedPythonPrefix != null) {
            return cachedPythonPrefix;
        }

        List<List<String>> candidates = new ArrayList<>();
        candidates.add(List.of("python"));
        candidates.add(List.of("python3"));
        candidates.add(List.of("python3.12"));
        candidates.add(List.of("python3.11"));
        candidates.add(List.of("py", "-3.12"));
        candidates.add(List.of("py", "-3.11"));
        candidates.add(List.of("py", "-3"));
        candidates.add(List.of("py"));

        for (List<String> candidate : candidates) {
            try {
                List<String> checkCmd = new ArrayList<>(candidate);
                checkCmd.add("--version");

                Process p = new ProcessBuilder(checkCmd).start();
                int exitCode = p.waitFor();
                if (exitCode == 0) {
                    cachedPythonPrefix = candidate;
                    return cachedPythonPrefix;
                }
            } catch (Exception e) {
                // Command failed to execute, try next
            }
        }

        cachedPythonPrefix = List.of("python"); // Fallback
        return cachedPythonPrefix;
    }

    /**
     * Calls the python solver script to solve the board configuration.
     * Returns a list of tile numbers to move in order.
     */
    public List<Integer> solvePuzzle(List<Integer> flatBoard) {
        List<Integer> moves = new ArrayList<>();
        try {
            List<String> command = new ArrayList<>(getPythonPrefix());
            command.add("solver.py");
            for (Integer val : flatBoard) {
                command.add(String.valueOf(val));
            }

            ProcessBuilder pb = new ProcessBuilder(command);
            pb.redirectErrorStream(true);
            Process process = pb.start();

            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    line = line.trim();
                    if (line.isEmpty()) continue;
                    String[] tokens = line.split("\\s+");
                    for (String token : tokens) {
                        try {
                            moves.add(Integer.parseInt(token));
                        } catch (NumberFormatException e) {
                            // Ignore any non-integer output line from Python script
                        }
                    }
                }
            }
            process.waitFor();
        } catch (Exception e) {
            e.printStackTrace();
        }
        return moves;
    }
}

