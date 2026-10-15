import { CarSpecs, SpoilerType, TrackInfo } from '../types/game';

export const UPGRADE_TIERS = [
  { level: 1, cost: 500, label: 'Stage 1 Street Tune' },
  { level: 2, cost: 1500, label: 'Stage 2 Track Spec' },
  { level: 3, cost: 3000, label: 'Stage 3 Pro Racing' },
];

export interface CustomizationItem<T = string> {
  id: T;
  name: string;
  price: number;
  isFree?: boolean;
  value?: string;
  previewColor?: string;
  description?: string;
}

export const COLOR_OPTIONS: CustomizationItem[] = [
  {
    id: '#F8FAFC',
    name: 'Pearl Himalayan White',
    price: 0,
    isFree: true,
    value: '#F8FAFC',
    previewColor: '#F8FAFC',
    description: 'Crisp factory gloss white (Default Free)',
  },
  {
    id: '#18181B',
    name: 'Stealth Obsidian Black',
    price: 0,
    isFree: true,
    value: '#18181B',
    previewColor: '#18181B',
    description: 'Midnight stealth obsidian black (Default Free)',
  },
  {
    id: '#DC2626',
    name: 'Rajput Crimson Red',
    price: 500,
    value: '#DC2626',
    previewColor: '#DC2626',
    description: 'High-gloss racing crimson finish',
  },
  {
    id: '#1D4ED8',
    name: 'Royal Metallic Blue',
    price: 600,
    value: '#1D4ED8',
    previewColor: '#1D4ED8',
    description: 'Deep metallic sea blue with pearlescent reflection',
  },
  {
    id: '#CBD5E1',
    name: 'Liquid Platinum Silver',
    price: 500,
    value: '#CBD5E1',
    previewColor: '#CBD5E1',
    description: 'Liquid chrome reflection with satin silver flakes',
  },
  {
    id: '#EAB308',
    name: '24K Royal Gold',
    price: 800,
    value: '#EAB308',
    previewColor: '#EAB308',
    description: 'Regal golden metallic lacquer',
  },
  {
    id: '#D97706',
    name: 'Royal Saffron Gold',
    price: 400,
    value: '#D97706',
    previewColor: '#D97706',
    description: 'Warm saffron orange-gold pearl',
  },
  {
    id: '#15803D',
    name: 'Emerald Rajput Green',
    price: 400,
    value: '#15803D',
    previewColor: '#15803D',
    description: 'British & Rajput heritage racing green',
  },
  {
    id: '#0284C7',
    name: 'Deccan Electric Cyan',
    price: 600,
    value: '#0284C7',
    previewColor: '#0284C7',
    description: 'Vibrant neon cyber cyan',
  },
];

export const RIM_OPTIONS: CustomizationItem[] = [
  {
    id: '#94A3B8',
    name: 'Stock Alloy Silver',
    price: 0,
    isFree: true,
    value: '#94A3B8',
    previewColor: '#94A3B8',
    description: 'Original factory sports rims',
  },
  {
    id: '#E5E7EB',
    name: 'Polished Chrome Spoke',
    price: 400,
    value: '#E5E7EB',
    previewColor: '#E5E7EB',
    description: 'Mirror-finish chrome lightweight alloys',
  },
  {
    id: '#CA8A04',
    name: 'Bronze Gold Turbine',
    price: 600,
    value: '#CA8A04',
    previewColor: '#CA8A04',
    description: 'Forged bronze racing dish wheels',
  },
  {
    id: '#1F2937',
    name: 'Matte Obsidian Star',
    price: 800,
    value: '#1F2937',
    previewColor: '#1F2937',
    description: 'Stealth matte black aerodynamic multi-spoke',
  },
  {
    id: '#BE185D',
    name: 'Rose Titanium Spec',
    price: 1000,
    value: '#BE185D',
    previewColor: '#BE185D',
    description: 'Exotic anodized rose-titanium hyper wheels',
  },
];

export const SPOILER_OPTIONS: CustomizationItem<SpoilerType>[] = [
  {
    id: 'stock',
    name: 'Stock Aero Profile',
    price: 0,
    isFree: true,
    description: 'Factory aerodynamic bodylines',
  },
  {
    id: 'ducktail',
    name: 'Sport Ducktail Lip',
    price: 500,
    description: 'Integrated carbon ducktail rear spoiler',
  },
  {
    id: 'gt_wing',
    name: 'GT Swan-Neck Wing',
    price: 1500,
    description: 'High-downforce carbon swan-neck track wing',
  },
  {
    id: 'hyper_fin',
    name: 'Le-Mans Apex Hyper Fin',
    price: 2500,
    description: 'Central dorsal fin with dual boomerang splitters',
  },
];

export const UNDERGLOW_OPTIONS: CustomizationItem[] = [
  {
    id: 'off',
    name: 'Underglow Off',
    price: 0,
    isFree: true,
    value: '',
    previewColor: '#27272A',
    description: 'No underbody neon lighting',
  },
  {
    id: '#F59E0B',
    name: 'Saffron Flame',
    price: 300,
    value: '#F59E0B',
    previewColor: '#F59E0B',
    description: 'Warm glowing saffron gold underbody neon',
  },
  {
    id: '#06B6D4',
    name: 'Electric Cyan',
    price: 300,
    value: '#06B6D4',
    previewColor: '#06B6D4',
    description: 'Cyberpunk electric cyan beam',
  },
  {
    id: '#22C55E',
    name: 'Toxic Green',
    price: 400,
    value: '#22C55E',
    previewColor: '#22C55E',
    description: 'Luminous racing toxic green glow',
  },
  {
    id: '#EC4899',
    name: 'Vibrant Magenta',
    price: 400,
    value: '#EC4899',
    previewColor: '#EC4899',
    description: 'Hot pink neon underglow ground wash',
  },
  {
    id: '#38BDF8',
    name: 'Ice Diamond Blue',
    price: 500,
    value: '#38BDF8',
    previewColor: '#38BDF8',
    description: 'Chilled crystalline ice blue reflection',
  },
];

// Helper to sanitize and normalize cars from storage or defaults
export function normalizeCar(raw: any, fallback: CarSpecs): CarSpecs {
  const upgrades = {
    engine: raw.upgrades?.engine ?? raw.upgrades?.topSpeed ?? 0,
    tires: raw.upgrades?.tires ?? raw.upgrades?.handling ?? 0,
    brakes: raw.upgrades?.brakes ?? 0,
    nitro: raw.upgrades?.nitro ?? 0,
  };

  const initialOwnedColors = Array.isArray(raw.ownedColors) && raw.ownedColors.length > 0
    ? Array.from(new Set([...raw.ownedColors, '#F8FAFC', '#18181B', raw.color || fallback.color]))
    : ['#F8FAFC', '#18181B', fallback.color];

  const initialOwnedRims = Array.isArray(raw.ownedRims) && raw.ownedRims.length > 0
    ? Array.from(new Set([...raw.ownedRims, '#94A3B8', raw.rimColor || fallback.rimColor]))
    : ['#94A3B8', fallback.rimColor];

  const initialOwnedSpoilers: SpoilerType[] = Array.isArray(raw.ownedSpoilers) && raw.ownedSpoilers.length > 0
    ? Array.from(new Set([...raw.ownedSpoilers, 'stock' as SpoilerType]))
    : ['stock'];

  const initialOwnedUnderglows = Array.isArray(raw.ownedUnderglows) && raw.ownedUnderglows.length > 0
    ? Array.from(new Set([...raw.ownedUnderglows, 'off', raw.underglowColor || fallback.underglowColor]))
    : ['off', fallback.underglowColor];

  return {
    ...fallback,
    ...raw,
    upgrades,
    ownedColors: initialOwnedColors,
    ownedRims: initialOwnedRims,
    ownedSpoilers: initialOwnedSpoilers,
    ownedUnderglows: initialOwnedUnderglows,
    spoilerType: raw.spoilerType || fallback.spoilerType || 'stock',
    hasUnderglow: typeof raw.hasUnderglow === 'boolean' ? raw.hasUnderglow : fallback.hasUnderglow,
    glbUrl: raw.glbUrl !== undefined ? raw.glbUrl : fallback.glbUrl,
    isGlbCustom: raw.isGlbCustom !== undefined ? raw.isGlbCustom : fallback.isGlbCustom,
    modelFileName: raw.modelFileName || fallback.modelFileName,
    glbRotationOffset: typeof raw.glbRotationOffset === 'number' ? raw.glbRotationOffset : fallback.glbRotationOffset ?? 0,
    glbScaleMultiplier: typeof raw.glbScaleMultiplier === 'number' ? raw.glbScaleMultiplier : fallback.glbScaleMultiplier ?? 1.0,
    glbYOffset: typeof raw.glbYOffset === 'number' ? raw.glbYOffset : fallback.glbYOffset ?? 0,
    glbUseOriginalMaterials: typeof raw.glbUseOriginalMaterials === 'boolean' ? raw.glbUseOriginalMaterials : fallback.glbUseOriginalMaterials ?? false,
  };
}

export const INITIAL_CARS: CarSpecs[] = [
  {
    id: 'raja_gt',
    name: 'Raja GT',
    descriptiveSubtitle: 'Royal Grand Tourer • 4.0L Twin-Turbo V8',
    desiTitle: 'महाराजा GT',
    price: 0,
    isUnlocked: true,
    baseTopSpeed: 235,
    baseAcceleration: 6.8,
    baseHandling: 7.2,
    baseNitro: 6.5,
    color: '#D97706', // Royal Saffron
    rimColor: '#E5E7EB', // Polished Chrome
    underglowColor: '#F59E0B',
    hasUnderglow: true,
    spoilerType: 'ducktail',
    style: 'raja',
    upgrades: {
      engine: 0,
      tires: 0,
      brakes: 0,
      nitro: 0,
    },
    ownedColors: ['#F8FAFC', '#18181B', '#D97706'],
    ownedRims: ['#94A3B8', '#E5E7EB'],
    ownedSpoilers: ['stock', 'ducktail'],
    ownedUnderglows: ['off', '#F59E0B'],
  },
  {
    id: 'thar_falcon',
    name: 'Thar Falcon',
    descriptiveSubtitle: 'Aero Rally Beast • 5.0L Supercharged V8',
    desiTitle: 'थार फ़ाल्कन',
    price: 1800,
    isUnlocked: false,
    baseTopSpeed: 255,
    baseAcceleration: 7.9,
    baseHandling: 7.8,
    baseNitro: 7.5,
    color: '#15803D', // Emerald Rajput Green
    rimColor: '#1F2937', // Matte Obsidian
    underglowColor: '#22C55E',
    hasUnderglow: true,
    spoilerType: 'stock',
    style: 'thar',
    upgrades: {
      engine: 0,
      tires: 0,
      brakes: 0,
      nitro: 0,
    },
    ownedColors: ['#F8FAFC', '#18181B', '#15803D'],
    ownedRims: ['#94A3B8', '#1F2937'],
    ownedSpoilers: ['stock'],
    ownedUnderglows: ['off', '#22C55E'],
  },
  {
    id: 'cheetah_rs',
    name: 'Cheetah RS',
    descriptiveSubtitle: 'V10 Track Weapon • High-Downforce Aero',
    desiTitle: 'चीता RS',
    price: 3800,
    isUnlocked: false,
    baseTopSpeed: 285,
    baseAcceleration: 8.9,
    baseHandling: 8.8,
    baseNitro: 8.2,
    color: '#DC2626', // Rajput Crimson
    rimColor: '#CA8A04', // Bronze Gold
    underglowColor: '#EC4899',
    hasUnderglow: true,
    spoilerType: 'gt_wing',
    style: 'cheetah',
    upgrades: {
      engine: 0,
      tires: 0,
      brakes: 0,
      nitro: 0,
    },
    ownedColors: ['#F8FAFC', '#18181B', '#DC2626'],
    ownedRims: ['#94A3B8', '#CA8A04'],
    ownedSpoilers: ['stock', 'gt_wing'],
    ownedUnderglows: ['off', '#EC4899'],
  },
  {
    id: 'garuda_v12',
    name: 'Garuda V12',
    descriptiveSubtitle: 'Quad-Turbo Hypercar • Active Aero Stance',
    desiTitle: 'गरुड़ V12',
    price: 6500,
    isUnlocked: false,
    baseTopSpeed: 330,
    baseAcceleration: 9.7,
    baseHandling: 9.5,
    baseNitro: 9.8,
    color: '#0284C7', // Deccan Electric Cyan
    rimColor: '#BE185D', // Rose Titanium
    underglowColor: '#06B6D4',
    hasUnderglow: true,
    spoilerType: 'hyper_fin',
    style: 'garuda',
    upgrades: {
      engine: 0,
      tires: 0,
      brakes: 0,
      nitro: 0,
    },
    ownedColors: ['#F8FAFC', '#18181B', '#0284C7'],
    ownedRims: ['#94A3B8', '#BE185D'],
    ownedSpoilers: ['stock', 'hyper_fin'],
    ownedUnderglows: ['off', '#06B6D4'],
  },
  {
    id: 'custom_glb',
    name: 'Custom Exotic (GLB)',
    descriptiveSubtitle: 'Imported 3D GLB/GLTF Vehicle Model',
    desiTitle: 'कस्टम एग्जॉटिक',
    price: 0,
    isUnlocked: true,
    baseTopSpeed: 300,
    baseAcceleration: 9.0,
    baseHandling: 8.8,
    baseNitro: 8.5,
    color: '#DC2626',
    rimColor: '#E5E7EB',
    underglowColor: '#06B6D4',
    hasUnderglow: true,
    spoilerType: 'stock',
    style: 'custom_glb',
    glbUrl: '/models/custom_car.glb',
    isGlbCustom: true,
    modelFileName: 'custom_car.glb',
    glbRotationOffset: 0,
    glbScaleMultiplier: 1.0,
    glbYOffset: 0,
    glbUseOriginalMaterials: false,
    upgrades: {
      engine: 0,
      tires: 0,
      brakes: 0,
      nitro: 0,
    },
    ownedColors: ['#F8FAFC', '#18181B', '#DC2626'],
    ownedRims: ['#94A3B8', '#E5E7EB'],
    ownedSpoilers: ['stock'],
    ownedUnderglows: ['off', '#06B6D4'],
  },
];

export const TRACKS: TrackInfo[] = [
  {
    id: 'marine_drive',
    name: 'Marine Drive Cyber Highway',
    hindiName: 'मरीन ड्राइव कोस्टल',
    description: 'Neon coastal highway with sweeping sea curves, ocean promenade, and Mumbai skyline.',
    difficulty: 'Easy',
    lengthKm: 3.2,
    targetTimeSec: 85,
    themeColor: '#06B6D4',
    skyColor: '#0B132B',
    fogColor: '#0D1B2A',
    groundColor: '#1B263B',
  },
  {
    id: 'western_ghats',
    name: 'Western Ghats Serpent Pass',
    hindiName: 'पश्चिमी घाट सरपेंट पास',
    description: 'Misty hairpin turns, mountain cliffs, lush jungle cuttings, and high-speed drift tunnels.',
    difficulty: 'Medium',
    lengthKm: 4.0,
    targetTimeSec: 105,
    themeColor: '#10B981',
    skyColor: '#064E3B',
    fogColor: '#065F46',
    groundColor: '#022C22',
  },
  {
    id: 'thar_desert',
    name: 'Thar Desert Grand Expressway',
    hindiName: 'थार मरुस्थल एक्सप्रेसवे',
    description: 'Golden sunset dunes, massive straightaways for top-speed records, and wind turbine speed traps.',
    difficulty: 'Hard',
    lengthKm: 5.0,
    targetTimeSec: 120,
    themeColor: '#F59E0B',
    skyColor: '#451A03',
    fogColor: '#78350F',
    groundColor: '#292524',
  },
];
