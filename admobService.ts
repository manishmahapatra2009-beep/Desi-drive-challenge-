/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Google AdMob Integration Service for Desi Drive Challenge
 * Follows strict Google Play & AdMob Policies:
 * - Uses official Google AdMob Test Ad Unit IDs during development
 * - User-initiated Rewarded Ads ONLY (no forced ads during driving)
 * - Zero real-money claims; virtual coins only
 * - Clear reward declarations before the player opts in
 */

export interface AdMobConfig {
  appId: string;
  rewardedAdUnitId: string;
  interstitialAdUnitId: string;
  bannerAdUnitId: string;
  isTestMode: boolean;
}

// Official Google AdMob Test Ad Unit IDs for Android
// https://developers.google.com/admob/android/test-ads
export const ADMOB_TEST_CONFIG: AdMobConfig = {
  appId: 'ca-app-pub-3940256099942544~3347511713',
  rewardedAdUnitId: 'ca-app-pub-3940256099942544/5224354917',
  interstitialAdUnitId: 'ca-app-pub-3940256099942544/1033173712',
  bannerAdUnitId: 'ca-app-pub-3940256099942544/6300978111',
  isTestMode: true,
};

export interface RewardedAdState {
  isAvailable: boolean;
  isLoading: boolean;
  cooldownSeconds: number;
}

class AdMobManager {
  private lastRewardedTime: number = 0;
  private readonly REWARD_COOLDOWN_MS = 15000; // 15s between reward ads to prevent spam
  public readonly REWARD_COIN_AMOUNT = 500;

  /**
   * Check if running inside a native Capacitor / Android APK wrapper
   */
  public isNative(): boolean {
    const win = window as any;
    return typeof win.Capacitor !== 'undefined' && win.Capacitor.isNativePlatform();
  }

  /**
   * Check cooldown remaining in seconds
   */
  public getCooldownRemaining(): number {
    const elapsed = Date.now() - this.lastRewardedTime;
    if (elapsed < this.REWARD_COOLDOWN_MS) {
      return Math.ceil((this.REWARD_COOLDOWN_MS - elapsed) / 1000);
    }
    return 0;
  }

  /**
   * Initialize native AdMob SDK if running inside Android APK
   */
  public async initialize(): Promise<void> {
    const win = window as any;
    if (this.isNative() && win.Capacitor?.Plugins?.AdMob) {
      try {
        await win.Capacitor.Plugins.AdMob.initialize({
          requestTrackingAuthorization: true,
          testingDevices: ['EMULATOR'],
          initializeForTesting: true,
        });
        console.log('[AdMob] Native SDK initialized with test devices');
      } catch (err) {
        console.warn('[AdMob] Native initialization fallback to web test mode', err);
      }
    }
  }

  /**
   * Mark rewarded ad as watched to start cooldown
   */
  public recordRewardGranted(): void {
    this.lastRewardedTime = Date.now();
  }
}

export const admobManager = new AdMobManager();
