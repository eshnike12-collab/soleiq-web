// ── ANIMATED BACKGROUND CANVAS (soft floating orbs) ──
const canvas = document.getElementById('bgCanvas');
const ctx    = canvas.getContext('2d');
let W, H;

function resizeCanvas() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function rand(a, b) { return a + Math.random() * (b - a); }

const particles = Array.from({ length: 14 }, () => ({
  x: rand(0, innerWidth), y: rand(0, innerHeight),
  r: rand(80, 240),
  dx: rand(-.12, .12), dy: rand(-.12, .12),
  opacity: rand(.025, .07),
  hue: [175, 195, 0, 270, 220][Math.floor(Math.random() * 5)],
}));

(function draw() {
  ctx.clearRect(0, 0, W, H);
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  particles.forEach(p => {
    p.x += p.dx; p.y += p.dy;
    if (p.x < -p.r) p.x = W + p.r;
    if (p.x > W + p.r) p.x = -p.r;
    if (p.y < -p.r) p.y = H + p.r;
    if (p.y > H + p.r) p.y = -p.r;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
    const a = dark ? p.opacity * 2.2 : p.opacity;
    g.addColorStop(0, `hsla(${p.hue},70%,55%,${a})`);
    g.addColorStop(1, `hsla(${p.hue},70%,55%,0)`);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  });
  requestAnimationFrame(draw);
})();

// ── DARK / LIGHT MODE ──
const themeToggle = document.getElementById('themeToggle');
const themeIcon   = themeToggle.querySelector('.theme-icon');
const html        = document.documentElement;
const saved       = localStorage.getItem('rcTheme') || 'light';
html.setAttribute('data-theme', saved);
themeIcon.textContent = saved === 'dark' ? '☀️' : '🌙';

themeToggle.addEventListener('click', () => {
  const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  themeIcon.textContent = next === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('rcTheme', next);
});

// ── MOBILE MENU ──
const hamburger  = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
hamburger.addEventListener('click', () => mobileMenu.classList.toggle('open'));
mobileMenu.querySelectorAll('a').forEach(l => l.addEventListener('click', () => mobileMenu.classList.remove('open')));

// ── NAVBAR SCROLL ──
const navbar = document.querySelector('.navbar');
window.addEventListener('scroll', () => {
  navbar.style.boxShadow = window.scrollY > 10 ? '0 2px 20px rgba(0,0,0,.15)' : 'none';
});

// ── ANIMATED COUNTER ──
function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10);
  const suffix = el.dataset.suffix || '';
  const duration = 1800;
  const start = performance.now();
  (function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic
    el.textContent = Math.round(target * ease) + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  })(start);
}

// Trigger counters when visible
const counterEls = document.querySelectorAll('[data-target]');
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      animateCounter(e.target);
      counterObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.5 });
counterEls.forEach(el => counterObserver.observe(el));

// ── FAQ ACCORDION ──
document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const item   = btn.closest('.faq-item');
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(el => {
      el.classList.remove('open');
      el.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
    });
    if (!isOpen) { item.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); }
  });
});

// ── SCROLL REVEAL ──
const revealEls = document.querySelectorAll(
  '.step, .feature-card, .tcard, .about-card, .rlt-card, .faq-item, .rlt-mech-step'
);
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.opacity = '1';
      e.target.style.transform = 'translateY(0)';
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.08 });
revealEls.forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(22px)';
  el.style.transition = 'opacity .55s ease, transform .55s ease';
  revealObserver.observe(el);
});

// ── CONTACT FORM ──
function handleSubmit(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const orig = btn.textContent;
  btn.textContent = '✓ MESSAGE SENT';
  btn.disabled = true;
  btn.style.background = '#5cb8b2';
  btn.style.borderColor = '#5cb8b2';
  setTimeout(() => {
    btn.textContent = orig;
    btn.disabled = false;
    btn.style.background = '';
    btn.style.borderColor = '';
    e.target.reset();
  }, 3500);
}

// ═══════════════════════════════════════
// SHOPPING CART SYSTEM
// ═══════════════════════════════════════

const FREE_SHIPPING_THRESHOLD = 99;
let cart = JSON.parse(localStorage.getItem('rcCart') || '[]');

// DOM refs
const cartBtn         = document.getElementById('cartBtn');
const cartCount       = document.getElementById('cartCount');
const cartOverlay     = document.getElementById('cartOverlay');
const cartDrawer      = document.getElementById('cartDrawer');
const cartClose       = document.getElementById('cartClose');
const cartItemsEl     = document.getElementById('cartItems');
const cartEmpty       = document.getElementById('cartEmpty');
const cartFooter      = document.getElementById('cartFooter');
const cartSubtotal    = document.getElementById('cartSubtotal');
const cartHeaderCount = document.getElementById('cartHeaderCount');
const cfsFill         = document.getElementById('cfsFill');
const cfsText         = document.getElementById('cfsText');
const cfsAmt          = document.getElementById('cfsAmt');
const cartToast       = document.getElementById('cartToast');
const cartShopLink    = document.getElementById('cartShopLink');

function saveCart() { localStorage.setItem('rcCart', JSON.stringify(cart)); }

function getTotal() { return cart.reduce((s, i) => s + i.price * i.qty, 0); }
function getItemCount() { return cart.reduce((s, i) => s + i.qty, 0); }

function updateCartUI() {
  const count = getItemCount();
  const total = getTotal();

  // Nav badge
  cartCount.textContent = count;
  cartCount.style.display = count > 0 ? 'flex' : 'none';
  cartHeaderCount.textContent = count > 0 ? `(${count})` : '';

  // Free shipping bar
  const pct = Math.min((total / FREE_SHIPPING_THRESHOLD) * 100, 100);
  cfsFill.style.width = pct + '%';
  if (total >= FREE_SHIPPING_THRESHOLD) {
    cfsText.innerHTML = '🎉 <strong>You\'ve unlocked free shipping!</strong>';
    cfsFill.style.background = '#10b981';
  } else {
    const remaining = (FREE_SHIPPING_THRESHOLD - total).toFixed(0);
    cfsText.innerHTML = `Add <strong id="cfsAmt">$${remaining}</strong> more for free shipping`;
  }

  // Empty / filled state
  if (cart.length === 0) {
    cartEmpty.style.display  = 'flex';
    cartFooter.style.display = 'none';
    cartItemsEl.innerHTML    = '';
    return;
  }
  cartEmpty.style.display  = 'none';
  cartFooter.style.display = 'flex';
  cartSubtotal.textContent = `$${total.toFixed(2)}`;

  // Render items
  cartItemsEl.innerHTML = cart.map(item => `
    <div class="cart-item" data-id="${item.id}">
      <div class="ci-emoji">${item.emoji}</div>
      <div class="ci-info">
        <div class="ci-name">${item.name}</div>
        <div class="ci-price">$${(item.price * item.qty).toFixed(2)}</div>
        <div class="ci-controls">
          <button class="ci-btn ci-dec" data-id="${item.id}">−</button>
          <div class="ci-qty">${item.qty}</div>
          <button class="ci-btn ci-inc" data-id="${item.id}">+</button>
        </div>
      </div>
      <button class="ci-remove" data-id="${item.id}" title="Remove">✕</button>
    </div>
  `).join('');

  // Bind item controls
  cartItemsEl.querySelectorAll('.ci-inc').forEach(btn => {
    btn.addEventListener('click', () => changeQty(btn.dataset.id, 1));
  });
  cartItemsEl.querySelectorAll('.ci-dec').forEach(btn => {
    btn.addEventListener('click', () => changeQty(btn.dataset.id, -1));
  });
  cartItemsEl.querySelectorAll('.ci-remove').forEach(btn => {
    btn.addEventListener('click', () => removeItem(btn.dataset.id));
  });
}

function changeQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  saveCart(); updateCartUI();
}

function removeItem(id) {
  cart = cart.filter(i => i.id !== id);
  saveCart(); updateCartUI();
}

function openCart()  {
  cartDrawer.classList.add('open');
  cartOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  cartDrawer.classList.remove('open');
  cartOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

function showToast(msg) {
  cartToast.textContent = msg;
  cartToast.classList.add('show');
  setTimeout(() => cartToast.classList.remove('show'), 2800);
}

// Open/close cart
cartBtn.addEventListener('click', openCart);
cartClose.addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);
if (cartShopLink) cartShopLink.addEventListener('click', closeCart);

// Checkout button
document.getElementById('checkoutBtn').addEventListener('click', () => {
  showToast('Redirecting to secure checkout…');
  setTimeout(closeCart, 800);
});

// Add to cart
document.querySelectorAll('.add-to-cart').forEach(btn => {
  btn.addEventListener('click', () => {
    const { id, name, price, emoji } = btn.dataset;
    const existing = cart.find(i => i.id === id);
    if (existing) {
      existing.qty++;
    } else {
      cart.push({ id, name, price: parseFloat(price), emoji: emoji || '📦', qty: 1 });
    }
    saveCart();
    updateCartUI();

    // Button feedback
    const orig = btn.textContent;
    btn.textContent = '✓ Added!';
    btn.classList.add('added');
    setTimeout(() => { btn.textContent = orig; btn.classList.remove('added'); }, 1600);

    showToast(`${emoji || '📦'} ${name} added to cart`);
    openCart();
  });
});

// Price toggle (subscribe vs one-time)
document.querySelectorAll('.pc-price-toggle').forEach(toggle => {
  toggle.querySelectorAll('.price-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      toggle.querySelectorAll('.price-opt').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');

      const card   = opt.closest('.product-card');
      const price  = opt.dataset.price;
      const isSubscribe = opt.dataset.type === 'subscribe';

      card.querySelector('.pc-price').textContent = `$${price}`;

      const orig = card.querySelector('.pc-price-orig');
      if (orig) orig.style.display = isSubscribe ? 'inline' : 'none';

      // Update add-to-cart data price
      const addBtn = card.querySelector('.add-to-cart');
      if (addBtn) addBtn.dataset.price = price;
    });
  });
});

// Shop filters
document.querySelectorAll('.shop-filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.shop-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filter = btn.dataset.filter;
    document.querySelectorAll('.product-card').forEach(card => {
      const match = filter === 'all' || card.dataset.category === filter;
      card.style.display = match ? '' : 'none';
    });
  });
});

// Keyboard: close cart on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeCart();
});

// Init cart UI on load
updateCartUI();

// ── ACTIVE NAV HIGHLIGHT ──
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a');
window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(s => { if (window.scrollY >= s.offsetTop - 110) current = s.id; });
  navLinks.forEach(l => {
    l.style.color = l.getAttribute('href') === `#${current}` ? 'var(--accent)' : '';
  });
}, { passive: true });
