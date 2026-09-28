// p5.js 자동 로더
if (typeof p5 === "undefined") {
  let script = document.createElement("script");
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js";
  script.onload = () => {
    new p5();
  };
  document.head.appendChild(script);
}

let dropPoints = [];
let landedBalls = [];
let swingAngle = 0;

// --- [ 바닥 물체 클래스 ] ---
class LandedBall {
  constructor(x, y, vx, color, shapeType) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = 0;
    this.r = 8;
    this.color = color;
    this.shapeType = shapeType;
    this.friction = 0.92;
    this.bounce = -0.3;
    this.isSettled = false;
    this.rotation = random(TWO_PI);
    this.rotSpeed = vx * 0.1;
  }

  update(floorBaseY) {
    this.x += this.vx;
    this.vx *= this.friction;

    this.vy += 0.2;
    this.y += this.vy;
    this.rotation += this.rotSpeed;
    this.rotSpeed *= 0.95;

    if (this.y >= floorBaseY) {
      this.y = floorBaseY;
      this.vy *= this.bounce;
    }

    if (this.x - this.r < width * 0.1) {
      this.x = width * 0.1 + this.r;
      this.vx *= -0.5;
    }

    if (Math.abs(this.vx) < 0.05 && Math.abs(this.vy) < 0.1) {
      this.vx = 0;
      this.vy = 0;
      this.rotSpeed = 0;
      this.isSettled = true;
    }
  }

  collideWithOthers(others) {
    for (let i = 0; i < others.length; i++) {
      let other = others[i];
      if (other === this) continue;

      let dx = other.x - this.x;
      let dy = other.y - this.y;
      let dist = Math.sqrt(dx * dx + dy * dy);
      let minDist = this.r + other.r;

      if (dist < minDist && dist > 0) {
        let overlap = minDist - dist;
        let nx = dx / dist;

        this.x -= nx * overlap * 0.3;
        other.x += nx * overlap * 0.3;

        this.vx -= nx * 0.2;
        other.vx += nx * 0.2;

        this.isSettled = false;
        other.isSettled = false;
      }
    }
  }

  draw() {
    push();
    translate(this.x, this.y);
    rotate(this.rotation);
    fill(this.color);
    noStroke();
    drawCalderShape(0, 0, this.r * 2.2, this.shapeType);
    pop();
  }

  drawShadow() {
    fill(0, 0, 0, 20);
    noStroke();
    ellipse(this.x + 1, this.y + 3, this.r * 2, 6);
  }
}

// 칼더 모빌 스타일 유기적 도형 렌더링 함수
function drawCalderShape(x, y, size, shapeType) {
  push();
  translate(x, y);

  if (shapeType === 0) {
    // 1. 유기적 조약돌
    ellipse(0, 0, size * 1.3, size * 0.8);
  } else if (shapeType === 1) {
    // 2. 물방울 모양
    circle(0, size * 0.1, size * 0.9);
    triangle(0, -size * 0.7, -size * 0.45, 0, size * 0.45, 0);
  } else if (shapeType === 2) {
    // 3. 부드러운 다이아몬드 조각
    rectMode(CENTER);
    push();
    rotate(QUARTER_PI);
    rect(0, 0, size * 0.75, size * 0.75, size * 0.25);
    pop();
  } else if (shapeType === 3) {
    // 4. 모빌 유기적 알약 조각
    rectMode(CENTER);
    rect(0, 0, size * 1.2, size * 0.6, size * 0.3);
  } else {
    // 5. 비대칭 나뭇잎 조각
    ellipse(-size * 0.2, 0, size * 0.8, size * 0.5);
    ellipse(size * 0.2, 0, size * 0.8, size * 0.5);
  }
  pop();
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  initElements();
}

function initElements() {
  dropPoints = [];
  landedBalls = [];

  let lineConfigs = [
    { xRatio: 0.45, length: 180, color: "#fa7b7b", weight: 5, shapeType: 0 },
    { xRatio: 0.53, length: 110, color: "#7dc3f9", weight: 5, shapeType: 1 },
    { xRatio: 0.62, length: 240, color: "#ebfb6f", weight: 5, shapeType: 2 },
    { xRatio: 0.72, length: 140, color: "#c0f0f9", weight: 5, shapeType: 3 },
    { xRatio: 0.82, length: 200, color: "#fe94d2", weight: 5, shapeType: 4 },
  ];

  for (let i = 0; i < lineConfigs.length; i++) {
    let cfg = lineConfigs[i];
    let localX = width * cfg.xRatio;

    let x1 = width * 0.2;
    let y1 = height * 0.1;
    let x2 = width * 0.9;
    let y2 = height * 0.22;
    let localY = map(localX, x1, x2, y1, y2);

    dropPoints.push({
      localX: localX,
      localY: localY,
      length: cfg.length,
      dropDistance: 15,
      speed: 0,
      gravity: 0.2,
      bounce: -0.5,
      vx: 0,
      color: cfg.color,
      weight: cfg.weight,
      shapeType: cfg.shapeType,
      currentX: 0,
      absoluteY: 0,
      isBouncing: false,
    });
  }
}

function draw() {
  background("#ffd4d4");

  let pivotX = width * 0.36;
  let pivotY = height * 0.13;
  let floorBaseY = height * 0.95 - 8;

  swingAngle = sin(frameCount * 0.02) * 0.2;

  // --- [ 0. 그림자 렌더링 ] ---
  for (let i = 0; i < landedBalls.length; i++) {
    landedBalls[i].drawShadow();
  }

  for (let i = 0; i < dropPoints.length; i++) {
    let p = dropPoints[i];
    let circleY = p.isBouncing
      ? p.absoluteY
      : p.triangleBottomY + p.dropDistance;
    let distToFloor = max(0, floorBaseY - circleY);
    let shadowAlpha = map(distToFloor, 0, height * 0.5, 50, 5);
    let shadowSize = map(distToFloor, 0, height * 0.5, 16, 6);

    fill(0, 0, 0, shadowAlpha);
    noStroke();
    ellipse(p.currentX, floorBaseY + 8, shadowSize, shadowSize * 0.4);
  }

  // --- [ 1. 고정 지지대 기둥 및 3개 흰색 지지선 ] ---
  noFill();
  stroke("#ffffff");
  strokeWeight(5);

  bezier(
    pivotX,
    pivotY,
    width * 0.1,
    height * 0.4,
    width * 0.1,
    height * 0.6,
    width * 0.15,
    height * 0.8,
  );

  line(width * 0.15, height * 0.8, width * 0.1, height * 0.95);
  line(width * 0.15, height * 0.8, width * 0.15, height * 0.95);
  line(width * 0.15, height * 0.8, width * 0.22, height * 0.95);

  // --- [ 2. 바닥 물체 물리 및 화면 밖 삭제 ] ---
  for (let i = landedBalls.length - 1; i >= 0; i--) {
    let ball = landedBalls[i];
    ball.update(floorBaseY);
    ball.collideWithOthers(landedBalls);
    ball.draw();

    if (ball.x > width + 50) {
      landedBalls.splice(i, 1);
    }
  }

  // --- [ 3. 회전 상단 구조물 ] ---
  push();
  translate(pivotX, pivotY);
  rotate(swingAngle);

  stroke("#ffffff");
  strokeWeight(5);
  line(
    width * 0.2 - pivotX,
    height * 0.1 - pivotY,
    width * 0.9 - pivotX,
    height * 0.22 - pivotY,
  );

  for (let i = 0; i < dropPoints.length; i++) {
    let p = dropPoints[i];

    let rx = p.localX - pivotX;
    let ry = p.localY - pivotY;
    let lineBottomRy = ry + p.length;

    stroke(p.color);
    strokeWeight(p.weight);
    line(rx, ry, rx, lineBottomRy);

    // 상단 칼더 스타일 면 조각
    fill(p.color);
    noStroke();
    drawCalderShape(rx, lineBottomRy, 40, p.shapeType);

    let cosA = cos(swingAngle);
    let sinA = sin(swingAngle);

    p.triangleBottomY = pivotY + rx * sinA + lineBottomRy * cosA;

    if (!p.isBouncing) {
      p.currentX = pivotX + rx * cosA - (lineBottomRy + p.dropDistance) * sinA;
      p.absoluteY = p.triangleBottomY + p.dropDistance;
    }
  }
  pop();

  // --- [ 4. 물체 낙하 물리 ] ---
  for (let i = 0; i < dropPoints.length; i++) {
    let p = dropPoints[i];

    p.speed += p.gravity;

    if (p.isBouncing) {
      p.absoluteY += p.speed;
      p.currentX += p.vx;
      p.vx *= 0.97;
    } else {
      p.dropDistance += p.speed;
      p.absoluteY = p.triangleBottomY + p.dropDistance;
    }

    let circleY = p.absoluteY;

    // 낙하 중인 도형
    fill(p.color);
    noStroke();
    drawCalderShape(p.currentX, circleY, 15, p.shapeType);

    if (circleY >= floorBaseY) {
      p.absoluteY = floorBaseY;

      if (Math.abs(p.speed) > 1.2) {
        p.speed *= p.bounce;

        if (!p.isBouncing) {
          let swingImpulse = cos(frameCount * 0.02) * 3;
          p.vx = swingImpulse + random(-3, 3);
          p.isBouncing = true;
        }
      } else {
        let finalRollVx = p.vx + random(-1.5, 1.5);
        landedBalls.push(
          new LandedBall(
            p.currentX,
            floorBaseY,
            finalRollVx,
            p.color,
            p.shapeType,
          ),
        );

        p.dropDistance = 15;
        p.speed = 0;
        p.vx = 0;
        p.isBouncing = false;
      }
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  initElements();
}
