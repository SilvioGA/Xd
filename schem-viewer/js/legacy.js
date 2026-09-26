// Tabla de IDs numéricos (formato .schematic de MCEdit, versiones <= 1.12)
// a nombres modernos. Aproximada: cubre los bloques y variantes más usados.

export const DYES = ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray',
  'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black'];
const WOODS = ['oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark_oak'];

const NAMES = `air stone grass_block dirt cobblestone oak_planks oak_sapling bedrock water water
lava lava sand gravel gold_ore iron_ore coal_ore oak_log oak_leaves sponge
glass lapis_ore lapis_block dispenser sandstone note_block red_bed powered_rail detector_rail sticky_piston
cobweb short_grass dead_bush piston piston_head white_wool moving_piston dandelion poppy brown_mushroom
red_mushroom gold_block iron_block smooth_stone_slab smooth_stone_slab bricks tnt bookshelf mossy_cobblestone obsidian
torch fire spawner oak_stairs chest redstone_wire diamond_ore diamond_block crafting_table wheat
farmland furnace furnace oak_sign oak_door ladder rail cobblestone_stairs oak_wall_sign lever
stone_pressure_plate iron_door oak_pressure_plate redstone_ore redstone_ore redstone_torch redstone_torch stone_button snow ice
snow_block cactus clay sugar_cane jukebox oak_fence carved_pumpkin netherrack soul_sand glowstone
nether_portal jack_o_lantern cake repeater repeater white_stained_glass oak_trapdoor infested_stone stone_bricks brown_mushroom_block
red_mushroom_block iron_bars glass_pane melon pumpkin_stem melon_stem vine oak_fence_gate brick_stairs stone_brick_stairs
mycelium lily_pad nether_bricks nether_brick_fence nether_brick_stairs nether_wart enchanting_table brewing_stand cauldron end_portal
end_portal_frame end_stone dragon_egg redstone_lamp redstone_lamp oak_slab oak_slab cocoa sandstone_stairs emerald_ore
ender_chest tripwire_hook tripwire emerald_block spruce_stairs birch_stairs jungle_stairs command_block beacon cobblestone_wall
flower_pot carrots potatoes oak_button skeleton_skull anvil trapped_chest light_weighted_pressure_plate heavy_weighted_pressure_plate comparator
comparator daylight_detector redstone_block nether_quartz_ore hopper quartz_block quartz_stairs activator_rail dropper white_terracotta
white_stained_glass_pane acacia_leaves acacia_log acacia_stairs dark_oak_stairs slime_block barrier iron_trapdoor prismarine sea_lantern
hay_block white_carpet terracotta coal_block packed_ice sunflower white_banner white_wall_banner daylight_detector red_sandstone
red_sandstone_stairs red_sandstone_slab red_sandstone_slab spruce_fence_gate birch_fence_gate jungle_fence_gate dark_oak_fence_gate acacia_fence_gate spruce_fence birch_fence
jungle_fence dark_oak_fence acacia_fence spruce_door birch_door jungle_door acacia_door dark_oak_door end_rod chorus_plant
chorus_flower purpur_block purpur_pillar purpur_stairs purpur_slab purpur_slab end_stone_bricks beetroots dirt_path end_gateway
repeating_command_block chain_command_block frosted_ice magma_block nether_wart_block red_nether_bricks bone_block structure_void observer`
  .split(/\s+/);

for (let i = 0; i < 16; i++) NAMES[219 + i] = `${DYES[i]}_shulker_box`;
for (let i = 0; i < 16; i++) NAMES[235 + i] = `${DYES[i]}_glazed_terracotta`;
NAMES[251] = 'white_concrete';
NAMES[252] = 'white_concrete_powder';
NAMES[255] = 'structure_block';

const STAIR_FACING = ['east', 'west', 'south', 'north'];
const DOOR_FACING = ['east', 'south', 'west', 'north'];
const TORCH_FACING = { 1: 'east', 2: 'west', 3: 'south', 4: 'north' };
const SLAB_43 = ['smooth_stone', 'sandstone', 'oak', 'cobblestone', 'brick', 'stone_brick', 'nether_brick', 'quartz'];
const DYED = { 35: 'wool', 95: 'stained_glass', 159: 'terracotta', 160: 'stained_glass_pane', 171: 'carpet', 251: 'concrete', 252: 'concrete_powder' };
const FLOWERS = ['poppy', 'blue_orchid', 'allium', 'azure_bluet', 'red_tulip', 'orange_tulip', 'white_tulip', 'pink_tulip', 'oxeye_daisy'];
const DOUBLE_PLANTS = ['sunflower', 'lilac', 'tall_grass', 'large_fern', 'rose_bush', 'peony'];
const STAIRS = new Set([53, 67, 108, 109, 114, 128, 134, 135, 136, 156, 163, 164, 180, 203]);
const DOORS = new Set([64, 71, 193, 194, 195, 196, 197]);

// Devuelve [nombre, props] para un id + data legacy.
export function legacyState(id, data) {
  if (DYED[id]) return [`${DYES[data & 15]}_${DYED[id]}`, {}];
  if (STAIRS.has(id)) return [NAMES[id], { facing: STAIR_FACING[data & 3], half: data & 4 ? 'top' : 'bottom' }];
  if (DOORS.has(id)) {
    if (data & 8) return [NAMES[id], { half: 'upper', facing: 'north' }];
    return [NAMES[id], { half: 'lower', facing: DOOR_FACING[data & 3], open: data & 4 ? 'true' : 'false' }];
  }
  switch (id) {
    case 1: return [['stone', 'granite', 'polished_granite', 'diorite', 'polished_diorite', 'andesite', 'polished_andesite'][data] || 'stone', {}];
    case 3: return [['dirt', 'coarse_dirt', 'podzol'][data] || 'dirt', {}];
    case 5: return [`${WOODS[data % 6]}_planks`, {}];
    case 6: return [`${WOODS[(data & 7) % 6]}_sapling`, {}];
    case 12: return [data === 1 ? 'red_sand' : 'sand', {}];
    case 17:
    case 162: {
      const wood = id === 17 ? WOODS[data & 3] : WOODS[4 + (data & 1)];
      const axis = (data >> 2) & 3;
      if (axis === 3) return [`${wood}_wood`, {}];
      return [`${wood}_log`, { axis: ['y', 'x', 'z'][axis] }];
    }
    case 18: return [`${WOODS[data & 3]}_leaves`, {}];
    case 161: return [`${WOODS[4 + (data & 1)]}_leaves`, {}];
    case 24: return [['sandstone', 'chiseled_sandstone', 'cut_sandstone'][data & 3] || 'sandstone', {}];
    case 179: return [['red_sandstone', 'chiseled_red_sandstone', 'cut_red_sandstone'][data & 3] || 'red_sandstone', {}];
    case 31: return [['dead_bush', 'short_grass', 'fern'][data] || 'short_grass', {}];
    case 38: return [FLOWERS[data] || 'poppy', {}];
    case 175: return [DOUBLE_PLANTS[data & 7] || 'tall_grass', { half: data & 8 ? 'upper' : 'lower' }];
    case 43: return [`${SLAB_43[data & 7]}_slab`, { type: 'double' }];
    case 44: return [`${SLAB_43[data & 7]}_slab`, { type: data & 8 ? 'top' : 'bottom' }];
    case 125: return [`${WOODS[(data & 7) % 6]}_slab`, { type: 'double' }];
    case 126: return [`${WOODS[(data & 7) % 6]}_slab`, { type: data & 8 ? 'top' : 'bottom' }];
    case 181: return ['red_sandstone_slab', { type: 'double' }];
    case 182: return ['red_sandstone_slab', { type: data & 8 ? 'top' : 'bottom' }];
    case 204: return ['purpur_slab', { type: 'double' }];
    case 205: return ['purpur_slab', { type: data & 8 ? 'top' : 'bottom' }];
    case 98: return [['stone_bricks', 'mossy_stone_bricks', 'cracked_stone_bricks', 'chiseled_stone_bricks'][data & 3], {}];
    case 155: return [['quartz_block', 'chiseled_quartz_block', 'quartz_pillar', 'quartz_pillar', 'quartz_pillar'][data] || 'quartz_block', {}];
    case 168: return [['prismarine', 'prismarine_bricks', 'dark_prismarine'][data] || 'prismarine', {}];
    case 139: return [data === 1 ? 'mossy_cobblestone_wall' : 'cobblestone_wall', {}];
    case 19: return [data === 1 ? 'wet_sponge' : 'sponge', {}];
    case 50:
    case 75:
    case 76: {
      const base = id === 50 ? 'torch' : 'redstone_torch';
      if (TORCH_FACING[data]) return [base.replace('torch', 'wall_torch'), { facing: TORCH_FACING[data] }];
      return [base, {}];
    }
    case 65:
    case 68: return [NAMES[id], { facing: ['north', 'north', 'north', 'south', 'west', 'east'][data] || 'north' }];
    case 78: return ['snow', { layers: String((data & 7) + 1) }];
    case 96:
    case 167: return [NAMES[id], {
      facing: ['south', 'north', 'east', 'west'][data & 3], // 0=sur, 1=norte, 2=este, 3=oeste (aprox.)
      half: data & 8 ? 'top' : 'bottom',
      open: data & 4 ? 'true' : 'false',
    }];
    case 107: case 183: case 184: case 185: case 186: case 187:
      return [NAMES[id], { facing: ['south', 'west', 'north', 'east'][data & 3], open: data & 4 ? 'true' : 'false' }];
    // Estandartes: el color va en el bloque con datos (se aplica al leer el archivo).
    case 176: return ['white_banner', { rotation: String(data) }];
    case 177: return ['white_wall_banner', { facing: { 2: 'north', 3: 'south', 4: 'west', 5: 'east' }[data] || 'north' }];
    case 8: case 9: return ['water', {}];
    case 10: case 11: return ['lava', {}];
    default:
      return [NAMES[id] || 'stone', {}];
  }
}
