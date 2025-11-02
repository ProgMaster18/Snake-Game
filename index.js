const config = {
  gridSize: 20,
  initialSnakeLength: 5,
  baseTick: 10,
  speedMultiplier: 1,
  mode: "classic", 
  colors: {
    bg: "#061016",
    snake: "#00f5a0",
    snakeHead: "#7c5cff",
    food: "#ff4d7e",
    grid: "rgba(255,255,255,0.02)",
    neonGlow: "rgba(124,92,255,0.15)"
  }
};

let canvas, ctx;
let logicalSize = 600;
let cellSize;
let snake = [];
let dir = {x:1,y:0};
let pendingDir = null;
let food = null;
let score = 0;
let highScore = 0;
let running = false;
let paused = false;
let gameOver = false;
let tickInterval = 1000 / config.baseTick;
let lastTick = 0;
let speedName = "Normal";

function randInt(min,max){return Math.floor(Math.random()*(max-min+1))+min;}

function init(){
  canvas=document.getElementById("gameCanvas");
  ctx=canvas.getContext("2d");
  canvas.width=logicalSize;
  canvas.height=logicalSize;
  cellSize=Math.floor(logicalSize/config.gridSize);
  highScore=parseInt(localStorage.getItem("neon_snake_highscore")||"0",10);
  document.getElementById("highScore").textContent=highScore;
  attachUI();
  resetGame();
  draw();
  requestAnimationFrame(loop);
}

function resetGame(){
  snake=[];
  for(let i=0;i<config.initialSnakeLength;i++)
    snake.push({x:Math.floor(config.gridSize/2)-i,y:Math.floor(config.gridSize/2)});
  dir={x:1,y:0};
  pendingDir=null;
  placeFood();
  score=0;
  running=false;
  paused=false;
  gameOver=false;
  document.getElementById("score").textContent=score;
  updateOverlay();
}

window.addEventListener("keydown",e=>{
  const k=e.key;
  if(k==="ArrowUp"||k==="w"||k==="W")trySetDir(0,-1);
  if(k==="ArrowDown"||k==="s"||k==="S")trySetDir(0,1);
  if(k==="ArrowLeft"||k==="a"||k==="A")trySetDir(-1,0);
  if(k==="ArrowRight"||k==="d"||k==="D")trySetDir(1,0);
  if(k===" ")togglePause();
});

function trySetDir(x,y){
  if(pendingDir)return;
  if(x===-dir.x&&y===-dir.y)return;
  pendingDir={x,y};
}

function attachDpad(){
  const dpad=document.querySelectorAll(".dpad button");
  dpad.forEach(btn=>{
    const set=(d)=>{if(d==="up")trySetDir(0,-1);
      if(d==="down")trySetDir(0,1);
      if(d==="left")trySetDir(-1,0);
      if(d==="right")trySetDir(1,0);}
    btn.addEventListener("touchstart",e=>{e.preventDefault();set(btn.dataset.dir);},{passive:false});
    btn.addEventListener("mousedown",e=>{e.preventDefault();set(btn.dataset.dir);});
  });
}

function placeFood(){
  let valid=false;let tries=0;
  while(!valid&&tries<5000){
    const fx=randInt(0,config.gridSize-1),fy=randInt(0,config.gridSize-1);
    if(!snake.some(s=>s.x===fx&&s.y===fy)){food={x:fx,y:fy};valid=true;}
    tries++;
  }
  if(!valid)food={x:Math.floor(config.gridSize/2)+2,y:Math.floor(config.gridSize/2)+1};
}

function step(){
  if(pendingDir){dir=pendingDir;pendingDir=null;}
  const head={x:snake[0].x+dir.x,y:snake[0].y+dir.y};

  if(config.mode==="wrap"){
    if(head.x<0)head.x=config.gridSize-1;
    if(head.x>=config.gridSize)head.x=0;
    if(head.y<0)head.y=config.gridSize-1;
    if(head.y>=config.gridSize)head.y=0;
  }else{
    if(head.x<0||head.x>=config.gridSize||head.y<0||head.y>=config.gridSize){endGame();return;}
  }

  if(snake.some(seg=>seg.x===head.x&&seg.y===head.y)){endGame();return;}

  snake.unshift(head);
  if(food&&head.x===food.x&&head.y===food.y){
    score+=10;
    if(score%50===0&&config.speedMultiplier<3){
      config.speedMultiplier+=0.2;
      updateSpeedLabel();
      tickInterval=1000/(config.baseTick*config.speedMultiplier);
    }
    placeFood();
  }else snake.pop();
  document.getElementById("score").textContent=score;
}

function endGame(){
  running=false;gameOver=true;
  if(score>highScore){
    highScore=score;
    localStorage.setItem("neon_snake_highscore",String(highScore));
    document.getElementById("highScore").textContent=highScore;
  }
  showOverlay("Game Over",`Score: ${score}`);
  playSound(120,0.06,"sawtooth");
}

function clear(){ctx.fillStyle=config.colors.bg;ctx.fillRect(0,0,canvas.width,canvas.height);}
function drawGrid(){
  ctx.strokeStyle=config.colors.grid;ctx.lineWidth=1;
  for(let i=0;i<=config.gridSize;i++){
    const pos=i*cellSize+0.5;
    ctx.beginPath();ctx.moveTo(pos,0);ctx.lineTo(pos,logicalSize);ctx.stroke();
    ctx.beginPath();ctx.moveTo(0,pos);ctx.lineTo(logicalSize,pos);ctx.stroke();
  }
}
function drawCell(x,y,fillStyle,glowColor=null){
  const px=x*cellSize,py=y*cellSize;
  if(glowColor){ctx.save();ctx.shadowColor=glowColor;ctx.shadowBlur=Math.max(8,cellSize*0.6);
    ctx.fillStyle=fillStyle;ctx.fillRect(px+2,py+2,cellSize-4,cellSize-4);ctx.restore();}
  else{ctx.fillStyle=fillStyle;ctx.fillRect(px+2,py+2,cellSize-4,cellSize-4);}
}
function draw(){
  clear();drawGrid();
  if(food){drawCell(food.x,food.y,config.colors.food,config.colors.neonGlow);
    ctx.fillStyle="rgba(255,255,255,0.06)";
    ctx.fillRect(food.x*cellSize+cellSize*0.3,food.y*cellSize+cellSize*0.3,cellSize*0.4,cellSize*0.4);}
  for(let i=snake.length-1;i>=0;i--){
    const seg=snake[i];
    if(i===0){const gx=ctx.createLinearGradient(seg.x*cellSize,seg.y*cellSize,(seg.x+1)*cellSize,(seg.y+1)*cellSize);
      gx.addColorStop(0,config.colors.snakeHead);gx.addColorStop(1,config.colors.snake);
      drawCell(seg.x,seg.y,gx,config.colors.neonGlow);}
    else drawCell(seg.x,seg.y,config.colors.snake);
  }
  ctx.fillStyle="rgba(255,255,255,0.04)";
  ctx.fillRect(10,10,210,36);
  ctx.fillStyle="rgba(255,255,255,0.7)";
  ctx.font="600 14px Inter, system-ui, Arial";
  ctx.fillText(`Score: ${score}`,20,32);
  ctx.fillText(`Speed x${config.speedMultiplier.toFixed(1)}`,120,32);
  ctx.fillText(config.mode==="wrap"?"Mode: Wrap":"Mode: Classic",20,54);
}

function loop(ts){
  if(!lastTick)lastTick=ts;
  requestAnimationFrame(loop);
  if(!running||paused)return;
  const elapsed=ts-lastTick;
  if(elapsed>=tickInterval){
    lastTick=ts-(elapsed%tickInterval);
    step();draw();
  }
}

function attachUI(){
  document.getElementById("startBtn").addEventListener("click",()=>{
    if(gameOver)resetGame();
    running=true;paused=false;hideOverlay();lastTick=performance.now();playSound(880,0.06,"sine");
  });
  document.getElementById("pauseBtn").addEventListener("click",togglePause);
  document.getElementById("resumeBtn").addEventListener("click",()=>{
    paused=false;hideOverlay();lastTick=performance.now();
  });
  document.getElementById("restartBtn").addEventListener("click",()=>{
    resetGame();running=true;hideOverlay();lastTick=performance.now();
  });

  document.getElementById("speedBtn").addEventListener("click",()=>{
    if(config.speedMultiplier<=0.6){config.speedMultiplier=1;speedName="Normal";}
    else if(config.speedMultiplier<=1.1){config.speedMultiplier=1.5;speedName="Fast";}
    else if(config.speedMultiplier<=1.6){config.speedMultiplier=2;speedName="Very Fast";}
    else{config.speedMultiplier=0.5;speedName="Slow";}
    tickInterval=1000/(config.baseTick*config.speedMultiplier);
    updateSpeedLabel();
  });

  const modeBtn=document.createElement("button");
  modeBtn.id="modeBtn";
  modeBtn.className="secondary";
  modeBtn.textContent="Mode: Classic";
  document.querySelector(".buttons").appendChild(modeBtn);
  modeBtn.addEventListener("click",()=>{
    config.mode=config.mode==="classic"?"wrap":"classic";
    modeBtn.textContent=config.mode==="classic"?"Mode: Classic":"Mode: Wrap";
    playSound(440,0.08,"square");
  });

  attachDpad();
  window.addEventListener("blur",()=>{if(running&&!paused){paused=true;showOverlay("Paused","Window lost focus");}});
}

function updateSpeedLabel(){
  document.getElementById("speedBtn").textContent=`Speed: ${speedName}`;
}

function showOverlay(title,message){
  const ov=document.getElementById("overlay");
  document.getElementById("overlayTitle").textContent=title;
  document.getElementById("overlayMsg").textContent=message;
  ov.style.display="flex";
}
function hideOverlay(){document.getElementById("overlay").style.display="none";}
function updateOverlay(){paused?showOverlay("Paused","Press Resume to continue"):hideOverlay();}
function togglePause(){if(!running)return;paused=!paused;updateOverlay();}

const audioCtx=new(window.AudioContext||window.webkitAudioContext)();
function playSound(freq=440,duration=0.08,type="sine"){
  try{
    const o=audioCtx.createOscillator(),g=audioCtx.createGain();
    o.type=type;o.frequency.value=freq;g.gain.value=0.0001;o.connect(g);g.connect(audioCtx.destination);
    const now=audioCtx.currentTime;
    g.gain.linearRampToValueAtTime(0.12,now+0.005);
    o.start(now);g.gain.exponentialRampToValueAtTime(0.0001,now+duration);
    o.stop(now+duration+0.02);
  }catch(e){}
}

window.addEventListener("resize",()=>{});
init();
