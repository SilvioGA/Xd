// Física del modo jugador: caja de 0,6×1,8 bloques con gravedad, salto, colisiones contra
// las formas reales de los bloques (losas, escaleras…), subida automática de escalones de
// hasta 0,6, escaleras de mano y lianas, agua y vuelo. No depende de three.js.

const WALK = 4.3;
const SPRINT = 6.2;
const FLY = 11;
const GRAVITY = 28;
const JUMP = 8.6;
const STEP = 0.6;
const HALF = 0.3;
const BODY_HEIGHT = 1.8;
export const EYE = 1.62;

const PASSABLE = /(_door|_fence_gate|_carpet|_pressure_plate|_button|_sign|_banner|torch|^rail|_rail|redstone_wire|^lever$|^fire$|soul_fire|lily_pad|sugar_cane|bamboo$|^chain$|iron_chain|end_rod|lightning_rod|tripwire|sea_pickle|turtle_egg|kelp|seagrass|coral$|coral_fan$|pointed_dripstone|amethyst_cluster|_bud$|^cocoa$|^bell$|cobweb|lantern|flower_pot|^potted_|_head$|_skull$|^light$|structure_void|^barrier$)/;
const CLIMB = /^(ladder|vine|cave_vines|cave_vines_plant|twisting_vines|twisting_vines_plant|weeping_vines|weeping_vines_plant|scaffolding)$/;

// Tipo de colisión por entrada de paleta.
export function collisionKind(entry, info) {
  const n = entry.name.slice(entry.name.indexOf(':') + 1);
  if (info.air) return { kind: 'none' };
  if (n === 'water' || n === 'bubble_column' || n === 'lava') return { kind: 'fluid' };
  if (CLIMB.test(n)) return { kind: 'climb' };
  if (info.plant || PASSABLE.test(n)) return { kind: 'none' };
  if (n === 'snow') {
    const layers = Number(entry.props?.layers || 1);
    return layers <= 1 ? { kind: 'none' } : { kind: 'boxes', boxes: [[0, 0, 0, 1, (layers - 1) / 8, 1]] };
  }
  if (info.connect === 'fence' || info.connect === 'wall') return { kind: 'boxes', boxes: [[0, 0, 0, 1, 1.5, 1]] };
  if (info.connect === 'pane') return { kind: 'boxes', boxes: [[0, 0, 0, 1, 1, 1]] };
  if (info.cube) return { kind: 'boxes', boxes: [[0, 0, 0, 1, 1, 1]] };
  if (info.boxes) return { kind: 'boxes', boxes: info.boxes };
  return { kind: 'boxes', boxes: [[0, 0, 0, 1, 1, 1]] };
}

export class PlayerPhysics {
  constructor(mesher) {
    this.m = mesher;
    this.kinds = mesher.s.palette.map((e, i) => collisionKind(e, mesher.infos[i]));
    this.pos = [0, 0, 0]; // centro de los pies
    this.vel = [0, 0, 0];
    this.yaw = 0; // 0 = mirando hacia -z (norte)
    this.pitch = 0;
    this.onGround = false;
    this.flying = false;
    this.inFluid = false;
    this.spawn = [0, 0, 0, 0];
  }

  reset(spawn) {
    this.spawn = spawn;
    this.pos = [spawn[0], spawn[1], spawn[2]];
    this.vel = [0, 0, 0];
    this.yaw = ((spawn[3] || 0) * Math.PI) / 180;
    this.pitch = 0;
    this.onGround = false;
  }

  kindAt(x, y, z) {
    const id = this.m.visibleId(x, y, z);
    return id ? this.kinds[id] : null;
  }

  // Cajas sólidas (en coordenadas del mundo) que tocan la región dada.
  solidBoxes(x0, y0, z0, x1, y1, z1) {
    const out = [];
    for (let y = Math.floor(y0) - 1; y <= Math.floor(y1); y++) {
      for (let z = Math.floor(z0); z <= Math.floor(z1); z++) {
        for (let x = Math.floor(x0); x <= Math.floor(x1); x++) {
          const k = this.kindAt(x, y, z);
          if (!k || k.kind !== 'boxes') continue;
          for (const b of k.boxes) out.push([x + b[0], y + b[1], z + b[2], x + b[3], y + b[4], z + b[5]]);
        }
      }
    }
    return out;
  }

  touches(test) {
    const [px, py, pz] = this.pos;
    for (let y = Math.floor(py); y <= Math.floor(py + BODY_HEIGHT - 0.01); y++) {
      for (let z = Math.floor(pz - HALF); z <= Math.floor(pz + HALF); z++) {
        for (let x = Math.floor(px - HALF); x <= Math.floor(px + HALF); x++) {
          const k = this.kindAt(x, y, z);
          if (k && test(k.kind)) return true;
        }
      }
    }
    return false;
  }

  aabb(p = this.pos) {
    return [p[0] - HALF, p[1], p[2] - HALF, p[0] + HALF, p[1] + BODY_HEIGHT, p[2] + HALF];
  }

  // Mueve la caja a lo largo de un eje y la detiene contra las cajas sólidas.
  moveAxis(axis, delta) {
    if (!delta) return 0;
    const a = this.aabb();
    const lo = a.slice(0, 3);
    const hi = a.slice(3);
    const reach = [lo.slice(), hi.slice()];
    if (delta < 0) reach[0][axis] += delta;
    else reach[1][axis] += delta;
    const boxes = this.solidBoxes(reach[0][0], reach[0][1], reach[0][2], reach[1][0], reach[1][1], reach[1][2]);
    const eps = 1e-7;
    let d = delta;
    for (const b of boxes) {
      let overlap = true;
      for (let k = 0; k < 3; k++) {
        if (k === axis) continue;
        if (hi[k] <= b[k] + eps || lo[k] >= b[k + 3] - eps) { overlap = false; break; }
      }
      if (!overlap) continue;
      if (d > 0 && hi[axis] <= b[axis] + eps) d = Math.min(d, b[axis] - hi[axis]);
      else if (d < 0 && lo[axis] >= b[axis + 3] - eps) d = Math.max(d, b[axis + 3] - lo[axis]);
    }
    this.pos[axis] += d;
    return d;
  }

  blockedAt(p) {
    const a = this.aabb(p);
    const boxes = this.solidBoxes(a[0], a[1], a[2], a[3], a[4], a[5]);
    return boxes.some((b) => a[0] < b[3] - 1e-7 && a[3] > b[0] + 1e-7 && a[1] < b[4] - 1e-7 && a[4] > b[1] + 1e-7 && a[2] < b[5] - 1e-7 && a[5] > b[2] + 1e-7);
  }

  // Movimiento horizontal con subida automática de escalones (losas, escaleras).
  moveHorizontal(axis, delta) {
    const moved = this.moveAxis(axis, delta);
    if (Math.abs(moved - delta) < 1e-6 || (!this.onGround && !this.flying)) return;
    const saved = this.pos.slice();
    for (let up = 0.125; up <= STEP + 1e-6; up += 0.125) {
      const p = saved.slice();
      p[1] += up;
      if (this.blockedAt(p)) continue;
      p[axis] += delta - moved;
      if (!this.blockedAt(p)) {
        this.pos = p;
        // Baja hasta apoyarse (por si subimos de más).
        this.moveAxis(1, -up);
        return;
      }
    }
  }

  step(dt, input) {
    dt = Math.min(dt, 0.05);
    this.inFluid = this.touches((k) => k === 'fluid');
    const climbing = !this.flying && this.touches((k) => k === 'climb');

    // Dirección deseada según hacia dónde mira el jugador.
    const f = (input.forward ? 1 : 0) - (input.back ? 1 : 0);
    const r = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    let dx = -sin * f + cos * r;
    let dz = -cos * f - sin * r;
    const len = Math.hypot(dx, dz) || 1;
    const speed = this.flying ? FLY : input.sprint ? SPRINT : WALK;
    const k = this.inFluid ? 0.55 : 1;
    dx = (dx / len) * speed * k * (f || r ? 1 : 0);
    dz = (dz / len) * speed * k * (f || r ? 1 : 0);
    // Un poco de inercia para que no sea brusco.
    const blend = Math.min(1, dt * (this.onGround || this.flying ? 14 : 4));
    this.vel[0] += (dx - this.vel[0]) * blend;
    this.vel[2] += (dz - this.vel[2]) * blend;

    if (this.flying) {
      this.vel[1] = (input.jump ? FLY * 0.7 : 0) - (input.sprint ? FLY * 0.7 : 0);
    } else if (climbing) {
      this.vel[1] = input.jump || input.forward ? 3.2 : Math.max(this.vel[1] - GRAVITY * dt, -2.5);
    } else if (this.inFluid) {
      this.vel[1] = input.jump ? 3.5 : Math.max(this.vel[1] - GRAVITY * 0.25 * dt, -2.5);
    } else {
      if (input.jump && this.onGround) this.vel[1] = JUMP;
      this.vel[1] = Math.max(this.vel[1] - GRAVITY * dt, -60);
    }

    const vy = this.vel[1] * dt;
    const movedY = this.moveAxis(1, vy);
    this.onGround = vy < 0 && Math.abs(movedY - vy) > 1e-6;
    if (Math.abs(movedY - vy) > 1e-6) this.vel[1] = 0;
    this.moveHorizontal(0, this.vel[0] * dt);
    this.moveHorizontal(2, this.vel[2] * dt);

    // Si caes al vacío, vuelves al punto de aparición.
    if (this.pos[1] < -24) this.reset(this.spawn);
  }

  eye() {
    return [this.pos[0], this.pos[1] + EYE, this.pos[2]];
  }
}

// Punto de aparición: el que traiga el schematic o, si no, el primer sitio en el que se pueda
// estar de pie mirando al norte desde el borde sur, en el centro.
export function findSpawn(schem, physics) {
  if (schem.meta?.spawn) return schem.meta.spawn;
  const solidTop = (x, y, z) => {
    const k = physics.kindAt(x, y, z);
    return k && k.kind === 'boxes';
  };
  const free = (x, y, z) => {
    const k = physics.kindAt(x, y, z);
    return !k || k.kind !== 'boxes';
  };
  const cx = Math.floor(schem.width / 2);
  for (let z = schem.length - 1; z >= 0; z--) {
    for (const x of [cx, cx - 1, cx + 1, cx - 3, cx + 3]) {
      for (let y = schem.height - 2; y >= 0; y--) {
        if (solidTop(x, y, z) && free(x, y + 1, z) && free(x, y + 2, z)) return [x + 0.5, y + 1, z + 0.5, 0];
        if (solidTop(x, y, z)) break;
      }
    }
  }
  return [schem.width / 2, schem.height + 1, schem.length / 2, 0];
}
