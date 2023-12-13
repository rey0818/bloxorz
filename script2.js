//@ts-ignore
import * as THREE from 'three';
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
    copy() {
        return new State(this.x, this.y, this.dir);
    }
}
const padding = 2;
class Board {
    constructor(w, h, t) {
        w = w + 2 * padding;
        h = h + 2 * padding;
        this.width = w;
        this.height = h;
        this.tilesize = t;
        this.tiles = [];
        for (let x = 0; x < this.width; x++) {
            this.tiles.push([]);
            for (let y = 0; y < this.height; y++) {
                this.tiles[x].push(0);
            }
        }
        this.canvas = document.createElement('canvas');
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        document.body.appendChild(this.canvas);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, canvas: this.canvas });
        const cw = (w + h) * t, ch = (w + h) * t, near = 0.1, far = 100;
        this.camera = new THREE.OrthographicCamera(-cw / 2, cw / 2, ch / 2, -ch / 2, near, far);
        this.camera.position.set(9, 7, 9);
        this.camera.lookAt(0, 0, 0);
        this.scene = new THREE.Scene();
        this.light = new THREE.DirectionalLight(0xffffff, 1);
        this.light.position.set(3, 3, 2);
        this.scene.add(this.light);
    }
    updateMap(s, e, t) {
        this.player = new State(s.x + padding, s.y + padding, s.dir);
        this.startState = new State(s.x + padding, s.y + padding, s.dir);
        this.endState = new State(e.x + padding, e.y + padding, e.dir);
        for (let x = padding; x < this.width - padding; x++) {
            for (let y = padding; y < this.height - padding; y++) {
                this.tiles[x][y] = t[x - padding][y - padding];
            }
        }
        this.tiles[this.endState.x][this.endState.y] = -1;
        this.tileMeshes = [];
        const tilegeometry = new THREE.BoxGeometry(this.tilesize * 0.9, this.tilesize * 0.3, this.tilesize * 0.9);
        const tilematerial = new THREE.MeshPhongMaterial({ color: 0x44dd77 });
        const endmaterial = new THREE.MeshPhongMaterial({ color: 0x0000ff });
        const offsetX = this.width * this.tilesize / 2;
        const offsetY = this.height * this.tilesize / 2;
        for (let x = 0; x < this.width; x++) {
            this.tileMeshes.push([]);
            for (let y = 0; y < this.height; y++) {
                if (this.tiles[x][y] === 0) {
                    this.tileMeshes[x].push(null);
                    continue;
                }
                const cube = new THREE.Mesh(tilegeometry, this.tiles[x][y] === -1 ? endmaterial : tilematerial);
                cube.position.set(y * this.tilesize - offsetY, 0, x * this.tilesize - offsetX);
                this.tileMeshes[x].push(cube);
                this.scene.add(cube);
            }
        }
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
    render() {
        this.renderer.render(this.scene, this.camera);
    }
}
class Game {
    constructor() {
        this.board = new Board(10, 10, 0.7);
        this.board.updateMap(new State(0, 0, 0), new State(9, 9, 0), [
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 0, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 0, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 0, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 0, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        ]);
        document.addEventListener("keydown", (e) => {
            this.board.move(e.key);
            this.board.render();
            setTimeout(() => {
                this.board.update();
                this.board.render();
            }, 10);
        });
        this.board.render();
    }
}
const game = new Game();
