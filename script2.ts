class Canvas {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = 800;
        this.canvas.height = 600;
        this.canvas.style.border = "1px solid black";
        this.canvas.style.backgroundColor = "white";
        document.body.appendChild(this.canvas);
        this.ctx = this.canvas.getContext("2d")!;
    }
}

const deltaPos = [ // up, down, left, right
    [[-2, 0, 1], [1, 0, 1], [0, -2, 2], [0, 1, 2]],
    [[-1, 0, 0], [2, 0, 0], [0, -1, 1], [0, 1, 1]],
    [[-1, 0, 2], [1, 0, 2], [0, -1, 0], [0, 2, 0]]
]

class State{
    x: number;
    y: number;
    dir: number;
    constructor(x: number, y: number, dir: number){
        this.x = x;
        this.y = y;
        this.dir = dir;
    }
    move(d: number): State{
        const [dx, dy, dir] = deltaPos[this.dir][d];
        return new State(this.x + dx, this.y + dy, dir);
    }
}

class Board {
    width: number;
    height: number;
    tilesize: number;
    tiles: number[][];
    constructor(w: number = 10, h: number = 10, t: number = 32) {
        const padding = 2;
        this.width = w + 2 * padding;
        this.height = h + 2 * padding;
        this.tilesize = t;
        this.tiles = [];
        for (let x = 0; x < this.width; x++) {
            this.tiles.push([]);
            for (let y = 0; y < this.height; y++) {
                this.tiles[x].push(0);
            }
        }
    }
}

class Game {
    canvas: Canvas;
    board: Board;
    constructor() {
        this.canvas = new Canvas();
        this.board = new Board();
    }
}