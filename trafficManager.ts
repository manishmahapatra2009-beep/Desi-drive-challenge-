import * as THREE from 'three';

export interface TrafficCar {
  group: THREE.Group;
  progress: number; // 0 to 1 along curve
  speed: number; // fraction per second
  laneOffset: number; // lateral offset from center line
  width: number;
  length: number;
  color: string;
}

export class TrafficManager {
  public trafficCars: TrafficCar[] = [];
  public group = new THREE.Group();

  constructor(private curve: THREE.CatmullRomCurve3, private trackLength: number, count: number = 8) {
    this.spawnTraffic(count);
  }

  private spawnTraffic(count: number) {
    const carColors = ['#F59E0B', '#FFFFFF', '#3B82F6', '#EF4444', '#10B981', '#6B7280'];
    const lanes = [-3.8, 3.8]; // Left lane, right lane

    for (let i = 0; i < count; i++) {
      const carGroup = new THREE.Group();

      const isTruck = i % 4 === 0;
      const width = isTruck ? 2.4 : 1.9;
      const height = isTruck ? 1.8 : 0.85;
      const length = isTruck ? 5.2 : 3.8;
      const color = carColors[i % carColors.length];

      // Body mesh
      const bodyMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness: 0.35,
        metalness: 0.5,
      });
      const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, length), bodyMat);
      body.position.y = height * 0.5 + 0.3;
      body.castShadow = true;
      carGroup.add(body);

      // Cabin / windshield
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0x111827,
        roughness: 0.1,
        transmission: 0.6,
        transparent: true,
      });
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(width * 0.85, height * 0.55, length * 0.5), glassMat);
      cabin.position.set(0, body.position.y + height * 0.45, -0.2);
      carGroup.add(cabin);

      // Wheels
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.9 });
      const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.22, 12);
      wheelGeo.rotateZ(Math.PI / 2);

      const wFL = new THREE.Mesh(wheelGeo, wheelMat);
      wFL.position.set(width * 0.5 + 0.1, 0.35, length * 0.35);
      const wFR = wFL.clone(); wFR.position.x = -(width * 0.5 + 0.1);
      const wRL = wFL.clone(); wRL.position.z = -length * 0.35;
      const wRR = wFR.clone(); wRR.position.z = -length * 0.35;
      carGroup.add(wFL, wFR, wRL, wRR);

      // Taillights
      const tailMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const tailL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.05), tailMat);
      tailL.position.set(width * 0.35, body.position.y, -length * 0.51);
      const tailR = tailL.clone(); tailR.position.x = -width * 0.35;
      carGroup.add(tailL, tailR);

      // Headlights
      const headMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      const headL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.05), headMat);
      headL.position.set(width * 0.35, body.position.y, length * 0.51);
      const headR = headL.clone(); headR.position.x = -width * 0.35;
      carGroup.add(headL, headR);

      const progress = 0.08 + (i / count) * 0.85;
      const laneOffset = lanes[i % lanes.length];
      const speedKmh = 50 + Math.random() * 30; // 50 to 80 km/h
      const speedFraction = (speedKmh / 3.6) / this.trackLength;

      this.group.add(carGroup);
      this.trafficCars.push({
        group: carGroup,
        progress,
        speed: speedFraction,
        laneOffset,
        width,
        length,
        color,
      });
    }
  }

  public update(dt: number) {
    const up = new THREE.Vector3(0, 1, 0);

    for (const car of this.trafficCars) {
      car.progress = (car.progress + car.speed * dt) % 1.0;
      const pt = this.curve.getPointAt(car.progress);
      const tangent = this.curve.getTangentAt(car.progress).normalize();
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      car.group.position.set(
        pt.x + normal.x * car.laneOffset,
        pt.y,
        pt.z + normal.z * car.laneOffset
      );
      car.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
    }
  }

  public dispose() {
    this.trafficCars.forEach(tc => {
      this.group.remove(tc.group);
    });
    this.trafficCars = [];
  }
}
