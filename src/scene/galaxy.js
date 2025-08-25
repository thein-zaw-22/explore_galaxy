// Enhanced Galaxy scene with detailed visualization
/* global THREE */

export let galaxyGroup = null;
export let galaxyRotationSpeed = 0.005; // radians per second
export let galaxyAutoRotate = true;
export let starBrightness = 0.9; // 0..1 multiplier
export let galaxyPoints = null; // Back-compat: reference arm points
export let armsPoints = null;
export let bulgePoints = null;
export let haloPoints = null;
export let sunMilky = null;
export let sunMilkyLabel = null;
export let centerLabel = null;
export let spiralArms = [];
export let armLabelsGroup = null;
export let starFormationRegions = [];
export let dustLanes = null;
export let galacticHalo = null;
export let coreGroup = null;
export let accretionDisk = null;
export let bulge = null;
export let coreGlowSprites = [];

// Basic dynamics state for differential rotation demo
export const dynamics = {
  enabled: false,
  time: 0,
  // Star rotation base scale (multiplier, 1.0 = default)
  starSpeedScale: 1.0,
  // Spiral arm pattern speed (radians per second)
  patternSpeed: 0.004,
  // Per-arm-star metadata (local to armsPoints)
  armR: null,
  armTheta0: null,
  armOffset: null,
  armY: null,
  count: 0
};

export function createGalaxy(scene) {
  galaxyGroup = new THREE.Group();
  galaxyGroup.visible = false;
  scene.add(galaxyGroup);

  const ARMS = 4, STARS = 18000, R_MAX = 180, THICK = 3.2;
  const ARM_WIDTH = 8;
  // Enhanced galaxy stars split into components
  const countArms = Math.floor(STARS * 0.7);
  const countBulge = Math.floor(STARS * 0.15);
  const countHalo = STARS - countArms - countBulge;

  const makeBuffer = (n) => ({
    pos: new Float32Array(n * 3),
    col: new Float32Array(n * 3),
    size: new Float32Array(n)
  });

  const arms = makeBuffer(countArms);
  // Allocate dynamics arrays for arm stars
  dynamics.armR = new Float32Array(countArms);
  dynamics.armTheta0 = new Float32Array(countArms);
  dynamics.armOffset = new Float32Array(countArms);
  dynamics.armY = new Float32Array(countArms);
  dynamics.count = countArms;
  const bul = makeBuffer(countBulge);
  const halo = makeBuffer(countHalo);

  // Arms
  for (let i = 0; i < countArms; i++) {
    const arm = i % ARMS;
    const armAngle = (arm / ARMS) * Math.PI * 2;
    const t = Math.random() * 6.8 * Math.PI;
    const radius = THREE.MathUtils.mapLinear(Math.pow(Math.random(), 0.7), 0, 1, 2, R_MAX);
    const twist = t * 0.25;
    const angle = armAngle + t + twist;
    const armOffset = (Math.random() - 0.5) * ARM_WIDTH;
    const x = Math.cos(angle) * radius + Math.cos(angle + Math.PI/2) * armOffset;
    const z = Math.sin(angle) * radius + Math.sin(angle + Math.PI/2) * armOffset;
    const y = THREE.MathUtils.randFloatSpread(THICK * 0.8);
    arms.pos[i*3+0] = x; arms.pos[i*3+1] = y; arms.pos[i*3+2] = z;
    // Record base parameters for dynamics updates
    dynamics.armR[i] = radius;
    dynamics.armTheta0[i] = angle;
    dynamics.armOffset[i] = armOffset;
    dynamics.armY[i] = y;
    const temp = Math.random();
    if (temp < 0.1) { // Hot blue giants
      arms.col[i*3+0] = 0.7 + Math.random()*0.2;
      arms.col[i*3+1] = 0.8 + Math.random()*0.2;
      arms.col[i*3+2] = 1.0;
      arms.size[i] = 1.2 + Math.random()*0.8;
    } else { // Main sequence
      arms.col[i*3+0] = 0.9 + Math.random()*0.1;
      arms.col[i*3+1] = 0.9 + Math.random()*0.1;
      arms.col[i*3+2] = 0.8 + Math.random()*0.2;
      arms.size[i] = 0.6 + Math.random()*0.4;
    }
  }

  // Bulge
  for (let i = 0; i < countBulge; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = Math.pow(Math.random(), 0.3) * 25;
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta) * 0.6;
    const z = radius * Math.cos(phi);
    bul.pos[i*3+0] = x; bul.pos[i*3+1] = y; bul.pos[i*3+2] = z;
    bul.col[i*3+0] = 1.0;
    bul.col[i*3+1] = 0.7 + Math.random()*0.2;
    bul.col[i*3+2] = 0.4 + Math.random()*0.3;
    bul.size[i] = 0.8 + Math.random()*0.4;
  }

  // Halo
  for (let i = 0; i < countHalo; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = Math.pow(Math.random(), 0.2) * R_MAX * 1.5;
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);
    halo.pos[i*3+0] = x; halo.pos[i*3+1] = y; halo.pos[i*3+2] = z;
    halo.col[i*3+0] = 0.9 + Math.random()*0.1;
    halo.col[i*3+1] = 0.8 + Math.random()*0.1;
    halo.col[i*3+2] = 0.6 + Math.random()*0.2;
    halo.size[i] = 0.4 + Math.random()*0.3;
  }

  // Small circular point texture to avoid square artifacts
  const pointTex = (() => {
    const s = 64;
    const c = document.createElement('canvas');
    c.width = s; c.height = s;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(s/2,s/2,1, s/2,s/2,s/2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.7, 'rgba(255,255,255,0.5)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.beginPath(); g.arc(s/2,s/2,s/2,0,Math.PI*2); g.fill();
    const t = new THREE.CanvasTexture(c);
    t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
    t.premultiplyAlpha = true;
    return t;
  })();

  const makePoints = (buf) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(buf.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(buf.col, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(buf.size, 1));
    const mat = new THREE.PointsMaterial({
      size: 1.2,
      vertexColors: true,
      transparent: true,
      opacity: starBrightness,
      sizeAttenuation: true,
      alphaTest: 0.15,
      map: pointTex,
      depthWrite: false
    });
    return new THREE.Points(geo, mat);
  };

  armsPoints = makePoints(arms);
  bulgePoints = makePoints(bul);
  haloPoints = makePoints(halo);
  galaxyGroup.add(armsPoints, bulgePoints, haloPoints);
  galaxyPoints = armsPoints; // back-compat for existing code paths

  // Enhanced galactic core with supermassive black hole region
  coreGroup = new THREE.Group();
  
  // Supermassive black hole region (represented by gravitational effects, not visible)
  // No visible mesh for the black hole itself - it's invisible by nature
  
  // Accretion disk around black hole
  const diskGeometry = new THREE.RingGeometry(1, 8, 32);
  const diskMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xffaa44, 
    transparent: true, 
    opacity: 0.6,
    side: THREE.DoubleSide
  });
  accretionDisk = new THREE.Mesh(diskGeometry, diskMaterial);
  accretionDisk.rotation.x = Math.PI / 2;
  coreGroup.add(accretionDisk);
  
  // Galactic bulge
  bulge = new THREE.Mesh(
    new THREE.SphereGeometry(12, 32, 32),
    new THREE.MeshBasicMaterial({ 
      color: 0xffdc80, 
      transparent: true, 
      opacity: 0.3 
    })
  );
  bulge.scale.y = 0.6; // Flatten the bulge
  coreGroup.add(bulge);
  
  galaxyGroup.add(coreGroup);

  // Enhanced core glow with multiple layers
  const glowLayers = [50, 80, 120];
  const glowOpacities = [0.8, 0.4, 0.2];
  
  coreGlowSprites = [];
  glowLayers.forEach((size, index) => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(128,128,10, 128,128,120);
    grad.addColorStop(0, `rgba(255,242,198,${glowOpacities[index]})`);
    grad.addColorStop(0.6, `rgba(255,220,160,${glowOpacities[index] * 0.4})`);
    grad.addColorStop(1, 'rgba(255,200,140,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(128,128,120,0,Math.PI*2);
    g.fill();
    
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ 
      map: tex, 
      depthWrite: false, 
      transparent: true, 
      opacity: glowOpacities[index], 
      color: 0xffffff,
      blending: THREE.AdditiveBlending
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(size, size, 1);
    coreGroup.add(sprite);
    coreGlowSprites.push(sprite);
  });

  // Create dust lanes
  createDustLanes();
  
  // Create star formation regions (nebulae)
  createStarFormationRegions();

  // Enhanced Sun marker with orbital indicator and glow
  const sunGroup = new THREE.Group();
  
  // Main Sun sphere
  sunMilky = new THREE.Mesh(
    new THREE.SphereGeometry(2.5, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0xffe08a })
  );
  
  // Add a glow effect to the Sun
  const sunGlowCanvas = document.createElement('canvas');
  sunGlowCanvas.width = 64;
  sunGlowCanvas.height = 64;
  const sunGlowCtx = sunGlowCanvas.getContext('2d');
  const sunGlowGrad = sunGlowCtx.createRadialGradient(32, 32, 5, 32, 32, 30);
  sunGlowGrad.addColorStop(0, 'rgba(255, 224, 138, 0.8)');
  sunGlowGrad.addColorStop(0.5, 'rgba(255, 200, 100, 0.4)');
  sunGlowGrad.addColorStop(1, 'rgba(255, 180, 80, 0)');
  sunGlowCtx.fillStyle = sunGlowGrad;
  sunGlowCtx.fillRect(0, 0, 64, 64);
  
  const sunGlowTexture = new THREE.CanvasTexture(sunGlowCanvas);
  const sunGlowMaterial = new THREE.SpriteMaterial({ 
    map: sunGlowTexture, 
    transparent: true, 
    opacity: 0.8,
    blending: THREE.AdditiveBlending
  });
  const sunGlow = new THREE.Sprite(sunGlowMaterial);
  sunGlow.scale.set(12, 12, 1);
  
  sunGroup.add(sunMilky);
  sunGroup.add(sunGlow);
  
  const sunGalRadius = 82 * (R_MAX / 160);
  const sunGalAngle = Math.PI * 1.7;
  sunGroup.position.set(
    Math.cos(sunGalAngle) * sunGalRadius, 
    1.2, 
    Math.sin(sunGalAngle) * sunGalRadius
  );
  
  // Store the main sun mesh position for focusing
  sunMilky.position.copy(sunGroup.position);
  
  // Add orbital trail for Sun
  const sunOrbitGeometry = new THREE.RingGeometry(sunGalRadius - 0.5, sunGalRadius + 0.5, 64);
  const sunOrbitMaterial = new THREE.MeshBasicMaterial({ 
    color: 0x4488ff, 
    transparent: true, 
    opacity: 0.3,
    side: THREE.DoubleSide
  });
  const sunOrbit = new THREE.Mesh(sunOrbitGeometry, sunOrbitMaterial);
  sunOrbit.rotation.x = Math.PI / 2;
  galaxyGroup.add(sunOrbit);
  
  galaxyGroup.add(sunGroup);

  // Create enhanced label function
  function makeLabel(text, scale = 0.1) {
    const padding = 8, fontSize = 44;
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d");
    ctx.font = `bold ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto`;
    const w = Math.ceil(ctx.measureText(text).width + padding * 2);
    const h = fontSize + padding * 2;
    c.width = w; c.height = h;
    
    const ctx2 = c.getContext("2d");
    ctx2.font = `bold ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto`;
    
    // Enhanced label background with gradient
    const gradient = ctx2.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "rgba(20,30,50,0.8)");
    gradient.addColorStop(1, "rgba(10,20,40,0.9)");
    ctx2.fillStyle = gradient;
    
    // Rounded rectangle (with fallback for older browsers)
    if (ctx2.roundRect) {
      ctx2.roundRect(0, 0, w, h, 4);
    } else {
      ctx2.fillRect(0, 0, w, h);
    }
    ctx2.fill();
    
    // Border
    ctx2.strokeStyle = "rgba(100,150,255,0.6)";
    ctx2.lineWidth = 1;
    if (ctx2.roundRect) {
      ctx2.roundRect(0, 0, w, h, 4);
    } else {
      ctx2.strokeRect(0, 0, w, h);
    }
    ctx2.stroke();
    
    // Text with glow effect
    ctx2.shadowColor = "rgba(255,255,255,0.8)";
    ctx2.shadowBlur = 3;
    ctx2.fillStyle = "#ffffff";
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
    // Larger base unit for galaxy labels to improve readability at wide framing
    const unit = scale * 0.05;
    spr.userData.label = { w, h, unit };
    spr.scale.set(w * unit, h * unit, 1);
    spr.renderOrder = 999;
    return spr;
  }

  // Enhanced labels with more information
  sunMilkyLabel = makeLabel("☉ Sol System (Orion Arm)");
  sunMilkyLabel.position.copy(sunGroup.position).add(new THREE.Vector3(6, 8, 0));
  galaxyGroup.add(sunMilkyLabel);

  centerLabel = makeLabel("⚫ Sagittarius A* (26,000 ly)");
  centerLabel.position.set(12, 10, 0);
  galaxyGroup.add(centerLabel);
  
  // Add arm labels
  const armNames = ["Perseus Arm", "Orion Arm", "Sagittarius Arm", "Scutum Arm"];
  spiralArms = [];
  armLabelsGroup = new THREE.Group();
  galaxyGroup.add(armLabelsGroup);
  armNames.forEach((name, i) => {
    const armAngle = (i / ARMS) * Math.PI * 2;
    const labelRadius = R_MAX * 0.7;
    const labelX = Math.cos(armAngle) * labelRadius;
    const labelZ = Math.sin(armAngle) * labelRadius;
    
    const armLabel = makeLabel(name, 0.08);
    armLabel.position.set(labelX, 4, labelZ);
    armLabel.userData.isArmLabel = true;
    armLabel.userData.armName = name;
    armLabelsGroup.add(armLabel);
    spiralArms.push(armLabel);
  });

  return {
    galaxyGroup,
    galaxyRotationSpeed,
    galaxyAutoRotate,
    starBrightness,
    galaxyPoints,
    armsPoints,
    bulgePoints,
    haloPoints,
    sunMilky,
    sunMilkyLabel,
    centerLabel,
    spiralArms,
    armLabelsGroup,
    starFormationRegions,
    dustLanes,
    galacticHalo,
    coreGroup,
    accretionDisk,
    bulge,
    coreGlowSprites
  };
}

// Simple, stylized angular speed model (radians/sec) for stars in the disk
// Provides differential rotation: faster inside, slower outside, asymptotically flat-ish.
function starOmegaAtRadius(r) {
  const r0 = 20;           // scale length in scene units
  const base = 0.04;       // base angular speed near inner disk
  // Avoid singularity at r ~ 0; produce gentle falloff
  const omega = base * (r0 / (r0 + Math.max(1, r)));
  return omega * dynamics.starSpeedScale;
}

// Update dynamics each frame (called from app.js)
export function updateDynamics(dt, armsPointsRef, armLabelsGroupRef) {
  if (!dynamics.enabled) return;
  dynamics.time += dt;
  const pts = armsPointsRef || armsPoints;
  if (!pts || !pts.geometry || !pts.geometry.attributes) return;

  const pos = pts.geometry.attributes.position.array;
  const n = dynamics.count;
  for (let i = 0; i < n; i++) {
    const r = dynamics.armR[i];
    const theta = dynamics.armTheta0[i] + starOmegaAtRadius(r) * dynamics.time;
    const off = dynamics.armOffset[i];
    const y = dynamics.armY[i];
    const cos = Math.cos(theta), sin = Math.sin(theta);
    // Apply offset perpendicular to radial direction (follows rotation)
    const px = cos * r + Math.cos(theta + Math.PI / 2) * off;
    const pz = sin * r + Math.sin(theta + Math.PI / 2) * off;
    pos[i*3+0] = px;
    pos[i*3+1] = y;
    pos[i*3+2] = pz;
  }
  pts.geometry.attributes.position.needsUpdate = true;

  // Rotate the arm labels as a simple proxy for spiral pattern speed
  const labels = armLabelsGroupRef || armLabelsGroup;
  if (labels) labels.rotation.y += dynamics.patternSpeed * dt;
}

export function setDynamicsEnabled(flag) {
  dynamics.enabled = !!flag;
}

export function setDynamicsParams({ starSpeedScale, patternSpeed } = {}) {
  if (typeof starSpeedScale === 'number') dynamics.starSpeedScale = starSpeedScale;
  if (typeof patternSpeed === 'number') dynamics.patternSpeed = patternSpeed;
}

// Create dust lanes for visual realism
function createDustLanes() {
  const dustPoints = 2000;
  const dustPos = new Float32Array(dustPoints * 3);
  const dustCol = new Float32Array(dustPoints * 3);
  
  for (let i = 0; i < dustPoints; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 20 + Math.random() * 120;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = THREE.MathUtils.randFloatSpread(2);
    
    dustPos[i * 3] = x;
    dustPos[i * 3 + 1] = y;
    dustPos[i * 3 + 2] = z;
    
    // Dark dust color
    dustCol[i * 3] = 0.1;
    dustCol[i * 3 + 1] = 0.08;
    dustCol[i * 3 + 2] = 0.06;
  }
  
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  dustGeo.setAttribute("color", new THREE.BufferAttribute(dustCol, 3));
  
  dustLanes = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    size: 2.0,
    vertexColors: true,
    transparent: true,
    opacity: 0.4,
    map: (function(){
      const s=32; const c=document.createElement('canvas'); c.width=s; c.height=s; const g=c.getContext('2d');
      const grad=g.createRadialGradient(s/2,s/2,1, s/2,s/2,s/2);
      grad.addColorStop(0, 'rgba(0,0,0,0.8)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle=grad; g.beginPath(); g.arc(s/2,s/2,s/2,0,Math.PI*2); g.fill();
      const t=new THREE.CanvasTexture(c); t.minFilter=THREE.LinearFilter; t.magFilter=THREE.LinearFilter; t.premultiplyAlpha=true; return t;
    })(),
    alphaTest: 0.2,
    depthWrite: false
  }));
  
  galaxyGroup.add(dustLanes);
}

// Create star formation regions (colorful nebulae)
function createStarFormationRegions() {
  const regionCount = 8;
  starFormationRegions = [];
  
  for (let i = 0; i < regionCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 40 + Math.random() * 100;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = THREE.MathUtils.randFloatSpread(4);
    
    // Create nebula sprite
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Random nebula colors
    const colors = [
      ['#ff6b6b', '#ff8e53'], // Red nebula
      ['#4ecdc4', '#44a08d'], // Cyan nebula  
      ['#a8e6cf', '#7fcdcd'], // Green nebula
      ['#ffd93d', '#ff8c42'], // Yellow nebula
      ['#ff6b9d', '#c44569']  // Pink nebula
    ];
    const colorPair = colors[Math.floor(Math.random() * colors.length)];
    
    const gradient = ctx.createRadialGradient(64, 64, 10, 64, 64, 60);
    gradient.addColorStop(0, colorPair[0] + '80');
    gradient.addColorStop(0.5, colorPair[1] + '40');
    gradient.addColorStop(1, 'transparent');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ 
      map: texture, 
      transparent: true, 
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true
    });
    const nebula = new THREE.Sprite(material);
    const size = 15 + Math.random() * 25;
    nebula.scale.set(size, size, 1);
    nebula.position.set(x, y, z);
    
    galaxyGroup.add(nebula);
    starFormationRegions.push(nebula);
  }
}
