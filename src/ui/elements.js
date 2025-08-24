// UI elements
export function getUIElements() {
  // UI elements
  const elSpeed = document.getElementById("speed") || null;
  const elSpeedVal = document.getElementById("speedVal") || null;
  const elShowOrbits = document.getElementById("showOrbits") || null;
  const elShowLabels = document.getElementById("showLabels") || null;
  const btnSolar = document.getElementById("btnSolar") || null;
  const btnGalaxy = document.getElementById("btnGalaxy") || null;
  const modePill = document.getElementById("modePill") || null;
  const legendTitle = document.getElementById("legendTitle") || null;
  const legendList = document.getElementById("legendList") || null;
  const resetView = document.getElementById("resetView") || null;

  // Selection UI
  const focusSelect = document.getElementById("focusSelect") || null;
  const followSelection = document.getElementById("followSelection") || null;
  const btnPlay = document.getElementById("btnPlay") || null;
  const btnTour = document.getElementById("btnTour") || null;

  // Galaxy controls
  const uiRoot = document.getElementById("ui") || null;
  const galaxyFocus = document.getElementById("galaxyFocus") || null;
  const galaxyAutoRotateEl = document.getElementById("galaxyAutoRotate") || null;
  const galaxySpin = document.getElementById("galaxySpin") || null;
  const galaxySpinVal = document.getElementById("galaxySpinVal") || null;
  const starBrightnessEl = document.getElementById("starBrightness") || null;
  const starBrightnessVal = document.getElementById("starBrightnessVal") || null;
  
  // Label size control
  const labelScaleEl = document.getElementById("labelScale") || null;
  const labelScaleVal = document.getElementById("labelScaleVal") || null;
  let labelSizeMultiplier = labelScaleEl ? (parseInt(labelScaleEl.value, 10) / 100) : 1.6;

  // Safe defaults
  let timeSpeed = elSpeed ? parseInt(elSpeed.value, 10) : 40;
  const showOrbitsDefault = elShowOrbits ? !!elShowOrbits.checked : true;
  const showLabelsDefault = elShowLabels ? !!elShowLabels.checked : true;
  const tourOrder = ["Mercury","Venus","Earth","Mars","Jupiter","Saturn","Uranus","Neptune"];

  return {
    // UI elements
    elSpeed,
    elSpeedVal,
    elShowOrbits,
    elShowLabels,
    btnSolar,
    btnGalaxy,
    modePill,
    legendTitle,
    legendList,
    resetView,
    
    // Selection UI
    focusSelect,
    followSelection,
    btnPlay,
    btnTour,
    
    // Galaxy controls
    uiRoot,
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
    showOrbitsDefault,
    showLabelsDefault,
    labelSizeMultiplier,
    tourOrder
  };
}