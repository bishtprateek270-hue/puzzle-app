package com.puzzle.controller;

import com.puzzle.model.PuzzleBoard;
import com.puzzle.service.PuzzleService;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Controller handling both the page view and REST API for puzzle interactions.
 */
@Controller
public class PuzzleController {

    private static final String SESSION_BOARD = "puzzleBoard";
    private static final String SESSION_BEST_MOVES = "bestMoves";

    private final PuzzleService puzzleService;

    public PuzzleController(PuzzleService puzzleService) {
        this.puzzleService = puzzleService;
    }

    /**
     * Serves the main puzzle page.
     */
    @GetMapping("/")
    public String index(HttpSession session) {
        // Create a new game if none exists in session
        if (session.getAttribute(SESSION_BOARD) == null) {
            PuzzleBoard board = puzzleService.createNewGame();
            session.setAttribute(SESSION_BOARD, board);
        }
        return "index";
    }

    /**
     * Creates a new game and returns the fresh board state.
     */
    @PostMapping("/api/new-game")
    @ResponseBody
    public Map<String, Object> newGame(@RequestParam(value = "size", defaultValue = "4") int size, HttpSession session) {
        PuzzleBoard board = puzzleService.createNewGame(size);
        session.setAttribute(SESSION_BOARD, board);
        return buildResponse(board, session);
    }

    /**
     * Attempts to move a tile and returns the updated board state.
     */
    @PostMapping("/api/move/{tile}")
    @ResponseBody
    public Map<String, Object> moveTile(@PathVariable("tile") int tile, HttpSession session) {
        PuzzleBoard board = (PuzzleBoard) session.getAttribute(SESSION_BOARD);

        if (board == null) {
            board = puzzleService.createNewGame();
            session.setAttribute(SESSION_BOARD, board);
        }

        boolean moved = puzzleService.moveTile(board, tile);

        Map<String, Object> response = buildResponse(board, session);
        response.put("moved", moved);

        // Update best score on win
        if (board.isSolved()) {
            String bestKey = SESSION_BEST_MOVES + "_" + board.getSize();
            Integer bestMoves = (Integer) session.getAttribute(bestKey);
            if (bestMoves == null || board.getMoveCount() < bestMoves) {
                session.setAttribute(bestKey, board.getMoveCount());
                response.put("newBest", true);
            }
        }

        return response;
    }

    /**
     * Returns the current board state without making any changes.
     */
    @GetMapping("/api/state")
    @ResponseBody
    public Map<String, Object> getState(HttpSession session) {
        PuzzleBoard board = (PuzzleBoard) session.getAttribute(SESSION_BOARD);

        if (board == null) {
            board = puzzleService.createNewGame();
            session.setAttribute(SESSION_BOARD, board);
        }

        return buildResponse(board, session);
    }

    /**
     * Solves the current puzzle board and returns the sequence of moves.
     */
    @PostMapping("/api/solve")
    @ResponseBody
    public Map<String, Object> solve(HttpSession session) {
        PuzzleBoard board = (PuzzleBoard) session.getAttribute(SESSION_BOARD);
        Map<String, Object> response = new HashMap<>();

        if (board == null || board.isSolved()) {
            response.put("moves", new ArrayList<>());
            return response;
        }

        List<Integer> moves = puzzleService.solvePuzzle(board.getFlatBoard());
        response.put("moves", moves);
        return response;
    }

    /**
     * Builds a JSON-friendly response map from the board state.
     */
    private Map<String, Object> buildResponse(PuzzleBoard board, HttpSession session) {
        Map<String, Object> response = new HashMap<>();
        response.put("board", board.getFlatBoard());
        response.put("moves", board.getMoveCount());
        response.put("solved", board.isSolved());
        response.put("emptyRow", board.getEmptyRow());
        response.put("emptyCol", board.getEmptyCol());
        response.put("size", board.getSize());

        String bestKey = SESSION_BEST_MOVES + "_" + board.getSize();
        Integer bestMoves = (Integer) session.getAttribute(bestKey);
        response.put("bestMoves", bestMoves != null ? bestMoves : -1);

        return response;
    }
}
