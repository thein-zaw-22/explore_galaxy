// Mode handling
import { resetSolarView, resetGalaxyView } from './view.js';
import { updateLegend } from './info.js';

export let mode = "solar";
export let solarGroup = null;
export let galaxyGroup = null;
export let camera = null;
export let controls = null;

export function setMode(next, scene, cameraInstance, controlsInstance) {
  mode = next;
  solarGroup = scene.getObjectByName("solarGroup");
  galaxyGroup = scene.getObjectByName("galaxyGroup");
  camera = cameraInstance;
  controls = controlsInstance;
  
  const solar = mode === "solar";
  if (solarGroup) solarGroup.visible = solar;
  if (galaxyGroup) galaxyGroup.visible = !solar;
  
  if (modePill) modePill.textContent = solar ? "Solar System" : "Milky Way";
  if (btnSolar) btnSolar.classList.toggle("active", solar);
  if (btnGalaxy) btnGalaxy.classList.toggle("active", !solar);
  if (uiRoot) uiRoot.setAttribute('data-mode', solar ? 'solar' : 'galaxy');

  if (solar) {
    camera.near = 0.1; camera.far = 5000; camera.updateProjectionMatrix();
    controls.minDistance = 5; controls.maxDistance = 800;
    
    // Update legend
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
    
    // Update legend
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