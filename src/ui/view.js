// View handling
import { camera } from './mode.js';
import { controls } from './mode.js';
import { SOLAR_MAX_DIST } from '../scene/solarSystem.js';

export function resetSolarView() {
  frameSolarSystem();
}

export function resetGalaxyView() {
  if (camera) {
    camera.position.set(0, 120, 280);
    if (controls) {
      controls.target.set(0, 0, 0);
      controls.update();
    }
  }
}

export function frameSolarSystem(padding = 1.8) {
  if (!camera || !controls) return;
  
  // Simple position that shows all planets clearly
  camera.position.set(0, 60, 150);
  controls.target.set(0, 0, 0);
  controls.update();
}