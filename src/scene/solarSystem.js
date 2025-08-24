// Solar System scene
/* global THREE */

export let solarGroup = null;
export let planetsData = [
  { name: "Mercury", radius: 0.25, dist: 9,  color: 0xb1b1b1, periodDays: 88,    au: 0.39, desc: "Smallest planet; no atmosphere to speak of." },
  { name: "Venus",   radius: 0.40, dist: 12, color: 0xffd7a8, periodDays: 225,   au: 0.72, desc: "Runaway greenhouse; hottest surface." },
  { name: "Earth",   radius: 0.42, dist: 15, color: 0x6bb6ff, periodDays: 365,   au: 1.00, desc: "Our home; liquid water and life." },
  { name: "Mars",    radius: 0.32, dist: 18, color: 0xff9b6b, periodDays: 687,   au: 1.52, desc: "The red planet; thin CO₂ atmosphere." },
  { name: "Jupiter", radius: 1.10, dist: 24, color: 0xf0e0b6, periodDays: 4331,  au: 5.20, desc: "Gas giant; Great Red Spot storm." },
  { name: "Saturn",  radius: 0.95, dist: 30, color: 0xf1e5c6, periodDays: 10747, au: 9.58, desc: "Spectacular ring system (stylized here)." , hasRing: true },
  { name: "Uranus",  radius: 0.60, dist: 36, color: 0xa6e7ff, periodDays: 30589, au: 19.2, desc: "Ice giant; tipped on its side." },
  { name: "Neptune", radius: 0.58, dist: 42, color: 0x84a7ff, periodDays: 59800, au: 30.1, desc: "Farthest planet; supersonic winds." },
];

export let SOLAR_MAX_DIST = Math.max(...planetsData.map(p => p.dist));
export let orbitLines = [];
export let labels = [];
export let planets = [];
export let selectables = [];
export let tourOrder = ["Mercury","Venus","Earth","Mars","Jupiter","Saturn","Uranus","Neptune"];

export function createSolarSystem(scene) {
  solarGroup = new THREE.Group();
  solarGroup.name = "solarGroup";
  scene.add(solarGroup);

  // Sun
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(5, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0xffe08a })
  );
  solarGroup.add(sun);

  // Maximum orbital radius (for framing)
  SOLAR_MAX_DIST = Math.max(...planetsData.map(p => p.dist));

  // Create planets, orbits and labels
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

  return {
    solarGroup,
    planetsData,
    planets,
    orbitLines,
    labels,
    selectables,
    SOLAR_MAX_DIST,
    tourOrder
  };
}

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
  tex.premultiplyAlpha = true;
  const mat = new THREE.SpriteMaterial({ 
    map: tex, 
    transparent: true,
    depthWrite: false,
    depthTest: false,
    alphaTest: 0.001
  });
  const spr = new THREE.Sprite(mat);
  const unit = scale * 0.03;
  spr.userData.label = { w, h, unit };
  spr.scale.set(w * unit, h * unit, 1);
  spr.renderOrder = 999;
  return spr;
}
