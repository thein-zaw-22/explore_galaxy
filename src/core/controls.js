// Controls setup
/* global THREE */

export class BasicOrbitControls {
  constructor(object, domElement){
    this.object = object;
    this.domElement = domElement;
    this.target = new THREE.Vector3();
    this.enableDamping = true;
    this.dampingFactor = 0.05;
    this.minDistance = 5;
    this.maxDistance = 800;

    this._spherical = new THREE.Spherical();
    this._spherical.setFromVector3(this.object.position.clone().sub(this.target));
    this._rotateSpeed = 0.0025;
    this._panSpeed = 0.0025;
    this._zoomScale = 1.0;
    this._deltaTheta = 0;
    this._deltaPhi = 0;
    this._panOffset = new THREE.Vector3();

    this._state = 'none'; // 'rotate' | 'pan' | 'none'
    this._pointer = new THREE.Vector2();

    this._onPointerDown = (e) => {
      e.preventDefault();
      this.domElement.setPointerCapture(e.pointerId || 1);
      if (e.button === 2 || (e.button === 0 && e.ctrlKey)) this._state = 'pan';
      else this._state = 'rotate';
      this._pointer.set(e.clientX, e.clientY);
    };
    this._onPointerMove = (e) => {
      if (this._state === 'none') return;
      const dx = e.clientX - this._pointer.x;
      const dy = e.clientY - this._pointer.y;
      this._pointer.set(e.clientX, e.clientY);
      if (this._state === 'rotate') {
        this._deltaTheta -= dx * this._rotateSpeed;
        this._deltaPhi   -= dy * this._rotateSpeed;
      } else if (this._state === 'pan') {
        // Pan parallel to screen
        const offset = new THREE.Vector3();
        offset.copy(this.object.position).sub(this.target);
        const targetDistance = offset.length();
        const panX = (-dx * this._panSpeed) * (targetDistance / 50);
        const panY = (dy * this._panSpeed) * (targetDistance / 50);
        const te = this.object.matrix.elements;
        const xAxis = new THREE.Vector3(te[0], te[1], te[2]);
        const yAxis = new THREE.Vector3(te[4], te[5], te[6]);
        xAxis.multiplyScalar(panX);
        yAxis.multiplyScalar(panY);
        this._panOffset.add(xAxis).add(yAxis);
      }
    };
    this._onPointerUp = (e) => {
      this._state = 'none';
      try { this.domElement.releasePointerCapture(e.pointerId || 1); } catch(_){}
    };
    this._onWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 1.05 : 0.95;
      this._zoomScale *= delta;
    };

    domElement.addEventListener('pointerdown', this._onPointerDown);
    domElement.addEventListener('pointermove', this._onPointerMove);
    domElement.addEventListener('pointerup', this._onPointerUp);
    domElement.addEventListener('wheel', this._onWheel, { passive: false });
  }
  update(){
    // Apply zoom
    const offset = new THREE.Vector3().copy(this.object.position).sub(this.target);
    const radius = offset.length() * this._zoomScale;
    this._zoomScale = 1.0;

    // Apply rotation
    this._spherical.setFromVector3(offset);
    this._spherical.theta += this._deltaTheta;
    this._spherical.phi += this._deltaPhi;
    const EPS = 1e-6;
    this._spherical.phi = Math.max(EPS, Math.min(Math.PI - EPS, this._spherical.phi));
    this._spherical.radius = THREE.MathUtils.clamp(radius, this.minDistance, this.maxDistance);

    // Damping on deltas
    if (this.enableDamping) {
      this._deltaTheta *= (1 - this.dampingFactor);
      this._deltaPhi   *= (1 - this.dampingFactor);
      this._panOffset.multiplyScalar(1 - this.dampingFactor);
    } else {
      this._deltaTheta = 0;
      this._deltaPhi = 0;
      this._panOffset.set(0,0,0);
    }

    // Apply pan to target
    this.target.add(this._panOffset);

    // Compute new camera position
    const newPos = new THREE.Vector3().setFromSpherical(this._spherical).add(this.target);
    this.object.position.copy(newPos);
    this.object.lookAt(this.target);
  }
}