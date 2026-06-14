/* TEMO CRUSH 3D - World Map (NSMB Wii-style walkable level select) */
import * as THREE from "three";

const STORAGE_KEY = "temoCrushProgress";
const SECTOR_LEVELS = 20;
const NODE_SPACING = 3.2;
const X_AMP = 2.1;

const CHAR_THEMES = {
  kaelen: {suit:0xF37623, visor:0x4A90D9, avatar:"👨‍🚀"},
  elara:  {suit:0x4A90D9, visor:0xFF9AD1, avatar:"👩‍🚀"},
};

/* ---------- progress (shared with game.js / game3d.js) ---------- */
function loadProgress(){
  const p = {unlocked:1, stars:{}, best:{}, character:"kaelen", boosters:{}, stardust:0};
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      const saved = JSON.parse(raw);
      if(saved && typeof saved==="object") Object.assign(p, saved);
    }
  }catch(e){}
  if(!p.stars) p.stars = {};
  if(p.character!=="kaelen" && p.character!=="elara") p.character = "kaelen";
  return p;
}
function saveProgress(){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); }catch(e){} }
let progress = loadProgress();

/* ---------- helpers ---------- */
function lerp(a,b,t){ return a + (b-a)*t; }
function easeInOutQuad(t){ return t<0.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2; }
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
function disposeGroup(group){
  group.traverse(obj=>{
    if(obj.geometry) obj.geometry.dispose();
    if(obj.material) obj.material.dispose();
    if(obj.material && obj.material.map) obj.material.map.dispose();
  });
}
function nodePos(i){
  return new THREE.Vector3(Math.sin(i*0.85)*X_AMP, Math.cos(i*0.6)*0.35, -i*NODE_SPACING);
}
function makeLabelSprite(text, opts={}){
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  ctx.fillStyle = opts.color || "#ffffff";
  ctx.font = `900 ${opts.fontSize||72}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, size/2, size/2+6);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({map:tex, transparent:true, depthTest:true});
  const sprite = new THREE.Sprite(mat);
  const s = opts.scale||0.8;
  sprite.scale.set(s, s, 1);
  return sprite;
}
function makeLockSprite(){
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  ctx.strokeStyle = "#cfd6e6";
  ctx.fillStyle = "#cfd6e6";
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(size/2, size*0.42, size*0.17, Math.PI, 0, false);
  ctx.stroke();
  ctx.fillRect(size*0.27, size*0.40, size*0.46, size*0.36);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({map:tex, transparent:true, depthTest:true});
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.55, 0.55, 1);
  return sprite;
}

/* ---------- scene setup ---------- */
const canvas = document.getElementById("gameCanvas");
const wrap = document.getElementById("canvasWrap");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070f24);
scene.fog = new THREE.Fog(0x070f24, 14, 42);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;

const ambient = new THREE.AmbientLight(0x405080, 1.2);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xfff2e0, 1.5);
sun.position.set(6, 14, 6);
sun.castShadow = true;
sun.shadow.camera.left = -20; sun.shadow.camera.right = 20;
sun.shadow.camera.top = 20; sun.shadow.camera.bottom = -20;
sun.shadow.camera.far = 90;
scene.add(sun);
const rim = new THREE.PointLight(0xff9a45, 0.7, 40);
rim.position.set(-8, 5, -10);
scene.add(rim);
const rim2 = new THREE.PointLight(0x4a90d9, 0.7, 40);
rim2.position.set(8, 5, -30);
scene.add(rim2);

/* starfield */
{
  const starGeo = new THREE.BufferGeometry();
  const count = 700;
  const positions = new Float32Array(count*3);
  for(let i=0;i<count;i++){
    const r = 35 + Math.random()*45;
    const theta = Math.random()*Math.PI*2;
    const phi = Math.acos((Math.random()*2)-1);
    positions[i*3]   = r*Math.sin(phi)*Math.cos(theta);
    positions[i*3+1] = Math.abs(r*Math.cos(phi))*0.6 + 2;
    positions[i*3+2] = r*Math.sin(phi)*Math.sin(theta) - 25;
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(positions,3));
  const starMat = new THREE.PointsMaterial({color:0xffffff, size:0.14, sizeAttenuation:true});
  scene.add(new THREE.Points(starGeo, starMat));
}

/* scattered asteroids for atmosphere */
for(let i=0;i<18;i++){
  const geo = new THREE.IcosahedronGeometry(0.3+Math.random()*0.8, 0);
  const mat = new THREE.MeshStandardMaterial({color:0x3a4a6a, roughness:0.9, metalness:0.1});
  const rock = new THREE.Mesh(geo, mat);
  const side = Math.random()<0.5 ? -1 : 1;
  rock.position.set(side*(3.5+Math.random()*9), (Math.random()-0.2)*6, -Math.random()*(SECTOR_LEVELS*NODE_SPACING+8));
  rock.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
  rock.castShadow = true; rock.receiveShadow = true;
  scene.add(rock);
}

/* ---------- road ---------- */
const curvePts = [new THREE.Vector3(0,0,NODE_SPACING)];
for(let i=0;i<SECTOR_LEVELS;i++) curvePts.push(nodePos(i));
const lastNode = nodePos(SECTOR_LEVELS-1);
curvePts.push(new THREE.Vector3(lastNode.x, lastNode.y, lastNode.z - NODE_SPACING));
const roadCurve = new THREE.CatmullRomCurve3(curvePts.map(p=>p.clone().setY(p.y-0.05)), false, "catmullrom", 0.4);
const roadGeo = new THREE.TubeGeometry(roadCurve, 220, 0.65, 8, false);
const roadMat = new THREE.MeshStandardMaterial({color:0x1d3a63, roughness:0.85, metalness:0.1, emissive:0x0c1a33, emissiveIntensity:0.4});
const road = new THREE.Mesh(roadGeo, roadMat);
road.receiveShadow = true;
scene.add(road);

/* ---------- level nodes ---------- */
const nodeGroups = [];
for(let i=0;i<SECTOR_LEVELS;i++){
  const levelNumber = i+1;
  const unlocked = levelNumber <= progress.unlocked;
  const isBoss = levelNumber === SECTOR_LEVELS;
  const stars = progress.stars[levelNumber] || 0;

  const group = new THREE.Group();
  group.position.copy(nodePos(i));

  const platGeo = new THREE.CylinderGeometry(isBoss?0.95:0.75, isBoss?1.05:0.85, 0.28, 16);
  const platMat = new THREE.MeshStandardMaterial({
    color: unlocked ? (isBoss?0xC2247A:0x2563B0) : 0x222a3d,
    roughness:0.6, metalness:0.2,
    emissive: unlocked ? (isBoss?0x4a0f30:0x102040) : 0x000000,
    emissiveIntensity:0.5
  });
  const platform = new THREE.Mesh(platGeo, platMat);
  platform.castShadow = true; platform.receiveShadow = true;
  group.add(platform);

  let markerGeo, markerColor, markerEmissive;
  if(!unlocked){
    markerGeo = new THREE.SphereGeometry(0.32, 14, 14);
    markerColor = 0x555a66; markerEmissive = 0x000000;
  }else if(isBoss){
    markerGeo = new THREE.OctahedronGeometry(0.46, 0);
    markerColor = 0xFF9AD1; markerEmissive = 0xE0337E;
  }else{
    markerGeo = new THREE.IcosahedronGeometry(0.36, 0);
    markerColor = 0xFFB259; markerEmissive = 0xF37623;
  }
  const markerMat = new THREE.MeshPhysicalMaterial({
    color: markerColor, emissive: markerEmissive, emissiveIntensity:0.5,
    metalness:0.3, roughness:0.25, clearcoat:0.5
  });
  const marker = new THREE.Mesh(markerGeo, markerMat);
  marker.position.y = 0.52;
  marker.castShadow = true;
  group.add(marker);

  const label = unlocked ? makeLabelSprite(String(levelNumber), {scale:0.7}) : makeLockSprite();
  label.position.y = 1.08;
  group.add(label);

  for(let s=0;s<stars;s++){
    const star = makeLabelSprite("★", {scale:0.32, color:"#FFC23A"});
    star.position.set((s-(stars-1)/2)*0.34, 1.55, 0);
    group.add(star);
  }

  scene.add(group);
  nodeGroups.push({group, marker, levelNumber, unlocked, isBoss});
}

/* sector 2 gate (decorative) */
{
  const gate = new THREE.Group();
  const gp = nodePos(SECTOR_LEVELS-1).clone();
  gp.z -= NODE_SPACING*1.5;
  gate.position.copy(gp);
  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(1.1, 28, 28),
    new THREE.MeshStandardMaterial({color:0xC2247A, emissive:0x5A1240, emissiveIntensity:0.6, roughness:0.5})
  );
  planet.position.y = 1.7;
  planet.castShadow = true;
  gate.add(planet);
  const gateLabel = makeLabelSprite("SECTOR 2", {scale:1.1, color:"#FF9AD1", fontSize:48});
  gateLabel.position.y = 3.1;
  gate.add(gateLabel);
  scene.add(gate);
}

/* ---------- player avatar ---------- */
function createPlayerMesh(themeKey){
  const theme = CHAR_THEMES[themeKey] || CHAR_THEMES.kaelen;
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.26, 0.42, 4, 12),
    new THREE.MeshPhysicalMaterial({color:theme.suit, metalness:0.3, roughness:0.35, clearcoat:0.4})
  );
  body.position.y = 0.42;
  body.castShadow = true;
  group.add(body);

  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 20, 20),
    new THREE.MeshPhysicalMaterial({color:0xe8f0ff, metalness:0.1, roughness:0.1, transparent:true, opacity:0.85, clearcoat:1})
  );
  helmet.position.y = 0.92;
  helmet.castShadow = true;
  group.add(helmet);

  const visor = new THREE.Mesh(
    new THREE.SphereGeometry(0.17, 16, 16, 0, Math.PI*2, 0, Math.PI/1.6),
    new THREE.MeshStandardMaterial({color:theme.visor, emissive:theme.visor, emissiveIntensity:0.6})
  );
  visor.position.set(0, 0.95, 0.16);
  visor.rotation.x = -0.3;
  group.add(visor);

  const thrusterGeo = new THREE.ConeGeometry(0.12, 0.3, 8);
  const thrusterMat = new THREE.MeshBasicMaterial({color:0xffb259, transparent:true, opacity:0.7});
  const thrusterL = new THREE.Mesh(thrusterGeo, thrusterMat);
  thrusterL.rotation.x = Math.PI;
  thrusterL.position.set(-0.18, 0.04, 0.04);
  const thrusterR = thrusterL.clone();
  thrusterR.position.x = 0.18;
  group.add(thrusterL, thrusterR);
  group.userData.thrusters = [thrusterL, thrusterR];

  return group;
}

let currentIndex = Math.max(0, Math.min(progress.unlocked-1, SECTOR_LEVELS-1));
function playerStandPos(i){
  const p = nodePos(i).clone();
  p.y += 0.62;
  return p;
}
let player = createPlayerMesh(progress.character);
player.position.copy(playerStandPos(currentIndex));
player.rotation.y = Math.PI; // face along the path toward higher levels
scene.add(player);

function rebuildPlayer(themeKey){
  const pos = player.position.clone();
  const rot = player.rotation.y;
  scene.remove(player);
  disposeGroup(player);
  player = createPlayerMesh(themeKey);
  player.position.copy(pos);
  player.rotation.y = rot;
  scene.add(player);
}

/* ---------- movement ---------- */
let busy = false;
async function moveTo(targetIndex){
  if(busy) return;
  if(targetIndex<0 || targetIndex>=SECTOR_LEVELS) return;
  if(targetIndex>currentIndex && (targetIndex+1)>progress.unlocked) return;
  busy = true;
  const from = playerStandPos(currentIndex);
  const to = playerStandPos(targetIndex);
  const facing = Math.atan2(to.x-from.x, to.z-from.z);
  await animate(550, t=>{
    const e = easeInOutQuad(t);
    player.position.x = lerp(from.x, to.x, e);
    player.position.z = lerp(from.z, to.z, e);
    player.position.y = lerp(from.y, to.y, e) + Math.sin(t*Math.PI)*0.35;
    player.rotation.y = facing;
  });
  currentIndex = targetIndex;
  busy = false;
  updateHud();
}

/* ---------- camera follow ---------- */
function updateCamera(immediate){
  const facing = player.rotation.y;
  const back = new THREE.Vector3(-Math.sin(facing), 0, -Math.cos(facing)).multiplyScalar(4.6);
  const camPos = new THREE.Vector3(player.position.x+back.x, player.position.y+3.4, player.position.z+back.z);
  const lookAt = new THREE.Vector3(player.position.x+Math.sin(facing)*3, player.position.y+0.3, player.position.z+Math.cos(facing)*3);
  if(immediate) camera.position.copy(camPos);
  else camera.position.lerp(camPos, 0.08);
  camera.lookAt(lookAt);
}

/* ---------- HUD ---------- */
function updateHud(){
  const levelNumber = currentIndex+1;
  document.getElementById("levelLabel").textContent = `LEVEL ${levelNumber}`;
  document.getElementById("stardustVal").textContent = progress.stardust||0;

  const stars = progress.stars[levelNumber] || 0;
  const starsRow = document.getElementById("starsRow");
  starsRow.innerHTML = "";
  for(let s=1;s<=3;s++){
    const span = document.createElement("span");
    span.textContent = "★";
    if(s<=stars) span.classList.add("on");
    starsRow.appendChild(span);
  }

  const unlocked = levelNumber <= progress.unlocked;
  document.getElementById("playBtn").disabled = !unlocked;
  document.getElementById("backStep").disabled = busy || currentIndex<=0;
  document.getElementById("fwdStep").disabled = busy || currentIndex>=SECTOR_LEVELS-1 || (currentIndex+2)>progress.unlocked;
}

document.getElementById("backStep").addEventListener("click", ()=>moveTo(currentIndex-1).then(updateHud));
document.getElementById("fwdStep").addEventListener("click", ()=>moveTo(currentIndex+1).then(updateHud));
document.getElementById("playBtn").addEventListener("click", ()=>{
  const levelNumber = currentIndex+1;
  if(levelNumber<=progress.unlocked) window.location.href = `game3d.html?level=${levelNumber}`;
});

window.addEventListener("keydown", (e)=>{
  if(e.key==="ArrowRight") moveTo(currentIndex+1).then(updateHud);
  else if(e.key==="ArrowLeft") moveTo(currentIndex-1).then(updateHud);
  else if((e.key==="Enter"||e.key===" ") && !document.getElementById("playBtn").disabled) document.getElementById("playBtn").click();
});

/* ---------- character selection ---------- */
document.getElementById("charBtn").textContent = CHAR_THEMES[progress.character].avatar;
document.getElementById("charBtn").addEventListener("click", ()=>{
  document.querySelectorAll(".char-option").forEach(opt=>{
    opt.classList.toggle("selected", opt.dataset.char===progress.character);
  });
  document.getElementById("charModal").classList.add("show");
});
document.querySelectorAll(".char-option").forEach(opt=>{
  opt.addEventListener("click", ()=>{
    const key = opt.dataset.char;
    if(key!==progress.character){
      progress.character = key;
      saveProgress();
      document.getElementById("charBtn").textContent = CHAR_THEMES[key].avatar;
      rebuildPlayer(key);
    }
    document.getElementById("charModal").classList.remove("show");
  });
});
document.getElementById("charModal").addEventListener("click", (e)=>{
  if(e.target.id==="charModal") e.target.classList.remove("show");
});

/* ---------- resize ---------- */
function onResize(){
  const w = wrap.clientWidth, h = wrap.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w/h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", onResize);
onResize();

/* ---------- main loop ---------- */
function frame(){
  requestAnimationFrame(frame);
  const now = performance.now();

  for(const n of nodeGroups){
    n.marker.rotation.y += 0.012;
    n.marker.rotation.x += 0.004;
  }
  if(player.userData.thrusters){
    const flick = 0.55 + Math.sin(now*0.02)*0.2 + Math.random()*0.1;
    for(const th of player.userData.thrusters) th.scale.set(1, flick, 1);
  }

  updateCamera(false);
  renderer.render(scene, camera);
}

updateCamera(true);
updateHud();
frame();
