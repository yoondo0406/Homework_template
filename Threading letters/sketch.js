let threads = [];
let particles = [];
let fallingThreads = [];
let ambientParticles = [];
let floorStardust = [];

let canvas;
let canvasWidth = window.innerWidth;
let canvasHeight = window.innerHeight;

let isSpacePressed = false;
let isDragging = false;
let dragStart = null;
let dragCurrent = null;

let currentSelectedThread = null;
let currentReadingBead = null;
let uploadedImgData = null;

let prevMouseX = 0;
let prevMouseY = 0;
let mouseSpeed = 0;
let lastTouchTime = 0;

let pressStartTime = 0;
let targetBeadToHold = null;
let isLongPressTriggered = false;
const LONG_PRESS_DURATION = 800; // 0.8초 이상 누르고 있어야 삭제

const threadPalette = [
  "#F4A261",
  "#E76F51",
  "#2A9D8F",
  "#E9C46A",
  "#A8DADC",
  "#457B9D",
  "#D8B4E2",
  "#FFB7B2",
  "#B5EAD7",
  "#C7CEEA",
  "#E2F0CB",
  "#FFDAC1",
];

const beadPalette = [
  { r: 255, g: 179, b: 186, name: "Rose Quartz" },
  { r: 255, g: 223, b: 186, name: "Peach" },
  { r: 255, g: 255, b: 186, name: "Lemon" },
  { r: 186, g: 255, b: 201, name: "Mint" },
  { r: 186, g: 225, b: 255, name: "Sky" },
  { r: 221, g: 186, b: 255, name: "Lavender" },
  { r: 254, g: 200, b: 216, name: "Blush" },
];

// Web Audio API (사운드 시스템)
let audioCtx = null;

function unlockAudio() {
  try {
    if (!audioCtx) {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    let buffer = audioCtx.createBuffer(1, 1, 22050);
    let source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start(0);
  } catch (e) {}
}

function playTone(freq, type = "sine", duration = 0.4, gainVal = 0.18) {
  unlockAudio();
  if (!audioCtx) return;
  try {
    let osc = audioCtx.createOscillator();
    let gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(gainVal, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      audioCtx.currentTime + duration,
    );
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {}
}

function playStringSound() {
  let baseFreq = random(600, 1000);
  playTone(baseFreq, "sine", 0.35, 0.15);
  playTone(baseFreq * 1.5, "triangle", 0.2, 0.08);
}

function playBeadSound() {
  let freq = random(1000, 1600);
  playTone(freq, "sine", 0.3, 0.18);
}

function playShatterSound() {
  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      playTone(random(1200, 3200), "triangle", random(0.1, 0.25), 0.12);
    }, i * 25);
  }
}

function setup() {
  canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent("canvas-container");

  setupCanvasEvents();
  setupUIEvents();

  for (let i = 0; i < 50; i++) {
    ambientParticles.push(new AmbientParticle());
  }

  loadDataFromLocalStorage();

  window.addEventListener("touchstart", unlockAudio, {
    once: true,
    passive: true,
  });
  window.addEventListener("pointerdown", unlockAudio, {
    once: true,
    passive: true,
  });
}

function windowResized() {
  canvasWidth = window.innerWidth;
  canvasHeight = window.innerHeight;
  resizeCanvas(canvasWidth, canvasHeight);
}

function draw() {
  background(13, 13, 14);

  mouseSpeed = dist(mouseX, mouseY, prevMouseX, prevMouseY);
  prevMouseX = mouseX;
  prevMouseY = mouseY;

  let hoveringInteractive = false;

  for (let fs of floorStardust) {
    fs.display();
  }

  for (let ap of ambientParticles) {
    ap.update();
    ap.display();
  }

  let activeX = touches.length > 0 ? touches[0].x : mouseX;
  let activeY = touches.length > 0 ? touches[0].y : mouseY;

  if (isDragging && dragStart && dragCurrent) {
    stroke(255, 255, 255, 180);
    strokeWeight(2);
    drawingContext.setLineDash([4, 4]);
    line(dragStart.x, dragStart.y, dragStart.x, dragCurrent.y);
    drawingContext.setLineDash([]);

    fill(255, 255, 255, 220);
    noStroke();
    circle(dragStart.x, dragStart.y, 7);
    circle(dragStart.x, dragCurrent.y, 7);
  }

  for (let i = threads.length - 1; i >= 0; i--) {
    let t = threads[i];
    t.update();
    t.display();

    if (!isSpacePressed && touches.length < 2 && !isModalOpen()) {
      if (t.isClicked(activeX, activeY)) hoveringInteractive = true;
      for (let b of t.beads) {
        if (b.contains(activeX, activeY)) hoveringInteractive = true;
      }
    }
  }

  // 롱프레스(꾹 누르기) 시 삭제 원형 애니메이션 처리
  if (targetBeadToHold && !isLongPressTriggered && !isModalOpen()) {
    let elapsed = millis() - pressStartTime;
    if (elapsed >= LONG_PRESS_DURATION) {
      targetBeadToHold.shatter();
      removeBeadFromStorage(targetBeadToHold);
      targetBeadToHold = null;
      isLongPressTriggered = true;
    } else {
      push();
      noFill();
      stroke(244, 63, 94, 220);
      strokeWeight(2);
      let progress = map(elapsed, 0, LONG_PRESS_DURATION, 0, TWO_PI);
      arc(
        targetBeadToHold.x,
        targetBeadToHold.y,
        targetBeadToHold.radius * 3,
        targetBeadToHold.radius * 3,
        0,
        progress,
      );
      pop();
    }
  }

  for (let i = fallingThreads.length - 1; i >= 0; i--) {
    let ft = fallingThreads[i];
    ft.update();
    ft.display();
    if (ft.isDead()) fallingThreads.splice(i, 1);
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.update();
    p.display();
    if (p.isDead()) particles.splice(i, 1);
  }

  // ✂️ 가위 모드: 아이패드는 두 손가락, 노트북은 스페이스바
  if (touches.length >= 2 && !isModalOpen()) {
    let scissorX = touches[1].x;
    let scissorY = touches[1].y;
    drawScissorsCursor(scissorX, scissorY);

    for (let i = threads.length - 1; i >= 0; i--) {
      let t = threads[i];
      let cutPointY = t.checkCut(scissorX, scissorY);
      if (cutPointY !== null) {
        t.cutAt(cutPointY);
        threads.splice(i, 1);
        saveDataToLocalStorage();
        playShatterSound();
        break;
      }
    }
  } else if (isSpacePressed) {
    drawScissorsCursor(mouseX, mouseY);
  } else if (hoveringInteractive) {
    cursor(HAND);
  } else {
    cursor(ARROW);
  }
}

// ----------------------------------------------------
// LocalStorage
// ----------------------------------------------------
function saveDataToLocalStorage() {
  let dataToSave = threads.map((t) => ({
    x: t.x,
    topY: t.topY,
    bottomY: t.bottomY,
    recipient: t.recipient,
    color: t.color,
    beads: t.beads.map((b) => ({
      targetY: b.targetY,
      content: b.content,
      imgData: b.imgData,
      dateStr: b.dateStr,
      radius: b.radius,
      palette: b.palette,
    })),
  }));
  localStorage.setItem("threading_for_me_threads", JSON.stringify(dataToSave));
}

function loadDataFromLocalStorage() {
  let savedData = localStorage.getItem("threading_for_me_threads");
  if (savedData) {
    try {
      let parsed = JSON.parse(savedData);
      threads = parsed.map((td) => {
        let t = new Thread(td.x, td.topY, td.bottomY, td.recipient);
        t.color = td.color;
        t.beads = td.beads.map((bd) => {
          let b = new Bead(
            td.x,
            td.topY,
            bd.targetY,
            bd.content,
            bd.imgData,
            bd.dateStr,
          );
          b.radius = bd.radius;
          b.palette = bd.palette;
          return b;
        });
        return t;
      });
    } catch (e) {}
  }
}

function removeBeadFromStorage(beadObj) {
  for (let t of threads) {
    let idx = t.beads.indexOf(beadObj);
    if (idx !== -1) {
      t.beads.splice(idx, 1);
      break;
    }
  }
  saveDataToLocalStorage();
}

// ----------------------------------------------------
// 캔버스 직접 이벤트 바인딩 (탭과 꾹 누르기 완벽 분리)
// ----------------------------------------------------
window.addEventListener("keydown", (e) => {
  unlockAudio();
  if (isModalOpen()) return;
  if (e.code === "Space") {
    isSpacePressed = true;
    e.preventDefault();
  }
});

window.addEventListener("keyup", (e) => {
  if (e.code === "Space") isSpacePressed = false;
});

function setupCanvasEvents() {
  if (!canvas || !canvas.elt) return;
  let el = canvas.elt;

  el.addEventListener(
    "touchstart",
    (e) => {
      if (isModalOpen()) return;
      lastTouchTime = millis();
      unlockAudio();
      e.preventDefault();

      if (e.touches.length >= 2) return;

      let touch = e.touches[0];
      let rect = el.getBoundingClientRect();
      let tx = touch.clientX - rect.left;
      let ty = touch.clientY - rect.top;

      // 비즈를 터치한 경우: 바로 삭제 트리거가 아니라 탭/롱프레스 판별을 위해 대상 지정
      for (let t of threads) {
        for (let b of t.beads) {
          if (b.contains(tx, ty)) {
            targetBeadToHold = b;
            pressStartTime = millis();
            isLongPressTriggered = false;
            return;
          }
        }
      }

      handlePress(tx, ty);
    },
    { passive: false },
  );

  el.addEventListener(
    "touchmove",
    (e) => {
      if (isModalOpen()) return;
      lastTouchTime = millis();
      e.preventDefault();

      if (e.touches.length >= 2) return;

      let touch = e.touches[0];
      let rect = el.getBoundingClientRect();
      let activeX = touch.clientX - rect.left;
      let activeY = touch.clientY - rect.top;

      if (
        targetBeadToHold &&
        dist(activeX, activeY, targetBeadToHold.x, targetBeadToHold.y) > 20
      ) {
        targetBeadToHold = null; // 손가락이 빗나가면 롱프레스 취소
      }

      if (isDragging && dragStart) {
        dragCurrent.x = activeX;
        dragCurrent.y = activeY;
      }
    },
    { passive: false },
  );

  el.addEventListener("touchend", (e) => {
    if (isModalOpen()) return;
    lastTouchTime = millis();

    // 비즈를 터치했다가 빠르게 떼었을 때 (탭) -> 편지 읽기 모달 오픈!
    if (targetBeadToHold && !isLongPressTriggered) {
      let elapsed = millis() - pressStartTime;
      if (elapsed < LONG_PRESS_DURATION) {
        let recipient = "누군가";
        for (let t of threads) {
          if (t.beads.includes(targetBeadToHold)) {
            recipient = t.recipient;
            break;
          }
        }
        playBeadSound();
        targetBeadToHold.triggerReadAnimation();
        openReadModal(targetBeadToHold, recipient);
      }
    }

    targetBeadToHold = null;
    handleRelease();
  });

  el.addEventListener("mousedown", (e) => {
    if (isModalOpen()) return;
    if (millis() - lastTouchTime < 300) return;
    unlockAudio();
    let rect = el.getBoundingClientRect();
    let mx = e.clientX - rect.left;
    let my = e.clientY - rect.top;

    // 데스크톱 마우스 클릭 시 비즈를 누르면 바로 편지 읽기 창 열기
    for (let t of threads) {
      for (let b of t.beads) {
        if (b.contains(mx, my)) {
          playBeadSound();
          b.triggerReadAnimation();
          openReadModal(b, t.recipient);
          return;
        }
      }
    }

    handlePress(mx, my);
  });

  window.addEventListener("mousemove", (e) => {
    if (isModalOpen()) return;
    if (isDragging && dragStart && canvas && canvas.elt) {
      let rect = canvas.elt.getBoundingClientRect();
      dragCurrent.x = e.clientX - rect.left;
      dragCurrent.y = e.clientY - rect.top;
    }
  });

  window.addEventListener("mouseup", (e) => {
    if (isModalOpen()) return;
    targetBeadToHold = null;
    handleRelease();
  });
}

function handlePress(px, py) {
  if (isModalOpen()) return;

  if (isSpacePressed) {
    for (let i = threads.length - 1; i >= 0; i--) {
      let t = threads[i];
      let cutPointY = t.checkCut(px, py);
      if (cutPointY !== null) {
        t.cutAt(cutPointY);
        threads.splice(i, 1);
        saveDataToLocalStorage();
        playShatterSound();
        break;
      }
    }
    return;
  }

  for (let t of threads) {
    if (t.isClicked(px, py)) {
      currentSelectedThread = t;
      playStringSound();
      openWriteModal(t.recipient);
      return;
    }
  }

  isDragging = true;
  dragStart = createVector(px, py);
  dragCurrent = createVector(px, py);
}

function handleRelease() {
  let activeY = dragCurrent ? dragCurrent.y : dragStart ? dragStart.y : 0;
  if (isDragging && dragStart) {
    let len = dist(dragStart.x, dragStart.y, dragStart.x, activeY);
    if (len > 25) {
      let topY = min(dragStart.y, activeY);
      let bottomY = max(dragStart.y, activeY);
      openNameModal(dragStart.x, topY, bottomY);
    }
  }
  isDragging = false;
  dragStart = null;
  dragCurrent = null;
}

// ----------------------------------------------------
// 클래스들 (AmbientParticle, Thread, Bead, 파티클 등)
// ----------------------------------------------------
class AmbientParticle {
  constructor() {
    this.x = random(canvasWidth);
    this.y = random(canvasHeight);
    this.size = random(1, 3);
    this.vx = random(-0.2, 0.2);
    this.vy = random(-0.3, -0.05);
    this.alpha = random(30, 120);
    this.pulse = random(TWO_PI);
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.pulse += 0.02;
    if (this.y < 0) this.y = canvasHeight;
    if (this.x < 0) this.x = canvasWidth;
    if (this.x > canvasWidth) this.x = 0;
  }
  display() {
    noStroke();
    let a = this.alpha + sin(this.pulse) * 20;
    fill(255, 255, 255, a);
    circle(this.x, this.y, this.size);
  }
}

class Thread {
  constructor(x, topY, bottomY, recipient) {
    this.x = x;
    this.topY = topY;
    this.bottomY = bottomY;
    this.recipient = recipient;
    this.color = getUniqueThreadColor();
    this.beads = [];
    this.segments = 24;
    this.nodes = [];
    let segLen = (this.bottomY - this.topY) / this.segments;
    for (let i = 0; i <= this.segments; i++) {
      this.nodes.push({
        x: this.x,
        y: this.topY + i * segLen,
        targetX: this.x,
        vx: 0,
      });
    }
    this.waveOffset = random(100);
    this.wasTouched = false;
  }
  update() {
    if (isModalOpen()) return;
    this.waveOffset += 0.01;
    let windWave = sin(frameCount * 0.01 + this.waveOffset) * 0.1;
    let activeX = touches.length > 0 ? touches[0].x : mouseX;
    let activeY = touches.length > 0 ? touches[0].y : mouseY;
    let d = dist(activeX, activeY, this.x, activeY);
    let isTouching = activeY >= this.topY && activeY <= this.bottomY && d < 45;

    if (isTouching) {
      let pushForce = map(d, 0, 45, 1.2, 0);
      let dir = activeX > this.x ? -1 : 1;
      let hitNormY = map(activeY, this.topY, this.bottomY, 0, 1);
      for (let i = 1; i < this.segments; i++) {
        let nodeNormY = i / this.segments;
        let distFromHit = abs(nodeNormY - hitNormY);
        let waveFactor =
          exp(-distFromHit * 6.0) * sin(distFromHit * 8.0 - frameCount * 0.1);
        this.nodes[i].vx += dir * pushForce * waveFactor * 0.3;
      }
      if (
        !this.wasTouched &&
        (mouseSpeed > 1.2 || abs(activeX - prevMouseX) > 0.8)
      ) {
        playStringSound();
        this.wasTouched = true;
      }
    } else {
      this.wasTouched = false;
    }

    for (let i = 1; i < this.segments; i++) {
      let n = this.nodes[i];
      let nodeNorm = i / this.segments;
      let targetX = n.targetX + windWave * sin(nodeNorm * PI);
      let forceX = (targetX - n.x) * 0.03;
      if (i > 1) forceX += (this.nodes[i - 1].x - n.x) * 0.06;
      if (i < this.segments - 1) forceX += (this.nodes[i + 1].x - n.x) * 0.06;
      n.vx += forceX;
      n.vx *= 0.8;
      n.x += n.vx;
    }

    for (let b of this.beads) {
      let norm = (b.targetY - this.topY) / (this.bottomY - this.topY);
      let idx = norm * this.segments;
      let i1 = floor(idx);
      let i2 = min(i1 + 1, this.segments);
      let amt = idx - i1;
      i1 = constrain(i1, 0, this.segments);
      i2 = constrain(i2, 0, this.segments);
      let currentX = lerp(this.nodes[i1].x, this.nodes[i2].x, amt);
      b.update(currentX);
    }
  }
  display() {
    noFill();
    stroke(0, 0, 0, 120);
    strokeWeight(3.5);
    beginShape();
    curveVertex(this.nodes[0].x, this.nodes[0].y);
    for (let n of this.nodes) curveVertex(n.x, n.y);
    curveVertex(this.nodes[this.segments].x, this.nodes[this.segments].y);
    endShape();

    stroke(this.color);
    strokeWeight(2);
    beginShape();
    curveVertex(this.nodes[0].x, this.nodes[0].y);
    for (let n of this.nodes) curveVertex(n.x + 0.8, n.y);
    curveVertex(this.nodes[this.segments].x, this.nodes[this.segments].y);
    endShape();

    fill(255, 180);
    noStroke();
    circle(this.nodes[0].x, this.nodes[0].y, 5);
    circle(this.nodes[this.segments].x, this.nodes[this.segments].y, 5);

    fill(230);
    textSize(11);
    textAlign(CENTER, BOTTOM);
    text(this.recipient, this.nodes[0].x, this.topY - 8);

    for (let b of this.beads) b.display();
  }
  addBead(content, imgData, dateStr) {
    let targetY = this.bottomY - this.beads.length * 32 - 18;
    if (targetY < this.topY + 20) targetY = this.topY + 20;
    let newBead = new Bead(
      this.x,
      this.topY,
      targetY,
      content,
      imgData,
      dateStr,
    );
    this.beads.push(newBead);
    saveDataToLocalStorage();
    playBeadSound();
  }
  isClicked(mx, my) {
    return (
      mx >= this.x - 16 &&
      mx <= this.x + 16 &&
      my >= this.topY &&
      my <= this.bottomY
    );
  }
  checkCut(mx, my) {
    if (abs(mx - this.x) < 25 && my >= this.topY && my <= this.bottomY)
      return my;
    return null;
  }
  cutAt(cutY) {
    let topNodes = [],
      bottomNodes = [];
    for (let n of this.nodes) {
      if (n.y <= cutY) topNodes.push({ x: n.x, y: n.y });
      else bottomNodes.push({ x: n.x, y: n.y });
    }
    if (topNodes.length > 0)
      fallingThreads.push(new FallingThreadSegment(topNodes, this.color, true));
    if (bottomNodes.length > 0)
      fallingThreads.push(
        new FallingThreadSegment(bottomNodes, this.color, false),
      );
    for (let b of this.beads) b.detachAndFall();
    for (let i = 0; i < 12; i++)
      particles.push(new ThreadSparkParticle(this.x, cutY, this.color));
  }
}

class FallingThreadSegment {
  constructor(nodes, color, isTopFixed) {
    this.nodes = nodes.map((n) => ({
      x: n.x,
      y: n.y,
      vx: random(-1.5, 1.5),
      vy: random(-1, 2),
    }));
    this.color = color;
    this.isTopFixed = isTopFixed;
    this.alpha = 255;
    this.gravity = 0.25;
  }
  update() {
    this.alpha -= 2.5;
    for (let i = 0; i < this.nodes.length; i++) {
      let n = this.nodes[i];
      if (this.isTopFixed && i === 0) continue;
      n.vy += this.gravity;
      n.x += n.vx;
      n.y += n.vy;
      if (n.y >= canvasHeight - 5) {
        n.y = canvasHeight - 5;
        n.vx *= 0.6;
        n.vy = -n.vy * 0.3;
      }
    }
  }
  display() {
    noFill();
    let c = color(this.color);
    c.setAlpha(this.alpha);
    stroke(c);
    strokeWeight(2);
    beginShape();
    for (let n of this.nodes) vertex(n.x, n.y);
    endShape();
  }
  isDead() {
    return this.alpha <= 0;
  }
}

class Bead {
  constructor(x, startY, targetY, content, imgData, dateStr) {
    this.x = x;
    this.y = startY;
    this.targetY = targetY;
    this.content = content;
    this.imgData = imgData;
    this.dateStr = dateStr;
    this.radius = random(13, 17);
    this.palette = random(beadPalette);
    this.vy = 0;
    this.gravity = 0.35;
    this.bounce = -0.3;
    this.isAttached = true;
    this.vx = 0;
    this.rot = random(TWO_PI);
    this.vRot = 0;
    this.isHovered = false;
  }
  update(currentX) {
    if (this.isAttached) {
      this.x = currentX;
      if (this.y < this.targetY) {
        this.vy += this.gravity;
        this.y += this.vy;
        if (this.y >= this.targetY) {
          this.y = this.targetY;
          this.vy *= this.bounce;
          if (abs(this.vy) < 0.5) this.vy = 0;
        }
      } else if (this.vy === 0) {
        this.y = lerp(this.y, this.targetY, 0.1);
      }
    } else {
      this.vy += this.gravity;
      this.x += this.vx;
      this.y += this.vy;
      this.rot += this.vRot;
      if (this.y >= canvasHeight - this.radius) this.shatter();
    }
    let activeX = touches.length > 0 ? touches[0].x : mouseX;
    let activeY = touches.length > 0 ? touches[0].y : mouseY;
    this.isHovered =
      this.contains(activeX, activeY) &&
      !isSpacePressed &&
      touches.length < 2 &&
      !isModalOpen();
  }
  display() {
    push();
    translate(this.x, this.y);
    rotate(this.rot);
    let displayRadius = this.radius;
    if (this.isHovered) displayRadius *= 1.25;

    let ctx = drawingContext;
    ctx.save();
    let grad = ctx.createRadialGradient(
      -displayRadius * 0.3,
      -displayRadius * 0.3,
      displayRadius * 0.1,
      0,
      0,
      displayRadius,
    );
    grad.addColorStop(0, `rgba(255, 255, 255, 0.85)`);
    grad.addColorStop(
      0.4,
      `rgba(${this.palette.r}, ${this.palette.g}, ${this.palette.b}, 0.65)`,
    );
    grad.addColorStop(
      1,
      `rgba(${this.palette.r}, ${this.palette.g}, ${this.palette.b}, 0.25)`,
    );
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, displayRadius, 0, TWO_PI);
    ctx.fill();
    ctx.strokeStyle = `rgba(255, 255, 255, 0.5)`;
    ctx.lineWidth = this.isHovered ? 2 : 1;
    ctx.stroke();
    ctx.restore();
    pop();
  }
  contains(mx, my) {
    return dist(mx, my, this.x, this.y) < this.radius + 22;
  }
  detachAndFall() {
    this.isAttached = false;
    this.vx = random(-2.5, 2.5);
    this.vy = random(-2, 1);
    this.vRot = random(-0.1, 0.1);
  }
  shatter() {
    let count = floor(random(10, 16));
    for (let i = 0; i < count; i++)
      particles.push(
        new GlassShardParticle(this.x, canvasHeight - 5, this.palette),
      );
    for (let i = 0; i < 3; i++)
      floorStardust.push(
        new FloorStardust(this.x + random(-15, 15), this.palette),
      );
    playShatterSound();
    this.y = canvasHeight + 999;
  }
  triggerReadAnimation() {
    for (let i = 0; i < 6; i++)
      particles.push(new DustParticle(this.x, this.y));
  }
}

class FloorStardust {
  constructor(x, palette) {
    this.x = x;
    this.y = canvasHeight - random(2, 12);
    this.size = random(1.5, 4);
    this.palette = palette;
    this.alpha = random(80, 150);
  }
  display() {
    noStroke();
    fill(
      this.palette ? this.palette.r : 255,
      this.palette ? this.palette.g : 255,
      this.palette ? this.palette.b : 255,
      this.alpha,
    );
    circle(this.x, this.y, this.size);
  }
}

class GlassShardParticle {
  constructor(x, y, palette) {
    this.x = x;
    this.y = y;
    this.vx = random(-4, 4);
    this.vy = random(-6, -1.5);
    this.size = random(3, 8);
    this.rot = random(TWO_PI);
    this.vRot = random(-0.2, 0.2);
    this.gravity = 0.35;
    this.alpha = 255;
    this.palette = palette;
  }
  update() {
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.rot += this.vRot;
    this.alpha -= 4;
    if (this.y >= canvasHeight - 2) {
      this.y = canvasHeight - 2;
      this.vx *= 0.5;
    }
  }
  display() {
    push();
    translate(this.x, this.y);
    rotate(this.rot);
    noStroke();
    fill(
      this.palette.r,
      this.palette.g,
      this.palette.b,
      map(this.alpha, 0, 255, 0, 180),
    );
    triangle(
      0,
      -this.size,
      -this.size / 2,
      this.size,
      this.size / 2,
      this.size,
    );
    pop();
  }
  isDead() {
    return this.alpha <= 0;
  }
}

class ThreadSparkParticle {
  constructor(x, y, col) {
    this.x = x;
    this.y = y;
    this.vx = random(-2, 2);
    this.vy = random(-2, 2);
    this.alpha = 255;
    this.color = col;
    this.size = random(2, 4);
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= 6;
  }
  display() {
    noStroke();
    let c = color(this.color);
    c.setAlpha(this.alpha);
    fill(c);
    circle(this.x, this.y, this.size);
  }
  isDead() {
    return this.alpha <= 0;
  }
}

class DustParticle {
  constructor(x, y) {
    this.x = x + random(-10, 10);
    this.y = y + random(-10, 10);
    this.vx = random(-0.5, 0.5);
    this.vy = random(-0.8, -0.2);
    this.alpha = 180;
    this.size = random(1.5, 3);
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= 3;
  }
  display() {
    noStroke();
    fill(255, 255, 255, this.alpha);
    circle(this.x, this.y, this.size);
  }
  isDead() {
    return this.alpha <= 0;
  }
}

// ----------------------------------------------------
// UI 및 모달 이벤트
// ----------------------------------------------------
function drawScissorsCursor(x, y) {
  push();
  translate(x, y);
  stroke(244, 63, 94);
  strokeWeight(2);
  noFill();
  line(-8, -8, 8, 8);
  line(-8, 8, 8, -8);
  circle(-10, -10, 6);
  circle(-10, 10, 6);
  pop();
}

function getUniqueThreadColor() {
  let usedColors = threads.map((t) => t.color);
  let available = threadPalette.filter((c) => !usedColors.includes(c));
  if (available.length === 0) return random(threadPalette);
  return random(available);
}

let mediaStream = null;

function setupUIEvents() {
  document.getElementById("cancel-name-btn").onclick = closeNameModal;
  document.getElementById("save-name-btn").onclick = confirmNameModal;

  document.getElementById("close-write-btn").onclick = closeWriteModal;
  document.getElementById("save-letter-btn").onclick = confirmWriteModal;

  document.getElementById("close-read-btn").onclick = closeReadModal;

  let fileInput = document.getElementById("letter-img-input");
  document.getElementById("trigger-file-btn").onclick = () => fileInput.click();
  fileInput.onchange = (e) => {
    let file = e.target.files[0];
    if (file) {
      let reader = new FileReader();
      reader.onload = (event) => {
        uploadedImgData = event.target.result;
        document.getElementById("img-preview").src = uploadedImgData;
        document
          .getElementById("img-preview-container")
          .classList.remove("hidden");
      };
      reader.readAsDataURL(file);
    }
  };

  document.getElementById("trigger-camera-btn").onclick = async () => {
    unlockAudio();
    let cameraModal = document.getElementById("camera-modal");
    let videoElem = document.getElementById("camera-stream");
    cameraModal.classList.remove("hidden");

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      videoElem.srcObject = mediaStream;
    } catch (err) {
      alert("카메라 권한을 확인해주세요.");
      cameraModal.classList.add("hidden");
    }
  };

  document.getElementById("close-camera-btn").onclick = stopCameraStream;

  document.getElementById("capture-photo-btn").onclick = () => {
    unlockAudio();
    let videoElem = document.getElementById("camera-stream");
    let canvasElem = document.getElementById("camera-canvas");
    canvasElem.width = videoElem.videoWidth || 640;
    canvasElem.height = videoElem.videoHeight || 480;
    let ctx = canvasElem.getContext("2d");
    ctx.drawImage(videoElem, 0, 0, canvasElem.width, canvasElem.height);

    uploadedImgData = canvasElem.toDataURL("image/png");
    document.getElementById("img-preview").src = uploadedImgData;
    document.getElementById("img-preview-container").classList.remove("hidden");
    stopCameraStream();
  };

  document.getElementById("remove-img-btn").onclick = () => {
    uploadedImgData = null;
    document.getElementById("letter-img-input").value = "";
    document.getElementById("img-preview-container").classList.add("hidden");
  };
}

function stopCameraStream() {
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  }
  document.getElementById("camera-modal").classList.add("hidden");
}

let pendingThreadData = null;

function openNameModal(x, topY, bottomY) {
  pendingThreadData = { x, topY, bottomY };
  document.getElementById("recipient-input").value = "";
  document.getElementById("name-modal").classList.remove("hidden");
  setTimeout(() => document.getElementById("recipient-input").focus(), 50);
}

function closeNameModal() {
  pendingThreadData = null;
  document.getElementById("name-modal").classList.add("hidden");
}

function confirmNameModal() {
  let name =
    document.getElementById("recipient-input").value.trim() || "누군가";
  if (pendingThreadData) {
    let t = new Thread(
      pendingThreadData.x,
      pendingThreadData.topY,
      pendingThreadData.bottomY,
      name,
    );
    threads.push(t);
    saveDataToLocalStorage();
  }
  closeNameModal();
}

function openWriteModal(recipient) {
  document.getElementById("write-modal-title").innerText =
    `${recipient}에게 남기는 편지`;
  let now = new Date();
  let dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  document.getElementById("write-modal-date").innerText = dateStr;

  document.getElementById("letter-text-input").value = "";
  uploadedImgData = null;
  document.getElementById("img-preview-container").classList.add("hidden");
  document.getElementById("write-modal").classList.remove("hidden");
  setTimeout(() => document.getElementById("letter-text-input").focus(), 50);
}

function closeWriteModal() {
  currentSelectedThread = null;
  document.getElementById("write-modal").classList.add("hidden");
}

function confirmWriteModal() {
  let text = document.getElementById("letter-text-input").value.trim();
  if (!text && !uploadedImgData) return;
  let dateStr = document.getElementById("write-modal-date").innerText;
  if (currentSelectedThread) {
    currentSelectedThread.addBead(text, uploadedImgData, dateStr);
  }
  closeWriteModal();
}

function openReadModal(bead, recipient) {
  currentReadingBead = bead;
  document.getElementById("read-modal-recipient").innerText =
    `To. ${recipient}`;
  document.getElementById("read-modal-date").innerText = bead.dateStr;
  document.getElementById("read-modal-text").innerText = bead.content || "";

  let imgContainer = document.getElementById("read-modal-img-container");
  let imgElem = document.getElementById("read-modal-img");
  if (bead.imgData) {
    imgElem.src = bead.imgData;
    imgContainer.classList.remove("hidden");
  } else {
    imgContainer.classList.add("hidden");
  }
  document.getElementById("read-modal").classList.remove("hidden");
}

function closeReadModal() {
  if (currentReadingBead) {
    playTone(180, "sine", 0.4, 0.04);
    currentReadingBead = null;
  }
  document.getElementById("read-modal").classList.add("hidden");
}

function isModalOpen() {
  return (
    !document.getElementById("name-modal").classList.contains("hidden") ||
    !document.getElementById("write-modal").classList.contains("hidden") ||
    !document.getElementById("read-modal").classList.contains("hidden") ||
    !document.getElementById("camera-modal").classList.contains("hidden")
  );
}
