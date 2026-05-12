import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createGarment, setupLighting, setupEnvironment, addContactShadow, tickSway } from './garment.js';

// --- Read product id from URL ---
const params = new URLSearchParams(window.location.search);
const id = params.get('id') || 'tshirt-essential';
const product = window.ATELIER_PRODUCTS.find(p => p.id === id) || window.ATELIER_PRODUCTS[0];

document.getElementById('p-category').textContent = product.category;
document.getElementById('p-title').textContent = product.name;
document.getElementById('p-price').textContent = `$${product.price}`;
document.getElementById('p-desc').textContent = product.description;

const specsEl = document.getElementById('p-specs');
product.specs.forEach(([k, v]) => {
  const li = document.createElement('li');
  li.innerHTML = `<strong>${k}</strong><span>${v}</span>`;
  specsEl.appendChild(li);
});

// --- 3D Viewer ---
const canvas = document.getElementById('product-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
setupEnvironment(renderer, scene);
setupLighting(scene);

const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
camera.position.set(0, 0, 10);

const typeKey = product.id === 'jacket-leather' ? 'leather'
              : product.id === 'pants-denim' ? 'denim'
              : product.type;
const garment = createGarment(typeKey, product.defaultColor);
scene.add(garment);

// Shadow + contact disc
const shadowPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.ShadowMaterial({ opacity: 0.45 })
);
shadowPlane.rotation.x = -Math.PI / 2;
shadowPlane.position.y = -3.6;
shadowPlane.receiveShadow = true;
scene.add(shadowPlane);
addContactShadow(scene, -3.59);

// --- Color swatches (now that `garment` exists) ---
const colorsWrap = document.getElementById('p-colors');
product.colors.forEach((c) => {
  const btn = document.createElement('button');
  btn.className = 'swatch';
  btn.style.background = c;
  btn.dataset.color = c;
  if (c === product.defaultColor) btn.classList.add('active');
  btn.addEventListener('click', () => {
    colorsWrap.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    garment.userData.setColor(c);
  });
  colorsWrap.appendChild(btn);
});

document.querySelectorAll('#p-sizes .size').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('#p-sizes .size').forEach(s => s.classList.remove('active'));
    b.classList.add('active');
  });
});

// --- Post-processing ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
  new THREE.Vector2(canvas.clientWidth, canvas.clientHeight),
  0.3, 0.7, 0.88
);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// Orbit controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 6;
controls.maxDistance = 16;
controls.maxPolarAngle = Math.PI * 0.75;
controls.minPolarAngle = Math.PI * 0.25;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.8;
canvas.addEventListener('pointerdown', () => controls.autoRotate = false);

function resize() {
  const wrap = canvas.parentElement;
  const w = wrap.clientWidth;
  const h = wrap.clientHeight;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
resize();
window.addEventListener('resize', resize);

const clock = new THREE.Clock();
function tick() {
  tickSway(clock.getElapsedTime());
  controls.update();
  composer.render();
  requestAnimationFrame(tick);
}
tick();

gsap.from(garment.position, { y: -6, duration: 1.4, ease: 'power3.out' });
gsap.from(garment.rotation, { y: -Math.PI, duration: 1.6, ease: 'power3.out' });
gsap.from('.product-info > *', {
  x: 30, opacity: 0, duration: 0.9, stagger: 0.08, ease: 'power3.out'
});

document.getElementById('add-to-bag').addEventListener('click', () => {
  window.ATELIER_CART.add();
  const btn = document.getElementById('add-to-bag');
  const original = btn.textContent;
  btn.textContent = 'Added to bag ✓';
  gsap.fromTo(btn, { scale: 1 }, { scale: 1.04, duration: 0.15, yoyo: true, repeat: 1 });
  setTimeout(() => btn.textContent = original, 1600);
});

document.querySelectorAll('.cart-btn').forEach(b => {
  b.addEventListener('click', () => {
    alert(window.ATELIER_CART.count === 0
      ? 'Bag is empty. Add something beautiful.'
      : `You have ${window.ATELIER_CART.count} item(s) in your bag.`);
  });
});
