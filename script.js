// 獲取 canvas 和 context
var canvas = document.querySelector('canvas');
var ctx = canvas.getContext('2d');

// 繪製起始介面
ctx.fillStyle = 'black'; // 設置填充顏色為黑色
ctx.fillRect(0, 0, canvas.width, canvas.height); // 繪製一個填滿整個 canvas 的矩形

// 繪製標題
ctx.font = '50px Arial';
ctx.fillStyle = 'white';
ctx.textAlign = 'center';
ctx.fillText('遊戲標題', canvas.width / 2, canvas.height / 2 - 50); // 在 canvas 中央上方繪製標題

// 繪製開始按鈕
ctx.beginPath();
ctx.rect(canvas.width / 2 - 50, canvas.height / 2, 100, 50); // 繪製一個矩形在 canvas 中央
ctx.fillStyle = 'blue'; // 設置填充顏色為藍色
ctx.fill(); // 填充矩形
ctx.closePath();

// 添加按鈕文字
ctx.font = '20px Arial';
ctx.fillStyle = 'white';
ctx.fillText('開始', canvas.width / 2, canvas.height / 2 + 30); // 在矩形內部繪製文字

// 監聽點擊事件
canvas.addEventListener('click', function(event) {
  var x = event.clientX - canvas.offsetLeft;
  var y = event.clientY - canvas.offsetTop;

  // 檢查點擊是否在開始按鈕上
  if (x > canvas.width / 2 - 50 && x < canvas.width / 2 + 50 && y > canvas.height / 2 && y < canvas.height / 2 + 50) {
    // 開始按鈕被點擊，進行相應的處理
    console.log('開始按鈕被點擊');
    // 這裡可以開始遊戲，例如創建一個新的 Game 實例
  }
});
/*var  playerX = 0 ;
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