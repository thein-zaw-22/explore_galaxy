// Galaxy Visualization - Modular Version
/* global THREE */
import { createScene } from './src/core/scene.js';
import { createCamera } from './src/core/camera.js';
import { createRenderer } from './src/core/renderer.js';
import { createLights } from './src/core/lights.js';
import { BasicOrbitControls } from './src/core/controls.js';
import { createSolarSystem } from './src/scene/solarSystem.js';
import { createGalaxy, updateDynamics, setDynamicsEnabled, setDynamicsParams } from './src/scene/galaxy.js';
import { getUIElements } from './src/ui/elements.js';
import { setInfoFor, setGalaxyInfo, updateLegend } from './src/ui/info.js';
import { updateAllLabelScales } from './src/ui/labels.js';

// Global app state
let scene, camera, renderer, controls;
let solarGroup, galaxyGroup, galaxyPoints;
let orbitLines = [], planetsData = [], labels = [], planets = [], selectables = [];
let solarMaxDist = 0;
let sunMilky, sunMilkyLabel, centerLabel, accretionDisk, bulge;
let armsPoints, bulgePoints, haloPoints, coreGlowSprites = [];
let spiralArms = [], starFormationRegions = [], dustLanes = null;
let mode = "solar", focused = "Sun", playing = true, touring = false;
let tourIndex = 0, tourTimer = 0, timeSpeed = 40;
let galaxyAutoRotate = true, galaxyRotationSpeed = 0.005, starBrightness = 0.9, labelSizeMultiplier = 1.6;
let camLerp = 0;
const CAM_TIME = 0.9;
let camFromPos = new THREE.Vector3(), camToPos = new THREE.Vector3();
let targetFrom = new THREE.Vector3(), targetTo = new THREE.Vector3(0, 0, 0);
const mouse = new THREE.Vector2(), raycaster = new THREE.Raycaster();
let uiElements;
let _accordionInitialized = false; // manage mobile accordions default state
// Reusable temp vector to avoid per-frame allocations
const _tmpVec3 = new THREE.Vector3();
// Galaxy tour state
let galaxyTouring = false, galaxyTourTimer = 0, galaxyTourIdx = 0;
const galaxyTourSeq = ['core','sun','wide'];

// Simple settings persistence
const SETTINGS_KEY = 'spaceviz.settings.v1';
function saveSettings() {
  try {
    const s = {
      mode,
      // Solar
      speed: document.getElementById('speed')?.value,
      showOrbits: document.getElementById('showOrbits')?.checked,
      showLabels: document.getElementById('showLabels')?.checked,
      labelScale: document.getElementById('labelScale')?.value,
      followSelection: document.getElementById('followSelection')?.checked,
      // Galaxy
      galaxyFocus: document.getElementById('galaxyFocus')?.value,
      galaxyAutoRotate: !!galaxyAutoRotate,
      galaxySpin: document.getElementById('galaxySpin')?.value,
      starBrightness: document.getElementById('starBrightness')?.value,
      galaxyTilt: document.getElementById('galaxyTilt')?.value,
      starSize: document.getElementById('starSize')?.value,
      nebulaVisibility: document.getElementById('nebulaVisibility')?.value,
      dustLaneVisibility: document.getElementById('dustLaneVisibility')?.value,
      showGalaxyArms: document.getElementById('showGalaxyArms')?.checked,
      showSunOrbit: document.getElementById('showSunOrbit')?.checked,
      armsOpacity: document.getElementById('armsOpacity')?.value,
      bulgeOpacity: document.getElementById('bulgeOpacity')?.value,
      haloOpacity: document.getElementById('haloOpacity')?.value,
      coreGlow: document.getElementById('coreGlow')?.value,
      fogDensity: document.getElementById('fogDensity')?.value,
      // Dynamics
      galaxyDynamics: document.getElementById('galaxyDynamics')?.checked,
      stellarRotation: document.getElementById('stellarRotation')?.value,
      armPattern: document.getElementById('armPattern')?.value
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch(_){}
}
function applySettingsFromStorage() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    const setVal = (id, v) => { const el = document.getElementById(id); if (el && v != null) { el.value = v; el.dispatchEvent(new Event('input')); el.dispatchEvent(new Event('change')); } };
    const setChk = (id, v) => { const el = document.getElementById(id); if (el && v != null) { el.checked = !!v; el.dispatchEvent(new Event('change')); } };
    setVal('speed', s.speed); setChk('showOrbits', s.showOrbits); setChk('showLabels', s.showLabels);
    setVal('labelScale', s.labelScale); setChk('followSelection', s.followSelection);
    setVal('galaxySpin', s.galaxySpin);
    if (typeof s.galaxyAutoRotate === 'boolean') {
      galaxyAutoRotate = !!s.galaxyAutoRotate;
      const sw = document.getElementById('galaxyAutoRotate');
      const lb = document.getElementById('galaxyAutoRotateLabel');
      if (sw) sw.checked = galaxyAutoRotate;
      if (lb) lb.classList.toggle('active', galaxyAutoRotate);
    }
    setVal('starBrightness', s.starBrightness); setVal('galaxyTilt', s.galaxyTilt);
    setVal('starSize', s.starSize); setVal('nebulaVisibility', s.nebulaVisibility);
    setVal('dustLaneVisibility', s.dustLaneVisibility); setChk('showGalaxyArms', s.showGalaxyArms);
    setChk('showSunOrbit', s.showSunOrbit); setVal('armsOpacity', s.armsOpacity);
    setVal('bulgeOpacity', s.bulgeOpacity); setVal('haloOpacity', s.haloOpacity);
    setVal('coreGlow', s.coreGlow); setVal('fogDensity', s.fogDensity);
    // Dynamics
    if (typeof s.galaxyDynamics === 'boolean') {
      const sw = document.getElementById('galaxyDynamics');
      const lb = document.getElementById('galaxyDynamicsLabel');
      if (sw) sw.checked = !!s.galaxyDynamics;
      if (lb) lb.classList.toggle('active', !!s.galaxyDynamics);
      setDynamicsEnabled(!!s.galaxyDynamics);
    }
    setVal('stellarRotation', s.stellarRotation);
    setVal('armPattern', s.armPattern);
    if (s.mode === 'galaxy') setMode('galaxy');
    // Ensure focus change applies handlers (camera+info) by dispatching events
    if (s.galaxyFocus) { setVal('galaxyFocus', s.galaxyFocus); }
  } catch(_){}
}

async function init() {
  // Create core components
  scene = createScene();
  camera = createCamera();
  renderer = createRenderer();
  
  // Create scene elements
  const solarResult = createSolarSystem(scene);
  solarGroup = solarResult.solarGroup;
  orbitLines = solarResult.orbitLines;
  planetsData = solarResult.planetsData;
  planets = solarResult.planets;
  labels = solarResult.labels;
  selectables = solarResult.selectables;
  solarMaxDist = Math.max(...planetsData.map(p => p.dist));

  const galaxyResult = createGalaxy(scene);
  galaxyGroup = galaxyResult.galaxyGroup;
  galaxyPoints = galaxyResult.galaxyPoints;
  sunMilky = galaxyResult.sunMilky;
  sunMilkyLabel = galaxyResult.sunMilkyLabel;
  centerLabel = galaxyResult.centerLabel;
  accretionDisk = galaxyResult.accretionDisk;
  bulge = galaxyResult.bulge;
  armsPoints = galaxyResult.armsPoints;
  bulgePoints = galaxyResult.bulgePoints;
  haloPoints = galaxyResult.haloPoints;
  coreGlowSprites = galaxyResult.coreGlowSprites || [];
  spiralArms = galaxyResult.spiralArms || [];
  starFormationRegions = galaxyResult.starFormationRegions || [];
  dustLanes = galaxyResult.dustLanes;

  // Add lights
  const { sunLight, ambient } = createLights();
  scene.add(sunLight, ambient);

  // Set up controls
  controls = new BasicOrbitControls(camera, renderer.domElement);

  // UI setup
  uiElements = getUIElements();
  setupEventHandlers();

  // Initialize mode
  setMode('solar');
  // Apply any saved settings and possibly switch mode
  applySettingsFromStorage();
  setInfoFor("Sun");

  // Set default accordion state: open on desktop, collapsed on mobile
  setupAccordions();
  
  // Ensure camera animation is complete to prevent interference
  camLerp = 1;
  camFromPos.copy(camera.position);
  camToPos.copy(camera.position);

  // Start animation loop
  animate();
}

function animate() {
  requestAnimationFrame(animate);
  
  const dt = 1/60;
  
  if (playing) {
    planets.forEach(p => {
      if (p.userData) {
        // Enhanced orbital speed calculation for better visual experience
        // Apply a logarithmic speed boost to outer planets while maintaining relative relationships
        const baseSpeed = timeSpeed / p.userData.periodDays;
        const distanceFromSun = p.userData.dist;
        
        // Apply distance-based speed adjustment (inner planets: normal, outer planets: boosted)
        const speedMultiplier = 1 + Math.log(Math.max(1, distanceFromSun / 15)) * 0.3;
        const adjustedSpeed = baseSpeed * speedMultiplier;
        
        p.userData.theta += adjustedSpeed * 0.01;
        p.position.x = Math.cos(p.userData.theta) * p.userData.dist;
        p.position.z = Math.sin(p.userData.theta) * p.userData.dist;
        
        // Update label position
        const labelIndex = planets.indexOf(p);
        if (labels[labelIndex]) {
          labels[labelIndex].position.set(p.position.x, p.geometry.parameters.radius * 2.2, p.position.z);
        }
      }
    });
    
    if (galaxyAutoRotate && galaxyGroup) {
      galaxyGroup.rotation.y += galaxyRotationSpeed * dt;
    }
    // Galaxy dynamics: per‑star differential rotation + arm pattern speed
    updateDynamics(dt);
  }
  
  if (camLerp < 1) {
    camLerp = Math.min(1, camLerp + dt / CAM_TIME);
    const t = 1 - Math.pow(1 - camLerp, 3);
    camera.position.lerpVectors(camFromPos, camToPos, t);
    _tmpVec3.lerpVectors(targetFrom, targetTo, t);
    controls.target.copy(_tmpVec3);
  }
  
  // Dynamic camera following when Lock camera is enabled
  const fs = uiElements && uiElements.followSelection;
  if (fs && fs.checked && focused !== "Sun" && mode === "solar") {
    const mesh = findPlanetByName(focused);
    if (mesh && camLerp >= 1) { // Only follow after initial focus animation is complete
      // Calculate optimal camera distance based on planet size and distance from sun
      const planetRadius = mesh.geometry.parameters.radius;
      const optimalDistance = Math.max(8, planetRadius * 12 + mesh.userData.dist * 0.15);
      
      const back = new THREE.Vector3().copy(mesh.position).normalize().multiplyScalar(optimalDistance);
      const idealCamPos = new THREE.Vector3().copy(mesh.position)
        .add(new THREE.Vector3(0.6, 0.8, 0.6).multiplyScalar(optimalDistance * 0.3))
        .add(back);
      
      // Smooth camera interpolation for better following experience
      const lerpFactor = 0.02; // Smooth following
      camera.position.lerp(idealCamPos, lerpFactor);
      
      // Smooth target interpolation
      const currentTarget = new THREE.Vector3().copy(controls.target);
      currentTarget.lerp(mesh.position, lerpFactor);
      controls.target.copy(currentTarget);
    }
  }
  
  if (touring) {
    tourTimer += dt;
    if (tourTimer > 4) {
      tourTimer = 0;
      tourIndex = (tourIndex + 1) % uiElements.tourOrder.length;
      focusOn(uiElements.tourOrder[tourIndex]);
    }
  }
  // Galaxy auto tour
  if (mode === 'galaxy' && galaxyTouring) {
    galaxyTourTimer += dt;
    if (galaxyTourTimer > 4) {
      galaxyTourTimer = 0;
      galaxyTourIdx = (galaxyTourIdx + 1) % galaxyTourSeq.length;
      const dest = galaxyTourSeq[galaxyTourIdx];
      const galaxyFocus = document.getElementById('galaxyFocus');
      if (galaxyFocus) galaxyFocus.value = dest;
      if (dest === 'core') { focusGalaxyCenter(); setGalaxyInfo('core'); }
      if (dest === 'sun') { focusGalaxySun(); setGalaxyInfo('sun'); }
      if (dest === 'wide') { resetGalaxyView(); setGalaxyInfo('wide'); }
    }
  }
  
  if (controls) controls.update();
  updateAllLabelScales(camera, labelSizeMultiplier, labels, sunMilkyLabel, centerLabel, spiralArms);
  renderer.render(scene, camera);
}

function findPlanetByName(name) {
  return planets.find(p => p.userData && p.userData.name === name);
}

function focusOn(name) {
  focused = name;
  orbitLines.forEach((line, i) => {
    const on = (planetsData[i].name === name);
    line.material.opacity = on ? 0.95 : 0.25;
    line.material.color.setHex(on ? 0xaad4ff : 0x355079);
    line.material.needsUpdate = true;
  });

  const meta = planetsData.find(p => p.name === name);
  setInfoFor(name, meta);

  // Add a soft highlight halo around the focused planet
  planets.forEach(p => {
    const old = p.getObjectByName('focusHalo');
    if (old) p.remove(old);
  });
  if (name !== 'Sun') {
    const mesh = findPlanetByName(name);
    if (mesh) {
      const r = mesh.geometry?.parameters?.radius || 0.5;
      const ringGeo = new THREE.RingGeometry(r * 1.35, r * 1.7, 48);
      const c = document.createElement('canvas'); c.width = 128; c.height = 16;
      const g = c.getContext('2d'); const grd = g.createLinearGradient(0,0,128,0);
      grd.addColorStop(0,'rgba(120,180,255,0)'); grd.addColorStop(0.5,'rgba(120,180,255,0.7)'); grd.addColorStop(1,'rgba(120,180,255,0)');
      g.fillStyle = grd; g.fillRect(0,0,128,16);
      const tex = new THREE.CanvasTexture(c); tex.minFilter = THREE.LinearFilter; tex.premultiplyAlpha = true;
      const ringMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite:false, opacity: 0.9, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.name = 'focusHalo';
      ring.rotation.x = Math.PI / 2;
      mesh.add(ring);
    }
  }

  camLerp = 0;
  camFromPos.copy(camera.position);
  targetFrom.copy(controls.target);

  if (name === "Sun") {
    targetTo.set(0, 0, 0);
    // Frame based on current system size
    const r = Math.max(20, solarMaxDist || Math.max(...planetsData.map(p => p.dist), 42));
    camToPos.set(0, r * 1.25, r * 3.1);
  } else {
    const mesh = findPlanetByName(name);
    if (mesh) {
      targetTo.copy(mesh.position);
      const back = new THREE.Vector3().copy(mesh.position).normalize().multiplyScalar(6 + mesh.geometry.parameters.radius * 8);
      camToPos.copy(mesh.position).add(new THREE.Vector3(0.6, 0.6, 0.6).multiplyScalar(6)).add(back);
    }
  }
}

function setMode(next) {
  mode = next;
  const solar = mode === "solar";
  
  if (solarGroup) solarGroup.visible = solar;
  if (galaxyGroup) galaxyGroup.visible = !solar;
  
  const modePill = document.getElementById("modePill");
  const btnSolar = document.getElementById("btnSolar");
  const btnGalaxy = document.getElementById("btnGalaxy");
  const uiRoot = document.getElementById("ui");
  
  if (modePill) modePill.textContent = solar ? "Solar System" : "Milky Way";
  if (btnSolar) btnSolar.classList.toggle("active", solar);
  if (btnGalaxy) btnGalaxy.classList.toggle("active", !solar);
  if (uiRoot) uiRoot.setAttribute('data-mode', solar ? 'solar' : 'galaxy');

  if (solar) {
    camera.near = 0.1; camera.far = 3000; camera.updateProjectionMatrix();
    // Allow closer zoom, and limit max to keep system readable
    controls.minDistance = 2;
    const r = Math.max(20, solarMaxDist || Math.max(...planetsData.map(p => p.dist), 42));
    controls.maxDistance = Math.max(160, r * 4.0);
    resetSolarView();
    updateLegend('solar');
    
    // Update info panel to show Solar System quick facts
    setInfoFor("Sun");
  } else {
    camera.near = 0.1; camera.far = 8000; camera.updateProjectionMatrix();
    controls.minDistance = 30; controls.maxDistance = 3000;
    resetGalaxyView();
    updateLegend('galaxy');
    setGalaxyInfo('wide');
    
    // Reset galaxy focus dropdown to 'wide'
    const galaxyFocus = document.getElementById('galaxyFocus');
    if (galaxyFocus) galaxyFocus.value = 'wide';
  }
  saveSettings();
}

function resetSolarView() {
  // Frame based on outermost orbit with comfortable padding
  const r = Math.max(20, solarMaxDist || Math.max(...planetsData.map(p => p.dist), 42));
  const y = r * 1.25;
  const z = r * 3.1;
  camera.position.set(0, y, z);
  controls.target.set(0, 0, 0);
  controls.update();
  // Ensure no animation overrides this position
  camLerp = 1;
}

function resetGalaxyView() {
  camera.position.set(0, 120, 280);
  controls.target.set(0, 0, 0);
  controls.update();
}

function focusGalaxyCenter() {
  camLerp = 0;
  camFromPos.copy(camera.position);
  targetFrom.copy(controls.target);
  targetTo.set(0, 0, 0);
  // Position camera to get a good view of the galactic core
  camToPos.set(0, 45, 120);
}

function focusGalaxySun() {
  camLerp = 0;
  camFromPos.copy(camera.position);
  targetFrom.copy(controls.target);
  
  if (sunMilky) {
    // Focus directly on the Sun's position
    targetTo.copy(sunMilky.position);
    // Adaptive view distance based on Sun's galactic radius for consistent framing
    const sunPos = sunMilky.position.clone();
    const sunRadius = Math.sqrt(sunPos.x*sunPos.x + sunPos.z*sunPos.z) || 80;
    const offsetDistance = THREE.MathUtils.clamp(sunRadius * 0.35, 20, 40);
    const heightOffset = THREE.MathUtils.clamp(sunRadius * 0.16, 12, 22);
    camToPos.set(sunPos.x + offsetDistance * 0.7, sunPos.y + heightOffset, sunPos.z + offsetDistance * 0.7);
  } else {
    focusGalaxyCenter();
  }
}

// Generic focus helper for arbitrary galaxy positions (e.g., arm labels)
function focusGalaxyAt(pos) {
  camLerp = 0;
  camFromPos.copy(camera.position);
  targetFrom.copy(controls.target);
  targetTo.copy(pos);
  const dir = new THREE.Vector3(pos.x, 0, pos.z);
  if (dir.lengthSq() === 0) dir.set(1,0,0);
  dir.normalize();
  const offsetDistance = 38;
  const heightOffset = 18;
  camToPos.set(pos.x + dir.x * offsetDistance, pos.y + heightOffset, pos.z + dir.z * offsetDistance);
}

function setupEventHandlers() {
  const {
    elSpeed, elSpeedVal, elShowOrbits, elShowLabels, btnSolar, btnGalaxy,
    resetView, focusSelect, followSelection, btnPlay, btnTour, galaxyFocus, galaxyAutoRotateEl,
    galaxySpin, galaxySpinVal, starBrightnessEl, starBrightnessVal,
    labelScaleEl, labelScaleVal, tourOrder
  } = uiElements;
  
  // Reset Zoom button (preserve current view direction; reset distance to a sensible value)
  const resetZoomBtn = document.getElementById('resetZoom');
  const resetZoomOnly = () => {
    const target = controls ? controls.target.clone() : new THREE.Vector3();
    const dir = camera.position.clone().sub(target);
    if (dir.lengthSq() === 0) dir.set(0, 0, 1);
    dir.normalize();
    let dist;
    if (mode === 'solar') {
      const r = Math.max(20, solarMaxDist || Math.max(...planetsData.map(p => p.dist), 42));
      dist = Math.max(100, r * 3.2);
    } else {
      dist = 300; // about the default galaxy framing distance
    }
    camera.position.copy(target).add(dir.multiplyScalar(dist));
    camLerp = 1; // avoid interpolation overriding this
    controls && controls.update();
  };
  if (resetZoomBtn) resetZoomBtn.addEventListener('click', resetZoomOnly);

  const toggleUIVisible = () => {
    const ui = document.getElementById('ui');
    const legend = document.getElementById('legend');
    const info = document.getElementById('infoPanel');
    
    // Only toggle UI on desktop, mobile uses slide menu
    if (window.innerWidth >= 768) {
      ui && ui.classList.toggle('hidden');
      legend && legend.classList.toggle('hidden');
      info && info.classList.toggle('hidden');
    } else {
      // On mobile, just toggle the UI slide menu
      ui && ui.classList.toggle('hidden');
      // Don't auto-toggle info panel on mobile, user controls it separately
    }
  };

  // Keyboard shortcuts: Z = Reset Zoom, R = Reset View
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const t = e.target;
    const isTyping = t && (
      t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable
    );
    if (isTyping) return;
    const k = (e.key || '').toLowerCase();
    if (k === ' ') {
      e.preventDefault();
      if (mode === 'galaxy') {
        // Space toggles galaxy auto‑rotate in Galaxy mode
        galaxyAutoRotate = !galaxyAutoRotate;
        const sw = document.getElementById('galaxyAutoRotate');
        const lb = document.getElementById('galaxyAutoRotateLabel');
        if (sw) { sw.checked = galaxyAutoRotate; sw.focus({ preventScroll: true }); }
        if (lb) {
          lb.classList.toggle('active', galaxyAutoRotate);
          lb.classList.add('kbd-flash');
          setTimeout(() => lb.classList.remove('kbd-flash'), 360);
        }
        saveSettings();
      } else {
        // Space toggles play/pause in Solar mode
        playing = !playing;
        const btnPlayEl = document.getElementById('btnPlay');
        if (btnPlayEl) btnPlayEl.textContent = playing ? '⏸ Pause' : '▶ Play';
        saveSettings();
      }
    } else if (k === '?' || k === 'h') {
      const o = document.getElementById('helpOverlay');
      if (o) o.classList.toggle('active');
    } else if (k === 'u') {
      toggleUIVisible();
    } else if (k === 'z') {
      e.preventDefault();
      resetZoomOnly();
    } else if (k === 'r') {
      e.preventDefault();
      if (mode === 'solar') {
        resetSolarView();
      } else {
        resetGalaxyView();
        const galaxyFocusSel = document.getElementById('galaxyFocus');
        if (galaxyFocusSel) galaxyFocusSel.value = 'wide';
        setGalaxyInfo('wide');
      }
    }
  });

  // Mobile UI controls - slide menu and info toggle
  const uiToggleFab = document.getElementById('uiToggleFab');
  const infoToggleFab = document.getElementById('infoToggleFab');
  const legendToggleFab = document.getElementById('legendToggleFab');
  const infoPanel = document.getElementById('infoPanel');
  const mobileLegendPanel = document.getElementById('mobileLegendPanel');
  
  if (uiToggleFab) {
    uiToggleFab.addEventListener('click', () => {
      const ui = document.getElementById('ui');
      if (ui) {
        ui.classList.toggle('hidden');
        // Update FAB icon based on state
        uiToggleFab.innerHTML = ui.classList.contains('hidden') ? '☰' : '✕';
        uiToggleFab.setAttribute('aria-label', 
          ui.classList.contains('hidden') ? 'Show controls' : 'Hide controls'
        );
      }
      
      // On mobile, when showing UI, ensure accordions are in appropriate state
      if (isTouchDevice()) {
        const ui = document.getElementById('ui');
        if (ui && !ui.classList.contains('hidden')) {
          setTimeout(() => {
            applyAccordionDefaults();
          }, 100);
        }
      }
    });
    
    // Add touch feedback for FAB button
    uiToggleFab.addEventListener('touchstart', () => {
      uiToggleFab.style.transform = 'scale(0.95)';
    });
    
    uiToggleFab.addEventListener('touchend', () => {
      uiToggleFab.style.transform = '';
    });
    
    uiToggleFab.addEventListener('touchcancel', () => {
      uiToggleFab.style.transform = '';
    });
  }
  
  // Info toggle for mobile
  if (infoToggleFab && infoPanel) {
    infoToggleFab.addEventListener('click', () => {
      infoPanel.classList.toggle('visible');
      // Update button icon based on state
      infoToggleFab.innerHTML = infoPanel.classList.contains('visible') ? '✕' : 'ℹ️';
      infoToggleFab.setAttribute('aria-label', 
        infoPanel.classList.contains('visible') ? 'Hide info' : 'Show info'
      );
    });
    
    // Add touch feedback
    infoToggleFab.addEventListener('touchstart', () => {
      infoToggleFab.style.transform = 'scale(0.95)';
    });
    
    infoToggleFab.addEventListener('touchend', () => {
      infoToggleFab.style.transform = '';
    });
    
    infoToggleFab.addEventListener('touchcancel', () => {
      infoToggleFab.style.transform = '';
    });
  }
  
  // Legend toggle for mobile
  if (legendToggleFab && mobileLegendPanel) {
    legendToggleFab.addEventListener('click', () => {
      mobileLegendPanel.classList.toggle('visible');
      // Update button icon based on state
      legendToggleFab.innerHTML = mobileLegendPanel.classList.contains('visible') ? '✕' : '📄';
      legendToggleFab.setAttribute('aria-label', 
        mobileLegendPanel.classList.contains('visible') ? 'Hide facts' : 'Show facts'
      );
    });
    
    // Add touch feedback
    legendToggleFab.addEventListener('touchstart', () => {
      legendToggleFab.style.transform = 'translateY(-50%) scale(0.95)';
    });
    
    legendToggleFab.addEventListener('touchend', () => {
      legendToggleFab.style.transform = 'translateY(-50%)';
    });
    
    legendToggleFab.addEventListener('touchcancel', () => {
      legendToggleFab.style.transform = 'translateY(-50%)';
    });
  }
  
  // Initialize UI state for mobile
  if (isTouchDevice()) {
    const ui = document.getElementById('ui');
    if (ui) {
      ui.classList.add('hidden'); // Start hidden on mobile
    }
  }

  // Help overlay accessibility: focus trap + return focus
  const helpBtn = document.getElementById('btnHelp');
  const helpOverlay = document.getElementById('helpOverlay');
  const closeHelpBtn = document.getElementById('btnCloseHelp');
  let helpReturnFocusEl = null;
  const focusableSel = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  const trapFocus = (evt) => {
    if (!helpOverlay || !helpOverlay.classList.contains('active')) return;
    if (evt.key !== 'Tab') return;
    const nodes = Array.from(helpOverlay.querySelectorAll(focusableSel)).filter(el => !el.hasAttribute('disabled'));
    if (nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (evt.shiftKey) {
      if (document.activeElement === first) { last.focus(); evt.preventDefault(); }
    } else {
      if (document.activeElement === last) { first.focus(); evt.preventDefault(); }
    }
  };
  if (helpBtn && helpOverlay) {
    helpBtn.addEventListener('click', () => {
      helpReturnFocusEl = document.activeElement || helpBtn;
      helpOverlay.classList.add('active');
      (closeHelpBtn || helpOverlay).focus({ preventScroll: true });
      window.addEventListener('keydown', trapFocus);
    });
  }
  if (closeHelpBtn && helpOverlay) {
    const closeOverlay = () => {
      helpOverlay.classList.remove('active');
      window.removeEventListener('keydown', trapFocus);
      if (helpReturnFocusEl && typeof helpReturnFocusEl.focus === 'function') {
        helpReturnFocusEl.focus({ preventScroll: true });
      }
    };
    closeHelpBtn.addEventListener('click', closeOverlay);
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && helpOverlay.classList.contains('active')) closeOverlay();
    });
  }
  // (help overlay base handlers replaced by accessibility version above)
  
  // Speed control
  if (elSpeed) {
    elSpeed.addEventListener("input", () => {
      timeSpeed = parseInt(elSpeed.value, 10) || 0;
      if (elSpeedVal) elSpeedVal.textContent = "× " + timeSpeed;
      saveSettings();
    });
    if (elSpeedVal) elSpeedVal.textContent = "× " + timeSpeed;
  }

  // Orbit visibility
  if (elShowOrbits) {
    elShowOrbits.addEventListener("change", () => {
      orbitLines.forEach((l) => (l.visible = elShowOrbits.checked));
      const lab = document.getElementById('showOrbitsLabel');
      if (lab) lab.classList.toggle('active', !!elShowOrbits.checked);
      saveSettings();
    });
    const lab = document.getElementById('showOrbitsLabel');
    if (lab) lab.classList.toggle('active', !!elShowOrbits.checked);
  }

  // Label visibility  
  if (elShowLabels) {
    elShowLabels.addEventListener("change", () => {
      const vis = !!elShowLabels.checked;
      labels.forEach((l) => (l.visible = vis));
      if (sunMilkyLabel) sunMilkyLabel.visible = vis;
      if (centerLabel) centerLabel.visible = vis;
      const lab = document.getElementById('showLabelsLabel');
      if (lab) lab.classList.toggle('active', vis);
      saveSettings();
    });
    const lab = document.getElementById('showLabelsLabel');
    if (lab) lab.classList.toggle('active', !!elShowLabels.checked);
  }

  // Mode buttons
  if (btnSolar) btnSolar.addEventListener("click", () => setMode("solar"));
  if (btnGalaxy) btnGalaxy.addEventListener("click", () => setMode("galaxy"));
  
  // Reset view
  if (resetView) {
    resetView.addEventListener("click", () => 
      mode === "solar" ? resetSolarView() : resetGalaxyView()
    );
  }
  // Galaxy-specific Reset View (always recenters in galaxy mode)
  const resetGalaxyViewBtn = document.getElementById('resetGalaxyView');
  if (resetGalaxyViewBtn) {
    resetGalaxyViewBtn.addEventListener('click', () => {
      resetGalaxyView();
      const galaxyFocusSel = document.getElementById('galaxyFocus');
      if (galaxyFocusSel) galaxyFocusSel.value = 'wide';
      setGalaxyInfo('wide');
    });
  }

  // Reset All - Solar
  const resetSolarAllBtn = document.getElementById('resetSolarAll');
  if (resetSolarAllBtn) {
    resetSolarAllBtn.addEventListener('click', () => {
      const setVal = (id, v) => { const el = document.getElementById(id); if (el) { el.value = String(v); el.dispatchEvent(new Event('input')); el.dispatchEvent(new Event('change')); } };
      const setChk = (id, v) => { const el = document.getElementById(id); if (el) { el.checked = !!v; el.dispatchEvent(new Event('change')); } };
      setVal('speed', 40);
      setChk('showOrbits', true);
      setChk('showLabels', true);
      setVal('labelScale', 160);
      setChk('followSelection', true);
      if (document.getElementById('focusSelect')) document.getElementById('focusSelect').value = 'Sun';
      focusOn('Sun');
      resetSolarView();
      saveSettings();
    });
  }

  // Reset All - Galaxy
  const resetGalaxyAllBtn = document.getElementById('resetGalaxyAll');
  if (resetGalaxyAllBtn) {
    resetGalaxyAllBtn.addEventListener('click', () => {
      const setVal = (id, v) => { const el = document.getElementById(id); if (el) { el.value = String(v); el.dispatchEvent(new Event('input')); el.dispatchEvent(new Event('change')); } };
      const setChk = (id, v) => { const el = document.getElementById(id); if (el) { el.checked = !!v; el.dispatchEvent(new Event('change')); } };
      setChk('galaxyAutoRotate', true);
      setVal('galaxySpin', 5);
      setVal('starBrightness', 90);
      setVal('galaxyTilt', 15);
      setVal('starSize', 100);
      setVal('nebulaVisibility', 60);
      setVal('dustLaneVisibility', 40);
      setChk('showGalaxyArms', true);
      setChk('showSunOrbit', true);
      setVal('armsOpacity', 100);
      setVal('bulgeOpacity', 85);
      setVal('haloOpacity', 65);
      setVal('coreGlow', 80);
      setVal('fogDensity', 15);
      // Dynamics defaults
      setChk('galaxyDynamics', false);
      setVal('stellarRotation', 100);
      setVal('armPattern', 4);
      const gf = document.getElementById('galaxyFocus'); if (gf) gf.value = 'wide';
      resetGalaxyView(); setGalaxyInfo('wide');
      saveSettings();
    });
  }

  // Play/Pause
  if (btnPlay) {
    btnPlay.addEventListener("click", () => {
      playing = !playing;
      btnPlay.textContent = playing ? "⏸ Pause" : "▶ Play";
      saveSettings();
    });
  }

  // Focus selection
  if (focusSelect) {
    focusSelect.addEventListener("change", () => {
      focusOn(focusSelect.value);
      saveSettings();
    });
  }
  // Lock camera switch
  const followSel = document.getElementById('followSelection');
  if (followSel) {
    const lab = document.getElementById('followSelectionLabel');
    if (lab) lab.classList.toggle('active', !!followSel.checked);
    followSel.addEventListener('change', () => {
      const l = document.getElementById('followSelectionLabel');
      if (l) l.classList.toggle('active', !!followSel.checked);
      saveSettings();
    });
  }

  // Auto tour
  if (btnTour) {
    btnTour.addEventListener("click", () => {
      touring = !touring;
      tourIndex = 0;
      tourTimer = 0;
      btnTour.textContent = touring ? "Stop tour" : "Auto tour";
      if (touring && tourOrder && tourOrder.length > 0) {
        focusOn(tourOrder[tourIndex]);
      }
      saveSettings();
    });
  }

  // Enhanced Galaxy controls
  if (galaxyFocus) {
    galaxyFocus.addEventListener('change', () => {
      const value = galaxyFocus.value;
      if (value === 'core') {
        focusGalaxyCenter();
        setGalaxyInfo('core');
      } else if (value === 'sun') {
        focusGalaxySun();
        setGalaxyInfo('sun');
      } else if (value === 'wide') {
        resetGalaxyView();
        setGalaxyInfo('wide');
      }
      saveSettings();
    });
  }

  // Galaxy auto-rotate switch
  const autoSwitch = document.getElementById('galaxyAutoRotate');
  const autoLabel = document.getElementById('galaxyAutoRotateLabel');
  const syncAutoRotateUI = () => {
    if (autoSwitch) autoSwitch.checked = !!galaxyAutoRotate;
    if (autoLabel) autoLabel.classList.toggle('active', galaxyAutoRotate);
  };
  if (autoSwitch) {
    autoSwitch.addEventListener('change', () => {
      galaxyAutoRotate = !!autoSwitch.checked;
      syncAutoRotateUI();
      saveSettings();
    });
    syncAutoRotateUI();
  }

  // Galaxy spin speed
  if (galaxySpin) {
    const setSpinLabel = () => {
      if (galaxySpinVal) galaxySpinVal.textContent = `× ${(galaxyRotationSpeed / 0.01).toFixed(1)}`;
    };
    
    galaxySpin.addEventListener('input', () => {
      const v = parseInt(galaxySpin.value, 10); // -20..20
      galaxyRotationSpeed = (v / 20) * 0.02; // -0.02..0.02
      setSpinLabel();
      saveSettings();
    });
    
    setSpinLabel();
  }

  // Galaxy dynamics controls
  const galaxyDynamicsEl = document.getElementById('galaxyDynamics');
  const galaxyDynamicsLabel = document.getElementById('galaxyDynamicsLabel');
  if (galaxyDynamicsEl) {
    const syncDynUI = () => {
      if (galaxyDynamicsLabel) galaxyDynamicsLabel.classList.toggle('active', !!galaxyDynamicsEl.checked);
    };
    galaxyDynamicsEl.addEventListener('change', () => {
      setDynamicsEnabled(!!galaxyDynamicsEl.checked);
      syncDynUI();
      saveSettings();
    });
    syncDynUI();
  }

  const stellarRotationEl = document.getElementById('stellarRotation');
  const stellarRotationVal = document.getElementById('stellarRotationVal');
  if (stellarRotationEl) {
    const apply = () => {
      const pct = parseInt(stellarRotationEl.value, 10) || 100;
      const scale = THREE.MathUtils.clamp(pct / 100, 0.1, 3.0);
      setDynamicsParams({ starSpeedScale: scale });
      if (stellarRotationVal) stellarRotationVal.textContent = `${pct}%`;
    };
    stellarRotationEl.addEventListener('input', apply);
    apply();
    stellarRotationEl.addEventListener('change', saveSettings);
  }

  const armPatternEl = document.getElementById('armPattern');
  const armPatternVal = document.getElementById('armPatternVal');
  if (armPatternEl) {
    const apply = () => {
      const v = parseInt(armPatternEl.value, 10) || 0; // -20..20
      const speed = (v / 20) * 0.02; // -0.02..0.02 rad/s
      setDynamicsParams({ patternSpeed: speed });
      if (armPatternVal) armPatternVal.textContent = `× ${(speed / 0.01).toFixed(1)}`;
    };
    armPatternEl.addEventListener('input', apply);
    apply();
    armPatternEl.addEventListener('change', saveSettings);
  }

  // Star brightness
  if (starBrightnessEl) {
    const applyBrightness = () => {
      const pct = parseInt(starBrightnessEl.value, 10); // 30..130
      starBrightness = THREE.MathUtils.clamp(pct / 100, 0.3, 1.3);
      [armsPoints, bulgePoints, haloPoints].forEach(ps => {
        if (ps && ps.material) {
          ps.material.opacity = Math.min(1.0, starBrightness);
          ps.material.needsUpdate = true;
        }
      });
      if (starBrightnessVal) starBrightnessVal.textContent = `${parseInt(starBrightnessEl.value, 10)}%`;
    };
    
    starBrightnessEl.addEventListener('input', applyBrightness);
    applyBrightness();
    starBrightnessEl.addEventListener('change', saveSettings);
  }
  
  // New enhanced galaxy controls
  const nebulaVisibilityEl = document.getElementById('nebulaVisibility');
  const nebulaVisibilityVal = document.getElementById('nebulaVisibilityVal');
  const dustLaneVisibilityEl = document.getElementById('dustLaneVisibility');
  const dustLaneVisibilityVal = document.getElementById('dustLaneVisibilityVal');
  const showGalaxyArmsEl = document.getElementById('showGalaxyArms');
  const showSunOrbitEl = document.getElementById('showSunOrbit');
  const galaxyTiltEl = document.getElementById('galaxyTilt');
  const galaxyTiltVal = document.getElementById('galaxyTiltVal');
  const starSizeEl = document.getElementById('starSize');
  const starSizeVal = document.getElementById('starSizeVal');
  let baseStarSize = null;
  
  // Nebula visibility
  if (nebulaVisibilityEl) {
    const applyNebulaVisibility = () => {
      const pct = parseInt(nebulaVisibilityEl.value, 10);
      const opacity = pct / 100;
      if (starFormationRegions) {
        starFormationRegions.forEach(nebula => {
          if (nebula.material) {
            nebula.material.opacity = opacity * 0.6; // Base opacity * control
            nebula.material.needsUpdate = true;
          }
        });
      }
      if (nebulaVisibilityVal) nebulaVisibilityVal.textContent = `${pct}%`;
    };
    
    nebulaVisibilityEl.addEventListener('input', applyNebulaVisibility);
    applyNebulaVisibility();
    nebulaVisibilityEl.addEventListener('change', saveSettings);
  }
  
  // Dust lane visibility
  if (dustLaneVisibilityEl) {
    const applyDustVisibility = () => {
      const pct = parseInt(dustLaneVisibilityEl.value, 10);
      const opacity = pct / 100;
      if (dustLanes && dustLanes.material) {
        dustLanes.material.opacity = opacity * 0.4; // Base opacity * control
        dustLanes.material.needsUpdate = true;
      }
      if (dustLaneVisibilityVal) dustLaneVisibilityVal.textContent = `${pct}%`;
    };
    
    dustLaneVisibilityEl.addEventListener('input', applyDustVisibility);
    applyDustVisibility();
    dustLaneVisibilityEl.addEventListener('change', saveSettings);
  }
  
  // Show galaxy arm labels
  if (showGalaxyArmsEl) {
    showGalaxyArmsEl.addEventListener('change', () => {
      const visible = showGalaxyArmsEl.checked;
      if (spiralArms) {
        spiralArms.forEach(label => {
          label.visible = visible;
        });
      }
      const lab = document.getElementById('showGalaxyArmsLabel');
      if (lab) lab.classList.toggle('active', visible);
      saveSettings();
    });
    const lab = document.getElementById('showGalaxyArmsLabel');
    if (lab) lab.classList.toggle('active', !!showGalaxyArmsEl.checked);
    // Apply initial visibility state
    if (spiralArms && spiralArms.length) {
      const vis0 = !!showGalaxyArmsEl.checked;
      spiralArms.forEach(s => s.visible = vis0);
    }
  }
  
  // Show Sun orbit
  if (showSunOrbitEl) {
    showSunOrbitEl.addEventListener('change', () => {
      const visible = showSunOrbitEl.checked;
      // Find and toggle Sun orbit visibility
      if (galaxyGroup) {
        galaxyGroup.children.forEach(child => {
          if (child.geometry && child.geometry.type === 'RingGeometry' && 
              child.material && child.material.color.getHex() === 0x4488ff) {
            child.visible = visible;
          }
        });
      }
      const lab = document.getElementById('showSunOrbitLabel');
      if (lab) lab.classList.toggle('active', visible);
      saveSettings();
    });
    const lab = document.getElementById('showSunOrbitLabel');
    if (lab) lab.classList.toggle('active', !!showSunOrbitEl.checked);
  }

  // Galaxy tilt
  if (galaxyTiltEl) {
    const applyTilt = () => {
      const deg = parseInt(galaxyTiltEl.value, 10) || 0;
      const rad = THREE.MathUtils.degToRad(deg);
      if (galaxyGroup) galaxyGroup.rotation.x = rad;
      if (galaxyTiltVal) galaxyTiltVal.textContent = `${deg}°`;
    };
    galaxyTiltEl.addEventListener('input', applyTilt);
    applyTilt();
    galaxyTiltEl.addEventListener('change', saveSettings);
  }

  // Star size
  if (starSizeEl) {
    const applyStarSize = () => {
      const pct = parseInt(starSizeEl.value, 10) || 100;
      [armsPoints, bulgePoints, haloPoints].forEach(ps => {
        if (!ps || !ps.material) return;
        if (baseStarSize == null) baseStarSize = ps.material.size || 1.2;
        ps.material.size = baseStarSize * (pct / 100);
        ps.material.needsUpdate = true;
      });
      if (starSizeVal) starSizeVal.textContent = `${pct}%`;
    };
    starSizeEl.addEventListener('input', applyStarSize);
    applyStarSize();
    starSizeEl.addEventListener('change', saveSettings);
  }

  // Component opacities
  const applyComp = (el, valEl, points, defPct) => {
    if (!el || !points || !points.material) return;
    const apply = () => {
      const pct = parseInt(el.value, 10);
      points.material.opacity = THREE.MathUtils.clamp((pct / 100) * starBrightness, 0, 1);
      points.material.needsUpdate = true;
      if (valEl) valEl.textContent = `${pct}%`;
    };
    el.addEventListener('input', apply);
    el.value = String(defPct);
    apply();
  };
  const armsOpacityEl = document.getElementById('armsOpacity');
  const armsOpacityVal = document.getElementById('armsOpacityVal');
  const bulgeOpacityEl = document.getElementById('bulgeOpacity');
  const bulgeOpacityVal = document.getElementById('bulgeOpacityVal');
  const haloOpacityEl = document.getElementById('haloOpacity');
  const haloOpacityVal = document.getElementById('haloOpacityVal');
  applyComp(armsOpacityEl, armsOpacityVal, armsPoints, 100);
  applyComp(bulgeOpacityEl, bulgeOpacityVal, bulgePoints, 85);
  applyComp(haloOpacityEl, haloOpacityVal, haloPoints, 65);
  [armsOpacityEl, bulgeOpacityEl, haloOpacityEl].forEach(el => el && el.addEventListener('change', saveSettings));

  // Core glow intensity
  const coreGlowEl = document.getElementById('coreGlow');
  const coreGlowVal = document.getElementById('coreGlowVal');
  if (coreGlowEl) {
    const baseOpacities = coreGlowSprites.map(s => s.material.opacity);
    const apply = () => {
      const pct = parseInt(coreGlowEl.value, 10);
      coreGlowSprites.forEach((s, i) => {
        s.material.opacity = baseOpacities[i] * (pct / 100);
        s.material.needsUpdate = true;
      });
      if (coreGlowVal) coreGlowVal.textContent = `${pct}%`;
    };
    coreGlowEl.addEventListener('input', apply);
    apply();
    coreGlowEl.addEventListener('change', saveSettings);
  }

  // Fog density (scene haze)
  const fogDensityEl = document.getElementById('fogDensity');
  const fogDensityVal = document.getElementById('fogDensityVal');
  if (fogDensityEl) {
    const base = 0.0015;
    const apply = () => {
      const pct = parseInt(fogDensityEl.value, 10);
      const density = base * (pct / 15); // 0..~0.01
      if (scene && scene.fog) scene.fog.density = density;
      if (fogDensityVal) fogDensityVal.textContent = `${pct}%`;
    };
    fogDensityEl.addEventListener('input', apply);
    apply();
    fogDensityEl.addEventListener('change', saveSettings);
  }

  // Galaxy auto tour
  const btnGalaxyTour = document.getElementById('btnGalaxyTour');
  if (btnGalaxyTour) {
    btnGalaxyTour.addEventListener('click', () => {
      galaxyTouring = !galaxyTouring;
      galaxyTourTimer = 0;
      galaxyTourIdx = 0;
      btnGalaxyTour.textContent = galaxyTouring ? 'Stop tour' : 'Auto tour (Galaxy)';
      if (galaxyTouring) {
        const dest = galaxyTourSeq[galaxyTourIdx];
        const galaxyFocus = document.getElementById('galaxyFocus');
        if (galaxyFocus) galaxyFocus.value = dest;
        if (dest === 'core') { focusGalaxyCenter(); setGalaxyInfo('core'); }
        if (dest === 'sun') { focusGalaxySun(); setGalaxyInfo('sun'); }
        if (dest === 'wide') { resetGalaxyView(); setGalaxyInfo('wide'); }
      }
      saveSettings();
    });
  }

  // Label scale
  if (labelScaleEl) {
    const applyLabelScale = () => {
      const pct = parseInt(labelScaleEl.value, 10);
      labelSizeMultiplier = THREE.MathUtils.clamp(pct / 100, 0.5, 3.0);
      if (labelScaleVal) labelScaleVal.textContent = `${pct}%`;
    };
    
    labelScaleEl.addEventListener('input', () => {
      applyLabelScale();
    });
    
    applyLabelScale();
  }

  // Mouse interaction
  const pointerDownHandler = (evt) => {
    try {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      
      const hits = raycaster.intersectObjects(selectables, false);
      
      if (hits.length > 0) {
        const mesh = hits[0].object;
        if (mesh && mesh.userData && typeof mesh.userData.name === 'string') {
          const name = mesh.userData.name;
          if (focusSelect) {
            const optionExists = Array.from(focusSelect.options).some(
              option => option.value === name
            );
            if (optionExists) {
              focusSelect.value = name;
            }
          }
          focusOn(name);
        }
      }

      // Galaxy interactions: click Sun marker or Core
      if (mode === 'galaxy') {
        const galaxyTargets = [sunMilky, accretionDisk, bulge, ...(spiralArms || [])].filter(Boolean);
        if (galaxyTargets.length) {
          const ghits = raycaster.intersectObjects(galaxyTargets, false);
          if (ghits.length > 0) {
            const obj = ghits[0].object;
            if (obj === sunMilky) {
              if (galaxyFocus) galaxyFocus.value = 'sun';
              focusGalaxySun();
              setGalaxyInfo('sun');
            } else if (obj.userData && obj.userData.isArmLabel) {
              // Focus near the clicked arm label
              focusGalaxyAt(obj.position);
              setGalaxyInfo('wide');
              const sel = document.getElementById('galaxyFocus');
              if (sel) sel.value = 'wide';
            } else {
              if (galaxyFocus) galaxyFocus.value = 'core';
              focusGalaxyCenter();
              setGalaxyInfo('core');
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in pointer down handler:', error);
    }
  };
  
  if (renderer && renderer.domElement) {
    renderer.domElement.addEventListener("pointerdown", pointerDownHandler);
  }

  // (Screenshot feature removed)

  // Resize handler with improved mobile support
  window.addEventListener("resize", () => {
    if (camera) {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    }
    if (renderer) {
      // Re-evaluate DPR and size on resize/orientation change for mobile clarity
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    // Enhanced accordion handling for mobile orientation changes
    if (isTouchDevice()) {
      // Delay accordion defaults application to ensure smooth transition
      setTimeout(() => {
        applyAccordionDefaults();
      }, 300);
    } else {
      // Re-apply accordion defaults on orientation change unless user changed them
      applyAccordionDefaults();
    }
  });
  
  // Add orientation change handler for mobile devices
  if ('onorientationchange' in window) {
    window.addEventListener('orientationchange', () => {
      // Delay handling to ensure viewport has settled
      setTimeout(() => {
        if (camera) {
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
        }
        if (renderer) {
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
          renderer.setSize(window.innerWidth, window.innerHeight);
        }
        applyAccordionDefaults();
      }, 500);
    });
  }
}

init();

// Accordion helpers: default open on desktop, collapsed on mobile.
function setupAccordions() {
  const acc = Array.from(document.querySelectorAll('details.accordion'));
  acc.forEach(d => {
    // Enhanced toggle event handling with touch support
    d.addEventListener('toggle', () => {
      // mark as user-toggled to avoid overriding on resize
      d.dataset.userSet = '1';
    });
    
    // Add touch event handling for better mobile interaction
    const summary = d.querySelector('summary');
    if (summary) {
      // Prevent double-tap zoom on mobile
      summary.addEventListener('touchend', (e) => {
        e.preventDefault();
        // Use a small delay to ensure proper accordion toggle
        setTimeout(() => {
          d.open = !d.open;
          d.dataset.userSet = '1';
        }, 10);
      }, { passive: false });
      
      // Add visual feedback for touch
      summary.addEventListener('touchstart', () => {
        summary.style.opacity = '0.7';
      });
      
      summary.addEventListener('touchend', () => {
        setTimeout(() => {
          summary.style.opacity = '';
        }, 150);
      });
      
      summary.addEventListener('touchcancel', () => {
        summary.style.opacity = '';
      });
    }
  });
  _accordionInitialized = true;
  applyAccordionDefaults();
}

function applyAccordionDefaults() {
  if (!_accordionInitialized) return;
  // Improved mobile detection: consider both width and touch capability
  const isMobile = window.innerWidth <= 800 || ('ontouchstart' in window && window.innerWidth <= 1024);
  const shouldOpen = !isMobile;
  const acc = Array.from(document.querySelectorAll('details.accordion'));
  acc.forEach(d => {
    if (d.dataset.userSet === '1') return;
    d.open = shouldOpen;
  });
}

// Helper function to detect if device is actually mobile/touch
function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
}
