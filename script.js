const canvas = document.getElementById('tetris');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextCtx = nextCanvas.getContext('2d');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');

const BLOCK_SIZE = 30;
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const COLORS = [
    '#FF0D72',
    '#0DC2FF',
    '#0DFF72',
    '#F538FF',
    '#FF8E0D',
    '#FFE138',
    '#3877FF'
];

const SHAPES = [
    [[1, 1, 1, 1]],                    // I
    [[1, 1, 1], [0, 1, 0]],           // T
    [[1, 1, 1], [1, 0, 0]],           // L
    [[1, 1, 1], [0, 0, 1]],           // J
    [[1, 1], [1, 1]],                 // O
    [[1, 1, 0], [0, 1, 1]],           // Z
    [[0, 1, 1], [1, 1, 0]]            // S
];

let board = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
let score = 0;
let level = 1;
let gameLoop;
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let paused = false;
let gameOver = false;

let piece = null;
let nextPiece = null;

// 添加触摸控制
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

class Piece {
    constructor(shape = Math.floor(Math.random() * SHAPES.length)) {
        this.shape = SHAPES[shape];
        this.color = COLORS[shape];
        this.x = Math.floor(BOARD_WIDTH / 2) - Math.floor(this.shape[0].length / 2);
        this.y = 0;
    }

    rotate() {
        const rotated = this.shape[0].map((_, i) =>
            this.shape.map(row => row[i]).reverse()
        );
        if (!this.collision(0, 0, rotated)) {
            this.shape = rotated;
        }
    }

    collision(offsetX, offsetY, newShape = this.shape) {
        for (let y = 0; y < newShape.length; y++) {
            for (let x = 0; x < newShape[y].length; x++) {
                if (newShape[y][x] !== 0) {
                    const newX = this.x + x + offsetX;
                    const newY = this.y + y + offsetY;
                    if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
                        return true;
                    }
                    if (newY >= 0 && board[newY][newX]) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
}

function createPiece() {
    if (!nextPiece) {
        nextPiece = new Piece();
    }
    piece = nextPiece;
    nextPiece = new Piece();
    if (piece.collision(0, 0)) {
        gameOver = true;
    }
    drawNextPiece();
}

function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    drawBoard();
    if (piece) {
        drawPiece();
    }
}

function drawBoard() {
    board.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                ctx.fillStyle = COLORS[value - 1];
                ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
            }
        });
    });
}

function drawPiece() {
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                ctx.fillStyle = piece.color;
                ctx.fillRect(
                    (piece.x + x) * BLOCK_SIZE,
                    (piece.y + y) * BLOCK_SIZE,
                    BLOCK_SIZE - 1,
                    BLOCK_SIZE - 1
                );
            }
        });
    });
}

function drawNextPiece() {
    nextCtx.fillStyle = '#f8f8f8';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    const offsetX = (nextCanvas.width - nextPiece.shape[0].length * BLOCK_SIZE) / 2;
    const offsetY = (nextCanvas.height - nextPiece.shape.length * BLOCK_SIZE) / 2;
    
    nextPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                nextCtx.fillStyle = nextPiece.color;
                nextCtx.fillRect(
                    offsetX + x * BLOCK_SIZE,
                    offsetY + y * BLOCK_SIZE,
                    BLOCK_SIZE - 1,
                    BLOCK_SIZE - 1
                );
            }
        });
    });
}

function merge() {
    if (!piece) return;
    
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                const boardY = piece.y + y;
                const boardX = piece.x + x;
                if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
                    board[boardY][boardX] = SHAPES.findIndex(shape => 
                        JSON.stringify(shape) === JSON.stringify(piece.shape)) + 1;
                }
            }
        });
    });
}

function clearLines() {
    let linesCleared = 0;
    outer: for (let y = board.length - 1; y >= 0; y--) {
        for (let x = 0; x < board[y].length; x++) {
            if (board[y][x] === 0) {
                continue outer;
            }
        }
        board.splice(y, 1);
        board.unshift(Array(BOARD_WIDTH).fill(0));
        linesCleared++;
        y++;
    }
    if (linesCleared > 0) {
        score += [40, 100, 300, 1200][linesCleared - 1] * level;
        scoreElement.textContent = score;
        level = Math.floor(score / 1000) + 1;
        levelElement.textContent = level;
        dropInterval = Math.max(100, 1000 - (level - 1) * 100);
    }
}

function drop() {
    if (!piece) return false;
    
    if (!piece.collision(0, 1)) {
        piece.y++;
        draw();  // 每次移动都重绘
        return true;
    } else {
        merge();
        clearLines();
        createPiece();
        draw();  // 确保在创建新方块后重绘
        return false;
    }
}

function softDrop() {
    if (!gameOver && !paused) {
        drop();
        dropCounter = dropInterval;
    }
}

function move(dir) {
    if (!piece.collision(dir, 0)) {
        piece.x += dir;
    }
}

function hardDrop() {
    if (!gameOver && !paused && piece) {
        // 快速下落到底部
        while (!piece.collision(0, 1)) {
            piece.y++;
        }
        // 直接合并和生成新方块
        merge();
        clearLines();
        createPiece();
        dropCounter = dropInterval;
        draw();  // 确保重绘
    }
}

function update(time = 0) {
    if (gameOver || paused) {
        return;
    }

    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;

    if (dropCounter > dropInterval) {
        drop();
        dropCounter = 0;
    }

    draw();  // 保持每帧重绘
    gameLoop = requestAnimationFrame(update);
}

function startGame() {
    if (gameLoop) {
        cancelAnimationFrame(gameLoop);
    }
    board = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
    score = 0;
    level = 1;
    scoreElement.textContent = score;
    levelElement.textContent = level;
    dropInterval = 1000;
    gameOver = false;
    createPiece();
    update();
    startBtn.textContent = '重新开始';
}

function togglePause() {
    paused = !paused;
    pauseBtn.textContent = paused ? '继续' : '暂停';
    if (!paused) {
        lastTime = performance.now();
        update();
    }
}

document.addEventListener('keydown', event => {
    if (gameOver) return;
    
    switch (event.keyCode) {
        case 37: // 左箭头
            move(-1);
            break;
        case 39: // 右箭头
            move(1);
            break;
        case 40: // 下箭头
            softDrop();
            break;
        case 38: // 上箭头
            piece.rotate();
            break;
        case 32: // 空格
            hardDrop();
            break;
    }
});

// 添加触摸控制
document.addEventListener('touchstart', function(event) {
    if (gameOver || paused) return;
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
}, false);

document.addEventListener('touchmove', function(event) {
    event.preventDefault();
}, { passive: false });

document.addEventListener('touchend', function(event) {
    if (gameOver || paused) return;
    touchEndX = event.changedTouches[0].clientX;
    touchEndY = event.changedTouches[0].clientY;
    
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const minSwipe = 30; // 最小滑动距离
    
    // 水平滑动
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipe) {
        if (deltaX > 0) {
            move(1); // 右移
        } else {
            move(-1); // 左移
        }
    }
    // 垂直滑动
    else if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > minSwipe) {
        if (deltaY > 0) {
            hardDrop(); // 下滑快速下落
        } else {
            piece.rotate(); // 上滑旋转
        }
    }
    // 轻点屏幕
    else if (Math.abs(deltaX) < minSwipe && Math.abs(deltaY) < minSwipe) {
        softDrop(); // 轻点屏幕软下落
    }
}, false);

// 添加虚拟按钮控制
document.querySelector('.control-btn.left').addEventListener('click', () => {
    if (!gameOver && !paused) {
        move(-1);
    }
});

document.querySelector('.control-btn.right').addEventListener('click', () => {
    if (!gameOver && !paused) {
        move(1);
    }
});

document.querySelector('.control-btn.rotate').addEventListener('click', () => {
    if (!gameOver && !paused) {
        piece.rotate();
    }
});

document.querySelector('.control-btn.down').addEventListener('click', () => {
    if (!gameOver && !paused) {
        hardDrop();
    }
});

// 防止虚拟按钮触发默认的触摸行为
document.querySelectorAll('.control-btn').forEach(btn => {
    btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
    });
});

startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', togglePause); 