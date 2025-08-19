/* global THREE */
// Wrap everything to avoid globals leaking
(function () {
  const canvas = document.getElementById("scene");
  const mouse = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();

  // --- Renderer ---
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  if ('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding;

  // --- Scene & Camera ---
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05070f, 0.0015);

  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    5000
  );
  camera.position.set(0, 45, 110);

  // Minimal fallback OrbitControls if examples script fails to load
  class BasicOrbitControls {
    constructor(object, domElement){
      this.object = object;
      this.domElement = domElement;
      this.target = new THREE.Vector3();
      this.enableDamping = true;
      this.dampingFactor = 0.05;
      this.minDistance = 5;
      this.maxDistance = 800;

      this._spherical = new THREE.Spherical();
      this._spherical.setFromVector3(this.object.position.clone().sub(this.target));
      this._rotateSpeed = 0.0025;
      this._panSpeed = 0.0025;
      this._zoomScale = 1.0;
      this._deltaTheta = 0;
      this._deltaPhi = 0;
      this._panOffset = new THREE.Vector3();

      this._state = 'none'; // 'rotate' | 'pan' | 'none'
      this._pointer = new THREE.Vector2();

      this._onPointerDown = (e) => {
        e.preventDefault();
        this.domElement.setPointerCapture(e.pointerId || 1);
        if (e.button === 2 || (e.button === 0 && e.ctrlKey)) this._state = 'pan';
        else this._state = 'rotate';
        this._pointer.set(e.clientX, e.clientY);
      };
      this._onPointerMove = (e) => {
        if (this._state === 'none') return;
        const dx = e.clientX - this._pointer.x;
        const dy = e.clientY - this._pointer.y;
        this._pointer.set(e.clientX, e.clientY);
        if (this._state === 'rotate') {
          this._deltaTheta -= dx * this._rotateSpeed;
          this._deltaPhi   -= dy * this._rotateSpeed;
        } else if (this._state === 'pan') {
          // Pan parallel to screen
          const offset = new THREE.Vector3();
          offset.copy(this.object.position).sub(this.target);
          const targetDistance = offset.length();
          const panX = (-dx * this._panSpeed) * (targetDistance / 50);
          const panY = (dy * this._panSpeed) * (targetDistance / 50);
          const te = this.object.matrix.elements;
          const xAxis = new THREE.Vector3(te[0], te[1], te[2]);
          const yAxis = new THREE.Vector3(te[4], te[5], te[6]);
          xAxis.multiplyScalar(panX);
          yAxis.multiplyScalar(panY);
          this._panOffset.add(xAxis).add(yAxis);
        }
      };
      this._onPointerUp = (e) => {
        this._state = 'none';
        try { this.domElement.releasePointerCapture(e.pointerId || 1); } catch(_){}
      };
      this._onWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 1.05 : 0.95;
        this._zoomScale *= delta;
      };

      domElement.addEventListener('pointerdown', this._onPointerDown);
      domElement.addEventListener('pointermove', this._onPointerMove);
      domElement.addEventListener('pointerup', this._onPointerUp);
      domElement.addEventListener('wheel', this._onWheel, { passive: false });
    }
    update(){
      // Apply zoom
      const offset = new THREE.Vector3().copy(this.object.position).sub(this.target);
      const radius = offset.length() * this._zoomScale;
      this._zoomScale = 1.0;

      // Apply rotation
      this._spherical.setFromVector3(offset);
      this._spherical.theta += this._deltaTheta;
      this._spherical.phi += this._deltaPhi;
      const EPS = 1e-6;
      this._spherical.phi = Math.max(EPS, Math.min(Math.PI - EPS, this._spherical.phi));
      this._spherical.radius = THREE.MathUtils.clamp(radius, this.minDistance, this.maxDistance);

      // Damping on deltas
      if (this.enableDamping) {
        this._deltaTheta *= (1 - this.dampingFactor);
        this._deltaPhi   *= (1 - this.dampingFactor);
        this._panOffset.multiplyScalar(1 - this.dampingFactor);
      } else {
        this._deltaTheta = 0;
        this._deltaPhi = 0;
        this._panOffset.set(0,0,0);
      }

      // Apply pan to target
      this.target.add(this._panOffset);

      // Compute new camera position
      const newPos = new THREE.Vector3().setFromSpherical(this._spherical).add(this.target);
      this.object.position.copy(newPos);
      this.object.lookAt(this.target);
    }
  }

  // Controls (support both global attachment styles)
  var ControlsCtor = (window.THREE && THREE.OrbitControls) ? THREE.OrbitControls
                    : (window.OrbitControls || null);
  if (!ControlsCtor) {
    console.warn("OrbitControls script not loaded. Using BasicOrbitControls fallback.");
  }
  const controls = ControlsCtor ? new ControlsCtor(camera, renderer.domElement) : new BasicOrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 5;
  controls.maxDistance = 800;

  // Lights
  const sunLight = new THREE.PointLight(0xffffff, 2, 0, 2);
  sunLight.position.set(0, 0, 0);
  scene.add(sunLight);

  const ambient = new THREE.AmbientLight(0x22334a, 0.6);
  scene.add(ambient);

  // --- Starfield background ---
  (function makeStars() {
    const starGeo = new THREE.BufferGeometry();
    const starCount = 3000;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 1000 * (0.8 + 0.2 * Math.random());
      const u = Math.random();
      const v = Math.random();
      const theta = Math.acos(2 * u - 1);
      const phi = 2 * Math.PI * v;
      starPos[i * 3 + 0] = r * Math.sin(theta) * Math.cos(phi);
      starPos[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi);
      starPos[i * 3 + 2] = r * Math.cos(theta);
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x9db5ff,
      size: 1.2,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);
  })();

  // ======================= SOLAR SYSTEM =======================
  const solarGroup = new THREE.Group();
  scene.add(solarGroup);

  // Sun
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(5, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0xffe08a })
  );
  solarGroup.add(sun);

  // Planets (stylized)
  const planetsData = [
    { name: "Mercury", radius: 0.25, dist: 9,  color: 0xb1b1b1, periodDays: 88,    au: 0.39, desc: "Smallest planet; no atmosphere to speak of." },
    { name: "Venus",   radius: 0.40, dist: 12, color: 0xffd7a8, periodDays: 225,   au: 0.72, desc: "Runaway greenhouse; hottest surface." },
    { name: "Earth",   radius: 0.42, dist: 15, color: 0x6bb6ff, periodDays: 365,   au: 1.00, desc: "Our home; liquid water and life." },
    { name: "Mars",    radius: 0.32, dist: 18, color: 0xff9b6b, periodDays: 687,   au: 1.52, desc: "The red planet; thin CO₂ atmosphere." },
    { name: "Jupiter", radius: 1.10, dist: 24, color: 0xf0e0b6, periodDays: 4331,  au: 5.20, desc: "Gas giant; Great Red Spot storm." },
    { name: "Saturn",  radius: 0.95, dist: 30, color: 0xf1e5c6, periodDays: 10747, au: 9.58, desc: "Spectacular ring system (stylized here)." , hasRing: true },
    { name: "Uranus",  radius: 0.60, dist: 36, color: 0xa6e7ff, periodDays: 30589, au: 19.2, desc: "Ice giant; tipped on its side." },
    { name: "Neptune", radius: 0.58, dist: 42, color: 0x84a7ff, periodDays: 59800, au: 30.1, desc: "Farthest planet; supersonic winds." },
  ];

  // Maximum orbital radius (for framing)
  const SOLAR_MAX_DIST = Math.max.apply(null, planetsData.map(p => p.dist));

  const orbitLines = [];
  const labels = [];
  const planets = [];
  const selectables = [];

  function makeLabel(text, scale = 0.1) {
    const padding = 6, fontSize = 36;
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d");
    ctx.font = `${fontSize}px system-ui, -apple-system, Segoe UI, Roboto`;
    const w = Math.ceil(ctx.measureText(text).width + padding * 2);
    const h = fontSize + padding * 2;
    c.width = w; c.height = h;
    const ctx2 = c.getContext("2d");
    ctx2.font = `${fontSize}px system-ui, -apple-system, Segoe UI, Roboto`;
    ctx2.fillStyle = "rgba(0,0,0,.45)";
    ctx2.fillRect(0, 0, w, h);
    ctx2.fillStyle = "#eaf3ff";
    ctx2.fillText(text, padding, fontSize + padding - 8);
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const spr = new THREE.Sprite(mat);
    const unit = scale * 0.03;
    spr.userData.label = { w, h, unit };
    spr.scale.set(w * unit, h * unit, 1);
    return spr;
  }

  planetsData.forEach((p) => {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(p.radius, 32, 32),
      new THREE.MeshStandardMaterial({ color: p.color, metalness: 0.1, roughness: 0.8 })
    );
    mesh.userData = {
      dist: p.dist, periodDays: p.periodDays, name: p.name, theta: Math.random() * Math.PI * 2
    };
    mesh.userData.meta = p;
    solarGroup.add(mesh);
    planets.push(mesh);

    // Orbit
    const circle = new THREE.EllipseCurve(0, 0, p.dist, p.dist, 0, Math.PI * 2, false, 0);
    const points = circle.getPoints(256).map(pt => new THREE.Vector3(pt.x, 0, pt.y));
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(points);
    const orbitMat = new THREE.LineBasicMaterial({ color: 0x355079, transparent: true, opacity: 0.6 });
    const orbit = new THREE.LineLoop(orbitGeo, orbitMat);
    solarGroup.add(orbit);
    orbitLines.push(orbit);

    // Label
    const label = makeLabel(p.name);
    label.position.set(p.dist, p.radius * 2.2, 0);
    solarGroup.add(label);
    labels.push(label);

    // Saturn ring
    if (p.hasRing) {
      const ringGeo = new THREE.RingGeometry(p.radius * 1.3, p.radius * 2.2, 64);
      const ringCanvas = document.createElement("canvas");
      ringCanvas.width = 256; ringCanvas.height = 8;
      const g = ringCanvas.getContext("2d");
      const grad = g.createLinearGradient(0, 0, 256, 0);
      grad.addColorStop(0, "rgba(255,255,255,0)");
      grad.addColorStop(0.5, "rgba(255,255,255,.6)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grad; g.fillRect(0, 0, 256, 8);
      const ringTex = new THREE.CanvasTexture(ringCanvas);
      ringTex.wrapS = ringTex.wrapT = THREE.RepeatWrapping; ringTex.repeat.set(8, 1);
      const ringMat = new THREE.MeshBasicMaterial({ map: ringTex, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2.4;
      mesh.add(ring);
    }
    selectables.push(mesh);
  });

  // ======================= MILKY WAY (stylized) =======================
  const galaxyGroup = new THREE.Group();
  galaxyGroup.visible = false;
  scene.add(galaxyGroup);

  const ARMS = 4, STARS = 14000, R_MAX = 160, THICK = 2.8;
  let galaxyRotationSpeed = 0.005; // radians per second
  let galaxyAutoRotate = true;
  let starBrightness = 0.9; // 0..1 multiplier
  let galaxyPoints = null;
  (function makeGalaxy() {
    const gPos = new Float32Array(STARS * 3);
    const gCol = new Float32Array(STARS * 3);
    for (let i = 0; i < STARS; i++) {
      const arm = i % ARMS;
      const armAngle = (arm / ARMS) * Math.PI * 2;
      const t = Math.random() * 6.4 * Math.PI;
      const radius = THREE.MathUtils.mapLinear(Math.pow(Math.random(), 0.6), 0, 1, 1.5, R_MAX);
      const twist = t * 0.20;
      const angle = armAngle + t + twist;
      const spread = THREE.MathUtils.mapLinear(radius, 0, R_MAX, 1.0, 4.0);
      const x = Math.cos(angle) * radius + THREE.MathUtils.randFloatSpread(spread);
      const y = THREE.MathUtils.randFloatSpread(THICK);
      const z = Math.sin(angle) * radius + THREE.MathUtils.randFloatSpread(spread);
      gPos[i * 3 + 0] = x; gPos[i * 3 + 1] = y; gPos[i * 3 + 2] = z;

      const coreMix = 1 - Math.min(radius / R_MAX, 1);
      gCol[i * 3 + 0] = (0.95 * coreMix + 0.3 * (1 - coreMix));
      gCol[i * 3 + 1] = (0.85 * coreMix + 0.5 * (1 - coreMix));
      gCol[i * 3 + 2] = (0.70 * coreMix + 1.0 * (1 - coreMix));
    }
    const gGeo = new THREE.BufferGeometry();
    gGeo.setAttribute("position", new THREE.BufferAttribute(gPos, 3));
    gGeo.setAttribute("color", new THREE.BufferAttribute(gCol, 3));
    const gMat = new THREE.PointsMaterial({ size: 0.9, vertexColors: true, transparent: true, opacity: starBrightness });
    const galaxy = new THREE.Points(gGeo, gMat);
    galaxyGroup.add(galaxy);
    galaxyPoints = galaxy;
  })();

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(6, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xfff2c6 })
  );
  galaxyGroup.add(core);

  // Add a soft glow around the galactic core (sprite-based halo)
  (function addCoreGlow(){
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(128,128,10, 128,128,120);
    grad.addColorStop(0, 'rgba(255,242,198,0.55)');
    grad.addColorStop(0.6, 'rgba(255,220,160,0.22)');
    grad.addColorStop(1, 'rgba(255,200,140,0)');
    g.fillStyle = grad; g.beginPath(); g.arc(128,128,120,0,Math.PI*2); g.fill();
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: tex, depthWrite:false, transparent:true, opacity: 0.9, color: 0xffffff });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(50, 50, 1);
    core.add(sprite);
  })();

  // Sun marker in the Orion Spur (stylized)
  const sunMilky = new THREE.Mesh(
    new THREE.SphereGeometry(2, 20, 20),
    new THREE.MeshBasicMaterial({ color: 0x6bb6ff })
  );
  const sunGalRadius = 82 * (R_MAX / 160);
  const sunGalAngle = Math.PI * 1.7;
  sunMilky.position.set(Math.cos(sunGalAngle) * sunGalRadius, 0.6, Math.sin(sunGalAngle) * sunGalRadius);
  galaxyGroup.add(sunMilky);

  const sunMilkyLabel = makeLabel("Sun (Orion Spur)");
  sunMilkyLabel.position.copy(sunMilky.position).add(new THREE.Vector3(4, 4, 0));
  galaxyGroup.add(sunMilkyLabel);

  const centerLabel = makeLabel("Galactic Center");
  centerLabel.position.set(8, 6, 0);
  galaxyGroup.add(centerLabel);

  // Keep labels legible by scaling with camera distance
  function updateAllLabelScales(){
    const tmp = new THREE.Vector3();
    const resize = (spr) => {
      if (!spr || !spr.userData || !spr.userData.label) return;
      spr.getWorldPosition(tmp);
      const d = camera.position.distanceTo(tmp);
      const factor = THREE.MathUtils.clamp((260 / d) * labelSizeMultiplier, 0.4, 8.0);
      const { w, h, unit } = spr.userData.label;
      spr.scale.set(w * unit * factor, h * unit * factor, 1);
    };
    for (let i = 0; i < labels.length; i++) resize(labels[i]);
    resize(sunMilkyLabel);
    resize(centerLabel);
  }

  // Selection / focus handling
  let focused = "Sun";
  let camLerp = 0;
  let camFromPos = new THREE.Vector3();
  let camToPos = new THREE.Vector3();
  let targetFrom = new THREE.Vector3();
  let targetTo = new THREE.Vector3(0,0,0);
  const CAM_TIME = 0.9; // seconds

  // ======================= UI =======================
  const elSpeed = document.getElementById("speed") || null;
  const elSpeedVal = document.getElementById("speedVal") || null;
  const elShowOrbits = document.getElementById("showOrbits") || null;
  const elShowLabels = document.getElementById("showLabels") || null;
  const btnSolar = document.getElementById("btnSolar") || null;
  const btnGalaxy = document.getElementById("btnGalaxy") || null;
  const modePill = document.getElementById("modePill") || null;
  const legendTitle = document.getElementById("legendTitle") || null;
  const legendList = document.getElementById("legendList") || null;
  const resetView = document.getElementById("resetView") || null;

  const focusSelect = document.getElementById("focusSelect") || null;
  const followSelection = document.getElementById("followSelection") || null;
  const btnPlay = document.getElementById("btnPlay") || null;
  const btnTour = document.getElementById("btnTour") || null;

  // Galaxy controls
  const uiRoot = document.getElementById("ui") || null;
  const galaxyFocus = document.getElementById("galaxyFocus") || null;
  const galaxyAutoRotateEl = document.getElementById("galaxyAutoRotate") || null;
  const galaxySpin = document.getElementById("galaxySpin") || null;
  const galaxySpinVal = document.getElementById("galaxySpinVal") || null;
  const starBrightnessEl = document.getElementById("starBrightness") || null;
  const starBrightnessVal = document.getElementById("starBrightnessVal") || null;
  // Label size control
  const labelScaleEl = document.getElementById("labelScale") || null;
  const labelScaleVal = document.getElementById("labelScaleVal") || null;
  let labelSizeMultiplier = labelScaleEl ? (parseInt(labelScaleEl.value, 10) / 100) : 1.6;

  // Safe defaults if some controls don't exist in the HTML
  let timeSpeed = elSpeed ? parseInt(elSpeed.value, 10) : 40;
  const showOrbitsDefault = elShowOrbits ? !!elShowOrbits.checked : true;
  const showLabelsDefault = elShowLabels ? !!elShowLabels.checked : true;

  if (elSpeed) {
    elSpeed.addEventListener("input", () => {
      timeSpeed = parseInt(elSpeed.value, 10) || 0;
      if (elSpeedVal) elSpeedVal.textContent = "× " + timeSpeed;
    });
    if (elSpeedVal) elSpeedVal.textContent = "× " + timeSpeed;
  }

  if (elShowOrbits) {
    elShowOrbits.addEventListener("change", () => {
      orbitLines.forEach((l) => (l.visible = elShowOrbits.checked));
    });
  }

  if (elShowLabels) {
    elShowLabels.addEventListener("change", () => {
      const vis = !!elShowLabels.checked;
      labels.forEach((l) => (l.visible = vis));
      if (sunMilkyLabel) sunMilkyLabel.visible = vis;
      if (centerLabel) centerLabel.visible = vis;
    });
  }

  if (btnSolar) btnSolar.addEventListener("click", () => setMode("solar"));
  if (btnGalaxy) btnGalaxy.addEventListener("click", () => setMode("galaxy"));
  if (resetView) {
    resetView.addEventListener("click", () =>
      mode === "solar" ? resetSolarView() : resetGalaxyView()
    );
  }

  let playing = true;
  if (btnPlay) {
    btnPlay.addEventListener("click", () => {
      playing = !playing;
      btnPlay.textContent = playing ? "⏸ Pause" : "▶ Play";
    });
  }
  if (focusSelect) {
    focusSelect.addEventListener("change", () => {
      focusOn(focusSelect.value);
    });
  }
  let tourTimer = 0, tourIndex = 0, touring = false;
  const tourOrder = ["Mercury","Venus","Earth","Mars","Jupiter","Saturn","Uranus","Neptune"];
  if (btnTour) {
    btnTour.addEventListener("click", () => {
      touring = !touring;
      tourIndex = 0;
      btnTour.textContent = touring ? "Stop tour" : "Auto tour";
      if (touring) focusOn(tourOrder[tourIndex]);
    });
  }

  // Galaxy UI bindings
  if (galaxyFocus) {
    galaxyFocus.addEventListener('change', () => {
      const v = galaxyFocus.value;
      if (v === 'core') focusGalaxyCenter();
      else if (v === 'sun') focusGalaxySun();
      else resetGalaxyView();
    });
  }
  if (galaxyAutoRotateEl) {
    galaxyAutoRotateEl.addEventListener('change', () => {
      galaxyAutoRotate = !!galaxyAutoRotateEl.checked;
    });
    galaxyAutoRotate = !!galaxyAutoRotateEl.checked;
  }
  if (galaxySpin) {
    const setSpinLabel = () => {
      if (galaxySpinVal) galaxySpinVal.textContent = `× ${(galaxyRotationSpeed / 0.01).toFixed(1)}`;
    };
    galaxySpin.addEventListener('input', () => {
      const v = parseInt(galaxySpin.value, 10); // 0..20
      galaxyRotationSpeed = (v / 20) * 0.02; // 0..0.02
      setSpinLabel();
    });
    setSpinLabel();
  }
  if (starBrightnessEl) {
    const applyBrightness = () => {
      const pct = parseInt(starBrightnessEl.value, 10); // 30..130
      starBrightness = THREE.MathUtils.clamp(pct / 100, 0.3, 1.3);
      if (galaxyPoints && galaxyPoints.material) {
        galaxyPoints.material.opacity = Math.min(1.0, starBrightness);
        galaxyPoints.material.needsUpdate = true;
      }
      if (starBrightnessVal) starBrightnessVal.textContent = `${parseInt(starBrightnessEl.value, 10)}%`;
    };
    starBrightnessEl.addEventListener('input', applyBrightness);
    applyBrightness();
  }
  if (labelScaleEl) {
    const applyLabelScale = () => {
      const pct = parseInt(labelScaleEl.value, 10);
      labelSizeMultiplier = THREE.MathUtils.clamp(pct / 100, 0.5, 3.0);
      if (labelScaleVal) labelScaleVal.textContent = `${pct}%`;
    };
    labelScaleEl.addEventListener('input', () => {
      applyLabelScale();
      updateAllLabelScales();
    });
    applyLabelScale();
  }

  // Info panel updater
  const infoPanel = document.getElementById("infoPanel");
  const infoTitle = document.getElementById("infoTitle");
  function setInfoFor(name, meta) {
    if (!infoPanel) return;
    infoTitle.textContent = name;
    const body = infoPanel.querySelector(".info-body");
    if (name === "Sun" || !meta) {
      body.innerHTML = `
        <div><b>Type:</b> G‑type main-sequence star</div>
        <div><b>Distance from Sun:</b> —</div>
        <div><b>Orbital period:</b> —</div>
        <div class="hint">Tip: click a planet or use the Focus dropdown</div>
      `;
    } else {
      body.innerHTML = `
        <div><b>Distance from Sun:</b> ${meta.au} AU (stylized distance in scene)</div>
        <div><b>Orbital period:</b> ~${meta.periodDays.toLocaleString()} days</div>
        <div>${meta.desc}</div>
      `;
    }
  }
  setInfoFor("Sun");

  function findPlanetByName(name){
    return planets.find(m => m.userData && m.userData.name === name) || null;
  }

  function focusOn(name){
    focused = name;
    // highlight orbit
    orbitLines.forEach((line, i) => {
      const on = (planetsData[i].name === name);
      line.material.opacity = on ? 0.95 : 0.25;
      line.material.color.setHex(on ? 0xaad4ff : 0x355079);
      line.material.needsUpdate = true;
    });

    const meta = planetsData.find(p => p.name === name);
    setInfoFor(name, meta);

    camLerp = 0;
    camFromPos.copy(camera.position);
    targetFrom.copy(controls.target);

    if (name === "Sun") {
      targetTo.set(0,0,0);
      // distance based on framing radius
      const radius = (SOLAR_MAX_DIST + 4) * 1.08;
      const vFOV = THREE.MathUtils.degToRad(camera.fov);
      const aspect = renderer.domElement.clientWidth / renderer.domElement.clientHeight;
      const distV = radius / Math.tan(vFOV / 2);
      const hFOV = 2 * Math.atan(Math.tan(vFOV / 2) * aspect);
      const distH = radius / Math.tan(hFOV / 2);
      const dist = Math.max(distV, distH);
      camToPos.set(0, radius * 0.55, dist);
    } else {
      const mesh = findPlanetByName(name);
      if (mesh) {
        // position camera offset from planet, looking at it
        targetTo.copy(mesh.position);
        const back = new THREE.Vector3().copy(mesh.position).normalize().multiplyScalar(6 + mesh.geometry.parameters.radius * 8);
        camToPos.copy(mesh.position).add(new THREE.Vector3(0.6, 0.6, 0.6).multiplyScalar(6)).add(back);
      }
    }
  }

  // Galaxy focus helpers
  function focusGalaxyCenter(){
    camLerp = 0; camFromPos.copy(camera.position); targetFrom.copy(controls.target);
    targetTo.set(0,0,0);
    camToPos.set(0, 60, 160);
  }
  function focusGalaxySun(){
    camLerp = 0; camFromPos.copy(camera.position); targetFrom.copy(controls.target);
    if (sunMilky) {
      targetTo.copy(sunMilky.position);
      camToPos.copy(sunMilky.position).add(new THREE.Vector3(0, 24, 60));
    } else {
      focusGalaxyCenter();
    }
  }

  // Pointer picking
  function onPointerDown(evt){
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(selectables, false);
    if (hits.length) {
      const mesh = hits[0].object;
      const name = mesh.userData && mesh.userData.name;
      if (name) {
        if (focusSelect) focusSelect.value = name;
        focusOn(name);
      }
    }
  }
  renderer.domElement.addEventListener("pointerdown", onPointerDown);

  // ======================= ANIMATION =======================
  let last = performance.now();
  function animate(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    sun.rotation.y += dt * 0.15;

    // Advance orbits (respect play/pause)
    if (playing) {
      const day = dt * timeSpeed;
      for (let i = 0; i < planets.length; i++) {
        const m = planets[i];
        m.userData.theta += ((2 * Math.PI) / m.userData.periodDays) * day;
        const x = Math.cos(m.userData.theta) * m.userData.dist;
        const z = Math.sin(m.userData.theta) * m.userData.dist;
        m.position.set(x, 0, z);
        const lbl = labels[i];
        lbl.position.set(x, m.geometry.parameters.radius * 2.2, z);
      }
    }

    if (touring) {
      tourTimer += dt;
      if (tourTimer > 3.5) {
        tourTimer = 0;
        tourIndex = (tourIndex + 1) % tourOrder.length;
        const name = tourOrder[tourIndex];
        if (focusSelect) focusSelect.value = name;
        focusOn(name);
      }
    }

    if (galaxyGroup.visible) {
      if (galaxyAutoRotate) galaxyGroup.rotation.y += dt * galaxyRotationSpeed;
    }

    // Camera tween towards target
    if (camLerp < CAM_TIME) {
      camLerp = Math.min(CAM_TIME, camLerp + dt);
      const t = camLerp / CAM_TIME;
      camera.position.lerpVectors(camFromPos, camToPos, t);
      if (!followSelection || (followSelection && followSelection.checked)) {
        controls.target.lerpVectors(targetFrom, targetTo, t);
      }
    }

    updateAllLabelScales();

    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);

  // Resize handling
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Start in Solar mode
  let mode = "solar";
  function setMode(next) {
    mode = next;
    const solar = mode === "solar";
    solarGroup.visible = solar;
    galaxyGroup.visible = !solar;
    if (modePill) modePill.textContent = solar ? "Solar System" : "Milky Way";
    if (btnSolar) btnSolar.classList.toggle("active", solar);
    if (btnGalaxy) btnGalaxy.classList.toggle("active", !solar);
    if (uiRoot) uiRoot.setAttribute('data-mode', solar ? 'solar' : 'galaxy');

    if (solar) {
      camera.near = 0.1; camera.far = 5000; camera.updateProjectionMatrix();
      controls.minDistance = 5; controls.maxDistance = 800;
      if (legendTitle) legendTitle.textContent = "Solar System quick facts";
      if (legendList) legendList.innerHTML = `
        <li>Sizes & distances are <b>not to scale</b>.</li>
        <li>Earth ~365 days; Neptune ~165 years.</li>
        <li>Saturn ring stylized; orbits as guides.</li>`;
      // Refresh info panel for Solar mode
      if (infoPanel) {
        const body = infoPanel.querySelector('.info-body');
        if (infoTitle) infoTitle.textContent = 'Sun';
        if (body) body.innerHTML = `
          <div><b>Type:</b> G‑type main-sequence star</div>
          <div><b>Distance from Sun:</b> —</div>
          <div><b>Orbital period:</b> —</div>
          <div class="hint">Tip: click a planet or use the Focus dropdown</div>
        `;
      }
      resetSolarView();
    } else {
      camera.near = 0.1; camera.far = 8000; camera.updateProjectionMatrix();
      controls.minDistance = 30; controls.maxDistance = 3000;
      if (legendTitle) legendTitle.textContent = "Milky Way quick facts (stylized)";
      if (legendList) legendList.innerHTML = `
        <li>Spiral arms approximated with a point cloud.</li>
        <li>Sun is in the <b>Orion Spur</b>, ~27,000 ly from center.</li>
        <li>Disk ~100,000 ly across; thin but wide.</li>`;
      // Refresh info panel for Galaxy mode
      if (infoPanel) {
        const body = infoPanel.querySelector('.info-body');
        if (infoTitle) infoTitle.textContent = 'Milky Way';
        if (body) body.innerHTML = `
          <div><b>Structure:</b> Barred spiral with multiple arms</div>
          <div><b>Our location:</b> Orion Spur, ~27,000 ly from center</div>
          <div><b>Disk size:</b> ~100,000 light‑years across</div>
          <div class="hint">Use Focus to jump to the Core, the Sun’s neighborhood, or a wide view. Adjust spin/brightness above.</div>
        `;
      }
      resetGalaxyView();
      if (galaxyFocus) galaxyFocus.value = 'wide';
    }
  }

  // Compute a camera position that frames the whole solar system orbits nicely
  function frameSolarSystem(padding = 1.08) {
    const radius = (SOLAR_MAX_DIST + 4) * padding; // margin for labels/rings
    const vFOV = THREE.MathUtils.degToRad(camera.fov);
    const aspect = renderer.domElement.clientWidth / renderer.domElement.clientHeight;

    const distV = radius / Math.tan(vFOV / 2);
    const hFOV = 2 * Math.atan(Math.tan(vFOV / 2) * aspect);
    const distH = radius / Math.tan(hFOV / 2);
    const dist = Math.max(distV, distH);

    camera.position.set(0, radius * 0.55, dist);
    controls.target.set(0, 0, 0);
    controls.update();
  }

  function resetSolarView(){
    frameSolarSystem();
  }
  function resetGalaxyView() {
    camera.position.set(0, 120, 280);
    controls.target.set(0, 0, 0);
    controls.update();
  }

  // Init UI visibility states
  orbitLines.forEach((l) => (l.visible = showOrbitsDefault));
  labels.forEach((l) => (l.visible = showLabelsDefault));
  if (typeof sunMilkyLabel !== "undefined" && sunMilkyLabel) sunMilkyLabel.visible = showLabelsDefault;
  if (typeof centerLabel !== "undefined" && centerLabel) centerLabel.visible = showLabelsDefault;

  setMode("solar");
  focusOn("Sun");
})();