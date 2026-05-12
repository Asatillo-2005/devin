import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createGarment, setupLighting, setupEnvironment, addContactShadow, tickSway } from './garment.js';

gsap.registerPlugin(ScrollTrigger);

// ======= HERO SCENE (with bloom post-processing) =======
(function heroScene() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

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

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 9.5);

  let current = createGarment('hoodie', '#4a4038');
  current.scale.setScalar(1.05);
  scene.add(current);

  // Real shadow on a ground plane
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.ShadowMaterial({ opacity: 0.45 })
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = -3.4;
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);
  addContactShadow(scene, -3.39);

  // Post-processing: subtle bloom on rim highlights
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(canvas.clientWidth, canvas.clientHeight),
    0.35, 0.8, 0.85
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // Pointer-driven rotation
  const target = { rx: 0, ry: 0 };
  const current_rot = { rx: 0, ry: 0 };
  window.addEventListener('pointermove', (e) => {
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = (e.clientY / window.innerHeight) * 2 - 1;
    target.ry = nx * 0.5;
    target.rx = ny * 0.25;
  });

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
    const t = clock.getElapsedTime();
    tickSway(t);
    current_rot.rx += (target.rx - current_rot.rx) * 0.05;
    current_rot.ry += (target.ry - current_rot.ry) * 0.05;
    current.rotation.x = current_rot.rx;
    current.rotation.y = current_rot.ry + t * 0.2;
    current.position.y = Math.sin(t * 0.8) * 0.06;
    composer.render();
    requestAnimationFrame(tick);
  }
  tick();

  // Color swatches
  const swatches = document.querySelectorAll('.hero .swatch');
  swatches.forEach((btn, i) => {
    if (i === 0) btn.classList.add('active');
    btn.addEventListener('click', () => {
      swatches.forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      current.userData.setColor(btn.dataset.color);
    });
  });

  // Entrance
  gsap.from(current.position, { y: -6, duration: 1.6, ease: 'power3.out' });
  gsap.from(current.rotation, { y: Math.PI * 2, duration: 2.0, ease: 'power3.out' });
})();

// ======= FEATURED PIECE =======
(function featuredScene() {
  const canvas = document.getElementById('featured-canvas');
  if (!canvas) return;

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

  const garment = createGarment('hoodie', '#4a4038');
  scene.add(garment);
  addContactShadow(scene, -3.2);

  function resize() {
    const w = canvas.parentElement.clientWidth;
    const h = canvas.parentElement.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  const clock = new THREE.Clock();
  function tick() {
    const t = clock.getElapsedTime();
    tickSway(t);
    garment.rotation.y = t * 0.3;
    garment.rotation.x = Math.sin(t * 0.4) * 0.08;
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();

  ScrollTrigger.create({
    trigger: '.featured',
    start: 'top 80%',
    end: 'bottom 20%',
    onUpdate: (self) => {
      camera.position.z = 10 - self.progress * 1.5;
    }
  });
})();

// ======= COLLECTION GRID (real photography + 3D tilt) =======
(function collectionGrid() {
  const grid = document.getElementById('collection-grid');
  if (!grid) return;

  const featured = window.ATELIER_PRODUCTS.slice(0, 6);
  featured.forEach((p) => {
    const card = document.createElement('a');
    card.className = 'card reveal photo-card';
    card.href = `product.html?id=${p.id}`;
    card.style.setProperty('--accent', p.accent);
    card.innerHTML = `
      <div class="card-media">
        <div class="card-media-bg" style="background-color:${p.accent}"></div>
        <img class="card-img" src="${p.image}" alt="${p.name}" loading="lazy" />
        <div class="card-shine"></div>
      </div>
      <div class="card-info">
        <div>
          <div class="card-cat">${p.category}</div>
          <div class="card-name">${p.name}</div>
        </div>
        <div class="card-price">$${p.price}</div>
      </div>
    `;
    grid.appendChild(card);
    attachTilt(card);
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => e.isIntersecting && e.target.classList.add('in'));
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
})();

// 3D-tilt interaction for photo cards: parallax image + moving light shine
function attachTilt(card) {
  const media = card.querySelector('.card-media');
  const img = card.querySelector('.card-img');
  const shine = card.querySelector('.card-shine');
  if (!media || !img) return;

  let rafId = null;
  const state = { rx: 0, ry: 0, mx: 50, my: 50 };
  const target = { rx: 0, ry: 0, mx: 50, my: 50 };

  function onMove(e) {
    const r = media.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width;   // 0..1
    const ny = (e.clientY - r.top) / r.height;
    target.ry = (nx - 0.5) * 14;                 // deg
    target.rx = (0.5 - ny) * 14;
    target.mx = nx * 100;
    target.my = ny * 100;
  }
  function onLeave() {
    target.rx = target.ry = 0;
    target.mx = target.my = 50;
  }
  function loop() {
    state.rx += (target.rx - state.rx) * 0.12;
    state.ry += (target.ry - state.ry) * 0.12;
    state.mx += (target.mx - state.mx) * 0.15;
    state.my += (target.my - state.my) * 0.15;
    media.style.transform =
      `perspective(900px) rotateX(${state.rx}deg) rotateY(${state.ry}deg)`;
    img.style.transform =
      `translate3d(${(state.ry) * 0.6}px, ${-state.rx * 0.6}px, 30px) scale(1.06)`;
    if (shine) {
      shine.style.background =
        `radial-gradient(circle at ${state.mx}% ${state.my}%, rgba(255,255,255,0.22), transparent 55%)`;
    }
    rafId = requestAnimationFrame(loop);
  }

  card.addEventListener('pointerenter', () => { if (!rafId) loop(); });
  card.addEventListener('pointermove', onMove);
  card.addEventListener('pointerleave', () => {
    onLeave();
    setTimeout(() => { cancelAnimationFrame(rafId); rafId = null; }, 600);
  });

  // Graceful fallback if an image fails to load
  img.addEventListener('error', () => {
    img.style.display = 'none';
    card.classList.add('no-img');
  });
}

// ======= REVEALS =======
gsap.utils.toArray('.section-head, .featured-text, .about-inner').forEach((el) => {
  gsap.from(el, {
    y: 60, opacity: 0, duration: 1.1, ease: 'power3.out',
    scrollTrigger: { trigger: el, start: 'top 80%' }
  });
});

document.querySelectorAll('.cart-btn').forEach(b => {
  b.addEventListener('click', () => alert('Bag is empty. Add something beautiful.'));
});
