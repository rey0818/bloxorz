//@ts-ignore
import * as THREE from 'three';

const deltaPos = [ // 0: up, 1: down, 2: left, 3: right
    [[-2, 0, 1], [1, 0, 1], [0, -2, 2], [0, 1, 2]],
    [[-1, 0, 0], [2, 0, 0], [0, -1, 1], [0, 1, 1]],
    [[-1, 0, 2], [1, 0, 2], [0, -1, 0], [0, 2, 0]]
]

class State {
    x: number;
    y: number;
    dir: number; // 0: stand, 1:down, 2:right
    constructor(x: number, y: number, dir: number) {
        this.x = x;
        this.y = y;
        this.dir = dir;
    }

    move(d: number): State {
        const [dx, dy, dir] = deltaPos[this.dir][d];
        return new State(this.x + dx, this.y + dy, dir);
    }

    occupied(): [number, number][] {
        const ret: [number, number][] = [[this.x, this.y]];
        if (this.dir === 1) ret.push([this.x + 1, this.y]);
        if (this.dir === 2) ret.push([this.x, this.y + 1]);
        return ret;
    }

    isEqual(s: State): boolean {
        return this.x === s.x && this.y === s.y && this.dir === s.dir;
    }

    copy(): State {
        return new State(this.x, this.y, this.dir);
    }
}

const padding = 2;
class Board {
    canvas: HTMLCanvasElement;
    renderer: THREE.WebGLRenderer;
    camera: THREE.OrthographicCamera;
    light: THREE.DirectionalLight;
    scene: THREE.Scene;
    tileMeshes: [THREE.Mesh | null][][];
    playerMesh: THREE.Mesh;
    onCooldown: boolean;
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
    tilesize: number;
    tiles: number[][];
    player: State;
    startState: State;
    endState: State;
    constructor(w: number, h: number, t: number) {
        w = w + 2 * padding;
        h = h + 2 * padding;
        this.width = w;
        this.height = h;
        this.tilesize = t;
        this.onCooldown = false;

        this.canvas = document.createElement('canvas');
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        document.body.appendChild(this.canvas);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, canvas: this.canvas });
        const cw = (w + h) * t, ch = cw * (this.canvas.height / this.canvas.width), near = 0.1, far = 100;
        console.log(cw, ch)
        this.camera = new THREE.OrthographicCamera(-cw / 2, cw / 2, ch / 2, -ch / 2, near, far);
        this.camera.position.set(3, 7, 9);
        this.camera.lookAt(0, 0, 0);
        this.scene = new THREE.Scene();
        this.light = new THREE.DirectionalLight(0xffffff, 1);
        this.light.position.set(4, 3, 2);
        this.scene.add(this.light);
        const ambient = new THREE.AmbientLight(0xffffff, 0.3);
        this.scene.add(ambient);
    }

    updateMap(s: State, e: State, t: number[][]) {
        this.player = new State(s.x + padding, s.y + padding, s.dir);
        this.startState = new State(s.x + padding, s.y + padding, s.dir);
        this.endState = new State(e.x + padding, e.y + padding, e.dir);
        this.tiles = [...Array(this.width)].map(e => Array(this.height).fill(0));
        for (let x = padding; x < this.width - padding; x++)
            for (let y = padding; y < this.height - padding; y++)
                this.tiles[x][y] = t[x - padding][y - padding];
        this.tiles[this.endState.x][this.endState.y] = -1;

        this.tileMeshes = [];
        const tilegeometry = new THREE.BoxGeometry(this.tilesize * 0.9, this.tilesize * 0.4, this.tilesize * 0.9);
        const playergeometry = new THREE.BoxGeometry(this.tilesize, this.tilesize * 2, this.tilesize);
        const tilematerial = new THREE.MeshPhongMaterial({ color: 0x44dd77 });
        const endmaterial = new THREE.MeshPhongMaterial({ color: 0x0000ff });
        const playermaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
        this.offsetX = this.width * this.tilesize / 2;
        this.offsetY = this.height * this.tilesize / 2;
        this.playerMesh = new THREE.Mesh(playergeometry, playermaterial);
        this.setPlayerPos(this.player, 0, 0, false);
        for (let x = 0; x < this.width; x++) {
            this.tileMeshes.push([]);
            for (let y = 0; y < this.height; y++) {
                if (this.tiles[x][y] === 0) {
                    this.tileMeshes[x].push(null);
                    continue;
                }
                const cube = new THREE.Mesh(tilegeometry, this.tiles[x][y] === -1 ? endmaterial : tilematerial);
                cube.position.set(y * this.tilesize - this.offsetY, -tilegeometry.parameters.height / 2, x * this.tilesize - this.offsetX);
                this.tileMeshes[x].push(cube);
                this.scene.add(cube);
            }
        }
        this.scene.add(this.playerMesh);
    }

    setPlayerPos(s: State, dir: number, deg: number, animate: boolean = true) {
        if(deg > 90){
            this.onCooldown = false;
            this.player = this.player.move(dir);
            this.setPlayerPos(this.player, 0, 0, false);
            this.update();
            return;
        }
        const theta = deg * Math.PI / 180;
        let x = 0, y = 0, rx = 0, ry = 0;
        if (s.dir === 0) x = -0.5, y = 1;
        else if ((s.dir === 1 && (dir === 0 || dir === 1)) || (s.dir === 2 && (dir === 2 || dir === 3))) x = -1, y = 0.5;
        else x = -0.5, y = 0.5;
        const cosTheta = Math.cos(theta);
        const sinTheta = Math.sin(theta);
        rx = cosTheta * x + sinTheta * y;
        ry = cosTheta * y - sinTheta * x;
        const rev = dir === 0 || dir === 2 ? 1 : -1;
        if (s.dir === 0 && (dir === 0 || dir === 1)) {
            this.playerMesh.position.set(this.player.y * this.tilesize - this.offsetY, ry * this.tilesize, (this.player.x - rev * (0.5 + rx)) * this.tilesize - this.offsetX);
            this.playerMesh.rotation.set(-rev * theta, 0, 0);
        }
        else if (s.dir === 0 && (dir === 2 || dir === 3)) {
            this.playerMesh.position.set((this.player.y - rev * (0.5 + rx)) * this.tilesize - this.offsetY, ry * this.tilesize, this.player.x * this.tilesize - this.offsetX);
            this.playerMesh.rotation.set(0, 0, rev * theta);
        }
        else if (s.dir === 1 && (dir === 0 || dir === 1)) {
            this.playerMesh.position.set(this.player.y * this.tilesize - this.offsetY, ry * this.tilesize, (this.player.x + 0.5 - rev * (rx + 1)) * this.tilesize - this.offsetX);
            this.playerMesh.rotation.set(rev * (-theta + Math.PI / 2), 0, 0);
        }
        else if (s.dir === 2 && (dir === 2 || dir === 3)) {
            this.playerMesh.position.set((this.player.y + 0.5 - rev * (rx + 1)) * this.tilesize - this.offsetY, ry * this.tilesize, this.player.x * this.tilesize - this.offsetX);
            this.playerMesh.rotation.set(0, 0, rev * (theta - Math.PI / 2));
        }
        else if (s.dir === 1 && (dir === 2 || dir === 3)) {
            this.playerMesh.position.set((this.player.y - rev * (rx + 0.5)) * this.tilesize - this.offsetY, ry * this.tilesize, (this.player.x + 0.5) * this.tilesize - this.offsetX);
            this.playerMesh.rotation.set(Math.PI / 2, rev * theta, 0);
        }
        else if (s.dir === 2 && (dir === 0 || dir === 1)) {
            this.playerMesh.position.set((this.player.y + 0.5) * this.tilesize - this.offsetY, ry * this.tilesize, (this.player.x - rev * (rx + 0.5)) * this.tilesize - this.offsetX);
            this.playerMesh.rotation.set(-rev * theta, 0, -Math.PI / 2);
        }
        this.render();
        if(!animate) return;
        requestAnimationFrame(() => {
            this.setPlayerPos(s, dir, deg+5);
        });
    }

    move(key: string): void {
        let dir = -1;
        if (key === "ArrowUp") dir = 0;
        if (key === "ArrowDown") dir = 1;
        if (key === "ArrowLeft") dir = 2;
        if (key === "ArrowRight") dir = 3;
        if (dir === -1) return;
        if (this.onCooldown) return;
        this.onCooldown = true;
        this.setPlayerPos(this.player.copy(), dir, 0);
    }

    update() {
        const occupied = this.player.occupied();
        for (const [x, y] of occupied) {
            if (this.tiles[x][y] === 0) {
                (<HTMLAudioElement>document.getElementById('died')).play();
                alert("You died, you fucking idiot");
                this.player = new State(this.startState.x, this.startState.y, this.startState.dir);
                this.setPlayerPos(this.player, 0, 0, false);
                break;
            }
        }
        if (this.player.isEqual(this.endState)) {
            alert("You won! Good Job.");
            this.player = new State(this.startState.x, this.startState.y, this.startState.dir);
            this.setPlayerPos(this.player, 0, 0, false);
        }
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }
}

class Game {
    board: Board;
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
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]]);
        document.addEventListener("keydown", (e) => {
            this.board.move(e.key);
        });
        this.board.render();
    }
}

const startScreen = document.getElementById('start-screen');
document.getElementById('start-button').addEventListener('click', function() {
    startScreen.remove();
    const game = new Game();
});