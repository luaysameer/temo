/* TEMO CRUSH - Match-3 engine (Sector 1: Asteroid Belt) */
(function(){
"use strict";

const COLS = 8, ROWS = 8;
const STORAGE_KEY = "temoCrushProgress";

const LEVELS = [
  {target:600,   moves:25, colors:4},  // 1
  {target:900,   moves:24, colors:4},  // 2
  {target:1300,  moves:23, colors:4},  // 3
  {target:1700,  moves:22, colors:5},  // 4
  {target:2200,  moves:22, colors:5},  // 5
  {target:2700,  moves:21, colors:5},  // 6
  {target:3300,  moves:21, colors:5},  // 7
  {target:3900,  moves:20, colors:5},  // 8
  {target:4600,  moves:20, colors:5},  // 9
  {target:5400,  moves:19, colors:6},  // 10
  {target:6200,  moves:19, colors:6},  // 11
  {target:7000,  moves:18, colors:6},  // 12
  {target:7900,  moves:18, colors:6},  // 13
  {target:8800,  moves:17, colors:6},  // 14
  {target:9800,  moves:17, colors:6},  // 15
  {target:10800, moves:16, colors:6},  // 16
  {target:11900, moves:16, colors:6},  // 17
  {target:13000, moves:15, colors:6},  // 18
  {target:14200, moves:15, colors:6},  // 19
  {target:16000, moves:14, colors:6},  // 20 - boss
];

let board = [];
let nextId = 1;
let cellSize = 0;
let busy = false;
let score = 0, movesLeft = 0, currentLevel = 1, target = 0;
let selected = null;
let pointerStart = null;
let gemEls = new Map();

const boardEl = document.getElementById("board");
const boardBgEl = document.getElementById("boardBg");
const boardWrap = document.getElementById("boardWrap");
const comboLayer = document.getElementById("comboLayer");

/* ---------- progress persistence ---------- */
function loadProgress(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      const p = JSON.parse(raw);
      if(p && typeof p.unlocked === "number") return p;
    }
  }catch(e){}
  return {unlocked:1, stars:{}, best:{}};
}
function saveProgress(){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); }catch(e){}
}
let progress = loadProgress();

function wait(ms){ return new Promise(r=>setTimeout(r,ms)); }

/* ---------- board helpers ---------- */
function randomTypeNoMatch(r,c,colors){
  let t;
  do{
    t = Math.floor(Math.random()*colors);
  }while(
    (c>=2 && board[r][c-1] && board[r][c-2] && board[r][c-1].type===t && board[r][c-2].type===t) ||
    (r>=2 && board[r-1] && board[r-1][c] && board[r-2] && board[r-2][c] && board[r-1][c].type===t && board[r-2][c].type===t)
  );
  return t;
}

function buildBoard(colors){
  board = [];
  for(let r=0;r<ROWS;r++){
    board.push([]);
    for(let c=0;c<COLS;c++){
      const type = randomTypeNoMatch(r,c,colors);
      board[r][c] = {id: nextId++, type, spawnFrom: r-ROWS};
    }
  }
}

function swapCells(r1,c1,r2,c2){
  const tmp = board[r1][c1];
  board[r1][c1] = board[r2][c2];
  board[r2][c2] = tmp;
}

function isAdjacent(a,b){
  return Math.abs(a.r-b.r)+Math.abs(a.c-b.c)===1;
}

function findMatches(){
  const matched = new Set();
  for(let r=0;r<ROWS;r++){
    let runLen=1;
    for(let c=1;c<=COLS;c++){
      const same = c<COLS && board[r][c] && board[r][c-1] && board[r][c].type===board[r][c-1].type;
      if(same){ runLen++; }
      else{
        if(runLen>=3) for(let k=c-runLen;k<c;k++) matched.add(r+","+k);
        runLen=1;
      }
    }
  }
  for(let c=0;c<COLS;c++){
    let runLen=1;
    for(let r=1;r<=ROWS;r++){
      const same = r<ROWS && board[r][c] && board[r-1][c] && board[r][c].type===board[r-1][c].type;
      if(same){ runLen++; }
      else{
        if(runLen>=3) for(let k=r-runLen;k<r;k++) matched.add(k+","+c);
        runLen=1;
      }
    }
  }
  return matched;
}

function applyGravity(colors){
  for(let c=0;c<COLS;c++){
    const colGems = [];
    for(let r=ROWS-1;r>=0;r--){
      if(board[r][c]) colGems.push(board[r][c]);
    }
    const numNew = ROWS - colGems.length;
    for(let r=ROWS-1, idx=0; r>=0; r--, idx++){
      if(idx < colGems.length){
        board[r][c] = colGems[idx];
      }else{
        board[r][c] = {id: nextId++, type: Math.floor(Math.random()*colors), spawnFrom: r-numNew};
      }
    }
  }
}

function hasPossibleMove(){
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      if(c<COLS-1){
        swapCells(r,c,r,c+1);
        const m = findMatches();
        swapCells(r,c,r,c+1);
        if(m.size>0) return true;
      }
      if(r<ROWS-1){
        swapCells(r,c,r+1,c);
        const m = findMatches();
        swapCells(r,c,r+1,c);
        if(m.size>0) return true;
      }
    }
  }
  return false;
}

/* ---------- rendering ---------- */
function layoutBoard(){
  cellSize = boardWrap.clientWidth / COLS;
  boardEl.style.width = (cellSize*COLS)+"px";
  boardEl.style.height = (cellSize*ROWS)+"px";
  boardBgEl.style.width = boardEl.style.width;
  boardBgEl.style.height = boardEl.style.height;
  boardBgEl.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
  boardBgEl.style.gridTemplateRows = `repeat(${ROWS}, 1fr)`;
  if(boardBgEl.children.length !== COLS*ROWS){
    boardBgEl.innerHTML = "";
    for(let i=0;i<COLS*ROWS;i++){
      const cell = document.createElement("div");
      cell.className = "cell-bg";
      boardBgEl.appendChild(cell);
    }
  }
  for(const [id, el] of gemEls){
    el.style.width = cellSize+"px";
    el.style.height = cellSize+"px";
  }
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const cell = board[r][c];
    if(!cell) continue;
    const el = gemEls.get(cell.id);
    if(el){
      el.style.transition = "none";
      el.style.transform = `translate(${c*cellSize}px,${r*cellSize}px)`;
      void el.offsetWidth;
      el.style.transition = "";
    }
  }
}

function render(){
  const seen = new Set();
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      const cell = board[r][c];
      if(!cell) continue;
      seen.add(cell.id);
      const x = c*cellSize, y = r*cellSize;
      let el = gemEls.get(cell.id);
      if(!el){
        el = document.createElement("div");
        el.className = `gem gem-${cell.type}`;
        el.innerHTML = '<div class="gem-shape"><div class="gem-shine"></div></div>';
        el.style.width = cellSize+"px";
        el.style.height = cellSize+"px";
        const startY = (cell.spawnFrom!==undefined ? cell.spawnFrom : r) * cellSize;
        el.style.transition = "none";
        el.style.transform = `translate(${x}px,${startY}px)`;
        boardEl.appendChild(el);
        gemEls.set(cell.id, el);
        void el.offsetWidth;
        el.style.transition = "";
        el.style.transform = `translate(${x}px,${y}px)`;
      }else{
        el.style.transform = `translate(${x}px,${y}px)`;
      }
    }
  }
  for(const [id, el] of gemEls){
    if(!seen.has(id)){
      el.classList.add("removing");
      el.addEventListener("transitionend", ()=>el.remove(), {once:true});
      gemEls.delete(id);
    }
  }
}

function clearSelection(){
  for(const [,el] of gemEls) el.classList.remove("selected");
}

/* ---------- HUD ---------- */
function updateHud(){
  document.getElementById("scoreVal").textContent = score;
  document.getElementById("movesLeft").textContent = movesLeft;
  const lvl = LEVELS[currentLevel-1];
  const maxBar = lvl.target * 1.5;
  const pct = Math.min(100, (score/maxBar)*100);
  document.getElementById("scoreFill").style.width = pct+"%";
  const movesPill = document.getElementById("movesPill");
  movesPill.classList.toggle("warn", movesLeft<=5);

  const marks = document.getElementById("starMarks");
  if(!marks.dataset.built){
    marks.innerHTML = `<span style="left:${(1/1.5)*100}%">★</span><span style="left:${(1.2/1.5)*100}%">★</span><span style="left:100%">★</span>`;
    marks.dataset.built = "1";
  }
  const spans = marks.querySelectorAll("span");
  spans[0].classList.toggle("reached", score>=lvl.target);
  spans[1].classList.toggle("reached", score>=lvl.target*1.2);
  spans[2].classList.toggle("reached", score>=lvl.target*1.5);
}

function showCombo(points, chain){
  const el = document.createElement("div");
  el.className = "combo-pop";
  el.textContent = chain>1 ? `+${points}  COMBO x${chain}!` : `+${points}`;
  el.style.top = (40 + Math.random()*20)+"%";
  comboLayer.appendChild(el);
  setTimeout(()=>el.remove(), 850);
}

function showToast(msg){
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(), 1800);
}

/* ---------- match resolution ---------- */
async function resolveMatches(matches, colors, chain){
  if(matches.size===0) return;
  const count = matches.size;
  const base = count*60 + Math.max(0,count-3)*30;
  const mult = 1 + (chain-1)*0.5;
  const gained = Math.round(base*mult);
  score += gained;
  updateHud();
  showCombo(gained, chain);

  for(const key of matches){
    const [r,c] = key.split(",").map(Number);
    const el = gemEls.get(board[r][c].id);
    if(el) el.classList.add("removing");
    board[r][c] = null;
  }
  await wait(220);
  applyGravity(colors);
  render();
  await wait(280);
  const next = findMatches();
  await resolveMatches(next, colors, chain+1);
}

async function trySwap(r1,c1,r2,c2){
  if(busy) return;
  if(r2<0||r2>=ROWS||c2<0||c2>=COLS) return;
  if(!isAdjacent({r:r1,c:c1},{r:r2,c:c2})) return;
  busy = true;
  const colors = LEVELS[currentLevel-1].colors;

  swapCells(r1,c1,r2,c2);
  render();
  await wait(180);

  let matches = findMatches();
  if(matches.size===0){
    swapCells(r1,c1,r2,c2);
    render();
    await wait(180);
    busy = false;
    return;
  }

  movesLeft--;
  updateHud();
  await resolveMatches(matches, colors, 1);

  if(!hasPossibleMove()){
    await wait(250);
    showToast("لا توجد حركات متاحة - يتم الخلط 🔄");
    do{ buildBoard(colors); }while(!hasPossibleMove());
    render();
    await wait(450);
  }

  checkEnd();
  busy = false;
}

/* ---------- input ---------- */
function cellFromEvent(e){
  const rect = boardEl.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const c = Math.floor(x/cellSize);
  const r = Math.floor(y/cellSize);
  if(r<0||r>=ROWS||c<0||c>=COLS) return null;
  return {r,c};
}

boardEl.addEventListener("pointerdown", (e)=>{
  if(busy) return;
  pointerStart = {cell: cellFromEvent(e), x: e.clientX, y: e.clientY};
});

boardEl.addEventListener("pointerup", (e)=>{
  if(busy || !pointerStart || !pointerStart.cell) { pointerStart=null; return; }
  const dx = e.clientX - pointerStart.x;
  const dy = e.clientY - pointerStart.y;
  const absX = Math.abs(dx), absY = Math.abs(dy);
  const threshold = 14;
  const startCell = pointerStart.cell;

  if(Math.max(absX,absY) > threshold){
    let target;
    if(absX>absY) target = {r:startCell.r, c:startCell.c + (dx>0?1:-1)};
    else target = {r:startCell.r + (dy>0?1:-1), c:startCell.c};
    clearSelection(); selected=null;
    trySwap(startCell.r, startCell.c, target.r, target.c);
  }else{
    if(selected && isAdjacent(selected, startCell)){
      const from = selected;
      selected = null;
      clearSelection();
      trySwap(from.r, from.c, startCell.r, startCell.c);
    }else{
      clearSelection();
      selected = startCell;
      const cell = board[startCell.r][startCell.c];
      const el = gemEls.get(cell.id);
      if(el) el.classList.add("selected");
    }
  }
  pointerStart = null;
});

window.addEventListener("resize", ()=>{
  if(document.getElementById("gameView").classList.contains("active")) layoutBoard();
});

/* ---------- level flow ---------- */
function starsFor(lvl, sc){
  if(sc >= lvl.target*1.5) return 3;
  if(sc >= lvl.target*1.2) return 2;
  if(sc >= lvl.target) return 1;
  return 0;
}

function checkEnd(){
  const lvl = LEVELS[currentLevel-1];
  if(score >= lvl.target){
    onWin(lvl);
  }else if(movesLeft<=0){
    onLose();
  }
}

function onWin(lvl){
  const stars = starsFor(lvl, score);
  const prevStars = progress.stars[currentLevel] || 0;
  if(stars > prevStars) progress.stars[currentLevel] = stars;
  const prevBest = progress.best[currentLevel] || 0;
  if(score > prevBest) progress.best[currentLevel] = score;
  if(currentLevel === progress.unlocked && currentLevel < LEVELS.length){
    progress.unlocked = currentLevel+1;
  }
  saveProgress();

  document.getElementById("modalIcon").textContent = currentLevel===20 ? "☄️" : "🏆";
  document.getElementById("modalTitle").textContent = currentLevel===20 ? "Sector 1 Complete!" : "Level Complete!";
  renderModalStars(stars);
  document.getElementById("modalScore").textContent = score;
  const nextBtn = document.getElementById("nextBtn");
  if(currentLevel < LEVELS.length){
    nextBtn.textContent = "التالي ▶";
    nextBtn.style.display = "";
  }else{
    nextBtn.style.display = "none";
  }
  showModal();
}

function onLose(){
  document.getElementById("modalIcon").textContent = "💥";
  document.getElementById("modalTitle").textContent = "Out of Moves";
  renderModalStars(0);
  document.getElementById("modalScore").textContent = score;
  document.getElementById("nextBtn").style.display = "none";
  showModal();
}

function renderModalStars(stars){
  const el = document.getElementById("modalStars");
  let html = "";
  for(let i=1;i<=3;i++) html += `<span class="${i<=stars?'on':''}">★</span>`;
  el.innerHTML = html;
}

function showModal(){ document.getElementById("modalOverlay").classList.add("show"); }
function hideModal(){ document.getElementById("modalOverlay").classList.remove("show"); }

function startLevel(n){
  currentLevel = n;
  const lvl = LEVELS[n-1];
  score = 0;
  movesLeft = lvl.moves;
  target = lvl.target;

  for(const [,el] of gemEls) el.remove();
  gemEls.clear();
  selected = null;

  buildBoard(lvl.colors);
  while(!hasPossibleMove()) buildBoard(lvl.colors);

  document.getElementById("levelNum").textContent = n;
  document.getElementById("starMarks").dataset.built = "";
  showView("gameView");
  layoutBoard();
  render();
  updateHud();
}

/* ---------- map / navigation ---------- */
function showView(id){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function buildLevelPath(){
  const container = document.getElementById("levelPath");
  let html = "";
  for(let i=1;i<=LEVELS.length;i++){
    const offset = Math.round(Math.sin(i*0.85)*46);
    const isBoss = i===LEVELS.length;
    const unlocked = i <= progress.unlocked;
    const stars = progress.stars[i] || 0;
    html += `<div class="level-node-wrap" style="--off:${offset}px">`;
    html += `<div class="connector ${i===1?'hidden':''} ${unlocked?'lit':''}"></div>`;
    html += `<button class="level-node ${unlocked?'unlocked':'locked'} ${isBoss?'boss':''}" data-level="${i}" ${unlocked?'':'disabled'}>`;
    html += unlocked ? (isBoss?"☄️":i) : "🔒";
    html += `<div class="stars">`;
    for(let s=1;s<=3;s++) html += `<span class="${s<=stars?'on':''}">★</span>`;
    html += `</div></button></div>`;
  }
  container.innerHTML = html;
  container.querySelectorAll(".level-node.unlocked").forEach(btn=>{
    btn.addEventListener("click", ()=>startLevel(parseInt(btn.dataset.level,10)));
  });
}

document.getElementById("backBtn").addEventListener("click", ()=>{
  hideModal();
  buildLevelPath();
  showView("mapView");
});
document.getElementById("mapBtn").addEventListener("click", ()=>{
  hideModal();
  buildLevelPath();
  showView("mapView");
});
document.getElementById("retryBtn").addEventListener("click", ()=>{
  hideModal();
  startLevel(currentLevel);
});
document.getElementById("nextBtn").addEventListener("click", ()=>{
  hideModal();
  if(currentLevel < LEVELS.length) startLevel(currentLevel+1);
});

buildLevelPath();
})();
