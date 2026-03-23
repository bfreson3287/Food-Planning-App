/* ========================================
app.js — AU Family Dinner Planner
v2.1 — AI-only generation, no seed fallback
======================================== */

let state = {
settings: null, pantry: [], sessions: [], mealHistory: [],
recipeLibrary: [], recipeFeedback: {}, shoppingLists: [],
currentSession: null, currentMealPlan: null, currentShoppingList: null
};

// ============================================================
// UTILITY
// ============================================================

function generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }

function toast(message, type) {
type = type || ‘info’;
const c = document.getElementById(‘toastContainer’);
const t = document.createElement(‘div’);
t.className = ’toast ’ + type;
t.textContent = message;
c.appendChild(t);
setTimeout(() => { t.style.opacity = ‘0’; setTimeout(() => t.remove(), 300); }, 3500);
}

const _mem = {};
const _ls = (function() { try { const s = window[‘local’+‘Storage’]; s.setItem(’_t’,‘1’); s.removeItem(’*t’); return s; } catch(e) { return null; } })();
function save(key, data) { const k = ’afdp*’ + key; const v = JSON.stringify(data); _mem[k] = v; if (_ls) try { *ls.setItem(k, v); } catch(e) {} }
function load(key) { const k = ’afdp*’ + key; try { const d = _ls ? _ls.getItem(k) : _mem[k]; return d ? JSON.parse(d) : null; } catch(e) { return null; } }

function parseQuantityLine(line) {
line = line.trim();
if (!line) return null;
const patterns = [
/^(\d+(?:.\d+)?)\s*x\s+(.+)$/i,
/^(\d+(?:.\d+)?)\s*kg\s+(.+)$/i,
/^(\d+(?:.\d+)?)\s*g\s+(.+)$/i,
/^(\d+(?:.\d+)?)\s+(?:bunch|punnet|bag|head|knob|pack)\s+(.+)$/i,
/^(bunch|punnet|bag|head|knob|half\s+bag|quarter|pack)\s+(.+)$/i,
/^(\d+(?:/\d+)?)\s+(.+)$/i,
/^(.+)$/
];
for (let i = 0; i < patterns.length; i++) {
const m = line.match(patterns[i]);
if (m) {
if (i === 0) return { qty: m[1] + ‘x’, item: m[2].trim().toLowerCase() };
if (i === 1) return { qty: m[1] + ‘kg’, item: m[2].trim().toLowerCase() };
if (i === 2) return { qty: m[1] + ‘g’, item: m[2].trim().toLowerCase() };
if (i === 3) return { qty: m[1] + ’ ’ + line.match(/bunch|punnet|bag|head|knob|pack/i)[0], item: m[2].trim().toLowerCase() };
if (i === 4) return { qty: m[1], item: m[2].trim().toLowerCase() };
if (i === 5) return { qty: m[1], item: m[2].trim().toLowerCase() };
if (i === 6) return { qty: ‘’, item: m[1].trim().toLowerCase() };
}
}
return { qty: ‘’, item: line.toLowerCase() };
}

function containsNuts(text) {
const lower = text.toLowerCase();
return NUT_BLACKLIST.some(nut => new RegExp(’\b’ + nut.replace(/[.*+?^${}()|[]\]/g, ‘\$&’) + ‘\b’, ‘i’).test(lower));
}

function getDifficultyEmoji(d) { return d === ‘easy’ ? ‘🟢’ : d === ‘medium’ ? ‘🟡’ : ‘🔴’; }
function getDifficultyLabel(d) { return d === ‘easy’ ? ‘Easy’ : d === ‘medium’ ? ‘Medium’ : ‘Complex’; }

function getYieldFactor(proteinName) {
const lower = (proteinName || ‘’).toLowerCase();
for (const [key, val] of Object.entries(YIELD_FACTORS)) { if (lower.includes(key)) return val; }
return YIELD_FACTORS.default;
}

// ============================================================
// LOADING OVERLAY
// ============================================================

function showLoading(message) {
message = message || ‘Claude is generating your meal plan…’;
let overlay = document.getElementById(‘aiLoadingOverlay’);
if (!overlay) {
overlay = document.createElement(‘div’);
overlay.id = ‘aiLoadingOverlay’;
overlay.style.cssText = ‘position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;’;
overlay.innerHTML = ` <div style="background:var(--color-surface,#fff);border-radius:16px;padding:32px 40px;text-align:center;max-width:360px;box-shadow:0 8px 32px rgba(0,0,0,0.2);"> <div style="font-size:2.5rem;margin-bottom:12px;">🍳</div> <div id="aiLoadingMsg" style="font-size:1rem;font-weight:600;color:var(--color-text,#1a1a1a);margin-bottom:8px;"></div> <div style="font-size:0.85rem;color:var(--color-muted,#888);margin-bottom:20px;">This takes 15–25 seconds</div> <div style="display:flex;gap:6px;justify-content:center;"> <div style="width:10px;height:10px;border-radius:50%;background:var(--color-primary,#e07b39);animation:aiPulse 1.2s ease-in-out 0s infinite;"></div> <div style="width:10px;height:10px;border-radius:50%;background:var(--color-primary,#e07b39);animation:aiPulse 1.2s ease-in-out 0.2s infinite;"></div> <div style="width:10px;height:10px;border-radius:50%;background:var(--color-primary,#e07b39);animation:aiPulse 1.2s ease-in-out 0.4s infinite;"></div> </div> </div> <style>@keyframes aiPulse{0%,80%,100%{transform:scale(0.6);opacity:0.5}40%{transform:scale(1);opacity:1}}</style>`;
document.body.appendChild(overlay);
}
document.getElementById(‘aiLoadingMsg’).textContent = message;
overlay.style.display = ‘flex’;
}

function hideLoading() {
const overlay = document.getElementById(‘aiLoadingOverlay’);
if (overlay) overlay.style.display = ‘none’;
}

// ============================================================
// ERROR DISPLAY
// Shown in place of the meal plan when AI generation fails.
// Gives a clear explanation and a retry button — no silent fallback.
// ============================================================

function showGenerationError(context, err) {
hideLoading();
console.error(‘AI generation error:’, err);

// Determine a user-friendly reason
let reason = ‘An unexpected error occurred.’;
if (err && err.message) {
if (err.message.includes(‘Failed to fetch’) || err.message.includes(‘NetworkError’)) {
reason = ‘Could not reach the Claude API. Check your internet connection and try again.’;
} else if (err.message.includes(‘401’) || err.message.includes(‘403’)) {
reason = ‘API authentication failed. The app may need to be reopened in Claude.ai.’;
} else if (err.message.includes(‘429’)) {
reason = ‘Claude is busy right now (rate limit reached). Wait a minute and try again.’;
} else if (err.message.includes(‘500’) || err.message.includes(‘529’)) {
reason = ‘Claude's servers returned an error. This is usually temporary — try again in a moment.’;
} else if (err.message.includes(‘Too few recipes’)) {
reason = ‘Claude returned an incomplete plan. This is rare — try generating again.’;
} else if (err.message.includes(‘JSON’) || err.message.includes(‘parse’)) {
reason = ‘Claude's response was in an unexpected format. Try generating again.’;
} else {
reason = err.message;
}
}

const isRegenerate = context === ‘regenerate’;
const retryFn = isRegenerate ? ‘regenerateUnlocked()’ : ‘startFortnight()’;
const container = isRegenerate
? document.getElementById(‘mealPlanContent’)
: document.getElementById(‘mealPlanContent’);

const errorHtml = ` <div style="background:var(--color-surface,#fff);border:2px solid #e53935;border-radius:12px;padding:28px 32px;max-width:520px;margin:32px auto;text-align:center;"> <div style="font-size:2rem;margin-bottom:12px;">⚠️</div> <h3 style="margin:0 0 10px;color:#c62828;font-size:1.1rem;">Claude couldn't generate your meal plan</h3> <p style="margin:0 0 20px;color:var(--color-muted,#666);font-size:0.9rem;line-height:1.5;">${reason}</p> <button class="btn-primary" onclick="${retryFn}" style="margin-right:8px;">🔄 Try Again</button> ${isRegenerate ? '' : '<button class="btn-secondary" onclick="switchTab(\'newFortnight\')">← Back to Inputs</button>'} </div>`;

if (isRegenerate) {
// Insert error above the existing plan so locked meals remain visible
const existing = document.getElementById(‘mealPlanContent’);
const errorDiv = document.createElement(‘div’);
errorDiv.id = ‘generationErrorBox’;
errorDiv.innerHTML = errorHtml;
const old = document.getElementById(‘generationErrorBox’);
if (old) old.remove();
existing.insertAdjacentElement(‘beforebegin’, errorDiv);
} else {
// Replace the meal plan panel content entirely
switchTab(‘mealPlan’);
document.getElementById(‘mealPlanContent’).innerHTML = errorHtml;
}
}

// ============================================================
// SETTINGS
// ============================================================

function getDefaultSettings() {
return {
servings: 4, leftoverOn: true,
adultDinnerProtein: 160, toddlerDinnerProtein: 60, adultLunchProtein: 140,
maxTime: 60,
cuisinePrefs: CUISINES.reduce((a, c) => { a[c] = true; return a; }, {}),
nutFree: true, mexicanMax: 2
};
}

function loadSettings() { state.settings = load(‘settings’) || getDefaultSettings(); }

function saveSettings() {
const s = state.settings;
s.servings = Math.max(4, parseInt(document.getElementById(‘settingServings’).value) || 4);
s.leftoverOn = document.getElementById(‘settingLeftoverOn’).checked;
s.adultDinnerProtein = parseInt(document.getElementById(‘settingAdultDinner’).value) || 160;
s.toddlerDinnerProtein = parseInt(document.getElementById(‘settingToddlerDinner’).value) || 60;
s.adultLunchProtein = parseInt(document.getElementById(‘settingAdultLunch’).value) || 140;
s.maxTime = Math.min(60, parseInt(document.getElementById(‘settingMaxTime’).value) || 60);
document.querySelectorAll(’.cuisine-toggle-check’).forEach(cb => { s.cuisinePrefs[cb.dataset.cuisine] = cb.checked; });
save(‘settings’, s);
toast(‘Settings saved’, ‘success’);
document.getElementById(‘settingsModal’).style.display = ‘none’;
}

function openSettings() {
const s = state.settings;
document.getElementById(‘settingServings’).value = s.servings;
document.getElementById(‘settingLeftoverOn’).checked = s.leftoverOn;
document.getElementById(‘settingAdultDinner’).value = s.adultDinnerProtein;
document.getElementById(‘settingToddlerDinner’).value = s.toddlerDinnerProtein;
document.getElementById(‘settingAdultLunch’).value = s.adultLunchProtein;
document.getElementById(‘settingMaxTime’).value = s.maxTime;
const ct = document.getElementById(‘cuisineToggles’);
ct.innerHTML = ‘’;
CUISINES.forEach(c => {
const label = document.createElement(‘label’);
label.className = ‘toggle-label’;
label.innerHTML = `<input type="checkbox" class="cuisine-toggle-check" data-cuisine="${c}" ${s.cuisinePrefs[c] ? 'checked' : ''}> ${c}`;
ct.appendChild(label);
});
document.getElementById(‘settingsModal’).style.display = ‘flex’;
}

// ============================================================
// STORAGE TABLE
// ============================================================

function generateStorageTable(items) {
const tbody = document.getElementById(‘storageBody’);
tbody.innerHTML = ‘’;
const eatFirst = [];
items.forEach(parsed => {
const name = parsed.item;
const key = Object.keys(STORAGE_RULES).find(k => name.includes(k)) || ‘default’;
const rule = STORAGE_RULES[key] || STORAGE_RULES[‘default’];
const isPerishable = HIGHLY_PERISHABLE.some(p => name.includes(p));
if (isPerishable || (rule.perishDays && rule.perishDays <= 3)) eatFirst.push({ name, perishDays: rule.perishDays || 3 });
const tr = document.createElement(‘tr’);
tr.innerHTML = `<td><strong>${parsed.qty ? parsed.qty + ' ' : ''}${name}</strong></td><td>${rule.location}</td><td>${rule.howToStore}</td><td>${rule.life}</td><td>${rule.notes}</td>`;
tbody.appendChild(tr);
});
const efBox = document.getElementById(‘eatFirstBox’);
const efList = document.getElementById(‘eatFirstList’);
if (eatFirst.length > 0) {
eatFirst.sort((a, b) => a.perishDays - b.perishDays);
efList.innerHTML = eatFirst.slice(0, 4).map(e => `<span class="eat-first-item">${e.name} (${e.perishDays}d)</span>`).join(’’);
efBox.style.display = ‘block’;
} else { efBox.style.display = ‘none’; }
document.getElementById(‘storageEmpty’).style.display = items.length ? ‘none’ : ‘block’;
}

// ============================================================
// LEFTOVER SUFFICIENCY CALCULATOR
// ============================================================

function calcLeftoverSufficiency(recipe) {
const s = state.settings;
if (!s.leftoverOn) return { status: ‘Pass’, confidence: ‘High’, detail: ‘’ };
const target = (2 * s.adultDinnerProtein) + s.toddlerDinnerProtein + (2 * s.adultLunchProtein);
const protein = recipe.primaryProtein;
if (!protein) return { status: ‘Risk’, confidence: ‘Low’, estimated: 0, target, detail: ‘No primary protein specified’ };
let rawGrams = protein.rawGrams || 0;
const fb = state.recipeFeedback[recipe.id];
if (fb && fb.proteinMultiplier) rawGrams = Math.round(rawGrams * fb.proteinMultiplier);
const yf = protein.yieldFactor || getYieldFactor(protein.name);
const estimated = Math.round(rawGrams * yf);
let pieceWarning = ‘’;
if (protein.name && protein.name.toLowerCase().includes(‘drumstick’) && protein.pieces && protein.pieces < 6) {
pieceWarning = ‘Drumstick count < 6. Consider 8–10.’;
}
if (estimated >= target) return { status: ‘Pass’, confidence: ‘High’, estimated, target, detail: ‘’ };
if (estimated >= target * 0.8) return { status: ‘Pass’, confidence: ‘Medium’, estimated, target, detail: pieceWarning || ‘Close to target — portion generously’ };
const recommendedRaw = Math.round((target / yf) * 1.1);
return {
status: ‘Risk’, confidence: ‘Low’, estimated, target,
detail: pieceWarning || `Yield from ${rawGrams}g raw × ${yf} = ~${estimated}g cooked`,
fixes: [
{ label: `Increase ${protein.name} to ${recommendedRaw}g raw`, newRaw: recommendedRaw },
{ label: ‘Add chickpeas/lentils as high-satiety side’, addSide: true }
]
};
}

// ============================================================
// AI — SYSTEM PROMPT
// ============================================================

function buildSystemPrompt() {
return `You are the recipe generation AI for an Australian family dinner planner app. You create original, delicious, varied dinner recipes each fortnight.

FAMILY PROFILE:

- 2 adults + 1 toddler (2 years old). All eat the same meal with minor adjustments.
- Based in Australia. Use Australian ingredient names and measurements (grams, kg, ml, cups, tbsp).
- One adult has a severe NUT INTOLERANCE. Absolutely NO nuts or nut products of any kind.
- Cook is above-average. Comfortable with brining, deglazing, rendering, velveting, tempering spices. Explain less-common techniques but not basics.

ABSOLUTE NUT BLACKLIST — never use any of these:
almonds, cashews, walnuts, pistachios, peanuts, pecans, macadamias, hazelnuts, pine nuts, brazil nuts, peanut butter, almond butter, cashew butter, hazelnut spread, Nutella, peanut oil, groundnut oil, almond meal, almond flour, satay sauce, satay, praline, marzipan, nougat, frangipane, nut milks, almond milk, cashew milk, traditional pesto, dukkah

HOW THEY COOK:

- 4–5 dinners per week, serving 4 (dinner for 2 adults + toddler, with leftovers for 2 adult lunches next day)
- Max cook time: 60 minutes
- Difficulty mix per week: 2 complex meals (45–60 min), 2–3 easy/medium (20–40 min)
- Variety is key — rotate cuisines, proteins, cooking styles

CUISINE PREFERENCES: Asian, Mediterranean, Italian, Australian/BBQ, Thai, Japanese, Indian, Middle Eastern, Greek, Korean, French
RESTRICTION: Mexican cuisine maximum ONCE per fortnight

PROTEIN QUANTITIES for 4 servings with leftovers:

- Chicken thigh fillets: 900g–1kg
- Chicken breast: 800g (must brine or pound — see below)
- Chicken drumsticks: 10–12 pieces
- Beef/lamb/pork mince: 800g
- Beef steak: 700–800g
- Pork loin steaks: 600–700g (4 pieces)
- Salmon/fish fillets: 4 × 180–200g
- Prawns: 800g–1kg

MANDATORY SECTIONS IN EVERY RECIPE:

1. meatTip: Specific meat preparation technique with times, ratios, temps. E.g. brining (1 tbsp salt per 2 cups water, 20–30 min), salting steak uncovered in fridge overnight, velveting (1 tsp cornflour + 1 tsp soy + 1 tsp oil, 10 min), scoring drumsticks. NEVER generic. NEVER skip.
1. toddlerAdjust: Practical mid-cook adjustment. Separate portion BEFORE adding chilli/fish sauce/heavy salt. Easy without making a separate meal. Include texture and size tips for a 2-year-old.
1. tips: 1–3 genuine chef-level tricks that elevate the dish. Not generic advice.
1. leftoverHandling: Creative next-day lunch idea — new format (wrap, bowl, salad), quick transformation, or added sauce.

CHICKEN BREAST RULE: Always include brining (20–30 min, 1 tbsp salt per 2 cups cold water) OR pounding to even thickness OR butterflying. State this in meatTip. Or suggest thighs instead.

PERISHABILITY: Week 1 Mon/Tue meals should use most perishable ingredients first: baby spinach, fresh herbs (coriander, basil), mushrooms, corn, asparagus, bean sprouts. Later in the week: broccoli, zucchini, capsicum, cauliflower, carrots.

OUTPUT FORMAT:
Respond with ONLY a valid JSON array. No preamble, no explanation, no markdown fences — just raw JSON starting with [ and ending with ].

Each recipe must follow this exact schema:
{
“title”: “Recipe Name”,
“cuisine”: “Italian|Asian|Mexican|Mediterranean|Indian|Thai|Japanese|Middle Eastern|Australian/BBQ|Greek|Korean|French”,
“difficulty”: “easy|medium|complex”,
“cookTime”: 35,
“primaryProtein”: {
“name”: “chicken thigh fillets”,
“rawGrams”: 900,
“pieces”: null
},
“ingredients”: [“900g chicken thigh fillets, sliced”, “2 tbsp soy sauce”, “…”],
“steps”: [“Full instruction for step 1.”, “Full instruction for step 2.”],
“meatTip”: “Specific technique with times and ratios.”,
“toddlerAdjust”: “Practical mid-cook adjustment for a 2-year-old.”,
“tips”: “Chef-level tricks to elevate the dish.”,
“leftoverHandling”: “Creative next-day lunch idea.”
}

pieces: integer for drumsticks/steaks/fillets, null for mince or sliced meat.
Ingredients must include quantities (“900g chicken thigh fillets, sliced” not just “chicken”).`;
}

// ============================================================
// AI — USER PROMPT
// ============================================================

function buildUserPrompt(delivery, meat, leftovers, dislikes, slotsNeeded, lockedTitles) {
const s = state.settings;
const meatLines = meat.length ? meat.map(m => `  - ${m.qty ? m.qty + ' ' : ''}${m.item}`).join(’\n’) : ’  (none entered)’;
const produceLines = delivery.length ? delivery.map(d => `  - ${d.qty ? d.qty + ' ' : ''}${d.item}`).join(’\n’) : ’  (none entered)’;
const leftoverLines = leftovers.length ? leftovers.map(l => `  - ${l.qty ? l.qty + ' ' : ''}${l.item}`).join(’\n’) : ’  (none)’;
const pantryHave = state.pantry.filter(p => p.have).map(p => p.item).join(’, ‘) || ‘None recorded’;
const pantryMissing = state.pantry.filter(p => !p.have).map(p => p.item).join(’, ’) || ‘None’;

// Ratings & feedback
const feedbackLines = [];
const allKnownMeals = [
…(state.currentMealPlan ? […(state.currentMealPlan.week1 || []), …(state.currentMealPlan.week2 || [])] : []),
…SEED_RECIPES
];
const seenIds = new Set();
allKnownMeals.forEach(meal => {
if (!meal || seenIds.has(meal.id)) return;
seenIds.add(meal.id);
const fb = state.recipeFeedback[meal.id];
if (!fb) return;
const title = fb.title || meal.title || meal.id;
if (fb.blacklisted || fb.rating === 1) { feedbackLines.push(`  ❌ NEVER REPEAT: "${title}" — blacklisted or 1 star`); return; }
const lines = [];
if (fb.rating >= 4) lines.push(`rated ${fb.rating}/5 ⭐ — rotate back in every 6–8 weeks`);
else if (fb.rating === 2 || fb.rating === 3) lines.push(`rated ${fb.rating}/5 — not a favourite, skip for now`);
if (fb.moreMeat) lines.push(‘needs more protein next time’);
if (fb.lessSalt) lines.push(‘was too salty — reduce sodium’);
if (fb.lessSpicy) lines.push(‘was too spicy — reduce chilli’);
if (fb.moreSpicy) lines.push(‘wanted more heat’);
if (fb.excludeIngredients && fb.excludeIngredients.length) lines.push(`exclude: ${fb.excludeIngredients.join(', ')}`);
if (fb.notes) lines.push(`cook note: "${fb.notes}"`);
if (lines.length) feedbackLines.push(`  📝 "${title}": ${lines.join('; ')}`);
});

// Cuisine rotation
const recentCuisines = state.mealHistory.slice(-18).map(m => m.cuisine).filter(Boolean);
const cuisineCounts = recentCuisines.reduce((a, c) => { a[c] = (a[c] || 0) + 1; return a; }, {});
const overused = Object.entries(cuisineCounts).filter(([, v]) => v >= 3).map(([k]) => k);

const mexicanRecent = state.mealHistory.filter(m => m.mexicanFlag && (Date.now() - m.date) < 14 * 24 * 60 * 60 * 1000).length;
const mexicanStatus = mexicanRecent >= (s.mexicanMax || 2)
? ‘Mexican limit reached — do NOT include Mexican.’
: mexicanRecent === 1 ? ‘One Mexican used this fortnight — max one more allowed.’
: ‘Mexican allowed (max 1, only if it fits naturally).’;

const lockedText = lockedTitles && lockedTitles.length
? `\nAlready locked in — DO NOT duplicate these:\n${lockedTitles.map(t => `  - ${t}`).join('\n')}` : ‘’;

const isRegen = slotsNeeded < 9;

return `${isRegen ? `Generate ${slotsNeeded} new dinner recipe${slotsNeeded > 1 ? ‘s’ : ‘’} — a JSON array of exactly ${slotsNeeded} item${slotsNeeded > 1 ? ‘s’ : ‘’}. Aim for variety in difficulty and cuisine.`:`Generate a full fortnight meal plan — a JSON array of exactly 9 dinner recipes.

Week structure:

- Recipes 1–5: Week 1 (Mon–Fri). 2 complex, 3 easy/medium. Interleave: easy, complex, easy, complex, easy.
- Recipes 6–9: Week 2 (Mon–Thu). 2 complex, 2 easy/medium. Interleave: easy, complex, easy, complex.
- Week 1 Mon/Tue: use most perishable ingredients first (spinach, herbs, mushrooms).`}

PROTEINS AVAILABLE — ONLY use proteins from this list:
${meatLines}

PRODUCE AVAILABLE — use as much as possible across the plan:
${produceLines}

LEFTOVER PRODUCE (use these first — they need to go):
${leftoverLines}

INGREDIENTS TO DEPRIORITISE (dislikes):
${dislikes.trim() || ‘None’}

PANTRY ON HAND (do not add to shopping list):
${pantryHave}

PANTRY NOT STOCKED:
${pantryMissing}

MEXICAN STATUS: ${mexicanStatus}
${overused.length ? `CUISINE ROTATION: Used heavily recently — use sparingly: ${overused.join(', ')}.` : ‘’}

RATINGS & FEEDBACK — respect these when choosing and adjusting recipes:
${feedbackLines.length ? feedbackLines.join(’\n’) : ’  No ratings yet — fresh start.’}
${lockedText}

Output the JSON array of ${slotsNeeded} recipes. ONLY valid JSON starting with [ and ending with ]. No other text.`;
}

// ============================================================
// AI — API CALL
// ============================================================

async function callClaudeAPI(systemPrompt, userPrompt) {
const response = await fetch(‘https://api.anthropic.com/v1/messages’, {
method: ‘POST’,
headers: { ‘Content-Type’: ‘application/json’ },
body: JSON.stringify({
model: ‘claude-sonnet-4-20250514’,
max_tokens: 8000,
system: systemPrompt,
messages: [{ role: ‘user’, content: userPrompt }]
})
});
if (!response.ok) throw new Error(`API error ${response.status}: ${await response.text()}`);
const data = await response.json();
const rawText = data.content.filter(b => b.type === ‘text’).map(b => b.text).join(’’);
const clean = rawText.replace(/^`json\s*/i, '').replace(/`\s*$/i, ‘’).trim();
return JSON.parse(clean);
}

// ============================================================
// AI — PARSE & NORMALISE RECIPES
// ============================================================

function parseAIRecipes(rawArray) {
return rawArray.map((r, i) => {
const protein = r.primaryProtein || {};
return {
id: ‘ai_’ + generateId(),
title: r.title || `Recipe ${i + 1}`,
cuisine: r.cuisine || ‘Mediterranean’,
difficulty: r.difficulty || ‘medium’,
cookTime: parseInt(r.cookTime) || 40,
primaryProtein: {
name: protein.name || ‘’,
rawGrams: parseInt(protein.rawGrams) || 0,
pieces: protein.pieces || null,
yieldFactor: getYieldFactor(protein.name || ‘’)
},
ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
steps: Array.isArray(r.steps) ? r.steps : [],
stepIngredients: [], timers: [],
meatTip: r.meatTip || ‘’,
toddlerAdjust: r.toddlerAdjust || ‘’,
tips: r.tips || ‘’,
leftoverHandling: r.leftoverHandling || ‘’,
_aiGenerated: true
};
});
}

// ============================================================
// AI — GENERATE FULL PLAN
// ============================================================

async function generateMealPlanWithAI(delivery, meat, leftovers, dislikes) {
const rawRecipes = await callClaudeAPI(buildSystemPrompt(), buildUserPrompt(delivery, meat, leftovers, dislikes, 9, []));
const recipes = parseAIRecipes(rawRecipes);
if (recipes.length < 5) throw new Error(’Too few recipes returned — Claude returned ’ + recipes.length);
const d1 = [‘Mon’,‘Tue’,‘Wed’,‘Thu’,‘Fri’], d2 = [‘Mon’,‘Tue’,‘Wed’,‘Thu’];
return {
week1: recipes.slice(0, 5).map((m, i) => { m._day = d1[i]; m._week = 1; m._locked = false; m._sufficiency = calcLeftoverSufficiency(m); return m; }),
week2: recipes.slice(5, 9).map((m, i) => { m._day = d2[i]; m._week = 2; m._locked = false; m._sufficiency = calcLeftoverSufficiency(m); return m; })
};
}

// ============================================================
// RENDER MEAL PLAN
// ============================================================

function renderMealPlan() {
const plan = state.currentMealPlan;
const container = document.getElementById(‘mealPlanContent’);
if (!plan) { container.innerHTML = ‘<p class="empty-state">Generate a fortnight plan from the “New Fortnight” tab first.</p>’; return; }

// Clear any previous error box
const errorBox = document.getElementById(‘generationErrorBox’);
if (errorBox) errorBox.remove();

let html = ‘’;
function renderWeek(meals, weekNum) {
html += `<div class="week-section"><div class="week-title">Week ${weekNum} — ${meals.length} Dinners</div><div class="meal-cards">`;
meals.forEach((meal, idx) => {
if (!meal) return;
const suf = meal._sufficiency || {};
const sufClass = suf.status === ‘Pass’ ? ‘leftover-pass’ : ‘leftover-risk’;
const sufIcon = suf.status === ‘Pass’ ? ‘✅’ : ‘⚠️’;
let sufDetail = ‘’;
if (suf.status === ‘Risk’ && suf.fixes) {
sufDetail = `<div class="risk-detail">~${suf.estimated}g vs target ${suf.target}g — ${suf.detail}</div>`;
sufDetail += suf.fixes.map((f, fi) => `<button class="fix-btn" onclick="applyFix('${meal.id}',${idx},${weekNum},${fi})">${f.label}</button>`).join(’ ’);
} else if (suf.detail) { sufDetail = `<div class="risk-detail">${suf.detail}</div>`; }
html += ` <div class="meal-card ${meal._locked ? 'locked' : ''}" id="meal-${weekNum}-${idx}"> <div class="meal-card-day">${meal._day} · Week ${weekNum}</div> <div class="meal-card-header"> <div class="meal-card-title">${meal.title}</div> ${meal._aiGenerated ? '<span class="tag" style="font-size:0.7rem;">✨ AI</span>' : ''} </div> <div class="meal-meta"> <span class="tag tag-cuisine">${meal.cuisine}</span> <span class="tag">${getDifficultyEmoji(meal.difficulty)} ${getDifficultyLabel(meal.difficulty)}</span> <span class="tag tag-time">⏱ ${meal.cookTime} min</span> </div> <div class="produce-list"><strong>Protein:</strong> ${meal.primaryProtein ? meal.primaryProtein.name + ' (' + (meal.primaryProtein.rawGrams || '?') + 'g raw' + (meal.primaryProtein.pieces ? ', ' + meal.primaryProtein.pieces + ' pcs' : '') + ')' : 'Various'}</div> <div class="leftover-status ${sufClass}">${sufIcon} Leftovers: ${suf.status} (${suf.confidence || 'N/A'} confidence)${sufDetail}</div> <div class="meal-card-actions"> <button class="btn-secondary btn-small" onclick="toggleLock(${weekNum},${idx})">${meal._locked ? '🔒 Unlock' : '🔓 Lock'}</button> <button class="btn-secondary btn-small" onclick="swapMeal(${weekNum},${idx},-1)">↑ Move</button> <button class="btn-secondary btn-small" onclick="swapMeal(${weekNum},${idx},1)">↓ Move</button> <button class="btn-secondary btn-small" onclick="viewRecipe('${meal.id}')">📖 Recipe</button> </div> </div>`;
});
html += ‘</div></div>’;
}
renderWeek(plan.week1, 1);
renderWeek(plan.week2, 2);
html += `<div class="action-bar mt-4"><button class="btn-primary" onclick="regenerateUnlocked()">🔄 Regenerate Unlocked Meals</button></div>`;
container.innerHTML = html;
}

function toggleLock(week, idx) {
const meals = week === 1 ? state.currentMealPlan.week1 : state.currentMealPlan.week2;
meals[idx]._locked = !meals[idx]._locked;
renderMealPlan();
}

function swapMeal(week, idx, dir) {
const meals = week === 1 ? state.currentMealPlan.week1 : state.currentMealPlan.week2;
const newIdx = idx + dir;
if (newIdx < 0 || newIdx >= meals.length) return;
[meals[idx], meals[newIdx]] = [meals[newIdx], meals[idx]];
const tempDay = meals[idx]._day; meals[idx]._day = meals[newIdx]._day; meals[newIdx]._day = tempDay;
renderMealPlan();
}

// ============================================================
// REGENERATE UNLOCKED — AI ONLY, NO FALLBACK
// ============================================================

async function regenerateUnlocked() {
if (!state.currentMealPlan) { toast(‘No meal plan loaded — generate a plan first.’, ‘error’); return; }
const locked1 = state.currentMealPlan.week1.filter(m => m._locked);
const locked2 = state.currentMealPlan.week2.filter(m => m._locked);
const unlockedCount = state.currentMealPlan.week1.filter(m => !m._locked).length + state.currentMealPlan.week2.filter(m => !m._locked).length;
if (unlockedCount === 0) { toast(‘All meals are locked — unlock some first.’, ‘info’); return; }

const session = state.currentSession || {};
const lockedTitles = […locked1, …locked2].map(m => m.title);
showLoading(`Claude is regenerating ${unlockedCount} unlocked meal${unlockedCount > 1 ? 's' : ''}…`);

let newRecipes;
try {
const raw = await callClaudeAPI(
buildSystemPrompt(),
buildUserPrompt(session.delivery || [], session.meat || [], session.leftovers || [], session.dislikes || ‘’, 9, lockedTitles)
);
newRecipes = parseAIRecipes(raw);
} catch (err) {
// Show error clearly above the existing plan — locked meals remain untouched
showGenerationError(‘regenerate’, err);
return;
}
hideLoading();

const d1 = [‘Mon’,‘Tue’,‘Wed’,‘Thu’,‘Fri’], d2 = [‘Mon’,‘Tue’,‘Wed’,‘Thu’];
let ni = 0;
state.currentMealPlan.week1 = d1.map((day, i) => {
const lk = locked1.find(m => m._day === day); if (lk) return lk;
const fr = newRecipes[ni++]; if (fr) { fr._day = day; fr._week = 1; fr._locked = false; fr._sufficiency = calcLeftoverSufficiency(fr); return fr; }
return state.currentMealPlan.week1[i];
});
state.currentMealPlan.week2 = d2.map((day, i) => {
const lk = locked2.find(m => m._day === day); if (lk) return lk;
const fr = newRecipes[ni++]; if (fr) { fr._day = day; fr._week = 2; fr._locked = false; fr._sufficiency = calcLeftoverSufficiency(fr); return fr; }
return state.currentMealPlan.week2[i];
});

saveCurrentSession();
renderMealPlan(); renderRecipes(); renderRateNotes(); generateShoppingList();
toast(`✨ ${unlockedCount} meal${unlockedCount > 1 ? 's' : ''} regenerated by Claude!`, ‘success’);
}

function applyFix(recipeId, mealIdx, weekNum, fixIdx) {
const meals = weekNum === 1 ? state.currentMealPlan.week1 : state.currentMealPlan.week2;
const meal = meals[mealIdx];
if (!meal || !meal._sufficiency || !meal._sufficiency.fixes) return;
const fix = meal._sufficiency.fixes[fixIdx];
if (fix.newRaw && meal.primaryProtein) {
meal.primaryProtein.rawGrams = fix.newRaw;
if (meal.primaryProtein.pieces && meal.primaryProtein.name.toLowerCase().includes(‘drumstick’)) meal.primaryProtein.pieces = Math.ceil(fix.newRaw / 120);
}
if (fix.addSide) { meal.ingredients.push(‘400g can chickpeas (drained) or 200g dried lentils’); meal.steps.push(‘Add drained chickpeas or cooked lentils to boost protein for leftovers.’); }
meal._sufficiency = calcLeftoverSufficiency(meal);
renderMealPlan(); generateShoppingList(); toast(‘Fix applied’, ‘success’);
}

// ============================================================
// RECIPES + COOK MODE
// ============================================================

function renderRecipes() {
const plan = state.currentMealPlan;
const container = document.getElementById(‘recipesContent’);
if (!plan) { container.innerHTML = ‘<p class="empty-state">Generate a fortnight plan to see recipes.</p>’; return; }
const allMeals = […plan.week1, …plan.week2].filter(Boolean);
let html = ‘<div class="recipe-list">’;
allMeals.forEach(meal => {
let ingredients = […meal.ingredients];
let steps = […meal.steps];
const fb = state.recipeFeedback[meal.id];
if (fb) {
if (fb.proteinMultiplier && meal.primaryProtein) {
const newRaw = Math.round((meal.primaryProtein.rawGrams || 0) * fb.proteinMultiplier);
if (newRaw > 0) ingredients = ingredients.map(ing => ing.toLowerCase().includes(meal.primaryProtein.name.toLowerCase()) ? ing.replace(/\d+g/, newRaw + ‘g’) : ing);
}
if (fb.lessSalt) steps.push(‘Finishing step: Season to taste at the very end — add salt gradually and taste between additions.’);
if (fb.excludeIngredients && fb.excludeIngredients.length) fb.excludeIngredients.forEach(excl => { ingredients = ingredients.filter(ing => !ing.toLowerCase().includes(excl.toLowerCase())); });
}
html += `<div class="recipe-card" id="recipe-${meal.id}"> <h3>${meal.title}${meal._aiGenerated ? ' <span style="font-size:0.75rem;font-weight:500;color:var(--color-primary,#e07b39);">✨ AI Generated</span>' : ''}</h3> <div class="meal-meta"> <span class="tag tag-cuisine">${meal.cuisine}</span> <span class="tag">${getDifficultyEmoji(meal.difficulty)} ${getDifficultyLabel(meal.difficulty)}</span> <span class="tag tag-time">⏱ ${meal.cookTime} min</span> </div> <div class="recipe-section"><h4>Ingredients</h4><ul class="ingredients-list">${ingredients.map(i =>`<li>${i}</li>`).join('')}</ul></div> <div class="recipe-section"><h4>Method</h4><ol class="steps-list">${steps.map(s => `<li>${s}</li>`).join('')}</ol></div> ${meal.meatTip ? `<div class="callout-box meat-tip"><h4>🥩 Meat Prep Tip</h4>${meal.meatTip}</div>`: ''} ${meal.toddlerAdjust ?`<div class="callout-box toddler"><h4>👶 Toddler Adjustment</h4>${meal.toddlerAdjust}</div>`: ''} ${meal.tips ?`<div class="callout-box tip"><h4>💡 Chef Tips</h4>${meal.tips}</div>`: ''} ${meal.leftoverHandling ?`<div class="callout-box"><h4>📦 Leftover Handling</h4>${meal.leftoverHandling}</div>` : ''} <div class="meal-card-actions mt-4"><button class="btn-primary btn-small" onclick="openCookMode('${meal.id}')">🍳 Cook Mode</button></div> </div>`;
});
html += ‘</div>’;
container.innerHTML = html;
}

function viewRecipe(recipeId) {
switchTab(‘recipes’);
setTimeout(() => { const el = document.getElementById(‘recipe-’ + recipeId); if (el) el.scrollIntoView({ behavior: ‘smooth’, block: ‘start’ }); }, 100);
}

function openCookMode(recipeId) {
const allMeals = […(state.currentMealPlan?.week1 || []), …(state.currentMealPlan?.week2 || [])];
const meal = allMeals.find(m => m && m.id === recipeId);
if (!meal) return;
document.getElementById(‘cookModeTitle’).textContent = ‘🍳 ’ + meal.title;
const body = document.getElementById(‘cookModeBody’);
let html = ‘’;
meal.steps.forEach((step, i) => {
const stepIngs = (meal.stepIngredients && meal.stepIngredients[i]) || [];
const timer = (meal.timers && meal.timers[i]) || null;
html += `<div class="cook-step" id="cook-step-${i}"> <div class="cook-step-header"> <input type="checkbox" class="cook-step-check" data-step="${i}" onchange="toggleCookStep(${i})"> <div class="cook-step-num">${i + 1}</div> <div class="cook-step-text">${step}</div> </div> ${stepIngs.length ? `<div class="cook-step-ingredients">Uses: ${stepIngs.join(’, ’)}</div>`: ''} ${timer ?`<div class="cook-timer-bar"><button class="timer-btn" onclick="startCookTimer(this,'${timer}')">⏱ Start Timer (${timer})</button><span class="timer-display" id="timer-${i}">–:–</span></div>` : ''} </div>`;
});
body.innerHTML = html;
document.getElementById(‘cookModeModal’).style.display = ‘flex’;
}

function toggleCookStep(idx) {
const step = document.getElementById(‘cook-step-’ + idx);
const check = step.querySelector(’.cook-step-check’);
if (check.checked) { step.style.opacity = ‘0.5’; step.style.textDecoration = ‘line-through’; const next = document.getElementById(‘cook-step-’ + (idx + 1)); if (next) next.scrollIntoView({ behavior: ‘smooth’, block: ‘center’ }); }
else { step.style.opacity = ‘1’; step.style.textDecoration = ‘none’; }
}

function startCookTimer(btn, timeStr) {
let seconds = 0;
const m = timeStr.match(/(\d+)/);
if (m) seconds = timeStr.includes(‘sec’) ? parseInt(m[1]) : parseInt(m[1]) * 60;
if (seconds === 0) seconds = 60;
const display = btn.parentElement.querySelector(’.timer-display’);
btn.disabled = true; btn.textContent = ‘⏱ Running…’;
const interval = setInterval(() => {
seconds–;
if (seconds <= 0) {
clearInterval(interval); display.textContent = ‘✅ DONE!’; display.style.color = ‘var(–color-success)’; btn.textContent = ‘✅ Done’;
try { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const osc = ctx.createOscillator(); osc.type = ‘sine’; osc.frequency.value = 800; osc.connect(ctx.destination); osc.start(); setTimeout(() => osc.stop(), 300); } catch(e) {}
return;
}
const min = Math.floor(seconds / 60); const sec = seconds % 60;
display.textContent = `${min}:${sec.toString().padStart(2, '0')}`;
}, 1000);
}

// ============================================================
// RATINGS & NOTES
// ============================================================

function renderRateNotes() {
const plan = state.currentMealPlan;
const container = document.getElementById(‘rateNotesContent’);
if (!plan) { container.innerHTML = ‘<p class="empty-state">Cook a meal, then rate it here.</p>’; return; }
const allMeals = […plan.week1, …plan.week2].filter(Boolean);
let html = ‘<p class="subtitle" style="margin-bottom:16px;">Your ratings are sent to Claude every time you generate a new plan — blacklisted meals are never repeated, high-rated ones rotate back in every 6–8 weeks, and adjustments like “more meat” carry forward automatically.</p>’;
allMeals.forEach(meal => {
const fb = state.recipeFeedback[meal.id] || {};
const rating = fb.rating || 0;
const excludeIngredients = fb.excludeIngredients || [];
html += `<div class="rate-card" id="rate-${meal.id}"> <h3>${meal.title}${fb.blacklisted ? ' <span class="blacklist-badge">BLACKLISTED</span>' : ''}</h3> <div class="star-rating"> ${[1,2,3,4,5].map(s =>`<span class=“star-btn ${s <= rating ? ‘active’ : ‘’}” onclick=“setRating(’${meal.id}’,${s},’${meal.title.replace(/’/g, “\’”)}’)”>★</span>`).join('')} <span class="text-xs text-muted" style="margin-left:8px">${rating ? rating + '/5' : 'Not rated'}</span> </div> <div class="toggle-group"> <span class="toggle-chip ${fb.moreMeat ? 'active' : ''}" onclick="toggleFeedback('${meal.id}','moreMeat')">🥩 More meat next time</span> <span class="toggle-chip ${fb.lessSalt ? 'active' : ''}" onclick="toggleFeedback('${meal.id}','lessSalt')">🧂 Less salty</span> <span class="toggle-chip ${fb.lessSpicy ? 'active' : ''}" onclick="toggleFeedback('${meal.id}','lessSpicy')">🌶️ Less spicy</span> <span class="toggle-chip ${fb.moreSpicy ? 'active' : ''}" onclick="toggleFeedback('${meal.id}','moreSpicy')">🔥 More spicy</span> </div> <label class="text-sm">Exclude ingredient: <select onchange="excludeIngredient('${meal.id}', this.value)"> <option value="">— Select —</option> ${meal.ingredients.map(ing => { const short = ing.replace(/^\d+[gx]?\s*/i, '').replace(/,.*/, '').trim(); const excl = excludeIngredients.includes(short); return `<option value=”${short}” ${excl ? ‘selected’ : ‘’}>${short}${excl ? ’ ✗’ : ‘’}</option>`; }).join('')} </select> </label> ${excludeIngredients.length ? `<div class="text-xs mt-2">Excluded: ${excludeIngredients.map(e => `<span class="tag">${e} <span style="cursor:pointer" onclick="removeExclusion('${meal.id}','${e}')">✕</span></span>`).join(’ ’)}</div>`: ''} <label class="text-sm mt-2">Notes<textarea rows="2" id="notes-${meal.id}" oninput="saveNotes('${meal.id}', this.value)">${fb.notes || ''}</textarea></label> ${fb.blacklisted ?`<button class="btn-secondary btn-small mt-2" onclick="unBlacklist('${meal.id}')">Remove from blacklist</button>` : ''} </div>`;
});
container.innerHTML = html;
}

function setRating(recipeId, rating, recipeTitle) {
if (!state.recipeFeedback[recipeId]) state.recipeFeedback[recipeId] = {};
const fb = state.recipeFeedback[recipeId];
fb.rating = rating; fb.title = recipeTitle || fb.title || recipeId;
if (rating === 1) { fb.blacklisted = true; toast(‘Blacklisted — Claude won't suggest this again.’, ‘error’); }
else { fb.blacklisted = false; if (rating >= 4) toast(‘Great rating! Claude will rotate this back in.’, ‘success’); }
save(‘recipeFeedback’, state.recipeFeedback); renderRateNotes();
}

function toggleFeedback(recipeId, key) {
if (!state.recipeFeedback[recipeId]) state.recipeFeedback[recipeId] = {};
const fb = state.recipeFeedback[recipeId];
fb[key] = !fb[key];
if (key === ‘moreMeat’) {
if (!fb.proteinMultiplier) fb.proteinMultiplier = 1;
if (fb[key]) {
fb.moreMeatCount = (fb.moreMeatCount || 0) + 1;
fb.proteinMultiplier = fb.moreMeatCount === 1 ? Math.min(1.6, fb.proteinMultiplier + 0.25) : Math.min(1.6, fb.proteinMultiplier + 0.10);
toast(`Protein increased to ${Math.round(fb.proteinMultiplier * 100)}%`, ‘info’);
}
}
save(‘recipeFeedback’, state.recipeFeedback); renderRateNotes();
}

function excludeIngredient(recipeId, ingredient) {
if (!ingredient) return;
if (!state.recipeFeedback[recipeId]) state.recipeFeedback[recipeId] = {};
const fb = state.recipeFeedback[recipeId];
if (!fb.excludeIngredients) fb.excludeIngredients = [];
if (!fb.excludeIngredients.includes(ingredient)) fb.excludeIngredients.push(ingredient);
save(‘recipeFeedback’, state.recipeFeedback); renderRateNotes(); renderRecipes();
}

function removeExclusion(recipeId, ingredient) {
const fb = state.recipeFeedback[recipeId];
if (fb && fb.excludeIngredients) { fb.excludeIngredients = fb.excludeIngredients.filter(e => e !== ingredient); save(‘recipeFeedback’, state.recipeFeedback); renderRateNotes(); renderRecipes(); }
}

function saveNotes(recipeId, notes) {
if (!state.recipeFeedback[recipeId]) state.recipeFeedback[recipeId] = {};
state.recipeFeedback[recipeId].notes = notes;
if ([‘not enough meat’,‘too little chicken’,‘needed more protein’,‘more meat’,‘not enough protein’].some(p => notes.toLowerCase().includes(p))) {
const fb = state.recipeFeedback[recipeId];
if (!fb.proteinMultiplier) fb.proteinMultiplier = 1;
fb.moreMeatCount = (fb.moreMeatCount || 0) + 1;
fb.proteinMultiplier = fb.moreMeatCount <= 1 ? Math.min(1.6, fb.proteinMultiplier + 0.25) : Math.min(1.6, fb.proteinMultiplier + 0.10);
}
save(‘recipeFeedback’, state.recipeFeedback);
}

function unBlacklist(recipeId) {
if (state.recipeFeedback[recipeId]) { state.recipeFeedback[recipeId].blacklisted = false; save(‘recipeFeedback’, state.recipeFeedback); renderRateNotes(); toast(‘Removed from blacklist’, ‘success’); }
}

// ============================================================
// PANTRY MANAGER
// ============================================================

function loadPantry() { state.pantry = load(‘pantry’) || […DEFAULT_PANTRY]; }

function renderPantry() {
const tbody = document.getElementById(‘pantryBody’);
tbody.innerHTML = ‘’;
state.pantry.forEach((item, idx) => {
const tr = document.createElement(‘tr’);
tr.innerHTML = `<td>${item.item}</td><td><span class="text-xs">${item.category}</span></td><td><span class="${item.have ? 'pantry-have' : 'pantry-missing'}">${item.have ? '✓' : '✗'}</span></td><td class="text-xs">${item.qty}</td><td>${item.low ? '<span class="pantry-low">LOW</span>' : '—'}</td><td class="text-xs">${item.notes}</td><td><button class="btn-secondary btn-small" onclick="togglePantryHave(${idx})">${item.have ? 'Mark Out' : 'Mark Have'}</button> <button class="btn-danger btn-small" onclick="removePantryItem(${idx})">✕</button></td>`;
tbody.appendChild(tr);
});
renderPantryAlerts();
}

function togglePantryHave(idx) { state.pantry[idx].have = !state.pantry[idx].have; save(‘pantry’, state.pantry); renderPantry(); }
function removePantryItem(idx) { state.pantry.splice(idx, 1); save(‘pantry’, state.pantry); renderPantry(); }

function addPantryItem() {
const name = document.getElementById(‘pantryItemName’).value.trim();
if (!name) return;
state.pantry.push({ item: name, category: document.getElementById(‘pantryItemCat’).value, have: document.getElementById(‘pantryItemHave’).checked, qty: document.getElementById(‘pantryItemQty’).value.trim(), low: false, notes: document.getElementById(‘pantryItemNotes’).value.trim() });
save(‘pantry’, state.pantry);
document.getElementById(‘pantryModal’).style.display = ‘none’;
document.getElementById(‘pantryItemName’).value = ‘’;
document.getElementById(‘pantryItemQty’).value = ‘’;
document.getElementById(‘pantryItemNotes’).value = ‘’;
renderPantry(); toast(‘Pantry item added’, ‘success’);
}

function renderPantryAlerts() {
const alerts = document.getElementById(‘pantryAlerts’);
const newBox = document.getElementById(‘newStaplesBox’);
const restockBox = document.getElementById(‘restockBox’);
const newStaples = state.pantry.filter(p => p._new);
const restock = state.pantry.filter(p => p.low || !p.have);
if (!newStaples.length && !restock.length) { alerts.style.display = ‘none’; return; }
alerts.style.display = ‘block’;
if (newStaples.length) { newBox.innerHTML = `<strong>New staples this fortnight:</strong> ${newStaples.map(p => p.item).join(', ')}`; newBox.style.display = ‘block’; } else newBox.style.display = ‘none’;
if (restock.length) { restockBox.innerHTML = `<strong>Restock soon:</strong> ${restock.map(p => p.item).join(', ')}`; restockBox.style.display = ‘block’; } else restockBox.style.display = ‘none’;
}

// ============================================================
// SHOPPING LIST
// ============================================================

function generateShoppingList() {
if (!state.currentMealPlan) return;
const allMeals = […state.currentMealPlan.week1, …state.currentMealPlan.week2].filter(Boolean);

function parseIngLine(raw) {
const line = raw.trim();
const m = line.match(/^(\d+(?:[./]\d+)?)\s*(g|kg|ml|x|tbsp|tsp|cups?|bunch|punnet|bag|head|can|cloves?|large|small)?\s+(.+)$/i);
if (m) return { qty: m[1], unit: (m[2] || ‘’).toLowerCase(), name: m[3].replace(/,.*/, ‘’).replace(/(.*)/, ‘’).trim().toLowerCase() };
return { qty: ‘’, unit: ‘’, name: line.replace(/,.*/, ‘’).replace(/(.*)/, ‘’).trim().toLowerCase() };
}

function normaliseKey(name) { return name.replace(/s$/, ‘’).replace(/\s+/g, ‘*’).replace(/[^a-z0-9*]/g, ‘’); }

const session = state.currentSession || {};
const onHandRaw = […(session.delivery || []), …(session.meat || []), …(session.leftovers || [])].map(i => normaliseKey(i.item.toLowerCase()));

const ingredientMap = {};
allMeals.forEach(meal => {
meal.ingredients.forEach(ing => {
const parsed = parseIngLine(ing);
const key = normaliseKey(parsed.name);
if (!ingredientMap[key]) ingredientMap[key] = { name: parsed.name, qty: parsed.qty, unit: parsed.unit, mentions: 1 };
else ingredientMap[key].mentions++;
});
});

const list = [];
for (const [key, val] of Object.entries(ingredientMap)) {
const pantryMatch = state.pantry.find(p => { const pk = normaliseKey(p.item.toLowerCase()); return key.includes(pk) || pk.includes(key.split(’*’)[0]); });
if (pantryMatch && pantryMatch.have) continue;
const inOnHand = onHandRaw.some(ohk => { const ohb = ohk.split(’*’)[0]; const ib = key.split(’_’)[0]; return (ohb.length > 3 && (key.includes(ohb) || ohk.includes(ib))) || ohk === key; });
if (inOnHand) continue;
let note = ‘’;
if ([‘soy sauce’,‘sesame oil’,‘mirin’,‘fish sauce’,‘oyster sauce’,‘gochujang’].some(a => val.name.includes(a))) note = ‘Asian aisle at Woolies’;
else if ([‘cream’,‘yoghurt’,‘sour cream’,‘butter’,‘parmesan’,‘egg’].some(a => val.name.includes(a))) note = ‘Dairy section’;
else if (val.name.includes(’can ’) || val.name.includes(‘canned’)) note = ‘Canned goods aisle’;
let qtyStr = val.qty && val.unit ? val.qty + val.unit : val.qty || ‘’;
if (val.mentions > 1) qtyStr += ` (×${val.mentions} recipes)`;
list.push({ item: val.name.charAt(0).toUpperCase() + val.name.slice(1), qty: qtyStr, notes: note });
}

state.currentShoppingList = list;
save(‘shoppingLists’, list);
renderShoppingPreview(); updateWooliesData(); updateExportButtons();
}

function renderShoppingPreview() {
const preview = document.getElementById(‘shoppingListPreview’);
const list = state.currentShoppingList;
if (!list || !list.length) { preview.innerHTML = ‘<p class="text-sm text-muted">No shopping list yet.</p>’; return; }
let html = ‘<table class="data-table"><thead><tr><th>Item</th><th>Qty</th><th>Notes</th></tr></thead><tbody>’;
list.forEach(item => { html += `<tr><td>${item.item}</td><td>${item.qty}</td><td>${item.notes}</td></tr>`; });
html += ‘</tbody></table>’;
preview.innerHTML = html;
}

function updateExportButtons() {
document.getElementById(‘exportShoppingBtn’).disabled = !state.currentShoppingList || !state.currentShoppingList.length;
document.getElementById(‘exportRecipesBtn’).disabled = !state.currentMealPlan;
}

// ============================================================
// WOOLIES CART ASSIST
// ============================================================

function updateWooliesData() {
const list = state.currentShoppingList;
if (!list || !list.length) return;
const plain = list.map(i => `${i.qty ? i.qty + ' ' : ''}${i.item}${i.notes ? ' (' + i.notes + ')' : ''}`).join(’\n’);
document.getElementById(‘wooliesPlainText’).textContent = plain;
document.getElementById(‘wooliesJSON’).textContent = JSON.stringify(list.map(i => ({ name: i.item, quantity: i.qty || ‘1’, notes: i.notes, preferred_brand: ‘’ })), null, 2);
document.getElementById(‘wooliesPrompt’).textContent = `Task: Add items to my Woolworths online cart, but DO NOT check out.\nInputs:\n${plain}\n\nRules:\n1) Open woolworths.com.au and prompt me to log in if needed.\n2) For each item: search, choose sensible default unless Notes specify, ask me to pick if multiple close matches, add quantity.\n3) If not found: add to a 'Could not add' list with closest matches and ask what to do.\n4) After all items: open cart and summarise added items, substitutions, missing items.\n5) Stop and wait for confirmation before any checkout step.`;
}

// ============================================================
// DOCX EXPORTS
// ============================================================

function exportShoppingDocx() {
const list = state.currentShoppingList;
if (!list || !list.length) return;
const { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, TextRun, HeadingLevel, BorderStyle } = docx;
const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: ‘CCCCCC’ };
const borders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
const headerRow = new TableRow({ children: [‘Item’,‘Quantity’,‘Notes’].map(text => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 20, font: ‘Calibri’ })] })], borders, shading: { fill: ‘F5F0E8’ }, width: { size: text === ‘Item’ ? 4000 : 2000, type: WidthType.DXA } })) });
const rows = list.map(item => new TableRow({ children: [item.item, item.qty || ‘’, item.notes || ‘’].map(text => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text, size: 20, font: ‘Calibri’ })] })], borders })) }));
const doc = new Document({ sections: [{ properties: {}, children: [new Paragraph({ children: [new TextRun({ text: ‘Shopping List — AU Family Dinner Planner’, bold: true, size: 32, font: ‘Calibri’ })], heading: HeadingLevel.HEADING_1, spacing: { after: 200 } }), new Paragraph({ children: [new TextRun({ text: `Generated: ${new Date().toLocaleDateString('en-AU')}`, size: 18, font: ‘Calibri’, color: ‘888888’ })], spacing: { after: 300 } }), new Table({ rows: [headerRow, …rows], width: { size: 100, type: WidthType.PERCENTAGE } })] }] });
Packer.toBlob(doc).then(blob => { saveAs(blob, ‘shopping-list.docx’); toast(‘Shopping list exported’, ‘success’); });
}

function exportRecipesDocx() {
const plan = state.currentMealPlan;
if (!plan) return;
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docx;
const allMeals = […plan.week1, …plan.week2].filter(Boolean);
const children = [
new Paragraph({ children: [new TextRun({ text: ‘Recipe Pack — AU Family Dinner Planner’, bold: true, size: 36, font: ‘Calibri’ })], heading: HeadingLevel.TITLE, spacing: { after: 200 } }),
new Paragraph({ children: [new TextRun({ text: `Fortnight starting ${new Date().toLocaleDateString('en-AU')}`, size: 22, font: ‘Calibri’, color: ‘888888’ })], spacing: { after: 400 } }),
new Paragraph({ children: [new TextRun({ text: ‘Table of Contents’, bold: true, size: 28, font: ‘Calibri’ })], heading: HeadingLevel.HEADING_1, spacing: { after: 200 } })
];
allMeals.forEach((meal, i) => children.push(new Paragraph({ children: [new TextRun({ text: `${i+1}. ${meal.title} — ${getDifficultyLabel(meal.difficulty)} — ${meal.cookTime} min`, size: 22, font: ‘Calibri’ })], spacing: { after: 80 } })));
allMeals.forEach(meal => {
children.push(
new Paragraph({ children: [new TextRun({ text: ‘’, break: 1 })], pageBreakBefore: true }),
new Paragraph({ children: [new TextRun({ text: meal.title, bold: true, size: 30, font: ‘Calibri’ })], heading: HeadingLevel.HEADING_1, spacing: { after: 100 } }),
new Paragraph({ children: [new TextRun({ text: `${getDifficultyLabel(meal.difficulty)} · ${meal.cuisine} · ${meal.cookTime} min${meal._aiGenerated ? ' · ✨ AI Generated' : ''}`, size: 20, font: ‘Calibri’, color: ‘888888’ })], spacing: { after: 200 } }),
new Paragraph({ children: [new TextRun({ text: ‘Ingredients’, bold: true, size: 24, font: ‘Calibri’ })], heading: HeadingLevel.HEADING_2, spacing: { after: 100 } })
);
meal.ingredients.forEach(ing => children.push(new Paragraph({ children: [new TextRun({ text: `• ${ing}`, size: 20, font: ‘Calibri’ })], spacing: { after: 40 } })));
children.push(new Paragraph({ children: [new TextRun({ text: ‘Method’, bold: true, size: 24, font: ‘Calibri’ })], heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }));
meal.steps.forEach((step, si) => children.push(new Paragraph({ children: [new TextRun({ text: `${si+1}. ${step}`, size: 20, font: ‘Calibri’ })], spacing: { after: 80 } })));
const sections = [[‘meatTip’,‘🥩 Meat Prep Tip’,‘C77D0A’],[‘toddlerAdjust’,‘👶 Toddler Adjustment’,‘2E6B8A’],[‘tips’,‘💡 Tips’,‘3D7A3F’],[‘leftoverHandling’,‘📦 Leftover Handling’,‘C2703A’]];
sections.forEach(([key, label, color]) => {
if (meal[key]) {
children.push(new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20, font: ‘Calibri’, color })], spacing: { before: 200, after: 60 } }));
children.push(new Paragraph({ children: [new TextRun({ text: meal[key], size: 20, font: ‘Calibri’, italics: true })], spacing: { after: 100 } }));
}
});
});
const doc = new Document({ sections: [{ children }] });
Packer.toBlob(doc).then(blob => { saveAs(blob, ‘recipe-pack.docx’); toast(‘Recipe pack exported’, ‘success’); });
}

// ============================================================
// TAB NAVIGATION
// ============================================================

function switchTab(tabId) {
document.querySelectorAll(’.tab-btn’).forEach(b => b.classList.remove(‘active’));
document.querySelectorAll(’.tab-panel’).forEach(p => p.classList.remove(‘active’));
document.querySelector(`[data-tab="${tabId}"]`)?.classList.add(‘active’);
document.getElementById(‘panel-’ + tabId)?.classList.add(‘active’);
}

// ============================================================
// MAIN SESSION FLOW — AI ONLY, NO FALLBACK
// ============================================================

async function startFortnight() {
const farmersText = document.getElementById(‘farmersPickInput’).value;
const meatText = document.getElementById(‘meatInput’).value;
const leftoversText = document.getElementById(‘leftoversInput’).value;
const dislikesText = document.getElementById(‘dislikesInput’).value;

if (!farmersText.trim() && !meatText.trim()) { toast(‘Please enter at least some produce or meat.’, ‘error’); return; }

const delivery = farmersText.split(’\n’).map(parseQuantityLine).filter(Boolean);
const meat = meatText.split(’\n’).map(parseQuantityLine).filter(Boolean);
const leftovers = leftoversText.split(’\n’).map(parseQuantityLine).filter(Boolean);

if (state.currentSession) { state.sessions.push({ …state.currentSession, archived: true, archivedAt: Date.now() }); save(‘sessions’, state.sessions); }
state.currentSession = { id: generateId(), timestamp: Date.now(), delivery, meat, leftovers, dislikes: dislikesText, outputs: {} };

generateStorageTable([…delivery, …leftovers]);
showLoading(‘Claude is creating your fortnight meal plan…’);

try {
state.currentMealPlan = await generateMealPlanWithAI(delivery, meat, leftovers, dislikesText);
} catch (err) {
// Surface the error clearly — do not fall back to seed recipes
showGenerationError(‘new’, err);
return;
}
hideLoading();

const allMeals = […state.currentMealPlan.week1, …state.currentMealPlan.week2].filter(Boolean);
allMeals.forEach(m => state.mealHistory.push({ date: Date.now(), cuisine: m.cuisine, mexicanFlag: m.cuisine === ‘Mexican’, recipeId: m.id }));
save(‘mealHistory’, state.mealHistory);
checkPantryNeeds(allMeals);
generateShoppingList();
saveCurrentSession();
renderMealPlan(); renderRecipes(); renderRateNotes(); renderPantry();
switchTab(‘mealPlan’);
toast(‘✨ Fortnight plan generated by Claude!’, ‘success’);
}

function saveCurrentSession() { save(‘currentSession’, state.currentSession); save(‘currentMealPlan’, state.currentMealPlan); }

function checkPantryNeeds(meals) {
const neededStaples = new Set();
meals.forEach(meal => meal.ingredients.forEach(ing => state.pantry.forEach(p => { if (ing.toLowerCase().includes(p.item.toLowerCase()) && !p.have) neededStaples.add(p.item); })));
neededStaples.forEach(name => { const idx = state.pantry.findIndex(p => p.item === name); if (idx >= 0) { state.pantry[idx].low = true; state.pantry[idx]._new = true; } });
save(‘pantry’, state.pantry);
}

function loadSeedData() {
document.getElementById(‘farmersPickInput’).value = SEED_FARMERS_PICK;
document.getElementById(‘meatInput’).value = SEED_MEAT;
document.getElementById(‘leftoversInput’).value = SEED_LEFTOVERS;
toast(‘Sample data loaded — click “Generate Fortnight Plan”’, ‘info’);
}

// ============================================================
// CLIPBOARD
// ============================================================

function copyToClipboard(elementId) {
const text = document.getElementById(elementId).textContent;
navigator.clipboard.writeText(text).then(() => toast(‘Copied to clipboard’, ‘success’)).catch(() => {
const ta = document.createElement(‘textarea’); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand(‘copy’); document.body.removeChild(ta); toast(‘Copied to clipboard’, ‘success’);
});
}

// ============================================================
// THEME TOGGLE
// ============================================================

(function initTheme() {
const toggle = document.getElementById(‘themeToggle’);
const root = document.documentElement;
let theme = matchMedia(’(prefers-color-scheme: dark)’).matches ? ‘dark’ : ‘light’;
root.setAttribute(‘data-theme’, theme);
toggle.addEventListener(‘click’, () => {
theme = theme === ‘dark’ ? ‘light’ : ‘dark’;
root.setAttribute(‘data-theme’, theme);
toggle.innerHTML = theme === ‘dark’
? ‘<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>’
: ‘<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>’;
});
})();

// ============================================================
// INIT
// ============================================================

function init() {
loadSettings(); loadPantry();
state.sessions = load(‘sessions’) || [];
state.mealHistory = load(‘mealHistory’) || [];
state.recipeLibrary = load(‘recipeLibrary’) || [];
state.recipeFeedback = load(‘recipeFeedback’) || {};
state.currentSession = load(‘currentSession’) || null;
state.currentMealPlan = load(‘currentMealPlan’) || null;
state.currentShoppingList = load(‘shoppingLists’) || null;

document.querySelectorAll(’.tab-btn’).forEach(btn => btn.addEventListener(‘click’, () => switchTab(btn.dataset.tab)));
document.getElementById(‘startFortnightBtn’).addEventListener(‘click’, startFortnight);
document.getElementById(‘loadSeedBtn’).addEventListener(‘click’, loadSeedData);
document.getElementById(‘settingsBtn’).addEventListener(‘click’, openSettings);
document.getElementById(‘closeSettingsBtn’).addEventListener(‘click’, () => document.getElementById(‘settingsModal’).style.display = ‘none’);
document.getElementById(‘saveSettingsBtn’).addEventListener(‘click’, saveSettings);
document.getElementById(‘addPantryItemBtn’).addEventListener(‘click’, () => document.getElementById(‘pantryModal’).style.display = ‘flex’);
document.getElementById(‘closePantryModal’).addEventListener(‘click’, () => document.getElementById(‘pantryModal’).style.display = ‘none’);
document.getElementById(‘savePantryItemBtn’).addEventListener(‘click’, addPantryItem);
document.getElementById(‘closeCookMode’).addEventListener(‘click’, () => document.getElementById(‘cookModeModal’).style.display = ‘none’);
document.getElementById(‘exportShoppingBtn’).addEventListener(‘click’, exportShoppingDocx);
document.getElementById(‘exportRecipesBtn’).addEventListener(‘click’, exportRecipesDocx);
document.getElementById(‘copyPlainBtn’).addEventListener(‘click’, () => copyToClipboard(‘wooliesPlainText’));
document.getElementById(‘copyJSONBtn’).addEventListener(‘click’, () => copyToClipboard(‘wooliesJSON’));
document.getElementById(‘copyPromptBtn’).addEventListener(‘click’, () => copyToClipboard(‘wooliesPrompt’));
document.querySelectorAll(’.modal-overlay’).forEach(overlay => overlay.addEventListener(‘click’, e => { if (e.target === overlay) overlay.style.display = ‘none’; }));

if (state.currentMealPlan) { renderMealPlan(); renderRecipes(); renderRateNotes(); renderShoppingPreview(); updateWooliesData(); updateExportButtons(); }
if (state.currentSession) generateStorageTable([…(state.currentSession.delivery || []), …(state.currentSession.leftovers || [])]);
renderPantry();
}

document.addEventListener(‘DOMContentLoaded’, init);
