# Meme Mirror

Recreate unhinged meme faces with your webcam and get scored on how close you got.

Five levels. Each one shows a static reaction image. Hit **Snap**, you get a 3-second countdown to get into character, then the game grabs your best frame during a short "HOLD IT!" window and scores it on:

- **Pose**: where your head and hands are (hand on chin, palms on cheeks, finger on temple…)
- **Emotion**: what your face is actually doing (pursed lips, side-eye, jaw drop, one raised eyebrow…)

At the end you get a total out of 500, a rank, and a downloadable side-by-side card of all five attempts.

## Levels

There are 11 memes in the pool, and each game picks 5 at random (`ROUNDS` in `levels.js`).

| Meme | Source | What it checks |
|------|--------|----------------|
| The Hmm Monkey | local image | hand on chin, pursed lips, suspicious eyes, no smile |
| The Side-Eye | original cartoon | head forward, eyes to one side, pressed lips, judgy brows |
| Internal Screaming | GIPHY (Home Alone) | both palms on cheeks, jaw wide open, brows up, eyes wide |
| Big Brain Temple Tap | GIPHY | finger on temple, head tilt, smug smirk, squint |
| Captain's Facepalm | GIPHY (Star Trek) | both hands over face, eyes closed, defeated mouth |
| Confused Nick Young | GIPHY | head tilt, baffled grin, brows up |
| Kombucha Disgust | GIPHY | nose wrinkle, squeezed eyes, twisted mouth |
| Wait, What? Blink | GIPHY | head turned, brows lifted, mouth shut |
| Mind Blown | GIPHY (Tim and Eric) | hands up beside head, jaw dropped, eyes wide |
| Here's Johnny | GIPHY (The Shining) | face close to camera, head tilt, unhinged grin, wild eyes |
| NO. GOD. PLEASE. NO. | GIPHY (The Office) | head thrown sideways, full scream, eyes shut |

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

## GIFs come from GIPHY (nothing copyrighted is stored here)

GIF levels are linked from GIPHY, not copied into this repo. Each card credits and links its GIPHY page, and the site shows "Powered by GIPHY".

- **API key:** put a free key from [developers.giphy.com](https://developers.giphy.com/dashboard/) in `config.js`. The game then looks GIFs up through the official API, which GIPHY's terms expect for apps. Without a key it falls back to GIPHY's direct media links, which is fine for testing.
- **The pose frame:** `frame: 0.76` means "the pose is 76% of the way through the GIF". The game pulls that frame in the browser (via `ImageDecoder`) for the result screen and the share card. Browsers without `ImageDecoder` (Safari) use the GIF's first frame there instead.
- **Rights:** the clips belong to their rights holders. GIPHY is the licensed route for showing them; if a rights holder asks for one to be removed, delete that level.

To add a GIPHY meme, copy the ID from the end of its giphy.com URL:

```js
{
  id: "mine",
  name: "My Unhinged Meme",
  tagline: "When the wifi drops mid-ranked match.",
  giphy: "AbC123xyz",   // from https://giphy.com/gifs/some-name-AbC123xyz
  frame: 0.6,           // where in the GIF the pose is
  tips: ["Both hands on head", "Mouth open"],
  checks: [
    { kind: "pose", label: "Hands on head", w: 3, fn: h => h.near(h.handTo(["palm"], [10]), 0.3, 0.8) },
    { kind: "emotion", label: "Mouth open", w: 2, fn: h => h.ramp(h.bs("jawOpen"), 0.2, 0.6) },
  ],
},
```

## Add your own memes

Use images you made or have rights to: drop one in `assets/` and set `img: "assets/my-meme.png"` instead of `giphy`. Everything else is the same as the example above.
