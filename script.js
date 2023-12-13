var  playerX = 0 ;
var playerY = 0 ;
var canvas = document.getElementById('gameCanvas');
var ctx = canvas.getContext('2d');
function createGrid() {
    var grid = [];
    for (var i = 0; i < 10; i++) {
       grid[i] = [];
       for (var j = 0; j < 10; j++) {
         if(i&1) grid[i][j] = 1;
       }
    }
    return grid;
   }
   function drawGrid(grid) {
      for (var i = 0; i < 10; i++) {
         for (var j = 0; j < 10; j++) {
           if(grid[i][j]==2) ctx.fillStyle = 'Red' ;
           else if (grid[i][j] == 1) {
             ctx.fillStyle = 'black';
           } else {
             ctx.fillStyle = 'white';
           }
           ctx.fillRect(i * 80, j * 40, 80, 40);
         }
      }
     }
// Function to handle block movement
   document.addEventListener('keydown', function(event) {
    if (event.keyCode == 37) { // Move left
       moveBlock(grid, playerX, playerY, [-1, 0]);
       console.log("hi");
    } else if (event.keyCode == 38) { // Move up
       moveBlock(grid, playerX, playerY, [0, -1]);
    } else if (event.keyCode == 39) { // Move right
       moveBlock(grid, playerX, playerY, [1, 0]);
    } else if (event.keyCode == 40) { // Move down
       moveBlock(grid, playerX, playerY, [0, 1]);
    }
    drawGrid(grid);
   });
   canvas.addEventListener('click', function(event) {
    // Your logic for handling mouse clicks goes here
   });
   function moveBlock(grid, x, y, direction) {
    var newX = x + direction[0];
    var newY = y + direction[1];
   
    if (newX >= 0 && newX < 10  && newY >= 0 && newY < 10 ) {
       grid[y][x] = 0;
       grid[newY][newX] = 2 ;
    }
    playerX = newX ;
    playerY = newY ;
   }
   function switchBlock(grid, x, y) {
    grid[y][x] = grid[y][x] == 0 ? 1 : 0;
   }
var grid = createGrid() ;
drawGrid(grid);

/*
<h1>Number of Key Presses: <span id="count">0</span></h1>
let count = 0;

        document.addEventListener('keydown', (event) => {
            if (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "ArrowLeft" || event.key === "ArrowRight") {
                count++;
                document.getElementById('count').innerText = count;
            }
        });
*/