// Aspecto de cada bloque: color aproximado (sin texturas) y forma geométrica.
// Las formas se describen como cajas en dieciseisavos de bloque (0..16).

const hex = (h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];

const DYE_ORDER = ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray',
  'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black'];
const table = (s) => Object.fromEntries(s.split(' ').map((c, i) => [DYE_ORDER[i], c]));
const WOOL = table('#E9ECEC #F07613 #BD44B3 #3AAFD9 #F8C627 #70B919 #ED8DAC #3E4447 #8E8E86 #158991 #792AAC #35399D #724728 #546D1B #A12722 #141519');
const CONCRETE = table('#CFD5D6 #E06100 #A9309F #2389C6 #F0AF15 #5EA818 #D5658E #36393D #7D7D73 #157788 #64209C #2C2E8F #603B1F #495B24 #8E2020 #080A0F');
const TERRACOTTA = table('#D1B2A1 #A15325 #95576C #706C8A #BA8523 #677534 #A04D4E #392A23 #876A61 #575B5B #764656 #4A3C5B #4D3323 #4C532A #8F3D2E #251610');
const DYE_RE = new RegExp(`^(${[...DYE_ORDER].sort((a, b) => b.length - a.length).join('|')})_(.+)$`);

const PLANKS = { oak: '#A2834F', spruce: '#735531', birch: '#C0AF79', jungle: '#A07351', acacia: '#A85A32', dark_oak: '#432B14', mangrove: '#763631', cherry: '#E3B3AD', bamboo: '#C1AD50', crimson: '#653146', warped: '#2B6963', pale_oak: '#E4D9D6' };
const BARK = { oak: '#6D5533', spruce: '#3A2610', birch: '#D8D7D2', jungle: '#55441A', acacia: '#676157', dark_oak: '#3C2E1A', mangrove: '#543828', cherry: '#37202A', bamboo: '#8F9A2F', crimson: '#5C1919', warped: '#3A3A4D', pale_oak: '#574E4B' };
const LEAVES = { oak: '#3B7A1C', spruce: '#3A5F3A', birch: '#5A8A3C', jungle: '#3F8F1B', acacia: '#4A8A1C', dark_oak: '#3B7A1C', mangrove: '#4A7A1C', cherry: '#E8A6C4', azalea: '#5B7A2A', flowering_azalea: '#6E7A3A', pale_oak: '#7A8570' };
const WOOD_RE = /^(stripped_)?(dark_oak|pale_oak|oak|spruce|birch|jungle|acacia|mangrove|cherry|bamboo|crimson|warped)_(.+)$/;

const C = {
  stone: '#7D7D7D', cobblestone: '#7F7F7F', mossy_cobblestone: '#6E7A5E', smooth_stone: '#9E9E9E',
  stone_bricks: '#7A7A7A', mossy_stone_bricks: '#737A62', cracked_stone_bricks: '#767676', chiseled_stone_bricks: '#777777',
  granite: '#956756', diorite: '#BCBCBC', andesite: '#888889', deepslate: '#505053', cobbled_deepslate: '#4D4D51',
  deepslate_bricks: '#464647', deepslate_tiles: '#363637', tuff: '#6C6D66', tuff_bricks: '#62675F', calcite: '#DFE0DC',
  dirt: '#866043', coarse_dirt: '#775537', rooted_dirt: '#90674C', mud: '#3C393D', packed_mud: '#8E6B50', mud_bricks: '#89684F',
  grass_block: ['#8A6E45', '#5E9D34', '#866043'], podzol: ['#7A5A35', '#5B3F18', '#866043'], mycelium: ['#7E6E6C', '#6F6265', '#866043'],
  farmland: ['#866043', '#522B10', '#866043'], dirt_path: ['#8A6E45', '#947A41', '#866043'],
  crimson_nylium: ['#6F3635', '#8A2424', '#6F3635'], warped_nylium: ['#6F3635', '#2B7265', '#6F3635'],
  sand: '#DBCFA3', red_sand: '#BE6621', gravel: '#837F7E', clay: '#A0A6B3', suspicious_sand: '#D8C99C', suspicious_gravel: '#817C7B',
  sandstone: '#D8CB9B', red_sandstone: '#BA631D', smooth_sandstone: '#E0D5A6', smooth_red_sandstone: '#B5621F',
  bricks: '#976253', nether_bricks: '#2C161A', red_nether_bricks: '#450709', netherrack: '#6F3635',
  soul_sand: '#513E32', soul_soil: '#4B3A2F', basalt: '#505155', smooth_basalt: '#48484E',
  blackstone: '#2A2328', polished_blackstone_bricks: '#302A31', gilded_blackstone: '#382B26',
  glowstone: '#ABA06A', shroomlight: '#F19447', magma_block: '#8E3F1F', obsidian: '#0F0B19', crying_obsidian: '#200A3C',
  end_stone: '#DBDE9E', end_stone_bricks: '#DADFA3', purpur_block: '#A97DA9', purpur_pillar: '#AB81AB',
  quartz_block: '#EBE5DE', smooth_quartz: '#ECE6DF', quartz_pillar: '#EBE6E0', quartz_bricks: '#EAE5DD',
  prismarine: '#639C97', prismarine_bricks: '#63AB9E', dark_prismarine: '#335B4B', sea_lantern: '#ACC7BE',
  ice: '#91B7FD', packed_ice: '#8DB4FA', blue_ice: '#74A7FD', frosted_ice: '#8CB4FC', snow_block: '#F9FEFE', snow: '#F9FEFE', powder_snow: '#F8FDFD',
  water: '#3F76E4', bubble_column: '#3F76E4', lava: '#CF5B14', bedrock: '#555555',
  coal_ore: '#6A6A6A', iron_ore: '#88817B', gold_ore: '#8F8C7D', diamond_ore: '#798D8C', emerald_ore: '#6C8773',
  lapis_ore: '#6B7685', redstone_ore: '#8C6D6D', copper_ore: '#7C7D78', nether_quartz_ore: '#75413E', nether_gold_ore: '#73362A',
  ancient_debris: '#5E4640', coal_block: '#101010', iron_block: '#DCDCDC', gold_block: '#F6D03E', diamond_block: '#62EDE4',
  emerald_block: '#2ACB58', lapis_block: '#1F438C', redstone_block: '#AF1805', netherite_block: '#433D40',
  copper_block: '#C06C50', raw_iron_block: '#A6886B', raw_gold_block: '#DDA92E', raw_copper_block: '#9A6A4F',
  amethyst_block: '#8662BF', budding_amethyst: '#84609F', amethyst_cluster: '#A47FCF',
  bookshelf: ['#75603B', '#A2834F', '#A2834F'], chiseled_bookshelf: ['#6E5635', '#A2834F', '#A2834F'],
  crafting_table: ['#7A5B35', '#9C7A4A', '#A2834F'], furnace: '#6E6E6E', blast_furnace: '#6C6B6B', smoker: '#6B5B45',
  chest: '#A2742A', trapped_chest: '#A2742A', ender_chest: '#2F4447', barrel: '#86643A', hay_block: ['#A68B0C', '#A6880F', '#A6880F'],
  pumpkin: '#C57518', carved_pumpkin: '#C57518', jack_o_lantern: '#D5901F', melon: '#6F9120', cactus: '#5A8A2A',
  tnt: ['#DB441A', '#C9C9C9', '#C9C9C9'], sponge: '#C3C04A', wet_sponge: '#ABB547', slime_block: '#6FC05B', honey_block: '#F9BF37',
  note_block: '#58392A', jukebox: '#5A3D2E', target: '#E2AA9E', dried_kelp_block: '#333D28', moss_block: '#596E2D', moss_carpet: '#596E2D',
  glass: '#C0DDE0', glass_pane: '#C0DDE0', tinted_glass: '#2C2730', iron_bars: '#8A8C8B', chain: '#3A3F4B', iron_chain: '#3A3F4B',
  lantern: '#E2A450', soul_lantern: '#4FB4C0', torch: '#F6C84A', wall_torch: '#F6C84A', soul_torch: '#4FB4C0', soul_wall_torch: '#4FB4C0',
  redstone_torch: '#B82A0C', redstone_wall_torch: '#B82A0C', redstone_wire: '#9E0F0F', redstone_lamp: '#8F5A2F',
  rail: '#8E7D66', powered_rail: '#9A7A3A', detector_rail: '#8A7060', activator_rail: '#7E5E5A',
  beacon: '#75DDD7', anvil: '#444444', chipped_anvil: '#444444', damaged_anvil: '#444444', cauldron: '#4A4A4A',
  hopper: '#4B4B4B', observer: '#626262', piston: ['#6E6E6E', '#9A8561', '#6E6E6E'], sticky_piston: ['#6E6E6E', '#7E9C5A', '#6E6E6E'],
  piston_head: '#9A8561', dispenser: '#7A7A7A', dropper: '#7A7A7A', bell: '#FCD24A', campfire: '#6E5A3A', soul_campfire: '#4E5A5A',
  scaffolding: '#AA844D', ladder: '#7C6139', vine: '#3F6F1A', lily_pad: '#208030', sugar_cane: '#94C065', bamboo: '#5E8E1C',
  kelp: '#3A7A2A', kelp_plant: '#3A7A2A', seagrass: '#2F7A1E', tall_seagrass: '#2F7A1E',
  short_grass: '#5C8E3A', grass: '#5C8E3A', tall_grass: '#5C8E3A', fern: '#4F8030', large_fern: '#4F8030', dead_bush: '#8B6534',
  dandelion: '#F3D31C', poppy: '#C3272A', blue_orchid: '#2AA3E1', allium: '#B071D6', azure_bluet: '#D6E1E7',
  red_tulip: '#D0342A', orange_tulip: '#E07A2A', white_tulip: '#E6E6E6', pink_tulip: '#E8A0C0', oxeye_daisy: '#E6E6D6',
  cornflower: '#4A66D0', lily_of_the_valley: '#F0F0F0', wither_rose: '#1E1E14', torchflower: '#E0802A',
  sunflower: '#F5C425', lilac: '#C08CC4', rose_bush: '#A8241C', peony: '#E8B3E8', pitcher_plant: '#6A8ACF',
  wheat: '#D4B044', carrots: '#5E9D34', potatoes: '#5E9D34', beetroots: '#5E9D34', sweet_berry_bush: '#3E6A2A',
  brown_mushroom: '#947256', red_mushroom: '#D7302C', red_mushroom_block: '#C82F2D', brown_mushroom_block: '#957050', mushroom_stem: '#CBC5BA',
  nether_wart_block: '#720B0B', warped_wart_block: '#167B84', nether_wart: '#9A2020',
  sculk: '#0C1E24', sculk_catalyst: '#1E3238', sculk_sensor: '#0E5A6A', sculk_shrieker: '#C8C8A8', sculk_vein: '#0C2E34',
  bone_block: '#E5E1CF', reinforced_deepslate: '#50535A', spawner: '#243446', trial_spawner: '#3A4A58', vault: '#3A4450',
  cobweb: '#DDDEDF', end_rod: '#E8E0D8', chorus_plant: '#5E395E', chorus_flower: '#977D97', dragon_egg: '#0C0910',
  respawn_anchor: '#2A1E3C', lodestone: '#767679', smithing_table: '#3A3A4C', cartography_table: '#5A4632',
  fletching_table: '#C9B57E', composter: '#7A542E', beehive: '#B79147', bee_nest: '#C8A24A', loom: '#8E7A5A',
  stonecutter: '#7B7773', grindstone: '#8E8E8E', lectern: '#A2834F', enchanting_table: ['#5A2328', '#2E2E4A', '#1A1A1A'],
  brewing_stand: '#7A6A5A', daylight_detector: '#A2927A', end_portal_frame: ['#5B7863', '#6A8A70', '#DBDE9E'],
  end_portal: '#0B0B14', end_gateway: '#0B0B14', nether_portal: '#7A2ADA', fire: '#E88A1A', soul_fire: '#4FB4C0',
  dripstone_block: '#866B5C', pointed_dripstone: '#866B5C', lightning_rod: '#C06C50',
  conduit: '#9F8B71', sea_pickle: '#5A6A2A', turtle_egg: '#E4E3C0', sniffer_egg: '#8A3A2A', decorated_pot: '#8C4F3A',
  crafter: '#6A6A6A', heavy_core: '#4A4E58', command_block: '#B08A6A', chain_command_block: '#7AA08A',
  repeating_command_block: '#7A6AA8', structure_block: '#5A4A5A', jigsaw: '#5A4A5A', cake: '#E8DCCD', candle: '#E6D6B0',
  flower_pot: '#7C4536', repeater: '#A09C98', comparator: '#A8A09C', lever: '#6E6E6E', tripwire_hook: '#7A7A7A',
  skeleton_skull: '#C8C8C8', wither_skeleton_skull: '#2A2A2A', zombie_head: '#4A7A3A', player_head: '#6A4A3A',
  creeper_head: '#5ABA4A', dragon_head: '#1A1A1A', piglin_head: '#E09A8A', mangrove_roots: '#4A3A2A', muddy_mangrove_roots: '#3F3A34',
  terracotta: '#985E43', glow_lichen: '#6A8A7A', hanging_roots: '#A06A50', spore_blossom: '#D06A9A', azalea: '#5F7F2A',
  flowering_azalea: '#7A6A6A', big_dripleaf: '#5E9A2E', small_dripleaf: '#5E9A2E', cave_vines: '#5A7A2A', cave_vines_plant: '#5A7A2A',
  weeping_vines: '#8A1A1A', twisting_vines: '#1A8A7A', crimson_roots: '#8A1A2A', warped_roots: '#1A8A7A', nether_sprouts: '#1A9A8A',
  crimson_fungus: '#9A2A1A', warped_fungus: '#2A8A7A', pink_petals: '#F0A0C0', frogspawn: '#6A5A5A',
  ochre_froglight: '#F5E7A8', verdant_froglight: '#D3F0C6', pearlescent_froglight: '#F0DDE5', resin_block: '#D96A1A', resin_bricks: '#C7541A',
  creaking_heart: '#5A4E4A', pale_moss_block: '#6B706A', pale_moss_carpet: '#6B706A', pale_hanging_moss: '#7A7F78',
};

// Mezcla un color hacia blanco (t>0) o negro (t<0).
const tint = (c, t) => c.map((v) => (t > 0 ? v + (1 - v) * t : v * (1 + t)));

function hashColor(name) {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619);
  const hue = ((h >>> 0) % 360) / 360;
  const s = 0.25;
  const l = 0.45;
  const f = (n) => {
    const k = (n + hue * 12) % 12;
    return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [f(0), f(8), f(4)];
}

const SUFFIXES = ['_stairs', '_slab', '_wall', '_fence_gate', '_fence', '_pressure_plate', '_button', '_pane'];
const PREFIXES = ['waxed_', 'infested_', 'polished_', 'chiseled_', 'cracked_', 'cut_', 'smooth_', 'mossy_', 'deepslate_', 'potted_'];

function lookup(n) {
  if (C[n]) return C[n];
  if (C[n + 's']) return C[n + 's'];
  if (C[n + '_block']) return C[n + '_block'];
  if (n.endsWith('_brick') && C[n + 's']) return C[n + 's'];
  return null;
}

// Devuelve { side, top, bottom } en RGB 0..1.
function resolveColor(fullName) {
  const n = fullName.slice(fullName.indexOf(':') + 1);
  const wrap = (v) => {
    if (Array.isArray(v)) return { side: hex(v[0]), top: hex(v[1]), bottom: hex(v[2]) };
    const c = typeof v === 'string' ? hex(v) : v;
    return { side: c, top: c, bottom: c };
  };

  if (C[n]) return wrap(C[n]);

  // Cobre y sus estados de oxidación.
  if (n.includes('copper') && !n.includes('ore') && !n.includes('raw_')) {
    if (n.includes('oxidized')) return wrap('#52A385');
    if (n.includes('weathered')) return wrap('#6C996E');
    if (n.includes('exposed')) return wrap('#A17E68');
    return wrap('#C06C50');
  }

  // Bloques teñidos.
  const dye = n.match(DYE_RE);
  if (dye) {
    const [, color, rest] = dye;
    if (rest === 'concrete') return wrap(CONCRETE[color]);
    if (rest === 'concrete_powder') return wrap(tint(hex(CONCRETE[color]), 0.18));
    if (rest === 'terracotta') return wrap(TERRACOTTA[color]);
    if (rest === 'glazed_terracotta') return wrap(tint(hex(CONCRETE[color]), 0.1));
    if (rest === 'shulker_box') return wrap(tint(hex(WOOL[color]), -0.1));
    return wrap(WOOL[color]);
  }

  // Madera.
  const wood = n.match(WOOD_RE);
  if (wood) {
    const [, stripped, type, rest] = wood;
    if (rest === 'leaves') return wrap(LEAVES[type]);
    if (['log', 'wood', 'stem', 'hyphae'].includes(rest)) {
      if (stripped || rest === 'wood' || rest === 'hyphae') return wrap(stripped ? tint(hex(PLANKS[type]), -0.05) : BARK[type]);
      const planks = hex(PLANKS[type]);
      return { side: hex(BARK[type]), top: planks, bottom: planks };
    }
    if (rest === 'sapling' || rest === 'propagule') return wrap(LEAVES[type] || '#4A8A2A');
    return wrap(PLANKS[type]);
  }
  if (n.endsWith('_leaves')) return wrap(LEAVES[n.slice(0, -7)] || '#3B7A1C');

  // Corales.
  if (n.includes('coral')) {
    if (n.startsWith('dead_')) return wrap('#857E79');
    const coral = { tube: '#3156D5', brain: '#CF5A9E', bubble: '#A118A0', fire: '#A7262F', horn: '#D8C742' };
    for (const k in coral) if (n.startsWith(k)) return wrap(coral[k]);
  }

  // Variantes: quitar sufijos/prefijos y buscar el material base.
  let base = n;
  for (const s of SUFFIXES) if (base.endsWith(s)) { base = base.slice(0, -s.length); break; }
  let found = lookup(base);
  if (!found) {
    let stripped = base;
    for (const p of PREFIXES) if (stripped.startsWith(p)) stripped = stripped.slice(p.length);
    found = lookup(stripped);
    if (!found && base.startsWith('deepslate_')) found = C.deepslate;
    if (!found && base.startsWith('polished_blackstone')) found = C.blackstone;
  }
  if (found) return wrap(found);

  if (n.endsWith('_ore')) return wrap(n.startsWith('deepslate') ? C.deepslate : C.stone);
  if (n.includes('glass')) return wrap(C.glass);
  if (n.endsWith('_carpet')) return wrap(C.moss_carpet);
  return wrap(hashColor(n));
}

// ---------- Formas ----------

const INVISIBLE = new Set(['air', 'cave_air', 'void_air', 'structure_void', 'barrier', 'light', 'moving_piston', 'tripwire']);
const TRANSLUCENT = { glass: 0.35, glass_pane: 0.35, ice: 0.7, frosted_ice: 0.7, water: 0.55, bubble_column: 0.55,
  slime_block: 0.75, honey_block: 0.8, nether_portal: 0.6, tinted_glass: 0.85 };

const PLANT_RE = /(sapling|propagule|_tulip|orchid|^short_grass$|^grass$|^tall_grass$|fern$|dead_bush|^dandelion$|^poppy$|^allium$|azure_bluet|oxeye_daisy|cornflower|lily_of_the_valley|wither_rose|sunflower|lilac|rose_bush|peony|sugar_cane|^wheat$|^carrots$|^potatoes$|^beetroots$|sweet_berry_bush|_mushroom$|kelp|seagrass|cobweb|^fire$|soul_fire|_roots$|_fungus$|nether_sprouts|weeping_vines|twisting_vines|cave_vines|hanging_roots|coral$|coral_fan$|torchflower|pitcher|_stem$|attached_|nether_wart$|bamboo_sapling|amethyst_bud|amethyst_cluster|pointed_dripstone|small_dripleaf|spore_blossom|eyeblossom|bush$|firefly_bush|short_dry_grass|tall_dry_grass|leaf_litter$)/;

const box = (x0, y0, z0, x1, y1, z1) => [x0 / 16, y0 / 16, z0 / 16, x1 / 16, y1 / 16, z1 / 16];

// Rota una caja definida "mirando al norte" hacia otra dirección (eje Y).
function rotate(b, facing) {
  const [x0, y0, z0, x1, y1, z1] = b;
  const rot = (x, z) => {
    switch (facing) {
      case 'east': return [1 - z, x];
      case 'south': return [1 - x, 1 - z];
      case 'west': return [z, 1 - x];
      default: return [x, z];
    }
  };
  const [ax, az] = rot(x0, z0);
  const [bx, bz] = rot(x1, z1);
  return [Math.min(ax, bx), y0, Math.min(az, bz), Math.max(ax, bx), y1, Math.max(az, bz)];
}

const flipY = (b) => [b[0], 1 - b[4], b[2], b[3], 1 - b[1], b[5]];
const OPPOSITE = { north: 'south', south: 'north', east: 'west', west: 'east' };
const DIRS = ['north', 'east', 'south', 'west'];

// Formas con conexiones (vallas, muros, paneles). "arm" = caja del brazo hacia el norte.
const CONNECTORS = {
  fence: { post: box(6, 0, 6, 10, 16, 10), arms: [box(7, 12, 0, 9, 15, 8), box(7, 6, 0, 9, 9, 8)] },
  wall: { post: box(4, 0, 4, 12, 16, 12), arms: [box(5, 0, 0, 11, 14, 8)] },
  pane: { post: box(7, 0, 7, 9, 16, 9), arms: [box(7, 0, 0, 9, 16, 8)] },
};

export function connectorBoxes(kind, conn) {
  const def = CONNECTORS[kind];
  const out = [def.post];
  for (const d of DIRS) {
    if (!conn[d]) continue;
    for (const a of def.arms) {
      const arm = kind === 'wall' && conn[d] === 'tall' ? [a[0], a[1], a[2], a[3], 1, a[5]] : a;
      out.push(rotate(arm, d));
    }
  }
  return out;
}

function shapeFor(n, props) {
  const facing = props.facing;
  if (n.endsWith('_slab')) {
    if (props.type === 'double') return null;
    return [props.type === 'top' ? box(0, 8, 0, 16, 16, 16) : box(0, 0, 0, 16, 8, 16)];
  }
  if (n.endsWith('_stairs')) {
    let parts = [box(0, 0, 0, 16, 8, 16), rotate(box(0, 8, 0, 16, 16, 8), facing || 'north')];
    if (props.half === 'top') parts = parts.map(flipY);
    return parts;
  }
  if (n.endsWith('_carpet') || n === 'lily_pad' || n === 'pink_petals' || n === 'leaf_litter' || n === 'wildflowers' || n === 'sculk_vein') return [box(0, 0, 0, 16, 1, 16)];
  if (n.endsWith('_pressure_plate')) return [box(1, 0, 1, 15, 1, 15)];
  if (n === 'rail' || n.endsWith('_rail') || n === 'redstone_wire') return [box(0, 0, 0, 16, 1, 16)];
  if (n === 'snow') return [box(0, 0, 0, 16, 2 * (Number(props.layers) || 1), 16)];
  if (n === 'repeater' || n === 'comparator') return [box(0, 0, 0, 16, 2, 16)];
  if (n === 'daylight_detector') return [box(0, 0, 0, 16, 6, 16)];
  if (n.endsWith('_trapdoor')) {
    if (props.open === 'true') return [rotate(box(0, 0, 13, 16, 16, 16), facing || 'north')];
    return [props.half === 'top' ? box(0, 13, 0, 16, 16, 16) : box(0, 0, 0, 16, 3, 16)];
  }
  if (n.endsWith('_door')) {
    let f = facing || 'north';
    if (props.open === 'true') {
      const i = DIRS.indexOf(f);
      f = DIRS[(i + (props.hinge === 'right' ? 3 : 1)) % 4];
    }
    return [rotate(box(0, 0, 13, 16, 16, 16), f)];
  }
  if (n.endsWith('_fence_gate')) {
    const g = box(0, 5, 7, 16, 16, 9);
    return [rotate(g, facing || 'north')];
  }
  if (n.endsWith('_fence')) return { connect: 'fence' };
  if (n.endsWith('_wall') && !/(torch|sign|banner|head|skull|fan)/.test(n)) return { connect: 'wall' };
  if (n.endsWith('_pane') || n === 'iron_bars') return { connect: 'pane' };
  if (n.endsWith('wall_torch')) return [rotate(box(6.5, 3, 11, 9.5, 13, 16), facing || 'north')];
  if (n.endsWith('torch')) return [box(7, 0, 7, 9, 10, 9)];
  if (n.endsWith('lantern')) return [box(5, 0, 5, 11, 9, 11)];
  if (n.endsWith('_button') || n === 'lever' || n === 'tripwire_hook') return [box(5, 0, 6, 11, 2, 10)];
  if (n === 'ladder') return [rotate(box(0, 0, 14, 16, 16, 16), facing || 'north')];
  if (n === 'vine' || n === 'glow_lichen') {
    const side = DIRS.find((d) => props[d] === 'true');
    return [side ? rotate(box(0, 0, 0, 16, 16, 1), side) : box(0, 15, 0, 16, 16, 16)];
  }
  if (n.endsWith('_wall_sign') || n.endsWith('_wall_banner')) return [rotate(box(0, 4, 14, 16, 12, 16), facing || 'north')];
  if (n.endsWith('_wall_hanging_sign')) return [rotate(box(1, 0, 7, 15, 10, 9), facing || 'north')];
  if (n.endsWith('_hanging_sign')) return [box(1, 0, 7, 15, 10, 9)];
  if (n.endsWith('_sign')) return [box(0, 7, 7, 16, 16, 9), box(7, 0, 7, 9, 7, 9)];
  if (n.endsWith('_banner')) return [box(1, 0, 7, 15, 16, 9)];
  if (n.endsWith('_bed')) return [box(0, 0, 0, 16, 9, 16)];
  if (n.endsWith('chest')) return [box(1, 0, 1, 15, 14, 15)];
  if (n === 'cake' || n.endsWith('_cake')) return [box(1, 0, 1, 15, 8, 15)];
  if (n.endsWith('_head') || n.endsWith('_skull')) return [box(4, 0, 4, 12, 8, 12)];
  if (n === 'flower_pot' || n.startsWith('potted_')) return [box(5, 0, 5, 11, 6, 11)];
  if (n === 'enchanting_table') return [box(0, 0, 0, 16, 12, 16)];
  if (n === 'stonecutter') return [box(0, 0, 0, 16, 9, 16)];
  if (n === 'end_portal_frame') return [box(0, 0, 0, 16, 13, 16)];
  if (n === 'farmland' || n === 'dirt_path') return [box(0, 0, 0, 16, 15, 16)];
  if (n === 'cactus') return [box(1, 0, 1, 15, 16, 15)];
  if (n.endsWith('campfire')) return [box(0, 0, 0, 16, 7, 16)];
  if (n === 'brewing_stand') return [box(7, 0, 7, 9, 14, 9), box(1, 0, 1, 15, 2, 15)];
  if (n === 'chain' || n === 'iron_chain' || n === 'end_rod' || n === 'lightning_rod' || n === 'bamboo') {
    const axis = props.axis || (facing === 'east' || facing === 'west' ? 'x' : facing === 'north' || facing === 'south' ? 'z' : 'y');
    if (axis === 'x') return [box(0, 7, 7, 16, 9, 9)];
    if (axis === 'z') return [box(7, 7, 0, 9, 9, 16)];
    return [box(7, 0, 7, 9, 16, 9)];
  }
  if (n === 'bell') return [box(4, 4, 4, 12, 13, 12)];
  if (n === 'sea_pickle' || n === 'turtle_egg' || n.endsWith('candle') || n === 'conduit') return [box(5, 0, 5, 11, 6, 11)];
  if (n === 'anvil' || n.endsWith('_anvil')) return [box(2, 0, 2, 14, 4, 14), box(6, 4, 4, 10, 10, 12), box(3, 10, 0, 13, 16, 16)];
  if (n === 'hopper') return [box(0, 10, 0, 16, 16, 16), box(4, 4, 4, 12, 10, 12), box(6, 0, 6, 10, 4, 10)];
  if (PLANT_RE.test(n)) return { plant: true };
  return null;
}

// Info de renderizado por entrada de paleta.
export function blockInfo(entry) {
  const full = entry.name;
  const n = full.slice(full.indexOf(':') + 1);
  const props = entry.props || {};
  if (INVISIBLE.has(n)) return { air: true };

  const colors = resolveColor(full);
  let alpha = 1;
  if (TRANSLUCENT[n] !== undefined) alpha = TRANSLUCENT[n];
  else if (n.endsWith('stained_glass') || n.endsWith('stained_glass_pane')) alpha = 0.5;
  else if (n === 'cobweb') alpha = 0.7;

  const shape = shapeFor(n, props);
  const info = { air: false, name: full, alpha, transparent: alpha < 1, ...colors };

  if (shape === null) {
    info.cube = true;
    info.opaque = alpha >= 1;
  } else if (Array.isArray(shape)) {
    info.boxes = shape;
  } else if (shape.connect) {
    info.connect = shape.connect;
    const has = DIRS.some((d) => props[d] !== undefined);
    if (has) {
      const conn = {};
      for (const d of DIRS) if (props[d] && props[d] !== 'false' && props[d] !== 'none') conn[d] = props[d];
      info.boxes = connectorBoxes(shape.connect, conn);
    }
  } else if (shape.plant) {
    info.plant = true;
    const h = /^(tall_|large_)|sunflower|lilac|rose_bush|peony|sugar_cane|kelp|seagrass|vines/.test(n) ? 16 : 12;
    info.boxes = [box(1.5, 0, 7.5, 14.5, h, 8.5), box(7.5, 0, 1.5, 8.5, h, 14.5)];
  }
  return info;
}

// Nombre legible: "minecraft:oak_stairs" -> "Oak Stairs".
export function prettyName(full) {
  const n = full.startsWith('minecraft:') ? full.slice(10) : full;
  return n.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
