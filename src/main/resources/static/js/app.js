/* ============================================
   15-Puzzle — Game Logic & UI Controller
   ============================================ */

(function () {
    'use strict';

    // --- DOM Elements ---
    const boardEl = document.getElementById('puzzle-board');
    const moveCountEl = document.getElementById('move-count');
    const timerEl = document.getElementById('timer');
    const bestScoreEl = document.getElementById('best-score');
    const newGameBtn = document.getElementById('new-game-btn');
    const winModal = document.getElementById('win-modal');
    const winMovesEl = document.getElementById('win-moves');
    const winTimeEl = document.getElementById('win-time');
    const newBestBadge = document.getElementById('new-best-badge');
    const playAgainBtn = document.getElementById('play-again-btn');
    const confettiContainer = document.getElementById('confetti-container');
    const hintBtn = document.getElementById('hint-btn');
    const autoSolveBtn = document.getElementById('auto-solve-btn');
    const levelBtns = document.querySelectorAll('.level-btn');

    // --- Game State ---
    let board = [];          // flat array of ints (0 = empty)
    let moveCount = 0;
    let bestMoves = -1;
    let solved = false;
    let timerSeconds = 0;
    let timerInterval = null;
    let timerStarted = false;
    let isAnimating = false;
    let isInitialLoad = true;
    let isAutoSolving = false;
    let currentSize = 4;     // Default board size (4x4)
    let pendingMovesQueue = [];
    let isProcessingQueue = false;
    let winModalShown = false;

    // --- Touch handling ---
    let touchStartX = 0;
    let touchStartY = 0;

    // --- Initialize ---
    init();

    async function init() {
        newGameBtn.addEventListener('click', startNewGame);
        playAgainBtn.addEventListener('click', () => {
            hideWinModal();
            startNewGame();
        });

        hintBtn.addEventListener('click', getHint);
        autoSolveBtn.addEventListener('click', startAutoSolve);

        levelBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const size = parseInt(btn.getAttribute('data-size'));
                changeLevel(size);
            });
        });

        // Keyboard controls
        window.addEventListener('keydown', handleKeyDown);

        // Touch swipe controls
        boardEl.addEventListener('touchstart', handleTouchStart, { passive: false });
        boardEl.addEventListener('touchmove', handleTouchMove, { passive: false });
        boardEl.addEventListener('touchend', handleTouchEnd, { passive: true });

        // Load initial state from server
        await fetchState();
        renderBoard(true);
        isInitialLoad = false;
    }

    // --- Keyboard Navigation ---
    function handleKeyDown(e) {
        if (solved || isAnimating || isAutoSolving) return;

        const size = Math.sqrt(board.length);
        const emptyIndex = board.indexOf(0);
        const emptyRow = Math.floor(emptyIndex / size);
        const emptyCol = emptyIndex % size;

        let targetRow = emptyRow;
        let targetCol = emptyCol;

        // Arrow key / WASD pressed -> move tile into empty space
        switch (e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                targetRow = emptyRow + 1; // Move tile below empty slot up
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                targetRow = emptyRow - 1; // Move tile above empty slot down
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                targetCol = emptyCol + 1; // Move tile to right of empty slot left
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                targetCol = emptyCol - 1; // Move tile to left of empty slot right
                break;
            default:
                return;
        }

        if (targetRow >= 0 && targetRow < size && targetCol >= 0 && targetCol < size) {
            e.preventDefault();
            const targetIndex = targetRow * size + targetCol;
            const tileVal = board[targetIndex];
            if (tileVal !== 0) {
                moveTile(tileVal);
            }
        }
    }

    // --- Touch Swiping ---
    function handleTouchStart(e) {
        if (solved || isAnimating || isAutoSolving) return;
        if (e.touches.length === 1) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchActive = true;
        }
    }

    function handleTouchMove(e) {
        if (!touchActive || solved || isAnimating || isAutoSolving || !e.touches.length) return;

        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;

        const deltaX = currentX - touchStartX;
        const deltaY = currentY - touchStartY;
        const swipeThreshold = 30; // pixels

        if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < swipeThreshold) return;

        // Prevent scrolling while swiping
        if (e.cancelable) {
            e.preventDefault();
        }
        touchActive = false; // Prevent multiple swipes in one motion

        const size = Math.sqrt(board.length);
        const emptyIndex = board.indexOf(0);
        const emptyRow = Math.floor(emptyIndex / size);
        const emptyCol = emptyIndex % size;

        let targetRow = emptyRow;
        let targetCol = emptyCol;

        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Horizontal swipe
            if (deltaX > 0) {
                targetCol = emptyCol - 1; // Swipe Right -> slide left tile to right
            } else {
                targetCol = emptyCol + 1; // Swipe Left -> slide right tile to left
            }
        } else {
            // Vertical swipe
            if (deltaY > 0) {
                targetRow = emptyRow - 1; // Swipe Down -> slide top tile down
            } else {
                targetRow = emptyRow + 1; // Swipe Up -> slide bottom tile up
            }
        }

        if (targetRow >= 0 && targetRow < size && targetCol >= 0 && targetCol < size) {
            const targetIndex = targetRow * size + targetCol;
            const tileVal = board[targetIndex];
            if (tileVal !== 0) {
                moveTile(tileVal);
            }
        }
    }

    function handleTouchEnd(e) {
        touchActive = false;
    }

    // --- API & State Synchronization ---

    async function fetchState() {
        try {
            const res = await fetch('/api/state');
            const data = await res.json();
            applyState(data);
        } catch (err) {
            console.error('Failed to fetch state:', err);
        }
    }

    async function startNewGame() {
        stopTimer();
        resetTimer();
        timerStarted = false;
        isAutoSolving = false;
        updateButtonsState();
        clearHints();

        try {
            const res = await fetch(`/api/new-game?size=${currentSize}`, { method: 'POST' });
            const data = await res.json();
            applyState(data);
            renderBoard(true);
        } catch (err) {
            console.error('Failed to start new game:', err);
        }
    }

    function moveTile(tileNumber, isFromAutoSolve = false) {
        if (solved) return Promise.resolve();
        if (isAutoSolving && !isFromAutoSolve) return Promise.resolve();
        if (isAnimating && !isFromAutoSolve) return Promise.resolve();

        clearHints();

        // Start timer on first move
        if (!timerStarted) {
            timerStarted = true;
            startTimer();
        }

        // Validate move locally
        const size = Math.sqrt(board.length);
        const tileIndex = board.indexOf(tileNumber);
        const emptyIndex = board.indexOf(0);

        if (tileIndex === -1 || emptyIndex === -1) {
            return Promise.resolve();
        }

        const tRow = Math.floor(tileIndex / size);
        const tCol = tileIndex % size;
        const eRow = Math.floor(emptyIndex / size);
        const eCol = emptyIndex % size;

        const isDirectAdjacent = (Math.abs(tRow - eRow) + Math.abs(tCol - eCol)) === 1;
        if (!isDirectAdjacent) {
            return Promise.resolve();
        }

        isAnimating = true;

        // Perform optimistic move immediately
        swapTilesInDOM(tileIndex, emptyIndex);

        // Update local board array
        board[emptyIndex] = tileNumber;
        board[tileIndex] = 0;

        // Update moves count locally
        moveCount++;
        moveCountEl.textContent = moveCount;

        // Update classes
        updateMovableClasses();

        // Check solve status locally
        if (checkSolvedLocally()) {
            solved = true;
            stopTimer();
            showWinModal(false);
        }

        // Queue the server sync request
        pendingMovesQueue.push(tileNumber);
        processPendingMovesQueue();

        return new Promise(resolve => {
            setTimeout(() => {
                isAnimating = false;
                resolve();
            }, 120);
        });
    }

    function swapTilesInDOM(fromIndex, toIndex) {
        const tiles = Array.from(boardEl.children);
        const fromTile = tiles[fromIndex];
        const toTile = tiles[toIndex];

        if (!fromTile || !toTile) return;

        // Get bounding boxes before DOM manipulation
        const fromRect = fromTile.getBoundingClientRect();

        // Swap the nodes in the DOM
        const parent = fromTile.parentNode;
        const fromSibling = fromTile.nextSibling === toTile ? fromTile : fromTile.nextSibling;
        if (fromTile.nextSibling === toTile) {
            parent.insertBefore(toTile, fromTile);
        } else if (toTile.nextSibling === fromTile) {
            parent.insertBefore(fromTile, toTile);
        } else {
            const toSibling = toTile.nextSibling;
            parent.insertBefore(toTile, fromSibling);
            parent.insertBefore(fromTile, toSibling);
        }

        // Get bounding box after DOM swap
        const newFromRect = fromTile.getBoundingClientRect();

        // Invert: calculate the offset
        const deltaX = fromRect.left - newFromRect.left;
        const deltaY = fromRect.top - newFromRect.top;

        // Apply visual transformation immediately with no transition
        fromTile.style.transition = 'none';
        fromTile.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        fromTile.style.zIndex = '10';

        // Force a layout reflow
        fromTile.offsetHeight;

        // Trigger smooth transition back to the natural position
        fromTile.style.transition = 'transform 120ms cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        fromTile.style.transform = 'translate(0, 0)';

        // Clean up transition styles and zIndex after the transition completes
        setTimeout(() => {
            fromTile.style.transition = '';
            fromTile.style.transform = '';
            fromTile.style.zIndex = '';
        }, 120);
    }

    function updateMovableClasses() {
        const tiles = boardEl.querySelectorAll('.tile');
        const size = Math.sqrt(board.length);
        const emptyIndex = board.indexOf(0);
        const emptyRow = Math.floor(emptyIndex / size);
        const emptyCol = emptyIndex % size;

        tiles.forEach((tile, index) => {
            if (board[index] === 0) {
                tile.className = 'tile empty';
            } else {
                tile.className = 'tile';
                const row = Math.floor(index / size);
                const col = index % size;
                const isAdj = isAdjacent(row, col, emptyRow, emptyCol);
                if (isAdj && !solved) {
                    tile.classList.add('movable');
                }
                if (solved) {
                    tile.classList.add('solved-tile');
                }
            }
        });
    }

    function checkSolvedLocally() {
        for (let i = 0; i < board.length - 1; i++) {
            if (board[i] !== i + 1) return false;
        }
        return board[board.length - 1] === 0;
    }

    async function processPendingMovesQueue() {
        if (isProcessingQueue) return;
        isProcessingQueue = true;

        const arraysEqual = (a, b) => a.length === b.length && a.every((val, i) => val === b[i]);

        while (pendingMovesQueue.length > 0) {
            const tileVal = pendingMovesQueue[0];
            try {
                const res = await fetch(`/api/move/${tileVal}`, { method: 'POST' });
                const data = await res.json();

                if (pendingMovesQueue.length === 1) {
                    // Sync backend state on the final sync response
                    applyState(data);
                    if (!arraysEqual(board, data.board)) {
                        console.warn("Client/Server board state desync detected! Forcing re-render.");
                        board = data.board;
                        renderBoard(false);
                    }
                    if (data.solved) {
                        stopTimer();
                        showWinModal(data.newBest === true);
                    }
                } else {
                    // Just update the record high score / best score if it changed
                    if (data.bestMoves !== undefined) {
                        bestMoves = data.bestMoves;
                        bestScoreEl.textContent = bestMoves > 0 ? bestMoves : '—';
                    }
                }
            } catch (err) {
                console.error('Failed to sync move with server:', err);
            }
            pendingMovesQueue.shift();
        }

        isProcessingQueue = false;
    }

    function applyState(data) {
        board = data.board;
        moveCount = data.moves;
        solved = data.solved;
        bestMoves = data.bestMoves;
        currentSize = data.size || Math.sqrt(board.length);

        moveCountEl.textContent = moveCount;
        bestScoreEl.textContent = bestMoves > 0 ? bestMoves : '—';

        // Update active class on difficulty selectors in case of external/initial load
        levelBtns.forEach(btn => {
            if (parseInt(btn.getAttribute('data-size')) === currentSize) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Set class on board for dynamic styling
        boardEl.className = 'puzzle-board grid-' + currentSize;
    }

    // --- Rendering ---

    function renderBoard(animateEntrance = false) {
        boardEl.innerHTML = '';

        const size = Math.sqrt(board.length);
        const emptyIndex = board.indexOf(0);
        const emptyRow = Math.floor(emptyIndex / size);
        const emptyCol = emptyIndex % size;

        board.forEach((value, index) => {
            const tile = document.createElement('div');
            tile.classList.add('tile');

            if (value === 0) {
                tile.classList.add('empty');
            } else {
                tile.textContent = value;

                // Check if this tile is adjacent to empty
                const row = Math.floor(index / size);
                const col = index % size;
                const isAdj = isAdjacent(row, col, emptyRow, emptyCol);

                if (isAdj && !solved) {
                    tile.classList.add('movable');
                }

                if (solved) {
                    tile.classList.add('solved-tile');
                    tile.style.animationDelay = `${index * 0.05}s`;
                }

                tile.addEventListener('click', () => moveTile(value));
            }

            // Only animate entrance on initial load or new game
            if (animateEntrance) {
                tile.style.opacity = '0';
                tile.style.transform = 'scale(0.85)';
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        tile.style.transition = 'opacity 200ms ease, transform 200ms ease';
                        tile.style.opacity = '1';
                        tile.style.transform = '';
                    }, index * 15);
                });
            }

            boardEl.appendChild(tile);
        });
    }

    function isAdjacent(r1, c1, r2, c2) {
        return (Math.abs(r1 - r2) + Math.abs(c1 - c2)) === 1;
    }

    // --- Timer ---

    function startTimer() {
        if (timerInterval) return;
        timerInterval = setInterval(() => {
            timerSeconds++;
            timerEl.textContent = formatTime(timerSeconds);
        }, 1000);
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    function resetTimer() {
        timerSeconds = 0;
        timerEl.textContent = '00:00';
    }

    function formatTime(totalSeconds) {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    // --- Win Modal ---

    function showWinModal(isNewBest) {
        winMovesEl.textContent = moveCount;
        winTimeEl.textContent = formatTime(timerSeconds);

        if (isNewBest) {
            newBestBadge.style.display = 'inline-block';
        } else {
            newBestBadge.style.display = 'none';
        }

        if (!winModalShown) {
            winModalShown = true;
            setTimeout(() => {
                winModal.classList.add('active');
                spawnConfetti();
            }, 200);
        }
    }

    function hideWinModal() {
        winModal.classList.remove('active');
        confettiContainer.innerHTML = '';
        winModalShown = false;
    }

    // --- Confetti ---

    function spawnConfetti() {
        const colors = [
            '#6c5ce7', '#a855f7', '#3b82f6', '#f59e0b',
            '#22c55e', '#ef4444', '#ec4899', '#06b6d4'
        ];
        const shapes = ['circle', 'square', 'triangle'];

        for (let i = 0; i < 60; i++) {
            const piece = document.createElement('div');
            piece.classList.add('confetti-piece');

            const color = colors[Math.floor(Math.random() * colors.length)];
            const shape = shapes[Math.floor(Math.random() * shapes.length)];
            const size = Math.random() * 8 + 6;
            const left = Math.random() * 100;
            const delay = Math.random() * 1.2;
            const duration = Math.random() * 1.5 + 1.5;

            piece.style.left = `${left}%`;
            piece.style.width = `${size}px`;
            piece.style.height = `${size}px`;
            piece.style.backgroundColor = color;
            piece.style.animationDelay = `${delay}s`;
            piece.style.animationDuration = `${duration}s`;

            if (shape === 'circle') {
                piece.style.borderRadius = '50%';
            } else if (shape === 'triangle') {
                piece.style.width = '0';
                piece.style.height = '0';
                piece.style.backgroundColor = 'transparent';
                piece.style.borderLeft = `${size / 2}px solid transparent`;
                piece.style.borderRight = `${size / 2}px solid transparent`;
                piece.style.borderBottom = `${size}px solid ${color}`;
            } else {
                piece.style.borderRadius = '2px';
            }

            confettiContainer.appendChild(piece);
        }

        setTimeout(() => {
            confettiContainer.innerHTML = '';
        }, 4000);
    }

    // --- AI / Solver Integration ---

    async function getHint() {
        if (solved || isAnimating || isAutoSolving) return;
        
        clearHints();
        
        hintBtn.disabled = true;
        hintBtn.innerHTML = `<span class="btn-icon">⏳</span>Loading...`;
        
        try {
            const res = await fetch('/api/solve', { method: 'POST' });
            const data = await res.json();
            
            if (data.moves && data.moves.length > 0) {
                const nextTileVal = data.moves[0];
                highlightHintTile(nextTileVal);
            }
        } catch (err) {
            console.error('Failed to get hint:', err);
        } finally {
            hintBtn.disabled = false;
            hintBtn.innerHTML = `<span class="btn-icon">💡</span>Get Hint`;
        }
    }
    
    async function startAutoSolve() {
        if (solved || isAnimating || isAutoSolving) return;
        
        clearHints();
        isAutoSolving = true;
        updateButtonsState();
        
        try {
            const res = await fetch('/api/solve', { method: 'POST' });
            const data = await res.json();
            
            if (data.moves && data.moves.length > 0) {
                for (const tileVal of data.moves) {
                    if (!isAutoSolving || solved) break;
                    await moveTile(tileVal, true);
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
        } catch (err) {
            console.error('Failed to auto solve:', err);
        } finally {
            isAutoSolving = false;
            updateButtonsState();
        }
    }
    
    function highlightHintTile(tileValue) {
        const tiles = boardEl.querySelectorAll('.tile');
        tiles.forEach(tile => {
            if (parseInt(tile.textContent) === tileValue) {
                tile.classList.add('hint-tile');
            }
        });
    }
    
    function clearHints() {
        const tiles = boardEl.querySelectorAll('.tile');
        tiles.forEach(tile => {
            tile.classList.remove('hint-tile');
        });
    }
    
    function updateButtonsState() {
        if (isAutoSolving) {
            hintBtn.disabled = true;
            autoSolveBtn.disabled = true;
            autoSolveBtn.innerHTML = `<span class="btn-icon">⏳</span>Solving...`;
        } else {
            hintBtn.disabled = false;
            autoSolveBtn.disabled = false;
            autoSolveBtn.innerHTML = `<span class="btn-icon">🤖</span>Auto Solve`;
        }
    }

    async function changeLevel(size) {
        if (isAnimating || isAutoSolving) return;

        stopTimer();
        resetTimer();
        timerStarted = false;
        clearHints();
        currentSize = size;

        levelBtns.forEach(btn => {
            if (parseInt(btn.getAttribute('data-size')) === size) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        try {
            const res = await fetch(`/api/new-game?size=${size}`, { method: 'POST' });
            const data = await res.json();
            applyState(data);
            renderBoard(true);
        } catch (err) {
            console.error('Failed to change level:', err);
        }
    }

})();

