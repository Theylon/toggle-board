# Toggle board

Three two-state toggles:
- **AI**
- **Crypto**
- **War in the Middle East**

Rule: at most **two** can be set to **WE’RE SO BACK** at the same time (turning a third on flips the oldest “back” to **IT’S OVER**).

## Pepe asset

The UI uses:
- `assets/pepe.mp4` for “scrubbing” the animation forward/back based on toggle position
- `assets/pepe.gif` as a fallback if video fails

If either is missing, the page falls back to a built-in placeholder.

## Run

- Easiest: open `index.html` in a browser.
- Or serve locally:
  - `python3 -m http.server 5173`
  - then visit `http://localhost:5173`
