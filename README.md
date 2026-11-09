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
| 3 | Internal Screaming (Home Alone GIF) | both palms on cheeks, jaw wide open, brows up, eyes wide |
| 4 | Big Brain Smirk (temple-tap GIF) | finger on temple, head tilt, smug smirk, squint |
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

## Stored GIFs

`assets/gifs/` holds downloaded GIFs plus one still frame from each. The level card plays the GIF; scoring compares against the still pose, and the share card uses the still.

| File | Source |
|------|--------|
| `home-alone-scream.gif` | [GIPHY d2YWTOsVtuHgOHhC](https://giphy.com/gifs/homealone-90s-home-alone-d2YWTOsVtuHgOHhC) |
| `temple-tap.gif` | [GIPHY LqghYqYPnGt65WpMI1](https://giphy.com/gifs/draftkings-roll-safe-you-see-tapping-head-LqghYqYPnGt65WpMI1) |

These clips belong to their rights holders. Fine for a private repo or playing with friends; think twice before publishing them on a public site.

To add a stored GIF to a level, set `gif:` (what the card plays) and `img:` (the still frame used for scoring):

```js
img: "assets/gifs/my-meme-still.jpg",
gif: "assets/gifs/my-meme.gif",
```

## Use existing GIFs from GIPHY

Find the meme on giphy.com, copy its page URL, and use the `giphy()` helper in `levels.js`:

```js
{
  ...giphy("https://giphy.com/gifs/whatever-it-is-AbC123xyz"),   // or just the ID
  id: "sideeye",
  name: "The Side-Eye",
  // tips, checks… as usual
},
```

This loads the GIF from GIPHY's servers (nothing is copied into the repo) and shows a "via GIPHY" link on the card. Pass `{ still: true }` to use GIPHY's frozen first frame instead of the animation.

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
