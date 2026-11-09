# Meme Mirror

Recreate unhinged meme faces with your webcam and get scored on how close you got.

Five levels. Each one shows a static reaction image. Hit **Snap**, you get a 3-second countdown to get into character, then the game grabs your best frame during a short "HOLD IT!" window and scores it on:

- **Pose**: where your head and hands are (hand on chin, palms on cheeks, finger on temple…)
- **Emotion**: what your face is actually doing (pursed lips, side-eye, jaw drop, one raised eyebrow…)

At the end you get a total out of 500, a rank, and a downloadable side-by-side card of all five attempts.

## Levels

| # | Meme | What it checks |
|---|------|----------------|
| 1 | The Hmm Monkey | hand on chin, pursed lips, suspicious eyes, no smile |
| 2 | The Side-Eye | head forward, eyes to one side, pressed lips, judgy brows |
| 3 | Internal Screaming | both palms on cheeks, jaw wide open, brows up, eyes wide |
| 4 | Big Brain Smirk | finger on temple, head tilt, one eyebrow up, lopsided smirk |
| 5 | Facepalm of Shame | palm over forehead, eyes closed, defeated mouth |

## Run it

It's a static site with no build step and no backend. Browsers only allow camera access over `https` or on `localhost`, so serve the folder rather than double-clicking `index.html`:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

Or deploy it to GitHub Pages: repo **Settings → Pages → Deploy from branch → main / root**.

## How the scoring works

Tracking runs entirely in the browser with [MediaPipe Tasks Vision](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker) (face landmarker with blendshapes + hand landmarker). No images leave the device.

Each level in `levels.js` is a list of checks. A check is a small function that returns 0–1 using helpers such as:

- `h.bs("jawOpen")`: a face blendshape score (52 of them, e.g. `mouthPucker`, `browInnerUp`, `eyeLookOutLeft`)
- `h.handTo([handPoints], [facePoints])`: closest hand-to-face distance, in face widths
- `h.yaw()`, `h.roll()`: head turn and tilt
- `h.near(d, good, bad)` and `h.ramp(v, lo, hi)`: turn raw numbers into 0–1

Pose and emotion are weighted averages of their checks; the level score is 50/50 of the two.

## Add your own memes

Drop an image or GIF into `assets/` and add an entry to `LEVELS` in `levels.js`:

```js
{
  id: "mine",
  name: "My Unhinged Meme",
  tagline: "When the wifi drops mid-ranked match.",
  img: "assets/my-meme.gif",
  tips: ["Both hands on head", "Mouth open"],
  checks: [
    { kind: "pose", label: "Hands on head", w: 3, fn: h => h.near(h.handTo(["palm"], [10]), 0.3, 0.8) },
    { kind: "emotion", label: "Mouth open", w: 2, fn: h => h.ramp(h.bs("jawOpen"), 0.2, 0.6) },
  ],
},
```

Only use images you have the rights to share if you publish the site.
