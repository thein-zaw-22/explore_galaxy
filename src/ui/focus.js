// Focus handling
import { camera } from './mode.js';
import { controls } from './mode.js';
import { SOLAR_MAX_DIST } from '../scene/solarSystem.js';

export let focused = "Sun";
export let camLerp = 0;
export const CAM_TIME = 0.9; // seconds
export let camFromPos = new THREE.Vector3();
export let camToPos = new THREE.Vector3();
export let targetFrom = new THREE.Vector3();
export let targetTo = new THREE.Vector3(0,0,0);
export let orbitLines = [];
export let planetsData = [];

export function focusOn(name) {
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
    // Simple position that shows all planets clearly
    camToPos.set(0, 60, 150);
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

export function focusGalaxyCenter() {
  camLerp = 0;
  camFromPos.copy(camera.position);
  targetFrom.copy(controls.target);
  targetTo.set(0, 0, 0);
  camToPos.set(0, 60, 160);
}

export function focusGalaxySun() {
  camLerp = 0;
  camFromPos.copy(camera.position);
  targetFrom.copy(controls.target);
  
  if (sunMilky) {
    targetTo.copy(sunMilky.position);
    camToPos.copy(sunMilky.position).add(new THREE.Vector3(0, 24, 60));
  } else {
    focusGalaxyCenter();
  }
}