// ─────────────────────────────────────────────────────────────
//  LEVELS
//  Every game draws ROUNDS levels at random from this pool.
//
//  A level's reference is either
//    giphy: "<GIF id>"  → linked from GIPHY, never copied into this repo
//    frame: 0..1        → which moment of the GIF holds the pose (0 = first frame)
//  or
//    img: "assets/…"    → a local image you own or have rights to
//
//  checks: kind "pose"    → where your head and hands are
//          kind "emotion" → what your face is doing (MediaPipe blendshapes)
//  fn(h) returns 0..1. h = helpers built per frame (see game.js).
// ─────────────────────────────────────────────────────────────

export const ROUNDS = 5;

const INK = "#1a0b2e";
const SKIN = "#f2c48d";
const svg = (bg, body) =>
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 200 200"><rect width="200" height="200" fill="${bg}"/>${body}</svg>`
  );

const SIDE_EYE = svg(
  "#7fd1c7",
  `<ellipse cx="100" cy="112" rx="60" ry="68" fill="${SKIN}" stroke="${INK}" stroke-width="5"/>
  <path d="M56 84 L90 93" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>
  <path d="M110 93 L144 84" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>
  <ellipse cx="76" cy="106" rx="17" ry="9" fill="#fff" stroke="${INK}" stroke-width="4"/>
  <ellipse cx="124" cy="106" rx="17" ry="9" fill="#fff" stroke="${INK}" stroke-width="4"/>
  <circle cx="88" cy="107" r="6" fill="${INK}"/><circle cx="136" cy="107" r="6" fill="${INK}"/>
  <path d="M59 103 Q76 95 93 103" fill="none" stroke="${INK}" stroke-width="5"/>
  <path d="M107 103 Q124 95 141 103" fill="none" stroke="${INK}" stroke-width="5"/>
  <path d="M78 150 Q100 146 122 149" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`
);

// Face mesh indices used below
const CHIN = [152, 175, 199];
const MOUTH = [13, 14, 17, 0];
const L_CHEEK = [234, 93, 132, 50]; // image-left side of the face
const R_CHEEK = [454, 323, 361, 280];
const TEMPLES = [127, 356, 54, 284, 21, 251, 162, 389];
const BROW_MID = [9, 10, 151, 168];
const FOREHEAD = [10, 67, 297, 109, 338];

// Reusable checks
const handsAway = { kind: "pose", label: "Hands off your face", w: 1,
  fn: h => (h.hands.length ? 1 - h.near(h.handTo(["palm", 8], [1]), 0.7, 1.3) : 1) };
const smile = h => h.avg2("mouthSmileLeft", "mouthSmileRight");
const browsUp = h => Math.max(h.bs("browInnerUp"), h.avg2("browOuterUpLeft", "browOuterUpRight"));

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
      { kind: "emotion", label: "Zero smile", w: 1, fn: h => 1 - h.ramp(smile(h), 0.12, 0.45) },
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
      handsAway,
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
    giphy: "d2YWTOsVtuHgOHhC", frame: 0.76,
    tips: ["Both palms flat on your cheeks", "Mouth open as WIDE as it goes", "Eyebrows to the ceiling", "Eyes huge"],
    checks: [
      { kind: "pose", label: "Hands on both cheeks", w: 4, fn: h => h.twoHands(["palm", 8, 12, 4, 9], L_CHEEK, R_CHEEK, 0.2, 0.65) },
      { kind: "emotion", label: "Mouth wide open", w: 3, fn: h => h.ramp(h.bs("jawOpen"), 0.15, 0.65) },
      { kind: "emotion", label: "Brows up", w: 1.5, fn: h => h.ramp(browsUp(h), 0.15, 0.65) },
      { kind: "emotion", label: "Eyes wide", w: 1.5, fn: h => h.ramp(h.avg2("eyeWideLeft", "eyeWideRight"), 0.05, 0.45) },
    ],
  },
  {
    id: "templetap",
    name: "Big Brain Temple Tap",
    tagline: "You just thought of the worst possible idea and you love it.",
    giphy: "LqghYqYPnGt65WpMI1", frame: 0.57,
    tips: ["One finger tapping your temple", "Tilt your head", "Smug, lopsided smile", "Squint like a genius"],
    checks: [
      { kind: "pose", label: "Finger on temple", w: 3, fn: h => h.near(h.handTo([8, 7, 12], TEMPLES), 0.14, 0.5) },
      { kind: "pose", label: "Head tilt", w: 1, fn: h => h.ramp(Math.abs(h.roll()), 4, 14) },
      { kind: "emotion", label: "Smug smirk", w: 2.5,
        fn: h => {
          const l = h.bs("mouthSmileLeft"), r = h.bs("mouthSmileRight");
          return 0.6 * h.ramp(Math.max(l, r), 0.12, 0.5) + 0.4 * h.ramp(Math.abs(l - r), 0.04, 0.25);
        } },
      { kind: "emotion", label: "Scheming squint", w: 1.5, fn: h => h.ramp(h.avg2("eyeSquintLeft", "eyeSquintRight"), 0.1, 0.45) },
    ],
  },
  {
    id: "facepalm",
    name: "Captain's Facepalm",
    tagline: "Your group project partner said 'what's a deadline'.",
    giphy: "bkklBjAmlYjv2", frame: 0.5,
    tips: ["Bury your face in BOTH hands", "Head bowed", "Eyes shut", "Feel the disappointment of a whole starship"],
    checks: [
      { kind: "pose", label: "Hands over face", w: 3, fn: h => h.ramp(h.handFaceOverlap(), 0.15, 0.5) },
      { kind: "pose", label: "Both hands", w: 1, fn: h => (h.hands.length >= 2 ? 1 : h.hands.length * 0.4) },
      { kind: "pose", label: "Palms on forehead", w: 1.5, fn: h => h.near(h.handTo(["palm", 9, 5], [...BROW_MID, ...FOREHEAD]), 0.22, 0.7) },
      { kind: "emotion", label: "Eyes closed", w: 2, fn: h => (h.occluded ? 0.85 : h.ramp(h.avg2("eyeBlinkLeft", "eyeBlinkRight"), 0.3, 0.75)) },
      { kind: "emotion", label: "Defeated mouth", w: 1.5,
        fn: h => (h.occluded ? 0.7 : h.ramp(Math.max(h.avg2("mouthFrownLeft", "mouthFrownRight"), h.avg2("mouthPressLeft", "mouthPressRight")), 0.04, 0.35)) },
    ],
  },
  {
    id: "confused",
    name: "Confused Nick Young",
    tagline: "??? ??? ???",
    giphy: "JUIat97vxQLCFv49Wj", frame: 0.8,
    tips: ["Hands down", "Tilt your head a little", "Big baffled grin", "Eyebrows up, eyes a bit squinty"],
    checks: [
      handsAway,
      { kind: "pose", label: "Slight head tilt", w: 1.5, fn: h => h.ramp(Math.abs(h.roll()), 3, 12) },
      { kind: "emotion", label: "Baffled grin", w: 3, fn: h => h.ramp(smile(h), 0.2, 0.65) },
      { kind: "emotion", label: "Brows up", w: 2, fn: h => h.ramp(browsUp(h), 0.1, 0.5) },
      { kind: "emotion", label: "Lips parted", w: 1, fn: h => h.ramp(h.bs("jawOpen"), 0.04, 0.25) },
    ],
  },
  {
    id: "kombucha",
    name: "Kombucha Disgust",
    tagline: "First sip of something you were told was 'an acquired taste'.",
    giphy: "QWjcMu3JADcRYETIXR", frame: 0.6,
    tips: ["Scrunch your whole face", "Nose wrinkled", "Eyes squeezed", "Mouth twisted to one side"],
    checks: [
      handsAway,
      { kind: "pose", label: "Head turned a bit", w: 1, fn: h => h.ramp(Math.abs(h.yaw()), 0.04, 0.2) },
      { kind: "emotion", label: "Nose wrinkle", w: 2, fn: h => h.ramp(h.avg2("noseSneerLeft", "noseSneerRight"), 0.05, 0.4) },
      { kind: "emotion", label: "Squeezed eyes", w: 2,
        fn: h => h.ramp(Math.max(h.avg2("eyeSquintLeft", "eyeSquintRight"), h.avg2("eyeBlinkLeft", "eyeBlinkRight") * 0.8), 0.2, 0.6) },
      { kind: "emotion", label: "Twisted mouth", w: 2,
        fn: h => h.ramp(Math.max(Math.abs(h.bs("mouthLeft") - h.bs("mouthRight")), h.avg2("mouthUpperUpLeft", "mouthUpperUpRight"), h.avg2("mouthFrownLeft", "mouthFrownRight")), 0.05, 0.35) },
      { kind: "emotion", label: "Brows down", w: 1, fn: h => h.ramp(h.avg2("browDownLeft", "browDownRight"), 0.05, 0.4) },
    ],
  },
  {
    id: "blink",
    name: "Wait, What? Blink",
    tagline: "Your friend says they've never seen a single movie.",
    giphy: "l3q2K5jinAlChoCLS", frame: 0.85,
    tips: ["Turn your head slightly away", "Eyes open, looking just past the camera", "Brows lifted a touch", "Mouth shut. Just process it."],
    checks: [
      handsAway,
      { kind: "pose", label: "Head turned", w: 2, fn: h => h.ramp(Math.abs(h.yaw()), 0.06, 0.25) },
      { kind: "emotion", label: "Brows lifted", w: 2, fn: h => h.ramp(browsUp(h), 0.08, 0.4) },
      { kind: "emotion", label: "Eyes open", w: 1, fn: h => 1 - h.ramp(h.avg2("eyeBlinkLeft", "eyeBlinkRight"), 0.35, 0.7) },
      { kind: "emotion", label: "Mouth shut, no smile", w: 2,
        fn: h => (1 - h.ramp(h.bs("jawOpen"), 0.06, 0.25)) * (1 - h.ramp(smile(h), 0.2, 0.5)) },
    ],
  },
  {
    id: "mindblown",
    name: "Mind Blown",
    tagline: "You just learned 'abbreviation' is a long word.",
    giphy: "lXu72d4iKwqek", frame: 0.95,
    tips: ["Both hands up beside your head", "Fingers spread like it just exploded", "Jaw on the floor", "Eyes huge"],
    checks: [
      { kind: "pose", label: "Hands beside your head", w: 3, fn: h => h.twoHands(["palm", 0, 9], [...L_CHEEK, ...TEMPLES], [...R_CHEEK, ...TEMPLES], 0.35, 1.0) },
      { kind: "pose", label: "Hands raised high", w: 1.5, fn: h => h.handsAbove(159) },
      { kind: "emotion", label: "Jaw dropped", w: 2.5, fn: h => h.ramp(h.bs("jawOpen"), 0.2, 0.6) },
      { kind: "emotion", label: "Eyes wide", w: 1.5, fn: h => h.ramp(h.avg2("eyeWideLeft", "eyeWideRight"), 0.05, 0.4) },
      { kind: "emotion", label: "Brows up", w: 1, fn: h => h.ramp(browsUp(h), 0.15, 0.6) },
    ],
  },
  {
    id: "johnny",
    name: "Here's Johnny",
    tagline: "Knocking on your roommate's door at 3am.",
    giphy: "RoajqIorBfSE", frame: 0.85,
    tips: ["Get your face CLOSE to the camera", "Tilt your head", "Widest, most unhinged grin", "Eyes wide and wild"],
    checks: [
      { kind: "pose", label: "Face close to camera", w: 1.5, fn: h => h.ramp(h.faceSize(), 0.22, 0.4) },
      { kind: "pose", label: "Head tilt", w: 1.5, fn: h => h.ramp(Math.abs(h.roll()), 4, 15) },
      { kind: "emotion", label: "Unhinged grin", w: 3, fn: h => h.ramp(smile(h), 0.3, 0.8) },
      { kind: "emotion", label: "Teeth out", w: 1, fn: h => h.ramp(h.bs("jawOpen"), 0.08, 0.35) },
      { kind: "emotion", label: "Wild eyes", w: 1.5, fn: h => h.ramp(Math.max(h.avg2("eyeWideLeft", "eyeWideRight"), browsUp(h) * 0.8), 0.08, 0.45) },
    ],
  },
  {
    id: "nooo",
    name: "NO. GOD. PLEASE. NO.",
    tagline: "The wifi dies during the final boss.",
    giphy: "vyTnNTrs3wqQ0UIvwE", frame: 0.45,
    tips: ["Hands down", "Throw your head to one side", "Mouth open in a full scream", "Eyes squeezed shut"],
    checks: [
      handsAway,
      { kind: "pose", label: "Head thrown sideways", w: 1.5, fn: h => h.ramp(Math.abs(h.roll()) + Math.abs(h.yaw()) * 40, 5, 18) },
      { kind: "emotion", label: "Full scream", w: 3, fn: h => h.ramp(h.bs("jawOpen"), 0.3, 0.75) },
      { kind: "emotion", label: "Eyes squeezed shut", w: 2,
        fn: h => h.ramp(Math.max(h.avg2("eyeBlinkLeft", "eyeBlinkRight"), h.avg2("eyeSquintLeft", "eyeSquintRight")), 0.3, 0.75) },
      { kind: "emotion", label: "Anguished brows", w: 1, fn: h => h.ramp(Math.max(h.bs("browInnerUp"), h.avg2("browDownLeft", "browDownRight")), 0.1, 0.5) },
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
