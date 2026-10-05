let seeds = [];
const SEED_COUNT = 2500; // 민들레 홀씨 선 개수

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 1);
  initDandelion();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// 민들레 초기화
function initDandelion() {
  seeds = [];
  for (let i = 0; i < SEED_COUNT; i++) {
    let angle = random(TWO_PI);
    let length = random(60, 190);
    seeds.push(new Seed(angle, length));
  }
}

function draw() {
  // 어두운 바탕 (부드러운 잔상)
  background(220, 30, 10, 0.3);

  let cx = width / 2;
  let cy = height / 2;

  // 메인 기둥 줄기
  stroke(0, 0, 100, 0.15);
  strokeWeight(0.5);
  line(cx, cy, cx, height);

  // 마우스를 누르고 있는 동안 힘겹게 바람 작용
  if (mouseIsPressed) {
    applyWind(0.02);
  }

  // 각 선 업데이트 및 그리기
  for (let i = seeds.length - 1; i >= 0; i--) {
    let seed = seeds[i];
    seed.update(mouseIsPressed);
    seed.display();

    // 완전히 소멸된 선은 배열에서 삭제
    if (seed.isDead) {
      seeds.splice(i, 1);
    }
  }
}

// 마우스 클릭 시 바람 작용
function mousePressed() {
  applyWind(0.1);
}

// 바람을 주어 조건에 맞는 선만 힘겹게 떨어뜨림
function applyWind(windForce) {
  for (let seed of seeds) {
    if (!seed.isDetached) {
      seed.holdPower -= windForce * random(0.2, 1.5);
      if (seed.holdPower <= 0) {
        let windAngle = -QUARTER_PI + random(-0.6, 0.6);
        let speed = random(1.5, 4.5);
        let fx = cos(windAngle) * speed;
        let fy = sin(windAngle) * speed;
        seed.detach(fx, fy);
      }
    }
  }
}

// ----------------------------------------------------
// 단일 선(Line) 민들레 입자 클래스
// ----------------------------------------------------
class Seed {
  constructor(angle, length) {
    this.baseAngle = angle;
    this.length = length;

    this.centerX = width / 2;
    this.centerY = height / 2;

    this.x = this.centerX + cos(angle) * length;
    this.y = this.centerY + sin(angle) * length;

    this.startX = this.centerX;
    this.startY = this.centerY;

    this.vx = 0;
    this.vy = 0;
    this.isDetached = false;
    this.opacity = 1.0;
    this.isDead = false;

    // 마우스 접근에 의해 스르륵 사라지는 상태 관리
    this.isEvaporating = false;

    // 고유 저항력
    this.holdPower = random(1.0, 4.5);

    this.noiseOffset = random(1000);
    this.colorData = getRandomColorData();
  }

  detach(fx, fy) {
    if (!this.isDetached) {
      this.isDetached = true;
      this.vx = fx + random(-0.5, 0.5);
      this.vy = fy + random(-0.5, 0.5) - 0.3;
    }
  }

  update(windActive) {
    if (!this.isDetached) {
      // 떨어지기 전: 중앙 고정
      this.centerX = width / 2;
      this.centerY = height / 2;
      this.startX = this.centerX;
      this.startY = this.centerY;

      this.x = this.centerX + cos(this.baseAngle) * this.length;
      this.y = this.centerY + sin(this.baseAngle) * this.length;
    } else {
      // ----------------------------------------------------
      // [추가된 신규 기능] 마우스 접근 감지 및 스르륵 소멸
      // ----------------------------------------------------
      let distToHead = dist(this.x, this.y, mouseX, mouseY);
      let distToTail = dist(this.startX, this.startY, mouseX, mouseY);

      // 마우스 커서가 선의 끝점이나 시작점에 45px 이하로 가까워지면 증발 시작
      if (distToHead < 45 || distToTail < 10) {
        this.isEvaporating = true;
      }

      if (this.isEvaporating) {
        this.opacity -= 0.04; // 마우스 근처에 다가가면 빠르게 스르륵 소멸
        this.vy -= 0.1; // 약간 위로 피어오르며 사라지는 연출
      }

      // 떨어진 후: 바람 및 물리 법칙 적용
      if (windActive) {
        let dx = this.x - mouseX;
        let dy = this.y - mouseY;
        let d = max(dist(this.x, this.y, mouseX, mouseY), 1);

        this.vx += (dx / d) * 0.12 + 0.04;
        this.vy += (dy / d) * 0.12 - 0.03;
      }

      // 공기 저항
      this.vx *= 0.985;
      this.vy *= 0.985;

      // 바람을 타는 살랑거림
      this.noiseOffset += 0.015;
      this.vx += (noise(this.noiseOffset) - 0.5) * 0.15;
      this.vy += (noise(this.noiseOffset + 500) - 0.48) * 0.15;

      // 위치 이동
      this.x += this.vx;
      this.y += this.vy;
      this.startX += this.vx;
      this.startY += this.vy;

      // [소멸 조건 1] 마우스 접근으로 투명도가 0이 되면 제거
      if (this.opacity <= 0) {
        this.isDead = true;
      }

      // [소멸 조건 2] 화면 밖으로 벗어나면 제거
      if (
        this.x < -80 ||
        this.x > width + 80 ||
        this.y < -80 ||
        this.y > height + 80
      ) {
        this.isDead = true;
      }

      // [소멸 조건 3] 바닥에 떨어지면 천천히 사라짐
      if (this.y >= height - 5 || this.startY >= height - 5) {
        this.vx *= 0.4;
        this.vy = 0;
        this.opacity -= 0.02;
      }
    }
  }

  display() {
    if (this.isDead || this.opacity <= 0) return;

    push();
    let cd = this.colorData;
    noFill();
    stroke(cd.h, cd.s, cd.b, cd.a * this.opacity);
    strokeWeight(0.5);

    // 자연스러운 곡률 부여
    let midX = (this.startX + this.x) / 2 + cos(this.baseAngle + PI / 2) * 4;
    let midY = (this.startY + this.y) / 2 + sin(this.baseAngle + PI / 2) * 4;

    beginShape();
    vertex(this.startX, this.startY);
    quadraticVertex(midX, midY, this.x, this.y);
    endShape();

    pop();
  }
}

// 흰색 ~ 하늘색 변주
function getRandomColorData() {
  if (random(1) < 0.35) {
    return { h: 0, s: 0, b: 100, a: 0.85 }; // Pure White
  } else {
    return {
      h: random(180, 215), // 하늘색 톤
      s: random(15, 45),
      b: random(85, 100),
      a: random(0.6, 0.95),
    };
  }
}
