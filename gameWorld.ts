import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildCar, Car3DObject } from './carBuilder';
import { loadGLBCar } from './glbCarLoader';
import { buildTrack, TrackData } from './trackBuilder';
import { TrafficManager } from './trafficManager';
import { CarPhysics } from './gamePhysics';
import { soundManager } from '../audio/soundManager';
import { CarSpecs, GameStats, InputState, TrackInfo } from '../types/game';

export interface GameWorldController {
  container: HTMLDivElement;
  input: InputState;
  updateCarSpecs: (specs: CarSpecs) => void;
  cycleCamera: () => 'chase' | 'close' | 'hood' | 'orbit';
  resetCar: () => void;
  getStats: () => GameStats;
  getPhysicsState: () => {
    speedKmh: number;
    nitroMeter: number;
    maxNitro: number;
    isDrifting: boolean;
    driftPoints: number;
    progress: number;
  };
  pause: () => void;
  resume: () => void;
  dispose: () => void;
}

export type CameraViewMode = 'chase' | 'close' | 'hood' | 'orbit';

export function initGameWorld(
  container: HTMLDivElement,
  carSpecs: CarSpecs,
  trackInfo: TrackInfo,
  onCoinCollected: (totalCoins: number, gain: number) => void,
  onCheckpointPassed: (checkpointIndex: number, totalCheckpoints: number) => void,
  onRaceFinished: (stats: GameStats) => void
): GameWorldController {
  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;

  // 1. Scene, Camera, Renderer
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(trackInfo.skyColor);
  scene.fog = new THREE.FogExp2(trackInfo.fogColor, 0.0035);

  const camera = new THREE.PerspectiveCamera(60, width / height, 0.2, 800);
  camera.position.set(0, 4, -8);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  container.appendChild(renderer.domElement);

  // Studio Environment Reflection via RoomEnvironment
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();
  scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  pmremGenerator.dispose();

  // 2. Lighting Rig
  const dirLight = new THREE.DirectionalLight(0xfffaed, 3.2);
  dirLight.position.set(30, 60, 20);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.near = 1;
  dirLight.shadow.camera.far = 160;
  dirLight.shadow.camera.left = -30;
  dirLight.shadow.camera.right = 30;
  dirLight.shadow.camera.top = 30;
  dirLight.shadow.camera.bottom = -30;
  dirLight.shadow.bias = -0.0005;
  dirLight.shadow.normalBias = 0.02;
  scene.add(dirLight);

  const hemiLight = new THREE.HemisphereLight(new THREE.Color(trackInfo.skyColor), new THREE.Color(trackInfo.groundColor), 1.0);
  scene.add(hemiLight);

  // 3. Track Generation
  const trackData: TrackData = buildTrack(trackInfo);
  scene.add(trackData.group);

  // 4. Traffic Setup
  const trafficManager = new TrafficManager(trackData.curve, trackData.trackLength, 9);
  scene.add(trafficManager.group);

  // 5. Player Car Setup
  let car3D: Car3DObject = buildCar(carSpecs);
  scene.add(car3D.group);

  const startPt = trackData.curve.getPointAt(0.01);
  const startTangent = trackData.curve.getTangentAt(0.01).normalize();
  const startRotY = Math.atan2(startTangent.x, startTangent.z);

  const physics = new CarPhysics(carSpecs, startPt, startRotY);
  car3D.group.position.copy(physics.state.position);
  car3D.group.rotation.copy(physics.state.rotation);

  // Nitro Flames attached to exhaust pipes
  const nitroFlames: THREE.Mesh[] = [];
  const flameMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.85,
  });

  const setupNitroFlames = (targetCar: Car3DObject) => {
    nitroFlames.forEach((f) => {
      if (f.parent) f.parent.remove(f);
      f.geometry.dispose();
    });
    nitroFlames.length = 0;

    targetCar.exhaustPipes.forEach((exhPos) => {
      const flameGeo = new THREE.ConeGeometry(0.12, 0.9, 12);
      flameGeo.rotateX(-Math.PI / 2);
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.copy(exhPos);
      flame.position.z -= 0.45;
      flame.visible = false;
      targetCar.group.add(flame);
      nitroFlames.push(flame);
    });
  };

  setupNitroFlames(car3D);

  if (carSpecs.glbUrl) {
    loadGLBCar(carSpecs.glbUrl, carSpecs)
      .then((glbCar) => {
        scene.remove(car3D.group);
        car3D = glbCar;
        car3D.group.position.copy(physics.state.position);
        car3D.group.rotation.copy(physics.state.rotation);
        scene.add(car3D.group);
        setupNitroFlames(car3D);
      })
      .catch((err) => {
        console.warn('GLB car could not be loaded into race world, proceeding with procedural model:', err);
      });
  }

  // 6. Particle Systems (Tire Drift Smoke)
  const smokeCount = 120;
  const smokeGeo = new THREE.PlaneGeometry(0.5, 0.5);
  const smokeMat = new THREE.MeshBasicMaterial({
    color: 0xd4d4d8,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const smokeParticles: { mesh: THREE.Mesh; life: number; maxLife: number; vel: THREE.Vector3 }[] = [];
  const smokeGroup = new THREE.Group();
  scene.add(smokeGroup);

  for (let i = 0; i < smokeCount; i++) {
    const mesh = new THREE.Mesh(smokeGeo, smokeMat);
    mesh.visible = false;
    smokeGroup.add(mesh);
    smokeParticles.push({
      mesh,
      life: 0,
      maxLife: 0.6,
      vel: new THREE.Vector3(),
    });
  }

  let smokeIdx = 0;
  function emitSmoke(pos: THREE.Vector3) {
    const p = smokeParticles[smokeIdx % smokeCount];
    smokeIdx++;
    p.mesh.position.copy(pos);
    p.mesh.position.x += (Math.random() - 0.5) * 0.4;
    p.mesh.position.z += (Math.random() - 0.5) * 0.4;
    p.mesh.scale.setScalar(0.4 + Math.random() * 0.4);
    p.mesh.visible = true;
    p.life = 0.5 + Math.random() * 0.2;
    p.maxLife = p.life;
    p.vel.set((Math.random() - 0.5) * 0.8, 0.4 + Math.random() * 0.6, (Math.random() - 0.5) * 0.8);
  }

  // 7. Input Handling
  const input: InputState = {
    throttle: 0,
    brake: 0,
    steer: 0,
    handbrake: false,
    nitro: false,
    horn: false,
  };

  // Keyboard Event Listeners
  const onKeyDown = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        input.throttle = 1;
        break;
      case 'KeyS':
      case 'ArrowDown':
        input.brake = 1;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        input.steer = -1;
        break;
      case 'KeyD':
      case 'ArrowRight':
        input.steer = 1;
        break;
      case 'Space':
        input.handbrake = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
      case 'KeyN':
        input.nitro = true;
        break;
      case 'KeyH':
        if (!input.horn) {
          input.horn = true;
          soundManager.playDesiHorn();
        }
        break;
      case 'KeyC':
        cycleCameraMode();
        break;
      case 'KeyR':
        resetToCurrentTrack();
        break;
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        input.throttle = 0;
        break;
      case 'KeyS':
      case 'ArrowDown':
        input.brake = 0;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        if (input.steer < 0) input.steer = 0;
        break;
      case 'KeyD':
      case 'ArrowRight':
        if (input.steer > 0) input.steer = 0;
        break;
      case 'Space':
        input.handbrake = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
      case 'KeyN':
        input.nitro = false;
        break;
      case 'KeyH':
        input.horn = false;
        break;
    }
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  // 8. Camera Views
  let cameraMode: CameraViewMode = 'chase';
  const cycleCameraMode = (): CameraViewMode => {
    const modes: CameraViewMode[] = ['chase', 'close', 'hood', 'orbit'];
    const idx = modes.indexOf(cameraMode);
    cameraMode = modes[(idx + 1) % modes.length];
    return cameraMode;
  };

  const resetToCurrentTrack = () => {
    physics.resetPosition(trackData.curve, 0.01);
  };

  // 9. Game Stats Tracking
  let totalCoinsEarnedInSession = 0;
  let topSpeedRecord = 0;
  let raceCompleted = false;
  let timeElapsed = 0;
  let isPaused = false;

  const clock = new THREE.Clock();
  soundManager.startEngine();

  // Resize Listener
  const onResize = () => {
    if (!container) return;
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener('resize', onResize);

  // 10. Main Game Loop (60 FPS)
  let reqId: number;

  const animate = () => {
    reqId = requestAnimationFrame(animate);

    if (isPaused) return;

    const rawDt = clock.getDelta();
    const dt = Math.min(rawDt, 0.05); // Clamped delta
    timeElapsed += dt;

    // 1. Update Physics
    const physicsResult = physics.update(dt, input, trackData.curve, trackData.roadWidth);

    if (physicsResult.hitBarrier) {
      soundManager.playCrashSound(0.8);
    }

    if (physics.state.speedKmh > topSpeedRecord) {
      topSpeedRecord = Math.floor(physics.state.speedKmh);
    }

    // 2. Sync Car 3D Object with Physics
    car3D.group.position.copy(physics.state.position);
    car3D.group.rotation.y = physics.state.rotation.y + physics.state.slipAngle;

    car3D.updateWheels(physics.state.steerAngle, physics.state.wheelSpin);
    car3D.setBraking(input.brake > 0.1 || input.handbrake);

    // Nitro flames animation
    const isNitro = physics.state.isNitroActive;
    nitroFlames.forEach((flame) => {
      flame.visible = isNitro;
      if (isNitro) {
        flame.scale.set(1 + Math.random() * 0.4, 1 + Math.random() * 0.6, 1);
      }
    });

    // 3. Audio Updates
    soundManager.updateEngine(physics.state.speedKmh, input.throttle, isNitro);
    soundManager.setDrift(physics.state.isDrifting, Math.abs(physics.state.slipAngle) * 2);
    soundManager.setNitro(isNitro);

    // 4. Drift Smoke Emission
    if (physics.state.isDrifting && Math.abs(physics.state.speedKmh) > 30) {
      const rl = car3D.rearLeftWheel.getWorldPosition(new THREE.Vector3());
      const rr = car3D.rearRightWheel.getWorldPosition(new THREE.Vector3());
      emitSmoke(rl);
      emitSmoke(rr);
    }

    // Update Smoke Particles
    for (const p of smokeParticles) {
      if (p.mesh.visible) {
        p.life -= dt;
        p.mesh.position.addScaledVector(p.vel, dt);
        p.mesh.scale.multiplyScalar(1 + dt * 1.5);
        const alpha = Math.max(0, p.life / p.maxLife) * 0.45;
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = alpha;
        if (p.life <= 0) {
          p.mesh.visible = false;
        }
      }
    }

    // 5. Track Updates & Collectibles
    trackData.update(dt, timeElapsed);

    // Coin Pickup Collision Detection
    for (const coin of trackData.coins) {
      if (!coin.collected) {
        const distSq = car3D.group.position.distanceToSquared(coin.position);
        if (distSq < 7.5) { // 2.7m radius
          coin.collected = true;
          coin.mesh.visible = false;
          coin.halo.visible = false;
          totalCoinsEarnedInSession += coin.value;
          soundManager.playCoinSound();
          onCoinCollected(totalCoinsEarnedInSession, coin.value);
        }
      }
    }

    // Nitro Canister Pickups
    for (const n of trackData.nitroPickups) {
      if (!n.collected) {
        const distSq = car3D.group.position.distanceToSquared(n.position);
        if (distSq < 8.0) {
          n.collected = true;
          n.group.visible = false;
          n.respawnTime = 12.0; // Respawns after 12s
          physics.state.nitroMeter = physics.state.maxNitro;
          soundManager.playCheckpointSound();
        }
      }
    }

    // Checkpoint Gates
    trackData.checkpoints.forEach((cp, idx) => {
      if (!cp.passed) {
        const distSq = car3D.group.position.distanceToSquared(cp.position);
        if (distSq < 18.0) {
          cp.passed = true;
          soundManager.playCheckpointSound();
          onCheckpointPassed(idx + 1, trackData.checkpoints.length);

          if (idx === trackData.checkpoints.length - 1 && !raceCompleted) {
            raceCompleted = true;
            onRaceFinished({
              coinsCollected: totalCoinsEarnedInSession,
              distanceTraveled: Math.floor(physics.state.distanceTravelled),
              topSpeedReached: topSpeedRecord,
              driftPoints: physics.state.driftPoints,
              nearMissCount: physics.state.nearMissCount,
              timeElapsed: Math.floor(timeElapsed),
              completed: true,
            });
          }
        }
      }
    });

    // 6. Traffic Update & Player Collision / Near-Miss
    trafficManager.update(dt);
    const playerPos = car3D.group.position;

    for (const tc of trafficManager.trafficCars) {
      const tcPos = tc.group.position;
      const dist = playerPos.distanceTo(tcPos);

      // Collision
      if (dist < 3.2) {
        soundManager.playCrashSound(1.0);
        physics.state.speedKmh *= 0.45;
        physics.state.hitStopTimer = 0.08;
        physics.state.camShake = 0.6;
        // Bump push
        const pushDir = playerPos.clone().sub(tcPos).normalize();
        physics.state.position.addScaledVector(pushDir, 0.8);
      } else if (dist < 5.2 && Math.abs(physics.state.speedKmh) > 75) {
        // Near miss reward
        if (!tc.group.userData.nearMissTriggered) {
          tc.group.userData.nearMissTriggered = true;
          physics.state.nearMissCount++;
          totalCoinsEarnedInSession += 50;
          soundManager.playCoinSound();
          onCoinCollected(totalCoinsEarnedInSession, 50);
          setTimeout(() => {
            tc.group.userData.nearMissTriggered = false;
          }, 3000);
        }
      }
    }

    // 7. Dynamic Camera Follow
    const carForwardAngle = physics.state.rotation.y;
    const forwardVec = new THREE.Vector3(Math.sin(carForwardAngle), 0, Math.cos(carForwardAngle));
    const upVec = new THREE.Vector3(0, 1, 0);

    let targetCamPos = new THREE.Vector3();
    let targetLookAt = new THREE.Vector3();

    if (cameraMode === 'chase') {
      targetCamPos = playerPos.clone()
        .sub(forwardVec.clone().multiplyScalar(7.2))
        .add(upVec.clone().multiplyScalar(3.2));
      targetLookAt = playerPos.clone().add(forwardVec.clone().multiplyScalar(6)).add(upVec.clone().multiplyScalar(1.2));
    } else if (cameraMode === 'close') {
      targetCamPos = playerPos.clone()
        .sub(forwardVec.clone().multiplyScalar(5.2))
        .add(upVec.clone().multiplyScalar(2.0));
      targetLookAt = playerPos.clone().add(forwardVec.clone().multiplyScalar(5)).add(upVec.clone().multiplyScalar(0.9));
    } else if (cameraMode === 'hood') {
      targetCamPos = playerPos.clone().add(forwardVec.clone().multiplyScalar(0.4)).add(upVec.clone().multiplyScalar(1.15));
      targetLookAt = playerPos.clone().add(forwardVec.clone().multiplyScalar(15)).add(upVec.clone().multiplyScalar(1.0));
    } else {
      // Orbit / Cinematic view
      const orbitAngle = timeElapsed * 0.4;
      targetCamPos = playerPos.clone().add(new THREE.Vector3(Math.cos(orbitAngle) * 8, 3.5, Math.sin(orbitAngle) * 8));
      targetLookAt = playerPos.clone().add(upVec.clone().multiplyScalar(1.0));
    }

    // Apply Camera Shake
    if (physics.state.camShake > 0) {
      targetCamPos.x += (Math.random() - 0.5) * physics.state.camShake;
      targetCamPos.y += (Math.random() - 0.5) * physics.state.camShake;
      targetCamPos.z += (Math.random() - 0.5) * physics.state.camShake;
    }

    // Smooth camera damping
    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamPos.x, 8, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamPos.y, 8, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCamPos.z, 8, dt);
    camera.lookAt(targetLookAt);

    // Nitro FOV warp
    const targetFov = isNitro ? 72 : 60;
    camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 6, dt);
    camera.updateProjectionMatrix();

    // Directional light shadow camera follows player
    dirLight.position.set(playerPos.x + 30, playerPos.y + 60, playerPos.z + 20);
    dirLight.target.position.copy(playerPos);
    dirLight.target.updateMatrixWorld();

    renderer.render(scene, camera);
  };

  animate();

  return {
    container,
    input,
    updateCarSpecs: (specs: CarSpecs) => {
      car3D.updateAppearance(specs);
    },
    cycleCamera: () => cycleCameraMode(),
    resetCar: () => resetToCurrentTrack(),
    getStats: () => ({
      coinsCollected: totalCoinsEarnedInSession,
      distanceTraveled: Math.floor(physics.state.distanceTravelled),
      topSpeedReached: topSpeedRecord,
      driftPoints: physics.state.driftPoints,
      nearMissCount: physics.state.nearMissCount,
      timeElapsed: Math.floor(timeElapsed),
      completed: raceCompleted,
    }),
    getPhysicsState: () => ({
      speedKmh: Math.floor(Math.abs(physics.state.speedKmh)),
      nitroMeter: Math.floor(physics.state.nitroMeter),
      maxNitro: physics.state.maxNitro,
      isDrifting: physics.state.isDrifting,
      driftPoints: physics.state.driftPoints,
      progress: physics.state.progress,
    }),
    pause: () => {
      isPaused = true;
      soundManager.stopEngine();
      soundManager.stopDrift();
      soundManager.stopNitro();
    },
    resume: () => {
      isPaused = false;
      soundManager.startEngine();
      clock.start();
    },
    dispose: () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      soundManager.stopEngine();
      soundManager.stopDrift();
      soundManager.stopNitro();
      trackData.dispose();
      trafficManager.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    },
  };
}
