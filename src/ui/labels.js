// Label handling
/* global THREE */

export const updateAllLabelScales = (
  camera,
  labelSizeMultiplier,
  labels,
  sunMilkyLabel,
  centerLabel,
  armLabels,
  opts = {}
) => {
  if (!camera) return;
  
  const {
    solarBase = 260,
    solarMin = 0.4,
    solarMax = 2.6,
    galaxyBase = 360,
    galaxyMin = 0.6,
    galaxyMax = 3.4,
    // Allow distinct tuning for arm labels (fallbacks to general galaxy values)
    galaxyArmBase,
    galaxyArmMin,
    galaxyArmMax
  } = opts;

  const tmp = new THREE.Vector3();
  const resize = (spr, base, min, max) => {
    if (!spr || !spr.userData || !spr.userData.label) return;
    spr.getWorldPosition(tmp);
    const d = camera.position.distanceTo(tmp);
    // Mode-aware dynamic scaling: slightly larger baseline and minimum for galaxy labels
    const factor = THREE.MathUtils.clamp((base / d) * labelSizeMultiplier, min, max);
    const { w, h, unit } = spr.userData.label;
    spr.scale.set(w * unit * factor, h * unit * factor, 1);
  };
  
  // Solar system labels
  if (labels) {
    for (let i = 0; i < labels.length; i++) resize(labels[i], solarBase, solarMin, solarMax);
  }
  // Galaxy labels
  if (sunMilkyLabel) resize(sunMilkyLabel, galaxyBase, galaxyMin, galaxyMax);
  if (centerLabel) resize(centerLabel, galaxyBase, galaxyMin, galaxyMax);
  if (armLabels && armLabels.length) {
    const aBase = galaxyArmBase ?? galaxyBase;
    const aMin = galaxyArmMin ?? galaxyMin;
    const aMax = galaxyArmMax ?? galaxyMax;
    for (let i = 0; i < armLabels.length; i++) resize(armLabels[i], aBase, aMin, aMax);
  }
};
