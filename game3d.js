/* TEMO CRUSH 3D - Three.js match-3 prototype */
import * as THREE from "three";

/* ---------- shared progress (synced with map3d / game.js) ---------- */
const STORAGE_KEY = "temoCrushProgress";
const CHARACTERS = {
  kaelen: {scoreMult:1.10, extraMoves:0},
  elara:  {scoreMult:1.0,  extraMoves:1},
};
function loadProgress(){
  const p = {unlocked:1, stars:{}, best:{}, character:"kaelen", maxCombo:0, boosters:{}, stardust:0};
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) Object.assign(p, JSON.parse(raw));
  }catch(e){}
  return p;
}
function saveProgress(){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); }catch(e){} }
const progress = loadProgress();
function activeChar(){ return CHARACTERS[progress.character] || CHARACTERS.kaelen; }
function starsFor(tgt, sc){
  if(sc >= tgt*1.5) return 3;
  if(sc >= tgt*1.2) return 2;
  if(sc >= tgt) return 1;
  return 0;
}
const urlLevel = parseInt(new URLSearchParams(location.search).get("level"), 10);
const startLevelNum = (Number.isFinite(urlLevel) && urlLevel>=1) ? urlLevel : 1;

const COLS = 8, ROWS = 8, COLORS = 6;
const SPACING = 1.05;
const GEM_Y = 0.42;

const GEM_COLORS = [
  {base:0xFFB259, accent:0xF37623}, // 0 orange
  {base:0x7FC4FF, accent:0x2563B0}, // 1 blue
  {base:0xD6A6FF, accent:0x7B2FE0}, // 2 purple
  {base:0x7FFFE8, accent:0x16B8C4}, // 3 teal
  {base:0xFF9AD1, accent:0xE0337E}, // 4 pink
  {base:0xB8FFC0, accent:0x2FAE5C}, // 5 green
];

const GEM_GEOMETRIES = [
  () => new THREE.IcosahedronGeometry(0.34, 0),
  () => new THREE.ConeGeometry(0.36, 0.58, 5),
  () => new THREE.CylinderGeometry(0.32, 0.32, 0.5, 6),
  () => new THREE.OctahedronGeometry(0.38, 0),
  () => new THREE.DodecahedronGeometry(0.32, 0),
  () => new THREE.BoxGeometry(0.46, 0.46, 0.46),
];

/* ---------- helpers ---------- */
function lerp(a,b,t){ return a + (b-a)*t; }
function easeOutCubic(t){ return 1 - Math.pow(1-t,3); }
function easeInCubic(t){ return t*t*t; }
function easeOutBounce(t){
  const n1=7.5625, d1=2.75;
  if(t<1/d1) return n1*t*t;
  if(t<2/d1){ t-=1.5/d1; return n1*t*t+0.75; }
  if(t<2.5/d1){ t-=2.25/d1; return n1*t*t+0.9375; }
  t-=2.625/d1; return n1*t*t+0.984375;
}
function animate(duration, onUpdate){
  return new Promise(resolve=>{
    const start = performance.now();
    function frame(){
      const t = Math.min(1, (performance.now()-start)/duration);
      onUpdate(t);
      if(t<1) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
}
function gridToWorld(r,c){
  return { x: (c-(COLS-1)/2)*SPACING, z: (r-(ROWS-1)/2)*SPACING };
}

/* ---------- scene setup ---------- */
const canvas = document.getElementById("gameCanvas");
const wrap = document.getElementById("canvasWrap");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1530);
scene.fog = new THREE.Fog(0x0a1530, 10, 22);

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
camera.position.set(0, 8.6, 7.4);
camera.lookAt(0, -0.3, -0.2);
camera.updateMatrixWorld(true);

// fit the orthographic frustum tightly around the board's 3D bounding box
function fitCameraToBoard(aspect){
  const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
  const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
  const ext = COLS*SPACING/2;
  let minX=Infinity, maxX=-Infinity, minY=Infinity, maxY=-Infinity;
  for(const x of [-ext, ext]) for(const y of [-0.2, 1.4]) for(const z of [-ext, ext]){
    const p = new THREE.Vector3(x,y,z);
    const px = p.dot(right), py = p.dot(up);
    minX = Math.min(minX,px); maxX = Math.max(maxX,px);
    minY = Math.min(minY,py); maxY = Math.max(maxY,py);
  }
  const w = (maxX-minX)*1.08, h = (maxY-minY)*1.08;
  const cx = (maxX+minX)/2, cy = (maxY+minY)/2;
  let halfW, halfH;
  if(w/h > aspect){ halfW = w/2; halfH = halfW/aspect; }
  else { halfH = h/2; halfW = halfH*aspect; }
  camera.left = cx-halfW; camera.right = cx+halfW;
  camera.top = cy+halfH; camera.bottom = cy-halfH;
  camera.updateProjectionMatrix();
}

const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;

const ambient = new THREE.AmbientLight(0x405080, 1.3);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xfff2e0, 1.6);
sun.position.set(4, 9, 5);
sun.castShadow = true;
sun.shadow.camera.left = -7;
sun.shadow.camera.right = 7;
sun.shadow.camera.top = 7;
sun.shadow.camera.bottom = -7;
scene.add(sun);
const rim = new THREE.PointLight(0xff9a45, 0.8, 30);
rim.position.set(-5, 4, -5);
scene.add(rim);
const rim2 = new THREE.PointLight(0x4a90d9, 0.8, 30);
rim2.position.set(5, 4, 4);
scene.add(rim2);

/* starfield */
{
  const starGeo = new THREE.BufferGeometry();
  const count = 600;
  const positions = new Float32Array(count*3);
  for(let i=0;i<count;i++){
    const r = 30 + Math.random()*40;
    const theta = Math.random()*Math.PI*2;
    const phi = Math.acos((Math.random()*2)-1);
    positions[i*3]   = r*Math.sin(phi)*Math.cos(theta);
    positions[i*3+1] = Math.abs(r*Math.cos(phi))*0.6 + 2;
    positions[i*3+2] = r*Math.sin(phi)*Math.sin(theta);
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(positions,3));
  const starMat = new THREE.PointsMaterial({color:0xffffff, size:0.12, sizeAttenuation:true});
  scene.add(new THREE.Points(starGeo, starMat));
}

/* board base */
function createBoardTexture(){
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const cell = size/COLS;
  for(let r=0;r<ROWS;r++) for(let cc=0;cc<COLS;cc++){
    ctx.fillStyle = (r+cc)%2===0 ? "#16284d" : "#11213d";
    ctx.fillRect(cc*cell, r*cell, cell, cell);
    ctx.strokeStyle = "rgba(124,180,255,0.18)";
    ctx.lineWidth = 3;
    ctx.strokeRect(cc*cell+1.5, r*cell+1.5, cell-3, cell-3);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const boardMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(COLS*SPACING, ROWS*SPACING),
  new THREE.MeshStandardMaterial({map: createBoardTexture(), roughness:0.9})
);
boardMesh.rotation.x = -Math.PI/2;
boardMesh.receiveShadow = true;
scene.add(boardMesh);

/* selection ring */
const selectionRing = new THREE.Mesh(
  new THREE.RingGeometry(0.42, 0.5, 24),
  new THREE.MeshBasicMaterial({color:0xffffff, side:THREE.DoubleSide, transparent:true, opacity:0.9})
);
selectionRing.rotation.x = -Math.PI/2;
selectionRing.position.y = 0.03;
selectionRing.visible = false;
scene.add(selectionRing);

/* ---------- gem factory ---------- */
let nextId = 1;
function createGemMesh(type){
  const geo = GEM_GEOMETRIES[type]();
  const colors = GEM_COLORS[type];
  const mat = new THREE.MeshPhysicalMaterial({
    color: colors.base,
    emissive: colors.accent,
    emissiveIntensity: 0.35,
    metalness: 0.25,
    roughness: 0.2,
    clearcoat: 0.6,
    clearcoatRoughness: 0.2,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  if(type===5) mesh.rotation.y = Math.PI/4;
  const group = new THREE.Group();
  group.add(mesh);
  group.userData.mesh = mesh;
  return group;
}
function disposeGroup(group){
  group.traverse(obj=>{
    if(obj.geometry) obj.geometry.dispose();
    if(obj.material) obj.material.dispose();
  });
}

/* ---------- board state & match-3 logic ---------- */
let board = [];
let busy = false;
let level = startLevelNum, score = 0, moves = 25, target = 2000;

function randomTypeNoMatch(r,c){
  let t;
  do{
    t = Math.floor(Math.random()*COLORS);
  }while(
    (c>=2 && board[r][c-1] && board[r][c-2] && board[r][c-1].type===t && board[r][c-2].type===t) ||
    (r>=2 && board[r-1] && board[r-1][c] && board[r-2] && board[r-2][c] && board[r-1][c].type===t && board[r-2][c].type===t)
  );
  return t;
}

function clearBoard(){
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const cell = board[r] && board[r][c];
    if(cell){ scene.remove(cell.group); disposeGroup(cell.group); }
  }
  board = [];
}

function buildBoard(){
  board = [];
  for(let r=0;r<ROWS;r++){
    board.push([]);
    for(let c=0;c<COLS;c++){
      const type = randomTypeNoMatch(r,c);
      const group = createGemMesh(type);
      const pos = gridToWorld(r,c);
      group.position.set(pos.x, GEM_Y, pos.z);
      scene.add(group);
      board[r][c] = {id: nextId++, type, group};
    }
  }
}

function findMatches(){
  const matched = new Set();
  for(let r=0;r<ROWS;r++){
    let runLen=1;
    for(let c=1;c<=COLS;c++){
      const same = c<COLS && board[r][c].type===board[r][c-1].type;
      if(same) runLen++;
      else{
        if(runLen>=3) for(let k=c-runLen;k<c;k++) matched.add(r+","+k);
        runLen=1;
      }
    }
  }
  for(let c=0;c<COLS;c++){
    let runLen=1;
    for(let r=1;r<=ROWS;r++){
      const same = r<ROWS && board[r][c].type===board[r-1][c].type;
      if(same) runLen++;
      else{
        if(runLen>=3) for(let k=r-runLen;k<r;k++) matched.add(k+","+c);
        runLen=1;
      }
    }
  }
  return matched;
}

function swapTypes(r1,c1,r2,c2){
  const t = board[r1][c1].type;
  board[r1][c1].type = board[r2][c2].type;
  board[r2][c2].type = t;
}

function hasPossibleMove(){
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    if(c<COLS-1){
      swapTypes(r,c,r,c+1);
      const m = findMatches();
      swapTypes(r,c,r,c+1);
      if(m.size>0) return true;
    }
    if(r<ROWS-1){
      swapTypes(r,c,r+1,c);
      const m = findMatches();
      swapTypes(r,c,r+1,c);
      if(m.size>0) return true;
    }
  }
  return false;
}

function swapCells(r1,c1,r2,c2){
  const tmp = board[r1][c1];
  board[r1][c1] = board[r2][c2];
  board[r2][c2] = tmp;
}

/* ---------- visual animation steps ---------- */
async function animateSwap(r1,c1,r2,c2){
  const a = board[r1][c1], b = board[r2][c2];
  const posA = gridToWorld(r1,c1), posB = gridToWorld(r2,c2);
  const startA = a.group.position.clone(), startB = b.group.position.clone();
  await animate(180, t=>{
    const e = easeOutCubic(t);
    a.group.position.x = lerp(startA.x, posA.x, e);
    a.group.position.z = lerp(startA.z, posA.z, e);
    b.group.position.x = lerp(startB.x, posB.x, e);
    b.group.position.z = lerp(startB.z, posB.z, e);
  });
}

async function shakeInvalid(r1,c1,r2,c2){
  const a = board[r1][c1].group, b = board[r2][c2].group;
  const startA = a.rotation.z, startB = b.rotation.z;
  await animate(260, t=>{
    const wobble = Math.sin(t*Math.PI*4)*(1-t)*0.35;
    a.rotation.z = startA + wobble;
    b.rotation.z = startB - wobble;
  });
  a.rotation.z = startA; b.rotation.z = startB;
}

function spawnBurst(position, color){
  const n = 8;
  const parts = [];
  for(let i=0;i<n;i++){
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 6, 6),
      new THREE.MeshBasicMaterial({color, transparent:true})
    );
    mesh.position.copy(position);
    const angle = (Math.PI*2/n)*i + Math.random()*0.4;
    const speed = 1.2 + Math.random()*0.8;
    parts.push({mesh, vx:Math.cos(angle)*speed, vz:Math.sin(angle)*speed, vy:1.5+Math.random()});
    scene.add(mesh);
  }
  animate(500, t=>{
    for(const p of parts){
      p.mesh.position.x += p.vx*0.016;
      p.mesh.position.z += p.vz*0.016;
      p.mesh.position.y += (p.vy - t*5)*0.016;
      p.mesh.material.opacity = 1-t;
    }
  }).then(()=>{
    for(const p of parts){ scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); }
  });
}

function applyGravity(){
  for(let c=0;c<COLS;c++){
    const colGems = [];
    for(let r=ROWS-1;r>=0;r--) if(board[r][c]) colGems.push(board[r][c]);
    const numNew = ROWS - colGems.length;
    for(let r=ROWS-1, idx=0; r>=0; r--, idx++){
      if(idx<colGems.length){
        board[r][c] = colGems[idx];
      }else{
        const type = Math.floor(Math.random()*COLORS);
        const group = createGemMesh(type);
        const pos = gridToWorld(r,c);
        const stack = numNew - 1 - (idx - colGems.length);
        group.position.set(pos.x, GEM_Y + SPACING*(stack+2.5), pos.z);
        scene.add(group);
        board[r][c] = {id: nextId++, type, group};
      }
    }
  }
}

async function animateGravity(){
  const proms = [];
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const cell = board[r][c];
    const target = gridToWorld(r,c);
    const start = cell.group.position.clone();
    if(Math.abs(start.x-target.x)<1e-4 && Math.abs(start.y-GEM_Y)<1e-4 && Math.abs(start.z-target.z)<1e-4){
      cell.group.scale.setScalar(1);
      continue;
    }
    proms.push(animate(320, t=>{
      cell.group.position.x = lerp(start.x, target.x, t);
      cell.group.position.z = lerp(start.z, target.z, t);
      cell.group.position.y = lerp(start.y, GEM_Y, easeOutBounce(t));
      cell.group.scale.setScalar(1);
    }));
  }
  await Promise.all(proms);
}

/* ---------- HUD ---------- */
function updateHud(){
  document.getElementById("levelBadge").textContent = level;
  document.getElementById("scoreVal").textContent = score;
  document.getElementById("movesLeft").textContent = moves;
  document.getElementById("targetVal").textContent = target;
  const pct = Math.min(100, (score/target)*100);
  document.getElementById("scoreFill").style.width = pct+"%";
  document.getElementById("movesPill").classList.toggle("warn", moves<=5);
}

function showScorePop(points, chain){
  const el = document.createElement("div");
  el.className = "score-pop";
  el.textContent = chain>1 ? `+${points}  COMBO x${chain}!` : `+${points}`;
  el.style.top = (40 + Math.random()*15)+"%";
  wrap.appendChild(el);
  setTimeout(()=>el.remove(), 850);
}

/* ---------- match resolution ---------- */
async function resolveMatches(matches, chain){
  if(matches.size===0) return;
  const count = matches.size;
  const base = count*60 + Math.max(0,count-3)*30;
  const mult = 1 + (chain-1)*0.5;
  const gained = Math.round(base*mult*(activeChar().scoreMult||1));
  score += gained;
  updateHud();
  showScorePop(gained, chain);

  const proms = [];
  for(const key of matches){
    const [r,c] = key.split(",").map(Number);
    const cell = board[r][c];
    spawnBurst(cell.group.position, GEM_COLORS[cell.type].base);
    proms.push(animate(220, t=>{
      const s = Math.max(1 - easeInCubic(t), 0.001);
      cell.group.scale.setScalar(s);
      cell.group.userData.mesh.rotation.y += 0.3;
    }));
  }
  await Promise.all(proms);

  for(const key of matches){
    const [r,c] = key.split(",").map(Number);
    scene.remove(board[r][c].group);
    disposeGroup(board[r][c].group);
    board[r][c] = null;
  }

  applyGravity();
  await animateGravity();

  const next = findMatches();
  await resolveMatches(next, chain+1);
}

async function shuffleBoard(){
  do{
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
      board[r][c].type = randomTypeNoMatch(r,c);
    }
  }while(!hasPossibleMove());
  const proms = [];
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const cell = board[r][c];
    const oldGroup = cell.group;
    const newGroup = createGemMesh(cell.type);
    const pos = gridToWorld(r,c);
    newGroup.position.set(pos.x, GEM_Y, pos.z);
    newGroup.scale.setScalar(0.001);
    scene.add(newGroup);
    cell.group = newGroup;
    proms.push(animate(260, t=>{
      oldGroup.scale.setScalar(Math.max(1-t,0.001));
      newGroup.scale.setScalar(t);
    }).then(()=>{ scene.remove(oldGroup); disposeGroup(oldGroup); }));
  }
  await Promise.all(proms);
}

/* ---------- level flow ---------- */
function checkEnd(){
  if(score>=target) onWin();
  else if(moves<=0) onLose();
}

function showModal(icon, title, isWin){
  document.getElementById("modalIcon").textContent = icon;
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("modalScore").textContent = score;
  document.getElementById("continueBtn").textContent = isWin ? "Back to Map" : "Retry";
  document.getElementById("continueBtn").dataset.win = isWin ? "1" : "0";
  document.getElementById("modalOverlay").classList.add("show");
}
function hideModal(){ document.getElementById("modalOverlay").classList.remove("show"); }

function onWin(){
  const stars = starsFor(target, score);
  const prevStars = progress.stars[level] || 0;
  if(stars > prevStars) progress.stars[level] = stars;
  const prevBest = progress.best[level] || 0;
  if(score > prevBest) progress.best[level] = score;
  if(level === progress.unlocked && level < 20){
    progress.unlocked = level+1;
  }
  progress.stardust = (progress.stardust||0) + stars*20;
  saveProgress();
  showModal("🏆","Level Complete!", true);
}
function onLose(){ showModal("💥","Out of Moves", false); }

async function startLevel(){
  score = 0;
  moves = 25 + (activeChar().extraMoves||0);
  target = 2000 + (level-1)*900;
  clearBoard();
  buildBoard();
  while(!hasPossibleMove()){ clearBoard(); buildBoard(); }
  updateHud();
}

document.getElementById("continueBtn").addEventListener("click", ()=>{
  const win = document.getElementById("continueBtn").dataset.win==="1";
  hideModal();
  if(win){
    window.location.href = "map3d.html";
  }else{
    startLevel();
  }
});

/* ---------- input: raycasting ---------- */
const raycaster = new THREE.Raycaster();
const pointerNDC = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0,1,0), -GEM_Y);

function cellFromEvent(e){
  const rect = renderer.domElement.getBoundingClientRect();
  pointerNDC.x = ((e.clientX-rect.left)/rect.width)*2 - 1;
  pointerNDC.y = -((e.clientY-rect.top)/rect.height)*2 + 1;
  raycaster.setFromCamera(pointerNDC, camera);
  const point = new THREE.Vector3();
  if(!raycaster.ray.intersectPlane(groundPlane, point)) return null;
  const c = Math.round(point.x/SPACING + (COLS-1)/2);
  const r = Math.round(point.z/SPACING + (ROWS-1)/2);
  if(r<0||r>=ROWS||c<0||c>=COLS) return null;
  return {r,c};
}

function setSelection(cell){
  if(!cell){ selectionRing.visible = false; return; }
  const pos = gridToWorld(cell.r, cell.c);
  selectionRing.position.x = pos.x;
  selectionRing.position.z = pos.z;
  selectionRing.visible = true;
}

let pointerStart = null;
let selected = null;

async function trySwap(r1,c1,r2,c2){
  if(busy) return;
  if(r2<0||r2>=ROWS||c2<0||c2>=COLS) return;
  if(Math.abs(r1-r2)+Math.abs(c1-c2)!==1) return;
  busy = true;
  setSelection(null); selected = null;

  swapCells(r1,c1,r2,c2);
  await animateSwap(r1,c1,r2,c2);

  const matches = findMatches();
  if(matches.size===0){
    await shakeInvalid(r1,c1,r2,c2);
    swapCells(r1,c1,r2,c2);
    await animateSwap(r1,c1,r2,c2);
    busy = false;
    return;
  }

  moves--;
  updateHud();
  await resolveMatches(matches, 1);

  if(!hasPossibleMove()) await shuffleBoard();
  checkEnd();
  busy = false;
}

canvas.addEventListener("pointerdown", (e)=>{
  if(busy) return;
  const cell = cellFromEvent(e);
  pointerStart = cell ? {r:cell.r, c:cell.c, x:e.clientX, y:e.clientY} : null;
});

canvas.addEventListener("pointerup", (e)=>{
  if(busy || !pointerStart) { pointerStart=null; return; }
  const dx = e.clientX - pointerStart.x;
  const dy = e.clientY - pointerStart.y;
  const threshold = 12;

  if(Math.max(Math.abs(dx),Math.abs(dy)) > threshold){
    let target;
    if(Math.abs(dx)>Math.abs(dy)) target = {r:pointerStart.r, c:pointerStart.c + (dx>0?1:-1)};
    else target = {r:pointerStart.r + (dy>0?1:-1), c:pointerStart.c};
    trySwap(pointerStart.r, pointerStart.c, target.r, target.c);
  }else{
    const cell = {r:pointerStart.r, c:pointerStart.c};
    if(selected && Math.abs(selected.r-cell.r)+Math.abs(selected.c-cell.c)===1){
      const from = selected;
      selected = null;
      trySwap(from.r, from.c, cell.r, cell.c);
    }else{
      selected = cell;
      setSelection(cell);
    }
  }
  pointerStart = null;
});

/* ---------- resize ---------- */
function onResize(){
  const w = wrap.clientWidth, h = wrap.clientHeight;
  renderer.setSize(w, h, false);
  fitCameraToBoard(w/h);
}
window.addEventListener("resize", onResize);
onResize();

/* ---------- main loop ---------- */
let lastTime = performance.now();
function frame(){
  requestAnimationFrame(frame);
  const now = performance.now();
  const dt = (now-lastTime)/1000;
  lastTime = now;

  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const cell = board[r] && board[r][c];
    if(cell) cell.group.userData.mesh.rotation.y += dt*0.4;
  }
  if(selectionRing.visible) selectionRing.material.opacity = 0.55 + Math.sin(now*0.006)*0.35;

  renderer.render(scene, camera);
}

startLevel();
frame();
