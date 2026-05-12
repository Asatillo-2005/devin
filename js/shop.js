// Shop page: grid of real product photos with 3D tilt + shine on hover.
// No per-card WebGL here — one GL context per card is expensive and slow
// for large grids. Real product photography IS the realism.

const grid = document.getElementById('shop-grid');
const filters = document.querySelectorAll('.filter');

function render(filter) {
  grid.innerHTML = '';
  const list = filter === 'all'
    ? window.ATELIER_PRODUCTS
    : window.ATELIER_PRODUCTS.filter(p => p.type === filter);

  list.forEach((p, idx) => {
    const card = document.createElement('a');
    card.className = 'card photo-card';
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

    gsap.from(card, {
      y: 50, opacity: 0, duration: 0.9, delay: idx * 0.06,
      ease: 'power3.out'
    });
  });
}

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
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top) / r.height;
    target.ry = (nx - 0.5) * 14;
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
      `translate3d(${state.ry * 0.6}px, ${-state.rx * 0.6}px, 30px) scale(1.06)`;
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

  img.addEventListener('error', () => {
    img.style.display = 'none';
    card.classList.add('no-img');
  });
}

filters.forEach(btn => {
  btn.addEventListener('click', () => {
    filters.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    render(btn.dataset.filter);
  });
});

render('all');

document.querySelectorAll('.cart-btn').forEach(b => {
  b.addEventListener('click', () => alert('Bag is empty. Add something beautiful.'));
});
