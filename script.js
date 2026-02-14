class BlockBlastGame {
    constructor() {
        this.gridSize = 8;
        this.grid = Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(0));
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('blockBlastHighScore')) || 0;
        this.blocks = [];
        this.draggedIndex = null;
        this.isDragging = false;
        this.isAnimating = false;
        this.touchStartTime = 0;
        this.longPressTimeout = null;
        
        this.init();
        this.createFloatingParticles();
    }

    createFloatingParticles() {
        // Уменьшаем количество частиц на мобильных
        const isMobile = window.innerWidth <= 700;
        const particleCount = isMobile ? 8 : 15;
        
        for (let i = 0; i < particleCount; i++) {
            setTimeout(() => {
                this.createSingleParticle();
            }, i * 300);
        }
    }

    createSingleParticle() {
        const particle = document.createElement('div');
        particle.className = 'floating-particle';
        
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        
        const size = 2 + Math.random() * (window.innerWidth <= 700 ? 4 : 6);
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        
        particle.style.animationDelay = Math.random() * 5 + 's';
        particle.style.animationDuration = (15 + Math.random() * 20) + 's';
        
        document.body.appendChild(particle);
        
        setTimeout(() => {
            if (particle.parentNode) {
                particle.remove();
                this.createSingleParticle();
            }
        }, 35000);
    }

    init() {
        this.generateBlocks();
        this.updateHighScore();
        this.setupEventListeners();
        this.render();
    }

    generateBlocks() {
        const shapes = [
            [[1]],
            [[1,1]],
            [[1],[1]],
            [[1,1,1]],
            [[1],[1],[1]],
            [[1,1],[1,1]],
            [[1,1,1,1]],
            [[1,1,1],[1,0,0]],
            [[1,1,1],[0,0,1]],
            [[1,1],[1,0],[1,0]],
            [[1,1,1],[0,1,0]],
        ];

        this.blocks = [];
        for (let i = 0; i < 3; i++) {
            const shape = JSON.parse(JSON.stringify(shapes[Math.floor(Math.random() * shapes.length)]));
            this.blocks.push({ shape });
        }
    }

    canPlace(block, row, col) {
        for (let r = 0; r < block.shape.length; r++) {
            for (let c = 0; c < block.shape[0].length; c++) {
                if (block.shape[r][c]) {
                    const newRow = row + r;
                    const newCol = col + c;
                    if (newRow >= this.gridSize || newCol >= this.gridSize || 
                        newRow < 0 || newCol < 0 || this.grid[newRow][newCol]) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    placeBlock(block, row, col) {
        for (let r = 0; r < block.shape.length; r++) {
            for (let c = 0; c < block.shape[0].length; c++) {
                if (block.shape[r][c]) {
                    this.grid[row + r][col + c] = 1;
                }
            }
        }
        
        this.renderGrid();
        this.animateBlockPlacement(row, col, block);
        
        this.blocks.splice(this.draggedIndex, 1);
        this.renderBlocks();
        
        if (this.blocks.length < 3) {
            this.generateBlocks();
            this.renderBlocks();
        }
        
        this.clearLinesWithAnimation();
        
        this.draggedIndex = null;
        this.isDragging = false;
        this.hideDraggable();
        
        if (this.checkGameOver()) {
            setTimeout(() => {
                alert('Игра окончена!');
            }, 700);
        }
    }

    animateBlockPlacement(row, col, block) {
        for (let r = 0; r < block.shape.length; r++) {
            for (let c = 0; c < block.shape[0].length; c++) {
                if (block.shape[r][c]) {
                    const cell = document.querySelector(`[data-row="${row + r}"][data-col="${col + c}"]`);
                    if (cell) {
                        cell.style.transform = 'scale(0)';
                        cell.style.transition = 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)';
                        requestAnimationFrame(() => {
                            cell.style.transform = 'scale(1)';
                        });
                    }
                }
            }
        }
    }

    async clearLinesWithAnimation() {
        const linesToClear = [];
        
        for (let r = 0; r < this.gridSize; r++) {
            if (this.grid[r].every(cell => cell === 1)) {
                linesToClear.push({ type: 'row', index: r });
            }
        }
        
        for (let c = 0; c < this.gridSize; c++) {
            let full = true;
            for (let r = 0; r < this.gridSize; r++) {
                if (!this.grid[r][c]) {
                    full = false;
                    break;
                }
            }
            if (full) {
                linesToClear.push({ type: 'col', index: c });
            }
        }
        
        if (linesToClear.length === 0) return;

        document.querySelector('.game-grid').classList.add('pulse');
        setTimeout(() => {
            document.querySelector('.game-grid').classList.remove('pulse');
        }, 250);

        const cellsToAnimate = [];
        
        linesToClear.forEach(line => {
            if (line.type === 'row') {
                for (let c = 0; c < this.gridSize; c++) {
                    const cell = document.querySelector(`[data-row="${line.index}"][data-col="${c}"]`);
                    if (cell && cell.classList.contains('filled')) {
                        cellsToAnimate.push(cell);
                    }
                }
            } else {
                for (let r = 0; r < this.gridSize; r++) {
                    const cell = document.querySelector(`[data-row="${r}"][data-col="${line.index}"]`);
                    if (cell && cell.classList.contains('filled')) {
                        cellsToAnimate.push(cell);
                    }
                }
            }
        });

        this.isAnimating = true;
        
        cellsToAnimate.forEach((cell, i) => {
            setTimeout(() => {
                if (cell && cell.classList.contains('filled')) {
                    cell.classList.add(i % 2 === 0 ? 'vanishing' : 'flash');
                }
            }, i * 20);
        });

        await new Promise(resolve => setTimeout(resolve, 400));

        linesToClear.forEach(line => {
            if (line.type === 'row') {
                this.grid[line.index].fill(0);
            } else {
                for (let r = 0; r < this.gridSize; r++) {
                    this.grid[r][line.index] = 0;
                }
            }
        });

        const linesCount = linesToClear.length;
        this.score += linesCount * 100;
        document.getElementById('score').textContent = this.score;
        this.updateHighScore();
        
        const scoreElement = document.getElementById('score');
        scoreElement.classList.add('pop');
        setTimeout(() => scoreElement.classList.remove('pop'), 250);

        this.renderGrid();
        this.isAnimating = false;
    }

    renderGrid() {
        const gridEl = document.getElementById('gameGrid');
        const cells = gridEl.children;
        
        for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            const row = parseInt(cell.dataset.row);
            const col = parseInt(cell.dataset.col);
            
            if (this.grid[row][col]) {
                cell.classList.add('filled');
            } else {
                cell.classList.remove('filled');
            }
            cell.classList.remove('vanishing', 'flash');
        }
    }

    renderBlocks() {
        const blocksEl = document.getElementById('nextBlocks');
        blocksEl.innerHTML = '';
        
        this.blocks.forEach((block, index) => {
            const blockEl = document.createElement('div');
            blockEl.className = 'block-preview';
            blockEl.dataset.index = index;
            
            for (let r = 0; r < 4; r++) {
                for (let c = 0; c < 4; c++) {
                    const cell = document.createElement('div');
                    cell.className = 'cell';
                    
                    if (r < block.shape.length && c < block.shape[0].length && block.shape[r][c]) {
                        cell.classList.add('filled');
                    }
                    
                    blockEl.appendChild(cell);
                }
            }
            
            blocksEl.appendChild(blockEl);
        });
        
        setTimeout(() => {
            document.querySelectorAll('.block-preview').forEach(el => {
                el.classList.add('new');
                setTimeout(() => el.classList.remove('new'), 250);
            });
        }, 50);
    }

    updateHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('blockBlastHighScore', this.highScore);
            
            const highScoreElement = document.getElementById('highScore');
            highScoreElement.classList.add('pop');
            setTimeout(() => highScoreElement.classList.remove('pop'), 250);
        }
        document.getElementById('highScore').textContent = this.highScore;
    }

    checkGameOver() {
        for (let b of this.blocks) {
            for (let r = 0; r <= this.gridSize - b.shape.length; r++) {
                for (let c = 0; c <= this.gridSize - b.shape[0].length; c++) {
                    if (this.canPlace(b, r, c)) return false;
                }
            }
        }
        return true;
    }

    setupEventListeners() {
        document.getElementById('themeLight').addEventListener('click', (e) => {
            e.preventDefault();
            this.setTheme('light-theme');
        });
        
        document.getElementById('themeDark').addEventListener('click', (e) => {
            e.preventDefault();
            this.setTheme('dark-theme');
        });
        
        document.getElementById('themeCoffeeDark').addEventListener('click', (e) => {
            e.preventDefault();
            this.setTheme('coffee-dark-theme');
        });
        
        document.getElementById('themeCoffeeLight').addEventListener('click', (e) => {
            e.preventDefault();
            this.setTheme('coffee-light-theme');
        });
        
        document.getElementById('themeSky').addEventListener('click', (e) => {
            e.preventDefault();
            this.setTheme('sky-theme');
        });
        
        document.getElementById('newGameBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.newGame();
        });
        
        const blocksPanel = document.getElementById('nextBlocks');
        
        // Mouse events (для компьютера)
        blocksPanel.addEventListener('mousedown', (e) => this.startDrag(e));
        document.addEventListener('mousemove', (e) => this.onDrag(e));
        document.addEventListener('mouseup', (e) => this.stopDrag(e));
        
        // Touch events (для телефона)
        blocksPanel.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.touchStartTime = Date.now();
            const touch = e.touches[0];
            this.startDrag(this.createTouchEvent(touch, e.target));
        }, { passive: false });
        
        document.addEventListener('touchmove', (e) => {
            if (!this.isDragging) return;
            e.preventDefault();
            const touch = e.touches[0];
            this.onDrag(this.createTouchEvent(touch));
        }, { passive: false });
        
        document.addEventListener('touchend', (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            this.stopDrag(this.createTouchEvent(touch));
        }, { passive: false });
        
        document.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            this.cancelDrag();
        }, { passive: false });
        
        // Grid hover effects (для компьютера)
        document.getElementById('gameGrid').addEventListener('mouseover', (e) => this.onGridHover(e));
        document.getElementById('gameGrid').addEventListener('mouseout', () => this.clearHighlights());
        
        // Touch move on grid (для телефона)
        document.getElementById('gameGrid').addEventListener('touchmove', (e) => {
            if (!this.isDragging) return;
            e.preventDefault();
            
            const touch = e.touches[0];
            const element = document.elementFromPoint(touch.clientX, touch.clientY);
            const cell = element?.closest('.cell');
            
            if (cell) {
                const row = parseInt(cell.dataset.row);
                const col = parseInt(cell.dataset.col);
                const block = this.blocks[this.draggedIndex];
                if (block) {
                    const valid = this.canPlace(block, row, col);
                    this.highlightCells(row, col, block, valid);
                }
            }
        }, { passive: false });
        
        // Предотвращаем скролл при перетаскивании
        document.addEventListener('touchmove', (e) => {
            if (this.isDragging) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    setTheme(themeName) {
        document.body.className = themeName;
    }

    createTouchEvent(touch, target = null) {
        return {
            clientX: touch.clientX,
            clientY: touch.clientY,
            target: target,
            preventDefault: () => {}
        };
    }

    startDrag(e) {
        if (this.isAnimating) return;
        
        const blockEl = e.target.closest('.block-preview');
        if (!blockEl) return;
        
        const index = parseInt(blockEl.dataset.index);
        if (isNaN(index)) return;
        
        e.preventDefault();
        this.draggedIndex = index;
        this.isDragging = true;
        this.showDraggable(this.blocks[index], e.clientX, e.clientY);
    }

    onDrag(e) {
        if (!this.isDragging) return;
        
        this.updateDraggablePosition(e.clientX, e.clientY);
        document.getElementById('draggableBlock').classList.add('dragging');
        
        const gridRect = document.getElementById('gameGrid').getBoundingClientRect();
        if (e.clientX >= gridRect.left && e.clientX <= gridRect.right && 
            e.clientY >= gridRect.top && e.clientY <= gridRect.bottom) {
            
            const cellSize = gridRect.width / this.gridSize;
            const col = Math.floor((e.clientX - gridRect.left) / cellSize);
            const row = Math.floor((e.clientY - gridRect.top) / cellSize);
            
            if (row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize) {
                const block = this.blocks[this.draggedIndex];
                if (block) {
                    const valid = this.canPlace(block, row, col);
                    this.highlightCells(row, col, block, valid);
                }
            }
        } else {
            this.clearHighlights();
        }
    }

    stopDrag(e) {
        if (!this.isDragging || this.draggedIndex === null) return;
        
        document.getElementById('draggableBlock').classList.remove('dragging');
        
        const gridRect = document.getElementById('gameGrid').getBoundingClientRect();
        if (e.clientX >= gridRect.left && e.clientX <= gridRect.right && 
            e.clientY >= gridRect.top && e.clientY <= gridRect.bottom) {
            
            const cellSize = gridRect.width / this.gridSize;
            const col = Math.floor((e.clientX - gridRect.left) / cellSize);
            const row = Math.floor((e.clientY - gridRect.top) / cellSize);
            
            if (row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize) {
                const block = this.blocks[this.draggedIndex];
                if (block && this.canPlace(block, row, col)) {
                    this.placeBlock(block, row, col);
                }
            }
        }
        
        this.cancelDrag();
    }

    cancelDrag() {
        this.isDragging = false;
        this.draggedIndex = null;
        this.hideDraggable();
        this.clearHighlights();
    }

    onGridHover(e) {
        if (!this.isDragging || this.draggedIndex === null) return;
        
        const cell = e.target.closest('.cell');
        if (!cell) return;
        
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        const block = this.blocks[this.draggedIndex];
        if (block) {
            const valid = this.canPlace(block, row, col);
            this.highlightCells(row, col, block, valid);
        }
    }

    highlightCells(startRow, startCol, block, valid) {
        this.clearHighlights();
        
        for (let r = 0; r < block.shape.length; r++) {
            for (let c = 0; c < block.shape[0].length; c++) {
                if (block.shape[r][c]) {
                    const row = startRow + r;
                    const col = startCol + c;
                    if (row < this.gridSize && col < this.gridSize) {
                        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                        if (cell && !cell.classList.contains('filled')) {
                            cell.classList.add(valid ? 'drop-valid' : 'drop-invalid');
                        }
                    }
                }
            }
        }
    }

    clearHighlights() {
        document.querySelectorAll('.cell').forEach(cell => {
            cell.classList.remove('drop-valid', 'drop-invalid');
        });
    }

    showDraggable(block, x, y) {
        const el = document.getElementById('draggableBlock');
        el.innerHTML = '';
        el.classList.remove('hidden');
        
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                
                if (r < block.shape.length && c < block.shape[0].length && block.shape[r][c]) {
                    cell.classList.add('filled');
                }
                
                el.appendChild(cell);
            }
        }
        
        this.updateDraggablePosition(x, y);
    }

    updateDraggablePosition(x, y) {
        const el = document.getElementById('draggableBlock');
        el.style.left = x + 'px';
        el.style.top = y + 'px';
    }

    hideDraggable() {
        document.getElementById('draggableBlock').classList.add('hidden');
    }

    newGame() {
        this.grid = Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(0));
        this.score = 0;
        this.blocks = [];
        this.generateBlocks();
        this.draggedIndex = null;
        this.isDragging = false;
        this.hideDraggable();
        this.clearHighlights();
        document.getElementById('score').textContent = this.score;
        this.updateHighScore();
        this.render();
    }

    render() {
        const gridEl = document.getElementById('gameGrid');
        gridEl.innerHTML = '';
        
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const cell = document.createElement('div');
                cell.className = `cell ${this.grid[r][c] ? 'filled' : ''}`;
                cell.dataset.row = r;
                cell.dataset.col = c;
                gridEl.appendChild(cell);
            }
        }
        
        this.renderBlocks();
        document.getElementById('score').textContent = this.score;
        document.getElementById('highScore').textContent = this.highScore;
    }
}

// Запускаем игру после загрузки страницы
document.addEventListener('DOMContentLoaded', () => {
    new BlockBlastGame();
});

// Предотвращаем скролл при перетаскивании на мобильных
window.addEventListener('touchmove', (e) => {
    if (e.target.closest('.block-preview') || e.target.closest('.draggable-block')) {
        e.preventDefault();
    }
}, { passive: false });