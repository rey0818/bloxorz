//@ts-ignore
import * as THREE from 'three';
const omega = 5; //degrees per frame
const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const dirNames = ["Up", "Down", "Left", "Right"];
const deltaPos = [
    [[-2, 0, 1], [1, 0, 1], [0, -2, 2], [0, 1, 2]],
    [[-1, 0, 0], [2, 0, 0], [0, -1, 1], [0, 1, 1]],
    [[-1, 0, 2], [1, 0, 2], [0, -1, 0], [0, 2, 0]]
];
const sess = new onnx.InferenceSession();
const copy = (arr) => arr.map(e => e.slice());
class State {
    x;
    y;
    dir; // 0: stand, 1:down, 2:right
    constructor(x, y, dir) {
        this.x = x;
        this.y = y;
        this.dir = dir;
    }
    move(d) {
        showstep.innerHTML = parseInt(showstep.innerHTML)+1;
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
class Level {
    s;
    e;
    w;
    h;
    map;
    curMapState; // A binary representation of the map state
    constructor(s, e, map) {
        this.map = map;
        this.s = s;
        this.e = e;
        this.w = map.length;
        this.h = map[0].length;
        this.curMapState = 0;
    }
    addPadding() {
        const newMap = [...Array(this.w + 2 * padding)].map(e => Array(this.h + 2 * padding).fill(0));
        for (let x = padding; x < this.w + padding; x++)
            for (let y = padding; y < this.h + padding; y++)
                newMap[x][y] = this.map[x - padding][y - padding];
        const newS = new State(this.s.x + padding, this.s.y + padding, this.s.dir);
        const newE = new State(this.e.x + padding, this.e.y + padding, this.e.dir);
        return new Level(newS, newE, newMap);
    }
    removePadding() {
        const newMap = [...Array(this.w - 2 * padding)].map(e => Array(this.h - 2 * padding).fill(0));
        for (let x = padding; x < this.w - padding; x++)
            for (let y = padding; y < this.h - padding; y++)
                newMap[x - padding][y - padding] = this.map[x][y];
        const newS = new State(this.s.x - padding, this.s.y - padding, this.s.dir);
        const newE = new State(this.e.x - padding, this.e.y - padding, this.e.dir);
        return new Level(newS, newE, newMap);
    }
    toggleMapState(id) {
        this.curMapState ^= 1 << id;
        const ret = [];
        for (let x = 0; x < this.w; x++)
            for (let y = 0; y < this.h; y++)
                if (this.map[x][y] === id + 2)
                    ret.push([x, y]);
        return ret;
    }
    resetMapState() {
        const ret = [];
        while (this.curMapState !== 0) {
            const id = Math.floor(Math.log2(this.curMapState));
            ret.push(...this.toggleMapState(id));
        }
        return ret;
    }
    getButtonID(x, y) {
        if (this.map[x][y] >= -1)
            return -1;
        return -this.map[x][y] - 2;
    }
    isBlock(x, y) {
        if (this.map[x][y] === 0)
            return false;
        if (this.map[x][y] <= 1)
            return true;
        return (this.curMapState & (1 << (this.map[x][y] - 2))) > 0;
    }
    isPermanentBlock(x, y) {
        return this.map[x][y] === 1 || this.map[x][y] <= -2;
    }
    isOnButton(s) {
        const occ = s.occupied();
        for (const [x, y] of occ)
            if (this.getButtonID(x, y) !== -1)
                return this.getButtonID(x, y);
        return -1;
    }
    valid(s) {
        const occupied = s.occupied();
        for (const [x, y] of occupied)
            if (!this.isBlock(x, y))
                return false;
        return true;
    }
    async predict(s) {
        const [w, h] = [this.w - 2 * padding, this.h - 2 * padding];
        const arr = new Float32Array(w * h * 3).fill(0);
        for (let x = 0; x < w; x++)
            for (let y = 0; y < h; y++)
                arr[x * w + y] = this.isBlock(x + padding, y + padding) ? 1 : 0;
        for (const [x, y] of s.occupied())
            arr[(x - padding) * w + (y - padding) + w * h] = 1;
        for (const [x, y] of this.e.occupied())
            arr[(x - padding) * w + (y - padding) + w * h * 2] = 1;
        const inputTensor = new onnx.Tensor(arr, 'float32', [1, 3, w, h]);
        const outputMap = await sess.run([inputTensor]);
        const output = outputMap.values().next().value.data;
        return output;
    }
}
const padding = 2;
class Board {
    canvas;
    renderer;
    camera;
    light;
    scene;
    tileMeshes;
    playerMesh;
    diedSound;
    winsound;
    onCooldown;
    offsetX;
    offsetY;
    tilesize;
    player;
    level;
    constructor(t, canvas) {
        this.tilesize = t;
        this.onCooldown = false;
        this.canvas = canvas;
        this.renderer = new THREE.WebGLRenderer({ antialias: true, canvas: this.canvas });
        const cw = 24 * t, ch = cw * (this.canvas.height / this.canvas.width), near = 0.1, far = 100;
        this.camera = new THREE.OrthographicCamera(-cw / 2, cw / 2, ch / 2, -ch / 2, near, far);
        this.camera.position.set(3, 7, 9);
        this.camera.lookAt(0, 0, 0);
        this.scene = new THREE.Scene();
        this.light = new THREE.DirectionalLight(0xffffff, 1);
        this.light.position.set(4, 3, 2);
        this.scene.add(this.light);
        const ambient = new THREE.AmbientLight(0xffffff, 0.3);
        this.scene.add(ambient);
        this.diedSound = new Audio('music1.mp3');
        this.winsound = new Audio('music2.mp3');
    }
    initMap(lvl) {
        this.level = lvl.addPadding();
        this.player = this.level.s.copy();
        this.tileMeshes = [];
        const tilegeometry = new THREE.BoxGeometry(this.tilesize * 0.9, this.tilesize * 0.4, this.tilesize * 0.9);
        const playergeometry = new THREE.BoxGeometry(this.tilesize, this.tilesize * 2, this.tilesize);
        const permtilematerial = new THREE.MeshPhongMaterial({ color: 0x44dd77 });
        const temptilematerial = new THREE.MeshPhongMaterial({ color: 0xaaaaaa });
        const buttonmaterial = new THREE.MeshPhongMaterial({ color: 0xffaa00 });
        const endmaterial = new THREE.MeshPhongMaterial({ color: 0x0000ff });
        const playermaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
        this.offsetX = this.level.w * this.tilesize / 2;
        this.offsetY = this.level.h * this.tilesize / 2;
        this.playerMesh = new THREE.Mesh(playergeometry, playermaterial);
        this.setPlayerPos(this.player, 0, 0, false);
        for (let x = 0; x < this.level.w; x++) {
            this.tileMeshes.push([]);
            for (let y = 0; y < this.level.h; y++) {
                const isExit = this.level.e.x === x && this.level.e.y === y;
                const isPerm = this.level.isPermanentBlock(x, y);
                const isButton = this.level.getButtonID(x, y) !== -1;
                const cube = new THREE.Mesh(tilegeometry, isButton ? buttonmaterial : isExit ? endmaterial : isPerm ? permtilematerial : temptilematerial);
                cube.position.set(y * this.tilesize - this.offsetY, -tilegeometry.parameters.height / 2, x * this.tilesize - this.offsetX);
                this.tileMeshes[x].push(cube);
                this.scene.add(cube);
                if (!this.level.isBlock(x, y))
                    cube.visible = false;
            }
        }
        this.scene.add(this.playerMesh);
    }
    setPlayerPos(s, dir, deg, animate = true) {
        if (deg > 90) {
            this.player = this.player.move(dir);
            this.setPlayerPos(this.player, 0, 0, false);
            if (!this.level.valid(this.player))
                this.initfall(dir);
            else {
                this.onCooldown = false;
                this.update();
                this.render();
            }
            return;
        }
        const theta = Board.rad(deg);
        let x = 0, y = 0, rx = 0, ry = 0;
        if (s.dir === 0)
            x = -0.5, y = 1;
        else if ((s.dir === 1 && (dir === 0 || dir === 1)) || (s.dir === 2 && (dir === 2 || dir === 3)))
            x = -1, y = 0.5;
        else
            x = -0.5, y = 0.5;
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
        if (!animate)
            return;
        requestAnimationFrame(() => {
            this.setPlayerPos(s, dir, deg + omega);
        });
    }
    initfall(dir) {
        const v = this.tilesize * Board.rad(omega); // v=rw
        if (this.player.dir === 0)
            this.fall([dirs[dir][0] * v, -v / 2, dirs[dir][1] * v], dir);
        else {
            const occupied = this.player.occupied();
            for (let i = 0; i < occupied.length; i++) {
                const [x, y] = occupied[i];
                if (this.level.isBlock(x, y)) {
                    if (i === 0)
                        this.trip((this.player.dir - 1) * 2 + 1, 0);
                    else
                        this.trip((this.player.dir - 1) * 2, 0);
                    return;
                }
            }
            const roll = Math.floor(dir / 2) + 1 !== this.player.dir;
            if (roll)
                this.fall([dirs[dir][0] * v / 2, -v / 2, dirs[dir][1] * v / 2], dir);
            else
                this.fall([dirs[dir][0] * v / 2, -v, dirs[dir][1] * v / 2], dir);
        }
    }
    trip(dir, deg) {
        if (deg > 90) {
            const v = this.tilesize * Board.rad(omega);
            this.fall([0, -v / 2, 0], dir);
            return;
        }
        const theta = Board.rad(deg);
        const rx = Math.sin(theta) * 0.5;
        const ry = Math.cos(theta) * 0.5;
        let pos = [this.player.y * this.tilesize - this.offsetY, 0, this.player.x * this.tilesize - this.offsetX];
        if (this.player.dir === 1)
            pos[2] += this.tilesize / 2;
        if (this.player.dir === 2)
            pos[0] += this.tilesize / 2;
        pos[2 - Math.floor(dir / 2) * 2] += rx * this.tilesize * (dir % 2 === 0 ? -1 : 1);
        pos[1] += ry * this.tilesize;
        this.playerMesh.position.set(pos[0], pos[1], pos[2]);
        if (dir === 0)
            this.playerMesh.rotation.set(Math.PI / 2 - theta, 0, 0);
        if (dir === 1)
            this.playerMesh.rotation.set(Math.PI / 2 + theta, 0, 0);
        if (dir === 2)
            this.playerMesh.rotation.set(0, 0, Math.PI / 2 + theta);
        if (dir === 3)
            this.playerMesh.rotation.set(0, 0, Math.PI / 2 - theta);
        this.render();
        requestAnimationFrame(() => {
            this.trip(dir, deg + omega);
        });
    }
    fall(vel, dir) {
        if (vel[1] < -2) {
            this.onCooldown = false;
            this.restart();
            this.render();
            return;
        }
        this.playerMesh.position.x += vel[2];
        this.playerMesh.position.y += vel[1];
        this.playerMesh.position.z += vel[0];
        this.playerMesh.rotateOnWorldAxis(new THREE.Vector3(1, 0, 0), dirs[dir][0] * Board.rad(omega));
        this.playerMesh.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), -dirs[dir][1] * Board.rad(omega));
        this.render();
        requestAnimationFrame(() => {
            this.fall([vel[0], vel[1] - 0.03, vel[2]], dir);
        });
    }
    async predictMove() {
        if (this.onCooldown)
            return;
        const output = await this.level.predict(this.player);
        let max = 0, maxi = 0, details = "";
        for (let i = 0; i < 4; i++) {
            if (output[i] > max) {
                max = output[i];
                maxi = i;
            }
            details += `${(output[i] * 100).toFixed(3)}% confident going ${dirNames[i]}\n`;
        }
        this.move("Arrow" + dirNames[maxi]);
        console.log(details);
    }
    update() {
        const id = this.level.isOnButton(this.player);
        if (id !== -1) {
            const affected = this.level.toggleMapState(id);
            for (const [x, y] of affected)
                this.tileMeshes[x][y].visible = !this.tileMeshes[x][y].visible;
        }
        if (this.player.isEqual(this.level.e)) {
            this.onCooldown = true;
            this.winsound.play();
            showstep.innerHTML = "0";
            alert("You won! Good Job.");
            setTimeout(() => { game.nextLevel(); }, 0);
        }
    }
    restart() {
        showstep.innerHTML = "0";
        this.diedSound.play();
        virtualkeyboard.style.display = "none";
        document.getElementById("gameover").style.display = "grid";
        this.player = this.level.s.copy();
        this.setPlayerPos(this.player, 0, 0, false);
        const affected = this.level.resetMapState();
        for (const [x, y] of affected)
            this.tileMeshes[x][y].visible = !this.tileMeshes[x][y].visible;
    }
    move(key) {
        let dir = dirNames.indexOf(key.substring(5));
        if (dir === -1)
            return;
        if (this.onCooldown)
            return;
        this.onCooldown = true;
        this.setPlayerPos(this.player.copy(), dir, 0);
    }
    render() {
        this.renderer.render(this.scene, this.camera);
    }
    volumechange(e) {
        this.winsound.volume = e;
        this.diedSound.volume = e;
    }
    static rad(deg) {
        return deg * Math.PI / 180;
    }
}
class Game {
    board;
    canvas;
    shown;
    levels;
    curLevel;
    dialogElement;
    constructor(lvls, curLevel = 0) {
        this.canvas = document.createElement('canvas');
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        document.body.appendChild(this.canvas);
        this.canvas.hidden = true;
        this.shown = false;
        this.levels = lvls;
        this.curLevel = curLevel;
        this.dialogElement = document.getElementById("dialog");
        for (let i = 0; i < this.levels.length; i++) {
            const btn = document.createElement('button');
            btn.className = 'levelbtn';
            btn.innerText = `Level ${i + 1}`;
            btn.addEventListener('click', () => {
                this.curLevel = i;
                startscreen.style.display = "none";
                this.show();
                this.updateMap(i);
                this.dialogElement.close();
                showstep.innerHTML = "0";
            });
            document.querySelector('.lvl-container').appendChild(btn);
        }
        this.updateMap(curLevel);
    }
    keydown = (e) => {
        this.board.move(e.key);
    };
    updateMap(index) {
        this.board = new Board(0.7, this.canvas);
        this.board.initMap(this.levels[index]);
        this.board.render();
    }
    nextLevel() {
        this.curLevel = (this.curLevel + 1) % this.levels.length;
        this.updateMap(this.curLevel);
        showlevel.innerHTML = (this.curLevel + 1).toString();
    }
    show() {
        if (this.shown)
            return;
        document.addEventListener("keydown", this.keydown, false);
        this.canvas.hidden = false;
        this.shown = true;
    }
    hide() {
        if (!this.shown)
            return;
        document.removeEventListener("keydown", this.keydown, false);
        this.canvas.hidden = true;
        this.shown = false;
    }
}
const levels = [
    new Level(new State(0, 3, 0), new State(9, 6, 0), [
        [1, -2, 1, 1, 2, 2, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 1, 1, 1, 1, 1, 0, 1],
        [1, -3, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 1, 0, 1, 1, 0, 1, 0, 1],
        [1, 0, 1, 0, 1, 1, 0, 1, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 1, 1, 1, 1, 1, 1, 0, 1],
        [1, 3, 3, 3, 3, 3, 3, 3, 3, 1],
        [1, 1, 1, 1, 0, 0, 1, 1, 1, 1]
    ]),
    new Level(new State(7, 7, 0), new State(2, 8, 0), [
        [0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
        [0, 0, 1, 1, 1, 0, 0, 0, 1, 1],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 1],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 1, 1, 1, 0, 0, 1, 1, 1, 0],
        [0, 1, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 1, 1, 1, 1, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 1, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ]),
    new Level(new State(0, 3, 0), new State(9, 6, 0), [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
        [1, 0, 0, 1, 1, 1, 0, 1, 0, 0],
        [1, 0, 0, 0, 1, 1, 0, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 0, 1, 1, 1],
        [1, 0, 1, 1, 1, 1, 0, 1, 1, 1],
        [1, 0, 0, 0, 0, 1, 1, 0, 0, 1],
        [1, 1, 1, 1, 0, 0, 1, 1, 1, 1]
    ]),
    new Level(new State(0, 2, 0), new State(9, 6, 0), [
        [1, 1, 1, 0, 0, 1, 1, 1, 1, 0],
        [1, 1, 1, 0, 0, 1, 1, 1, 1, 0],
        [1, 1, 1, 0, 0, 1, 1, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        [1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 1, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [1, 1, 1, 1, 0, 0, 1, 1, 1, 0]
    ]),
    new Level(new State(0, 1, 0), new State(6, 5, 0), [
        [0, 1, 0, 0, 0, 0, 0, 0, 1, 0],
        [1, 1, 1, 0, 0, 0, 0, 1, 1, 1],
        [1, 1, 1, 1, 0, 0, 1, 1, 1, 1],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
        [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
        [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 0, 0, 0, 0, 0, 0, 1, 1]
    ])
];
const game = new Game(levels);
const startscreen = document.getElementById("start-screen");
const startBtn = document.getElementById("start-button");
const showBtn = document.getElementById("setting-button");
const closeBtn = document.querySelector(".close");
const homebtn = document.getElementById("homebtn");
const homebtn2 = document.getElementById("homebtn2");
const tryagain = document.getElementById("gameoverbtn");
const slider = document.getElementById("slider");
const volume = document.getElementById("volume");
const audiobtnopen = document.getElementById("audiobtnopen");
const audiobtnclose = document.getElementById("audiobtnclose");
const virtualkeyboard = document.getElementById("virtual-keyboard");
const showlevel = document.getElementById("showlevel");
const showstep = document.getElementById("showstep");
showstep.innerHTML = "0";
showlevel.innerHTML = "1";
volume.innerHTML = "50";
const loadingModelPromise = sess.loadModel("./train/model.onnx");
loadingModelPromise.then(() => {
    console.log("model loaded");
    startBtn.addEventListener('click', function () {
        startscreen.style.display = "none";
        virtualkeyboard.style.display = "inherit";
        game.show();
    });
});
showBtn.addEventListener("click", function () {
    game.dialogElement.showModal();
});
closeBtn.addEventListener("click", function () {
    game.dialogElement.close();
});
homebtn.addEventListener("click", function () {
    game.hide();
    game.dialogElement.close();
    startscreen.style.display = "grid";
});
homebtn2.addEventListener("click", function () {
    game.hide();
    game.dialogElement.close();
    document.getElementById("gameover").style.display = "none";
    startscreen.style.display = "grid";
});
document.addEventListener("keydown", function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && document.getElementById("gameover").style.display === "grid") {
        document.getElementById("gameover").style.display = "none";
        virtualkeyboard.style.display = "inherit";
        game.show();
    }
    else if (e.key == ';') {
        game.board.predictMove();
    }
});
tryagain.addEventListener("click", function () {
    document.getElementById("gameover").style.display = "none";
    virtualkeyboard.style.display = "inherit";
    game.show();
});
slider.addEventListener('change', function (e) {
    const target = e.target;
    game.board.volumechange(parseInt(target.value) / 100);
    volume.innerHTML = target.value;
});
audiobtnopen.addEventListener("click", function () {
    document.getElementById("Audio").style.display = "grid";
});
audiobtnclose.addEventListener("click", function () {
    document.getElementById("Audio").style.display = "none";
});
document.querySelector(".left-btn").addEventListener("click", function () {
    game.board.move("ArrowLeft");
});
document.querySelector(".right-btn").addEventListener("click", function () {
    game.board.move("ArrowRight");
});
document.querySelector(".up-btn").addEventListener("click", function () {
    game.board.move("ArrowUp");
});
document.querySelector(".down-btn").addEventListener("click", function () {
    game.board.move("ArrowDown");
});
document.querySelector(".ai-btn").addEventListener("click", function () {
    game.board.predictMove();
});
