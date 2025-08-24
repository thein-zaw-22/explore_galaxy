// Camera setup
/* global THREE */

export function createCamera() {
  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    5000
  );
  
  // Simple position that shows all planets clearly - empirically tested
  camera.position.set(0, 60, 150);
  
  return camera;
}