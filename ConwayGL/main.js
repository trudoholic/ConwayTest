const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl");

const SIZE = 8;
let nRows = 100, nCols = 100;
let dx = 2 / nCols, dy = 2 / nRows;
let delay = 500;
let isGenerating = false;
let isRunning = false;
let step = 0;

let cells = Object.create(null);
let vertices = [];

function drawGL() {
  const vertex_buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  const vertCode = `
  attribute vec3 coordinates;
  void main(void) {
    gl_Position = vec4(coordinates, 1.0);
    gl_PointSize = ${SIZE}.0;
  }`;

  const vertShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertShader, vertCode);
  gl.compileShader(vertShader);

  const fragCode = `
  void main(void) {
   gl_FragColor = vec4(0.0, 0.0, 0.0, 0.1);
  }`;

  const fragShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragShader, fragCode);
  gl.compileShader(fragShader);

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertShader);
  gl.attachShader(shaderProgram, fragShader);
  gl.linkProgram(shaderProgram);
  
  gl.useProgram(shaderProgram);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);

  const coord = gl.getAttribLocation(shaderProgram, "coordinates");
  gl.vertexAttribPointer(coord, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(coord);

  gl.clearColor(0.5, 0.5, 0.5, 0.9);
  gl.enable(gl.DEPTH_TEST);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.drawArrays(gl.POINTS, 0, vertices.length);
}

function init() {
  cells = Object.create(null);
  resize();
  addGlider();
  updateGL();
}

init();

function doSize() {
  const input = document.getElementById("i_size");
  const newSize = +input.value;
  if (newSize && newSize !== nRows) {
    nRows = newSize;
    nCols = newSize;
    dx = 2 / nCols;
    dy = 2 / nRows;
    init();
  }
}

function doDelay() {
  const input = document.getElementById("i_delay");
  if (input.value) {
    delay = +input.value;
  }
}

function toggleRun() {
  isRunning = !isRunning;
  
  const btnRun = document.getElementById("b_run");
  btnRun.innerHTML = isRunning ? "Stop" : "Run";
  
  const btnAdd = document.getElementById("b_add");
  btnAdd.disabled = isRunning;
  
  const btnSize = document.getElementById("b_size");
  btnSize.disabled = isRunning;
  
  if (isRunning) {
    setTimeout(doStep, delay);
  }
}

function resize() {
  canvas.width = nCols * SIZE;
  canvas.height = nRows * SIZE;
}

function getId(row, col) {
  return row * nCols + col;
}

function getRowCol(id) {
  return {row: Math.floor(id / nCols), col: id % nCols};
}

function addCell(row, col) {
  const id = getId(row, col);
  const cell = cells[id];
  if (cell && cell.live) {
    return;
  }
  
  [-1,0,1].forEach(dRow => {
    [-1,0,1].forEach(dCol => {
      const curRow = (row + dRow + nRows) % nRows;
      const curCol = (col + dCol + nCols) % nCols;
      const id = getId(curRow, curCol);
      const cell = cells[id] || { live: false, neighbours: 0 };
      
      if (dRow || dCol) {
        cell.neighbours += 1;
      }
      else {
        cell.live = true;
      }
      
      cells[id] = cell;
    });
  });
}

function removeCell(row, col) {
  const id = getId(row, col);
  const cell = cells[id];
  if (!cell || !cell.live) {
    return;
  }
  
  [-1,0,1].forEach(dRow => {
    [-1,0,1].forEach(dCol => {
      const curRow = (row + dRow + nRows) % nRows;
      const curCol = (col + dCol + nCols) % nCols;
      const id = getId(curRow, curCol);
      const cell = cells[id];
      
      if (cell) {
        if (dRow || dCol) {
          cell.neighbours -= 1;
        }
        else {
          cell.live = false;
        }
        
        cells[id] = cell;
      }
    });
  });
}

function rnd(n) {
  return Math.floor(Math.random() * n);
}

function addRandom(n, limRow = nRows, limCol = nCols) {
  while (n --> 0) {
    let row = 0, col = 0, id = 0, cnt = 0;
    do {
      row = rnd(limRow);
      col = rnd(limCol);
      id = getId(row, col);
    }
    while (cells[id] && 1024 > cnt++);
    addCell(row, col);
  }
}

function addPattern(cells) {
  cells.forEach(cell => {
    addCell(cell[0], cell[1]);
  });
}

function addGlider() {
  addPattern([
    [0, 1],
    [1, 2],
    [2, 0],
    [2, 1],
    [2, 2],
  ]);
}

function addRandomCells() {
  const input = document.getElementById("i_add");
  let n = input.value;
  n = n > 0 ? n : 12;
  addRandom(n);
  updateGL();
}

function generateCells() {
  if (isGenerating) return;
  isGenerating = true;
  const startTime = performance.now();
  
  let addList = []
  let removeList = []
  
  for (let id in cells) {
    const cell = cells[id];
    if (cell.live) {
      if (2 > cell.neighbours || cell.neighbours > 3) {
        removeList.push(id)
      }
    }
    else {
      if (3 === cell.neighbours) {
        addList.push(id)
      }
    }
  }
  
  addList.forEach(id => {
    const cell = getRowCol(id);
    addCell(cell.row, cell.col);
  });
  
  removeList.forEach(id => {
    const cell = getRowCol(id);
    removeCell(cell.row, cell.col);
  });
  
  const endTime = performance.now();
  const timeLabel = document.getElementById("time");
  timeLabel.innerHTML = `Generation time: ${(endTime - startTime).toFixed(4)} ms`;
  
  const stepLabel = document.getElementById("step");
  stepLabel.innerHTML = `Step: ${step++}`;
  isGenerating = false;
}

function updateGL() {
  vertices = [];
  Object.keys(cells).forEach(id => {
    const cell = cells[id];
    if (cell.live) {
      const cellRC = getRowCol(id);
      vertices.push((cellRC.col + 0.5) * dx - 1);
      vertices.push(1 - (cellRC.row + 0.5) * dy);
      vertices.push(0.0);
    }
  });
  drawGL();
}

function doStep() {
  generateCells();
  updateGL();

  if (isRunning) {
    setTimeout(doStep, delay);
  }
}

document.addEventListener("mouseup", toggleCell);

function toggleCell(e) {
  if (isRunning) {
    return;
  }
  const row = Math.floor((e.pageY - canvas.offsetTop) / SIZE);
  const col = Math.floor((e.pageX - canvas.offsetLeft) / SIZE);
  if (0 > row || row >= nRows || 0 > col || col >= nCols) {
    return;
  }
  
  const cell = cells[getId(row, col)];
  if (cell && cell.live) {
    removeCell(row, col);
  }
  else {
    addCell(row, col);
  }
  
  updateGL();
}
