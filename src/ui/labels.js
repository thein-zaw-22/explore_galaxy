// Label handling
/* global THREE */

export const updateAllLabelScales = (camera, labelSizeMultiplier, labels, sunMilkyLabel, centerLabel, armLabels) => {
  if (!camera) return;
  
  const tmp = new THREE.Vector3();
  const resize = (spr) => {
    if (!spr || !spr.userData || !spr.userData.label) return;
    spr.getWorldPosition(tmp);
    const d = camera.position.distanceTo(tmp);
    const factor = THREE.MathUtils.clamp((260 / d) * labelSizeMultiplier, 0.4, 8.0);
    const { w, h, unit } = spr.userData.label;
    spr.scale.set(w * unit * factor, h * unit * factor, 1);
  };
  
  if (labels) {
    for (let i = 0; i < labels.length; i++) resize(labels[i]);
  }
  if (sunMilkyLabel) resize(sunMilkyLabel);
  if (centerLabel) resize(centerLabel);
  if (armLabels && armLabels.length) {
    for (let i = 0; i < armLabels.length; i++) resize(armLabels[i]);
  }
};
