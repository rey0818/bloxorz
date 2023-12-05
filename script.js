function createGrid() {
    var grid = [];
    for (var i = 0; i < 8; i++) {
       grid[i] = [];
       for (var j = 0; j < 8; j++) {
         grid[i][j] = 1;
       }
    }
    return grid;
   }
// Function to handle block movement
function moveBlock(grid, x, y, direction) {
    // Your logic for block movement goes here
   }
   document.addEventListener('keydown', function(event) {
    if (event.key == 37) { // Move left
       moveBlock(grid, playerX, playerY, [-1, 0]);
    } else if (event.key == 38) { // Move up
       moveBlock(grid, playerX, playerY, [0, -1]);
    } else if (event.key == 39) { // Move right
       moveBlock(grid, playerX, playerY, [1, 0]);
    } else if (event.key == 40) { // Move down
       moveBlock(grid, playerX, playerY, [0, 1]);
    }
   });
   canvas.addEventListener('click', function(event) {
    // Your logic for handling mouse clicks goes here
   });
   function drawGrid(grid) {
    for (var i = 0; i < 8; i++) {
       for (var j = 0; j < 8; j++) {
         if (grid[i][j] == 1) {
           ctx.fillStyle = 'black';
         } else {
           ctx.fillStyle = 'white';
         }
         ctx.fillRect(j * 100, i * 100, 100, 100);
       }
    }
   }
   function moveBlock(grid, x, y, direction) {
    var newX = x + direction[0];
    var newY = y + direction[1];
   
    if (newX >= 0 && newX < 8 && newY >= 0 && newY < 8) {
       grid[newY][newX] = grid[y][x];
       grid[y][x] = 0;
    }
   }
   function switchBlock(grid, x, y) {
    grid[y][x] = grid[y][x] == 0 ? 1 : 0;
   }
createGrid() ;
drawGrid(grid);