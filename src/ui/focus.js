/* Focus and camera helpers */
/* global THREE */
import { setInfoFor } from './info.js';

export const focusState = {
  focused: 'Sun',
  camLerp: 0,
  camFromPos: new THREE.Vector3(),
  camToPos: new THREE.Vector3(),
  targetFrom: new THREE.Vector3(),
  targetTo: new THREE.Vector3(0,0,0)
};

let camera, controls, orbitLines = [], planetsData = [], planets = [], solarMaxDist = 0, sunMilky = null;

export function initFocus(opts) {
  camera = opts.camera;
  controls = opts.controls;
  orbitLines = opts.orbitLines || [];
  planetsData = opts.planetsData || [];
  planets = opts.planets || [];
  solarMaxDist = opts.solarMaxDist || 0;
  sunMilky = opts.sunMilky || null;
}

function findPlanetByName(name) {
  return planets.find(p => p.userData && p.userData.name === name);
}

export function focusOn(name) {
  const { camFromPos, camToPos, targetFrom, targetTo } = focusState;
  focusState.focused = name;
  orbitLines.forEach((line, i) => {
    const on = (planetsData[i].name === name);
    line.material.opacity = on ? 0.95 : 0.25;
    line.material.color.setHex(on ? 0xaad4ff : 0x355079);
    line.material.needsUpdate = true;
  });

  const meta = planetsData.find(p => p.name === name);
  setInfoFor(name, meta);

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
      grd.addColorStop(0,'rgba(120,180,255,0)');
      grd.addColorStop(0.5,'rgba(120,180,255,0.7)');
      grd.addColorStop(1,'rgba(120,180,255,0)');
      g.fillStyle = grd; g.fillRect(0,0,128,16);
      const tex = new THREE.CanvasTexture(c); tex.minFilter = THREE.LinearFilter; tex.premultiplyAlpha = true;
      const ringMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite:false, opacity:0.9, side:THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.name = 'focusHalo';
      ring.rotation.x = Math.PI/2;
      mesh.add(ring);
    }
  }

  focusState.camLerp = 0;
  camFromPos.copy(camera.position);
  targetFrom.copy(controls.target);

  const distScale = getCamDistScale();
  if (name === 'Sun') {
    targetTo.set(0,0,0);
    const r = Math.max(20, solarMaxDist || Math.max(...planetsData.map(p => p.dist), 42)) * distScale;
    camToPos.set(0, r*1.25, r*3.1);
  } else {
    const mesh = findPlanetByName(name);
    if (mesh) {
      targetTo.copy(mesh.position);
      const back = new THREE.Vector3().copy(mesh.position).normalize().multiplyScalar((6 + mesh.geometry.parameters.radius * 8) * distScale);
      camToPos.copy(mesh.position)
        .add(new THREE.Vector3(0.6,0.6,0.6).multiplyScalar(6 * distScale))
        .add(back);
    }
  }
}

export function focusGalaxyCenter() {
  const { camFromPos, camToPos, targetFrom, targetTo } = focusState;
  focusState.camLerp = 0;
  camFromPos.copy(camera.position);
  targetFrom.copy(controls.target);
  const distScale = getCamDistScale();
  targetTo.set(0,0,0);
  camToPos.set(0, 45 * distScale, 120 * distScale);
}

export function focusGalaxySun() {
  const { camFromPos, camToPos, targetFrom, targetTo } = focusState;
  focusState.camLerp = 0;
  camFromPos.copy(camera.position);
  targetFrom.copy(controls.target);
  const distScale = getCamDistScale();
  if (sunMilky) {
    targetTo.copy(sunMilky.position);
    const sunPos = sunMilky.position.clone();
    const sunRadius = Math.sqrt(sunPos.x*sunPos.x + sunPos.z*sunPos.z) || 80;
    const offsetDistance = THREE.MathUtils.clamp(sunRadius * 0.35, 20, 40) * distScale;
    const heightOffset = THREE.MathUtils.clamp(sunRadius * 0.16, 12, 22) * distScale;
    camToPos.set(sunPos.x + offsetDistance * 0.7, sunPos.y + heightOffset, sunPos.z + offsetDistance * 0.7);
  } else {
    focusGalaxyCenter();
  }
}

export function focusGalaxyAt(pos) {
  const { camFromPos, camToPos, targetFrom, targetTo } = focusState;
  focusState.camLerp = 0;
  camFromPos.copy(camera.position);
  targetFrom.copy(controls.target);
  targetTo.copy(pos);
  const dir = new THREE.Vector3(pos.x,0,pos.z);
  if (dir.lengthSq() === 0) dir.set(1,0,0);
  dir.normalize();
  const distScale = getCamDistScale();
  const offsetDistance = 38 * distScale;
  const heightOffset = 18 * distScale;
  camToPos.set(pos.x + dir.x*offsetDistance, pos.y + heightOffset, pos.z + dir.z*offsetDistance);
}

export function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
}

export function getCamDistScale() {
  const narrow = window.innerWidth <= 800 || (isTouchDevice() && window.innerWidth <= 1024);
  return narrow ? Math.max(0.5, window.innerWidth / 800) : 1;
}

export const CAM_TIME = 0.9;

