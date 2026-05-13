// Realistic garment builder v3 — smooth, organic cloth shapes.
// Key change: uses high-subdivision parametric surfaces instead of flat extrusions.
// All garments are built from smooth tube/lathe/sphere primitives that read as real cloth.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// ---------- Sway uniforms ----------
export const SWAY_MATERIALS = new Set();

// ---------- Fabric normal map (2048px, fine weave) ----------
function makeFabricNormalMap(size = 2048) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgb(128,128,255)';
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // Fine thread weave pattern
      const warpX = Math.sin(x * 1.2) * 8;
      const weftY = Math.cos(y * 1.2) * 8;
      const twill = Math.sin((x + y) * 0.5) * 4;
      const micro = (Math.random() - 0.5) * 8;
      d[i]     = Math.max(0, Math.min(255, 128 + warpX + twill + micro));
      d[i + 1] = Math.max(0, Math.min(255, 128 + weftY + twill + micro));
      d[i + 2] = 255;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(12, 12);
  tex.anisotropy = 16;
  return tex;
}

function makeLeatherNormalMap(size = 1024) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgb(128,128,255)';
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  const cells = [];
  for (let i = 0; i < 500; i++) cells.push([Math.random() * size, Math.random() * size]);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let best = 1e9;
      for (const [cx, cy] of cells) {
        const d2 = (x - cx) ** 2 + (y - cy) ** 2;
        if (d2 < best) best = d2;
      }
      const edge = Math.min(1, Math.sqrt(best) / 18);
      const bump = (1 - edge) * 25 + (Math.random() - 0.5) * 8;
      const i = (y * size + x) * 4;
      d[i]     = Math.max(0, Math.min(255, 128 + bump));
      d[i + 1] = Math.max(0, Math.min(255, 128 + bump));
      d[i + 2] = 255;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 5);
  tex.anisotropy = 16;
  return tex;
}

const FABRIC_NORMAL = makeFabricNormalMap();
const LEATHER_NORMAL = makeLeatherNormalMap();

// ---------- Materials ----------
export function makeFabricMaterial(colorHex, opts = {}) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(colorHex),
    roughness: opts.roughness ?? 0.92,
    metalness: 0.0,
    sheen: 1.0,
    sheenRoughness: opts.sheenRoughness ?? 0.5,
    sheenColor: new THREE.Color(opts.sheenColor ?? 0xffffff).multiplyScalar(0.5),
    normalMap: FABRIC_NORMAL,
    normalScale: new THREE.Vector2(opts.normalScale ?? 0.3, opts.normalScale ?? 0.3),
    side: THREE.DoubleSide,
    envMapIntensity: 0.6,
    flatShading: false
  });
  attachSway(mat);
  return mat;
}

export function makeKnitMaterial(colorHex) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(colorHex),
    roughness: 0.96,
    metalness: 0.0,
    sheen: 1.0,
    sheenRoughness: 0.3,
    sheenColor: new THREE.Color(0xffffff).multiplyScalar(0.7),
    normalMap: FABRIC_NORMAL,
    normalScale: new THREE.Vector2(0.45, 0.45),
    side: THREE.DoubleSide,
    envMapIntensity: 0.5,
    flatShading: false
  });
  attachSway(mat);
  return mat;
}

export function makeLeatherMaterial(colorHex) {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(colorHex),
    roughness: 0.5,
    metalness: 0.05,
    clearcoat: 0.6,
    clearcoatRoughness: 0.3,
    normalMap: LEATHER_NORMAL,
    normalScale: new THREE.Vector2(0.7, 0.7),
    side: THREE.DoubleSide,
    envMapIntensity: 1.0,
    flatShading: false
  });
}

export function makeDenimMaterial(colorHex) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(colorHex),
    roughness: 0.88,
    metalness: 0.0,
    sheen: 0.7,
    sheenRoughness: 0.6,
    sheenColor: new THREE.Color(0x7799cc),
    normalMap: FABRIC_NORMAL,
    normalScale: new THREE.Vector2(0.5, 0.5),
    side: THREE.DoubleSide,
    envMapIntensity: 0.6,
    flatShading: false
  });
  attachSway(mat);
  return mat;
}

// Vertex shader sway
function attachSway(material) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       float hemFactor = smoothstep(1.0, -3.0, position.y);
       float swayX = sin(uTime * 1.4 + position.y * 1.2 + position.x * 0.5) * 0.03;
       float swayZ = cos(uTime * 1.1 + position.y * 0.9) * 0.02;
       transformed.x += swayX * hemFactor;
       transformed.z += swayZ * hemFactor;
      `
    );
    material.userData.shader = shader;
  };
  SWAY_MATERIALS.add(material);
}

export function tickSway(t) {
  SWAY_MATERIALS.forEach(m => {
    if (m.userData.shader) m.userData.shader.uniforms.uTime.value = t;
  });
}

// ---------- Smooth shape builder using LatheGeometry (revolution) ----------
// Creates a smooth torso/garment from a 2D profile revolved around Y axis.
// Profile: array of {r, y} points describing the radius at each height.

function buildRevolved(profile, mat, segments = 64) {
  const points = profile.map(p => new THREE.Vector2(p.r, p.y));
  const geo = new THREE.LatheGeometry(points, segments);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

// Apply subtle organic wrinkle displacement (smooth sinusoidal, not harsh)
function addSoftWrinkles(geometry, amp = 0.015, freq = 4.0) {
  const pos = geometry.attributes.position;
  const norm = geometry.attributes.normal;
  geometry.computeVertexNormals();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    // Smooth multi-octave noise
    const n = Math.sin(x * freq + y * 2.3) * Math.cos(y * freq * 0.7 + z * 1.5) * amp
            + Math.sin((x + z) * freq * 1.6 + y * 0.8) * amp * 0.4;
    // Weight toward lower parts
    const weight = 0.5 + 0.5 * Math.max(0, -y / 3);
    const nx = norm.getX(i), ny = norm.getY(i), nz = norm.getZ(i);
    pos.setXYZ(i, x + nx * n * weight, y + ny * n * weight, z + nz * n * weight);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
}

// ---------- T-SHIRT (smooth revolved torso + tube sleeves) ----------
function buildTshirt(color) {
  const group = new THREE.Group();
  const mat = makeFabricMaterial(color, { roughness: 0.9, normalScale: 0.35 });

  // Torso: smooth bell-shape (wider at shoulders, tapered at waist, then slight hem flare)
  const torsoProfile = [
    { r: 0.0, y: 2.0 },   // neck center (top)
    { r: 0.3, y: 1.9 },   // neck radius
    { r: 0.35, y: 1.7 },  // collar base
    { r: 1.1, y: 1.4 },   // shoulder line
    { r: 1.15, y: 1.0 },  // upper chest
    { r: 1.1, y: 0.3 },   // mid torso
    { r: 1.0, y: -0.5 },  // waist
    { r: 1.05, y: -1.5 }, // hip
    { r: 1.1, y: -2.2 },  // hem flare
    { r: 1.08, y: -2.4 }, // hem edge
    { r: 0.0, y: -2.4 }   // bottom close
  ];
  const torso = buildRevolved(torsoProfile, mat, 80);
  addSoftWrinkles(torso.geometry, 0.02, 3.5);
  group.add(torso);

  // Sleeves: tubes angled outward
  for (let side = -1; side <= 1; side += 2) {
    const sleeveProfile = [
      { r: 0.0, y: 0 },
      { r: 0.42, y: 0.05 },
      { r: 0.44, y: 0.4 },
      { r: 0.46, y: 0.8 },
      { r: 0.5, y: 1.2 },
      { r: 0.48, y: 1.3 },
      { r: 0.0, y: 1.3 }
    ];
    const sleeve = buildRevolved(sleeveProfile, mat, 32);
    addSoftWrinkles(sleeve.geometry, 0.012, 5.0);
    sleeve.rotation.z = side * Math.PI * 0.42;
    sleeve.position.set(side * 1.0, 1.0, 0);
    group.add(sleeve);
  }

  group.userData.setColor = (c) => { mat.color.set(c); };
  return group;
}

// ---------- HOODIE ----------
function buildHoodie(color) {
  const group = new THREE.Group();
  const mat = makeKnitMaterial(color);

  // Torso: slightly wider/bulkier than tee
  const torsoProfile = [
    { r: 0.0, y: 2.2 },
    { r: 0.35, y: 2.1 },
    { r: 0.4, y: 1.9 },
    { r: 1.2, y: 1.5 },
    { r: 1.3, y: 1.0 },
    { r: 1.25, y: 0.3 },
    { r: 1.15, y: -0.5 },
    { r: 1.2, y: -1.5 },
    { r: 1.25, y: -2.4 },
    { r: 1.2, y: -2.6 },
    { r: 0.0, y: -2.6 }
  ];
  const torso = buildRevolved(torsoProfile, mat, 80);
  addSoftWrinkles(torso.geometry, 0.025, 3.0);
  group.add(torso);

  // Hood: half-sphere (smooth)
  const hoodGeo = new THREE.SphereGeometry(0.9, 48, 36, 0, Math.PI * 2, 0, Math.PI * 0.55);
  hoodGeo.scale(1.2, 1.05, 0.9);
  hoodGeo.computeVertexNormals();
  addSoftWrinkles(hoodGeo, 0.015, 4.5);
  const hood = new THREE.Mesh(hoodGeo, mat);
  hood.position.set(0, 1.9, -0.25);
  hood.castShadow = true;
  group.add(hood);

  // Hood inner (dark lining)
  const innerMat = mat.clone();
  innerMat.color.multiplyScalar(0.5);
  innerMat.side = THREE.BackSide;
  const innerGeo = new THREE.SphereGeometry(0.85, 36, 28, 0, Math.PI * 2, 0, Math.PI * 0.5);
  innerGeo.scale(1.15, 1.0, 0.85);
  const inner = new THREE.Mesh(innerGeo, innerMat);
  inner.position.set(0, 1.9, -0.15);
  group.add(inner);

  // Sleeves
  for (let side = -1; side <= 1; side += 2) {
    const sleeveProfile = [
      { r: 0.0, y: 0 },
      { r: 0.44, y: 0.05 },
      { r: 0.47, y: 0.5 },
      { r: 0.5, y: 1.1 },
      { r: 0.52, y: 1.6 },
      { r: 0.48, y: 1.75 },
      { r: 0.45, y: 1.8 },
      { r: 0.0, y: 1.8 }
    ];
    const sleeve = buildRevolved(sleeveProfile, mat, 36);
    addSoftWrinkles(sleeve.geometry, 0.015, 4.0);
    sleeve.rotation.z = side * Math.PI * 0.38;
    sleeve.position.set(side * 1.1, 1.1, 0);
    group.add(sleeve);
  }

  // Drawstrings
  const stringMat = new THREE.MeshPhysicalMaterial({ color: 0xeee3c8, roughness: 0.8, sheen: 0.4, sheenColor: new THREE.Color(0xffffff) });
  for (let s = -1; s <= 1; s += 2) {
    const pts = [];
    for (let j = 0; j <= 20; j++) {
      const t = j / 20;
      pts.push(new THREE.Vector3(
        s * (0.2 + t * 0.015),
        1.6 - t * 0.8 - Math.sin(t * Math.PI) * 0.08,
        0.45 + t * 0.03 + Math.sin(t * Math.PI * 2) * 0.02
      ));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const strGeo = new THREE.TubeGeometry(curve, 30, 0.022, 8, false);
    group.add(new THREE.Mesh(strGeo, stringMat));
  }

  // Kangaroo pocket (subtle bulge via a flattened sphere)
  const pocketGeo = new THREE.SphereGeometry(0.8, 32, 24);
  pocketGeo.scale(1.2, 0.8, 0.15);
  pocketGeo.computeVertexNormals();
  const pocket = new THREE.Mesh(pocketGeo, mat);
  pocket.position.set(0, -1.0, 1.15);
  group.add(pocket);

  group.userData.setColor = (c) => {
    mat.color.set(c);
    innerMat.color.set(c).multiplyScalar(0.5);
  };
  return group;
}

// ---------- JACKET ----------
function buildJacket(color, leather = false) {
  const group = new THREE.Group();
  const mat = leather ? makeLeatherMaterial(color) : makeFabricMaterial(color, { roughness: 0.78, normalScale: 0.4 });

  // Longer torso profile (coat length)
  const torsoProfile = [
    { r: 0.0, y: 2.0 },
    { r: 0.32, y: 1.9 },
    { r: 0.38, y: 1.7 },
    { r: 1.2, y: 1.4 },
    { r: 1.3, y: 1.0 },
    { r: 1.25, y: 0.3 },
    { r: 1.15, y: -0.5 },
    { r: 1.2, y: -1.5 },
    { r: 1.3, y: -2.5 },
    { r: 1.35, y: -3.0 },
    { r: 1.3, y: -3.2 },
    { r: 0.0, y: -3.2 }
  ];
  const torso = buildRevolved(torsoProfile, mat, 80);
  addSoftWrinkles(torso.geometry, leather ? 0.01 : 0.02, leather ? 5.0 : 3.0);
  group.add(torso);

  // Sleeves (longer)
  for (let side = -1; side <= 1; side += 2) {
    const sleeveProfile = [
      { r: 0.0, y: 0 },
      { r: 0.44, y: 0.05 },
      { r: 0.46, y: 0.6 },
      { r: 0.44, y: 1.3 },
      { r: 0.42, y: 2.0 },
      { r: 0.38, y: 2.3 },
      { r: 0.36, y: 2.4 },
      { r: 0.0, y: 2.4 }
    ];
    const sleeve = buildRevolved(sleeveProfile, mat, 36);
    addSoftWrinkles(sleeve.geometry, 0.012, 4.5);
    sleeve.rotation.z = side * Math.PI * 0.35;
    sleeve.position.set(side * 1.1, 1.0, 0);
    group.add(sleeve);
  }

  // Collar (smooth torus)
  const collarGeo = new THREE.TorusGeometry(0.38, 0.12, 20, 48, Math.PI * 1.5);
  collarGeo.rotateX(Math.PI * 0.5);
  collarGeo.computeVertexNormals();
  const collar = new THREE.Mesh(collarGeo, mat);
  collar.position.set(0, 1.7, 0.2);
  collar.rotation.z = Math.PI;
  group.add(collar);

  // Buttons or zipper
  if (leather) {
    const zipMat = new THREE.MeshPhysicalMaterial({
      color: 0xb0b5bb, roughness: 0.25, metalness: 0.95, clearcoat: 0.7
    });
    const zipGeo = new THREE.CylinderGeometry(0.025, 0.025, 3.0, 12);
    const zip = new THREE.Mesh(zipGeo, zipMat);
    zip.position.set(0.15, -0.5, 1.2);
    group.add(zip);
    // Pull tab
    const pullGeo = new THREE.BoxGeometry(0.08, 0.2, 0.03);
    const pull = new THREE.Mesh(pullGeo, zipMat);
    pull.position.set(0.15, 0.8, 1.25);
    group.add(pull);
  } else {
    const btnMat = new THREE.MeshPhysicalMaterial({
      color: 0x3a2e1e, roughness: 0.3, metalness: 0.05, clearcoat: 0.7, clearcoatRoughness: 0.2
    });
    for (let i = 0; i < 4; i++) {
      const btn = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), btnMat);
      btn.position.set(0.2, 0.8 - i * 0.85, 1.2);
      btn.castShadow = true;
      group.add(btn);
    }
  }

  group.userData.setColor = (c) => { mat.color.set(c); };
  return group;
}

// ---------- PANTS ----------
function buildPants(color, denim = false) {
  const group = new THREE.Group();
  const mat = denim ? makeDenimMaterial(color) : makeFabricMaterial(color, { roughness: 0.85, normalScale: 0.35 });

  // Each leg is a separate revolved tube
  for (let side = -1; side <= 1; side += 2) {
    const legProfile = [
      { r: 0.0, y: 0.5 },   // top (joins waist)
      { r: 0.55, y: 0.45 },
      { r: 0.55, y: 0.0 },  // hip
      { r: 0.48, y: -1.0 }, // thigh
      { r: 0.4, y: -2.0 },  // knee
      { r: 0.35, y: -3.0 }, // shin
      { r: 0.32, y: -3.5 }, // ankle
      { r: 0.33, y: -3.6 }, // cuff
      { r: 0.0, y: -3.6 }
    ];
    const leg = buildRevolved(legProfile, mat, 40);
    addSoftWrinkles(leg.geometry, 0.015, 4.0);
    leg.position.set(side * 0.5, 0, 0);
    group.add(leg);
  }

  // Waistband (smooth torus section)
  const waistGeo = new THREE.TorusGeometry(0.95, 0.18, 16, 48);
  waistGeo.rotateX(Math.PI * 0.5);
  waistGeo.computeVertexNormals();
  const waistMat = mat.clone();
  waistMat.color.multiplyScalar(0.82);
  const waist = new THREE.Mesh(waistGeo, waistMat);
  waist.position.set(0, 0.5, 0);
  group.add(waist);

  // Denim details
  if (denim) {
    const stitchMat = new THREE.MeshPhysicalMaterial({ color: 0xd4a84a, roughness: 0.65 });
    for (let s = -1; s <= 1; s += 2) {
      const pts = [
        new THREE.Vector3(s * 0.95, 0.3, 0.3),
        new THREE.Vector3(s * 0.82, -1.5, 0.25),
        new THREE.Vector3(s * 0.7, -3.5, 0.2)
      ];
      const seam = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.015, 6, false);
      group.add(new THREE.Mesh(seam, stitchMat));
    }
  }

  group.userData.setColor = (c) => {
    mat.color.set(c);
    waistMat.color.set(c).multiplyScalar(0.82);
  };
  return group;
}

// ---------- Dispatcher ----------
export function createGarment(type, color) {
  if (type === 'tshirt') return buildTshirt(color);
  if (type === 'hoodie') return buildHoodie(color);
  if (type === 'jacket') return buildJacket(color, false);
  if (type === 'leather') return buildJacket(color, true);
  if (type === 'pants') return buildPants(color, false);
  if (type === 'denim') return buildPants(color, true);
  return buildTshirt(color);
}

// ---------- Lighting: cinematic 3-point ----------
export function setupLighting(scene) {
  scene.add(new THREE.AmbientLight(0xffffff, 0.2));

  // Key (warm, soft)
  const key = new THREE.DirectionalLight(0xfff0d8, 2.0);
  key.position.set(4, 6, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 25;
  key.shadow.camera.left = -6;
  key.shadow.camera.right = 6;
  key.shadow.camera.top = 6;
  key.shadow.camera.bottom = -6;
  key.shadow.bias = -0.0002;
  key.shadow.radius = 6;
  scene.add(key);

  // Rim (warm gold, behind subject)
  const rim = new THREE.DirectionalLight(0xc9a96e, 1.4);
  rim.position.set(-5, 3, -5);
  scene.add(rim);

  // Fill (cool, subtle)
  const fill = new THREE.DirectionalLight(0x6688bb, 0.5);
  fill.position.set(-3, -2, 4);
  scene.add(fill);

  // Hemisphere for ambient wrap
  scene.add(new THREE.HemisphereLight(0xfff5e8, 0x0a0a0f, 0.3));
}

// ---------- Environment ----------
let sharedEnvMap = null;
export function setupEnvironment(renderer, scene) {
  if (!sharedEnvMap) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    sharedEnvMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
  }
  scene.environment = sharedEnvMap;
}

// ---------- Contact shadow ----------
export function addContactShadow(scene, y = -3.4) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(0,0,0,0.5)');
  grad.addColorStop(0.4, 'rgba(0,0,0,0.2)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 6),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
  );
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = y;
  scene.add(plane);
  return plane;
}
