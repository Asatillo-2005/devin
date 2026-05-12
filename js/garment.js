// Procedural, realistic garment builder.
// Each garment is a THREE.Group with:
//   - MeshPhysicalMaterial (sheen for fabric, clearcoat for leather)
//   - Inflated volume (real 3D torso curvature)
//   - Baked-in wrinkles (vertex displacement via layered noise)
//   - Wind sway (vertex shader hook via onBeforeCompile)
//   - High-detail fabric normal map (woven threads + micro-fuzz)
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// ---------- Shared: cloth sway uniforms collection ----------
export const SWAY_MATERIALS = new Set();

// ---------- Procedural weave normal map (high frequency, realistic) ----------
function makeFabricNormalMap(size = 1024) {
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
      // Layered weave: tight warp/weft + diagonal twill + micro fuzz
      const warp = Math.sin(x * 0.9) * 14;
      const weft = Math.cos(y * 0.9) * 14;
      const twill = Math.sin((x + y) * 0.35) * 6;
      const fuzz = (Math.random() - 0.5) * 22;
      const nx = warp + twill + fuzz * 0.5;
      const ny = weft + twill + fuzz * 0.5;
      d[i]     = Math.max(0, Math.min(255, 128 + nx));
      d[i + 1] = Math.max(0, Math.min(255, 128 + ny));
      d[i + 2] = 255;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.anisotropy = 8;
  return tex;
}

// ---------- Leather grain normal map ----------
function makeLeatherNormalMap(size = 1024) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgb(128,128,255)';
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  // Voronoi-ish cells — sample random centers
  const cells = [];
  for (let i = 0; i < 400; i++) cells.push([Math.random() * size, Math.random() * size]);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let best = 1e9;
      for (const [cx, cy] of cells) {
        const dx = x - cx, dy = y - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 < best) best = d2;
      }
      const edge = Math.min(1, Math.sqrt(best) / 22);
      const bump = (1 - edge) * 32 + (Math.random() - 0.5) * 10;
      const i = (y * size + x) * 4;
      d[i]     = Math.max(0, Math.min(255, 128 + bump * 0.9));
      d[i + 1] = Math.max(0, Math.min(255, 128 + bump * 0.9));
      d[i + 2] = 255;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  tex.anisotropy = 8;
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
    // Sheen makes fabric look like real cotton/wool — soft rim light response
    sheen: 1.0,
    sheenRoughness: opts.sheenRoughness ?? 0.55,
    sheenColor: new THREE.Color(opts.sheenColor ?? 0xffffff).multiplyScalar(0.6),
    normalMap: FABRIC_NORMAL,
    normalScale: new THREE.Vector2(opts.normalScale ?? 0.55, opts.normalScale ?? 0.55),
    side: THREE.DoubleSide,
    envMapIntensity: 0.7
  });
  attachSway(mat);
  return mat;
}

export function makeKnitMaterial(colorHex) {
  // Heavier, more matte knit (cashmere/wool) — softer sheen
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(colorHex),
    roughness: 0.98,
    metalness: 0.0,
    sheen: 1.0,
    sheenRoughness: 0.35,
    sheenColor: new THREE.Color(0xffffff).multiplyScalar(0.8),
    normalMap: FABRIC_NORMAL,
    normalScale: new THREE.Vector2(0.75, 0.75),
    side: THREE.DoubleSide,
    envMapIntensity: 0.5
  });
  attachSway(mat);
  return mat;
}

export function makeLeatherMaterial(colorHex) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(colorHex),
    roughness: 0.55,
    metalness: 0.05,
    clearcoat: 0.5,          // leather's glossy top layer
    clearcoatRoughness: 0.35,
    normalMap: LEATHER_NORMAL,
    normalScale: new THREE.Vector2(0.9, 0.9),
    side: THREE.DoubleSide,
    envMapIntensity: 1.1
  });
  return mat;
}

export function makeDenimMaterial(colorHex) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(colorHex),
    roughness: 0.88,
    metalness: 0.0,
    sheen: 0.8,
    sheenRoughness: 0.7,
    sheenColor: new THREE.Color(0x8899bb),
    normalMap: FABRIC_NORMAL,
    normalScale: new THREE.Vector2(0.85, 0.85),
    side: THREE.DoubleSide,
    envMapIntensity: 0.7
  });
  attachSway(mat);
  return mat;
}

// Hook vertex shader to add subtle wind sway at the hem
function attachSway(material) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uSwayAmp = { value: 1.0 };
    shader.vertexShader = 'uniform float uTime;\nuniform float uSwayAmp;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       // Hem sway: only affect lower vertices, lerp up along Y
       float hem = smoothstep(1.5, -2.8, position.y);
       float sway = sin(uTime * 1.6 + position.y * 1.4 + position.x * 0.3) * 0.045
                  + cos(uTime * 1.1 + position.x * 1.2) * 0.02;
       transformed.x += sway * hem * uSwayAmp;
       transformed.z += cos(uTime * 1.3 + position.y * 1.0) * 0.03 * hem * uSwayAmp;
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

// ---------- Geometry helpers ----------

// Inflate a roughly flat extrusion into a rounded torso volume
// by pushing front/back faces outward along +Z / -Z based on distance from silhouette edge.
function inflate(geometry, amount = 0.55, yBias = 0.0) {
  const pos = geometry.attributes.position;
  const box = new THREE.Box3().setFromBufferAttribute(pos);
  const cx = (box.max.x + box.min.x) / 2;
  const cy = (box.max.y + box.min.y) / 2 + yBias;
  const halfX = (box.max.x - box.min.x) / 2;
  const halfY = (box.max.y - box.min.y) / 2;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    // parabolic falloff from center; 1 at center, 0 at silhouette edge
    const nx = (x - cx) / halfX;
    const ny = (y - cy) / halfY;
    const torsoMask = Math.max(0, 1 - (nx * nx) * 0.9 - (ny * ny) * 0.5);
    const bulge = Math.sign(z || 0.001) * torsoMask * amount;
    pos.setZ(i, z + bulge);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
}

// Add layered-noise wrinkles by displacing along the vertex normal
function addWrinkles(geometry, amplitude = 0.035, frequency = 3.5) {
  const pos = geometry.attributes.position;
  geometry.computeVertexNormals();
  const nrm = geometry.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    // Layered sines = cheap smooth noise
    const n1 = Math.sin(x * frequency + y * 2.1) * Math.cos(y * frequency * 0.8 - x * 1.3);
    const n2 = Math.sin((x + y) * frequency * 1.7) * 0.5;
    const n3 = Math.sin(y * frequency * 3.0) * 0.3;
    const n = (n1 + n2 + n3) * amplitude;
    // Stronger wrinkles near bottom hem and sleeve ends
    const hemBoost = 1.0 + Math.max(0, (-y - 1.5)) * 0.6;
    pos.setXYZ(i,
      x + nrm.getX(i) * n * hemBoost,
      y + nrm.getY(i) * n * hemBoost,
      z + nrm.getZ(i) * n * hemBoost
    );
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
}

function extrude(shape, depth = 0.4, bevel = 0.12, segments = 40) {
  return new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 6,
    curveSegments: segments,
    steps: 4
  });
}

// ---------- T-SHIRT ----------
function buildTshirt(color) {
  const group = new THREE.Group();
  const mat = makeFabricMaterial(color, { roughness: 0.9, normalScale: 0.6 });

  const shape = new THREE.Shape();
  shape.moveTo(-2.2, 1.4);
  shape.lineTo(-2.2, 0.4);
  shape.quadraticCurveTo(-1.6, 0.55, -1.1, 0.6);
  shape.lineTo(-1.1, -2.4);
  shape.quadraticCurveTo(0, -2.55, 1.1, -2.4);
  shape.lineTo(1.1, 0.6);
  shape.quadraticCurveTo(1.6, 0.55, 2.2, 0.4);
  shape.lineTo(2.2, 1.4);
  shape.lineTo(0.55, 1.4);
  shape.bezierCurveTo(0.4, 1.2, -0.4, 1.2, -0.55, 1.4);
  shape.lineTo(-2.2, 1.4);

  const geo = extrude(shape, 0.45, 0.14);
  geo.center();
  inflate(geo, 0.6, 0.1);
  addWrinkles(geo, 0.04, 3.0);
  const body = new THREE.Mesh(geo, mat);
  body.castShadow = body.receiveShadow = true;
  group.add(body);

  // Ribbed neckline band
  const neckGeo = new THREE.TorusGeometry(0.48, 0.06, 12, 40, Math.PI * 1.6);
  neckGeo.rotateX(Math.PI * 0.5);
  const neck = new THREE.Mesh(neckGeo, mat);
  neck.position.set(0, 1.35, 0.35);
  neck.rotation.z = Math.PI;
  group.add(neck);

  group.userData.setColor = (c) => { mat.color.set(c); };
  return group;
}

// ---------- HOODIE ----------
function buildHoodie(color) {
  const group = new THREE.Group();
  const mat = makeKnitMaterial(color);

  const shape = new THREE.Shape();
  shape.moveTo(-2.5, 1.3);
  shape.lineTo(-2.5, 0.2);
  shape.quadraticCurveTo(-1.8, 0.35, -1.2, 0.45);
  shape.lineTo(-1.2, -2.6);
  shape.quadraticCurveTo(0, -2.8, 1.2, -2.6);
  shape.lineTo(1.2, 0.45);
  shape.quadraticCurveTo(1.8, 0.35, 2.5, 0.2);
  shape.lineTo(2.5, 1.3);
  shape.lineTo(0.9, 1.3);
  shape.bezierCurveTo(0.8, 2.4, -0.8, 2.4, -0.9, 1.3);
  shape.lineTo(-2.5, 1.3);

  const geo = extrude(shape, 0.65, 0.16);
  geo.center();
  inflate(geo, 0.7, 0.0);
  addWrinkles(geo, 0.05, 2.6);
  const body = new THREE.Mesh(geo, mat);
  body.castShadow = body.receiveShadow = true;
  group.add(body);

  // Hood: half-ellipsoid behind head, with wrinkled surface
  const hoodGeo = new THREE.SphereGeometry(1.0, 40, 28, 0, Math.PI * 2, 0, Math.PI * 0.58);
  hoodGeo.scale(1.15, 1.0, 0.85);
  addWrinkles(hoodGeo, 0.03, 4.0);
  const hood = new THREE.Mesh(hoodGeo, mat);
  hood.position.set(0, 1.45, -0.2);
  hood.rotation.x = Math.PI * 0.05;
  hood.castShadow = true;
  group.add(hood);

  // Hood inner (darker lining)
  const hoodInnerMat = mat.clone();
  hoodInnerMat.color.multiplyScalar(0.55);
  const hoodInnerGeo = new THREE.SphereGeometry(0.95, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.5);
  hoodInnerGeo.scale(1.1, 0.95, 0.8);
  const hoodInner = new THREE.Mesh(hoodInnerGeo, hoodInnerMat);
  hoodInner.position.set(0, 1.45, -0.1);
  hoodInner.rotation.x = Math.PI * 0.05;
  hoodInner.material.side = THREE.BackSide;
  group.add(hoodInner);

  // Kangaroo pocket with wrinkles
  const pocketShape = new THREE.Shape();
  pocketShape.moveTo(-0.9, -0.3);
  pocketShape.quadraticCurveTo(-0.95, -0.35, -0.85, -0.4);
  pocketShape.lineTo(0.85, -0.4);
  pocketShape.quadraticCurveTo(0.95, -0.35, 0.9, -0.3);
  pocketShape.lineTo(0.75, -1.65);
  pocketShape.quadraticCurveTo(0, -1.78, -0.75, -1.65);
  pocketShape.lineTo(-0.9, -0.3);
  const pocketGeo = extrude(pocketShape, 0.12, 0.06, 32);
  addWrinkles(pocketGeo, 0.015, 5.0);
  const pocket = new THREE.Mesh(pocketGeo, mat);
  pocket.position.set(0, 0, 0.4);
  pocket.castShadow = true;
  group.add(pocket);

  // Drawstrings (rope-like)
  const stringMat = new THREE.MeshPhysicalMaterial({
    color: 0xeee3c8, roughness: 0.85, sheen: 0.5, sheenColor: 0xffffff
  });
  for (let s = -1; s <= 1; s += 2) {
    // Curve the drawstring
    const pts = [];
    for (let j = 0; j <= 20; j++) {
      const t = j / 20;
      pts.push(new THREE.Vector3(
        s * (0.25 + t * 0.02),
        0.95 - t * 0.9 - Math.sin(t * Math.PI) * 0.1,
        0.4 + t * 0.05 + Math.sin(t * Math.PI) * 0.05
      ));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const strGeo = new THREE.TubeGeometry(curve, 30, 0.028, 8, false);
    group.add(new THREE.Mesh(strGeo, stringMat));

    // Aglet (tip)
    const tip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.03, 0.12, 12),
      new THREE.MeshPhysicalMaterial({ color: 0x2a2420, roughness: 0.3, metalness: 0.4 })
    );
    tip.position.copy(pts[pts.length - 1]);
    group.add(tip);
  }

  // Ribbed cuff/hem effect (darker horizontal band at bottom)
  const hemShape = new THREE.Shape();
  hemShape.moveTo(-1.25, -2.35);
  hemShape.quadraticCurveTo(0, -2.55, 1.25, -2.35);
  hemShape.lineTo(1.25, -2.65);
  hemShape.quadraticCurveTo(0, -2.85, -1.25, -2.65);
  hemShape.lineTo(-1.25, -2.35);
  const hemGeo = extrude(hemShape, 0.72, 0.05, 32);
  hemGeo.center();
  hemGeo.translate(0, -2.5, 0);
  inflate(hemGeo, 0.7, 0);
  const hemMat = mat.clone();
  hemMat.color.multiplyScalar(0.88);
  group.add(new THREE.Mesh(hemGeo, hemMat));

  group.userData.setColor = (c) => {
    mat.color.set(c);
    hemMat.color.set(c).multiplyScalar(0.88);
    hoodInnerMat.color.set(c).multiplyScalar(0.55);
  };
  return group;
}

// ---------- JACKET ----------
function buildJacket(color, leather = false) {
  const group = new THREE.Group();
  const mat = leather ? makeLeatherMaterial(color) : makeFabricMaterial(color, { roughness: 0.8, normalScale: 0.7 });

  const shape = new THREE.Shape();
  shape.moveTo(-2.6, 1.3);
  shape.lineTo(-2.6, 0.1);
  shape.quadraticCurveTo(-1.9, 0.25, -1.3, 0.35);
  shape.lineTo(-1.3, -3.0);
  shape.quadraticCurveTo(0, -3.18, 1.3, -3.0);
  shape.lineTo(1.3, 0.35);
  shape.quadraticCurveTo(1.9, 0.25, 2.6, 0.1);
  shape.lineTo(2.6, 1.3);
  shape.lineTo(0.7, 1.3);
  shape.bezierCurveTo(0.5, 1.1, -0.5, 1.1, -0.7, 1.3);
  shape.lineTo(-2.6, 1.3);

  const geo = extrude(shape, 0.8, 0.18, 48);
  geo.center();
  inflate(geo, 0.75, 0.0);
  addWrinkles(geo, leather ? 0.025 : 0.045, leather ? 5.0 : 2.8);
  const body = new THREE.Mesh(geo, mat);
  body.castShadow = body.receiveShadow = true;
  group.add(body);

  // Lapels (folded peaked lapel)
  const lapelShape = new THREE.Shape();
  lapelShape.moveTo(-0.75, 1.25);
  lapelShape.quadraticCurveTo(-0.3, 0.6, -0.12, -1.3);
  lapelShape.lineTo(0.12, -1.3);
  lapelShape.quadraticCurveTo(0.3, 0.6, 0.75, 1.25);
  lapelShape.lineTo(0.35, 1.15);
  lapelShape.quadraticCurveTo(0.1, 0.4, 0, -1.0);
  lapelShape.lineTo(-0.35, 1.15);
  lapelShape.lineTo(-0.75, 1.25);
  const lapelGeo = extrude(lapelShape, 0.14, 0.04, 32);
  addWrinkles(lapelGeo, 0.01, 6.0);
  const lapel = new THREE.Mesh(lapelGeo, mat);
  lapel.position.set(0, 0, 0.52);
  lapel.castShadow = true;
  group.add(lapel);

  // Collar ring
  const collarGeo = new THREE.TorusGeometry(0.42, 0.1, 16, 48, Math.PI * 1.4);
  collarGeo.rotateX(Math.PI * 0.5);
  collarGeo.rotateY(Math.PI);
  const collar = new THREE.Mesh(collarGeo, mat);
  collar.position.set(0, 1.2, 0.15);
  group.add(collar);

  // Buttons or zipper
  if (leather) {
    // Asymmetric zipper (silver chain)
    const zipMat = new THREE.MeshPhysicalMaterial({
      color: 0xb8bac0, roughness: 0.3, metalness: 0.95, clearcoat: 0.6
    });
    const zipGeo = new THREE.BoxGeometry(0.06, 2.3, 0.03);
    const zip = new THREE.Mesh(zipGeo, zipMat);
    zip.position.set(0.18, -0.3, 0.58);
    group.add(zip);
    // Pull tab
    const pullGeo = new THREE.BoxGeometry(0.12, 0.3, 0.04);
    const pull = new THREE.Mesh(pullGeo, zipMat);
    pull.position.set(0.18, 0.65, 0.6);
    group.add(pull);
  } else {
    const btnMat = new THREE.MeshPhysicalMaterial({
      color: 0x2a1f15, roughness: 0.25, metalness: 0.1, clearcoat: 0.8, clearcoatRoughness: 0.15
    });
    for (let i = 0; i < 3; i++) {
      const btn = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.06, 24),
        btnMat
      );
      btn.rotation.x = Math.PI / 2;
      btn.position.set(0.18, 0.3 - i * 0.9, 0.58);
      btn.castShadow = true;
      group.add(btn);
    }
  }

  // Pockets (flap)
  for (let s = -1; s <= 1; s += 2) {
    const flapShape = new THREE.Shape();
    flapShape.moveTo(-0.45, 0);
    flapShape.lineTo(0.45, 0);
    flapShape.lineTo(0.4, -0.25);
    flapShape.lineTo(-0.4, -0.25);
    flapShape.lineTo(-0.45, 0);
    const flapGeo = extrude(flapShape, 0.06, 0.02, 16);
    const flap = new THREE.Mesh(flapGeo, mat);
    flap.position.set(s * 0.85, -1.1, 0.52);
    flap.castShadow = true;
    group.add(flap);
  }

  group.userData.setColor = (c) => { mat.color.set(c); };
  return group;
}

// ---------- PANTS ----------
function buildPants(color, denim = false) {
  const group = new THREE.Group();
  const mat = denim ? makeDenimMaterial(color) : makeFabricMaterial(color, { roughness: 0.85 });

  const shape = new THREE.Shape();
  shape.moveTo(-1.3, 1.6);
  shape.lineTo(1.3, 1.6);
  shape.lineTo(1.3, 1.3);
  shape.quadraticCurveTo(1.2, 0.6, 1.1, 0.0);
  shape.quadraticCurveTo(1.05, -1.5, 0.95, -3.2);
  shape.lineTo(0.25, -3.2);
  shape.quadraticCurveTo(0.2, -1.5, 0.15, -0.3);
  shape.quadraticCurveTo(0.05, -0.15, 0, -0.08);
  shape.quadraticCurveTo(-0.05, -0.15, -0.15, -0.3);
  shape.quadraticCurveTo(-0.2, -1.5, -0.25, -3.2);
  shape.lineTo(-0.95, -3.2);
  shape.quadraticCurveTo(-1.05, -1.5, -1.1, 0.0);
  shape.quadraticCurveTo(-1.2, 0.6, -1.3, 1.3);
  shape.lineTo(-1.3, 1.6);

  const geo = extrude(shape, 0.55, 0.14, 40);
  geo.center();
  inflate(geo, 0.5, -0.5);
  addWrinkles(geo, 0.03, 3.5);
  const body = new THREE.Mesh(geo, mat);
  body.castShadow = body.receiveShadow = true;
  group.add(body);

  // Waistband (darker)
  const bandMat = mat.clone();
  bandMat.color.multiplyScalar(0.78);
  const bandGeo = new THREE.BoxGeometry(2.7, 0.35, 0.72);
  const band = new THREE.Mesh(bandGeo, bandMat);
  band.position.set(0, 2.3, 0);
  group.add(band);

  // Denim details: contrast stitching (thin tubes along seams)
  if (denim) {
    const stitchMat = new THREE.MeshPhysicalMaterial({ color: 0xd9a84a, roughness: 0.7 });
    for (let s = -1; s <= 1; s += 2) {
      // Outer leg seam
      const outerPts = [
        new THREE.Vector3(s * 1.1, 2.1, 0.3),
        new THREE.Vector3(s * 1.05, 0.0, 0.3),
        new THREE.Vector3(s * 0.95, -3.15, 0.3)
      ];
      const outerSeam = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(outerPts), 30, 0.02, 6, false
      );
      group.add(new THREE.Mesh(outerSeam, stitchMat));
    }
    // Rivets at pockets
    const rivetMat = new THREE.MeshPhysicalMaterial({
      color: 0xc08a4a, roughness: 0.35, metalness: 0.9, clearcoat: 0.5
    });
    for (let s = -1; s <= 1; s += 2) {
      for (let rv = 0; rv < 2; rv++) {
        const rivet = new THREE.Mesh(
          new THREE.CylinderGeometry(0.045, 0.045, 0.04, 16),
          rivetMat
        );
        rivet.rotation.x = Math.PI / 2;
        rivet.position.set(s * (0.75 - rv * 0.45), 1.5, 0.4);
        group.add(rivet);
      }
    }
    // Belt loops
    for (let i = -2; i <= 2; i++) {
      const loop = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.32, 0.08),
        bandMat
      );
      loop.position.set(i * 0.55, 2.25, 0.4);
      group.add(loop);
    }
  }

  group.userData.setColor = (c) => {
    mat.color.set(c);
    bandMat.color.set(c).multiplyScalar(0.78);
  };
  return group;
}

// ---------- Dispatcher ----------
export function createGarment(type, color) {
  let g;
  if (type === 'tshirt') g = buildTshirt(color);
  else if (type === 'hoodie') g = buildHoodie(color);
  else if (type === 'jacket') g = buildJacket(color, false);
  else if (type === 'leather') g = buildJacket(color, true);
  else if (type === 'pants') g = buildPants(color, false);
  else if (type === 'denim') g = buildPants(color, true);
  else g = buildTshirt(color);
  return g;
}

// ---------- Lighting: three-point studio + rim ----------
export function setupLighting(scene) {
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));

  // Key (warm)
  const key = new THREE.DirectionalLight(0xfff0d8, 2.4);
  key.position.set(5, 7, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 25;
  key.shadow.camera.left = -6;
  key.shadow.camera.right = 6;
  key.shadow.camera.top = 6;
  key.shadow.camera.bottom = -6;
  key.shadow.bias = -0.0003;
  key.shadow.radius = 4;
  scene.add(key);

  // Rim (gold from behind)
  const rim = new THREE.DirectionalLight(0xc9a96e, 1.6);
  rim.position.set(-6, 4, -5);
  scene.add(rim);

  // Fill (cool blue)
  const fill = new THREE.DirectionalLight(0x5c7fb3, 0.6);
  fill.position.set(-3, -2, 4);
  scene.add(fill);

  // Bottom bounce (warm)
  const bounce = new THREE.HemisphereLight(0xfff0d8, 0x1a1812, 0.35);
  scene.add(bounce);
}

// ---------- Environment: RoomEnvironment for realistic reflections ----------
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

// ---------- Contact shadow disc (soft gradient) ----------
export function addContactShadow(scene, y = -3.4) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
  grad.addColorStop(0.5, 'rgba(0,0,0,0.2)');
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
