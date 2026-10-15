import * as THREE from 'three';
import { CarSpecs, InputState } from '../types/game';

export interface PhysicsState {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  speedKmh: number;
  velocity: THREE.Vector3;
  angularVelocity: number;
  slipAngle: number;
  isDrifting: boolean;
  driftPoints: number;
  nitroMeter: number; // 0 to maxNitro
  maxNitro: number;
  isNitroActive: boolean;
  steerAngle: number;
  wheelSpin: number;
  progress: number; // 0 to 1 along track
  distanceTravelled: number;
  nearMissCount: number;
  hitStopTimer: number;
  camShake: number;
}

export class CarPhysics {
  public state: PhysicsState;
  private maxSpeedKmh: number;
  private accelRate: number;
  private brakeRate: number;
  private steerRate: number;
  private gripMultiplier: number;
  private friction: number;
  private nitroSpeedMultiplier: number;

  constructor(public specs: CarSpecs, startPos: THREE.Vector3, startRotY: number = 0) {
    // 1. ENGINE UPGRADE: Improves acceleration and top speed
    const engineLv = specs.upgrades.engine ?? specs.upgrades.topSpeed ?? 0;
    const topSpeedBonus = engineLv * 18; // +18 km/h per stage
    const accelBonus = engineLv * 1.5; // High-torque boost

    this.maxSpeedKmh = specs.baseTopSpeed + topSpeedBonus;
    this.accelRate = (specs.baseAcceleration + accelBonus) * 4.4;

    // 2. BRAKES UPGRADE: Improves deceleration stopping power
    const brakesLv = specs.upgrades.brakes ?? 0;
    this.brakeRate = 32.0 + brakesLv * 12.0; // Stage 0: 32, Stage 1: 44, Stage 2: 56, Stage 3: 68

    // 3. TIRES UPGRADE: Improves handling and cornering grip
    const tiresLv = specs.upgrades.tires ?? specs.upgrades.handling ?? 0;
    const handlingBonus = tiresLv * 1.4;
    this.steerRate = (specs.baseHandling + handlingBonus) * 0.33;
    this.gripMultiplier = 1.0 + tiresLv * 0.15; // Higher grip reduces unwanted slides
    this.friction = 0.985;

    // 4. NITRO UPGRADE: Increases boost capacity and boost top speed
    const nitroLv = specs.upgrades.nitro ?? 0;
    const maxNitro = 100 + nitroLv * 25; // 100 -> 125 -> 150 -> 175
    this.nitroSpeedMultiplier = 1.25 + nitroLv * 0.05; // 1.25x -> 1.40x

    this.state = {
      position: startPos.clone(),
      rotation: new THREE.Euler(0, startRotY, 0, 'YXZ'),
      speedKmh: 0,
      velocity: new THREE.Vector3(),
      angularVelocity: 0,
      slipAngle: 0,
      isDrifting: false,
      driftPoints: 0,
      nitroMeter: maxNitro,
      maxNitro,
      isNitroActive: false,
      steerAngle: 0,
      wheelSpin: 0,
      progress: 0,
      distanceTravelled: 0,
      nearMissCount: 0,
      hitStopTimer: 0,
      camShake: 0,
    };
  }

  public update(dt: number, input: InputState, trackCurve: THREE.CatmullRomCurve3, roadWidth: number): {
    hitBarrier: boolean;
    collectedNitro: boolean;
    passedFinish: boolean;
  } {
    let hitBarrier = false;

    // Hitstop freeze handling
    if (this.state.hitStopTimer > 0) {
      this.state.hitStopTimer -= dt;
      return { hitBarrier: false, collectedNitro: false, passedFinish: false };
    }

    if (this.state.camShake > 0) {
      this.state.camShake = Math.max(0, this.state.camShake - dt * 4);
    }

    // 1. Nitro Boost: Capacity & Drain
    if (input.nitro && this.state.nitroMeter > 5) {
      this.state.isNitroActive = true;
      this.state.nitroMeter = Math.max(0, this.state.nitroMeter - dt * 24);
    } else {
      this.state.isNitroActive = false;
      // Gradual refill up to maxNitro
      this.state.nitroMeter = Math.min(this.state.maxNitro, this.state.nitroMeter + dt * 4.5);
    }

    const currentMaxSpeed = this.state.isNitroActive
      ? this.maxSpeedKmh * this.nitroSpeedMultiplier
      : this.maxSpeedKmh;
    const effectiveAccel = this.state.isNitroActive ? this.accelRate * 1.85 : this.accelRate;

    // 2. Throttle & Braking
    if (input.throttle > 0) {
      this.state.speedKmh += input.throttle * effectiveAccel * dt * 10;
      if (this.state.speedKmh > currentMaxSpeed) {
        this.state.speedKmh = currentMaxSpeed;
      }
    } else if (input.brake > 0) {
      if (this.state.speedKmh > 0.5) {
        // High-performance forward braking
        this.state.speedKmh -= input.brake * this.brakeRate * dt * 10;
        if (this.state.speedKmh < 0) this.state.speedKmh = 0;
      } else {
        // Reverse gear
        this.state.speedKmh -= input.brake * (effectiveAccel * 0.45) * dt * 10;
        if (this.state.speedKmh < -48) this.state.speedKmh = -48;
      }
    } else {
      // Natural rolling resistance
      this.state.speedKmh *= Math.pow(this.friction, dt * 60);
      if (Math.abs(this.state.speedKmh) < 0.2) this.state.speedKmh = 0;
    }

    // 3. Steering, Tire Grip & Drift Dynamics
    const targetSteerAngle = -input.steer * 0.55;
    this.state.steerAngle = THREE.MathUtils.damp(this.state.steerAngle, targetSteerAngle, 12 * this.gripMultiplier, dt);

    const speedRatio = Math.min(Math.abs(this.state.speedKmh) / 60, 1.25);
    const isHandbrake = input.handbrake && Math.abs(this.state.speedKmh) > 22;

    if (isHandbrake) {
      this.state.isDrifting = true;
      this.state.slipAngle = THREE.MathUtils.damp(this.state.slipAngle, -input.steer * 0.45, 6, dt);
      this.state.angularVelocity = -input.steer * this.steerRate * 1.5;
      this.state.speedKmh *= 0.993;
      this.state.driftPoints += Math.floor(Math.abs(this.state.speedKmh) * dt * 2.8);
    } else if (Math.abs(input.steer) > 0.72 && Math.abs(this.state.speedKmh) > (135 * this.gripMultiplier)) {
      // High-speed natural power slide (tires upgrade increases slide threshold so car grips better)
      this.state.isDrifting = true;
      this.state.slipAngle = THREE.MathUtils.damp(this.state.slipAngle, -input.steer * 0.25, 4.5 * this.gripMultiplier, dt);
      this.state.angularVelocity = -input.steer * this.steerRate * 1.15;
      this.state.driftPoints += Math.floor(Math.abs(this.state.speedKmh) * dt * 1.4);
    } else {
      this.state.isDrifting = false;
      // Tires upgrade helps car snap back onto line faster
      this.state.slipAngle = THREE.MathUtils.damp(this.state.slipAngle, 0, 8.5 * this.gripMultiplier, dt);
      this.state.angularVelocity = -input.steer * this.steerRate * speedRatio;
    }

    this.state.rotation.y += this.state.angularVelocity * dt;

    // 4. Position update from velocity vector
    const speedMs = this.state.speedKmh / 3.6;
    const forwardAngle = this.state.rotation.y + this.state.slipAngle;
    const forwardX = Math.sin(forwardAngle) * speedMs;
    const forwardZ = Math.cos(forwardAngle) * speedMs;

    this.state.velocity.set(forwardX, 0, forwardZ);
    this.state.position.x += forwardX * dt;
    this.state.position.z += forwardZ * dt;

    // Wheel spin rotation
    const wheelRadius = 0.36;
    this.state.wheelSpin += (speedMs / wheelRadius) * dt;

    // Distance accumulated
    this.state.distanceTravelled += Math.abs(speedMs) * dt;

    // 5. Track spline height snapping & road boundary collision
    const approxT = Math.min(Math.max(this.state.position.z / trackCurve.getLength(), 0), 1);
    let bestT = approxT;
    let minDistSq = Infinity;
    const sampleWindow = 0.08;
    const steps = 24;

    for (let i = 0; i <= steps; i++) {
      const testT = Math.min(Math.max(approxT - sampleWindow / 2 + (i / steps) * sampleWindow, 0), 1);
      const pt = trackCurve.getPointAt(testT);
      const distSq = (pt.x - this.state.position.x) ** 2 + (pt.z - this.state.position.z) ** 2;
      if (distSq < minDistSq) {
        minDistSq = distSq;
        bestT = testT;
      }
    }

    this.state.progress = bestT;
    const roadPt = trackCurve.getPointAt(bestT);
    const roadTangent = trackCurve.getTangentAt(bestT).normalize();
    const roadNormal = new THREE.Vector3().crossVectors(roadTangent, new THREE.Vector3(0, 1, 0)).normalize();

    this.state.position.y = roadPt.y;

    const toCarX = this.state.position.x - roadPt.x;
    const toCarZ = this.state.position.z - roadPt.z;
    const lateralDist = toCarX * roadNormal.x + toCarZ * roadNormal.z;

    const maxLateral = roadWidth / 2 - 1.2;

    if (Math.abs(lateralDist) > maxLateral) {
      hitBarrier = true;
      const pushSign = lateralDist > 0 ? 1 : -1;
      this.state.position.x = roadPt.x + roadNormal.x * (maxLateral * pushSign);
      this.state.position.z = roadPt.z + roadNormal.z * (maxLateral * pushSign);

      this.state.speedKmh *= 0.65;
      this.state.hitStopTimer = 0.06;
      this.state.camShake = 0.45;
    }

    const passedFinish = this.state.progress >= 0.99;

    return {
      hitBarrier,
      collectedNitro: false,
      passedFinish,
    };
  }

  public resetPosition(trackCurve: THREE.CatmullRomCurve3, t: number = 0) {
    const pt = trackCurve.getPointAt(t);
    const tangent = trackCurve.getTangentAt(t).normalize();
    this.state.position.set(pt.x, pt.y, pt.z);
    this.state.rotation.y = Math.atan2(tangent.x, tangent.z);
    this.state.speedKmh = 0;
    this.state.slipAngle = 0;
    this.state.angularVelocity = 0;
    this.state.progress = t;
  }
}
