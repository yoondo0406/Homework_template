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
let landedCircles = []; // 바닥에 쌓인 원 저장용 배열
let swingAngle = 0; // 회전 각도

function setup() {
  createCanvas(windowWidth, windowHeight);
  initElements();
}

function initElements() {
  dropPoints = [];
  landedCircles = [];

  let lineConfigs = [
    { xRatio: 0.45, length: 180, color: "#fa7b7b", weight: 5 },
    { xRatio: 0.53, length: 110, color: "#7dc3f9", weight: 5 },
    { xRatio: 0.62, length: 240, color: "#ebfb6f", weight: 5 },
    { xRatio: 0.72, length: 140, color: "#9dfee7", weight: 5 },
    { xRatio: 0.82, length: 200, color: "#fe94d2", weight: 5 },
  ];

  for (let i = 0; i < lineConfigs.length; i++) {
    let cfg = lineConfigs[i];
    let localX = width * cfg.xRatio;

    // 초기 기준 회전축 선상의 Y 위치 구하기
    let x1 = width * 0.2;
    let y1 = height * 0.1;
    let x2 = width * 0.9;
    let y2 = height * 0.22;
    let localY = map(localX, x1, x2, y1, y2);

    dropPoints.push({
      localX: localX,
      localY: localY,
      length: cfg.length,
      dropDistance: 15, // 삼각형 아래로부터 원이 떨어진 거리
      speed: 0,
      gravity: 0.05 + random(0.02, 0.03),
      landedCount: 0,
      color: cfg.color,
      weight: cfg.weight,
      currentX: 0,
      currentY: 0,
    });
  }
}

function draw() {
  background("#ffd4d4");

  // 1. 회전 중심축 설정 (세로 기둥과 상단 선이 만나는 지점)
  let pivotX = width * 0.36;
  let pivotY = height * 0.13;

  // 좌우 회전 운동 연출 (진자 운동, -0.2 ~ +0.2 라디안 약 ±11도)
  swingAngle = sin(frameCount * 0.02) * 0.2;

  // 2. 왼쪽 지지대 기둥 (고정된 기둥)
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

  // 기둥 아래 Y자 받침 선
  line(width * 0.15, height * 0.8, width * 0.1, height * 0.95);
  line(width * 0.15, height * 0.8, width * 0.22, height * 0.95);
  line(width * 0.15, height * 0.8, width * 0.15, height * 0.95);

  // 3. 바닥에 쌓여있는 원들 그리기
  noStroke();
  for (let c of landedCircles) {
    fill(c.color);
    circle(c.x, c.y, 16);
  }

  // --- [ 회전하는 상단 구조물 시작 ] ---
  push();
  translate(pivotX, pivotY);
  rotate(swingAngle);

  // 상단 지지선 (회전축 기준 상대 좌표로 변환)
  stroke("#ffffff");
  strokeWeight(5);
  line(
    width * 0.2 - pivotX,
    height * 0.1 - pivotY,
    width * 0.9 - pivotX,
    height * 0.22 - pivotY,
  );

  // 4. 각각의 세로줄과 삼각형 그리기
  for (let i = 0; i < dropPoints.length; i++) {
    let p = dropPoints[i];

    // 회전축 기준 상대 좌표
    let rx = p.localX - pivotX;
    let ry = p.localY - pivotY;
    let lineBottomRy = ry + p.length;

    // (1) 세로줄
    stroke(p.color);
    strokeWeight(p.weight);
    line(rx, ry, rx, lineBottomRy);

    // (2) 삼각형 (줄 끝부분)
    fill(p.color);
    noStroke();
    triangle(
      rx,
      lineBottomRy - 12,
      rx - 16,
      lineBottomRy + 4,
      rx + 16,
      lineBottomRy + 4,
    );

    // 실제 화면(글로벌) 좌표로 변환해 저장 (원 떨어짐 계산용)
    let cosA = cos(swingAngle);
    let sinA = sin(swingAngle);

    // 원이 새로 생성되는 매달린 위치의 실제 화면 좌표
    p.spawnX = pivotX + rx * cosA - (lineBottomRy + 15) * sinA;
    p.spawnY = pivotY + rx * sinA + (lineBottomRy + 15) * cosA;

    // 회전할 때 원의 X축 궤적 수평 이동 계산
    p.currentX = pivotX + rx * cosA - (lineBottomRy + p.dropDistance) * sinA;
    p.triangleBottomY = pivotY + rx * sinA + lineBottomRy * cosA;
  }
  pop();
  // --- [ 회전하는 상단 구조물 끝 ] ---

  // 5. 중력에 의해 떨어지는 원 이동 및 수직 착지 처리
  for (let i = 0; i < dropPoints.length; i++) {
    let p = dropPoints[i];

    // 중력 가속도 계산
    p.speed += p.gravity;
    p.dropDistance += p.speed;

    let circleY = p.triangleBottomY + p.dropDistance;

    // 떨어지는 원 그리기
    fill(p.color);
    noStroke();
    circle(p.currentX, circleY, 16);

    // 바닥 착지 조건
    let diameter = 16;
    let floorY = height * 0.9 - Math.floor(p.landedCount / 2) * (diameter - 4);

    if (circleY >= floorY) {
      // 회전 속도와 움직임 방향에 맞춰 옆으로 넓고 자연스럽게 흩뿌려짐
      let swingImpulse = cos(frameCount * 0.02) * 30; // 회전하는 속도감 반영
      let bounceX = p.currentX + swingImpulse + random(-30, 30);
      let bounceY = floorY + random(-4, 4);

      landedCircles.push({ x: bounceX, y: bounceY, color: p.color });
      p.landedCount++;

      // 원 초기화
      p.dropDistance = 15;
      p.speed = 0;
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  initElements();
}
