// Lights setup
/* global THREE */

export function createLights() {
  // Sun light
  const sunLight = new THREE.PointLight(0xffffff, 2, 0, 2);
  sunLight.position.set(0, 0, 0);
  
  // Ambient light
  const ambient = new THREE.AmbientLight(0x22334a, 0.6);
  
  return { sunLight, ambient };
}