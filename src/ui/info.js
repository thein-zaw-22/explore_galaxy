// Enhanced info panel handling
export function updateLegend(mode) {
  const legendTitle = document.getElementById("legendTitle");
  const legendList = document.getElementById("legendList");
  
  if (mode === "solar") {
    if (legendTitle) legendTitle.textContent = "Solar System quick facts";
    if (legendList) legendList.innerHTML = `
      <li>Sizes & distances are <b>not to scale</b> (compressed for visibility).</li>
      <li>Earth orbits the Sun in ~365 days; Neptune ~165 years.</li>
      <li>Saturn ring stylized; orbits shown as guides.</li>`;
  } else {
    if (legendTitle) legendTitle.textContent = "Milky Way Galaxy facts";
    if (legendList) legendList.innerHTML = `
      <li><b>Diameter:</b> ~100,000 light-years across the spiral disk.</li>
      <li><b>Thickness:</b> ~1,000 light-years in the disk, ~12,000 ly in the bulge.</li>
      <li><b>Stars:</b> 200-400 billion stars in various stellar populations.</li>
      <li><b>Sol Location:</b> Orion Arm, ~26,000 ly from galactic center.</li>
      <li><b>Rotation:</b> Sol orbits the galaxy every ~225-250 million years.</li>
      <li><b>Central Object:</b> Sagittarius A* - supermassive black hole (4M solar masses).</li>`;
  }
}

export function setInfoFor(name, meta) {
  const infoPanel = document.getElementById("infoPanel");
  const infoTitle = document.getElementById("infoTitle");
  
  if (!infoPanel || !infoTitle) return;
  
  infoTitle.textContent = name;
  const body = infoPanel.querySelector(".info-body");
  
  if (name === "Sun" || !meta) {
    if (body) body.innerHTML = `
      <div><b>Type:</b> G-type main-sequence star</div>
      <div><b>Distance from Sun:</b> —</div>
      <div><b>Orbital period:</b> —</div>
      <div class="hint">Tip: click a planet or use the Focus dropdown</div>
    `;
  } else {
    if (body) body.innerHTML = `
      <div><b>Distance from Sun:</b> ${meta.au} AU (stylized distance in scene)</div>
      <div><b>Orbital period:</b> ~${meta.periodDays.toLocaleString()} days</div>
      <div>${meta.desc}</div>
    `;
  }
}

// New function for galaxy-specific information
export function setGalaxyInfo(focusType) {
  const infoPanel = document.getElementById("infoPanel");
  const infoTitle = document.getElementById("infoTitle");
  
  if (!infoPanel || !infoTitle) return;
  
  const body = infoPanel.querySelector(".info-body");
  
  switch(focusType) {
    case 'core':
      infoTitle.textContent = "Sagittarius A*";
      if (body) body.innerHTML = `
        <div><b>Type:</b> Supermassive black hole</div>
        <div><b>Mass:</b> ~4.1 million solar masses</div>
        <div><b>Distance from Sol:</b> ~26,000 light-years</div>
        <div><b>Discovery:</b> Radio source detected 1974, black hole confirmed 2002</div>
        <div class="hint">The gravitational center of our galaxy</div>
      `;
      break;
      
    case 'sun':
      infoTitle.textContent = "Sol System";
      if (body) body.innerHTML = `
        <div><b>Location:</b> Orion Arm (Local Spur)</div>
        <div><b>Galactic coordinates:</b> ~26,000 ly from center</div>
        <div><b>Orbital velocity:</b> ~220 km/s around galactic center</div>
        <div><b>Galactic year:</b> ~225-250 million Earth years</div>
        <div class="hint">Our home in the galaxy's suburbs</div>
      `;
      break;
      
    case 'wide':
    default:
      infoTitle.textContent = "Milky Way Galaxy";
      if (body) body.innerHTML = `
        <div><b>Type:</b> Barred spiral galaxy (SBbc)</div>
        <div><b>Diameter:</b> ~100,000 light-years</div>
        <div><b>Stellar mass:</b> ~60 billion solar masses</div>
        <div><b>Total mass:</b> ~1.5 trillion solar masses (including dark matter)</div>
        <div class="hint">Our cosmic island home to 200-400 billion stars</div>
      `;
      break;
  }
}