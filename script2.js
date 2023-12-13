class Canvas {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.canvas.style.border = "1px solid black";
        this.canvas.style.backgroundColor = "white";
        document.body.appendChild(this.canvas);
        this.ctx = this.canvas.getContext("2d");
    }
}
const deltaPos = [
    [[-2, 0, 1], [1, 0, 1], [0, -2, 2], [0, 1, 2]],
    [[-1, 0, 0], [2, 0, 0], [0, -1, 1], [0, 1, 1]],
    [[-1, 0, 2], [1, 0, 2], [0, -1, 0], [0, 2, 0]]
];
class State {
    constructor(x, y, dir) {
        this.x = x;
        this.y = y;
        this.dir = dir;
    }
    move(d) {
        const [dx, dy, dir] = deltaPos[this.dir][d];
        return new State(this.x + dx, this.y + dy, dir);
    }
    occupied() {
        const ret = [[this.x, this.y]];
        if (this.dir === 1)
            ret.push([this.x + 1, this.y]);
        if (this.dir === 2)
            ret.push([this.x, this.y + 1]);
        return ret;
    }
    isEqual(s) {
        return this.x === s.x && this.y === s.y && this.dir === s.dir;
    }
}
const padding = 2;
class Board {
    constructor(s, e, w = 10, h = 10, t = 32) {
        this.width = w + 2 * padding;
        this.height = h + 2 * padding;
        this.tilesize = t;
        this.player = new State(s.x + padding, s.y + padding, s.dir);
        this.startState = new State(s.x + padding, s.y + padding, s.dir);
        this.endState = new State(e.x + padding, e.y + padding, e.dir);
        this.tiles = [];
        for (let x = 0; x < this.width; x++) {
            this.tiles.push([]);
            for (let y = 0; y < this.height; y++) {
                this.tiles[x].push(0);
            }
        }
    }
    updateMap(t) {
        for (let x = padding; x < this.width - padding; x++) {
            for (let y = padding; y < this.height - padding; y++) {
                this.tiles[x][y] = t[x - padding][y - padding];
            }
        }
        this.tiles[this.endState.x][this.endState.y] = -1;
    }
    move(key) {
        let dir = -1;
        if (key === "ArrowUp")
            dir = 0;
        if (key === "ArrowDown")
            dir = 1;
        if (key === "ArrowLeft")
            dir = 2;
        if (key === "ArrowRight")
            dir = 3;
        if (dir === -1)
            return;
        this.player = this.player.move(dir);
    }
    render(ctx) {
        ctx.clearRect(0, 0, this.width * this.tilesize, this.height * this.tilesize);
        ctx.fillStyle = "black";
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                if (this.tiles[x][y] === 0)
                    continue;
                else if (this.tiles[x][y] === 1) {
                    ctx.fillRect(y * this.tilesize + 1, x * this.tilesize + 1, this.tilesize - 2, this.tilesize - 2);
                }
                else if (this.tiles[x][y] === -1) {
                    ctx.fillStyle = "green";
                    ctx.fillRect(y * this.tilesize + 1, x * this.tilesize + 1, this.tilesize - 2, this.tilesize - 2);
                    ctx.fillStyle = "black";
                }
            }
        }
        ctx.fillStyle = "red";
        for (const [x, y] of this.player.occupied()) {
            ctx.fillRect(y * this.tilesize, x * this.tilesize, this.tilesize, this.tilesize);
        }
    }
    update() {
        const occupied = this.player.occupied();
        for (const [x, y] of occupied) {
            if (this.tiles[x][y] === 0) {
                document.getElementById('died').play();
                alert("You died, you fucking idiot");
                this.player = new State(this.startState.x, this.startState.y, this.startState.dir);
                break;
            }
        }
        if (this.player.isEqual(this.endState)) {
            alert("You won! Good Job.");
            this.player = new State(this.startState.x, this.startState.y, this.startState.dir);
        }
    }
}
class Game {
    constructor() {
        this.canvas = new Canvas();
        this.board = new Board(new State(0, 0, 0), new State(9, 9, 0), 10, 10, 32);
        this.board.updateMap([[1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 0, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 0, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 0, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 0, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]]);
        document.addEventListener("keydown", (e) => {
            this.board.move(e.key);
            this.board.render(this.canvas.ctx);
            setTimeout(() => {
                this.board.update();
                this.board.render(this.canvas.ctx);
            }, 10);
        });
        this.board.render(this.canvas.ctx);
    }
}
const game = new Game();
