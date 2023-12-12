class Canvas {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.canvas.style.border = "1px solid black";
        this.canvas.style.backgroundColor = "white";
        document.body.appendChild(this.canvas);
        this.ctx = this.canvas.getContext("2d")!;
    }
}

const deltaPos = [ // 0: up, 1: down, 2: left, 3: right
    [[-2, 0, 1], [1, 0, 1], [0, -2, 2], [0, 1, 2]],
    [[-1, 0, 0], [2, 0, 0], [0, -1, 1], [0, 1, 1]],
    [[-1, 0, 2], [1, 0, 2], [0, -1, 0], [0, 2, 0]]
]

class State{
    x: number;
    y: number;
    dir: number; // 0: stand, 1:down, 2:right
    constructor(x: number, y: number, dir: number){
        this.x = x;
        this.y = y;
        this.dir = dir;
    }

    move(d: number): State{
        const [dx, dy, dir] = deltaPos[this.dir][d];
        return new State(this.x + dx, this.y + dy, dir);
    }

    occupied(): [number, number][]{
        const ret: [number, number][] = [[this.x, this.y]];
        if(this.dir === 1) ret.push([this.x+1, this.y]);
        if(this.dir === 2) ret.push([this.x, this.y+1]);
        return ret;
    }
}

const padding = 2;
class Board {
    width: number;
    height: number;
    tilesize: number;
    player: State;
    tiles: number[][];
    constructor(w: number = 10, h: number = 10, t: number = 32, p: State = new State(0, 0, 0)) {
        this.width = w + 2 * padding;
        this.height = h + 2 * padding;
        this.tilesize = t;
        this.player = new State(p.x + padding, p.y + padding, p.dir);
        this.tiles = [];
        for (let x = 0; x < this.width; x++) {
            this.tiles.push([]);
            for (let y = 0; y < this.height; y++) {
                this.tiles[x].push(0);
            }
        }
    }

    updateMap(t: number[][]){
        for(let x = padding; x < this.width-padding; x++){
            for(let y = padding; y < this.height-padding; y++){
                console.log(x, y)
                this.tiles[x][y] = t[x-padding][y-padding];
            }
        }
    }

    update(key: string): void {
        let dir = -1;
        if(key === "ArrowUp") dir = 0;
        if(key === "ArrowDown") dir = 1;
        if(key === "ArrowLeft") dir = 2;
        if(key === "ArrowRight") dir = 3;
        if(dir === -1) return;
        this.player = this.player.move(dir);
    }

    render(ctx: CanvasRenderingContext2D): void {
        ctx.clearRect(0, 0, this.width * this.tilesize, this.height * this.tilesize);
        ctx.fillStyle = "black";
        for (let x = 0; x < this.width; x++) {
            for (let y = 0; y < this.height; y++) {
                if (this.tiles[x][y] === 0) continue;
                ctx.fillRect(y * this.tilesize + 1, x * this.tilesize + 1, this.tilesize - 2, this.tilesize - 2);
                ctx.fillStyle = "black";
            }
        }
        ctx.fillStyle = "red";
        for (const [x, y] of this.player.occupied()) {
            ctx.fillRect(y * this.tilesize, x * this.tilesize, this.tilesize, this.tilesize);
        }
    }
}

class Game {
    canvas: Canvas;
    board: Board;
    constructor() {
        this.canvas = new Canvas();
        this.board = new Board(10, 10, 32, new State(0, 0, 0));
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
            this.board.update(e.key);
            this.board.render(this.canvas.ctx);
        });
        this.board.render(this.canvas.ctx);
    }
}

const game = new Game();