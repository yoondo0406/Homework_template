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

function setup() {
  createCanvas(windowWidth, windowHeight);
  initElements();
}

// 상단 대각선 Y 좌표 구하는 함수
function getTopLineY(x) {
  let x1 = width * 0.2;
  let y1 = height * 0.1;
  let x2 = width * 0.9;
  let y2 = height * 0.22;
  return map(x, x1, x2, y1, y2);
}

function initElements() {
  dropPoints = [];
  landedCircles = [];

  // 5개 선의 위치, 길이, 색상, 굵기 지정
  let lineConfigs = [
    { xRatio: 0.45, length: 180, color: "#fa7b7b", weight: 5 }, // 1번 줄
    { xRatio: 0.53, length: 110, color: "#7dc3f9", weight: 5 }, // 2번 줄
    { xRatio: 0.62, length: 240, color: "#ebfb6f", weight: 5 }, // 3번 줄
    { xRatio: 0.72, length: 140, color: "#9dfee7", weight: 5 }, // 4번 줄
    { xRatio: 0.82, length: 200, color: "#fe94d2", weight: 5 }, // 5번 줄
  ];

  for (let i = 0; i < lineConfigs.length; i++) {
    let cfg = lineConfigs[i];
    let x = width * cfg.xRatio;
    let lineTopY = getTopLineY(x);
    let lineBottomY = lineTopY + cfg.length;
    let triangleY = lineBottomY;

    dropPoints.push({
      x: x,
      lineTopY: lineTopY,
      lineBottomY: lineBottomY,
      triangleY: triangleY,
      circleY: triangleY + 15,
      speed: 0,
      gravity: 0.05 + random(0.02, 0.03),
      landedCount: 0,
      color: cfg.color,
      weight: cfg.weight,
    });
  }
}

function draw() {
  background("#f7dcd5");

  // 1. 상단 지지선 (기울어진 대각선)
  stroke("#ffffff");
  strokeWeight(5);
  line(width * 0.2, height * 0.1, width * 0.9, height * 0.22);

  // 2. 왼쪽 지지대 기둥
  noFill();
  stroke("#ffffff");
  strokeWeight(5);

  bezier(
    width * 0.36,
    height * 0.13,
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

  // 3. 바닥에 이미 쌓인 원들 그리기
  noStroke();
  for (let c of landedCircles) {
    fill(c.color);
    circle(c.x, c.y, 16);
  }

  // 4. 각각의 줄, 선 끝의 삼각형, 떨어지는 원 그리기
  for (let i = 0; i < dropPoints.length; i++) {
    let p = dropPoints[i];

    // (1) 세로줄 (설정한 p.weight 굵기로 적용)
    stroke(p.color);
    strokeWeight(p.weight);
    line(p.x, p.lineTopY, p.x, p.lineBottomY);

    // (2) 선 맨 끝에 달린 삼각형
    fill(p.color);
    noStroke();
    triangle(
      p.x,
      p.triangleY - 12,
      p.x - 16,
      p.triangleY + 4,
      p.x + 16,
      p.triangleY + 4,
    );

    // (3) 중력 움직임 계산
    p.speed += p.gravity;
    p.circleY += p.speed;

    // (4) 떨어지는 원 그리기
    circle(p.x, p.circleY, 16);

    // (5) 바닥 도착 시 튀어서 쌓이고 리셋
    let diameter = 16;
    // 2개 쌓일 때마다 높이가 1단계 올라가도록 설정
    let floorY = height * 0.9 - Math.floor(p.landedCount / 2) * (diameter - 4);

    if (p.circleY >= floorY) {
      // [추가] 양옆으로 살짝 튀어 떨어지는 위치 지정 (±25px 난수)
      let bounceX = p.x + random(-25, 25);
      let bounceY = floorY + random(-3, 3); // 자연스럽게 높낮이 변화

      landedCircles.push({ x: bounceX, y: bounceY, color: p.color });
      p.landedCount++;

      p.circleY = p.triangleY + 15;
      p.speed = 0;
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  initElements();
}
