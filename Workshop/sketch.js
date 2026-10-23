// 1. 티처블머신에서 복사한 본인의 모델 URL로 교체하세요!
const URL = "https://teachablemachine.withgoogle.com/models/E2S7Uxowr/";

let video;
let model, maxPredictions;
let btn;
let poseData = null;
let label = "ready";
let pg; // 모델 입력용 (200×200)

// 시각 효과용 변수들
let lemons = []; // Class 1 레몬 둥둥
let bgCircles = []; // Class 2, 3 배경 노란 원들
let drools = []; // Class 2, 3 침
let tears = []; // Class 3 눈물

function setup() {
  createCanvas(windowWidth, windowHeight);
  video = createCapture(VIDEO);
  video.hide();
  pg = createGraphics(200, 200);
  pg.pixelDensity(1);

  // 클래스 1용 레몬 초기화
  for (let i = 0; i < 10; i++) {
    lemons.push(new Lemon());
  }

  // Class 2, 3용 배경 노란 원 초기화
  for (let i = 0; i < 25; i++) {
    bgCircles.push(new BgCircle());
  }

  btn = createButton("Start");
  btn.position(20, 20);
  btn.style("padding", "10px 20px");
  btn.style("font-size", "16px");
  btn.style("border-radius", "8px");
  btn.mousePressed(initiate);
}

async function initiate() {
  btn.html("Loading Model...");
  const modelURL = URL + "model.json";
  const metadataURL = URL + "metadata.json";

  model = await tmPose.load(modelURL, metadataURL);
  maxPredictions = model.getTotalClasses();

  btn.hide();
  predictLoop();
}

function draw() {
  background(15);

  // 1. 비디오 화면 크게 그리기 (좌우반전)
  let k = min(width / video.width, height / video.height);
  let vw = video.width * k;
  let vh = video.height * k;

  push();
  translate(width / 2, height / 2);
  scale(-1, 1);
  image(video, -vw / 2, -vh / 2, vw, vh);
  pop();

  // 2. 클래스별 코믹 신맛 연출
  drawComicSourEffects();
}

// ------------------------------------------------
// 🍋 신맛 연출 메인 함수
// ------------------------------------------------
function drawComicSourEffects() {
  if (!poseData) return;

  let nose = poseData.keypoints[0].position;

  let k = min(width / video.width, height / video.height);
  let size = min(video.width, video.height) * k;
  let offsetX = (width - size) / 2;
  let offsetY = (height - size) / 2;

  let screenNoseX = offsetX + nose.x * (size / 200);
  let screenNoseY = offsetY + nose.y * (size / 200);

  push();

  // --- Class 1: 대기 상태 (주변에 레몬 둥둥) ---
  if (label === "Class 1") {
    drools = [];
    tears = [];

    lemons.forEach((lemon) => {
      lemon.update();
      lemon.display();
    });

    textAlign(CENTER, CENTER);
    fill(255, 247, 99);
    textSize(32);
    text("🍋", width / 2, height - 80);
  }

  // --- Class 2: 한 팔로 입 막기 (노란 원 배경 + 입에서 침 좔좔) ---
  else if (label === "Class 2") {
    tears = [];

    // 배경에 살짝 찌릿한 노랑 필터
    fill(255, 255, 0, 30);
    rect(0, 0, width, height);

    // 💡 Class 2: 다양한 노란 원들이 은은하게 떠다님 (isPulsing = false)
    bgCircles.forEach((circle) => {
      circle.update();
      circle.display(false);
    });

    // 침 생성
    if (frameCount % 4 === 0) {
      drools.push(new Drool(screenNoseX, screenNoseY + 20));
    }

    // 침 업데이트 및 삭제
    for (let i = drools.length - 1; i >= 0; i--) {
      drools[i].update();
      drools[i].display();
      if (drools[i].isDead()) {
        drools.splice(i, 1);
      }
    }
  }

  // --- Class 3: 양팔로 감싸기 (커졌다 작아지는 원 + 눈물, 침, 머리 쭈뼛) ---
  else if (label === "Class 3") {
    let bgAlpha = 70 + sin(frameCount * 0.4) * 30;
    fill(255, 200, 0, bgAlpha);
    rect(0, 0, width, height);

    // 💡 Class 3: 노란 원들이 커졌다 작아졌다 함 (isPulsing = true)
    bgCircles.forEach((circle) => {
      circle.update();
      circle.display(true);
    });

    // 머리 쭈뼛 효과
    drawSpikyHair(screenNoseX, screenNoseY - 110);

    // 침 생성
    if (frameCount % 2 === 0) {
      drools.push(new Drool(screenNoseX, screenNoseY + 20, true));
    }
    // 눈물 생성
    if (frameCount % 4 === 0) {
      tears.push(new Tear(screenNoseX - 30, screenNoseY - 20));
      tears.push(new Tear(screenNoseX + 30, screenNoseY - 20));
    }

    // 침 업데이트 및 삭제
    for (let i = drools.length - 1; i >= 0; i--) {
      drools[i].update();
      drools[i].display();
      if (drools[i].isDead()) {
        drools.splice(i, 1);
      }
    }

    // 눈물 업데이트 및 삭제
    for (let i = tears.length - 1; i >= 0; i--) {
      tears[i].update();
      tears[i].display();
      if (tears[i].isDead()) {
        tears.splice(i, 1);
      }
    }
  }

  pop();
}

// ------------------------------------------------
// 🛠 효과용 개체(Class) 및 도우미 함수들
// ------------------------------------------------

// Class 1용 레몬
class Lemon {
  constructor() {
    this.x = random(width);
    this.y = random(height);
    this.size = random(30, 50);
    this.speedX = random(-0.8, 0.8);
    this.speedY = random(-0.8, 0.8);
    this.angle = random(TWO_PI);
    this.rotSpeed = random(-0.01, 0.01);
  }
  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.angle += this.rotSpeed;
    if (this.x < 0 || this.x > width) this.speedX *= -1;
    if (this.y < 0 || this.y > height) this.speedY *= -1;
  }
  display() {
    push();
    translate(this.x, this.y);
    rotate(this.angle);
    fill(255, 230, 0);
    noStroke();
    ellipse(0, 0, this.size, this.size * 0.7);
    fill(100, 200, 0);
    ellipse(this.size / 2, 0, this.size * 0.2, this.size * 0.2);
    pop();
  }
}

// 💡 Class 2 & 3용 배경 노란 원 클래스
class BgCircle {
  constructor() {
    this.x = random(width);
    this.y = random(height);
    this.baseSize = random(15, 50);
    this.speedX = random(-1.5, 1.5);
    this.speedY = random(-1.5, 1.5);
    this.offset = random(1000); // 각 원마다 크기 숨쉬는 주기를 다르게 하기 위함
  }
  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    if (this.x < 0 || this.x > width) this.speedX *= -1;
    if (this.y < 0 || this.y > height) this.speedY *= -1;
  }
  display(isPulsing) {
    noStroke();
    let currentSize = this.baseSize;

    if (isPulsing) {
      // Class 3: 삼각함수를 이용해 커졌다 작아지도록 크기 변동 (펄스 효과)
      currentSize = this.baseSize + sin(frameCount * 0.1 + this.offset) * 20;
    }

    fill(255, 240, 50, 150); // 상큼한 반투명 노란색
    ellipse(this.x, this.y, currentSize, currentSize);
  }
}

class Drool {
  constructor(x, y, isGush = false) {
    this.x = x + random(-10, 10);
    this.y = y;
    this.size = isGush ? random(8, 18) : random(5, 12);
    this.speedY = random(2, 6);
    this.alpha = 220;
  }
  update() {
    this.y += this.speedY;
    this.speedY += 0.15;
    this.alpha -= 3;
  }
  display() {
    noStroke();
    fill(200, 230, 255, this.alpha);
    ellipse(this.x, this.y, this.size * 0.8, this.size);
  }
  isDead() {
    return this.y > height || this.alpha <= 0;
  }
}

class Tear {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = random(8, 15);
    this.speedY = random(2, 4);
    this.speedX = random(-0.5, 0.5);
    this.alpha = 255;
  }
  update() {
    this.y += this.speedY;
    this.x += this.speedX;
    this.speedY += 0.1;
    this.alpha -= 3;
  }
  display() {
    noStroke();
    fill(100, 200, 255, this.alpha);
    ellipse(this.x, this.y, this.size, this.size * 1.3);
  }
  isDead() {
    return this.y > height || this.alpha <= 0;
  }
}

function drawSpikyHair(x, y) {
  push();
  translate(x, y);
  stroke(255);
  strokeWeight(3);
  noFill();
  for (let i = 0; i < 8; i++) {
    let ang = map(i, 0, 7, -PI * 0.8, -PI * 0.2);
    let rad = 60 + random(0, 20 + sin(frameCount * 0.5) * 15);
    let hx = cos(ang) * rad;
    let hy = sin(ang) * rad;
    beginShape();
    vertex(0, 0);
    vertex(hx, hy);
    endShape();
  }
  pop();
}

async function predictLoop() {
  let s = min(video.width, video.height);
  pg.push();
  pg.translate(200, 0);
  pg.scale(-1, 1);
  pg.image(
    video,
    0,
    0,
    200,
    200,
    (video.width - s) / 2,
    (video.height - s) / 2,
    s,
    s,
  );
  pg.pop();

  const { pose, posenetOutput } = await model.estimatePose(pg.elt);
  const prediction = await model.predict(posenetOutput);

  let topLabel = "ready";
  let topProb = 0;
  for (let i = 0; i < prediction.length; i++) {
    if (prediction[i].probability > topProb) {
      topProb = prediction[i].probability;
      topLabel = prediction[i].className;
    }
  }
  label = topLabel;
  poseData = pose;

  requestAnimationFrame(predictLoop);
}
