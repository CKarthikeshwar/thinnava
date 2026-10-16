"""Assemble design/motion.html (clickable motion prototype) from the built phase2 styles.
Run: python design/src/build_phase2.py && python design/src/build_motion.py (from the project root)."""
import io, re, os

here = os.path.dirname(os.path.abspath(__file__))
design = os.path.dirname(here)
p2 = io.open(os.path.join(design, 'phase2.html'), encoding='utf-8').read()
body = io.open(os.path.join(here, 'motion-body.html'), encoding='utf-8').read()
style = re.search(r'<style>(.*?)</style>', p2, re.S).group(1)
defs = re.search(r'(<svg width="0" height="0".*?</svg>)\s*\n', p2, re.S).group(1)
path = lambda n: re.search(r'<path d="([^"]+)"', io.open(os.path.join(design, 'assets', n + '.svg'), encoding='utf-8').read()).group(1)

SB = '<div class="sb"><span>9:41</span><span class="ic"><i data-lucide="signal"></i><i data-lucide="wifi"></i><i data-lucide="battery-full"></i></span></div>'
body = body.replace('{{SB}}', SB).replace('{{SWIGGY}}', path('swiggy')).replace('{{ZOMATO}}', path('zomato'))

CSS = r"""
/* ---------- Motion prototype ---------- */
.mo{max-width:1400px;margin:0 auto;padding:28px 24px 80px;display:grid;grid-template-columns:400px 1fr;gap:48px;align-items:start}
.mo-stage{position:sticky;top:84px;display:flex;flex-direction:column;align-items:center;gap:16px}
.stage{position:absolute;inset:0;overflow:hidden}
.view{display:none}.view.on{display:flex}
.tabv .body{padding-bottom:78px}
.phone .nav{position:absolute;left:0;right:0;bottom:0;z-index:20;transition:transform .3s cubic-bezier(.05,.7,.1,1)}
.phone .nav.hide{transform:translateY(110%);transition-timing-function:cubic-bezier(.3,0,.8,.15);transition-duration:.2s}
.nav a{cursor:pointer}.nav .pill{transition:background-color .25s cubic-bezier(.2,0,0,1),color .25s}
.wel{display:flex;flex-direction:column;padding:0 22px 28px}
.wtop{display:flex;justify-content:space-between;align-items:center;height:48px}
.gbtn{background:var(--p-strong)}.gwrap{background:#fff;border-radius:50%;width:28px;height:28px;display:grid;place-items:center}
.mini-share{margin-top:14px;background:var(--surface);border-radius:24px;padding:14px;box-shadow:0 10px 30px -18px rgba(20,30,50,.4)}
.mini-map{margin-top:14px;height:250px;border-radius:24px;overflow:hidden;position:relative}
.mini-map svg.base{position:absolute;inset:0;width:100%;height:100%}
.peekwrap{position:relative;display:flex;justify-content:center;margin:18px 0 -11px;z-index:1}
.peekwrap.sm{margin:0 0 -9px}
.setup-card{background:var(--surface);border-radius:30px 30px 0 0;flex:1;padding:36px 22px 26px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:2}
.reading{position:relative;z-index:2}
.ustate{margin-left:auto;display:grid;place-items:center;width:24px;height:24px;color:var(--good)}
.spin{width:18px;height:18px;border-radius:50%;border:2.5px solid var(--line);border-top-color:var(--p);animation:spin .7s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.tapcard,.tappin,[data-go]{cursor:pointer}
.sheet-scrim,#wa-scrim,.dial-scrim{opacity:0;pointer-events:none}
.sheet-scrim.open,#wa-scrim.open,.dial-scrim.open{opacity:1;pointer-events:auto}
.dial-scrim{z-index:19;background:rgba(14,24,44,.78);backdrop-filter:blur(3px)}
.fsheet,.pincard,#wa-sheet{transform:translateY(110%)}
.fsheet.open,.pincard.open,#wa-sheet.open{transform:none}
.pincard{bottom:78px;left:8px;right:8px;border-radius:28px;padding-bottom:18px;z-index:21}
#dial{pointer-events:none}#dial.open{pointer-events:auto}
#dial .d{opacity:0}
#dial .d .c{cursor:pointer}
.plus svg{transition:none}
#heart{transition:background-color .2s cubic-bezier(.2,0,0,1),color .2s}
#heart.liked{background:var(--p);color:#fff}#heart.liked svg{fill:currentColor}
.snack{transform:translateY(170%)}
.ghost{position:absolute;margin:0;z-index:40;pointer-events:none}
.tglide{font-family:var(--display);font-weight:600;color:var(--ink);line-height:1.15;transform-origin:0 0;white-space:nowrap}
.pin.sel .bub{box-shadow:0 0 0 3px var(--p),0 6px 16px -4px rgba(10,20,40,.4)}
.mo-ctrl{display:flex;flex-direction:column;align-items:center;gap:10px;font-size:13.5px;color:#3b4454}
.rm{display:flex;align-items:center;gap:8px;font-weight:700;cursor:pointer}.rm small{font-weight:600;color:#6b7383}
.rm input{width:18px;height:18px;accent-color:#2350D9}
.mo-reset{all:unset;cursor:pointer;font-weight:800;color:#2350D9;padding:6px 10px;border-radius:8px}
.mo-reset:focus-visible,.play:focus-visible{outline:2px solid #2350D9;outline-offset:2px}
.mo-spec{max-width:68ch;color:#1b2333}
.mo-h{font-family:var(--display);font-weight:600;font-size:30px;margin:4px 0 6px}
.mo-lede{font-size:15px;line-height:1.55;color:#4a5263;margin:0 0 8px}
.mo-group{font-family:var(--display);font-weight:600;font-size:19px;margin:30px 0 10px}
.mo-item{display:grid;grid-template-columns:auto 1fr;gap:16px;align-items:start;background:#fff;border-radius:18px;padding:16px 18px;margin-bottom:10px;box-shadow:0 1px 2px rgba(20,30,50,.05),0 8px 20px -16px rgba(20,30,50,.3)}
.mo-item.hero{box-shadow:inset 0 0 0 2px #2350D9,0 10px 26px -16px rgba(35,80,217,.5)}
.mo-item b{font-size:16px}
.mo-meta{display:block;font-size:12.5px;font-weight:700;color:#2350D9;margin:3px 0 6px}
.mo-item p,.mo-item li{font-size:14px;line-height:1.5;color:#4a5263;margin:0}
.mo-item ol{margin:4px 0 0;padding-left:18px;display:flex;flex-direction:column;gap:5px}
.play{all:unset;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;height:40px;min-width:64px;border-radius:999px;background:#2350D9;color:#fff;font-weight:800;font-size:14px}
.play[disabled]{opacity:.45;cursor:default}
.mo-tok{border-collapse:collapse;width:100%;background:#fff;border-radius:16px;overflow:hidden;font-size:14px}
.mo-tok th,.mo-tok td{text-align:left;padding:10px 14px;border-bottom:1px solid #e6e9ef}
.mo-tok th{font-size:12.5px;color:#6b7383;background:#f6f7fa}
.mo-tok code{font-size:12.5px;background:#eef2ff;padding:2px 6px;border-radius:6px;color:#16348F}
@media (max-height:960px){.mo-stage .phone{transform:scale(.8);transform-origin:top center;margin-bottom:-156px}}
@media (max-height:800px){.mo-stage{top:66px}.mo-stage .phone{transform:scale(.68);margin-bottom:-250px}}
@media (max-width:900px){.mo{grid-template-columns:1fr}.mo-stage{position:static}}
"""

JS = r"""
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const E = { std: 'cubic-bezier(.2,0,0,1)', dec: 'cubic-bezier(.05,.7,.1,1)', acc: 'cubic-bezier(.3,0,.8,.15)' };
let RM = false, busy = false, cur = $('#v-splash'), from = null, lastCard = null, dialOpen = false;
try { RM = new URLSearchParams(location.search).get('rm') === '1' || matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
$('#rm').checked = RM;
$('#rm').addEventListener('change', e => { RM = e.target.checked; });
const wait = ms => new Promise(r => setTimeout(r, RM ? Math.min(ms, 250) : ms));
const stage = $('#stage');

// Animate; under "Remove animations" every movement collapses to a short crossfade.
function A(el, kf, o) {
  if (!el) return Promise.resolve();
  if (RM) {
    const op = kf.filter(k => 'opacity' in k).map(k => ({ opacity: k.opacity }));
    kf = op.length >= 2 ? [op[0], op[op.length - 1]] : [{}, {}];
    o = { ...o, duration: Math.min(o.duration || 150, 150), delay: 0, easing: 'linear' };
  }
  return el.animate(kf, { fill: 'forwards', ...o }).finished.catch(() => {});
}
const clean = (...els) => els.forEach(e => e && e.getAnimations().forEach(a => a.cancel()));
const K = () => stage.getBoundingClientRect().width / 360;   // phone may be scaled to fit the window
function rel(el) { const s = stage.getBoundingClientRect(), r = el.getBoundingClientRect(), k = K(); return { t: (r.top - s.top) / k, l: (r.left - s.left) / k, r: (s.right - r.right) / k, b: (s.bottom - r.bottom) / k }; }
const inset = (r, rad) => `inset(${r.t}px ${r.r}px ${r.b}px ${r.l}px round ${rad}px)`;
function navFor(v) {
  const tab = v.classList.contains('tabv');
  $('#nav').classList.toggle('hide', !tab);
  if (tab) $$('#nav [data-tab]').forEach(a => a.classList.toggle('on', a.dataset.tab === v.id.slice(2)));
}

// Card -> place page: the place name lifts off the card and glides into the page title;
// the card dims, the page settles in underneath, and its content rises in a short stagger.
const pieces = v => [...v.querySelectorAll('.hero-place .meta-line, .acts, .panel, .efab')];
function ghostTitle(srcEl, toEl, fromSize, toSize, dur) {
  const r1 = rel(srcEl), r2 = rel(toEl), sc = toSize / fromSize;
  const g = document.createElement('div');
  g.className = 'ghost tglide'; g.textContent = srcEl.textContent;
  Object.assign(g.style, { left: r1.l + 'px', top: r1.t + 'px', fontSize: fromSize + 'px' });
  stage.appendChild(g);
  return A(g, [{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${r2.l - r1.l}px, ${r2.t - r1.t}px) scale(${sc})` }], { duration: dur, easing: 'cubic-bezier(.2,.8,.2,1)' }).then(() => g.remove());
}
async function openPlace(card) {
  const a = cur, b = $('#v-place'), h1 = b.querySelector('.hero-place h1'), title = card.querySelector('.place');
  h1.textContent = title.textContent;
  b.classList.add('on'); a.style.zIndex = 1; b.style.zIndex = 2; navFor(b);
  b.style.opacity = 0; h1.style.visibility = 'hidden';
  const ps = pieces(b); ps.forEach(x => x.style.opacity = 0);
  const glide = ghostTitle(title, h1, 17.5, 26, 460);
  title.style.visibility = 'hidden';
  A(card, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(.97)', opacity: .6 }], { duration: 200, easing: E.std });
  await A(b, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: 60, easing: E.std });
  b.style.opacity = '';
  await Promise.all([glide, ...ps.map((x, i) => A(x, [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 320, delay: i * 45, easing: E.dec }))]);
  h1.style.visibility = ''; ps.forEach(x => x.style.opacity = '');
  title.style.visibility = ''; a.classList.remove('on'); clean(a, b, card, ...ps); a.style.zIndex = b.style.zIndex = ''; cur = b;
}
async function closePlace(card) {
  const a = cur, b = $('#v-home'), h1 = a.querySelector('.hero-place h1'), title = card.querySelector('.place');
  b.classList.add('on'); b.style.zIndex = 1; a.style.zIndex = 2; navFor(b);
  title.style.visibility = 'hidden';
  const ps = pieces(a);
  await Promise.all(ps.map(x => A(x, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(10px)' }], { duration: 150, easing: E.acc })));
  const glide = ghostTitle(h1, title, 26, 17.5, 380);
  h1.style.visibility = 'hidden';
  A(card, [{ transform: 'scale(.97)', opacity: .6 }, { transform: 'scale(1)', opacity: 1 }], { duration: 320, delay: 80, easing: E.dec });
  await Promise.all([glide, A(a, [{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: E.std })]);
  title.style.visibility = ''; h1.style.visibility = '';
  a.classList.remove('on'); clean(a, b, card, ...ps); a.style.zIndex = b.style.zIndex = ''; cur = b;
}

async function go(b, how = 'fade', opt = {}) {
  const a = cur; if (a === b) return;
  b.classList.add('on'); a.style.zIndex = 1; b.style.zIndex = 2; navFor(b);
  if (how === 'fade') {            // soft crossfade: new tab settles in on top, old one fades beneath, never a blank frame
    await Promise.all([
      A(a, [{ opacity: 1 }, { opacity: 0 }], { duration: 240, easing: E.std }),
      A(b, [{ opacity: 0, transform: 'scale(.98)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 280, easing: 'cubic-bezier(.22,.61,.36,1)' })]);
  } else if (how === 'x') {        // shared axis X
    const d = opt.dir || 1;
    await Promise.all([
      A(a, [{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: `translateX(${-60 * d}px)` }], { duration: 150, easing: E.acc }),
      A(b, [{ opacity: 0, transform: `translateX(${60 * d}px)` }, { opacity: 1, transform: 'translateX(0)' }], { duration: 300, delay: 50, easing: E.dec })]);
  } else if (how === 'up') {       // sheet grows into a full screen
    await Promise.all([
      A(a, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: E.acc }),
      A(b, [{ opacity: 0, transform: 'translateY(48px)' }, { opacity: 1, transform: 'none' }], { duration: 400, easing: E.dec })]);
  } else if (how === 'expand') {   // container transform: card -> screen
    const r = rel(opt.from);
    await A(b, [{ clipPath: inset(r, 20), opacity: 0 }, { opacity: 1, offset: .3 }, { clipPath: inset({ t: 0, r: 0, b: 0, l: 0 }, 38), opacity: 1 }], { duration: 450, easing: E.dec });
  } else if (how === 'shrink') {   // container transform back: screen -> card
    a.style.zIndex = 2; b.style.zIndex = 1;
    const r = rel(opt.to);
    await A(a, [{ clipPath: inset({ t: 0, r: 0, b: 0, l: 0 }, 38), opacity: 1 }, { opacity: 1, offset: .7 }, { clipPath: inset(r, 20), opacity: 0 }], { duration: opt.dur || 300, easing: opt.ease || E.acc });
  }
  a.classList.remove('on'); clean(a, b); a.style.zIndex = b.style.zIndex = ''; cur = b;
}

function jump(id) {
  $$('.view').forEach(v => { v.classList.toggle('on', v.id === id); clean(v); v.style.zIndex = ''; });
  cur = $('#' + id); navFor(cur); resetBits();
}
function resetBits() {
  ['#filter-sheet', '#pin-card', '#wa-sheet', '#filter-scrim', '#wa-scrim', '#dial-scrim', '#dial'].forEach(s => { const e = $(s); e.classList.remove('open'); clean(e); });
  $$('#dial .d').forEach(d => clean(d)); clean($('#plus svg')); dialOpen = false;
  $('#pin-bf').classList.remove('sel'); clean($('#snack'));
}

async function sheetOpen(sheet, scrim) {
  sheet.classList.add('open');
  if (scrim) { scrim.classList.add('open'); A(scrim, [{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: E.std }); }
  await A(sheet, [{ transform: 'translateY(110%)' }, { transform: 'translateY(0)' }], { duration: 400, easing: E.dec });
}
async function sheetClose(sheet, scrim) {
  if (scrim) A(scrim, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: E.std });
  await A(sheet, [{ transform: 'translateY(0)' }, { transform: 'translateY(110%)' }], { duration: 250, easing: E.acc });
  sheet.classList.remove('open'); scrim && scrim.classList.remove('open'); clean(sheet, scrim);
}

async function dial() {
  const ds = $$('#dial .d'), plus = $('#plus'), icon = $('#plus svg'), sc = $('#dial-scrim');
  if (!dialOpen) {
    dialOpen = true; $('#dial').classList.add('open'); sc.classList.add('open');
    A(sc, [{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: E.std });
    A(icon, [{ transform: 'rotate(0)' }, { transform: 'rotate(135deg)' }], { duration: 250, easing: E.dec });
    const pr = plus.getBoundingClientRect();
    await Promise.all(ds.map((d, i) => {
      const end = d.classList.contains('mid') ? 'translateY(-34px)' : 'translateY(0)';
      const dr = d.getBoundingClientRect();
      const k = K(), dx = (pr.left + pr.width / 2 - (dr.left + dr.width / 2)) / k, dy = (pr.top - dr.top) / k;
      return A(d, [{ opacity: 0, transform: `translate(${dx}px,${dy}px) scale(.3)` }, { opacity: 1, transform: end }], { duration: 250, delay: i * 30, easing: E.dec });
    }));
  } else {
    dialOpen = false;
    A(sc, [{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: E.acc });
    A(icon, [{ transform: 'rotate(135deg)' }, { transform: 'rotate(0)' }], { duration: 200, easing: E.acc });
    await Promise.all(ds.map((d, i) => A(d, [{ opacity: 1 }, { opacity: 0, transform: 'scale(.6)' }], { duration: 150, delay: (2 - i) * 20, easing: E.acc })));
    $('#dial').classList.remove('open'); sc.classList.remove('open'); clean(sc, icon, ...ds);
  }
}

async function climb(img) {                 // chef cat climbs up behind the card, then paws over the edge
  const wrap = img.parentElement; wrap.style.zIndex = 1;
  await A(img, [{ transform: 'translateY(75%)' }, { transform: 'translateY(-5px)', offset: .8 }, { transform: 'translateY(0)' }], { duration: 600, easing: E.dec });
  wrap.style.zIndex = 3;
}

async function heart() {
  const h = $('#heart'), on = h.classList.toggle('liked');
  A(h.querySelector('svg'), [{ transform: 'scale(1)' }, { transform: 'scale(1.35)', offset: .4 }, { transform: 'scale(1)' }], { duration: 220, easing: E.std });
  if (on) {
    const s = $('#snack');
    await A(s, [{ transform: 'translateY(170%)' }, { transform: 'translateY(0)' }], { duration: 300, easing: E.dec });
    await wait(2600);
    await A(s, [{ transform: 'translateY(0)' }, { transform: 'translateY(170%)' }], { duration: 200, easing: E.acc });
    clean(s);
  }
}

async function pin() {
  const p = $('#pin-bf'); p.classList.add('sel');
  A(p.querySelector('.bub'), [{ transform: 'scale(1)' }, { transform: 'scale(1.12)', offset: .5 }, { transform: 'scale(1)' }], { duration: 220, easing: E.std });
  await wait(120); await sheetOpen($('#pin-card'));
}

async function launch() {
  const cat = $('#splash-cat'), w = $('#splash-word'), s = $('#splash-sub');
  A(cat, [{ opacity: 0, transform: 'translateY(24px) scale(.92)' }, { opacity: 1, transform: 'none' }], { duration: 500, easing: E.dec });
  A(w, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 400, delay: 120, easing: E.dec });
  await A(s, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 220, easing: E.std });
  await wait(800); await go($('#v-w1'), 'fade'); clean(cat, w, s);
}

async function setupSeq() {
  const st = $('#u-state'), help = $('#u-help');
  st.innerHTML = ''; help.style.opacity = 0;
  await climb($('#setup-cat'));
  st.innerHTML = '<span class="spin"></span>'; await wait(700);
  st.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>';
  A(st, [{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 150, easing: E.dec });
  help.style.opacity = 1; A(help, [{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }], { duration: 200, easing: E.dec });
}

async function feedIn() {
  await Promise.all($$('#feed > .card').map((c, i) => A(c, [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: i * 40, easing: E.dec })));
  $$('#feed > .card').forEach(c => clean(c));
}

function resetConfirm() {
  $('#who-t').textContent = ''; $('#who-ph').style.display = '';
  const q = $('#req'); q.textContent = 'Required'; q.style.color = ''; q.style.background = '';
  const s = $('#save'); s.style.opacity = .45; clean(s);
  $$('#v-confirm .fill, #v-confirm .ichip').forEach(f => clean(f)); clean($('#price'));
}

function newCard() {
  const el = document.createElement('article');
  el.className = 'card tapcard'; el.dataset.go = 'place'; el.dataset.fresh = '1';
  el.innerHTML = '<div class="top"><span class="src"><i data-lucide="user-round"></i></span><div style="flex:1;min-width:0"><div class="who"><b>Rahul</b> told you about</div><div class="place">Burger Factory</div><div class="meta"><i data-lucide="map-pin"></i>Koramangala · went Oct 10</div></div><span class="time">now</span></div><div class="lines"><div><i data-lucide="heart" style="color:var(--p)"></i>Chicken burger</div><div><i data-lucide="thumbs-down" style="color:var(--ink-3)"></i>Shake</div></div><div class="foot"><span class="rv good"><i data-lucide="smile"></i>Good</span><span class="price">₹300 / person</span><span class="priv"><i data-lucide="lock"></i>Only you</span></div>';
  return el;
}

async function share() {
  if (dialOpen) await dial();
  if (cur.id !== 'v-wa') await go($('#v-wa'), 'fade');
  resetConfirm();
  const msg = $('#wa-msg'), sheet = $('#wa-sheet'), sc = $('#wa-scrim'), cat = $('#read-cat');
  await A(msg, [{ boxShadow: '0 0 0 0 rgba(35,80,217,0)' }, { boxShadow: '0 0 0 3px rgba(35,80,217,.9)' }], { duration: 250, easing: E.std });
  await wait(350);
  sc.classList.add('open'); A(sc, [{ opacity: 0 }, { opacity: 1 }], { duration: 250, easing: E.std });
  cat.parentElement.style.zIndex = 1;
  A(cat, [{ transform: 'translateY(75%)' }, { transform: 'translateY(75%)' }], { duration: 10 });
  await sheetOpen(sheet);
  climb(cat);
  // a copy of the message flies into the reading card
  const r1 = rel(msg), r2 = rel($('#reading'));
  const g = msg.cloneNode(true); g.removeAttribute('id'); g.classList.add('ghost');
  Object.assign(g.style, { left: r1.l + 'px', top: r1.t + 'px', width: msg.offsetWidth + 'px' });
  stage.appendChild(g);
  A(g, [{ transform: 'none', opacity: 1 }, { transform: `translate(${r2.l - r1.l + 6}px, ${r2.t - r1.t + 24}px) scale(.5)`, opacity: 0 }], { duration: 650, delay: 200, easing: E.dec }).then(() => g.remove());
  await wait(1500);
  await go($('#v-confirm'), 'up');
  sheet.classList.remove('open'); sc.classList.remove('open'); clean(sheet, sc, cat, msg);
  // fields fill in one by one
  await Promise.all($$('#v-confirm .fill').map((f, i) => A(f, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 280, delay: i * 40, easing: E.dec })));
  $$('#v-confirm .ichip').forEach(c => A(c, [{ transform: 'scale(.6)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 150, easing: E.dec }));
  A($('#price'), [{ boxShadow: 'inset 0 0 0 2px #E2A417, 0 0 0 0 rgba(226,164,23,.55)' }, { boxShadow: 'inset 0 0 0 2px #E2A417, 0 0 0 10px rgba(226,164,23,0)' }], { duration: 700, easing: E.std });
  await wait(600);
  $('#who-ph').style.display = 'none';
  for (const ch of 'Rahul') { $('#who-t').textContent += ch; await wait(110); }
  const q = $('#req'); q.textContent = 'Done'; q.style.color = 'var(--good)'; q.style.background = 'var(--good-bg)';
  const s = $('#save'); s.style.opacity = 1;
  A(s, [{ opacity: .45, transform: 'scale(1)' }, { opacity: 1, transform: 'scale(1.04)', offset: .5 }, { opacity: 1, transform: 'scale(1)' }], { duration: 240, easing: E.std });
  await wait(800);
  await save();
}

async function save() {
  const home = $('#v-home'), feed = $('#feed'), a = cur;
  home.classList.add('on'); home.style.zIndex = 1; a.style.zIndex = 2; navFor(home);
  feed.querySelectorAll('[data-fresh]').forEach(n => n.remove());
  const olds = [...feed.children], before = olds.map(c => c.getBoundingClientRect().top);
  const nc = newCard(); feed.prepend(nc); try { lucide.createIcons(); } catch (e) {}
  const after = olds.map(c => c.getBoundingClientRect().top);
  olds.forEach((c, i) => A(c, [{ transform: `translateY(${before[i] - after[i]}px)` }, { transform: 'none' }], { duration: 450, delay: 120, easing: E.dec }));
  A(nc, [{ opacity: 0 }, { opacity: 0, offset: .55 }, { opacity: 1 }], { duration: 520 });
  const r = rel(nc);
  await A(a, [{ clipPath: inset({ t: 0, r: 0, b: 0, l: 0 }, 38), opacity: 1 }, { clipPath: inset(r, 20), opacity: 1, offset: .8 }, { clipPath: inset(r, 20), opacity: 0 }], { duration: 560, easing: E.dec });
  a.classList.remove('on'); clean(a, nc, ...olds); a.style.zIndex = home.style.zIndex = ''; cur = home;
  const pc = getComputedStyle(document.body).getPropertyValue('--pc').trim() || '#DBE4FF';
  await A(nc, [{ backgroundColor: pc }, { backgroundColor: '#ffffff' }], { duration: 1200, easing: E.std });
  clean(nc);
}

// ---------- interactions on the phone ----------
const run = fn => async (...args) => { if (busy) return; busy = true; $$('.play').forEach(b => b.disabled = true); try { await fn(...args); } finally { busy = false; $$('.play').forEach(b => b.disabled = false); } };
const actions = {
  next: () => go($('#v-w3'), 'x'),
  setup: async () => { $('#setup-cat').parentElement.style.zIndex = 1; $('#setup-cat').style.transform = 'translateY(75%)'; await go($('#v-setup'), 'fade'); $('#setup-cat').style.transform = ''; await setupSeq(); },
  home: async () => { await go($('#v-home'), 'fade'); await feedIn(); },
  filter: () => sheetOpen($('#filter-sheet'), $('#filter-scrim')),
  'filter-close': () => sheetClose($('#filter-sheet'), $('#filter-scrim')),
  place: async (t) => {
    from = cur;
    if (t.classList.contains('tapcard')) { lastCard = t; await openPlace(t); }
    else { await sheetClose($('#pin-card')); $('#pin-bf').classList.remove('sel'); lastCard = null; await go($('#v-place'), 'x'); }
  },
  back: async () => {
    if (lastCard && from && from.id === 'v-home') await closePlace(lastCard);
    else await go(from || $('#v-home'), 'x', { dir: -1 });
  },
  heart: () => heart(),
  dial: () => dial(),
  share: () => share(),
  pin: () => pin(),
  save: () => save(),
};
document.addEventListener('click', e => {
  const t = e.target.closest('#phone [data-go], #phone [data-tab]');
  if (!t) return;
  if (t.dataset.tab) return run(() => go($('#v-' + t.dataset.tab), 'fade'))();
  const f = actions[t.dataset.go]; if (f) run(f)(t);
});

// ---------- spec "Play" buttons ----------
const plays = {
  launch: async () => { jump('v-splash'); await launch(); },
  setup: async () => { jump('v-setup'); await setupSeq(); },
  slides: async () => { jump('v-w1'); await wait(300); await go($('#v-w3'), 'x'); await wait(900); await go($('#v-w1'), 'x', { dir: -1 }); },
  tabs: async () => { jump('v-home'); await wait(300); for (const t of ['search', 'map', 'profile', 'home']) { await go($('#v-' + t), 'fade'); await wait(650); } },
  card: async () => { jump('v-home'); await wait(300); const c = $('#card-bao'); lastCard = c; from = $('#v-home'); await openPlace(c); await wait(1100); await closePlace(c); },
  sheet: async () => { jump('v-home'); await wait(300); await sheetOpen($('#filter-sheet'), $('#filter-scrim')); await wait(1100); await sheetClose($('#filter-sheet'), $('#filter-scrim')); },
  dial: async () => { jump('v-home'); await wait(300); await dial(); await wait(1300); await dial(); },
  pin: async () => { jump('v-map'); await wait(300); await pin(); await wait(1500); await sheetClose($('#pin-card')); $('#pin-bf').classList.remove('sel'); },
  heart: async () => { jump('v-place'); $('#heart').classList.remove('liked'); from = $('#v-home'); lastCard = null; await wait(300); await heart(); },
  share: async () => { jump('v-wa'); await wait(300); await share(); },
};
$$('.mo-item').forEach(it => it.querySelector('.play').addEventListener('click', () => run(plays[it.dataset.play])()));
$('#reset').addEventListener('click', () => run(async () => { jump('v-splash'); await launch(); })());

// rings on Phase 1 style screens only
const RINGS = [
  '<g class="lt"><circle cx="360" cy="0" r="120"/><circle cx="360" cy="0" r="170"/><circle cx="360" cy="0" r="220"/><circle cx="360" cy="0" r="270"/></g><g class="lt"><circle cx="0" cy="780" r="110"/><circle cx="0" cy="780" r="160"/><circle cx="0" cy="780" r="210"/></g><circle class="a3" cx="340" cy="150" r="5"/>',
  '<g class="lt"><circle cx="0" cy="60" r="90"/><circle cx="0" cy="60" r="140"/><circle cx="0" cy="60" r="190"/></g><g class="lt"><circle cx="360" cy="720" r="100"/><circle cx="360" cy="720" r="150"/><circle cx="360" cy="720" r="200"/><circle cx="360" cy="720" r="250"/></g><circle class="a3" cx="20" cy="330" r="5"/>',
  '<g class="lt"><circle cx="180" cy="-60" r="160"/><circle cx="180" cy="-60" r="210"/><circle cx="180" cy="-60" r="260"/></g><g class="lt"><circle cx="380" cy="560" r="70"/><circle cx="380" cy="560" r="120"/></g><circle class="a3" cx="342" cy="452" r="5"/>'
];
$$('.view.rings').forEach((el, i) => el.insertAdjacentHTML('afterbegin', '<svg class="art art-rings" viewBox="0 0 360 780" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + RINGS[i % 3] + '</svg>'));
try { lucide.createIcons({ attrs: { 'stroke-width': 2 } }); } catch (e) {}
navFor(cur);
run(launch)();
"""

contract = """<!--
THESIS: Motion for Thinnava that explains, never decorates: fast Material transitions for everyday navigation, one authored moment where a friend's message becomes a saved entry.
OWN-WORLD: Inherited from DESIGN.md (Cobalt, Mist ground, Rings on main tabs, white cards, Fredoka + Nunito, chef cat). Motion material: Material 3 emphasized curves; the chef cat climbing over card edges is the brand's motion signature.
STORY: Launch -> welcome -> profile -> Home; card expands into place; a copied message is read by the cat, fields fill, Save drops a new card into Home.
FIRST VIEWPORT: Phone prototype (left, sticky) auto-playing launch; motion spec with Play buttons and tokens (right).
FORM: Extension of the established world; motion thesis per animate.md; no concept roll.
-->"""

html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Thinnava Motion</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>{style}{CSS}</style>
</head>
<body data-palette="cobalt" data-ground="rings">
{contract}
<header class="gal-head"><div class="in">
  <h1 class="gal-title"><img src="assets/cat-peek.png" alt="">Thinnava <small>Motion &amp; transitions · clickable prototype</small></h1>
  <a href="phase1.html" style="margin-left:auto;font-weight:800;font-size:14px;color:#1b2333">Phase 1</a>
  <a href="phase2.html" style="font-weight:800;font-size:14px;color:#1b2333">Phase 2</a>
</div></header>
{defs}
{body}
<script src="https://cdn.jsdelivr.net/npm/lucide@0.469.0/dist/umd/lucide.min.js"></script>
<script>{JS}</script>
</body>
</html>
"""
io.open(os.path.join(design, 'motion.html'), 'w', encoding='utf-8').write(html)
print('wrote motion.html', len(html))
