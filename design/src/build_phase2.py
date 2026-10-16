"""Assemble design/phase2.html from phase1's shared styles + phase2 body.
Run: python design/src/build_phase2.py (from the project root)."""
import io, re, os

here = os.path.dirname(os.path.abspath(__file__))
design = os.path.dirname(here)
p1 = io.open(os.path.join(design, 'phase1.html'), encoding='utf-8').read()
body = io.open(os.path.join(here, 'phase2-body.html'), encoding='utf-8').read()

style = re.search(r'<style>(.*?)</style>', p1, re.S).group(1)
defs = re.search(r'(<svg width="0" height="0".*?</svg>)\s*\n\s*<main>', p1, re.S).group(1)

EXTRA = r"""
/* ---------- Phase 2 components ---------- */
.muted{color:var(--ink-3)} .sm{font-size:12.5px;font-weight:600}
.t-good{color:var(--good)} .t-ok{color:var(--ok)}
.hero-place{padding:0 18px}
.meta-line{font-size:13.5px;font-weight:700;color:var(--ink-2);margin-top:6px;display:flex;align-items:center;gap:2px}
.acts{display:flex;gap:8px;padding:16px 14px 14px}
.act{flex:0 0 78px;display:flex;flex-direction:column;align-items:center;gap:6px;font-size:12px;font-weight:800;color:var(--ink-2)}
.act .c{width:54px;height:54px;border-radius:18px;background:var(--surface);display:grid;place-items:center;color:var(--p);box-shadow:0 1px 2px rgba(20,30,50,.06),0 8px 18px -12px rgba(20,30,50,.35)}
.act .c svg{width:22px;height:22px}
.act .c.brand svg{fill:currentColor}
.act .c.swiggy svg{width:26px;height:26px}
.act .c.zomato svg{width:40px;height:40px}
.act .c .dw{font-family:var(--body);font-weight:800;font-size:12.5px;letter-spacing:-.02em;color:currentColor} /* placeholder: swap for the official District logo in the app */
.panel{background:var(--surface);border-radius:24px;margin:0 14px;padding:4px 0;box-shadow:0 1px 2px rgba(20,30,50,.05),0 6px 18px -12px rgba(20,30,50,.22)}
.panel h3{font-family:var(--display);font-weight:600;font-size:16px;margin:0;padding:12px 16px 6px;color:var(--ink)}
.hist{display:flex;gap:8px;padding:2px 16px 12px;flex-wrap:wrap}
.hist .chip b{margin-left:4px}
.person{display:flex;gap:12px;padding:12px 16px;border-top:1px solid var(--line)}
.panel h3 + .person{border-top:0}
.person .pc{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.pn{display:flex;align-items:center;gap:6px;font-size:14px;color:var(--ink-2)} .pn b{color:var(--ink)} .pn .rv{margin-left:auto}
.pl{display:flex;align-items:center;gap:6px;font-size:13.5px;color:var(--ink-2)} .pl svg{width:15px;height:15px;flex:none}
.pl.muted{color:var(--ink-3);font-size:12.5px;font-weight:700}
.efab{position:absolute;right:16px;bottom:28px;height:56px;border-radius:18px;background:var(--p);color:var(--on-p);display:flex;align-items:center;gap:10px;padding:0 20px 0 16px;font-weight:800;font-size:15.5px;box-shadow:0 10px 22px -10px var(--p-strong);z-index:10}
.snack{position:absolute;left:12px;right:12px;bottom:26px;background:var(--ink);color:#fff;border-radius:14px;padding:14px 16px;display:flex;align-items:center;font-size:14px;font-weight:700;z-index:22;box-shadow:0 10px 24px -10px rgba(0,0,0,.5)}
.sa{margin-left:auto;color:var(--pc);font-weight:800;font-size:14px;white-space:nowrap;padding-left:12px}
.grow{display:flex;align-items:center;gap:14px;padding:13px 16px;font-weight:700;font-size:15px;color:var(--ink);border-top:1px solid var(--line)}
.grow:first-child{border-top:0}
.grow .ic{width:38px;height:38px;border-radius:50%;background:var(--surface-2);display:grid;place-items:center;color:var(--p-strong);flex:none}
.grow .ic svg{width:18px;height:18px}
.grow .chev{width:18px;height:18px;color:var(--ink-3);flex:none}
.group{background:var(--surface);border-radius:22px;margin:0 16px 12px;overflow:hidden;box-shadow:0 1px 2px rgba(20,30,50,.05),0 6px 18px -12px rgba(20,30,50,.22)}
.badge{min-width:22px;height:22px;border-radius:11px;background:var(--bad);color:#fff;font-size:12px;font-weight:800;display:grid;place-items:center;padding:0 6px}
.closed{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;border-radius:999px;background:var(--ink);color:#fff;font-size:13px;font-weight:800}
.closed svg{width:15px;height:15px}
.placelink{display:flex;align-items:center;gap:12px;padding:12px 14px}
.placelink .nm,.placebar .nm,.cand .nm{font-weight:800;font-size:15.5px;color:var(--ink)}
.placelink .sub,.placebar .sub,.cand .sub{font-size:13px;color:var(--ink-3);font-weight:600;margin-top:2px}
.rv.big{height:32px;font-size:15px;padding:0 14px 0 10px} .rv.big svg{width:19px;height:19px}
.facts{display:grid;grid-template-columns:96px 1fr;gap:9px 10px;margin:14px 0 0;font-size:14.5px}
.facts dt{color:var(--ink-3);font-weight:700;font-size:13px;padding-top:1px} .facts dd{margin:0;color:var(--ink);font-weight:700}
.quote{background:#E5F5DA;border-radius:16px 16px 16px 4px;padding:12px 14px;font-size:14px;line-height:1.45;color:#1f2d1a}
.wa{max-width:78%;background:#fff;border-radius:4px 14px 14px 14px;padding:9px 12px;font-size:14px;line-height:1.4;color:#1d1d1d;box-shadow:0 1px 1px rgba(0,0,0,.08)}
.reading{width:100%;background:var(--surface-2);border-radius:20px;padding:22px 18px 18px;display:flex;flex-direction:column;gap:10px;align-items:flex-start}
.reading b{font-size:15.5px;color:var(--ink);margin-bottom:4px}
.sk{display:block;height:11px;border-radius:6px;background:linear-gradient(90deg,var(--line) 0%,var(--surface) 50%,var(--line) 100%);background-size:200% 100%;animation:sk 1.4s var(--ease) infinite}
@keyframes sk{to{background-position:-200% 0}}
.step{height:30px;padding:0 12px;border-radius:999px;background:var(--pc);color:var(--on-pc);font-size:13px;font-weight:800;display:grid;place-items:center;margin-right:8px}
.form{padding:2px 18px 0;display:flex;flex-direction:column;gap:14px;overflow:hidden}
.req{font-size:11.5px;font-weight:800;color:var(--bad);background:var(--bad-bg);border-radius:6px;padding:2px 6px;margin-left:6px}
.optl{font-size:12px;font-weight:600;color:var(--ink-3);margin-left:4px}
.sugg{display:flex;gap:6px;flex-wrap:wrap}
.sugg .chip{height:30px;font-size:13px}
.chg{margin-left:auto;color:var(--p);font-weight:800;font-size:13.5px}
.inp.warn{box-shadow:inset 0 0 0 2px #E2A417}
.flag{display:flex;align-items:center;gap:5px;font-size:12.5px;font-weight:800;color:var(--ok)} .flag svg{width:15px;height:15px}
.revsel{display:flex;gap:8px}
.revsel span{flex:1;height:50px;border-radius:16px;display:flex;align-items:center;justify-content:center;gap:6px;font-weight:800;font-size:14.5px;color:var(--ink-2);background:var(--surface);box-shadow:inset 0 0 0 1.5px var(--line)}
.revsel span svg{width:19px;height:19px}
.revsel span.on.good{background:var(--good-bg);color:var(--good);box-shadow:inset 0 0 0 2px var(--good)}
.chipin{display:flex;gap:8px;flex-wrap:wrap;align-items:center;min-height:50px;border-radius:16px;background:var(--surface);box-shadow:inset 0 0 0 1.5px var(--line);padding:8px 10px}
.ichip{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 8px 0 12px;border-radius:10px;background:var(--pc);color:var(--on-pc);font-weight:800;font-size:13.5px}
.ichip svg{width:15px;height:15px}
.addc{display:inline-flex;align-items:center;gap:4px;height:32px;padding:0 8px;color:var(--p);font-weight:800;font-size:13.5px} .addc svg{width:16px;height:16px}
.bar2{display:flex;gap:10px;padding:12px 18px 30px;background:var(--surface);border-top:1px solid var(--line);position:relative;z-index:3}
.cand{display:flex;align-items:center;gap:12px;padding:12px 14px;border-top:1px solid var(--line)} .cand:first-child{border-top:0}
.mthumb{width:64px;height:64px;border-radius:14px;overflow:hidden;position:relative;flex:none}
.mthumb svg{position:absolute;width:260px;height:400px;left:-90px;top:-150px}
.mdot{position:absolute;left:50%;top:50%;width:14px;height:14px;border-radius:50%;background:var(--p);box-shadow:0 0 0 3px #fff;transform:translate(-50%,-50%)}
.placebar{display:flex;align-items:center;gap:12px;background:var(--surface);border-radius:18px;padding:10px 12px;box-shadow:inset 0 0 0 1.5px var(--line)}
.two{display:grid;grid-template-columns:1fr 1.25fr;gap:10px}
.aud{display:flex;align-items:center;gap:12px;background:var(--surface-2);border-radius:16px;padding:12px 14px;font-size:13px;color:var(--ink-2);font-weight:700}
.aud b{display:block;color:var(--ink);font-size:15px} .aud svg{width:20px;height:20px;color:var(--p-strong)}
.clip{display:flex;align-items:center;gap:12px;margin:0 18px 12px;background:var(--ink);color:#fff;border-radius:16px;padding:11px 14px}
.clip b{display:block;font-size:14px} .clip span:not(.sa){font-size:12.5px;opacity:.8;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:190px}
.clip svg{width:20px;height:20px;flex:none}
.check{width:24px;height:24px;border-radius:8px;box-shadow:inset 0 0 0 2px var(--ink-3);display:grid;place-items:center;flex:none}
.check.on{background:var(--p);box-shadow:none;color:#fff} .check svg{width:16px;height:16px;stroke-width:3}
.dialog{position:absolute;left:24px;right:24px;top:50%;transform:translateY(-50%);background:var(--surface);border-radius:28px;padding:24px 24px 14px;z-index:26;box-shadow:0 24px 50px -20px rgba(0,0,0,.45)}
.dlg-ic{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:var(--pc);color:var(--p-strong);margin-bottom:14px}
.dlg-ic svg{width:22px;height:22px}
.dlg-acts{display:flex;justify-content:flex-end;gap:4px;margin-top:18px}
.tbtn{display:inline-flex;align-items:center;gap:6px;height:44px;padding:0 14px;border-radius:999px;font-weight:800;font-size:15px;color:var(--p)}
.tbtn.danger{color:var(--bad)} .tbtn.strong{background:var(--p);color:#fff;padding:0 20px}
.mtabs{display:flex;background:var(--surface);border-bottom:1px solid var(--line);margin-top:4px}
.mtabs span{flex:1;text-align:center;padding:14px 0 12px;font-weight:800;font-size:14.5px;color:var(--ink-2);position:relative}
.mtabs span.on{color:var(--p)}
.mtabs span.on::after{content:"";position:absolute;left:24%;right:24%;bottom:-1px;height:3px;border-radius:3px 3px 0 0;background:var(--p)}
.note{display:flex;gap:12px;padding:12px 18px;font-size:14.5px;color:var(--ink-2);line-height:1.4;align-items:flex-start}
.note b{color:var(--ink)}
.nacts{display:flex;gap:8px;margin-top:8px}
.merge{display:flex;align-items:center;gap:12px;margin:0 16px;background:var(--ok-bg);color:var(--ink);border-radius:16px;padding:12px 14px}
.merge b{display:block;font-size:14.5px} .merge span:not(.sa){font-size:13px;color:var(--ink-2);display:block} .merge svg{width:20px;height:20px;color:var(--ok);flex:none}
.merge .sa{color:var(--p)}
.offline{display:flex;align-items:center;gap:8px;background:var(--ink);color:#fff;font-size:13px;font-weight:700;padding:9px 18px;position:relative;z-index:4}
.offline svg{width:16px;height:16px}
"""

SB = '<div class="sb"><span>9:41</span><span class="ic"><i data-lucide="signal"></i><i data-lucide="wifi"></i><i data-lucide="battery-full"></i></span></div>'
GEST = '<div class="gest"></div>'
body = body.replace('{{SB}}', SB).replace('{{GEST}}', GEST)

contract = """<!--
THESIS: Extends the Phase 1 world (Thinnava friendly-kitchen food diary) to every remaining screen: people and what they said first, never ratings.
OWN-WORLD: Inherited from DESIGN.md: Cobalt role set, flat Mist ground (no Rings on these screens, owner's call), white cards/panels/list surfaces, Fredoka + Nunito, Material 3 structure, fixed Good/Okayish/Bad pills.
STORY: From a WhatsApp message to a saved entry in seconds; from a place to who's been and how to get there; mutual connections and lists keep sharing intentional.
FIRST VIEWPORT: Place page: name and meta, four hand-off buttons, your visits, people who've been, extended FAB "Add visit".
FORM: Extension of an established world (DESIGN.md); no concept roll.
-->"""

RINGS = """
  try { lucide.createIcons({ attrs: { 'stroke-width': 2 } }); } catch (e) {}
"""

html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Thinnava Phase 2 UI</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>{style}{EXTRA}</style>
</head>
<body data-palette="cobalt" data-ground="flat">
{contract}
<header class="gal-head"><div class="in">
  <h1 class="gal-title"><img src="assets/cat-peek.png" alt="">Thinnava <small>Phase 2 UI · all remaining screens · Cobalt</small></h1>
  <a href="phase1.html" style="margin-left:auto;font-weight:800;font-size:14px;color:#1b2333">← Phase 1 screens</a>
</div></header>
{defs}
{body}
<script src="https://cdn.jsdelivr.net/npm/lucide@0.469.0/dist/umd/lucide.min.js"></script>
<script>{RINGS}</script>
</body>
</html>
"""
io.open(os.path.join(design, 'phase2.html'), 'w', encoding='utf-8').write(html)
print('wrote phase2.html', len(html))
