// ─────────────────────────────────────────────────────────────
//  LEVELS
//  Each level is a static reference image + a list of checks.
//  kind: "pose"    → where your head and hands are
//        "emotion" → what your face is doing (MediaPipe blendshapes)
//  fn(h) returns 0..1. h = helpers built per frame (see game.js).
//
//  Swap in your own meme: set `img: "assets/your-meme.gif"`.
//  (GIFs work, but the game compares against one static frame.)
// ─────────────────────────────────────────────────────────────

// Use a GIF straight from GIPHY: paste the GIF's page URL or its ID.
//   giphy("https://giphy.com/gifs/some-name-AbC123xyz")
//   → { img, credit } — spread it into a level: { ...giphy("..."), name: ... }
// still: true uses GIPHY's first-frame still instead of the animation.
export const giphy = (urlOrId, { still = false } = {}) => {
  const id = String(urlOrId).split(/[/?#]/).filter(Boolean).pop().split("-").pop();
  return {
    img: `https://media.giphy.com/media/${id}/${still ? "giphy_s.gif" : "giphy.gif"}`,
    credit: { text: "via GIPHY", href: `https://giphy.com/gifs/${id}` },
  };
};

const INK = "#1a0b2e";
const SKIN = "#f2c48d";

const svg = (bg, body) =>
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 200 200"><rect width="200" height="200" fill="${bg}"/>${body}</svg>`
  );

const head = `<ellipse cx="100" cy="112" rx="60" ry="68" fill="${SKIN}" stroke="${INK}" stroke-width="5"/>`;
const hand = (cx, cy, rot = 0) =>
  `<g transform="rotate(${rot} ${cx} ${cy})"><rect x="${cx - 18}" y="${cy - 26}" width="36" height="52" rx="16" fill="${SKIN}" stroke="${INK}" stroke-width="5"/><path d="M${cx - 6} ${cy - 22} v18 M${cx + 6} ${cy - 22} v18" stroke="${INK}" stroke-width="3" stroke-linecap="round"/></g>`;

const SIDE_EYE = svg(
  "#7fd1c7",
  `${head}
  <path d="M56 84 L90 93" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>
  <path d="M110 93 L144 84" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>
  <ellipse cx="76" cy="106" rx="17" ry="9" fill="#fff" stroke="${INK}" stroke-width="4"/>
  <ellipse cx="124" cy="106" rx="17" ry="9" fill="#fff" stroke="${INK}" stroke-width="4"/>
  <circle cx="88" cy="107" r="6" fill="${INK}"/><circle cx="136" cy="107" r="6" fill="${INK}"/>
  <path d="M59 103 Q76 95 93 103" fill="none" stroke="${INK}" stroke-width="5"/>
  <path d="M107 103 Q124 95 141 103" fill="none" stroke="${INK}" stroke-width="5"/>
  <path d="M78 150 Q100 146 122 149" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`
);

const SCREAM = svg(
  "#ff8a5b",
  `${head}
  <path d="M60 74 Q76 60 90 72" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
  <path d="M110 72 Q124 60 140 74" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
  <circle cx="76" cy="98" r="15" fill="#fff" stroke="${INK}" stroke-width="4"/><circle cx="76" cy="98" r="4" fill="${INK}"/>
  <circle cx="124" cy="98" r="15" fill="#fff" stroke="${INK}" stroke-width="4"/><circle cx="124" cy="98" r="4" fill="${INK}"/>
  <ellipse cx="100" cy="148" rx="18" ry="28" fill="${INK}"/>
  ${hand(42, 132, -12)}${hand(158, 132, 12)}`
);

const BIG_BRAIN = svg(
  "#b9a3ff",
  `<g transform="rotate(-9 100 112)">${head}
  <path d="M58 80 Q74 64 92 78" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
  <path d="M110 92 L142 90" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
  <ellipse cx="76" cy="102" rx="13" ry="11" fill="#fff" stroke="${INK}" stroke-width="4"/><circle cx="78" cy="103" r="5" fill="${INK}"/>
  <path d="M110 106 Q124 100 138 106" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
  <path d="M80 146 Q104 152 124 136" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/></g>
  <rect x="150" y="98" width="34" height="46" rx="14" fill="${SKIN}" stroke="${INK}" stroke-width="5"/>
  <rect x="150" y="62" width="14" height="44" rx="7" fill="${SKIN}" stroke="${INK}" stroke-width="5" transform="rotate(-28 157 104)"/>`
);

const FACEPALM = svg(
  "#ffd23f",
  `${head}
  <path d="M74 148 Q100 132 126 148" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
  <g transform="rotate(-8 100 96)">
  <rect x="54" y="66" width="92" height="56" rx="24" fill="${SKIN}" stroke="${INK}" stroke-width="5"/>
  <path d="M74 70 v34 M92 68 v36 M110 68 v36 M128 70 v32" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
  <rect x="88" y="118" width="26" height="40" rx="10" fill="${SKIN}" stroke="${INK}" stroke-width="5" transform="rotate(30 100 138)"/></g>
  <path d="M150 40 l6 10 M162 34 l2 12 M140 30 l6 12" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`
);

// Face mesh indices used below
const CHIN = [152, 175, 199];
const MOUTH = [13, 14, 17, 0];
const L_CHEEK = [234, 93, 132, 50]; // subject's right side (image left)
const R_CHEEK = [454, 323, 361, 280];
const TEMPLES = [127, 356, 54, 284, 21, 251, 162, 389];
const BROW_MID = [9, 10, 151, 168];

export const LEVELS = [
  {
    id: "hmm",
    name: "The Hmm Monkey",
    tagline: "Deeply considering your life choices.",
    img: "assets/hmm-monkey.png",
    tips: ["Knuckles or fingers on your chin", "Purse those lips", "Suspicious, squinty eyes", "Do NOT smile"],
    checks: [
      { kind: "pose", label: "Hand on chin", w: 3,
        fn: h => h.near(h.handTo([4, 5, 6, 7, 8, 10, 11, 12], [...CHIN, ...MOUTH]), 0.14, 0.6) },
      { kind: "pose", label: "Just one hand", w: 1,
        fn: h => (h.hands.length === 1 ? 1 : h.hands.length === 2 ? 0.4 : 0) },
      { kind: "emotion", label: "Pursed lips", w: 2.5,
        fn: h => h.ramp(Math.max(h.bs("mouthPucker"), h.avg2("mouthPressLeft", "mouthPressRight"), h.bs("mouthFunnel")), 0.05, 0.45) },
      { kind: "emotion", label: "Suspicious eyes", w: 1.5,
        fn: h => Math.max(h.ramp(h.avg2("eyeSquintLeft", "eyeSquintRight"), 0.1, 0.5), h.ramp(h.sideEye(), 0.1, 0.45)) },
      { kind: "emotion", label: "Zero smile", w: 1,
        fn: h => 1 - h.ramp(h.avg2("mouthSmileLeft", "mouthSmileRight"), 0.12, 0.45) },
    ],
  },
  {
    id: "sideeye",
    name: "The Side-Eye",
    tagline: "Someone just said something unhinged at dinner.",
    img: SIDE_EYE,
    tips: ["Keep your head pointing at the camera", "Eyes slammed to one side", "Lips pressed into a flat line", "Brows down. Judge them."],
    checks: [
      { kind: "pose", label: "Head facing forward", w: 1.5, fn: h => h.near(Math.abs(h.yaw()), 0.1, 0.4) },
      { kind: "pose", label: "Hands off your face", w: 1, fn: h => (h.hands.length ? 1 - h.near(h.handTo(["palm"], [1]), 0.6, 1.2) : 1) },
      { kind: "emotion", label: "Eyes to the side", w: 3.5, fn: h => h.ramp(h.sideEye(), 0.15, 0.6) },
      { kind: "emotion", label: "Flat, pressed lips", w: 1.5,
        fn: h => h.ramp(Math.max(h.avg2("mouthPressLeft", "mouthPressRight"), h.avg2("mouthRollLower", "mouthRollUpper")), 0.04, 0.35) * (1 - h.ramp(h.bs("jawOpen"), 0.1, 0.35)) },
      { kind: "emotion", label: "Judgy brows", w: 1.5,
        fn: h => Math.max(h.ramp(h.avg2("browDownLeft", "browDownRight"), 0.05, 0.4), h.ramp(h.avg2("eyeSquintLeft", "eyeSquintRight"), 0.15, 0.55)) },
    ],
  },
  {
    id: "scream",
    name: "Internal Screaming",
    tagline: "You just saw your screen time report.",
    img: SCREAM,
    tips: ["Both palms flat on your cheeks", "Mouth open as WIDE as it goes", "Eyebrows to the ceiling", "Eyes huge"],
    checks: [
      { kind: "pose", label: "Hands on both cheeks", w: 4,
        fn: h => {
          const pts = ["palm", 8, 12, 4, 9];
          const g = 0.2, b = 0.65;
          const [A, B] = h.hands;
          if (!A) return 0;
          if (!B) return 0.5 * Math.max(h.near(h.handTo(pts, L_CHEEK, A), g, b), h.near(h.handTo(pts, R_CHEEK, A), g, b));
          const s1 = h.near(h.handTo(pts, L_CHEEK, A), g, b) + h.near(h.handTo(pts, R_CHEEK, B), g, b);
          const s2 = h.near(h.handTo(pts, R_CHEEK, A), g, b) + h.near(h.handTo(pts, L_CHEEK, B), g, b);
          return Math.max(s1, s2) / 2;
        } },
      { kind: "emotion", label: "Mouth wide open", w: 3, fn: h => h.ramp(h.bs("jawOpen"), 0.15, 0.65) },
      { kind: "emotion", label: "Brows up", w: 1.5, fn: h => h.ramp(Math.max(h.bs("browInnerUp"), h.avg2("browOuterUpLeft", "browOuterUpRight")), 0.15, 0.65) },
      { kind: "emotion", label: "Eyes wide", w: 1.5, fn: h => h.ramp(h.avg2("eyeWideLeft", "eyeWideRight"), 0.05, 0.45) },
    ],
  },
  {
    id: "bigbrain",
    name: "Big Brain Smirk",
    tagline: "You just thought of the worst possible idea and you love it.",
    img: BIG_BRAIN,
    tips: ["One finger tapping your temple", "Tilt your head", "ONE eyebrow up", "Lopsided smirk, squinty eyes"],
    checks: [
      { kind: "pose", label: "Finger on temple", w: 3, fn: h => h.near(h.handTo([8, 7, 12], TEMPLES), 0.14, 0.5) },
      { kind: "pose", label: "Head tilt", w: 1, fn: h => h.ramp(Math.abs(h.roll()), 4, 14) },
      { kind: "emotion", label: "One eyebrow raised", w: 2,
        fn: h => h.ramp(Math.abs((h.bs("browOuterUpLeft") - h.bs("browDownLeft")) - (h.bs("browOuterUpRight") - h.bs("browDownRight"))), 0.12, 0.5) },
      { kind: "emotion", label: "Lopsided smirk", w: 2,
        fn: h => {
          const l = h.bs("mouthSmileLeft"), r = h.bs("mouthSmileRight");
          return 0.5 * h.ramp(Math.max(l, r), 0.12, 0.5) + 0.5 * h.ramp(Math.abs(l - r), 0.06, 0.3);
        } },
      { kind: "emotion", label: "Scheming squint", w: 1, fn: h => h.ramp(h.avg2("eyeSquintLeft", "eyeSquintRight"), 0.1, 0.45) },
    ],
  },
  {
    id: "facepalm",
    name: "Facepalm of Shame",
    tagline: "Your group project partner said 'what's a deadline'.",
    img: FACEPALM,
    tips: ["Palm over your forehead and eyes", "Eyes shut", "Mouth turned down", "Feel the disappointment"],
    checks: [
      { kind: "pose", label: "Palm on forehead", w: 3, fn: h => h.near(h.handTo(["palm", 9, 5], BROW_MID), 0.22, 0.7) },
      { kind: "pose", label: "Hand covering face", w: 1.5, fn: h => h.ramp(h.handFaceOverlap(), 0.1, 0.4) },
      { kind: "emotion", label: "Eyes closed", w: 2, fn: h => (h.occluded ? 0.85 : h.ramp(h.avg2("eyeBlinkLeft", "eyeBlinkRight"), 0.3, 0.75)) },
      { kind: "emotion", label: "Defeated mouth", w: 2,
        fn: h => h.ramp(Math.max(h.avg2("mouthFrownLeft", "mouthFrownRight"), h.avg2("mouthPressLeft", "mouthPressRight"), h.avg2("mouthLowerDownLeft", "mouthLowerDownRight") * 0.7), 0.04, 0.35) },
      { kind: "emotion", label: "Anguished brows", w: 1, fn: h => (h.occluded ? 0.7 : h.ramp(Math.max(h.bs("browInnerUp"), h.avg2("browDownLeft", "browDownRight")), 0.1, 0.5)) },
    ],
  },
];

export const VERDICTS = [
  [95, "Indistinguishable. Are you the meme?"],
  [85, "Certified reaction image."],
  [70, "The vibes are there. Mostly."],
  [55, "Off-brand, but we see it."],
  [40, "Discount bin version."],
  [20, "That is a different meme."],
  [0, "Who are you and what was that"],
];

export const RANKS = [
  [450, "Meme Incarnate"],
  [380, "Reaction Image Royalty"],
  [300, "Group Chat Legend"],
  [220, "Mildly Unhinged"],
  [140, "Normie With Potential"],
  [0, "Facial Expression Unavailable"],
];
