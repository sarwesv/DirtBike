// Ridgeline Moto · progress.js
// Coins, unlockable bikes and maps, and paint jobs.
// Plain scripts loaded in order by index.html; they share one global scope.
'use strict';

/* ---------- Prices ---------- */
const BIKE_PRICE = { trail: 0, pit: 0, enduro: 400, spark: 450, scrambler: 500, volt: 700, trials: 800, rally: 900, stealth: 900, super: 1100, hog: 1300, factory: 1500, surge: 1600 };
const WORLD_PRICE = { open: 0, forest: 300, desert: 300, autumn: 500, swamp: 500, tundra: 800, alpine: 800, canyon: 1000 };
// Paint jobs recolour plastics, rider gear and helmet on any bike. `null` keeps the bike's own colour.
const PAINTS = [
  { id: 'stock', name: 'Stock', price: 0, swatch: null },
  { id: 'midnight', name: 'Midnight', price: 200, plastic: '#1b1c21', plastic2: '#e8e4da', jersey: '#1b1c21', pants: '#2a2c31', helmet: '#1b1c21' },
  { id: 'arctic', name: 'Arctic', price: 200, plastic: '#f1f4f6', plastic2: '#3f7fd0', jersey: '#f1f4f6', pants: '#3f7fd0', helmet: '#f1f4f6' },
  { id: 'sunset', name: 'Sunset', price: 300, plastic: '#ff6a2b', plastic2: '#7b2bd6', jersey: '#7b2bd6', pants: '#3a1d5e', helmet: '#ff6a2b' },
  { id: 'toxic', name: 'Toxic', price: 300, plastic: '#a6f02e', plastic2: '#15140f', jersey: '#15140f', pants: '#15140f', helmet: '#a6f02e' },
  { id: 'royal', name: 'Royal', price: 400, plastic: '#1f3f9a', plastic2: '#ffcf33', jersey: '#1f3f9a', pants: '#ffcf33', helmet: '#ffcf33' },
  { id: 'camo', name: 'Desert Camo', price: 400, plastic: '#b59a6a', plastic2: '#5d6a43', jersey: '#5d6a43', pants: '#8a7a55', helmet: '#b59a6a' }
];

/* ---------- Save ---------- */
const PROG_KEY = 'ridgeline-moto-progress';
const prog = { coins: 300, bikes: ['trail', 'pit'], worlds: ['open'], paints: ['stock'], paint: 'stock', caches: [] };
try {
  const s = JSON.parse(localStorage.getItem(PROG_KEY) || 'null');
  if (s) { Object.assign(prog, s); prog.caches = prog.caches || []; }
  else {
    // First run with progression: keep whatever this player was already riding.
    if (!prog.bikes.includes(savedBike)) prog.bikes.push(savedBike);
    if (!prog.worlds.includes(savedWorld)) prog.worlds.push(savedWorld);
  }
} catch (e) {}
function saveProgress() { try { localStorage.setItem(PROG_KEY, JSON.stringify(prog)); } catch (e) {} }
const owns = (kind, id) => prog[kind].includes(id);

/* ---------- Earning ---------- */
const coinEl = $('coins');
function setCoinsUI() { const t = prog.coins.toLocaleString(); coinEl.textContent = t; const c = $('coinsTitle'); if (c) c.textContent = t; }
let coinBump = 0;
function earn(n, quiet) {
  if (!n) return;
  prog.coins += n; saveProgress();
  setCoinsUI();
  coinBump = 1; coinEl.parentElement.classList.add('bump');
  clearTimeout(earn.t); earn.t = setTimeout(() => coinEl.parentElement.classList.remove('bump'), 260);
}
setCoinsUI();
let coinDist = 0;
// Riding pays a little: 2 coins every 250 m.
function distanceCoins(meters) { coinDist += meters; if (coinDist >= 250) { coinDist -= 250; earn(2, true); } }

/* ---------- Buying ---------- */
function tryBuy(kind, id, price, label, after) {
  if (owns(kind, id)) return after();
  if (prog.coins < price) {
    toast(`${label} costs ${price.toLocaleString()} coins. You need ${(price - prog.coins).toLocaleString()} more.`);
    return;
  }
  prog.coins -= price; prog[kind].push(id); saveProgress();
  setCoinsUI();
  toast(`Unlocked ${label}`);
  chime();
  after();
}
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 2600);
}

/* ---------- Paint ---------- */
function paintedSpec(spec) {
  const p = PAINTS.find(x => x.id === prog.paint);
  if (!p || p.id === 'stock') return spec;
  return Object.assign({}, spec, { plastic: p.plastic, plastic2: p.plastic2, jersey: p.jersey, paintPants: p.pants, paintHelmet: p.helmet });
}
function renderPaints() {
  const wrap = $('paints');
  wrap.textContent = '';
  for (const p of PAINTS) {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'paint';
    btn.setAttribute('aria-pressed', String(p.id === prog.paint));
    const a = p.plastic || bikeSpec.plastic, b = p.plastic2 || bikeSpec.plastic2;
    btn.style.setProperty('--a', a); btn.style.setProperty('--b', b);
    const locked = !owns('paints', p.id);
    btn.innerHTML = `<i></i><span>${p.name}</span>${locked ? `<em>${p.price}</em>` : ''}`;
    btn.title = locked ? `${p.name}: ${p.price} coins` : p.name;
    btn.addEventListener('click', () => tryBuy('paints', p.id, p.price, p.name + ' paint', () => {
      prog.paint = p.id; saveProgress(); setBike(bikeSpec.id); renderPaints();
    }));
    wrap.appendChild(btn);
  }
}
