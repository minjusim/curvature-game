import "./style.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { LEVELS } from "./levels.js";

document.querySelector("#app").innerHTML = `
  <div id="ui">
    <div class="uiHeader">
      <p class="uiKicker">Curvature Control Deck</p>
      <h1>Spacetime Trajectory Console</h1>
      <p>Bend the field, plot the path, and reach the UFO.</p>
    </div>
    <div class="labReadouts" aria-label="Simulation readouts">
      <div class="labReadout">
        <span>Mission</span>
        <strong id="levelLabel">Level 1</strong>
      </div>
    </div>
    <div class="row hudRow">
      <div class="hudControls">
        <div id="starCounter" aria-label="Collected stars">
          <canvas id="starIcon" width="21" height="21"></canvas>
          <span id="starsLabel">x 0</span>
        </div>
        <button id="audioToggle" type="button" aria-label="Toggle background music" title="Toggle background music">
          <img id="audioIcon" src="" alt="Background music toggle icon">
        </button>
      </div>
    </div>
    <label class="speedControl">
      <span class="speedHeader">
        <span>Launch Speed</span>
        <strong id="speedValue">1.60</strong>
      </span>
      <input id="speed" type="range" min="0.6" max="4.5" value="1.6" step="0.05">
    </label>
    <div class="buttonStack">
      <button id="fire">Fire</button>
      <button id="reset">Reset Shot</button>
      <button id="hint">Hint</button>
      <button id="solve">Give Up (Auto)</button>
      <button id="next">Next</button>
    </div>
    <p id="status"></p>
  </div>
  <canvas id="scene"></canvas>
  <div id="labFrame" aria-hidden="true">
    <span></span>
    <span></span>
    <span></span>
    <span></span>
  </div>
  <div id="robotHud" aria-hidden="true">
    <img id="robotAvatar" alt="">
    <div id="robotSpeech" class="robotSpeech is-hidden"></div>
  </div>
  <div id="alienSpeech" class="alienSpeech is-hidden" aria-hidden="true"></div>
  <div id="tutorialOverlay" class="tutorial-overlay hidden" role="dialog" aria-modal="true" aria-label="Tutorial instructions">
    <div class="tutorial-background"></div>
    <div class="tutorial-content">
      <div class="tutorial-robot-container">
        <img id="tutorialRobotAvatar" class="tutorial-robot" alt="" />
      </div>
      <div class="tutorial-speech">
        <div class="tutorial-bubble tutorial-type-bubble tutorial-robot-note">
          <p id="tutorialIntroText" class="tutorial-instruction tutorial-type-target"></p>
        </div>
        <div class="tutorial-bubble tutorial-type-bubble">
          <p class="tutorial-instruction"><span id="tutorialText1" class="tutorial-type-target"></span><canvas id="tutorialAlienIcon" class="tutorial-model-icon" width="34" height="34" aria-hidden="true"></canvas><span id="tutorialText1After" class="tutorial-type-target"></span></p>
        </div>
        <div class="tutorial-bubble tutorial-type-bubble">
          <p class="tutorial-instruction"><span class="tutorial-rule-label">Goal:</span><span id="tutorialText2" class="tutorial-type-target"></span><canvas id="tutorialUfoIcon" class="tutorial-model-icon" width="34" height="34" aria-hidden="true"></canvas><span id="tutorialText2After" class="tutorial-type-target"></span></p>
        </div>
        <div class="tutorial-bubble tutorial-type-bubble">
          <p class="tutorial-instruction"><span class="tutorial-rule-label">Score:</span><span id="tutorialText3" class="tutorial-type-target"></span><canvas id="tutorialStarIcon" class="tutorial-model-icon" width="34" height="34" aria-hidden="true"></canvas><span id="tutorialText3After" class="tutorial-type-target"></span></p>
        </div>
      </div>
      <button id="tutorialSkip" type="button" class="tutorial-button">Start Game</button>
    </div>
  </div>
  <nav id="quickNav" aria-label="Quick navigation">
    <button id="goGameStart" type="button">Start</button>
    <button id="quickStudyEinstein" type="button">Study</button>
  </nav>
  <aside id="rankingHud" aria-label="Top saved play rankings">
    <div class="rankingHudHeader">
      <strong>Top 5</strong>
      <span>Score / Time</span>
    </div>
    <ol id="rankingHudList" class="rankingHudList"></ol>
  </aside>
  <div id="endgameOverlay" class="is-hidden" aria-hidden="true">
    <div id="endgameCard" role="dialog" aria-modal="true" aria-label="Game complete summary">
      <h2>Mission Complete</h2>
      <div class="endgameResults" aria-label="Final run summary">
        <div class="endgameResult">
          <span>Score</span>
          <strong id="finalStarsSummary">0 stars</strong>
        </div>
        <div class="endgameResult">
          <span>Play Time</span>
          <strong id="finalTimeSummary">0:00.0</strong>
        </div>
      </div>
      <form id="recordRunForm" class="recordRunForm">
        <label for="nicknameInput">Record this play?</label>
        <div class="recordInputRow">
          <input id="nicknameInput" type="text" maxlength="18" autocomplete="nickname" placeholder="Nickname">
          <button id="saveRun" type="submit">Record</button>
        </div>
        <p id="recordRunMessage" class="recordRunMessage" aria-live="polite"></p>
      </form>
      <section class="leaderboardPanel" aria-labelledby="leaderboardTitle">
        <div class="leaderboardHeader">
          <h3 id="leaderboardTitle">Saved Plays</h3>
          <span>Score / Time</span>
        </div>
        <ol id="leaderboardList" class="leaderboardList"></ol>
      </section>
      <p id="endgameGuide">Where do you want to go next?</p>
      <div class="endgameActions">
        <button id="restartFromLevel1" type="button">Restart From Level 1</button>
        <button id="goStudyEinstein" type="button">Study Einstein Equation</button>
      </div>
    </div>
  </div>
`;

const canvas = document.querySelector("#scene");
const dreamPalette = {
  background: 0x0b0711,
  backgroundSoft: 0x13101d,
  grid: 0x6fe7ff,
  teal: 0x3aa6b9,
  orange: 0xff9e4a,
  magenta: 0xd16bff,
  lavender: 0xc8b6ff,
  violet: 0x8f6bff,
  rose: 0xff7ac8,
  ink: 0xecfbff,
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(dreamPalette.background);
scene.fog = new THREE.FogExp2(0x171020, 0.0333);

const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 220);
camera.up.set(0, 0, 1);
camera.position.set(8.8, -13.2, 5.5);
camera.lookAt(0, 0, -2.2);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 7;
controls.maxDistance = 40;
controls.minPolarAngle = THREE.MathUtils.degToRad(25);
controls.maxPolarAngle = THREE.MathUtils.degToRad(88);
controls.mouseButtons = {
  LEFT: THREE.MOUSE.PAN,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.ROTATE,
};
controls.target.set(0, 0, -2.2);
controls.update();

scene.add(new THREE.AmbientLight(dreamPalette.lavender, 0.62));
const dirLight = new THREE.DirectionalLight(dreamPalette.grid, 0.92);
dirLight.position.set(7, -5, 13);
scene.add(dirLight);
const tealLight = new THREE.PointLight(dreamPalette.grid, 1.25, 24);
tealLight.position.set(-5.5, -5.2, 5.8);
scene.add(tealLight);
const orangeLight = new THREE.PointLight(dreamPalette.orange, 0.85, 18);
orangeLight.position.set(4.8, 2.8, 3.2);
scene.add(orangeLight);
const magentaLight = new THREE.PointLight(dreamPalette.magenta, 0.72, 22);
magentaLight.position.set(0, 6, 4.8);
scene.add(magentaLight);
const violetLight = new THREE.PointLight(dreamPalette.violet, 0.58, 26);
violetLight.position.set(-2.8, 4.8, 6.4);
scene.add(violetLight);

function seededUnit(seed) {
  const value = Math.sin(seed * 127.1) * 43758.5453123;
  return value - Math.floor(value);
}

function makeSoftGlowTexture() {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 256;
  textureCanvas.height = 256;
  const glowCtx = textureCanvas.getContext("2d");
  const gradient = glowCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, "rgba(255,255,255,0.85)");
  gradient.addColorStop(0.28, "rgba(200,182,255,0.34)");
  gradient.addColorStop(0.62, "rgba(111,231,255,0.12)");
  gradient.addColorStop(1, "rgba(200,182,255,0)");
  glowCtx.fillStyle = gradient;
  glowCtx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeDreamLabStarField() {
  const count = 520;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const cyan = new THREE.Color(dreamPalette.grid);
  const lavender = new THREE.Color(dreamPalette.lavender);
  const magenta = new THREE.Color(dreamPalette.magenta);

  for (let i = 0; i < count; i += 1) {
    const radius = 19 + seededUnit(i + 1) * 32;
    const angle = seededUnit(i + 2) * Math.PI * 2;
    const height = -7 + seededUnit(i + 3) * 23;
    positions[i * 3 + 0] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = Math.sin(angle) * radius;
    positions[i * 3 + 2] = height;

    const colorPick = seededUnit(i + 4);
    const color = colorPick > 0.78 ? magenta : colorPick > 0.54 ? lavender : cyan;
    colors[i * 3 + 0] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 0.075,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.82,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const stars = new THREE.Points(geometry, material);
  stars.renderOrder = -20;
  return stars;
}

function makeDreamLabFog() {
  const fog = new THREE.Group();
  const texture = makeSoftGlowTexture();
  const placements = [
    { x: -5.8, y: -4.5, z: -1.8, scale: [9, 3.2, 1], opacity: 0.18, color: dreamPalette.lavender, drift: 0.12 },
    { x: 4.6, y: -2.8, z: -1.1, scale: [7.8, 2.7, 1], opacity: 0.135, color: dreamPalette.grid, drift: 0.1 },
    { x: -1.6, y: 5.2, z: -1.4, scale: [10.5, 3.8, 1], opacity: 0.153, color: dreamPalette.magenta, drift: 0.16 },
    { x: 3.8, y: 4.2, z: 1.2, scale: [5.8, 2.1, 1], opacity: 0.099, color: dreamPalette.orange, drift: 0.08 },
    { x: -9.2, y: 1.4, z: 2.4, scale: [11, 4.2, 1], opacity: 0.117, color: dreamPalette.violet, drift: 0.18 },
    { x: 8.8, y: 1.6, z: 2.0, scale: [10.5, 3.8, 1], opacity: 0.108, color: dreamPalette.rose, drift: 0.14 },
    { x: -0.6, y: -8.2, z: -2.2, scale: [13.5, 4.6, 1], opacity: 0.108, color: dreamPalette.orange, drift: 0.1 },
    { x: 0.8, y: 8.6, z: 3.0, scale: [12, 4.4, 1], opacity: 0.099, color: dreamPalette.lavender, drift: 0.17 },
    { x: -8.4, y: -0.4, z: -0.4, scale: [7.2, 2.5, 1], opacity: 0.108, color: dreamPalette.grid, drift: 0.13 },
    { x: 7.7, y: -5.8, z: 0.6, scale: [8.4, 3.1, 1], opacity: 0.117, color: dreamPalette.magenta, drift: 0.12 },
  ];

  placements.forEach((placement, index) => {
    const material = new THREE.SpriteMaterial({
      map: texture,
      color: placement.color,
      transparent: true,
      opacity: placement.opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(placement.x, placement.y, placement.z);
    sprite.scale.set(...placement.scale);
    sprite.userData.baseOpacity = placement.opacity;
    sprite.userData.baseX = placement.x;
    sprite.userData.baseY = placement.y;
    sprite.userData.baseZ = placement.z;
    sprite.userData.drift = placement.drift;
    sprite.userData.phase = index * 1.37;
    sprite.material.rotation = seededUnit(index + 503) * Math.PI * 2;
    fog.add(sprite);
  });

  fog.renderOrder = -10;
  return fog;
}

// Visual-only ambience. Physics, collisions, and level state remain driven by the code below.
const dreamLabStars = makeDreamLabStarField();
const dreamLabFog = makeDreamLabFog();
scene.add(dreamLabStars);
scene.add(dreamLabFog);

const ui = {
  speed: document.querySelector("#speed"),
  fire: document.querySelector("#fire"),
  reset: document.querySelector("#reset"),
  hint: document.querySelector("#hint"),
  solve: document.querySelector("#solve"),
  next: document.querySelector("#next"),
  status: document.querySelector("#status"),
  levelLabel: document.querySelector("#levelLabel"),
  starsLabel: document.querySelector("#starsLabel"),
  starIcon: document.querySelector("#starIcon"),
  speedValue: document.querySelector("#speedValue"),
  audioToggle: document.querySelector("#audioToggle"),
  audioIcon: document.querySelector("#audioIcon"),
  robotHud: document.querySelector("#robotHud"),
  robotAvatar: document.querySelector("#robotAvatar"),
  robotSpeech: document.querySelector("#robotSpeech"),
  alienSpeech: document.querySelector("#alienSpeech"),
  goGameStart: document.querySelector("#goGameStart"),
  quickStudyEinstein: document.querySelector("#quickStudyEinstein"),
  rankingHudList: document.querySelector("#rankingHudList"),
  endgameOverlay: document.querySelector("#endgameOverlay"),
  finalStarsSummary: document.querySelector("#finalStarsSummary"),
  finalTimeSummary: document.querySelector("#finalTimeSummary"),
  recordRunForm: document.querySelector("#recordRunForm"),
  nicknameInput: document.querySelector("#nicknameInput"),
  saveRun: document.querySelector("#saveRun"),
  recordRunMessage: document.querySelector("#recordRunMessage"),
  leaderboardList: document.querySelector("#leaderboardList"),
  restartFromLevel1: document.querySelector("#restartFromLevel1"),
  goStudyEinstein: document.querySelector("#goStudyEinstein"),
  tutorialOverlay: document.querySelector("#tutorialOverlay"),
  tutorialSkip: document.querySelector("#tutorialSkip"),
  tutorialRobotAvatar: document.querySelector("#tutorialRobotAvatar"),
  tutorialIntroText: document.querySelector("#tutorialIntroText"),
  tutorialText1: document.querySelector("#tutorialText1"),
  tutorialText1After: document.querySelector("#tutorialText1After"),
  tutorialText2: document.querySelector("#tutorialText2"),
  tutorialText2After: document.querySelector("#tutorialText2After"),
  tutorialText3: document.querySelector("#tutorialText3"),
  tutorialText3After: document.querySelector("#tutorialText3After"),
  tutorialAlienIcon: document.querySelector("#tutorialAlienIcon"),
  tutorialUfoIcon: document.querySelector("#tutorialUfoIcon"),
  tutorialStarIcon: document.querySelector("#tutorialStarIcon"),
  scene: canvas,
};

const robotAvatarUrl = new URL("./robot-clean.png", import.meta.url).href;
if (ui.robotAvatar) {
  ui.robotAvatar.src = robotAvatarUrl;
}
if (ui.tutorialRobotAvatar) {
  ui.tutorialRobotAvatar.src = robotAvatarUrl;
}

const audioControl = {
  iconOnUrl: new URL("./speaker-high-volume_1f50a.png", import.meta.url).href,
  iconOffUrl: new URL("./muted-speaker_1f507.png", import.meta.url).href,
  track: new Audio(new URL("./lofi_hour-sleepy-cat-118974.mp3", import.meta.url).href),
  winSfxUrl: new URL("./universfield-level-up-05-326133.mp3", import.meta.url).href,
  starSfxUrl: new URL("./benkirb-shine-8-268901.mp3", import.meta.url).href,
  isEnabled: false,
  activeSfx: new Set(),
};
audioControl.track.loop = true;
audioControl.track.preload = "auto";
audioControl.track.volume = 0.1;

function stopAllSfx() {
  for (const sfx of audioControl.activeSfx) {
    sfx.pause();
    sfx.currentTime = 0;
  }
  audioControl.activeSfx.clear();
}

function playSfx(url) {
  if (!audioControl.isEnabled) return;
  const sfx = new Audio(url);
  sfx.preload = "auto";
  sfx.volume = 0.8;
  audioControl.activeSfx.add(sfx);
  const cleanup = () => {
    audioControl.activeSfx.delete(sfx);
  };
  sfx.addEventListener("ended", cleanup, { once: true });
  sfx.addEventListener("error", cleanup, { once: true });
  sfx.play().catch(cleanup);
}

function syncAudioToggleUi() {
  if (!ui.audioIcon || !ui.audioToggle) return;
  ui.audioIcon.src = audioControl.isEnabled ? audioControl.iconOnUrl : audioControl.iconOffUrl;
  const label = audioControl.isEnabled ? "Turn background music off" : "Turn background music on";
  ui.audioToggle.setAttribute("aria-label", label);
  ui.audioToggle.title = label;
}

async function toggleBackgroundAudio() {
  audioControl.isEnabled = !audioControl.isEnabled;
  if (audioControl.isEnabled) {
    try {
      await audioControl.track.play();
    } catch {
      audioControl.isEnabled = false;
      showRobotSpeech("Background music could not start yet. Try again after interacting.", {
        kind: "general",
        typewriter: true,
        duration: 3000,
      });
    }
  } else {
    audioControl.track.pause();
    stopAllSfx();
  }
  syncAudioToggleUi();
}

let backgroundAudioRetryArmed = false;

async function tryStartBackgroundAudio({ fromUserGesture = false } = {}) {
  if (!audioControl.track.paused && audioControl.isEnabled) return true;
  audioControl.isEnabled = true;
  syncAudioToggleUi();
  try {
    await audioControl.track.play();
    return true;
  } catch {
    audioControl.isEnabled = false;
    syncAudioToggleUi();
    if (!fromUserGesture) armBackgroundAudioRetry();
    return false;
  }
}

function armBackgroundAudioRetry() {
  if (backgroundAudioRetryArmed) return;
  backgroundAudioRetryArmed = true;
  const resumeAudio = (event) => {
    if (event.target?.closest?.("#audioToggle")) return;
    window.removeEventListener("pointerdown", resumeAudio);
    window.removeEventListener("keydown", resumeAudio);
    backgroundAudioRetryArmed = false;
    tryStartBackgroundAudio({ fromUserGesture: true });
  };
  window.addEventListener("pointerdown", resumeAudio);
  window.addEventListener("keydown", resumeAudio);
}

syncAudioToggleUi();
tryStartBackgroundAudio();

const robotSpeechPools = {
  intro: [
    "Drag from launch marker to aim. Fire to start.",
    "Help Ally get to the UFO!",
    "Let's collect the stars.",
    "Try a smooth launch.",
  ],
  camera: [
    "Right-drag to orbit camera. Left-drag near launch marker to aim.",
    "Right-drag to orbit camera.",
    "Left-drag near the launch marker to aim.",
  ],
  hint: [
    "Hint trajectory shown briefly.",
    "I found a hint for you.",
    "Take a look at the guide line.",
  ],
  star: ["Star collected!", "Nice one!", "Keep going!", "Another star!", "Good catch!"],
  win: ["Success!", "You made it!", "Nice landing!"],
  autoWin: ["Auto-solve success. No stars awarded. Next level ready."],
  audioError: ["Background music could not start yet. Try again after interacting."],
  reset: ["Shot reset. Adjust aim and fire.", "Ready for another shot.", "Let's try again."],
};

const alienSpeechPools = {
  gravity: ["빨려 들어간다", "구해줘", "여긴 어디야"],
  boundary: ["여긴 어디야", "??", "...", "다시 도전!", "집중 집중"],
  timeout: ["난 지쳤어...", "더는 무리야"],
};

const robotSpeechState = {
  hideTimerId: null,
  typeTimerId: null,
  fullText: "",
  currentText: "",
  major: false,
  visible: false,
};

const einsteinStudyPageUrl = new URL("./einstein-equation-study.html", import.meta.url).href;

function pickRandomMessage(kind) {
  const pool = robotSpeechPools[kind] || [];
  if (pool.length === 0) return "";
  return pool[Math.floor(Math.random() * pool.length)];
}

function clearRobotSpeechTimers() {
  if (robotSpeechState.hideTimerId !== null) {
    clearTimeout(robotSpeechState.hideTimerId);
    robotSpeechState.hideTimerId = null;
  }
  if (robotSpeechState.typeTimerId !== null) {
    clearInterval(robotSpeechState.typeTimerId);
    robotSpeechState.typeTimerId = null;
  }
}

function hideRobotSpeech() {
  clearRobotSpeechTimers();
  robotSpeechState.visible = false;
  robotSpeechState.fullText = "";
  robotSpeechState.currentText = "";
  robotSpeechState.major = false;
  if (!ui.robotSpeech || !ui.robotHud) return;
  ui.robotSpeech.textContent = "";
  ui.robotSpeech.classList.add("is-hidden");
  ui.robotSpeech.classList.remove("is-major");
  ui.robotHud.classList.remove("is-speaking-major");
  ui.robotSpeech.setAttribute("aria-hidden", "true");
}

const alienSpeechState = {
  hideTimerId: null,
  visible: false,
  world: new THREE.Vector3(),
  text: "",
};

function clearAlienSpeechTimer() {
  if (alienSpeechState.hideTimerId !== null) {
    clearTimeout(alienSpeechState.hideTimerId);
    alienSpeechState.hideTimerId = null;
  }
}

function hideAlienSpeech() {
  clearAlienSpeechTimer();
  alienSpeechState.visible = false;
  alienSpeechState.text = "";
  if (!ui.alienSpeech) return;
  ui.alienSpeech.textContent = "";
  ui.alienSpeech.classList.add("is-hidden");
  ui.alienSpeech.setAttribute("aria-hidden", "true");
}

function setRobotSpeechText(text, typewriter) {
  if (!ui.robotSpeech) return;
  if (!typewriter) {
    ui.robotSpeech.textContent = text;
    return;
  }
  let index = 0;
  ui.robotSpeech.textContent = "";
  robotSpeechState.typeTimerId = window.setInterval(() => {
    index += 1;
    ui.robotSpeech.textContent = text.slice(0, index);
    if (index >= text.length) {
      clearInterval(robotSpeechState.typeTimerId);
      robotSpeechState.typeTimerId = null;
    }
  }, 30);
}

function showAlienSpeech(kind, worldX, worldY, worldZ, duration = 3000) {
  if (!ui.alienSpeech) return;
  const pool = alienSpeechPools[kind] || [];
  const message = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : "";
  if (!message) return;

  clearAlienSpeechTimer();
  alienSpeechState.visible = true;
  alienSpeechState.text = message;
  alienSpeechState.world.set(worldX, worldY, worldZ);

  ui.alienSpeech.textContent = message;
  ui.alienSpeech.classList.remove("is-hidden");
  ui.alienSpeech.setAttribute("aria-hidden", "false");

  alienSpeechState.hideTimerId = window.setTimeout(() => {
    hideAlienSpeech();
  }, duration);
}

function showRobotSpeech(text, options = {}) {
  if (!ui.robotSpeech || !ui.robotHud) return;
  const {
    kind = null,
    duration = 3000,
    major = false,
    typewriter = false,
    randomize = false,
  } = options;
  const message = randomize && kind ? pickRandomMessage(kind) : text;
  if (!message) return;

  clearRobotSpeechTimers();
  robotSpeechState.visible = true;
  robotSpeechState.fullText = message;
  robotSpeechState.currentText = "";
  robotSpeechState.major = major;

  ui.robotHud.classList.toggle("is-speaking-major", major);
  ui.robotSpeech.classList.toggle("is-major", major);
  ui.robotSpeech.classList.remove("is-hidden");
  ui.robotSpeech.setAttribute("aria-hidden", "false");

  setRobotSpeechText(message, typewriter);
  robotSpeechState.hideTimerId = window.setTimeout(() => {
    hideRobotSpeech();
  }, duration);
}

function updateAlienSpeechPosition() {
  if (!ui.alienSpeech || !alienSpeechState.visible) return;
  const projected = alienSpeechState.world.clone().project(camera);
  const rect = renderer.domElement.getBoundingClientRect();
  const rawX = rect.left + ((projected.x + 1) * 0.5) * rect.width;
  const rawY = rect.top + ((1 - projected.y) * 0.5) * rect.height;
  const x = THREE.MathUtils.clamp(rawX, rect.left + 32, rect.right - 32);
  const y = THREE.MathUtils.clamp(rawY, rect.top + 32, rect.bottom - 56);
  ui.alienSpeech.style.left = `${x}px`;
  ui.alienSpeech.style.top = `${y}px`;
  ui.alienSpeech.classList.remove("is-hidden");
}

const extent = 7.5;
const gridN = 120;
const softening = 0.35;
const zScale = 0.98;
const gParticle = 6.2;
const dt = 0.016;
const particleSpinBase = 0.06;
const particleSpinPerSpeed = 0.035;
const maxTrail = 900;
const maxPreview = 140;
const maxHintTrail = 300;
const maxReplayTrail = 800;
const maxAccel = 24;
const gateTolerance = 0.38;
const gateRenderOrder = 80;
const particleIdleBobAmplitude = 0.06;
const particleIdleBobSpeed = 0.0026;
const winJumpAmplitude = 1.45;
const winJumpDurationMs = 2800;
const winJumpCycles = 3.5;
const gateSwayAmplitude = 0.08;
const gateSwaySpeed = 0.0022;
const targetBaseLift = 0.8;
const massVisualRadiusScale = 0.72;
const massVisualLiftScale = 0.12;
const initialLaunchAngle = 0.0;
const initialLaunchSpeed = 1.6;
const trapRadiusScale = 0.92;
const aimGrabRadius = 1.1;
const aimArrowBaseLength = 0.58;
const aimArrowSpeedScale = 0.11;
const aimArrowMaxLength = 1.08;
const raycaster = new THREE.Raycaster();
const mouseNdc = new THREE.Vector2();
const aimPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const hitPoint = new THREE.Vector3();
const aimArrowUp = new THREE.Vector3(0, 1, 0);

const sheetGeometry = new THREE.PlaneGeometry(extent * 2, extent * 2, gridN - 1, gridN - 1);
const sheet = new THREE.Mesh(
  sheetGeometry,
  new THREE.MeshStandardMaterial({
    color: dreamPalette.backgroundSoft,
    emissive: 0x241734,
    emissiveIntensity: 0.58,
    roughness: 0.82,
    metalness: 0.08,
    transparent: true,
    opacity: 0.42,
    side: THREE.DoubleSide,
  }),
);
sheet.renderOrder = 0;
scene.add(sheet);

const wire = new THREE.LineSegments(
  new THREE.WireframeGeometry(sheetGeometry),
  new THREE.LineBasicMaterial({
    color: dreamPalette.grid,
    transparent: true,
    opacity: 0.42,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }),
);
wire.renderOrder = 1;
scene.add(wire);

const launchMesh = new THREE.Group();
scene.add(launchMesh);

const particleMesh = new THREE.Group();
particleMesh.renderOrder = 100;
scene.add(particleMesh);

const particleFallback = new THREE.Mesh(
  new THREE.SphereGeometry(0.11, 20, 20),
  new THREE.MeshStandardMaterial({
    color: dreamPalette.ink,
    emissive: dreamPalette.magenta,
    emissiveIntensity: 0.8,
  }),
);
particleFallback.renderOrder = 100;
particleFallback.material.depthTest = false;
particleFallback.material.depthWrite = false;
particleFallback.material.transparent = true;
particleMesh.add(particleFallback);

const gltfLoader = new GLTFLoader();
let starModel = null;

const starHud = {
  renderer: null,
  scene: new THREE.Scene(),
  camera: new THREE.PerspectiveCamera(36, 1, 0.1, 20),
  lightA: new THREE.AmbientLight(0xffffff, 0.8),
  lightB: new THREE.DirectionalLight(0xffffff, 0.9),
  mesh: null,
};

function initStarHud() {
  if (!ui.starIcon || starHud.renderer) return;
  starHud.renderer = new THREE.WebGLRenderer({ canvas: ui.starIcon, antialias: true, alpha: true });
  starHud.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  starHud.renderer.setSize(ui.starIcon.width, ui.starIcon.height, false);
  starHud.camera.position.set(0.85, -1.1, 1.25);
  starHud.camera.lookAt(0, 0, 0);
  starHud.lightB.position.set(1.5, -0.9, 2.3);
  starHud.scene.add(starHud.lightA);
  starHud.scene.add(starHud.lightB);
}

const tutorialModelIcons = {
  alien: createTutorialModelIcon(ui.tutorialAlienIcon),
  star: createTutorialModelIcon(ui.tutorialStarIcon),
  ufo: createTutorialModelIcon(ui.tutorialUfoIcon),
};

function createTutorialModelIcon(canvasElement) {
  if (!canvasElement) return null;
  const size = canvasElement.width;
  const icon = {
    renderer: new THREE.WebGLRenderer({ canvas: canvasElement, antialias: true, alpha: true }),
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(34, 1, 0.1, 20),
    lightA: new THREE.AmbientLight(0xffffff, 0.85),
    lightB: new THREE.DirectionalLight(0xffffff, 0.95),
    mesh: null,
    size,
  };
  icon.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  icon.renderer.setSize(size, size, false);
  icon.camera.position.set(0.9, -1.25, 1.2);
  icon.camera.lookAt(0, 0, 0);
  icon.lightB.position.set(1.4, -1.1, 2.1);
  icon.scene.add(icon.lightA);
  icon.scene.add(icon.lightB);
  return icon;
}

function prepareTutorialIconModel(sourceModel, { scale = 0.7, rotationX = 0 } = {}) {
  const model = sourceModel.clone();
  model.position.set(0, 0, 0);
  model.rotation.x = rotationX;
  model.scale.set(scale, scale, scale);
  model.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.renderOrder = gateRenderOrder;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of mats) {
      if (!mat) continue;
      mat.transparent = true;
      mat.depthTest = false;
      mat.depthWrite = false;
    }
  });
  return model;
}

function setTutorialModelIcon(kind, sourceModel, options) {
  const icon = tutorialModelIcons[kind];
  if (!icon || !sourceModel) return;
  if (icon.mesh) {
    icon.scene.remove(icon.mesh);
    icon.mesh = null;
  }
  icon.mesh = prepareTutorialIconModel(sourceModel, options);
  icon.scene.add(icon.mesh);
}

function refreshHudStarModel() {
  if (!starModel || !starHud.renderer) return;
  if (starHud.mesh) {
    starHud.scene.remove(starHud.mesh);
    starHud.mesh = null;
  }
  const iconModel = cloneStarModel();
  if (!iconModel) return;
  iconModel.position.set(0, 0, 0);
  iconModel.scale.set(0.72, 0.72, 0.72);
  starHud.mesh = iconModel;
  starHud.scene.add(iconModel);
}

function cloneStarModel() {
  if (!starModel) return null;
  const model = starModel.clone();
  model.renderOrder = gateRenderOrder;
  model.scale.set(0.5, 0.5, 0.5);
  model.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.renderOrder = gateRenderOrder;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of mats) {
      if (!mat) continue;
      mat.depthTest = false;
      mat.depthWrite = false;
      mat.transparent = true;
    }
  });
  return model;
}

function refreshGateModels() {
  if (!starModel) return;
  state.gates.forEach((gate) => {
    if (!gate.line || gate.line.userData?.isGatePlaceholder || gate.line.isMesh && gate.line.geometry && gate.line.geometry.type === "SphereGeometry") {
      const replacement = cloneStarModel();
      if (!replacement) return;
      replacement.position.copy(gate.line.position);
      replacement.quaternion.copy(gate.line.quaternion);
      replacement.visible = gate.line.visible;
      scene.remove(gate.line);
      scene.add(replacement);
      gate.line = replacement;
    }
  });
  setGateVisualState();
  refreshHudStarModel();
  setTutorialModelIcon("star", starModel, { scale: 0.72 });
}

gltfLoader.load(
  new URL("./Star.glb", import.meta.url).href,
  (gltf) => {
    starModel = gltf.scene;
    refreshGateModels();
  },
  undefined,
  () => {
    console.warn("Failed to load Star.glb");
  },
);

gltfLoader.load(
  new URL("./Flying_Object.glb", import.meta.url).href,
  (gltf) => {
    setTutorialModelIcon("ufo", gltf.scene, { scale: 0.56, rotationX: Math.PI * 0.5 });
  },
  undefined,
  () => {
    console.warn("Failed to load Flying_Object.glb for tutorial icon");
  },
);

gltfLoader.load(
  new URL("./Purple_Alien.glb", import.meta.url).href,
  (gltf) => {
    particleMesh.clear();
    const alienModel = gltf.scene;
    setTutorialModelIcon("alien", alienModel, { scale: 0.52, rotationX: Math.PI * 0.5 });
    alienModel.scale.set(0.38, 0.38, 0.38);
    // Project uses z-up camera; rotate imported y-up GLB so it stands upright.
    alienModel.rotation.x = Math.PI * 0.5;
    alienModel.renderOrder = 100;
    alienModel.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.renderOrder = 100;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const mat of mats) {
        if (!mat) continue;
        mat.transparent = true;
        mat.opacity = 1;
        mat.depthTest = false;
        mat.depthWrite = false;
      }
    });
    particleMesh.add(alienModel);
  },
  undefined,
  () => {
    // Keep fallback sphere visible if model loading fails.
  },
);

gltfLoader.load(
  new URL("./red-map-marker-icon-2709.glb", import.meta.url).href,
  (gltf) => {
    launchMesh.clear();
    const markerModel = gltf.scene;
    // Alien model scale is 0.38; marker requested at one-third of that.
    markerModel.scale.set(0.2, 0.2, 0.2);
    markerModel.rotation.x = Math.PI * 0.5;
    markerModel.renderOrder = 90;
    markerModel.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.renderOrder = 90;
    });
    launchMesh.add(markerModel);
  },
  undefined,
  () => {
    console.warn("Failed to load red-map-marker-icon-2709.glb");
  },
);



const targetMesh = new THREE.Group();
scene.add(targetMesh);

const aimArrow = new THREE.Group();
const aimArrowMaterial = new THREE.MeshStandardMaterial({
  color: dreamPalette.grid,
  emissive: dreamPalette.teal,
  emissiveIntensity: 1.2,
  roughness: 0.26,
  metalness: 0.3,
});
const aimArrowShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 1, 16), aimArrowMaterial);
const aimArrowHead = new THREE.Mesh(new THREE.ConeGeometry(0.072, 0.176, 20), aimArrowMaterial);
aimArrowShaft.renderOrder = 95;
aimArrowHead.renderOrder = 95;
aimArrow.add(aimArrowShaft, aimArrowHead);
scene.add(aimArrow);

const previewLine = new THREE.Line(
  new THREE.BufferGeometry(),
  new THREE.LineDashedMaterial({
    color: dreamPalette.orange,
    dashSize: 0.25,
    gapSize: 0.18,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }),
);
previewLine.renderOrder = 70;
scene.add(previewLine);

const hintLine = new THREE.Line(
  new THREE.BufferGeometry(),
  new THREE.LineBasicMaterial({
    color: dreamPalette.grid,
    transparent: true,
    opacity: 0.64,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }),
);
hintLine.renderOrder = 72;
scene.add(hintLine);

const replayLine = new THREE.Line(
  new THREE.BufferGeometry(),
  new THREE.LineBasicMaterial({
    color: dreamPalette.magenta,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }),
);
replayLine.renderOrder = 71;
scene.add(replayLine);

const trailPositions = new Float32Array(maxTrail * 3);
const trailGeometry = new THREE.BufferGeometry();
trailGeometry.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
trailGeometry.setDrawRange(0, 0);
const trailLine = new THREE.Line(
  trailGeometry,
  new THREE.LineBasicMaterial({
    color: dreamPalette.orange,
    transparent: true,
    opacity: 0.96,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }),
);
trailLine.renderOrder = 110;
scene.add(trailLine);

const SAVED_PLAYS_STORAGE_KEY = "einsteinEquationSavedPlays";
const MAX_VISIBLE_SAVED_PLAYS = 50;
const NICKNAME_MAX_LENGTH = 18;

const state = {
  levelIndex: 0,
  level: LEVELS[0],
  masses: [],
  gates: [],
  gateIndex: 0,
  starsByLevel: new Array(LEVELS.length).fill(0),
  bestReplayByLevel: new Array(LEVELS.length).fill(null),
  runStartedAt: null,
  runFinishedAt: null,
  completedRun: null,
  attemptsInLevel: 0,
  flightTime: 0,
  isFlying: false,
  isAiming: false,
  hintUntil: 0,
  usedAutoSolveShot: false,
  launchAngle: initialLaunchAngle,
  launchSpeed: initialLaunchSpeed,
  particle: { x: 0, y: 0, vx: 0, vy: 0 },
  lastShotPath: [],
  bestShotPath: null,
  winJumpStart: 0,
  winJumpUntil: 0,
  isEndgameOverlayOpen: false,
};

initStarHud();

function normalize2(x, y) {
  const n = Math.hypot(x, y) || 1;
  return { x: x / n, y: y / n };
}

function heightAt(x, y) {
  let sum = 0;
  for (const mass of state.level.masses) {
    const r = Math.hypot(x - mass.x, y - mass.y, softening);
    sum += mass.mass / r;
  }
  return -zScale * sum;
}

function particleAccel(x, y) {
  let ax = 0;
  let ay = 0;
  for (const mass of state.level.masses) {
    const rx = x - mass.x;
    const ry = y - mass.y;
    const rsq = rx * rx + ry * ry + softening * softening;
    const amp = (-gParticle * mass.mass) / (rsq ** 1.5);
    ax += amp * rx;
    ay += amp * ry;
  }
  const n = Math.hypot(ax, ay);
  if (n > maxAccel) {
    const s = maxAccel / n;
    ax *= s;
    ay *= s;
  }
  return { ax, ay };
}

function updateSurface() {
  const pos = sheetGeometry.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    pos.setZ(i, heightAt(pos.getX(i), pos.getY(i)));
  }
  pos.needsUpdate = true;
  sheetGeometry.computeVertexNormals();
  wire.geometry.dispose();
  wire.geometry = new THREE.WireframeGeometry(sheetGeometry);
}

function clearLine(line) {
  line.geometry.dispose();
  line.geometry = new THREE.BufferGeometry();
}

function setLineFrom2D(line, points2D) {
  const points3D = points2D.map((p) => new THREE.Vector3(p.x, p.y, heightAt(p.x, p.y) + 0.05));
  line.geometry.dispose();
  line.geometry = new THREE.BufferGeometry().setFromPoints(points3D);
  if (line.computeLineDistances) {
    line.computeLineDistances();
  }
}

function updateAimArrow() {
  const launch = state.level.launch;
  const length = Math.min(aimArrowBaseLength + state.launchSpeed * aimArrowSpeedScale, aimArrowMaxLength);
  const headLength = Math.min(0.176, length * 0.28);
  const shaftLength = Math.max(0.28, length - headLength);
  const direction = new THREE.Vector3(Math.cos(state.launchAngle), Math.sin(state.launchAngle), 0);
  const baseZ = heightAt(launch.x, launch.y) + 0.16;
  const centerDistance = shaftLength * 0.5;

  aimArrow.position.set(launch.x + direction.x * centerDistance, launch.y + direction.y * centerDistance, baseZ);
  aimArrow.quaternion.setFromUnitVectors(aimArrowUp, direction);
  aimArrowShaft.scale.set(1, shaftLength, 1);
  aimArrowHead.position.set(0, shaftLength * 0.5 + headLength * 0.5, 0);
  aimArrowHead.scale.set(1, headLength / 0.176, 1);
}

function makeGateLabel(index) {
  const cvs = document.createElement("canvas");
  cvs.width = 128;
  cvs.height = 128;
  const ctx = cvs.getContext("2d");
  ctx.fillStyle = "rgba(12,16,32,0.0)";
  ctx.fillRect(0, 0, 128, 128);
  ctx.shadowColor = "rgba(111,231,255,0.92)";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "rgba(236,251,255,0.96)";
  ctx.font = "bold 72px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(index + 1), 64, 64);
  const tex = new THREE.CanvasTexture(cvs);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sprite.scale.set(0.62, 0.62, 0.62);
  return sprite;
}

function clearLevelObjects() {
  for (const m of state.masses) scene.remove(m);
  for (const g of state.gates) {
    scene.remove(g.line);
    if (g.portal) scene.remove(g.portal);
    scene.remove(g.label);
  }
  state.masses = [];
  state.gates = [];
}

function setStatus(text) {
  ui.status.textContent = text;
}

function getTotalStars() {
  return state.starsByLevel.reduce((sum, value) => sum + value, 0);
}

function getMaxStars() {
  return LEVELS.reduce((sum, level) => sum + level.gates.length, 0);
}

function formatPlayTime(ms) {
  const totalTenths = Math.max(0, Math.floor(ms / 100));
  const tenths = totalTenths % 10;
  const totalSeconds = Math.floor(totalTenths / 10);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  const paddedSeconds = String(seconds).padStart(2, "0");
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${paddedSeconds}.${tenths}`;
  }
  return `${minutes}:${paddedSeconds}.${tenths}`;
}

function normalizeNickname(value) {
  return value.trim().replace(/\s+/g, " ").slice(0, NICKNAME_MAX_LENGTH);
}

function compareSavedPlays(a, b) {
  if (b.stars !== a.stars) return b.stars - a.stars;
  if (a.playTimeMs !== b.playTimeMs) return a.playTimeMs - b.playTimeMs;
  return a.completedAt - b.completedAt;
}

function sanitizeSavedPlay(play) {
  if (!play || typeof play !== "object") return null;
  const nickname = normalizeNickname(String(play.nickname || ""));
  const stars = Number(play.stars);
  const playTimeMs = Number(play.playTimeMs);
  if (!nickname || !Number.isFinite(stars) || !Number.isFinite(playTimeMs)) return null;
  return {
    id: String(play.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    nickname,
    stars: Math.max(0, Math.floor(stars)),
    playTimeMs: Math.max(0, Math.floor(playTimeMs)),
    completedAt: Number.isFinite(Number(play.completedAt)) ? Number(play.completedAt) : Date.now(),
  };
}

function loadSavedPlays() {
  try {
    const raw = localStorage.getItem(SAVED_PLAYS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(sanitizeSavedPlay).filter(Boolean).sort(compareSavedPlays);
  } catch {
    return [];
  }
}

function saveSavedPlays(plays) {
  try {
    localStorage.setItem(SAVED_PLAYS_STORAGE_KEY, JSON.stringify(plays.sort(compareSavedPlays)));
    return true;
  } catch {
    return false;
  }
}

function makeSavedPlayId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function setRecordRunMessage(message) {
  if (!ui.recordRunMessage) return;
  ui.recordRunMessage.textContent = message;
}

function getSavedPlayRank(playId, plays = loadSavedPlays()) {
  return plays.findIndex((play) => play.id === playId) + 1;
}

function renderSavedPlays(highlightId = state.completedRun?.savedId || null) {
  if (!ui.leaderboardList) return;
  const plays = loadSavedPlays();
  ui.leaderboardList.textContent = "";

  if (plays.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "leaderboardEmpty";
    emptyItem.textContent = "No saved plays yet.";
    ui.leaderboardList.append(emptyItem);
    return;
  }

  plays.slice(0, MAX_VISIBLE_SAVED_PLAYS).forEach((play, index) => {
    const item = document.createElement("li");
    item.className = "leaderboardItem";
    if (play.id === highlightId) item.classList.add("is-current");

    const rank = document.createElement("span");
    rank.className = "leaderboardRank";
    rank.textContent = `#${index + 1}`;

    const name = document.createElement("strong");
    name.className = "leaderboardName";
    name.textContent = play.nickname;

    const score = document.createElement("span");
    score.className = "leaderboardScore";
    score.textContent = `${play.stars} stars`;

    const time = document.createElement("span");
    time.className = "leaderboardTime";
    time.textContent = formatPlayTime(play.playTimeMs);

    item.append(rank, name, score, time);
    ui.leaderboardList.append(item);
  });
}

function renderRankingHud() {
  if (!ui.rankingHudList) return;
  const plays = loadSavedPlays().slice(0, 5);
  ui.rankingHudList.textContent = "";

  for (let index = 0; index < 5; index += 1) {
    const play = plays[index];
    const item = document.createElement("li");
    item.className = "rankingHudItem";
    if (!play) item.classList.add("is-empty");

    const rank = document.createElement("span");
    rank.className = "rankingHudRank";
    rank.textContent = `#${index + 1}`;

    const name = document.createElement("strong");
    name.className = "rankingHudName";
    name.textContent = play ? play.nickname : "No record";

    const meta = document.createElement("span");
    meta.className = "rankingHudMeta";
    meta.textContent = play ? `${play.stars} / ${formatPlayTime(play.playTimeMs)}` : "--";

    item.append(rank, name, meta);
    ui.rankingHudList.append(item);
  }
}

function getCurrentRunElapsedMs(now = performance.now()) {
  if (state.runStartedAt === null) return 0;
  const end = state.runFinishedAt ?? now;
  return Math.max(0, end - state.runStartedAt);
}

function updateEndgameSummary(run = state.completedRun) {
  const summary = run || {
    stars: getTotalStars(),
    playTimeMs: getCurrentRunElapsedMs(),
  };
  if (ui.finalStarsSummary) {
    ui.finalStarsSummary.textContent = `${summary.stars} / ${getMaxStars()} stars`;
  }
  if (ui.finalTimeSummary) {
    ui.finalTimeSummary.textContent = formatPlayTime(summary.playTimeMs);
  }
}

function updateRecordRunFormState() {
  if (!ui.recordRunForm || !ui.nicknameInput || !ui.saveRun) return;
  const run = state.completedRun;
  const isSaved = Boolean(run?.savedId);
  ui.nicknameInput.disabled = !run || isSaved;
  ui.saveRun.disabled = !run || isSaved;
  if (!run) {
    ui.nicknameInput.value = "";
    setRecordRunMessage("");
    return;
  }
  if (isSaved) {
    const plays = loadSavedPlays();
    const rank = getSavedPlayRank(run.savedId, plays);
    ui.nicknameInput.value = run.nickname || "";
    setRecordRunMessage(rank > 0 ? `Recorded as ${run.nickname}. Rank #${rank}.` : `Recorded as ${run.nickname}.`);
    return;
  }
  ui.nicknameInput.value = "";
  setRecordRunMessage("Type a nickname to save this score.");
}

function startNewRun({ resetProgress = true } = {}) {
  state.runStartedAt = performance.now();
  state.runFinishedAt = null;
  state.completedRun = null;
  if (resetProgress) {
    state.starsByLevel = new Array(LEVELS.length).fill(0);
    state.bestReplayByLevel = new Array(LEVELS.length).fill(null);
  }
  updateEndgameSummary();
  updateRecordRunFormState();
  renderSavedPlays();
  renderRankingHud();
  updateHud();
}

function completeCurrentRun() {
  if (state.completedRun) return state.completedRun;
  const now = performance.now();
  if (state.runStartedAt === null) {
    state.runStartedAt = now;
  }
  state.runFinishedAt = now;
  state.completedRun = {
    stars: getTotalStars(),
    playTimeMs: Math.round(getCurrentRunElapsedMs(now)),
    completedAt: Date.now(),
    nickname: "",
    savedId: null,
  };
  updateEndgameSummary(state.completedRun);
  updateRecordRunFormState();
  return state.completedRun;
}

function saveCompletedRun(event) {
  event.preventDefault();
  const run = state.completedRun || completeCurrentRun();
  if (run.savedId) {
    updateRecordRunFormState();
    return;
  }

  const nickname = normalizeNickname(ui.nicknameInput?.value || "");
  if (!nickname) {
    setRecordRunMessage("Type a nickname to save this score.");
    ui.nicknameInput?.focus();
    return;
  }

  const savedPlay = {
    id: makeSavedPlayId(),
    nickname,
    stars: run.stars,
    playTimeMs: run.playTimeMs,
    completedAt: run.completedAt,
  };
  const plays = loadSavedPlays();
  plays.push(savedPlay);
  plays.sort(compareSavedPlays);

  if (!saveSavedPlays(plays)) {
    setRecordRunMessage("This browser could not save the play.");
    return;
  }

  run.savedId = savedPlay.id;
  run.nickname = nickname;
  renderSavedPlays(savedPlay.id);
  renderRankingHud();
  updateRecordRunFormState();
}

function updateNextButtonState({ isWinReady = false, isFinalLevelWin = false } = {}) {
  if (!ui.next) return;
  ui.next.classList.remove("next-ready", "next-final");
  ui.next.textContent = "Next";
  if (!isWinReady) return;
  if (isFinalLevelWin) {
    ui.next.classList.add("next-final");
    ui.next.textContent = "Done";
    return;
  }
  ui.next.classList.add("next-ready");
}

function closeEndgameOverlay() {
  if (!ui.endgameOverlay || !ui.robotHud) return;
  state.isEndgameOverlayOpen = false;
  ui.endgameOverlay.classList.add("is-hidden");
  ui.endgameOverlay.setAttribute("aria-hidden", "true");
  ui.robotHud.classList.remove("overlay-mode");
}

function openEndgameOverlay() {
  if (!ui.endgameOverlay || !ui.robotHud || !ui.finalStarsSummary) return;
  state.isEndgameOverlayOpen = true;
  state.isFlying = false;
  const run = state.completedRun || completeCurrentRun();
  updateEndgameSummary(run);
  updateRecordRunFormState();
  renderSavedPlays(run.savedId);
  ui.endgameOverlay.classList.remove("is-hidden");
  ui.endgameOverlay.setAttribute("aria-hidden", "false");
  ui.robotHud.classList.add("overlay-mode");
  hideAlienSpeech();
  showRobotSpeech("Great run! Check your final stars and pick your next move.", {
    major: true,
    duration: 5000,
  });
}

function updateHud() {
  const levelNum = state.levelIndex + 1;
  ui.levelLabel.textContent = `Level ${levelNum}: ${state.level.name.split("- ")[1] || state.level.name}`;
  const stars = getTotalStars();
  ui.starsLabel.textContent = `x ${stars}`;
  syncSpeedReadout();
}

function syncSpeedReadout() {
  if (!ui.speedValue) return;
  ui.speedValue.textContent = Number(state.launchSpeed).toFixed(2);
}

function gateSide(gate, x, y) {
  return (x - gate.x) * gate.nx + (y - gate.y) * gate.ny;
}

function gateAlong(gate, x, y) {
  return (x - gate.x) * gate.tx + (y - gate.y) * gate.ty;
}

function orient2D(ax, ay, bx, by, cx, cy) {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

function onSegment2D(ax, ay, bx, by, px, py, eps = 1e-9) {
  return (
    Math.min(ax, bx) - eps <= px &&
    px <= Math.max(ax, bx) + eps &&
    Math.min(ay, by) - eps <= py &&
    py <= Math.max(ay, by) + eps
  );
}

function segmentsIntersect2D(a0x, a0y, a1x, a1y, b0x, b0y, b1x, b1y) {
  const o1 = orient2D(a0x, a0y, a1x, a1y, b0x, b0y);
  const o2 = orient2D(a0x, a0y, a1x, a1y, b1x, b1y);
  const o3 = orient2D(b0x, b0y, b1x, b1y, a0x, a0y);
  const o4 = orient2D(b0x, b0y, b1x, b1y, a1x, a1y);
  const eps = 1e-9;

  if ((o1 > eps && o2 < -eps) || (o1 < -eps && o2 > eps)) {
    if ((o3 > eps && o4 < -eps) || (o3 < -eps && o4 > eps)) return true;
  }
  if (Math.abs(o1) <= eps && onSegment2D(a0x, a0y, a1x, a1y, b0x, b0y, eps)) return true;
  if (Math.abs(o2) <= eps && onSegment2D(a0x, a0y, a1x, a1y, b1x, b1y, eps)) return true;
  if (Math.abs(o3) <= eps && onSegment2D(b0x, b0y, b1x, b1y, a0x, a0y, eps)) return true;
  if (Math.abs(o4) <= eps && onSegment2D(b0x, b0y, b1x, b1y, a1x, a1y, eps)) return true;
  return false;
}

function crossesGateSegment(gate, x0, y0, x1, y1) {
  const gateHalf = gate.halfLength + gateTolerance;
  const gx0 = gate.x - gate.tx * gateHalf;
  const gy0 = gate.y - gate.ty * gateHalf;
  const gx1 = gate.x + gate.tx * gateHalf;
  const gy1 = gate.y + gate.ty * gateHalf;
  return segmentsIntersect2D(x0, y0, x1, y1, gx0, gy0, gx1, gy1);
}

function setGateVisualState() {
  state.gates.forEach((gate) => {
    const isCompleted = gate.isCompleted;
    const canRenderGate = Boolean(starModel);
    gate.line.visible = !isCompleted && canRenderGate;
    gate.label.visible = !isCompleted && canRenderGate;
  });
}

function resetGateProgress() {
  state.gateIndex = 0;
  state.gates.forEach((gate) => {
    gate.isCompleted = false;
  });
  setGateVisualState();
}

function resetTrail() {
  trailGeometry.setDrawRange(0, 0);
}

function pushTrail(x, y, z) {
  const drawCount = trailGeometry.drawRange.count;
  const count = Math.min(drawCount + 1, maxTrail);
  if (drawCount < maxTrail) {
    trailPositions[drawCount * 3 + 0] = x;
    trailPositions[drawCount * 3 + 1] = y;
    trailPositions[drawCount * 3 + 2] = z + 0.08;
  } else {
    for (let i = 1; i < maxTrail; i += 1) {
      const src = i * 3;
      const dst = (i - 1) * 3;
      trailPositions[dst + 0] = trailPositions[src + 0];
      trailPositions[dst + 1] = trailPositions[src + 1];
      trailPositions[dst + 2] = trailPositions[src + 2];
    }
    const k = (maxTrail - 1) * 3;
    trailPositions[k + 0] = x;
    trailPositions[k + 1] = y;
    trailPositions[k + 2] = z + 0.08;
  }
  trailGeometry.attributes.position.needsUpdate = true;
  trailGeometry.setDrawRange(0, count);
}

function setParticleToLaunch() {
  const { launch } = state.level;
  state.particle.x = launch.x;
  state.particle.y = launch.y;
  state.particle.vx = 0;
  state.particle.vy = 0;
  const z = heightAt(state.particle.x, state.particle.y);
  const particleZ = z + 0.8;
  particleMesh.position.set(state.particle.x, state.particle.y, particleZ);
  particleMesh.rotation.set(0, 0, 0);
  launchMesh.position.set(launch.x, launch.y, z + 0.23);
}

function configureLevel(index) {
  closeEndgameOverlay();
  state.levelIndex = (index + LEVELS.length) % LEVELS.length;
  state.level = LEVELS[state.levelIndex];
  state.gateIndex = 0;
  state.isFlying = false;
  state.flightTime = 0;
  state.lastShotPath = [];
  state.winJumpStart = 0;
  state.winJumpUntil = 0;
  state.usedAutoSolveShot = false;
  state.attemptsInLevel = 0;
  updateNextButtonState();
  hideRobotSpeech();
  hideAlienSpeech();
  clearLevelObjects();
  clearLine(previewLine);
  clearLine(hintLine);
  clearLine(replayLine);
  resetTrail();

  for (const mass of state.level.masses) {
    const visualRadius = mass.radius * massVisualRadiusScale;
    const massSurfaceZ = heightAt(mass.x, mass.y);
    const massGroup = new THREE.Group();
    massGroup.position.set(mass.x, mass.y, massSurfaceZ);
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(visualRadius, 26, 26),
      new THREE.MeshStandardMaterial({
        color: mass.color,
        emissive: dreamPalette.orange,
        emissiveIntensity: 0.38,
        roughness: 0.42,
        metalness: 0.12,
      }),
    );
    // Visual only: keep physics radius unchanged while rendering a smaller sphere.
    mesh.position.set(0, 0, visualRadius * massVisualLiftScale);
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(visualRadius * 1.7, visualRadius * 3.05, 72),
      new THREE.MeshBasicMaterial({
        color: dreamPalette.orange,
        transparent: true,
        opacity: 0.24,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    halo.position.z = 0.025;
    halo.renderOrder = 8;
    massGroup.userData.halo = halo;
    massGroup.userData.haloBaseOpacity = halo.material.opacity;
    massGroup.add(halo, mesh);
    scene.add(massGroup);
    state.masses.push(massGroup);
  }

  for (let i = 0; i < state.level.gates.length; i += 1) {
    const gate = state.level.gates[i];
    const tangent = normalize2(-gate.ny, gate.nx);
    gate.tx = tangent.x;
    gate.ty = tangent.y;
    const gateBaseZ = heightAt(gate.x, gate.y) + 0.16;
    const gateHeight = 1.05;
    
    // Keep gates hidden until Star.glb is ready; no temporary fallback mesh.
    let gateMesh;
    if (starModel) {
      gateMesh = cloneStarModel();
    } else {
      gateMesh = new THREE.Object3D();
      gateMesh.userData.isGatePlaceholder = true;
    }
    
    const gateCenter = new THREE.Vector3(gate.x, gate.y, gateBaseZ + gateHeight * 0.5);
    const tangent3 = new THREE.Vector3(gate.tx, gate.ty, 0);
    const up3 = new THREE.Vector3(0, 0, 1);
    const normal3 = new THREE.Vector3(gate.nx, gate.ny, 0);
    const gateBasis = new THREE.Matrix4().makeBasis(tangent3, up3, normal3);
    gateMesh.position.copy(gateCenter);
    gateMesh.quaternion.setFromRotationMatrix(gateBasis);
    gateMesh.visible = true;
    
    const label = makeGateLabel(i);
    label.renderOrder = gateRenderOrder - 1;
    label.position.set(gate.x + gate.nx * 0.5, gate.y + gate.ny * 0.5, gateBaseZ + gateHeight + 0.08);
    scene.add(gateMesh);
    scene.add(label);
    state.gates.push({ ...gate, line: gateMesh, portal: null, label, baseZ: gateCenter.z, swayPhase: i * 0.9, isCompleted: false });
  }

  targetMesh.clear();
  const targetHalo = new THREE.Mesh(
    new THREE.RingGeometry(state.level.target.radius * 0.76, state.level.target.radius * 1.12, 72),
    new THREE.MeshBasicMaterial({
      color: dreamPalette.grid,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  targetHalo.renderOrder = 48;
  targetHalo.position.z = -0.18;
  targetMesh.userData.halo = targetHalo;
  targetMesh.add(targetHalo);
  gltfLoader.load(
    new URL("./Flying_Object.glb", import.meta.url).href,
    (gltf) => {
      const targetModel = gltf.scene;
      targetModel.scale.set(0.5, 0.5, 0.5);
      // Rotate imported y-up GLB to stand upright (z-up camera).
      targetModel.rotation.x = Math.PI * 0.5;
      targetModel.renderOrder = 50;
      targetModel.traverse((obj) => {
        if (!obj.isMesh) return;
        obj.renderOrder = 50;
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const mat of mats) {
          if (!mat) continue;
          mat.transparent = true;
          mat.opacity = 1;
          mat.depthTest = false;
          mat.depthWrite = false;
        }
      });
      targetMesh.add(targetModel);
    },
    undefined,
    () => {
      // Keep group visible even if model fails to load
    },
  );
  targetMesh.position.set(state.level.target.x, state.level.target.y, heightAt(state.level.target.x, state.level.target.y) + targetBaseLift);

  ui.speed.min = String(state.level.speed.min);
  ui.speed.max = String(state.level.speed.max);
  state.launchSpeed = initialLaunchSpeed;
  ui.speed.value = String(state.launchSpeed);
  state.launchAngle = initialLaunchAngle;

  updateSurface();
  setParticleToLaunch();
  setGateVisualState();
  updateHud();
  showRobotSpeech(pickRandomMessage("intro"), { duration: 3000, typewriter: true });

  const best = state.bestReplayByLevel[state.levelIndex];
  if (best) {
    setLineFrom2D(replayLine, best);
  }
}

function sampleTrajectory(angle, speed, steps) {
  const p = {
    x: state.level.launch.x,
    y: state.level.launch.y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
  };
  const out = [{ x: p.x, y: p.y }];
  for (let i = 0; i < steps; i += 1) {
    const { ax, ay } = particleAccel(p.x, p.y);
    p.vx += ax * dt;
    p.vy += ay * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (Math.abs(p.x) > extent || Math.abs(p.y) > extent) break;
    out.push({ x: p.x, y: p.y });
  }
  return out;
}

function updateAimVisuals() {
  updateAimArrow();
  setLineFrom2D(previewLine, sampleTrajectory(state.launchAngle, state.launchSpeed, maxPreview));
}

function startShot(useAutoSolveShot = false) {
  if (state.isFlying) return;
  if (state.runStartedAt === null) {
    startNewRun({ resetProgress: false });
  }
  state.attemptsInLevel += 1;
  state.usedAutoSolveShot = useAutoSolveShot;
  state.isFlying = true;
  resetGateProgress();
  state.flightTime = 0;
  state.winJumpStart = 0;
  state.winJumpUntil = 0;
  hideRobotSpeech();
  hideAlienSpeech();
  state.lastShotPath = [{ x: state.level.launch.x, y: state.level.launch.y }];
  clearLine(hintLine);
  state.particle.x = state.level.launch.x;
  state.particle.y = state.level.launch.y;
  state.particle.vx = Math.cos(state.launchAngle) * state.launchSpeed;
  state.particle.vy = Math.sin(state.launchAngle) * state.launchSpeed;
  setStatus("Particle in flight...");
  resetTrail();
}

function endShot(message, bubbleKind = null, bubbleAnchor = null) {
  state.isFlying = false;
  setStatus(message);
  if (bubbleKind) {
    const anchor = bubbleAnchor || {
      x: state.particle.x,
      y: state.particle.y,
      z: heightAt(state.particle.x, state.particle.y) + 2.0,
    };
    showAlienSpeech(bubbleKind, anchor.x, anchor.y, anchor.z, 3000);
  }
}

function onWin() {
  state.particle.x = state.level.target.x;
  state.particle.y = state.level.target.y;
  state.winJumpStart = performance.now();
  state.winJumpUntil = state.winJumpStart + winJumpDurationMs;
  playSfx(audioControl.winSfxUrl);
  const stars = state.usedAutoSolveShot ? 0 : state.gateIndex;
  state.starsByLevel[state.levelIndex] = Math.max(state.starsByLevel[state.levelIndex], stars);
  if (!state.bestReplayByLevel[state.levelIndex] || state.lastShotPath.length < state.bestReplayByLevel[state.levelIndex].length) {
    state.bestReplayByLevel[state.levelIndex] = [...state.lastShotPath];
    setLineFrom2D(replayLine, state.bestReplayByLevel[state.levelIndex]);
  }
  updateHud();
  if (state.levelIndex === LEVELS.length - 1) {
    completeCurrentRun();
  }
  updateNextButtonState({
    isWinReady: true,
    isFinalLevelWin: state.levelIndex === LEVELS.length - 1,
  });
  if (state.usedAutoSolveShot) {
    showRobotSpeech("Auto-solve success. No stars awarded. Next level ready.", { major: true, duration: 4200 });
    endShot("Auto-solve success. No stars awarded. Next level ready.");
  } else {
    showRobotSpeech(`Success! Star x${stars} earned. Next level ready.`, { major: true, duration: 4200 });
    endShot(`Success! Star x${stars} earned. Next level ready.`);
  }
}

function launchAutoSolveShot() {
  if (state.isFlying) return;
  const hint = state.level.hint;
  if (!hint) return;
  state.launchAngle = THREE.MathUtils.degToRad(hint.angleDeg);
  state.launchSpeed = hint.speed;
  ui.speed.value = String(state.launchSpeed);
  syncSpeedReadout();
  updateAimVisuals();
  startShot(true);
  showRobotSpeech("Auto-solve launched.", { duration: 3000, typewriter: true });
}

function updateInFlight() {
  const prevX = state.particle.x;
  const prevY = state.particle.y;
  const { ax, ay } = particleAccel(state.particle.x, state.particle.y);
  state.particle.vx += ax * dt;
  state.particle.vy += ay * dt;
  state.particle.x += state.particle.vx * dt;
  state.particle.y += state.particle.vy * dt;
  state.flightTime += dt;
  state.lastShotPath.push({ x: state.particle.x, y: state.particle.y });

  if (Math.abs(state.particle.x) > extent || Math.abs(state.particle.y) > extent) {
    endShot("Missed: exited boundary.", "boundary", {
      x: prevX,
      y: prevY,
      z: heightAt(prevX, prevY) + 2.0,
    });
    return;
  }
  if (state.flightTime > state.level.maxTime) {
    endShot("Missed: timeout.", "timeout", {
      x: state.particle.x,
      y: state.particle.y,
      z: heightAt(state.particle.x, state.particle.y) + 2.0,
    });
    return;
  }

  for (const mass of state.level.masses) {
    const dist = Math.hypot(state.particle.x - mass.x, state.particle.y - mass.y);
    if (dist < mass.radius * trapRadiusScale) {
      endShot("Missed: particle fell into a gravity well.", "gravity", {
        x: state.particle.x,
        y: state.particle.y,
        z: heightAt(state.particle.x, state.particle.y) + 2.0,
      });
      return;
    }
  }

  let newlyCollected = 0;
  for (const gate of state.gates) {
    if (gate.isCompleted) continue;
    if (crossesGateSegment(gate, prevX, prevY, state.particle.x, state.particle.y)) {
      gate.isCompleted = true;
      newlyCollected += 1;
    }
  }
  if (newlyCollected > 0) {
    state.gateIndex += newlyCollected;
    setGateVisualState();
    showRobotSpeech(pickRandomMessage("star"), { duration: 3000, typewriter: true });
    for (let i = 0; i < newlyCollected; i += 1) {
      setTimeout(() => {
        playSfx(audioControl.starSfxUrl);
      }, i * 90);
    }
  }

  const t = state.level.target;
  const dTarget = Math.hypot(state.particle.x - t.x, state.particle.y - t.y);
  if (dTarget <= t.radius) {
    onWin();
    return;
  }

  const z = heightAt(state.particle.x, state.particle.y);
  const particleZ = z + 0.8;
  particleMesh.position.set(state.particle.x, state.particle.y, particleZ);
  const speed = Math.hypot(state.particle.vx, state.particle.vy);
  const spin = particleSpinBase + speed * particleSpinPerSpeed;
  particleMesh.rotation.z += spin;
  particleMesh.rotation.y += spin * 0.45;
  pushTrail(state.particle.x, state.particle.y, z);

  const prevZ = heightAt(prevX, prevY);
  if (!Number.isFinite(prevZ)) endShot("Missed.");
}

function pointerToWorld(e) {
  const rect = renderer.domElement.getBoundingClientRect();
  mouseNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouseNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouseNdc, camera);
  const ok = raycaster.ray.intersectPlane(aimPlane, hitPoint);
  if (!ok) return null;
  return { x: THREE.MathUtils.clamp(hitPoint.x, -extent, extent), y: THREE.MathUtils.clamp(hitPoint.y, -extent, extent) };
}

function handleAimUpdate(e) {
  if (!state.isAiming || state.isFlying) return;
  const world = pointerToWorld(e);
  if (!world) return;
  const dx = world.x - state.level.launch.x;
  const dy = world.y - state.level.launch.y;
  if (Math.hypot(dx, dy) < 0.1) return;
  state.launchAngle = Math.atan2(dy, dx);
  updateAimVisuals();
}

let tutorialExitInProgress = false;
const tutorialTypewriter = {
  intervalId: null,
  timeoutId: null,
  isRunning: false,
};

const tutorialTypeSteps = [
  {
    bubbleSelector: ".tutorial-robot-note",
    target: () => ui.tutorialIntroText,
    text: "Initializing spacetime system...\n\nNote:\nThis system operates on a simplified 2D metric.\nDesigned for intuition. Not for exact physics.\n\nProceed.",
    speed: 29,
    delayAfter: 460,
  },
  {
    bubbleSelector: ".tutorial-type-bubble:nth-child(2)",
    parts: [
      { target: () => ui.tutorialText1, text: "How to move: Drag the starting point ", speed: 27 },
      { target: () => ui.tutorialText1After, text: " to aim. Scroll to rotate the view.", speed: 27 },
    ],
    speed: 27,
    delayAfter: 280,
  },
  {
    bubbleSelector: ".tutorial-type-bubble:nth-child(3)",
    parts: [
      { target: () => ui.tutorialText2, text: "Reach the UFO ", speed: 27 },
      { target: () => ui.tutorialText2After, text: "(target) to clear the level.", speed: 27 },
    ],
    speed: 27,
    delayAfter: 280,
  },
  {
    bubbleSelector: ".tutorial-type-bubble:nth-child(4)",
    parts: [
      { target: () => ui.tutorialText3, text: "Collect stars ", speed: 27 },
      { target: () => ui.tutorialText3After, text: "along the path for higher scores.", speed: 27 },
    ],
    speed: 27,
    delayAfter: 0,
  },
];

function clearTutorialTypewriter() {
  if (tutorialTypewriter.intervalId !== null) {
    clearInterval(tutorialTypewriter.intervalId);
    tutorialTypewriter.intervalId = null;
  }
  if (tutorialTypewriter.timeoutId !== null) {
    clearTimeout(tutorialTypewriter.timeoutId);
    tutorialTypewriter.timeoutId = null;
  }
  tutorialTypewriter.isRunning = false;
}

function resetTutorialTypewriter() {
  clearTutorialTypewriter();
  document.querySelectorAll(".tutorial-type-bubble").forEach((bubble) => {
    bubble.classList.remove("is-active", "is-complete");
  });
  [
    ui.tutorialIntroText,
    ui.tutorialText1,
    ui.tutorialText1After,
    ui.tutorialText2,
    ui.tutorialText2After,
    ui.tutorialText3,
    ui.tutorialText3After,
  ].forEach((target) => {
    if (target) target.textContent = "";
  });
}

function typeTutorialText(target, text, speed, onDone) {
  if (!target) {
    onDone();
    return;
  }
  let index = 0;
  target.textContent = "";
  tutorialTypewriter.intervalId = window.setInterval(() => {
    index += 1;
    target.textContent = text.slice(0, index);
    if (index >= text.length) {
      clearInterval(tutorialTypewriter.intervalId);
      tutorialTypewriter.intervalId = null;
      onDone();
    }
  }, speed);
}

function playTutorialTypewriterStep(index = 0) {
  if (!ui.tutorialOverlay || ui.tutorialOverlay.classList.contains("hidden")) return;
  const step = tutorialTypeSteps[index];
  if (!step) {
    tutorialTypewriter.isRunning = false;
    return;
  }
  const bubble = document.querySelector(step.bubbleSelector);
  bubble?.classList.add("is-active");
  typeTutorialStepParts(step, () => {
    bubble?.classList.add("is-complete");
    tutorialTypewriter.timeoutId = window.setTimeout(() => {
      tutorialTypewriter.timeoutId = null;
      playTutorialTypewriterStep(index + 1);
    }, step.delayAfter);
  });
}

function typeTutorialStepParts(step, onDone, partIndex = 0) {
  const parts = step.parts || [{ target: step.target, text: step.text, speed: step.speed }];
  const part = parts[partIndex];
  if (!part) {
    onDone();
    return;
  }
  typeTutorialText(part.target(), part.text, part.speed || step.speed, () => {
    typeTutorialStepParts(step, onDone, partIndex + 1);
  });
}

function startTutorialTypewriter() {
  resetTutorialTypewriter();
  tutorialTypewriter.isRunning = true;
  tutorialTypewriter.timeoutId = window.setTimeout(() => {
    tutorialTypewriter.timeoutId = null;
    playTutorialTypewriterStep();
  }, 280);
}

function showTutorial() {
  if (!ui.tutorialOverlay) return;
  ui.tutorialOverlay.classList.remove("is-exiting");
  ui.tutorialOverlay.classList.remove("hidden");
  ui.tutorialRobotAvatar?.classList.remove("is-hidden");
  ui.scene.classList.add("blurred");
  startTutorialTypewriter();
}

function hideTutorial() {
  if (!ui.tutorialOverlay) return;
  clearTutorialTypewriter();
  ui.tutorialOverlay.classList.remove("is-exiting");
  ui.tutorialOverlay.classList.add("hidden");
  ui.tutorialRobotAvatar?.classList.remove("is-hidden");
  ui.scene.classList.remove("blurred");
}

function finishTutorialStart() {
  hideTutorial();
  tutorialExitInProgress = false;
  if (ui.tutorialSkip) ui.tutorialSkip.disabled = false;
  ui.robotHud?.classList.add("is-arriving-home");
  window.setTimeout(() => {
    ui.robotHud?.classList.remove("is-arriving-home");
  }, 700);
}

function animateTutorialRobotHome() {
  if (tutorialExitInProgress) return;
  clearTutorialTypewriter();
  if (!ui.tutorialRobotAvatar || !ui.robotAvatar || !ui.tutorialOverlay) {
    finishTutorialStart();
    return;
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const startRect = ui.tutorialRobotAvatar.getBoundingClientRect();
  const endRect = ui.robotAvatar.getBoundingClientRect();
  if (prefersReducedMotion || startRect.width <= 0 || endRect.width <= 0) {
    finishTutorialStart();
    return;
  }

  tutorialExitInProgress = true;
  if (ui.tutorialSkip) ui.tutorialSkip.disabled = true;
  ui.tutorialOverlay.classList.add("is-exiting");
  ui.tutorialRobotAvatar.classList.add("is-hidden");

  const flyer = document.createElement("img");
  flyer.src = robotAvatarUrl;
  flyer.alt = "";
  flyer.className = "tutorial-robot-flight";
  flyer.style.left = `${startRect.left}px`;
  flyer.style.top = `${startRect.top}px`;
  flyer.style.width = `${startRect.width}px`;
  flyer.style.height = `${startRect.height}px`;
  document.body.appendChild(flyer);

  const dx = endRect.left - startRect.left;
  const dy = endRect.top - startRect.top;
  const scale = endRect.width / startRect.width;
  const animation = flyer.animate(
    [
      { transform: "translate3d(0, 0, 0) scale(1)", opacity: 1 },
      { transform: `translate3d(${dx * 0.36}px, ${dy * 0.18 - 42}px, 0) scale(${Math.max(scale, 0.78)})`, opacity: 1, offset: 0.46 },
      { transform: `translate3d(${dx}px, ${dy}px, 0) scale(${scale})`, opacity: 1 },
    ],
    {
      duration: 820,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      fill: "forwards",
    },
  );

  animation.onfinish = () => {
    flyer.remove();
    finishTutorialStart();
  };
  animation.oncancel = () => {
    flyer.remove();
    finishTutorialStart();
  };
}

function attachTutorialControls() {
  if (!ui.tutorialSkip) return;
  ui.tutorialSkip.addEventListener("click", () => {
    startNewRun();
    animateTutorialRobotHome();
  });
}

function attachControls() {
  ui.speed.addEventListener("input", () => {
    state.launchSpeed = Number(ui.speed.value);
    syncSpeedReadout();
    if (!state.isFlying) updateAimVisuals();
  });
  ui.fire.addEventListener("click", () => startShot(false));
  ui.reset.addEventListener("click", () => {
    state.isFlying = false;
    state.flightTime = 0;
    state.winJumpStart = 0;
    state.winJumpUntil = 0;
    state.usedAutoSolveShot = false;
    hideRobotSpeech();
    resetGateProgress();
    resetTrail();
    setParticleToLaunch();
    showRobotSpeech(pickRandomMessage("reset"), { duration: 3000, typewriter: true });
  });
  ui.hint.addEventListener("click", () => {
    const hint = state.level.hint;
    if (!hint) return;
    const pts = sampleTrajectory(THREE.MathUtils.degToRad(hint.angleDeg), hint.speed, maxHintTrail);
    setLineFrom2D(hintLine, pts);
    state.hintUntil = performance.now() + 1500;
    showRobotSpeech(pickRandomMessage("hint"), { duration: 3000, typewriter: true });
  });
  ui.solve.addEventListener("click", launchAutoSolveShot);
  ui.next.addEventListener("click", () => {
    if (ui.next.classList.contains("next-final")) {
      openEndgameOverlay();
    } else {
      configureLevel(state.levelIndex + 1);
      updateAimVisuals();
    }
  });
  ui.recordRunForm?.addEventListener("submit", saveCompletedRun);
  ui.restartFromLevel1.addEventListener("click", () => {
    startNewRun();
    configureLevel(0);
    updateAimVisuals();
  });
  ui.goStudyEinstein.addEventListener("click", () => {
    window.location.href = einsteinStudyPageUrl;
  });
  ui.goGameStart.addEventListener("click", () => {
    startNewRun();
    configureLevel(0);
    updateAimVisuals();
  });
  ui.quickStudyEinstein.addEventListener("click", () => {
    window.location.href = einsteinStudyPageUrl;
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.isEndgameOverlayOpen) {
      closeEndgameOverlay();
    }
  });
  window.addEventListener("storage", (e) => {
    if (e.key === SAVED_PLAYS_STORAGE_KEY) {
      renderRankingHud();
      renderSavedPlays();
      updateRecordRunFormState();
    }
  });
  ui.audioToggle.addEventListener("click", () => {
    toggleBackgroundAudio();
  });

  canvas.addEventListener("pointerdown", (e) => {
    if (state.isFlying) return;
    if (e.button !== 0) return;
    state.isAiming = true;
    const world = pointerToWorld(e);
    if (!world) {
      state.isAiming = false;
      return;
    }
    const launch = state.level.launch;
    const d = Math.hypot(world.x - launch.x, world.y - launch.y);
    if (d > aimGrabRadius) {
      state.isAiming = false;
      showRobotSpeech(pickRandomMessage("camera"), { duration: 3000, typewriter: true });
      return;
    }
    handleAimUpdate(e);
  });
  window.addEventListener("pointermove", handleAimUpdate);
  window.addEventListener("pointerup", () => {
    state.isAiming = false;
  });
}

attachControls();
attachTutorialControls();
configureLevel(0);
updateAimVisuals();
renderRankingHud();

// Show tutorial on every page load so refresh always starts from the beginning.
showTutorial();

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const elapsed = now * 0.001;
  dreamLabStars.rotation.z = elapsed * 0.012;
  dreamLabStars.rotation.x = Math.sin(elapsed * 0.12) * 0.018;
  dreamLabFog.children.forEach((sprite) => {
    const drift = sprite.userData.drift;
    sprite.material.opacity = sprite.userData.baseOpacity * (0.8 + Math.sin(elapsed * 0.55 + sprite.userData.phase) * 0.24);
    sprite.material.rotation += 0.00025 + drift * 0.00035;
    sprite.position.x = sprite.userData.baseX + Math.sin(elapsed * 0.18 + sprite.userData.phase) * drift;
    sprite.position.y = sprite.userData.baseY + Math.cos(elapsed * 0.14 + sprite.userData.phase) * drift * 0.8;
    sprite.position.z = sprite.userData.baseZ + Math.sin(elapsed * 0.42 + sprite.userData.phase) * 0.12;
  });
  wire.material.opacity = 0.36 + Math.sin(elapsed * 0.9) * 0.055;
  sheet.material.opacity = 0.38 + Math.sin(elapsed * 0.45) * 0.035;
  tealLight.intensity = 1.08 + Math.sin(elapsed * 0.7) * 0.16;
  orangeLight.intensity = 0.76 + Math.cos(elapsed * 0.64) * 0.12;
  magentaLight.intensity = 0.62 + Math.sin(elapsed * 0.52 + 1.4) * 0.11;
  violetLight.intensity = 0.5 + Math.sin(elapsed * 0.48 + 0.7) * 0.12;
  trailLine.material.opacity = state.isFlying ? 0.96 : 0.72 + Math.sin(elapsed * 1.4) * 0.08;

  if (state.isFlying) {
    updateInFlight();
  }
  if (state.hintUntil > 0 && now > state.hintUntil) {
    state.hintUntil = 0;
    clearLine(hintLine);
  }

  // Sway visible gate stars left/right in their local tangent direction.
  for (const gate of state.gates) {
    if (!gate.line.visible) continue;
    const sway = Math.sin(now * gateSwaySpeed + gate.swayPhase) * gateSwayAmplitude;
    gate.line.position.set(gate.x + gate.tx * sway, gate.y + gate.ty * sway, gate.baseZ);
    gate.label.position.set(
      gate.x + gate.tx * sway + gate.nx * 0.5,
      gate.y + gate.ty * sway + gate.ny * 0.5,
      gate.baseZ + 0.605,
    );
  }

  state.masses.forEach((massGroup, index) => {
    const halo = massGroup.userData.halo;
    if (!halo) return;
    halo.rotation.z = elapsed * (0.22 + index * 0.035);
    halo.material.opacity = massGroup.userData.haloBaseOpacity * (0.72 + Math.sin(elapsed * 1.1 + index) * 0.24);
  });

  if (!state.isFlying) {
    const z = heightAt(state.particle.x, state.particle.y);
    let particleLift = Math.sin(now * particleIdleBobSpeed) * particleIdleBobAmplitude;
    if (state.winJumpUntil > now) {
      const jumpProgress = THREE.MathUtils.clamp((now - state.winJumpStart) / winJumpDurationMs, 0, 1);
      const envelope = 1 - jumpProgress;
      const phase = jumpProgress * Math.PI * 2 * winJumpCycles;
      particleLift = Math.abs(Math.sin(phase)) * winJumpAmplitude * envelope;
      particleMesh.rotation.x = Math.sin(phase) * 0.16 * envelope;
    }
    const particleZ = z + 0.8 + particleLift;
    particleMesh.position.set(state.particle.x, state.particle.y, particleZ);
  }

  updateAlienSpeechPosition();
  // Subtle floating animation for target UFO.
  const floatOffset = Math.sin(now * 0.001) * 0.06;
  const targetZ = heightAt(state.level.target.x, state.level.target.y) + targetBaseLift + floatOffset;
  targetMesh.position.z = targetZ;
  if (targetMesh.userData.halo) {
    targetMesh.userData.halo.rotation.z = -elapsed * 0.38;
    targetMesh.userData.halo.material.opacity = 0.22 + Math.sin(elapsed * 1.8) * 0.07;
  }

  if (starHud.renderer && starHud.mesh) {
    starHud.mesh.rotation.z += 0.018;
    starHud.mesh.rotation.y += 0.01;
    starHud.renderer.render(starHud.scene, starHud.camera);
  }

  Object.values(tutorialModelIcons).forEach((icon) => {
    if (!icon?.renderer || !icon.mesh) return;
    icon.mesh.rotation.z += 0.01;
    icon.mesh.rotation.y += 0.014;
    icon.renderer.render(icon.scene, icon.camera);
  });

  controls.update();
  renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (starHud.renderer && ui.starIcon) {
    starHud.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    starHud.renderer.setSize(ui.starIcon.width, ui.starIcon.height, false);
  }
  Object.values(tutorialModelIcons).forEach((icon) => {
    if (!icon?.renderer) return;
    icon.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    icon.renderer.setSize(icon.size, icon.size, false);
  });
});
