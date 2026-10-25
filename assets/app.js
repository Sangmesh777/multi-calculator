const $ = id => document.getElementById(id);
const num = id => Number($(id).value) || 0;
const inr = n => '\u20B9' + Math.round(n).toLocaleString('en-IN');
const plain = n => (Math.abs(n) >= 1e15 || (n !== 0 && Math.abs(n) < 1e-9))
  ? n.toExponential(6) : (+n.toPrecision(12)).toLocaleString('en-IN', { maximumFractionDigits: 10 });



// ---------- tabs ----------
$('tabs').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  for (const x of $('tabs').children) x.classList.toggle('on', x === b);
  for (const s of document.querySelectorAll('#tools section')) s.classList.toggle('on', s.id === b.dataset.t);
});

// ---------- scientific calculator ----------
// Hand-written parser. Deliberately no eval/Function: the input is user text,
// and eval would let it run arbitrary code.
let useDegrees = true;
let lastResult = null;
let history = [];

const factorial = n => {
  if (n < 0 || n !== Math.floor(n) || n > 170) throw new Error('factorial needs a whole number 0-170');
  let r = 1;
  for (let k = 2; k <= n; k++) r *= k;
  return r;
};

function evaluate(src, deg) {
  const raw = String(src);
  // Whitespace is removed below, so "2 3" would silently become 23. Catch it first.
  if (/[\d.)]\s+[\d(]/.test(raw)) throw new Error('missing operator');
  const s = raw.replace(/\s+/g, '').replace(/\u00D7/g, '*').replace(/\u00F7/g, '/');
  if (!s) throw new Error('empty');
  const d2r = deg ? Math.PI / 180 : 1;
  const FUNCS = {
    sin: x => Math.sin(x * d2r), cos: x => Math.cos(x * d2r), tan: x => Math.tan(x * d2r),
    asin: x => Math.asin(x) / d2r, acos: x => Math.acos(x) / d2r, atan: x => Math.atan(x) / d2r,
    sqrt: Math.sqrt, ln: Math.log, log: Math.log10, abs: Math.abs, exp: Math.exp
  };
  let i = 0;
  const fail = m => { throw new Error(m); };

  function primary() {
    if (s[i] === '(') {
      i++;
      const v = expr();
      if (s[i] !== ')') fail('missing )');
      i++;
      return v;
    }
    const word = /^[a-zA-Z]+/.exec(s.slice(i));
    if (word) {
      const name = word[0].toLowerCase();
      i += word[0].length;
      if (name === 'pi') return Math.PI;
      if (name === 'e') return Math.E;
      const fn = FUNCS[name];
      if (!fn) fail('unknown ' + name);
      if (s[i] !== '(') fail('( expected after ' + name);
      i++;
      const v = expr();
      if (s[i] !== ')') fail('missing )');
      i++;
      return fn(v);
    }
    const m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(s.slice(i));
    if (!m) fail(i >= s.length ? 'expression ends early' : 'unexpected "' + s[i] + '"');
    i += m[0].length;
    return parseFloat(m[0]);
  }
  function postfix() {
    let v = primary();
    while (s[i] === '!') { i++; v = factorial(v); }
    while (s[i] === '%') { i++; v = v / 100; }
    return v;
  }
  function power() {
    const base = postfix();
    if (s[i] === '^') { i++; return Math.pow(base, unary()); }   // right-associative
    return base;
  }
  function unary() {
    if (s[i] === '-') { i++; return -unary(); }
    if (s[i] === '+') { i++; return unary(); }
    return power();
  }
  function term() {
    let v = unary();
    while (s[i] === '*' || s[i] === '/') {
      const op = s[i++], r = unary();
      v = op === '/' ? v / r : v * r;
    }
    return v;
  }
  function expr() {
    let v = term();
    while (s[i] === '+' || s[i] === '-') {
      const op = s[i++], r = term();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  }

  const out = expr();
  if (i < s.length) fail('unexpected "' + s[i] + '"');
  if (Number.isNaN(out)) fail('not a number');
  return out;
}

function renderHist() {
  const ul = $('hist');
  ul.innerHTML = '';
  if (!history.length) { ul.innerHTML = '<li style="cursor:default">Nothing yet.</li>'; return; }
  history.slice(-8).reverse().forEach(h => {
    const li = document.createElement('li');
    li.innerHTML = `${h.expr} = <b>${h.res}</b>`;
    li.onclick = () => { $('c_expr').value = h.expr; runCalc(); };
    ul.appendChild(li);
  });
}
function runCalc(push) {
  const src = $('c_expr').value, el = $('calc_out');
  if (!src.trim()) { el.innerHTML = '<span class="mut">Type an expression.</span>'; return; }
  try {
    const v = evaluate(src, useDegrees);
    if (!isFinite(v)) throw new Error('result is not a finite number');
    lastResult = v;
    el.innerHTML = `<div class="big">${plain(v)}</div>`;
    if (push) {
      history.push({ expr: src, res: plain(v) });
      if (history.length > 50) history.shift();
      try { localStorage.setItem('mc_hist', JSON.stringify(history)); } catch (e) {}
      renderHist();
    }
  } catch (err) {
    el.innerHTML = `<span class="err">${err.message}</span>`;
  }
}
$('keys').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const k = b.dataset.k, inp = $('c_expr');
  if (k === '=') { runCalc(true); return; }
  if (k === 'C') { inp.value = ''; $('calc_out').innerHTML = ''; return; }
  if (k === 'BACK') { inp.value = inp.value.slice(0, -1); runCalc(false); return; }
  inp.value += k;
  inp.focus();
  runCalc(false);
});
$('c_expr').addEventListener('input', () => runCalc(false));
$('c_expr').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); runCalc(true); }
});
$('degBtn').onclick = () => {
  useDegrees = !useDegrees;
  $('degBtn').textContent = useDegrees ? 'Degrees' : 'Radians';
  runCalc(false);
};
$('copyBtn').onclick = async () => {
  if (lastResult === null) return;
  try { await navigator.clipboard.writeText(String(lastResult)); $('copyBtn').textContent = 'Copied'; }
  catch (e) { $('copyBtn').textContent = 'Copy failed'; }
  setTimeout(() => { $('copyBtn').textContent = 'Copy result'; }, 1200);
};
$('clearHist').onclick = () => {
  history = []; try { localStorage.removeItem('mc_hist'); } catch (e) {} renderHist();
};

// ---------- health: BMI + BMR + TDEE ----------
function health() {
  const imperial = $('h_unit').value === 'i';
  const kg = imperial ? num('h_w') * 0.45359237 : num('h_w');
  const cm = imperial ? num('h_h') * 2.54 : num('h_h');
  const age = num('h_age'), sex = $('h_sex').value, act = Number($('h_act').value) || 1.2;
  const el = $('h_out');
  if (!(kg > 0 && cm > 0)) { el.innerHTML = '<span class="err">Enter a weight and height above zero.</span>'; return; }
  const bmi = kg / (cm / 100) ** 2;
  const cat = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
  let html = `<div class="big">${bmi.toFixed(1)} <span class="mut">BMI</span></div><div class="mut">${cat} (WHO)</div>`;
  if (age > 0) {
    const bmr = 10 * kg + 6.25 * cm - 5 * age + (sex === 'm' ? 5 : -161);
    html += `<div class="big" style="margin-top:10px">${Math.round(bmr)} <span class="mut">kcal/day BMR</span></div>`;
    html += `<div class="big" style="margin-top:6px">${Math.round(bmr * act)} <span class="mut">kcal/day TDEE</span></div>`;
  }
  el.innerHTML = html;
}
$('h_unit').addEventListener('change', () => {
  const imperial = $('h_unit').value === 'i';
  const w = num('h_w'), h = num('h_h');
  if (imperial) { $('h_w').value = +(w / 0.45359237).toFixed(1); $('h_h').value = +(h / 2.54).toFixed(1); }
  else { $('h_w').value = +(w * 0.45359237).toFixed(1); $('h_h').value = +(h * 2.54).toFixed(1); }
  $('h_wl').textContent = imperial ? 'Weight (lb)' : 'Weight (kg)';
  $('h_hl').textContent = imperial ? 'Height (in)' : 'Height (cm)';
  health();
});

// ---------- finance ----------
function emi() {
  const P = num('f_p'), r = num('f_r') / 1200, n = num('f_n');
  const el = $('f_out');
  if (!(P > 0 && n > 0)) { el.innerHTML = '<span class="err">Enter an amount and a tenure above zero.</span>'; return; }
  const e = r === 0 ? P / n : P * r * (1 + r) ** n / ((1 + r) ** n - 1);
  el.innerHTML = `<div class="big">${inr(e)} <span class="mut">/month</span></div>`
    + `<div class="mut" style="margin-top:6px">Total interest ${inr(e * n - P)} &middot; Total payment ${inr(e * n)}</div>`;
}
function gst() {
  const amt = num('g_amt'), rate = num('g_rate'), type = $('g_type').value, el = $('g_out');
  if (!(amt > 0)) { el.innerHTML = '<span class="err">Enter an amount above zero.</span>'; return; }
  const base = type === 'inc' ? amt / (1 + rate / 100) : amt;
  const tax = type === 'inc' ? amt - base : amt * rate / 100;
  el.innerHTML = `<div class="big">${inr(base + tax)} <span class="mut">total</span></div>`
    + `<div class="mut" style="margin-top:6px">Base ${inr(base)} &middot; GST @${rate}% ${inr(tax)}</div>`;
}
function sip() {
  const P = num('s_p'), r = num('s_r') / 1200, n = Math.round(num('s_y') * 12), el = $('s_out');
  if (!(P > 0 && n > 0)) { el.innerHTML = '<span class="err">Enter a monthly amount and a duration above zero.</span>'; return; }
  const fv = r === 0 ? P * n : P * (((1 + r) ** n - 1) / r) * (1 + r);
  const invested = P * n;
  el.innerHTML = `<div class="big">${inr(fv)} <span class="mut">maturity</span></div>`
    + `<div class="mut" style="margin-top:6px">Invested ${inr(invested)} &middot; Gain ${inr(fv - invested)}</div>`;
}

// ---------- units ----------
// Each unit is how many base units it equals. Temperature is affine, so it is handled apart.
const UNITS = {
  Length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, '\u00B5m': 1e-6, nm: 1e-9, inch: 0.0254, ft: 0.3048, yard: 0.9144, mile: 1609.344, 'nautical mile': 1852 },
  Mass: { kg: 1, g: 0.001, mg: 1e-6, '\u00B5g': 1e-9, tonne: 1000, lb: 0.45359237, oz: 0.028349523125, stone: 6.35029318 },
  Area: { 'm\u00B2': 1, 'km\u00B2': 1e6, 'cm\u00B2': 1e-4, hectare: 10000, acre: 4046.8564224, 'ft\u00B2': 0.09290304, 'in\u00B2': 0.00064516, 'sq mile': 2589988.110336 },
  Volume: { L: 1, mL: 0.001, 'm\u00B3': 1000, 'cm\u00B3': 0.001, 'US gallon': 3.785411784, 'UK gallon': 4.54609, 'US quart': 0.946352946, 'US pint': 0.473176473, 'US cup': 0.2365882365, 'US fl oz': 0.0295735295625, tbsp: 0.01478676478125, tsp: 0.00492892159375 },
  Speed: { 'm/s': 1, 'km/h': 1 / 3.6, mph: 0.44704, knot: 0.514444444444, 'ft/s': 0.3048 },
  Time: { ms: 0.001, s: 1, min: 60, hour: 3600, day: 86400, week: 604800 },
  Data: { byte: 1, bit: 0.125, KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776 },
  Temperature: null
};
function fillUnits() {
  const cat = $('u_cat').value;
  const units = cat === 'Temperature' ? ['C', 'F', 'K'] : Object.keys(UNITS[cat]);
  for (const id of ['u_from', 'u_to']) {
    const s = $(id), prev = s.value;
    s.innerHTML = '';
    for (const u of units) s.add(new Option(u, u));
    s.value = units.includes(prev) ? prev : units[0];
  }
  $('u_to').selectedIndex = Math.min(1, units.length - 1);
}
function convert() {
  const cat = $('u_cat').value, v = num('u_v'), from = $('u_from').value, to = $('u_to').value;
  const el = $('u_out');
  if (!$('u_v').value) { el.innerHTML = '<span class="err">Enter a number.</span>'; return; }
  let out;
  if (cat === 'Temperature') {
    const c = from === 'C' ? v : from === 'F' ? (v - 32) * 5 / 9 : v - 273.15;
    out = to === 'C' ? c : to === 'F' ? c * 9 / 5 + 32 : c + 273.15;
  } else {
    const f = UNITS[cat];
    out = v * f[from] / f[to];
  }
  el.innerHTML = `<div class="big">${+out.toPrecision(8)} <span class="mut">${to}</span></div>`;
}

// ---------- currency ----------
// Rates are per 1 USD. The live table is fetched from a public, no-key, CORS-open CDN.
const CURR = [
  ['USD','US Dollar'],['EUR','Euro'],['GBP','British Pound'],['INR','Indian Rupee'],
  ['JPY','Japanese Yen'],['CNY','Chinese Yuan'],['AUD','Australian Dollar'],['CAD','Canadian Dollar'],
  ['CHF','Swiss Franc'],['SGD','Singapore Dollar'],['HKD','Hong Kong Dollar'],['NZD','New Zealand Dollar'],
  ['AED','UAE Dirham'],['SAR','Saudi Riyal'],['QAR','Qatari Riyal'],['KWD','Kuwaiti Dinar'],
  ['OMR','Omani Rial'],['BHD','Bahraini Dinar'],['MYR','Malaysian Ringgit'],['THB','Thai Baht'],
  ['IDR','Indonesian Rupiah'],['PHP','Philippine Peso'],['VND','Vietnamese Dong'],['KRW','South Korean Won'],
  ['BDT','Bangladeshi Taka'],['PKR','Pakistani Rupee'],['LKR','Sri Lankan Rupee'],['NPR','Nepalese Rupee'],
  ['ZAR','South African Rand'],['NGN','Nigerian Naira'],['KES','Kenyan Shilling'],['EGP','Egyptian Pound'],
  ['TRY','Turkish Lira'],['RUB','Russian Ruble'],['BRL','Brazilian Real'],['MXN','Mexican Peso'],
  ['SEK','Swedish Krona'],['NOK','Norwegian Krone'],['DKK','Danish Krone'],['PLN','Polish Zloty'],
  ['CZK','Czech Koruna'],['ILS','Israeli Shekel']
];
// Offline fallback snapshot (2026-10-19), replaced at runtime when the fetch succeeds.
const SNAPSHOT = {USD:1,EUR:0.890515,GBP:0.750395,INR:94.8164,JPY:158.067,CNY:6.68315,AUD:1.43375,CAD:1.41218,CHF:0.824199,SGD:1.27942,HKD:7.84767,NZD:1.7681,AED:3.6725,SAR:3.75,QAR:3.64,KWD:0.31053,OMR:0.384733,BHD:0.376,MYR:4.08195,THB:33.5346,IDR:18035.6,PHP:63.071,VND:25899.7,KRW:1331.89,BDT:123.387,PKR:277.634,LKR:331.607,NPR:151.777,ZAR:16.456,NGN:1333.15,KES:129.994,EGP:53.4108,TRY:49.5441,RUB:84.2261,BRL:5.06603,MXN:18.4513,SEK:9.90946,NOK:9.42364,DKK:6.65671,PLN:3.89277,CZK:21.6703,ILS:3.09868};
let rates = SNAPSHOT, rateDate = '2026-10-19', ratesLive = false;

function fillCur() {
  for (const id of ['c_from', 'c_to']) {
    const s = $(id);
    s.innerHTML = '';
    for (const [code, name] of CURR) s.add(new Option(code + ' \u2014 ' + name, code));
  }
  $('c_from').value = 'INR';
  $('c_to').value = 'USD';
}
const curfmt = (n, code) => {
  try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: code }).format(n); }
  catch { return n.toFixed(2) + ' ' + code; }
};
// rates are per 1 USD, so 1 unit of F is rates[T]/rates[F] units of T.
const convertAmount = (amt, f, t) => amt * rates[t] / rates[f];
function convertCur() {
  const amt = num('c_a'), f = $('c_from').value, t = $('c_to').value, el = $('c_out');
  if (!$('c_a').value) { el.innerHTML = '<span class="err">Enter an amount.</span>'; return; }
  if (!(rates[f] > 0 && rates[t] > 0)) { el.innerHTML = '<span class="err">Rate unavailable for this pair.</span>'; return; }
  el.innerHTML = `<div class="big">${curfmt(convertAmount(amt, f, t), t)}</div>`
    + `<div class="mut">1 ${f} = ${+(rates[t] / rates[f]).toPrecision(6)} ${t} &middot; rates ${rateDate}${ratesLive ? ' (live)' : ' (offline snapshot)'}</div>`;
}
async function loadRates() {
  const urls = [
    'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
    'https://latest.currency-api.pages.dev/v1/currencies/usd.json'
  ];
  for (const u of urls) {
    try {
      const r = await fetch(u, { cache: 'no-store' });
      if (!r.ok) continue;
      const d = await r.json(), src = d.usd;
      if (!src) continue;
      const next = { ...SNAPSHOT };
      for (const [code] of CURR) if (src[code.toLowerCase()] > 0) next[code] = src[code.toLowerCase()];
      rates = next; rateDate = d.date || rateDate; ratesLive = true;
      convertCur();
      return;
    } catch (e) { /* try the next mirror */ }
  }
}

// ---------- cash counter ----------
const NOTES = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
function buildNotes() {
  const box = $('n_grid');
  for (const d of NOTES) {
    const w = document.createElement('div');
    w.innerHTML = `<label for="n_${d}">\u20B9${d}</label>`
      + `<input id="n_${d}" type="number" min="0" inputmode="numeric" placeholder="0">`;
    box.appendChild(w);
  }
}
function countNotes() {
  let total = 0, count = 0;
  for (const d of NOTES) { const c = num('n_' + d); total += d * c; count += c; }
  $('n_out').innerHTML = `<div class="big">${inr(total)}</div><div class="mut">${count} notes / coins</div>`;
}

// ---------- dates: UTC day numbers, so no timezone drift ----------
const dayms = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const iso = ms => new Date(ms).toISOString().slice(0, 10);
function daysBetween() {
  const a = $('d_a').value, b = $('d_b').value, el = $('d_out1');
  if (!a || !b) { el.textContent = 'Pick both dates.'; return; }
  const days = Math.round((dayms(b) - dayms(a)) / 864e5);
  const when = days === 0 ? 'Same day' : days < 0 ? 'Date B is earlier' : 'Date B is later';
  el.innerHTML = `<div class="big">${Math.abs(days)} <span class="mut">days</span></div>`
    + `<div class="mut">${when} &middot; ${Math.abs(days / 365.25).toFixed(1)} years</div>`;
}
function addDays() {
  const a = $('d_a2').value, n = num('d_n'), el = $('d_out2');
  if (!a) { el.textContent = 'Pick a start date.'; return; }
  el.innerHTML = `<div class="big">${iso(dayms(a) + n * 864e5)}</div>`;
}

// ---------- wiring ----------
function recalc() { health(); emi(); gst(); sip(); convert(); convertCur(); countNotes(); daysBetween(); addDays(); }
document.addEventListener('input', recalc);
$('u_cat').addEventListener('change', () => { fillUnits(); convert(); });
(function init() {
  const today = iso(Date.now());
  $('d_a').value = today; $('d_b').value = today; $('d_a2').value = today;
  for (const c of Object.keys(UNITS)) $('u_cat').add(new Option(c, c));
  $('u_cat').value = 'Length';
  try { history = JSON.parse(localStorage.getItem('mc_hist') || '[]') || []; } catch (e) { history = []; }
  fillUnits(); fillCur(); buildNotes(); renderHist(); recalc(); runCalc(false);
  loadRates();
})();

// Self-check: open the page with #test and read the console.
if (location.hash === '#test') (function selfTest() {
  const t = (name, got, want) => console.log((Math.abs(got - want) < 1e-9 ? 'ok   ' : 'FAIL ') + name + '  got ' + got + ' want ' + want);
  const eq = (name, src, want, deg = true) => { try { t(name, +evaluate(src, deg).toPrecision(12), +want.toPrecision(12)); } catch (e) { console.log('FAIL ' + name + '  threw ' + e.message); } };

  // parser
  eq('2+3*4', '2+3*4', 14);
  eq('(2+3)*4', '(2+3)*4', 20);
  eq('2^3^2 right-assoc', '2^3^2', 512);
  eq('-3^2 is -9', '-3^2', -9);
  eq('2^-3', '2^-3', 0.125);
  eq('5! ', '5!', 120);
  eq('50%', '50%', 0.5);
  eq('sin 30 deg', 'sin(30)', 0.5);
  eq('cos 60 deg', 'cos(60)', 0.5);
  eq('sin pi/2 rad', 'sin(pi/2)', 1, false);
  eq('sqrt 16', 'sqrt(16)', 4);
  eq('ln e', 'ln(e)', 1);
  eq('log 1000', 'log(1000)', 3);
  eq('nested', 'sqrt(9)+abs(-2)^2', 7);

  // health / finance / units / currency
  const kg = 70, cm = 175;
  t('BMI 70kg 175cm', +(kg / (cm / 100) ** 2).toFixed(2), 22.86);
  const bmr = 10 * kg + 6.25 * cm - 5 * 30 + 5;
  t('BMR male 70/175/30', bmr, 1648.75);
  t('TDEE moderate', Math.round(bmr * 1.55), 2556);
  const P = 100000, r = 0.12 / 12, n = 12;
  t('EMI 1L @12% 12m', +(P * r * (1 + r) ** n / ((1 + r) ** n - 1)).toFixed(2), 8884.88);
  t('GST 12% on 10000', 10000 * 0.12, 1200);
  t('GST inclusive 11200 @12%', +(11200 / 1.12).toFixed(2), 10000);
  const sp = 5000, sr = 0.01, sn = 120;
  t('SIP 5000@12% 10y', +Math.round(sp * (((1 + sr) ** sn - 1) / sr) * (1 + sr)), 1161695);
  t('mile to km', UNITS.Length.mile / 1000, 1.609344);
  t('acre to m2', UNITS.Area.acre, 4046.8564224);
  t('100C to F', 100 * 9 / 5 + 32, 212);
  t('100 USD to INR', convertAmount(100, 'USD', 'INR'), 9481.64);
  t('100 INR to USD', +convertAmount(100, 'INR', 'USD').toFixed(4), 1.0547);
})();
