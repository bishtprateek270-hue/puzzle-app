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

    // --- Game State ---
    let board = [];          // flat array of 16 ints (0 = empty)
    let moveCount = 0;
    let bestMoves = -1;
    let solved = false;
    let timerSeconds = 0;
    let timerInterval = null;
    let timerStarted = false;
    let isAnimating = false;
    let isInitialLoad = true;
    let isAutoSolving = false;

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

        // Keyboard controls
        window.addEventListener('keydown', handleKeyDown);

        // Touch swipe controls
        boardEl.addEventListener('touchstart', handleTouchStart, { passive: true });
        boardEl.addEventListener('touchend', handleTouchEnd, { passive: true });

        // Load initial state from server
        await fetchState();
        renderBoard(true);
        isInitialLoad = false;
    }

    // --- Keyboard Navigation ---
    function handleKeyDown(e) {
        if (solved || isAnimating || isAutoSolving) return;

        const emptyIndex = board.indexOf(0);
        const emptyRow = Math.floor(emptyIndex / 4);
        const emptyCol = emptyIndex % 4;

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

        if (targetRow >= 0 && targetRow < 4 && targetCol >= 0 && targetCol < 4) {
            e.preventDefault();
            const targetIndex = targetRow * 4 + targetCol;
            const tileVal = board[targetIndex];
            if (tileVal !== 0) {
                moveTile(tileVal);
            }
        }
    }

    // --- Touch Swiping ---
    function handleTouchStart(e) {
        if (e.touches.length === 1) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }
    }

    function handleTouchEnd(e) {
        if (solved || isAnimating || isAutoSolving || !e.changedTouches.length) return;

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;

        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        const minSwipeDistance = 30;

        if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < minSwipeDistance) return;

        const emptyIndex = board.indexOf(0);
        const emptyRow = Math.floor(emptyIndex / 4);
        const emptyCol = emptyIndex % 4;

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

        if (targetRow >= 0 && targetRow < 4 && targetCol >= 0 && targetCol < 4) {
            const targetIndex = targetRow * 4 + targetCol;
            const tileVal = board[targetIndex];
            if (tileVal !== 0) {
                moveTile(tileVal);
            }
        }
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
            const res = await fetch('/api/new-game', { method: 'POST' });
            const data = await res.json();
            applyState(data);
            renderBoard(true);
        } catch (err) {
            console.error('Failed to start new game:', err);
        }
    }

    async function moveTile(tileNumber, isFromAutoSolve = false) {
        if (isAnimating || solved) return;
        if (isAutoSolving && !isFromAutoSolve) return;

        clearHints();

        // Start timer on first move
        if (!timerStarted) {
            timerStarted = true;
            startTimer();
        }

        isAnimating = true;

        // Optimistic check & quick animation
        const tileIndex = board.indexOf(tileNumber);
        const emptyIndex = board.indexOf(0);

        if (tileIndex === -1 || emptyIndex === -1) {
            isAnimating = false;
            return;
        }

        const tRow = Math.floor(tileIndex / 4);
        const tCol = tileIndex % 4;
        const eRow = Math.floor(emptyIndex / 4);
        const eCol = emptyIndex % 4;

        const isDirectAdjacent = (Math.abs(tRow - eRow) + Math.abs(tCol - eCol)) === 1;

        if (isDirectAdjacent) {
            // Perform optimistic slide animation locally for instantaneous feel
            animateTileSlide(tileIndex, emptyIndex);
        }

        try {
            const res = await fetch(`/api/move/${tileNumber}`, { method: 'POST' });
            const data = await res.json();

            if (data.moved) {
                applyState(data);
                renderBoard(false);

                if (data.solved) {
                    stopTimer();
                    showWinModal(data.newBest === true);
                }
            }
        } catch (err) {
            console.error('Failed to move tile:', err);
        } finally {
            isAnimating = false;
        }
    }

    function animateTileSlide(fromIndex, toIndex) {
        const tiles = boardEl.querySelectorAll('.tile');
        const fromTile = tiles[fromIndex];
        const toTile = tiles[toIndex];

        if (!fromTile || !toTile) return;

        const fromRect = fromTile.getBoundingClientRect();
        const toRect = toTile.getBoundingClientRect();

        const deltaX = toRect.left - fromRect.left;
        const deltaY = toRect.top - fromRect.top;

        fromTile.style.transition = 'transform 120ms cubic-bezier(0.2, 0, 0, 1)';
        fromTile.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        fromTile.style.zIndex = '10';
    }

    function applyState(data) {
        board = data.board;
        moveCount = data.moves;
        solved = data.solved;
        bestMoves = data.bestMoves;

        moveCountEl.textContent = moveCount;
        bestScoreEl.textContent = bestMoves > 0 ? bestMoves : '—';
    }

    // --- Rendering ---

    function renderBoard(animateEntrance = false) {
        boardEl.innerHTML = '';

        const emptyIndex = board.indexOf(0);
        const emptyRow = Math.floor(emptyIndex / 4);
        const emptyCol = emptyIndex % 4;

        board.forEach((value, index) => {
            const tile = document.createElement('div');
            tile.classList.add('tile');

            if (value === 0) {
                tile.classList.add('empty');
            } else {
                tile.textContent = value;

                // Check if this tile is adjacent to empty
                const row = Math.floor(index / 4);
                const col = index % 4;
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

        setTimeout(() => {
            winModal.classList.add('active');
            spawnConfetti();
        }, 300);
    }

    function hideWinModal() {
        winModal.classList.remove('active');
        confettiContainer.innerHTML = '';
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
                    await new Promise(resolve => setTimeout(resolve, 250));
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

})();

