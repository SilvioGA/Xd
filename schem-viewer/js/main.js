import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { parseSchematicFile, mcVersion } from './formats.js';
import { Mesher, CHUNK } from './mesher.js';
import { prettyName } from './blocks.js';
import { buildDemo } from './demo.js';
import { buildLobby } from './lobby.js';
import { buildJapaneseLobby } from './japan.js';
import { buildSkyWarsLobby } from './skywars.js';
import { buildRabbit } from './rabbit.js';
import { buildTree } from './tree.js';
import { buildIsland } from './island.js';

const $ = (id) => document.getElementById(id);
const stage = $('stage');

// ---------- Escena ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // los colores de bloque ya están en espacio de pantalla
stage.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.12;
controls.screenSpacePanning = true;

const world = new THREE.Group();
scene.add(world);
const helpers = new THREE.Group();
scene.add(helpers);

const opaqueMat = new THREE.MeshBasicMaterial({ vertexColors: true });
const transMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false });

const highlight = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(1.02, 1.02, 1.02)),
  new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthTest: false }),
);
highlight.renderOrder = 10;
highlight.visible = false;
scene.add(highlight);

function resize() {
  const { clientWidth: w, clientHeight: h } = stage;
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(h, 1);
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);

function cssColor(name) {
  return new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888');
}

// ---------- Estado ----------
let schem = null;
let mesher = null;
let chunks = new Map();
let buildToken = 0;
let hiddenVersion = 0;
let materials = [];
let showGrid = true;

function chunkKey(cy) {
  const lo = Math.max(mesher.yMin, cy * CHUNK - 1);
  const hi = Math.min(mesher.yMax, cy * CHUNK + CHUNK);
  return lo > hi ? 'empty' : `${lo}:${hi}:${hiddenVersion}`;
}

function toGeometry(part) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(part.positions, 3));
  g.setAttribute('color', new THREE.BufferAttribute(part.colors, part.itemSize));
  g.setIndex(new THREE.BufferAttribute(part.indices, 1));
  g.computeBoundingSphere();
  return g;
}

function disposeChunk(c) {
  for (const m of c.meshes) {
    world.remove(m);
    m.geometry.dispose();
  }
}

async function rebuild() {
  const token = ++buildToken;
  const nx = Math.ceil(schem.width / CHUNK);
  const ny = Math.ceil(schem.height / CHUNK);
  const nz = Math.ceil(schem.length / CHUNK);
  const todo = [];
  for (let cy = 0; cy < ny; cy++) {
    const key = chunkKey(cy);
    for (let cz = 0; cz < nz; cz++) for (let cx = 0; cx < nx; cx++) {
      const id = `${cx},${cy},${cz}`;
      const c = chunks.get(id);
      if (!c || c.key !== key) todo.push({ id, cx, cy, cz, key });
    }
  }
  const showProgress = todo.length > 8;
  let start = performance.now();
  for (let i = 0; i < todo.length; i++) {
    const t = todo[i];
    const old = chunks.get(t.id);
    if (old) disposeChunk(old);
    const meshes = [];
    if (t.key !== 'empty') {
      const r = mesher.buildChunk(t.cx, t.cy, t.cz);
      if (r.opaque) meshes.push(new THREE.Mesh(toGeometry(r.opaque), opaqueMat));
      if (r.transparent) {
        const m = new THREE.Mesh(toGeometry(r.transparent), transMat);
        m.renderOrder = 1;
        meshes.push(m);
      }
      for (const m of meshes) world.add(m);
    }
    chunks.set(t.id, { key: t.key, meshes });

    if (performance.now() - start > 30) {
      if (showProgress) setProgress((i + 1) / todo.length);
      await new Promise((r) => setTimeout(r, 0));
      if (token !== buildToken) return;
      start = performance.now();
    }
  }
  setProgress(null);
}

function setProgress(f) {
  $('progress').hidden = f === null;
  if (f !== null) $('progress-fill').style.width = `${Math.round(f * 100)}%`;
}

// ---------- Ayudas visuales ----------
function buildHelpers() {
  for (const c of [...helpers.children]) {
    helpers.remove(c);
    c.geometry.dispose();
  }
  const { width: W, height: H, length: L } = schem;
  const lineColor = cssColor('--muted');
  highlight.material.color = cssColor('--text');

  const box = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(W, H, L)),
    new THREE.LineBasicMaterial({ color: lineColor, transparent: true, opacity: 0.35 }),
  );
  box.position.set(W / 2, H / 2, L / 2);
  helpers.add(box);

  const step = Math.max(1, Math.ceil(Math.max(W, L) / 128));
  const pts = [];
  for (let x = 0; x <= W; x += step) pts.push(x, 0, 0, x, 0, L);
  for (let z = 0; z <= L; z += step) pts.push(0, 0, z, W, 0, z);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const grid = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: lineColor, transparent: true, opacity: 0.18 }));
  grid.position.y = -0.01;
  helpers.add(grid);
  helpers.visible = showGrid;
}

// Caja mínima que contiene bloques visibles (muchos schematics tienen mucho aire alrededor).
function occupiedBounds() {
  const { width: W, height: H, length: L, blocks } = schem;
  const air = mesher.infos.map((i) => i.air);
  let x0 = W, y0 = H, z0 = L, x1 = -1, y1 = -1, z1 = -1;
  let i = 0;
  for (let y = 0; y < H; y++) for (let z = 0; z < L; z++) for (let x = 0; x < W; x++, i++) {
    if (air[blocks[i]]) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
    if (z < z0) z0 = z; if (z > z1) z1 = z;
  }
  if (x1 < 0) return { min: [0, 0, 0], max: [W, H, L] };
  return { min: [x0, y0, z0], max: [x1 + 1, y1 + 1, z1 + 1] };
}

let bounds = null;

function fitCamera() {
  const { min, max } = bounds;
  const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  const center = new THREE.Vector3((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
  const radius = 0.5 * Math.hypot(...size);
  const dist = (radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2))) * 0.95;
  const dir = new THREE.Vector3(1, 0.85, 1.3).normalize();
  camera.position.copy(center).addScaledVector(dir, dist);
  camera.near = Math.max(0.05, dist / 2000);
  camera.far = dist * 20;
  camera.updateProjectionMatrix();
  controls.target.copy(center);
  controls.maxDistance = dist * 6;
  controls.update();
}

// ---------- Panel ----------
const fmt = (n) => n.toLocaleString('es-ES');

function stacks(n) {
  if (n < 64) return '';
  const st = Math.floor(n / 64);
  const rest = n % 64;
  let s = `${st} st${rest ? ` + ${rest}` : ''}`;
  if (n >= 1728) s += ` · ${(n / 1728).toFixed(1)} shulkers`;
  return s;
}

function renderFacts(fileName) {
  const m = schem.meta || {};
  const total = materials.reduce((a, b) => a + b.count, 0);
  const rows = [
    ['Formato', schem.format],
    ['Tamaño', `${schem.width} × ${schem.height} × ${schem.length}`, true],
    ['Bloques', fmt(total), true],
    ['Tipos distintos', fmt(materials.length), true],
  ];
  const v = mcVersion(m.dataVersion);
  if (v) rows.push(['Versión', `≈ ${v} (${m.dataVersion})`, true]);
  if (m.name) rows.push(['Nombre', m.name]);
  if (m.author) rows.push(['Autor', m.author]);
  if (m.regions > 1) rows.push(['Regiones', m.regions, true]);
  if (m.blockEntities) rows.push(['Bloques con datos', fmt(m.blockEntities), true]);
  if (m.entities) rows.push(['Entidades', fmt(m.entities), true]);
  $('facts').replaceChildren(...rows.flatMap(([k, val, mono]) => {
    const dt = document.createElement('dt');
    dt.textContent = k;
    const dd = document.createElement('dd');
    dd.textContent = val;
    if (mono) dd.className = 'mono';
    return [dt, dd];
  }));
  $('file-chip').textContent = fileName;
  $('file-chip').title = fileName;
  $('mat-total').textContent = fmt(total);
}

function computeMaterials() {
  const counts = schem.countBlocks();
  const byName = new Map();
  schem.palette.forEach((entry, id) => {
    const info = mesher.infos[id];
    if (info.air || !counts[id]) return;
    let m = byName.get(entry.name);
    if (!m) {
      m = { name: entry.name, label: prettyName(entry.name), count: 0, ids: [], color: info.top };
      byName.set(entry.name, m);
    }
    m.count += counts[id];
    m.ids.push(id);
  });
  materials = [...byName.values()].sort((a, b) => b.count - a.count);
}

const toCss = (c) => `rgb(${c.map((v) => Math.round(Math.min(1, v) * 255)).join(',')})`;

function renderMaterials() {
  const q = $('mat-search').value.trim().toLowerCase();
  const items = materials.filter((m) => !q || m.label.toLowerCase().includes(q) || m.name.includes(q));
  $('materials').replaceChildren(...items.map((m) => {
    const li = document.createElement('li');
    const hidden = mesher.hidden[m.ids[0]] === 1;
    li.classList.toggle('off', hidden);
    li.title = m.name;
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = !hidden;
    box.setAttribute('aria-label', `Mostrar ${m.label}`);
    const sw = document.createElement('span');
    sw.className = 'swatch';
    sw.style.background = toCss(m.color);
    const name = document.createElement('span');
    name.className = 'name';
    const label = document.createElement('span');
    label.textContent = m.label;
    name.append(label);
    const st = stacks(m.count);
    if (st) {
      const small = document.createElement('small');
      small.textContent = st;
      name.append(small);
    }
    const count = document.createElement('span');
    count.className = 'count';
    count.textContent = fmt(m.count);
    li.append(box, sw, name, count);
    const toggle = () => setHidden(m, !(mesher.hidden[m.ids[0]] === 1));
    li.addEventListener('click', (e) => {
      if (e.target !== box) toggle();
    });
    box.addEventListener('change', toggle);
    return li;
  }));
}

function setHidden(m, hide) {
  for (const id of m.ids) mesher.hidden[id] = hide ? 1 : 0;
  hiddenVersion++;
  renderMaterials();
  rebuild();
}

$('mat-search').addEventListener('input', renderMaterials);
$('mat-all').addEventListener('click', () => {
  mesher.hidden.fill(0);
  hiddenVersion++;
  renderMaterials();
  rebuild();
});
$('mat-copy').addEventListener('click', async () => {
  const text = materials.map((m) => `${m.label}\t${m.count}${stacks(m.count) ? `\t(${stacks(m.count)})` : ''}`).join('\n');
  const btn = $('mat-copy');
  try {
    await navigator.clipboard.writeText(text);
    btn.textContent = 'Copiada';
  } catch {
    btn.textContent = 'No se pudo copiar';
  }
  setTimeout(() => { btn.textContent = 'Copiar lista'; }, 1500);
});

// ---------- Capas ----------
function applyLayer() {
  const y = Number($('layer').value);
  const single = $('single-layer').checked;
  mesher.setRange(single ? y : 0, y);
  $('layer-value').textContent = `Y ${y}`;
  $('layer-title').textContent = single ? `capa ${y}` : `hasta ${y} de ${schem.height - 1}`;
  hideTooltip();
  rebuild();
}

function stepLayer(d) {
  const el = $('layer');
  el.value = String(Math.min(Number(el.max), Math.max(0, Number(el.value) + d)));
  applyLayer();
}

$('layer').addEventListener('input', applyLayer);
$('single-layer').addEventListener('change', applyLayer);
$('layer-down').addEventListener('click', () => stepLayer(-1));
$('layer-up').addEventListener('click', () => stepLayer(1));

// ---------- Carga ----------
function load(s, fileName) {
  for (const c of chunks.values()) disposeChunk(c);
  chunks = new Map();
  schem = s;
  mesher = new Mesher(s);
  hiddenVersion = 0;
  computeMaterials();
  bounds = occupiedBounds();
  renderFacts(fileName);
  $('mat-search').value = '';
  renderMaterials();
  $('layer').max = String(s.height - 1);
  $('layer').value = String(s.height - 1);
  $('single-layer').checked = false;
  buildHelpers();
  fitCamera();
  applyLayer();
}

let toastTimer = 0;
function showError(msg) {
  const t = $('toast');
  t.innerHTML = '';
  const b = document.createElement('b');
  b.textContent = 'No se pudo abrir el archivo. ';
  t.append(b, msg);
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 7000);
}

async function openFile(file) {
  if (!file) return;
  $('toast').hidden = true;
  $('progress-label').textContent = `Leyendo ${file.name}…`;
  setProgress(0);
  try {
    const s = await parseSchematicFile(await file.arrayBuffer());
    $('progress-label').textContent = 'Generando geometría…';
    load(s, file.name);
  } catch (err) {
    console.error(err);
    setProgress(null);
    showError(err.message || String(err));
  }
}

$('btn-open').addEventListener('click', () => $('file-input').click());
$('file-input').addEventListener('change', (e) => {
  openFile(e.target.files[0]);
  e.target.value = '';
});
const EXAMPLES = {
  isla: () => load(buildIsland(), 'isla-tropical'),
  arbol: () => load(buildTree(), 'roble-gigante'),
  conejo: () => load(buildRabbit(), 'conejos'),
  skywars: () => load(buildSkyWarsLobby(), 'lobby-skywars'),
  japones: () => load(buildJapaneseLobby(), 'lobby-japones'),
  lobby: () => load(buildLobby(), 'lobby-epico'),
  casita: () => load(buildDemo(), 'casita-ejemplo'),
};
$('demo-select').addEventListener('change', (e) => EXAMPLES[e.target.value]?.());

let dragDepth = 0;
window.addEventListener('dragenter', (e) => {
  if (![...(e.dataTransfer?.types || [])].includes('Files')) return;
  e.preventDefault();
  dragDepth++;
  $('drop').hidden = false;
});
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('dragleave', () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (!dragDepth) $('drop').hidden = true;
});
window.addEventListener('drop', (e) => {
  e.preventDefault();
  dragDepth = 0;
  $('drop').hidden = true;
  openFile(e.dataTransfer?.files?.[0]);
});

// ---------- Vista ----------
$('btn-reset').addEventListener('click', () => schem && fitCamera());
$('btn-grid').addEventListener('click', (e) => {
  showGrid = !showGrid;
  helpers.visible = showGrid;
  e.currentTarget.setAttribute('aria-pressed', String(showGrid));
});

window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement && e.target.type !== 'range' && e.target.type !== 'checkbox') return;
  if (!schem) return;
  if (e.key === '[' || e.key === 'PageDown') { stepLayer(-1); e.preventDefault(); }
  if (e.key === ']' || e.key === 'PageUp') { stepLayer(1); e.preventDefault(); }
  if (e.key === 'r' || e.key === 'R') fitCamera();
});

// ---------- Selección con el ratón ----------
const pointer = { x: 0, y: 0, cx: 0, cy: 0, dirty: false, down: false };
const raycaster = new THREE.Raycaster();
const tooltip = $('tooltip');

renderer.domElement.addEventListener('pointermove', (e) => {
  const r = renderer.domElement.getBoundingClientRect();
  pointer.cx = e.clientX - r.left;
  pointer.cy = e.clientY - r.top;
  pointer.x = (pointer.cx / r.width) * 2 - 1;
  pointer.y = -(pointer.cy / r.height) * 2 + 1;
  pointer.dirty = e.pointerType === 'mouse';
});
renderer.domElement.addEventListener('pointerdown', () => { pointer.down = true; hideTooltip(); });
window.addEventListener('pointerup', () => { pointer.down = false; });
renderer.domElement.addEventListener('pointerleave', hideTooltip);

function hideTooltip() {
  tooltip.hidden = true;
  highlight.visible = false;
}

function updatePick() {
  if (!mesher || pointer.down) return;
  raycaster.setFromCamera({ x: pointer.x, y: pointer.y }, camera);
  const o = raycaster.ray.origin;
  const d = raycaster.ray.direction;
  const hit = mesher.pick([o.x, o.y, o.z], [d.x, d.y, d.z]);
  if (!hit) return hideTooltip();
  highlight.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
  highlight.visible = true;
  const entry = schem.palette[hit.id];
  const props = Object.entries(entry.props);
  tooltip.innerHTML = '';
  const strong = document.createElement('strong');
  strong.textContent = prettyName(entry.name);
  const coords = document.createElement('span');
  coords.className = 'coords';
  coords.textContent = `x ${hit.x}  y ${hit.y}  z ${hit.z}`;
  tooltip.append(strong, coords);
  if (props.length) {
    const p = document.createElement('div');
    p.className = 'props';
    p.textContent = props.map(([k, v]) => `${k}=${v}`).join('  ');
    tooltip.append(p);
  }
  tooltip.hidden = false;
  const sw = stage.clientWidth;
  const tw = tooltip.offsetWidth;
  const left = pointer.cx + 16 + tw > sw ? pointer.cx - tw - 12 : pointer.cx + 16;
  tooltip.style.left = `${Math.max(4, left)}px`;
  tooltip.style.top = `${Math.max(4, pointer.cy + 16)}px`;
}

controls.addEventListener('change', () => { pointer.dirty = pointer.dirty || !tooltip.hidden; });

function frame() {
  controls.update();
  if (pointer.dirty) {
    pointer.dirty = false;
    updatePick();
  }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// El color de la rejilla sigue al tema claro/oscuro.
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => schem && buildHelpers());
new MutationObserver(() => schem && buildHelpers()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

resize();
EXAMPLES.isla();
requestAnimationFrame(frame);
