/* TEMO CRUSH - Match-3 engine (Sector 1: Asteroid Belt, Sector 2: Gas Giant) */
(function(){
"use strict";

const COLS = 8, ROWS = 8;
const STORAGE_KEY = "temoCrushProgress";

const LEVELS_S1 = [
  {target:600,   moves:25, colors:4, frozen:0},  // 1
  {target:900,   moves:24, colors:4, frozen:0},  // 2
  {target:1300,  moves:23, colors:4, frozen:0},  // 3
  {target:1700,  moves:22, colors:5, frozen:0},  // 4
  {target:2200,  moves:22, colors:5, frozen:0},  // 5
  {target:2700,  moves:21, colors:5, frozen:0},  // 6
  {target:3300,  moves:21, colors:5, frozen:0},  // 7
  {target:3900,  moves:20, colors:5, frozen:0},  // 8
  {target:4600,  moves:20, colors:5, frozen:0},  // 9
  {target:5400,  moves:19, colors:6, frozen:0},  // 10
  {target:6200,  moves:19, colors:6, frozen:0},  // 11
  {target:7000,  moves:18, colors:6, frozen:0},  // 12
  {target:7900,  moves:18, colors:6, frozen:0},  // 13
  {target:8800,  moves:17, colors:6, frozen:0},  // 14
  {target:9800,  moves:17, colors:6, frozen:0},  // 15
  {target:10800, moves:16, colors:6, frozen:0},  // 16
  {target:11900, moves:16, colors:6, frozen:0},  // 17
  {target:13000, moves:15, colors:6, frozen:0},  // 18
  {target:14200, moves:15, colors:6, frozen:0},  // 19
  {target:16000, moves:14, colors:6, frozen:0},  // 20 - sector boss
];

const LEVELS_S2 = [
  {target:14000, moves:24, colors:5, frozen:2},  // 21
  {target:15500, moves:23, colors:5, frozen:3},  // 22
  {target:17000, moves:23, colors:6, frozen:3},  // 23
  {target:18500, moves:22, colors:6, frozen:4},  // 24
  {target:20000, moves:22, colors:6, frozen:4},  // 25
  {target:22000, moves:21, colors:6, frozen:5},  // 26
  {target:24000, moves:21, colors:6, frozen:5},  // 27
  {target:26000, moves:20, colors:6, frozen:6},  // 28
  {target:28000, moves:20, colors:6, frozen:6},  // 29
  {target:31000, moves:19, colors:6, frozen:7},  // 30
  {target:33000, moves:19, colors:6, frozen:7},  // 31
  {target:35000, moves:18, colors:6, frozen:8},  // 32
  {target:37000, moves:18, colors:6, frozen:8},  // 33
  {target:39000, moves:17, colors:6, frozen:9},  // 34
  {target:42000, moves:17, colors:6, frozen:9},  // 35
  {target:45000, moves:16, colors:6, frozen:10}, // 36
  {target:48000, moves:16, colors:6, frozen:10}, // 37
  {target:51000, moves:15, colors:6, frozen:11}, // 38
  {target:54000, moves:15, colors:6, frozen:11}, // 39
  {target:60000, moves:14, colors:6, frozen:13}, // 40 - sector boss
];

const LEVELS_S3 = [
  {target:55000,  moves:24, colors:6, frozen:0, comet:1},   // 41
  {target:60000,  moves:23, colors:6, frozen:0, comet:1},   // 42
  {target:65000,  moves:23, colors:6, frozen:0, comet:2},   // 43
  {target:70000,  moves:22, colors:6, frozen:0, comet:2},   // 44
  {target:76000,  moves:22, colors:6, frozen:0, comet:3},   // 45
  {target:82000,  moves:21, colors:6, frozen:0, comet:3},   // 46
  {target:88000,  moves:21, colors:6, frozen:0, comet:4},   // 47
  {target:95000,  moves:20, colors:6, frozen:0, comet:4},   // 48
  {target:102000, moves:20, colors:6, frozen:0, comet:5},   // 49
  {target:110000, moves:19, colors:6, frozen:0, comet:5},   // 50
  {target:118000, moves:19, colors:6, frozen:0, comet:6},   // 51
  {target:126000, moves:18, colors:6, frozen:0, comet:6},   // 52
  {target:135000, moves:18, colors:6, frozen:0, comet:7},   // 53
  {target:144000, moves:17, colors:6, frozen:0, comet:7},   // 54
  {target:154000, moves:17, colors:6, frozen:0, comet:8},   // 55
  {target:165000, moves:16, colors:6, frozen:0, comet:8},   // 56
  {target:176000, moves:16, colors:6, frozen:0, comet:9},   // 57
  {target:188000, moves:15, colors:6, frozen:0, comet:9},   // 58
  {target:200000, moves:15, colors:6, frozen:0, comet:10},  // 59
  {target:220000, moves:14, colors:6, frozen:0, comet:10},  // 60 - sector boss
];

const LEVELS = LEVELS_S1.concat(LEVELS_S2).concat(LEVELS_S3);

const SECTORS = [
  {id:1, name:"SECTOR 1", title:"حزام الكويكبات", sub:"Asteroid Belt", start:1, end:20, planetClass:"planet-1",
   feature:"⚡ بدون عوائق - مثالي لتعلم الأساسيات",
   tagline:"ابدأ رحلتك بين حقول الكويكبات!"},
  {id:2, name:"SECTOR 2", title:"عملاق الغاز",   sub:"Gas Giant",      start:21, end:40, planetClass:"planet-2",
   feature:"❄️ جواهر متجمدة - تحتاج ضربتين للكسر",
   tagline:"اخترق العاصفة الجليدية لعملاق الغاز!"},
  {id:3, name:"SECTOR 3", title:"النواة الشمسية", sub:"Solar Core",    start:41, end:60, planetClass:"planet-3",
   feature:"☄️ جواهر المذنب - انفجار 3×3 تلقائي عند المطابقة",
   tagline:"تحدَّ حرارة النواة الشمسية المتفجرة!"},
];

const BOOSTERS = {
  neonwave:   {icon:"🌊", name:"Neon Wave",   nameAr:"موجة نيون",      cost:80,  desc:"يمسح صفاً كاملاً من الجواهر دفعة واحدة"},
  supergem:   {icon:"💎", name:"Super Gem",   nameAr:"الجوهرة الخارقة", cost:130, desc:"يدمر كل الجواهر من نفس نوع الجوهرة المستهدفة"},
  starburst:  {icon:"🌟", name:"Star Burst",  nameAr:"الانفجار النجمي", cost:90,  desc:"يفجر منطقة 3×3 حول الجوهرة المستهدفة"},
  gemconvert: {icon:"🔄", name:"Gem Convert", nameAr:"تحويل الجواهر",   cost:100, desc:"يحوّل الجواهر النادرة لتفعيل سلسلة مطابقات ضخمة"},
};

const CHARACTERS = {
  kaelen: {
    name:"Captain Kaelen", nameAr:"الكابتن كايلين", role:"القائد التكتيكي", avatar:"👨‍🚀",
    stats:{speed:70,power:85,skill:90},
    perk:"⚡ +10% نقاط في كل مطابقة", scoreMult:1.10, extraMoves:0
  },
  elara: {
    name:"Major Elara", nameAr:"الرائد إيلارا", role:"أخصائية الأولويات", avatar:"👩‍🚀",
    stats:{speed:90,power:75,skill:85},
    perk:"🎯 +1 حركة إضافية في كل مرحلة", scoreMult:1.0, extraMoves:1
  }
};

function totalStars(p){
  return Object.values(p.stars).reduce((a,b)=>a+b,0);
}

const ACHIEVEMENTS = [
  {icon:"🥇", title:"أول خطوة",        desc:"أكمل المرحلة 1",                    check:p=>(p.stars[1]||0)>=1},
  {icon:"⭐", title:"نجم ساطع",        desc:"احصل على 3 نجوم في أي مرحلة",        check:p=>Object.values(p.stars).some(s=>s>=3)},
  {icon:"🔥", title:"سيد الكومبو",      desc:"حقق سلسلة كومبو ×4",                check:p=>(p.maxCombo||0)>=4},
  {icon:"🪨", title:"حارس الكويكبات",   desc:"أكمل حزام الكويكبات (Sector 1)",     check:p=>(p.stars[20]||0)>=1},
  {icon:"🌪️", title:"فاتح عملاق الغاز", desc:"أكمل عملاق الغاز (Sector 2)",        check:p=>(p.stars[40]||0)>=1},
  {icon:"✨", title:"صياد النجوم",      desc:"اجمع 20 نجمة إجمالاً",               check:p=>totalStars(p)>=20},
  {icon:"🌟", title:"نخبة المجرة",      desc:"اجمع 60 نجمة إجمالاً",               check:p=>totalStars(p)>=60},
  {icon:"🚀", title:"كابتن مخضرم",      desc:"أكمل 10 مراحل",                     check:p=>Object.keys(p.stars).filter(k=>p.stars[k]>0).length>=10},
  {icon:"☀️", title:"غازي النواة الشمسية", desc:"أكمل النواة الشمسية (Sector 3)",  check:p=>(p.stars[60]||0)>=1},
  {icon:"👑", title:"أسطورة المجرة",    desc:"اجمع 120 نجمة إجمالاً",              check:p=>totalStars(p)>=120},
];

let board = [];
let nextId = 1;
let cellSize = 0;
let busy = false;
let score = 0, movesLeft = 0, currentLevel = 1, target = 0;
let selected = null;
let pointerStart = null;
let gemEls = new Map();
let currentSector = 1;
let powerCharges = {hammer:0, shuffle:0};
let hammerArmed = false;
let armedBooster = null;

const boardEl = document.getElementById("board");
const boardBgEl = document.getElementById("boardBg");
const boardWrap = document.getElementById("boardWrap");
const comboLayer = document.getElementById("comboLayer");

/* ---------- progress persistence ---------- */
function loadProgress(){
  const p = {unlocked:1, stars:{}, best:{}, character:"kaelen", maxCombo:0, boosters:{}, stardust:0};
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      const saved = JSON.parse(raw);
      if(saved && typeof saved === "object") Object.assign(p, saved);
      if(!p.stars) p.stars = {};
      if(!p.best) p.best = {};
      if(!p.boosters) p.boosters = {};
      if(!p.stardust) p.stardust = 0;
    }
  }catch(e){}
  return p;
}
function saveProgress(){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); }catch(e){}
}
let progress = loadProgress();

function wait(ms){ return new Promise(r=>setTimeout(r,ms)); }
function activeChar(){ return CHARACTERS[progress.character] || CHARACTERS.kaelen; }
function applyCharBonus(points){ return Math.round(points * (activeChar().scoreMult||1)); }

function updateCurrencyDisplays(){
  document.querySelectorAll(".currency-val").forEach(el=>{
    el.textContent = progress.stardust||0;
  });
}

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

function buildBoard(colors, frozenCount, cometCount){
  board = [];
  for(let r=0;r<ROWS;r++){
    board.push([]);
    for(let c=0;c<COLS;c++){
      const type = randomTypeNoMatch(r,c,colors);
      board[r][c] = {id: nextId++, type, frozen:0, comet:false, spawnFrom: r-ROWS};
    }
  }
  let placed=0, attempts=0;
  while(placed < (frozenCount||0) && attempts < 500){
    attempts++;
    const r = Math.floor(Math.random()*ROWS), c = Math.floor(Math.random()*COLS);
    if(!board[r][c].frozen){ board[r][c].frozen = 1; placed++; }
  }
  placed=0; attempts=0;
  while(placed < (cometCount||0) && attempts < 500){
    attempts++;
    const r = Math.floor(Math.random()*ROWS), c = Math.floor(Math.random()*COLS);
    if(!board[r][c].frozen && !board[r][c].comet){ board[r][c].comet = true; placed++; }
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
        board[r][c] = {id: nextId++, type: Math.floor(Math.random()*colors), frozen:0, spawnFrom: r-numNew};
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
  for(const [, el] of gemEls){
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
        let html = '<div class="gem-shape"><div class="gem-shine"></div>';
        if(cell.frozen>0) html += '<div class="ice-overlay"></div>';
        if(cell.comet) html += '<div class="comet-overlay">☄️</div>';
        html += '</div>';
        el.innerHTML = html;
        if(cell.frozen>0) el.classList.add("frozen");
        if(cell.comet) el.classList.add("comet");
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
  if(chain > (progress.maxCombo||0)){
    progress.maxCombo = chain;
    saveProgress();
  }

  // comet gems explode in a 3x3 area when matched/cleared
  const toCheck = [...matches];
  const checked = new Set();
  while(toCheck.length){
    const key = toCheck.pop();
    if(checked.has(key)) continue;
    checked.add(key);
    const [r,c] = key.split(",").map(Number);
    const cell = board[r] && board[r][c];
    if(cell && cell.comet && cell.frozen<=0){
      for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){
        const rr=r+dr, cc=c+dc;
        if(rr>=0&&rr<ROWS&&cc>=0&&cc<COLS){
          const k = rr+","+cc;
          if(!matches.has(k)){ matches.add(k); toCheck.push(k); }
        }
      }
    }
  }

  const count = matches.size;
  const base = count*60 + Math.max(0,count-3)*30;
  const mult = 1 + (chain-1)*0.5;
  const gained = applyCharBonus(Math.round(base*mult));
  score += gained;
  updateHud();
  showCombo(gained, chain);

  for(const key of matches){
    const [r,c] = key.split(",").map(Number);
    const cell = board[r][c];
    const el = gemEls.get(cell.id);
    if(cell.frozen>0){
      cell.frozen--;
      if(el){
        el.classList.remove("frozen");
        const overlay = el.querySelector(".ice-overlay");
        if(overlay) overlay.remove();
      }
    }else{
      if(el) el.classList.add("removing");
      board[r][c] = null;
    }
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
  const lvl = LEVELS[currentLevel-1];
  const colors = lvl.colors;

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
    do{ buildBoard(colors, lvl.frozen, lvl.comet); }while(!hasPossibleMove());
    render();
    await wait(450);
  }

  checkEnd();
  busy = false;
}

/* ---------- power-ups ---------- */
function updatePowerUI(){
  const hb = document.getElementById("hammerBtn");
  const sb = document.getElementById("shuffleBtn");
  hb.querySelector(".pcount").textContent = powerCharges.hammer;
  sb.querySelector(".pcount").textContent = powerCharges.shuffle;
  hb.disabled = powerCharges.hammer<=0 || busy;
  sb.disabled = powerCharges.shuffle<=0 || busy;
  hb.classList.toggle("armed", hammerArmed);
}

async function useHammer(r,c){
  if(busy || powerCharges.hammer<=0) return;
  hammerArmed = false;
  powerCharges.hammer--;
  busy = true;
  updatePowerUI();

  const lvl = LEVELS[currentLevel-1];
  const colors = lvl.colors;
  const cell = board[r][c];
  const gained = applyCharBonus(80);
  score += gained;
  updateHud();
  showCombo(gained, 1);

  if(cell.frozen>0){
    cell.frozen--;
    const el = gemEls.get(cell.id);
    if(el){
      el.classList.remove("frozen");
      const overlay = el.querySelector(".ice-overlay");
      if(overlay) overlay.remove();
    }
  }else{
    const el = gemEls.get(cell.id);
    if(el) el.classList.add("removing");
    board[r][c] = null;
  }
  await wait(220);
  applyGravity(colors);
  render();
  await wait(280);
  const next = findMatches();
  await resolveMatches(next, colors, 1);

  if(!hasPossibleMove()){
    await wait(250);
    showToast("لا توجد حركات متاحة - يتم الخلط 🔄");
    do{ buildBoard(colors, lvl.frozen, lvl.comet); }while(!hasPossibleMove());
    render();
    await wait(450);
  }
  checkEnd();
  busy = false;
  updatePowerUI();
}

async function useShuffle(){
  if(busy || powerCharges.shuffle<=0) return;
  busy = true;
  powerCharges.shuffle--;
  updatePowerUI();
  const lvl = LEVELS[currentLevel-1];
  do{ buildBoard(lvl.colors, lvl.frozen, lvl.comet); }while(!hasPossibleMove());
  render();
  showToast("تم خلط اللوحة 🔀");
  await wait(450);
  busy = false;
  updatePowerUI();
}

document.getElementById("hammerBtn").addEventListener("click", ()=>{
  if(busy || powerCharges.hammer<=0) return;
  hammerArmed = !hammerArmed;
  armedBooster = null;
  updatePowerUI();
  updateBoosterUI();
});
document.getElementById("shuffleBtn").addEventListener("click", useShuffle);

/* ---------- boosters ---------- */
function buildBoosterRow(){
  const row = document.getElementById("boosterRow");
  row.innerHTML = Object.keys(BOOSTERS).map(key=>{
    const b = BOOSTERS[key];
    const owned = progress.boosters[key]||0;
    return `<button class="booster-btn" data-booster="${key}" ${owned<=0?'disabled':''}>
      <span class="picon">${b.icon}</span>
      <span class="pcount">${owned}</span>
    </button>`;
  }).join("");
  row.querySelectorAll(".booster-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const key = btn.dataset.booster;
      if(busy || (progress.boosters[key]||0)<=0) return;
      if(key==="gemconvert"){
        useGemConvert();
        return;
      }
      armedBooster = (armedBooster===key) ? null : key;
      hammerArmed = false;
      updatePowerUI();
      updateBoosterUI();
    });
  });
  updateBoosterUI();
}

function updateBoosterUI(){
  const row = document.getElementById("boosterRow");
  if(!row) return;
  row.querySelectorAll(".booster-btn").forEach(btn=>{
    const key = btn.dataset.booster;
    const owned = progress.boosters[key]||0;
    btn.querySelector(".pcount").textContent = owned;
    btn.disabled = owned<=0 || busy;
    btn.classList.toggle("armed", armedBooster===key);
  });
}

async function useBooster(key, r, c){
  if(busy || (progress.boosters[key]||0)<=0) return;
  armedBooster = null;
  progress.boosters[key] = (progress.boosters[key]||0) - 1;
  saveProgress();
  busy = true;
  updatePowerUI();
  updateBoosterUI();

  const lvl = LEVELS[currentLevel-1];
  const colors = lvl.colors;
  const cells = new Set();

  if(key==="neonwave"){
    for(let cc=0; cc<COLS; cc++) cells.add(r+","+cc);
  }else if(key==="supergem"){
    const targetType = board[r][c].type;
    for(let rr=0; rr<ROWS; rr++) for(let cc=0; cc<COLS; cc++){
      if(board[rr][cc] && board[rr][cc].type===targetType) cells.add(rr+","+cc);
    }
  }else if(key==="starburst"){
    for(let dr=-1; dr<=1; dr++) for(let dc=-1; dc<=1; dc++){
      const rr=r+dr, cc=c+dc;
      if(rr>=0&&rr<ROWS&&cc>=0&&cc<COLS) cells.add(rr+","+cc);
    }
  }

  await resolveMatches(cells, colors, 1);

  if(!hasPossibleMove()){
    await wait(250);
    showToast("لا توجد حركات متاحة - يتم الخلط 🔄");
    do{ buildBoard(colors, lvl.frozen, lvl.comet); }while(!hasPossibleMove());
    render();
    await wait(450);
  }
  checkEnd();
  busy = false;
  updatePowerUI();
  updateBoosterUI();
}

async function useGemConvert(){
  if(busy || (progress.boosters.gemconvert||0)<=0) return;
  progress.boosters.gemconvert--;
  saveProgress();
  busy = true;
  updatePowerUI();
  updateBoosterUI();

  const lvl = LEVELS[currentLevel-1];
  const colors = lvl.colors;

  const counts = {};
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const t = board[r][c].type;
    counts[t] = (counts[t]||0)+1;
  }
  let maxType=0, maxCount=-1, minType=0, minCount=Infinity;
  for(let t=0;t<colors;t++){
    const cnt = counts[t]||0;
    if(cnt>maxCount){ maxCount=cnt; maxType=t; }
    if(cnt<minCount){ minCount=cnt; minType=t; }
  }

  if(minType===maxType){
    showToast("لا يوجد ما يمكن تحويله 🔄");
    busy = false;
    updatePowerUI();
    updateBoosterUI();
    return;
  }

  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const cell = board[r][c];
    if(cell.type===minType){
      cell.type = maxType;
      const el = gemEls.get(cell.id);
      if(el) el.className = el.className.replace(/gem-\d+/, `gem-${maxType}`);
    }
  }
  render();
  await wait(280);

  const matches = findMatches();
  await resolveMatches(matches, colors, 1);

  if(!hasPossibleMove()){
    await wait(250);
    showToast("لا توجد حركات متاحة - يتم الخلط 🔄");
    do{ buildBoard(colors, lvl.frozen, lvl.comet); }while(!hasPossibleMove());
    render();
    await wait(450);
  }
  checkEnd();
  busy = false;
  updatePowerUI();
  updateBoosterUI();
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
  const startCell = pointerStart.cell;

  if(hammerArmed){
    pointerStart = null;
    useHammer(startCell.r, startCell.c);
    return;
  }

  if(armedBooster){
    pointerStart = null;
    useBooster(armedBooster, startCell.r, startCell.c);
    return;
  }

  const dx = e.clientX - pointerStart.x;
  const dy = e.clientY - pointerStart.y;
  const absX = Math.abs(dx), absY = Math.abs(dy);
  const threshold = 14;

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
  progress.stardust = (progress.stardust||0) + stars*20;
  saveProgress();
  updateCurrencyDisplays();

  const isSectorEnd = currentLevel===20 || currentLevel===LEVELS.length;
  document.getElementById("modalIcon").textContent = isSectorEnd ? "☄️" : "🏆";
  document.getElementById("modalTitle").textContent = isSectorEnd ? "Sector Complete!" : "Level Complete!";
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
  const sector = SECTORS.find(s=>n>=s.start && n<=s.end);
  if(sector) currentSector = sector.id;

  score = 0;
  movesLeft = lvl.moves + (activeChar().extraMoves||0);
  target = lvl.target;
  powerCharges = {hammer:1, shuffle:1};
  hammerArmed = false;
  armedBooster = null;

  for(const [,el] of gemEls) el.remove();
  gemEls.clear();
  selected = null;

  buildBoard(lvl.colors, lvl.frozen, lvl.comet);
  while(!hasPossibleMove()) buildBoard(lvl.colors, lvl.frozen, lvl.comet);

  document.getElementById("levelNum").textContent = n;
  document.getElementById("charBadge").textContent = activeChar().avatar;
  document.getElementById("starMarks").dataset.built = "";
  showView("gameView");
  layoutBoard();
  render();
  updateHud();
  updatePowerUI();
  buildBoosterRow();
}

/* ---------- map / navigation ---------- */
function showView(id){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  document.getElementById("bottomNav").style.display = (id==="gameView") ? "none" : "flex";
}

function buildSectorTabs(){
  const el = document.getElementById("sectorTabs");
  el.innerHTML = SECTORS.map(s=>{
    const unlocked = progress.unlocked >= s.start;
    const active = s.id===currentSector;
    return `<button class="sector-tab ${active?'active':''} ${unlocked?'':'locked'}" data-sector="${s.id}" ${unlocked?'':'disabled'}>${unlocked? s.name : '🔒 '+s.name}</button>`;
  }).join("");
  el.querySelectorAll(".sector-tab:not(.locked)").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      currentSector = parseInt(btn.dataset.sector,10);
      buildMapView();
    });
  });
}

function buildLevelPath(sector){
  const container = document.getElementById("levelPath");
  let html = "";
  for(let i=sector.start;i<=sector.end;i++){
    const local = i - sector.start + 1;
    const offset = Math.round(Math.sin(i*0.85)*46);
    const isBoss = i===sector.end;
    const unlocked = i <= progress.unlocked;
    const stars = progress.stars[i] || 0;
    html += `<div class="level-node-wrap" style="--off:${offset}px">`;
    html += `<div class="connector ${local===1?'hidden':''} ${unlocked?'lit':''}"></div>`;
    html += `<button class="level-node ${unlocked?'unlocked':'locked'} ${isBoss?'boss':''}" data-level="${i}" ${unlocked?'':'disabled'}>`;
    html += unlocked ? (isBoss?"☄️":local) : "🔒";
    html += `<div class="stars">`;
    for(let s=1;s<=3;s++) html += `<span class="${s<=stars?'on':''}">★</span>`;
    html += `</div></button></div>`;
  }
  container.innerHTML = html;
  container.querySelectorAll(".level-node.unlocked").forEach(btn=>{
    btn.addEventListener("click", ()=>startLevel(parseInt(btn.dataset.level,10)));
  });
}

function buildMapView(){
  buildSectorTabs();
  const sector = SECTORS.find(s=>s.id===currentSector);
  document.getElementById("sectorName").textContent = sector.name;
  document.getElementById("sectorTitleAr").textContent = sector.title;
  document.getElementById("sectorMeta").textContent = `${sector.sub} · ${sector.end-sector.start+1} مرحلة`;
  document.getElementById("planetIcon").className = "planet-icon " + sector.planetClass;
  document.getElementById("sectorFeature").textContent = sector.feature;
  document.getElementById("sectorTagline").textContent = sector.tagline;
  updateCurrencyDisplays();
  buildLevelPath(sector);
}

/* ---------- character view ---------- */
function buildCharacterView(){
  const container = document.getElementById("charCards");
  container.innerHTML = Object.keys(CHARACTERS).map(key=>{
    const c = CHARACTERS[key];
    const isSelected = progress.character===key;
    return `<div class="char-card ${isSelected?'selected':''}">
      <div class="char-avatar">${c.avatar}</div>
      <div class="char-name">${c.name}</div>
      <div class="char-name-ar">${c.nameAr} · ${c.role}</div>
      <div class="char-stats">
        ${["speed","power","skill"].map(k=>`<div class="stat"><span>${k.toUpperCase()}</span><div class="bar"><i style="width:${c.stats[k]}%"></i></div></div>`).join("")}
      </div>
      <div class="char-perk">${c.perk}</div>
      <button class="btn ${isSelected?'btn-secondary':'btn-primary'} char-select-btn" data-char="${key}" ${isSelected?'disabled':''}>${isSelected?'✓ المختار حالياً':'اختيار هذا الطيار'}</button>
    </div>`;
  }).join("");
  container.querySelectorAll(".char-select-btn:not([disabled])").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      progress.character = btn.dataset.char;
      saveProgress();
      buildCharacterView();
    });
  });
}

/* ---------- shop view ---------- */
function buildShopView(){
  updateCurrencyDisplays();
  const container = document.getElementById("shopCards");
  container.innerHTML = Object.keys(BOOSTERS).map(key=>{
    const b = BOOSTERS[key];
    const owned = progress.boosters[key]||0;
    const canAfford = (progress.stardust||0) >= b.cost;
    return `<div class="shop-card">
      <div class="shop-icon">${b.icon}</div>
      <div class="shop-info">
        <div class="shop-name">${b.nameAr}</div>
        <div class="shop-name-en">${b.name.toUpperCase()}</div>
        <div class="shop-desc">${b.desc}</div>
        <div class="shop-owned">تملك: ${owned}</div>
      </div>
      <button class="shop-buy" data-booster="${key}" ${canAfford?'':'disabled'}>⭐ ${b.cost}</button>
    </div>`;
  }).join("");
  container.querySelectorAll(".shop-buy:not([disabled])").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const key = btn.dataset.booster;
      const cost = BOOSTERS[key].cost;
      if((progress.stardust||0) < cost) return;
      progress.stardust -= cost;
      progress.boosters[key] = (progress.boosters[key]||0) + 1;
      saveProgress();
      buildShopView();
    });
  });
}

/* ---------- achievements view ---------- */
function buildAchievements(){
  const completed = Object.keys(progress.stars).filter(k=>progress.stars[k]>0).length;
  document.getElementById("statLevels").textContent = `${completed}/${LEVELS.length}`;
  document.getElementById("statStars").textContent = `${totalStars(progress)}/${LEVELS.length*3}`;
  document.getElementById("statCombo").textContent = `${progress.maxCombo||0}x`;

  const grid = document.getElementById("badgeGrid");
  grid.innerHTML = ACHIEVEMENTS.map(a=>{
    const unlocked = a.check(progress);
    return `<div class="badge-card ${unlocked?'unlocked':''}">
      <div class="badge-icon">${unlocked?a.icon:'🔒'}</div>
      <div class="badge-title">${a.title}</div>
      <div class="badge-desc">${a.desc}</div>
    </div>`;
  }).join("");
}

/* ---------- nav wiring ---------- */
document.getElementById("backBtn").addEventListener("click", ()=>{
  hideModal();
  buildMapView();
  showView("mapView");
  setNavActive("mapView");
});
document.getElementById("mapBtn").addEventListener("click", ()=>{
  hideModal();
  buildMapView();
  showView("mapView");
  setNavActive("mapView");
});
document.getElementById("retryBtn").addEventListener("click", ()=>{
  hideModal();
  startLevel(currentLevel);
});
document.getElementById("nextBtn").addEventListener("click", ()=>{
  hideModal();
  if(currentLevel < LEVELS.length) startLevel(currentLevel+1);
});

function setNavActive(viewId){
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active", b.dataset.view===viewId));
}

document.querySelectorAll(".nav-btn").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    const view = btn.dataset.view;
    setNavActive(view);
    if(view==="mapView") buildMapView();
    if(view==="characterView") buildCharacterView();
    if(view==="shopView") buildShopView();
    if(view==="achievementsView") buildAchievements();
    showView(view);
  });
});

/* ---------- init ---------- */
buildMapView();
buildCharacterView();
})();
