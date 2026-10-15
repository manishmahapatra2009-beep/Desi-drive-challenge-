export type SpoilerType = 'stock' | 'ducktail' | 'gt_wing' | 'hyper_fin';

export interface CarUpgrades {
  engine: number; // 0 to 3
  tires: number; // 0 to 3
  brakes: number; // 0 to 3
  nitro: number; // 0 to 3
  // Legacy fields for backwards compatibility
  topSpeed?: number;
  acceleration?: number;
  handling?: number;
}

export interface CarSpecs {
  id: string;
  name: string;
  descriptiveSubtitle: string;
  desiTitle: string;
  price: number;
  isUnlocked: boolean;
  baseTopSpeed: number; // km/h
  baseAcceleration: number; // 0-100 score 1-10
  baseHandling: number; // 1-10
  baseNitro: number; // 1-10
  color: string;
  rimColor: string;
  underglowColor: string;
  hasUnderglow: boolean;
  spoilerType: SpoilerType;
  style: 'raja' | 'thar' | 'cheetah' | 'garuda' | 'custom_glb';
  upgrades: CarUpgrades;
  ownedColors: string[];
  ownedRims: string[];
  ownedSpoilers: SpoilerType[];
  ownedUnderglows: string[];
  glbUrl?: string;
  isGlbCustom?: boolean;
  modelFileName?: string;
  glbRotationOffset?: number; // Y-axis rotation in radians (e.g. 0, Math.PI/2, Math.PI, -Math.PI/2)
  glbScaleMultiplier?: number; // Scale multiplier (0.5 to 2.5)
  glbYOffset?: number; // Height adjustment in units (-0.5 to 0.5)
  glbUseOriginalMaterials?: boolean; // Preserve original model textures vs apply custom paint
}

export type TrackId = 'marine_drive' | 'western_ghats' | 'thar_desert';

export interface TrackInfo {
  id: TrackId;
  name: string;
  hindiName: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  lengthKm: number;
  targetTimeSec: number;
  themeColor: string;
  skyColor: string;
  fogColor: string;
  groundColor: string;
}

export type GameState = 'showroom' | 'garage' | 'track_select' | 'racing' | 'paused' | 'race_over';

export interface GameStats {
  coinsCollected: number;
  distanceTraveled: number;
  topSpeedReached: number;
  driftPoints: number;
  nearMissCount: number;
  timeElapsed: number;
  completed: boolean;
}

export interface InputState {
  throttle: number; // 0 to 1
  brake: number; // 0 to 1
  steer: number; // -1 to 1
  handbrake: boolean;
  nitro: boolean;
  horn: boolean;
}
