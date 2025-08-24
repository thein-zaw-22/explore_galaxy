// UI event handlers
import * as THREE from 'three';
import { updateAllLabelScales } from './labels.js';
import { setMode } from './mode.js';
import { focusOn, focusGalaxyCenter, focusGalaxySun, camLerp, camFromPos, camToPos, targetFrom, targetTo, tourTimer, tourIndex, orbitLines, planetsData, SOLAR_MAX_DIST, labels, solarGroup, galaxyGroup, camera, controls } from './focus.js';

export function setupEventHandlers({
  // UI elements
  elSpeed,
  elSpeedVal,
  elShowOrbits,
  elShowLabels,
  btnSolar,
  btnGalaxy,
  resetView,
  
  // Selection UI
  focusSelect,
  btnPlay,
  btnTour,
  
  // Galaxy controls
  galaxyFocus,
  galaxyAutoRotateEl,
  galaxySpin,
  galaxySpinVal,
  starBrightnessEl,
  starBrightnessVal,
  labelScaleEl,
  labelScaleVal,
  
  // UI state
  timeSpeed,
  showLabelsDefault,
  labelSizeMultiplier
}) {
  // Speed control
  if (elSpeed) {
    elSpeed.addEventListener("input", () => {
      timeSpeed = parseInt(elSpeed.value, 10) || 0;
      if (elSpeedVal) elSpeedVal.textContent = "× " + timeSpeed;
    });
    if (elSpeedVal) elSpeedVal.textContent = "× " + timeSpeed;
  }

  // Orbit visibility
  if (elShowOrbits) {
    elShowOrbits.addEventListener("change", () => {
      orbitLines.forEach((l) => (l.visible = elShowOrbits.checked));
    });
  }

  // Label visibility
  if (elShowLabels) {
    elShowLabels.addEventListener("change", () => {
      const vis = !!elShowOrbits.checked;
      labels.forEach((l) => (l.visible = vis));
      if (sunMilkyLabel) sunMilkyLabel.visible = vis;
      if (centerLabel) centerLabel.visible = vis;
    });
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

  // Play/Pause
  let playing = true;
  if (btnPlay) {
    btnPlay.addEventListener("click", () => {
      playing = !playing;
      btnPlay.textContent = playing ? "⏸ Pause" : "▶ Play";
    });
  }

  // Focus selection
  if (focusSelect) {
    focusSelect.addEventListener("change", () => {
      focusOn(focusSelect.value);
    });
  }

  // Auto tour
  let touring = false;
  const tourOrder = ["Mercury","Venus","Earth","Mars","Jupiter","Saturn","Uranus","Neptune"];
  
  if (btnTour) {
    btnTour.addEventListener("click", () => {
      touring = !touring;
      tourIndex = 0;
      btnTour.textContent = touring ? "Stop tour" : "Auto tour";
      if (touring) focusOn(tourOrder[tourIndex]);
    });
  }

  // Galaxy focus
  if (galaxyFocus) {
    galaxyFocus.addEventListener('change', () => {
      const v = galaxyFocus.value;
      if (v === 'core') focusGalaxyCenter();
      else if (v === 'sun') focusGalaxySun();
      else resetGalaxyView();
    });
  }

  // Galaxy auto-rotate
  if (galaxyAutoRotateEl) {
    galaxyAutoRotate = !!galaxyAutoRotateEl.checked;
    galaxyAutoRotateEl.addEventListener('change', () => {
      galaxyAutoRotate = !!galaxyAutoRotateEl.checked;
    });
  }

  // Galaxy spin speed
  if (galaxySpin) {
    const setSpinLabel = () => {
      if (galaxySpinVal) galaxySpinVal.textContent = `× ${(galaxyRotationSpeed / 0.01).toFixed(1)}`;
    };
    
    galaxySpin.addEventListener('input', () => {
      const v = parseInt(galaxySpin.value, 10); // 0..20
      galaxyRotationSpeed = (v / 20) * 0.02; // 0..0.02
      setSpinLabel();
    });
    
    setSpinLabel();
  }

  // Star brightness
  if (starBrightnessEl) {
    const applyBrightness = () => {
      const pct = parseInt(starBrightnessEl.value, 10); // 30..130
      starBrightness = THREE.MathUtils.clamp(pct / 100, 0.3, 1.3);
      if (galaxyPoints && galaxyPoints.material) {
        galaxyPoints.material.opacity = Math.min(1.0, starBrightness);
        galaxyPoints.material.needsUpdate = true;
      }
      if (starBrightnessVal) starBrightnessVal.textContent = `${parseInt(starBrightnessEl.value, 10)}%`;
    };
    
    starBrightnessEl.addEventListener('input', applyBrightness);
    applyBrightness();
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
      updateAllLabelScales();
    });
    
    applyLabelScale();
  }

  // Info panel
  const infoPanel = document.getElementById("infoPanel");
  const infoTitle = document.getElementById("infoTitle");
  
  export function setInfoFor(name, meta) {
    if (!infoPanel) return;
    infoTitle.textContent = name;
    const body = infoPanel.querySelector(".info-body");
    if (name === "Sun" || !meta) {
      body.innerHTML = `
        <div><b>Type:</b> G‑type main-sequence star</div>
        <div><b>Distance from Sun:</b> —</div>
        <div><b>Orbital period:</b> —</div>
        <div class="hint">Tip: click a planet or use the Focus dropdown</div>
      `;
    } else {
      body.innerHTML = `
        <div><b>Distance from Sun:</b> ${meta.au} AU (stylized distance in scene)</div>
        <div><b>Orbital period:</b> ~${meta.periodDays.toLocaleString()} days</div>
        <div>${meta.desc}</div>
      `;
    }
  }
  
  setInfoFor("Sun");

  // Resize handler
  window.addEventListener("resize", () => {
    if (camera) {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    }
    if (renderer) {
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
  });

  // Pointer down handler
  const pointerDownHandler = (evt) => {
    try {
      if (!renderer || !renderer.domElement) return;
      
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      
      const hits = raycaster.intersectObjects(selectables, false);
      
      if (hits.length > 0) {
        const mesh = hits[0].object;
        
        // Ensure mesh and userData are defined
        if (mesh && mesh.userData && typeof mesh.userData.name === 'string') {
          const name = mesh.userData.name;
          
          // Update UI if focusSelect exists
          if (focusSelect && focusSelect.options) {
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
    } catch (error) {
      console.error('Error in pointer down handler:', error);
    }
  };
  
  if (renderer && renderer.domElement) {
    renderer.domElement.addEventListener("pointerdown", pointerDownHandler);
  }

  return {
    pointerDownHandler,
    touring,
    tourTimer,
    tourIndex,
    galaxyAutoRotate,
    galaxyRotationSpeed,
    starBrightness,
    labelSizeMultiplier
  };
}