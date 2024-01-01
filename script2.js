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
    constructor(s, e, map) {
        this.map = map;
        this.s = s;
        this.e = e;
        this.w = map.length;
        this.h = map[0].length;
    }
    async predict(s) {
        const arr = new Float32Array(this.w * this.h * 3).fill(0);
        for (let x = 0; x < this.w; x++)
            for (let y = 0; y < this.h; y++)
                arr[x * this.w + y] = this.map[x][y];
        for (const [x, y] of s.occupied())
            arr[(x - padding) * this.w + (y - padding) + this.w * this.h] = 1;
        for (const [x, y] of this.e.occupied())
            arr[x * this.w + y + this.w * this.h * 2] = 1;
        const inputTensor = new onnx.Tensor(arr, 'float32', [1, 3, this.w, this.h]);
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
    onCooldown;
    offsetX;
    offsetY;
    width;
    height;
    tilesize;
    tiles;
    player;
    startState;
    endState;
    constructor(w, h, t, canvas) {
        w = w + 2 * padding;
        h = h + 2 * padding;
        this.width = w;
        this.height = h;
        this.tilesize = t;
        this.onCooldown = false;
        this.canvas = canvas;
        this.renderer = new THREE.WebGLRenderer({ antialias: true, canvas: this.canvas });
        const cw = (w + h) * t, ch = cw * (this.canvas.height / this.canvas.width), near = 0.1, far = 100;
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
    initMap(s, e, t) {
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
    setPlayerPos(s, dir, deg, animate = true) {
        if (deg > 90) {
            this.player = this.player.move(dir);
            this.setPlayerPos(this.player, 0, 0, false);
            if (!this.valid(this.player))
                this.initfall(dir);
            else {
                this.onCooldown = false;
                this.update();
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
                if (this.tiles[x][y] === 1) {
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
        const lvl = new Level(this.startState, this.endState, this.tiles);
        const output = await lvl.predict(this.player);
        let max = 0, maxi = 0;
        for (let i = 0; i < 4; i++)
            if (output[i] > max) {
                max = output[i];
                maxi = i;
            }
        this.move("Arrow" + dirNames[maxi]);
    }
    update() {
        if (this.player.isEqual(this.endState)) {
            this.winsound.play();
            alert("You won! Good Job.");
            this.player = this.startState.copy();
            this.setPlayerPos(this.player, 0, 0, false);
        }
    }
    restart() {
        this.diedSound.play();
        document.getElementById("gameover").style.display = "grid" ;
        this.player = this.startState.copy();
        this.setPlayerPos(this.player, 0, 0, false);
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
    update() {
        const occupied = this.player.occupied();
        for (const [x, y] of occupied) {
            if (this.tiles[x][y] === 0) {
                this.diedSound.play();
                document.getElementById("gameover").style.display = "grid" ;
                this.player = new State(this.startState.x, this.startState.y, this.startState.dir);
                this.setPlayerPos(this.player, 0, 0, false);
                break;
            }
        }
        if (this.player.isEqual(this.endState)) {
            this.winsound.play();
            alert("You won! Good Job.");
            this.player = new State(this.startState.x, this.startState.y, this.startState.dir);
            this.setPlayerPos(this.player, 0, 0, false);
        }
    }
    render() {
        this.renderer.render(this.scene, this.camera);
    }
    valid(s) {
        const occupied = s.occupied();
        for (const [x, y] of occupied)
            if (this.tiles[x][y] === 0)
                return false;
        return true;
    }
    static rad(deg) {
        return deg * Math.PI / 180;
    }
    volumechange(e){
        this.winsound.volume = e ;
        this.diedSound.volume = e ; 
    }
}
class Game {
    board;
    canvas;
    shown;
    levels;
    dialogElement;
    constructor(lvls) {
        this.canvas = document.createElement('canvas');
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        document.body.appendChild(this.canvas);
        this.canvas.hidden = true;
        this.shown = false;
        this.levels = lvls;
        this.dialogElement = document.getElementById("dialog");
        for (let i = 0; i < this.levels.length; i++) {
            const btn = document.createElement('button');
            btn.className = 'levelbtn' ;
            btn.innerText = `Level ${i + 1}`;
            btn.addEventListener('click', () => {
                this.updateMap(i);
                this.dialogElement.close();
            });
            document.querySelector('.lvl-container').appendChild(btn);
        }
    }
    keydown = (e) => {
        this.board.move(e.key);
    };
    updateMap(index) {
        this.board = new Board(10, 10, 0.7, this.canvas);
        this.board.initMap(this.levels[index].s, this.levels[index].e, this.levels[index].map);
        this.board.render();
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
        [1, 1, 1, 1, 0, 0, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 1, 1, 1, 1, 1, 1, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 1, 0, 1, 1, 0, 1, 0, 1],
        [1, 0, 1, 0, 1, 1, 0, 1, 0, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 0, 1, 1, 1, 1, 1, 1, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
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
    ])
];
const game = new Game(levels);

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
volume.innerHTML = 50 ;

game.updateMap(0);
const loadingModelPromise = sess.loadModel("./train/model.onnx");
loadingModelPromise.then(() => {
    console.log("model loaded");
    startBtn.addEventListener('click', function () {
        document.getElementById("start-screen").style.display = "none";
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
    document.getElementById("start-screen").style.display = "grid";
});
homebtn2.addEventListener("click",function(){
    game.hide();
    game.dialogElement.close();
    document.getElementById("gameover").style.display = "none" ;
    document.getElementById("start-screen").style.display = "grid";
});
document.addEventListener("keydown",function(e){
    if((e.key==='Enter' || e.key===' ') && document.getElementById("gameover").style.display === "grid"){
        document.getElementById("gameover").style.display = "none" ;
        game.show();
    }
})
tryagain.addEventListener("click",function(){
    document.getElementById("gameover").style.display = "none" ;
    game.show();
});
slider.addEventListener('change',function(e){
    game.board.volumechange(e.target.value/100);
    volume.innerHTML = e.target.value;
});
audiobtnopen.addEventListener("click",function(){
    document.getElementById("Audio").style.display = "grid" ;
});
audiobtnclose.addEventListener("click",function(){
    document.getElementById("Audio").style.display = "none" ;
});