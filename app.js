const table = document.getElementById("periodicTable");
const infoPanel = document.getElementById("infoPanel");
const tooltip = document.getElementById("tooltip");
const temperatureRange = document.getElementById("temperatureRange");
const temperatureValue = document.getElementById("temperatureValue");
const temperatureState = document.getElementById("temperatureState");
const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("searchResults");
const groupFilters = document.getElementById("groupFilters");
const stateFilters = document.getElementById("stateFilters");
const blockFilters = document.getElementById("blockFilters");
const radioactiveToggle = document.getElementById("radioactiveToggle");
const toggleFilters = document.getElementById("toggleFilters");
const toggleMotion = document.getElementById("toggleMotion");
const toggleContrast = document.getElementById("toggleContrast");
const tableWrapper = document.getElementById("tableWrapper");

const elementName = document.getElementById("elementName");
const elementSymbol = document.getElementById("elementSymbol");
const atomicNumber = document.getElementById("atomicNumber");
const atomicMass = document.getElementById("atomicMass");
const groupNumber = document.getElementById("groupNumber");
const periodNumber = document.getElementById("periodNumber");
const category = document.getElementById("category");
const electronConfig = document.getElementById("electronConfig");
const physicalProperties = document.getElementById("physicalProperties");
const chemicalProperties = document.getElementById("chemicalProperties");
const usageGrid = document.getElementById("usageGrid");
const elementImage = document.getElementById("elementImage");
const closePanel = document.getElementById("closePanel");
const resetModel = document.getElementById("resetModel");
const toggleModel = document.getElementById("toggleModel");

const groupColors = {
  "alkali metal": "#ff5d5d",
  "alkaline earth metal": "#ffbc64",
  "transition metal": "#35d0ff",
  "post-transition metal": "#3dd2c8",
  metalloid: "#8cf0ff",
  halogen: "#3dff8f",
  "noble gas": "#b45bff",
  lanthanide: "#ff8ce5",
  actinide: "#ff6fae",
  "diatomic nonmetal": "#8dfc68",
  "polyatomic nonmetal": "#8dfc68",
  unknown: "#7f8fa6",
};

const usageIcons = ["⚡", "💊", "🛰️", "🏭", "🌱", "🔬"];

let elements = [];
let activeFilters = {
  state: null,
  group: null,
  block: null,
  radioactive: false,
};

let bohrMode = true;
let scene;
let camera;
let renderer;
let modelGroup;
let animationId;
let resizeHandler;

function getStateFromTemperature(element, temp) {
  const melting = element.melt ?? null;
  const boiling = element.boil ?? null;
  if (melting === null || boiling === null) {
    return element.phase?.toLowerCase() || "unknown";
  }
  if (temp < melting) return "solid";
  if (temp >= melting && temp < boiling) return "liquid";
  return "gas";
}

function getTemperatureLabel(temp) {
  if (temp <= -200) return "Cryogenic";
  if (temp < 0) return "Sub-zero";
  if (temp < 300) return "Ambient";
  if (temp < 1000) return "Elevated";
  if (temp < 3000) return "Extreme";
  return "Stellar";
}

function buildGroupFilters() {
  const groups = new Set(elements.map((el) => el.category));
  groupFilters.innerHTML = "";
  groups.forEach((group) => {
    const button = document.createElement("button");
    button.textContent = group;
    button.dataset.filter = group;
    groupFilters.appendChild(button);
  });
}

function applyFilters() {
  const temp = Number(temperatureRange.value);
  const filtered = elements.filter((el) => {
    if (activeFilters.state) {
      const state = getStateFromTemperature(el, temp);
      if (state !== activeFilters.state) return false;
    }
    if (activeFilters.group && el.category !== activeFilters.group) return false;
    if (activeFilters.block && el.block !== activeFilters.block) return false;
    if (activeFilters.radioactive && !el.radioactive) return false;
    return true;
  });
  renderTable(filtered);
}

function renderTable(data) {
  table.innerHTML = "";
  table.classList.add("particle-layer");
  data.forEach((element) => {
    const tile = document.createElement("button");
    tile.className = "element";
    tile.style.gridColumn = element.xpos;
    tile.style.gridRow = element.ypos;
    const state = getStateFromTemperature(element, Number(temperatureRange.value));
    tile.dataset.state = state;
    const color = groupColors[element.category] || groupColors.unknown;
    tile.style.background = `linear-gradient(135deg, ${color}33, rgba(8, 12, 24, 0.9))`;
    tile.innerHTML = `
      <div class="number">${element.number}</div>
      <div class="symbol">${element.symbol}</div>
      <div class="name">${element.name}</div>
      <div class="state">${state}</div>
    `;
    tile.addEventListener("mouseenter", (event) => showTooltip(event, element, state));
    tile.addEventListener("mouseleave", hideTooltip);
    tile.addEventListener("click", () => selectElement(element));
    table.appendChild(tile);
  });
}

function showTooltip(event, element, state) {
  tooltip.style.opacity = "1";
  tooltip.textContent = `${element.name} · ${element.atomic_mass.toFixed(2)} u · ${state}`;
  tooltip.style.left = `${event.clientX + 12}px`;
  tooltip.style.top = `${event.clientY + 12}px`;
}

function hideTooltip() {
  tooltip.style.opacity = "0";
}

function selectElement(element) {
  infoPanel.classList.add("active");
  elementName.textContent = element.name;
  elementSymbol.textContent = element.symbol;
  atomicNumber.textContent = element.number;
  atomicMass.textContent = element.atomic_mass;
  groupNumber.textContent = element.group ?? "—";
  periodNumber.textContent = element.period;
  category.textContent = element.category;
  electronConfig.textContent = element.electron_configuration;

  physicalProperties.innerHTML = buildInfoCard("State", element.phase ?? "Unknown")
    + buildInfoCard("Density", element.density ? `${element.density} g/cm³` : "—")
    + buildInfoCard("Melting", element.melt ? `${element.melt} K` : "—")
    + buildInfoCard("Boiling", element.boil ? `${element.boil} K` : "—")
    + buildInfoCard("Atomic Radius", element.atomic_radius ? `${element.atomic_radius} pm` : "—")
    + buildInfoCard("Electronegativity", element.electronegativity_pauling ?? "—")
    + buildInfoCard("Thermal Cond.", element.thermal_conductivity ? `${element.thermal_conductivity} W/mK` : "—")
    + buildInfoCard("Electrical Cond.", element.electrical_conductivity ? `${element.electrical_conductivity} MS/m` : "—");

  chemicalProperties.innerHTML = buildInfoCard("Valency", element.valency ?? "—")
    + buildInfoCard("Oxidation", element.oxidation_states ?? "—")
    + buildInfoCard("Reactivity", element.reactivity ?? "Moderate")
    + buildInfoCard("Isotopes", element.isotopes ?? "Stable")
    + buildInfoCard("Radioactive", element.radioactive ? "Yes" : "No")
    + buildInfoCard("Common Compounds", element.compounds ?? "—");

  usageGrid.innerHTML = "";
  const usages = element.usage || ["Energy", "Medical", "Aerospace", "Industry", "Everyday", "Research"];
  usages.forEach((usage, index) => {
    const card = document.createElement("div");
    card.className = "usage-card";
    card.innerHTML = `<div>${usageIcons[index % usageIcons.length]}</div><span>${usage}</span>`;
    usageGrid.appendChild(card);
  });

  elementImage.src = element.image || `https://images.unsplash.com/flagged/photo-1576089172869-4f5f6f315620?auto=format&fit=crop&w=800&q=80`;

  buildModel(element.number);
}

function buildInfoCard(label, value) {
  return `<div class="info-card">${label}<span>${value}</span></div>`;
}

function buildModel(atomicNumberValue) {
  const canvasContainer = document.getElementById("modelCanvas");
  canvasContainer.innerHTML = "";
  if (renderer) {
    cancelAnimationFrame(animationId);
  }

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(45, canvasContainer.clientWidth / canvasContainer.clientHeight, 0.1, 1000);
  camera.position.set(0, 0, 8);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
  canvasContainer.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);
  const point = new THREE.PointLight(0x35d0ff, 1.2);
  point.position.set(5, 5, 5);
  scene.add(point);

  modelGroup = new THREE.Group();

  const nucleusGeometry = new THREE.SphereGeometry(0.9, 32, 32);
  const nucleusMaterial = new THREE.MeshStandardMaterial({ color: 0xff7b45, emissive: 0xff7b45, emissiveIntensity: 0.4 });
  const nucleus = new THREE.Mesh(nucleusGeometry, nucleusMaterial);
  modelGroup.add(nucleus);

  const electronCount = Math.min(atomicNumberValue, 24);
  for (let i = 0; i < electronCount; i += 1) {
    const angle = (i / electronCount) * Math.PI * 2;
    const radius = 1.8 + (i % 3) * 0.6;
    const electron = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x35d0ff, emissive: 0x35d0ff, emissiveIntensity: 0.6 })
    );
    electron.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, (i % 2) * 0.3);
    electron.userData = { angle, radius, speed: 0.01 + (i % 5) * 0.002 };
    modelGroup.add(electron);
  }

  scene.add(modelGroup);

  const controls = typeof THREE.OrbitControls === "function" ? new THREE.OrbitControls(camera, renderer.domElement) : null;
  if (controls) {
    controls.enableDamping = true;
  }

  if (resizeHandler) {
    window.removeEventListener("resize", resizeHandler);
  }
  const handleResize = () => {
    const { clientWidth, clientHeight } = canvasContainer;
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(clientWidth, clientHeight);
  };
  resizeHandler = handleResize;
  window.addEventListener("resize", handleResize, { passive: true });

  const animate = () => {
    modelGroup.children.forEach((child) => {
      if (child.userData?.speed) {
        child.userData.angle += child.userData.speed;
        child.position.x = Math.cos(child.userData.angle) * child.userData.radius;
        child.position.y = Math.sin(child.userData.angle) * child.userData.radius;
      }
    });
    if (controls) controls.update();
    renderer.render(scene, camera);
    animationId = requestAnimationFrame(animate);
  };
  animate();
}

function updateTemperature() {
  const temp = Number(temperatureRange.value);
  temperatureValue.textContent = `${temp}°C`;
  temperatureState.textContent = `${getTemperatureLabel(temp)} conditions`;
  applyFilters();
}

function initSearch() {
  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) {
      searchResults.classList.remove("active");
      return;
    }
    const matches = elements.filter((el) => {
      return (
        el.name.toLowerCase().includes(query)
        || el.symbol.toLowerCase().includes(query)
        || String(el.number) === query
      );
    });
    searchResults.innerHTML = "";
    matches.slice(0, 8).forEach((el) => {
      const button = document.createElement("button");
      button.textContent = `${el.name} (${el.symbol})`;
      button.addEventListener("click", () => {
        selectElement(el);
        searchResults.classList.remove("active");
        searchInput.value = "";
      });
      searchResults.appendChild(button);
    });
    searchResults.classList.add("active");
  });
}

function initFilters() {
  stateFilters.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const filter = button.dataset.filter;
    stateFilters.querySelectorAll("button").forEach((btn) => btn.classList.remove("active"));
    if (activeFilters.state === filter) {
      activeFilters.state = null;
    } else {
      activeFilters.state = filter;
      button.classList.add("active");
    }
    applyFilters();
  });

  groupFilters.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const filter = button.dataset.filter;
    groupFilters.querySelectorAll("button").forEach((btn) => btn.classList.remove("active"));
    if (activeFilters.group === filter) {
      activeFilters.group = null;
    } else {
      activeFilters.group = filter;
      button.classList.add("active");
    }
    applyFilters();
  });

  blockFilters.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const filter = button.dataset.filter;
    blockFilters.querySelectorAll("button").forEach((btn) => btn.classList.remove("active"));
    if (activeFilters.block === filter) {
      activeFilters.block = null;
    } else {
      activeFilters.block = filter;
      button.classList.add("active");
    }
    applyFilters();
  });

  radioactiveToggle.addEventListener("change", () => {
    activeFilters.radioactive = radioactiveToggle.checked;
    applyFilters();
  });
}

function initControls() {
  closePanel.addEventListener("click", () => infoPanel.classList.remove("active"));
  toggleFilters.addEventListener("click", () => document.querySelector(".sidebar").classList.toggle("collapsed"));
  toggleMotion.addEventListener("click", () => document.body.classList.toggle("reduced-motion"));
  toggleContrast.addEventListener("click", () => document.body.classList.toggle("high-contrast"));
  temperatureRange.addEventListener("input", updateTemperature);

  resetModel.addEventListener("click", () => {
    if (camera) {
      camera.position.set(0, 0, 8);
    }
  });

  toggleModel.addEventListener("click", () => {
    bohrMode = !bohrMode;
    if (modelGroup) {
      modelGroup.children.forEach((child) => {
        if (child.userData?.speed) {
          child.visible = bohrMode;
        }
      });
    }
  });
}

async function loadElements() {
  const response = await fetch("https://unpkg.com/periodic-table@1.0.0/periodic-table.json");
  const data = await response.json();
  elements = data.elements.map((el) => ({
    ...el,
    group: el.xpos,
    period: el.ypos,
    block: el.block || (el.category.includes("transition") ? "d" : "p"),
    radioactive: el.radioactive ?? el.name === "Uranium" || el.name === "Plutonium",
    usage: el.usage || ["Energy", "Medical", "Industry", "Research"],
    compounds: el.compounds || "—",
    valency: el.valency || "—",
    reactivity: el.reactivity || "Moderate",
    isotopes: el.isotopes || (el.radioactive ? "Unstable" : "Stable"),
    image: el.image || el.image_url,
  }));
  buildGroupFilters();
  applyFilters();
  initSearch();
}

function initPanZoom() {
  let isPanning = false;
  let startX = 0;
  let startY = 0;
  let scrollLeft = 0;
  let scrollTop = 0;

  tableWrapper.addEventListener("mousedown", (event) => {
    isPanning = true;
    startX = event.pageX - tableWrapper.offsetLeft;
    startY = event.pageY - tableWrapper.offsetTop;
    scrollLeft = tableWrapper.scrollLeft;
    scrollTop = tableWrapper.scrollTop;
  });

  tableWrapper.addEventListener("mouseup", () => {
    isPanning = false;
  });

  tableWrapper.addEventListener("mouseleave", () => {
    isPanning = false;
  });

  tableWrapper.addEventListener("mousemove", (event) => {
    if (!isPanning) return;
    event.preventDefault();
    const x = event.pageX - tableWrapper.offsetLeft;
    const y = event.pageY - tableWrapper.offsetTop;
    const walkX = (x - startX) * 1.2;
    const walkY = (y - startY) * 1.2;
    tableWrapper.scrollLeft = scrollLeft - walkX;
    tableWrapper.scrollTop = scrollTop - walkY;
  });
}

initFilters();
initControls();
initPanZoom();
updateTemperature();
loadElements();
