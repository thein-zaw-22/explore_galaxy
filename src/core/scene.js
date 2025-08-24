// Scene setup
/* global THREE */

export function createScene() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05070f, 0.0015);
  
  return scene;
}