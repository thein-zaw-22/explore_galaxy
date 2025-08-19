## Galaxy Visualization

An interactive Three.js experience to explore a stylized Solar System and a Milky Way point‑cloud galaxy. Includes smooth camera controls, informative UI, and adjustable visual parameters.

### Features
- Solar System mode: planets, orbits, labels, auto tour, time speed.
- Milky Way mode: spiral arms point cloud, glowing galactic core, Sun location marker.
- Camera: rotate/pan/zoom with damping (uses OrbitControls when available, falls back to built‑in BasicOrbitControls if CDN fails).
- UI controls: mode switch, focus presets, auto‑rotate, galaxy spin speed, star brightness, label visibility and size.

### Run locally
This is a static site. Serve the folder and open in your browser.

Option A: Python (built‑in on macOS)
```bash
cd /Users/theinzaw/code/Galaxy
python3 -m http.server 8001
# then open http://localhost:8001
```

Option B: Node http-server
```bash
cd /Users/theinzaw/code/Galaxy
npx --yes http-server -p 8001 -c-1 .
```

If a port is busy, use another (e.g. 8002) or free the port:
```bash
# macOS: find and kill the process using 8000
lsof -i :8000 | awk 'NR>1 {print $2}' | xargs kill -9
```

### Controls
- Rotate: left‑drag
- Pan: right‑drag or Ctrl/Cmd + left‑drag
- Zoom: mouse wheel / trackpad pinch

### UI Guide
- Mode: switch between `Solar System` and `Milky Way`.
- Focus: jump camera to Sun/planets, Galactic Center, Sun (Orion Spur), or wide view.
- Time speed (Solar): controls orbital animation rate.
- Show orbits (Solar): toggle elliptical guides.
- Show labels: toggles name sprites.
- Label size: scales label size globally (50%–300%).
- Auto‑rotate (Galaxy): toggles slow galaxy spin.
- Spin speed (Galaxy): sets rotation rate.
- Star brightness (Galaxy): adjusts point cloud opacity.
- Reset View: reframe the current mode.

### CDN notes / offline behavior
- The page attempts to load Three.js and OrbitControls from public CDNs (unpkg then jsDelivr). If OrbitControls fails, the app automatically switches to a built‑in `BasicOrbitControls` so interaction still works.
- If you’re fully offline, ensure `three.min.js` is locally available or pre‑cached; otherwise the page cannot initialize. To hard‑pin local assets, drop `three.min.js` and `OrbitControls.js` into the project and update `index.html` to reference them directly.

### File structure
- `index.html`: UI, dependency loader, and mounting canvas
- `styles.css`: glass UI styling and layout
- `app.js`: scene setup, rendering loop, modes, controls, UI wiring

### Known limitations
- Scales and distances are stylized for clarity; not to astrophysical scale.
- Galaxy is a simplified point‑cloud approximation.

### License
Educational/demo use. Three.js is © its respective authors and licensed under MIT.


