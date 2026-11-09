import { FilesetResolver, FaceLandmarker, HandLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";
import { LEVELS, VERDICTS, RANKS } from "./levels.js";

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const FACE_MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const HAND_MODEL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

const COUNTDOWN_MS = 3000; // time to get into character
const HOLD_MS = 900;       // window after the countdown where we keep the best frame
const POSE_WEIGHT = 0.5;   // final = pose * w + emotion * (1 - w)

const $ = s => document.querySelector(s);
const video = $("#video");
const overlay = $("#overlay");
const octx = overlay.getContext("2d");

const S = {
  face: null, hand: null,
  level: 0,
  results: [],            // {score, pose, emo, checks, shot}
  live: { pose: 0, emo: 0 },
  capture: null,          // {start, best, bestScore}
  lastFace: null, lastFaceAt: 0,
  lastVideoTime: -1,
};

/* ───────────── screens ───────────── */
function show(id) {
  for (const s of document.querySelectorAll(".screen")) s.hidden = s.id !== id;
  $("#hud").hidden = id === "screenTitle";
  window.scrollTo({ top: 0 });
}

function updateHud() {
  const total = S.results.reduce((a, r) => a + (r?.score || 0), 0);
  $("#hudLevel").textContent = `LVL ${Math.min(S.level + 1, LEVELS.length)}/${LEVELS.length}`;
  $("#hudScore").textContent = `${total} PTS`;
}

/* ───────────── boot ───────────── */
const BEST_KEY = "meme-mirror-best";
function readBest() { try { return +localStorage.getItem(BEST_KEY) || 0; } catch { return 0; } }
function writeBest(v) { try { localStorage.setItem(BEST_KEY, String(v)); } catch {} }
if (readBest()) $("#bestEver").textContent = `Your best: ${readBest()} / 500`;

$("#btnStart").addEventListener("click", async () => {
  const btn = $("#btnStart"), status = $("#startStatus");
  btn.disabled = true;
  try {
    status.textContent = "Asking for your camera…";
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 720 } }, audio: false,
    });
    video.srcObject = stream;
    await video.play();
    await initVision(t => (status.textContent = t));
    startGame();
    requestAnimationFrame(tick);
  } catch (err) {
    console.error(err);
    btn.disabled = false;
    status.textContent = err?.name === "NotAllowedError"
      ? "Camera blocked. Allow camera access in your browser's site settings, then try again."
      : `Couldn't start: ${err?.message || err}. Use Chrome, Edge or Safari over https or localhost.`;
  }
});

async function initVision(onStatus) {
  if (S.face) return;
  onStatus("Downloading the face model…");
  const fileset = await FilesetResolver.forVisionTasks(WASM);
  const make = async (Cls, opts) => {
    try { return await Cls.createFromOptions(fileset, { ...opts, baseOptions: { ...opts.baseOptions, delegate: "GPU" } }); }
    catch { return await Cls.createFromOptions(fileset, { ...opts, baseOptions: { ...opts.baseOptions, delegate: "CPU" } }); }
  };
  S.face = await make(FaceLandmarker, {
    baseOptions: { modelAssetPath: FACE_MODEL }, runningMode: "VIDEO", numFaces: 1, outputFaceBlendshapes: true,
  });
  onStatus("Downloading the hand model…");
  S.hand = await make(HandLandmarker, {
    baseOptions: { modelAssetPath: HAND_MODEL }, runningMode: "VIDEO", numHands: 2,
  });
}

function startGame() {
  S.level = 0;
  S.results = [];
  loadLevel();
}

function loadLevel() {
  const L = LEVELS[S.level];
  $("#refImg").src = L.img;
  $("#refNum").textContent = `LEVEL ${S.level + 1}`;
  $("#refDots").textContent = LEVELS.map((_, i) => (i < S.level ? "●" : i === S.level ? "◉" : "○")).join("");
  $("#refName").textContent = L.name;
  $("#refTag").textContent = L.tagline;
  $("#refTips").replaceChildren(...L.tips.map(t => Object.assign(document.createElement("li"), { textContent: t })));
  $("#btnSnap").disabled = false;
  S.capture = null;
  updateHud();
  show("screenPlay");
}

/* ───────────── per-frame helpers ───────────── */
const clamp = v => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const mean = pts => ({ x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length });
const palmOf = h => mean([h[0], h[5], h[9], h[13], h[17]]);
const bbox = pts => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of pts) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
  return { x0, y0, x1, y1 };
};

function helpers(f) {
  const F = f.face;
  const fw = dist(F[234], F[454]) || 1;
  const bs = n => f.bs[n] || 0;
  return {
    hands: f.hands,
    occluded: f.occluded,
    bs,
    avg2: (a, b) => (bs(a) + bs(b)) / 2,
    ramp: (v, lo, hi) => clamp((v - lo) / (hi - lo)),
    near: (d, good, bad) => clamp(1 - (d - good) / (bad - good)),
    // smallest distance (in face-widths) from any listed hand point to any listed face point
    handTo(handIdx, faceIdx, only) {
      let best = Infinity;
      for (const h of only ? [only] : f.hands) {
        for (const i of handIdx) {
          const hp = i === "palm" ? palmOf(h) : h[i];
          for (const j of faceIdx) best = Math.min(best, dist(hp, F[j]) / fw);
        }
      }
      return best;
    },
    sideEye: () => Math.max(
      (bs("eyeLookOutLeft") + bs("eyeLookInRight")) / 2,
      (bs("eyeLookOutRight") + bs("eyeLookInLeft")) / 2),
    yaw: () => (F[1].x - (F[234].x + F[454].x) / 2) / fw,
    roll: () => Math.atan2(F[263].y - F[33].y, F[263].x - F[33].x) * 180 / Math.PI,
    handFaceOverlap() {
      const fb = bbox(F);
      const area = (fb.x1 - fb.x0) * (fb.y1 - fb.y0) || 1;
      let best = 0;
      for (const h of f.hands) {
        const hb = bbox(h);
        const w = Math.min(fb.x1, hb.x1) - Math.max(fb.x0, hb.x0);
        const ht = Math.min(fb.y1, hb.y1) - Math.max(fb.y0, hb.y0);
        if (w > 0 && ht > 0) best = Math.max(best, (w * ht) / area);
      }
      return best;
    },
  };
}

function scoreFrame(level, f) {
  if (!f.face) return { score: 0, pose: 0, emo: 0, checks: [], noFace: true };
  const h = helpers(f);
  const checks = level.checks.map(c => {
    let v = 0;
    try { v = clamp(c.fn(h)); } catch (e) { console.warn(c.label, e); }
    return { label: c.label, kind: c.kind, w: c.w, v };
  });
  const agg = kind => {
    const cs = checks.filter(c => c.kind === kind);
    const w = cs.reduce((a, c) => a + c.w, 0);
    return w ? cs.reduce((a, c) => a + c.v * c.w, 0) / w : 0;
  };
  // gentle curve so a decent attempt feels decent
  const curve = v => Math.pow(v, 0.8);
  const pose = curve(agg("pose")), emo = curve(agg("emotion"));
  return { score: Math.round(100 * (pose * POSE_WEIGHT + emo * (1 - POSE_WEIGHT))), pose, emo, checks };
}

/* ───────────── main loop ───────────── */
function tick() {
  requestAnimationFrame(tick);
  if (!S.face || video.readyState < 2 || $("#screenPlay").hidden) return;
  if (video.currentTime === S.lastVideoTime) return;
  S.lastVideoTime = video.currentTime;

  const now = performance.now();
  const W = video.videoWidth, H = video.videoHeight;
  const fr = S.face.detectForVideo(video, now);
  const hr = S.hand.detectForVideo(video, now);

  let face = null, bs = {}, occluded = false;
  if (fr.faceLandmarks?.length) {
    face = fr.faceLandmarks[0].map(p => ({ x: p.x * W, y: p.y * H }));
    for (const c of fr.faceBlendshapes?.[0]?.categories || []) bs[c.categoryName] = c.score;
    S.lastFace = { face, bs };
    S.lastFaceAt = now;
  } else if (S.lastFace && now - S.lastFaceAt < 1500) {
    // face got covered (hello facepalm): keep the last known face for a moment
    ({ face, bs } = S.lastFace);
    occluded = true;
  }
  const hands = (hr.landmarks || []).map(h => h.map(p => ({ x: p.x * W, y: p.y * H })));
  const frame = { face, bs, hands, occluded };
  const res = scoreFrame(LEVELS[S.level], frame);

  // live meters (smoothed)
  const k = 0.25;
  S.live.pose += (res.pose - S.live.pose) * k;
  S.live.emo += (res.emo - S.live.emo) * k;
  setMeter("Pose", S.live.pose);
  setMeter("Emo", S.live.emo);
  $("#noface").hidden = !!face;

  drawOverlay(frame, W, H);
  runCapture(now, res);
}

function setMeter(name, v) {
  const pct = Math.round(v * 100);
  $(`#m${name}`).style.width = pct + "%";
  $(`#m${name}N`).textContent = pct;
}

const HAND_LINKS = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
function drawOverlay(f, W, H) {
  if (overlay.width !== W) { overlay.width = W; overlay.height = H; }
  octx.setTransform(1, 0, 0, 1, 0, 0);
  octx.clearRect(0, 0, W, H);
  octx.setTransform(-1, 0, 0, 1, W, 0); // mirror to match the video
  if (f.face && !f.occluded) {
    octx.fillStyle = "rgba(255,210,63,.75)";
    for (let i = 0; i < f.face.length; i += 7) {
      const p = f.face[i];
      octx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
    }
  }
  octx.lineWidth = 3;
  octx.strokeStyle = "#7fd1c7";
  octx.fillStyle = "#ff4d2e";
  for (const h of f.hands) {
    octx.beginPath();
    for (const [a, b] of HAND_LINKS) { octx.moveTo(h[a].x, h[a].y); octx.lineTo(h[b].x, h[b].y); }
    octx.stroke();
    for (const p of h) { octx.beginPath(); octx.arc(p.x, p.y, 4, 0, 7); octx.fill(); }
  }
}

/* ───────────── capture ───────────── */
const shotCanvas = document.createElement("canvas");
function grabFrame() {
  const W = video.videoWidth, H = video.videoHeight, side = Math.min(W, H);
  shotCanvas.width = shotCanvas.height = 640;
  const c = shotCanvas.getContext("2d");
  c.setTransform(-1, 0, 0, 1, 640, 0);
  c.drawImage(video, (W - side) / 2, (H - side) / 2, side, side, 0, 0, 640, 640);
  return shotCanvas.toDataURL("image/jpeg", 0.85);
}

function snap() {
  if (S.capture || $("#screenPlay").hidden) return;
  $("#btnSnap").disabled = true;
  S.capture = { start: performance.now(), best: null, bestRes: null };
}

function runCapture(now, res) {
  const C = S.capture;
  if (!C) return;
  const t = now - C.start;
  const count = $("#count");
  if (t < COUNTDOWN_MS) {
    count.hidden = false;
    count.classList.remove("hold");
    count.textContent = String(Math.ceil((COUNTDOWN_MS - t) / 1000));
    return;
  }
  if (t < COUNTDOWN_MS + HOLD_MS) {
    count.hidden = false;
    count.classList.add("hold");
    count.textContent = "HOLD IT!";
    if (!C.bestRes || res.score > C.bestRes.score) { C.bestRes = res; C.best = grabFrame(); }
    return;
  }
  count.hidden = true;
  const f = $("#flash");
  f.classList.remove("on"); void f.offsetWidth; f.classList.add("on");
  if (!C.best) { C.best = grabFrame(); C.bestRes = res; }
  S.results[S.level] = { ...C.bestRes, shot: C.best };
  S.capture = null;
  setTimeout(showResult, 350);
}

/* ───────────── result ───────────── */
function verdictFor(score) { return VERDICTS.find(([min]) => score >= min)[1]; }

function showResult() {
  const L = LEVELS[S.level], r = S.results[S.level];
  $("#resRef").src = L.img;
  $("#resYou").src = r.shot;
  $("#resQuip").textContent = r.noFace ? "We couldn't see a face. The meme requires a face." : verdictFor(r.score);
  $("#resPose").textContent = Math.round(r.pose * 100);
  $("#resEmo").textContent = Math.round(r.emo * 100);
  $("#resBreak").replaceChildren(...r.checks.map(c => {
    const li = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = c.label;
    const tag = document.createElement("em");
    tag.textContent = c.kind === "pose" ? "POSE" : "EMO";
    label.append(tag);
    const track = document.createElement("div");
    track.className = "track";
    const bar = document.createElement("i");
    bar.style.width = Math.round(c.v * 100) + "%";
    if (c.kind !== "pose") bar.style.background = "#8a5cff";
    track.append(bar);
    const n = document.createElement("b");
    n.textContent = Math.round(c.v * 100);
    li.append(label, track, n);
    return li;
  }));
  $("#btnNext").textContent = S.level === LEVELS.length - 1 ? "See final score" : "Next meme";
  updateHud();
  show("screenResult");
  countUp($("#resScore"), r.score, 700);
}

function countUp(el, to, ms) {
  const t0 = performance.now();
  const step = t => {
    const p = Math.min(1, (t - t0) / ms);
    el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ───────────── final ───────────── */
async function showFinal() {
  const total = S.results.reduce((a, r) => a + (r?.score || 0), 0);
  if (total > readBest()) writeBest(total);
  $("#bestEver").textContent = `Your best: ${readBest()} / 500`;
  $("#finRank").textContent = RANKS.find(([min]) => total >= min)[1];
  show("screenFinal");
  countUp($("#finScore"), total, 1100);
  await drawCollage(total);
}

const loadImg = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });

async function drawCollage(total) {
  try { await document.fonts.ready; } catch {}
  const cv = $("#collage"), c = cv.getContext("2d");
  const W = cv.width, H = cv.height;
  c.fillStyle = "#1a0b2e"; c.fillRect(0, 0, W, H);
  c.fillStyle = "#fff4e0";
  c.font = "64px 'Bowlby One', Impact, sans-serif";
  c.fillText("MEME", 60, 110);
  c.fillStyle = "#ffd23f";
  c.fillText("MIRROR", 60 + c.measureText("MEME").width + 10, 110);
  c.textAlign = "right";
  c.font = "64px 'Bowlby One', Impact, sans-serif";
  c.fillStyle = "#ffd23f";
  c.fillText(`${total}/500`, W - 60, 110);
  c.textAlign = "left";

  const rowH = 236, top = 160, size = 200;
  for (let i = 0; i < LEVELS.length; i++) {
    const y = top + i * rowH, r = S.results[i];
    const [ref, you] = await Promise.all([loadImg(LEVELS[i].img), r?.shot ? loadImg(r.shot) : null]);
    roundImg(c, ref, 60, y, size);
    roundImg(c, you, 60 + size + 24, y, size);
    c.fillStyle = "#c9b8e6";
    c.font = "800 26px 'JetBrains Mono', monospace";
    c.fillText(`LEVEL ${i + 1}`, 520, y + 50);
    c.fillStyle = "#fff4e0";
    c.font = "40px 'Bowlby One', Impact, sans-serif";
    c.fillText(LEVELS[i].name.toUpperCase().slice(0, 18), 520, y + 105);
    c.fillStyle = r ? "#ff4d2e" : "#c9b8e6";
    c.font = "800 64px 'JetBrains Mono', monospace";
    c.fillText(r ? String(r.score) : "—", 520, y + 180);
  }
  c.fillStyle = "#c9b8e6";
  c.font = "600 26px 'Familjen Grotesk', sans-serif";
  c.fillText($("#finRank").textContent, 60, H - 50);
}

function roundImg(c, img, x, y, s) {
  c.save();
  c.beginPath();
  c.roundRect(x, y, s, s, 22);
  c.clip();
  c.fillStyle = "#2b1747"; c.fillRect(x, y, s, s);
  if (img) {
    const side = Math.min(img.width, img.height);
    c.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, x, y, s, s);
  }
  c.restore();
  c.lineWidth = 6; c.strokeStyle = "#fff4e0";
  c.beginPath(); c.roundRect(x, y, s, s, 22); c.stroke();
}

/* ───────────── controls ───────────── */
$("#btnSnap").addEventListener("click", snap);
$("#btnSkip").addEventListener("click", () => {
  S.results[S.level] = { score: 0, pose: 0, emo: 0, checks: [], shot: null, skipped: true };
  next();
});
$("#btnRetry").addEventListener("click", () => loadLevel());
$("#btnNext").addEventListener("click", next);
$("#btnAgain").addEventListener("click", startGame);
$("#btnDownload").addEventListener("click", () => {
  const a = document.createElement("a");
  a.download = "meme-mirror.png";
  a.href = $("#collage").toDataURL("image/png");
  a.click();
});
document.addEventListener("keydown", e => {
  if (e.code === "Space" && !$("#screenPlay").hidden) { e.preventDefault(); snap(); }
});

function next() {
  if (S.level < LEVELS.length - 1) { S.level++; loadLevel(); }
  else showFinal();
}
