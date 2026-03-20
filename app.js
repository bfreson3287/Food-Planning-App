/* ========================================
   app.js — AU Family Dinner Planner
   Core application logic
   ======================================== */

// --- App State ---
let state = {
  settings: null,
  pantry: [],
  sessions: [],
  mealHistory: [],
  recipeLibrary: [],
  recipeFeedback: {},
  shoppingLists: [],
  currentSession: null,
  currentMealPlan: null,
  currentShoppingList: null
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }

function toast(message, type = 'info') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = message;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3000);
}

/* Storage abstraction: uses browser storage when available, falls back to in-memory map
   (sandboxed iframes may block persistent storage). Data persists for the tab session either way. */
const _mem = {};
const _ls = (function() { try { const s = window['local'+'Storage']; s.setItem('_t','1'); s.removeItem('_t'); return s; } catch(e) { return null; } })();
function save(key, data) { const k = 'afdp_' + key; const v = JSON.stringify(data); _mem[k] = v; if (_ls) try { _ls.setItem(k, v); } catch(e) {} }
function load(key) { const k = 'afdp_' + key; try { const d = _ls ? _ls.getItem(k) : _mem[k]; return d ? JSON.parse(d) : null; } catch(e) { return null; } }

function parseQuantityLine(line) {
  line = line.trim();
  if (!line) return null;
  // Patterns: "2x broccoli", "500g beef", "1kg chicken", "bunch coriander", "punnet tomatoes", "bag spinach", "head cauliflower", "half bag spinach", "knob ginger"
  const patterns = [
    /^(\d+(?:\.\d+)?)\s*x\s+(.+)$/i,          // 2x broccoli
    /^(\d+(?:\.\d+)?)\s*kg\s+(.+)$/i,          // 1kg carrots
    /^(\d+(?:\.\d+)?)\s*g\s+(.+)$/i,           // 500g mince
    /^(\d+(?:\.\d+)?)\s+(?:bunch|punnet|bag|head|knob|pack)\s+(.+)$/i, // 1 bunch coriander
    /^(bunch|punnet|bag|head|knob|half\s+bag|quarter|pack)\s+(.+)$/i, // bunch coriander (no number)
    /^(\d+(?:\/\d+)?)\s+(.+)$/i,               // 3 potatoes, 1/4 cabbage
    /^(.+)$/                                     // fallback: item only
  ];
  for (let i = 0; i < patterns.length; i++) {
    const m = line.match(patterns[i]);
    if (m) {
      if (i === 0) return { qty: m[1] + 'x', item: m[2].trim().toLowerCase() };
      if (i === 1) return { qty: m[1] + 'kg', item: m[2].trim().toLowerCase() };
      if (i === 2) return { qty: m[1] + 'g', item: m[2].trim().toLowerCase() };
      if (i === 3) return { qty: m[1] + ' ' + line.match(/bunch|punnet|bag|head|knob|pack/i)[0], item: m[2].trim().toLowerCase() };
      if (i === 4) return { qty: m[1], item: m[2].trim().toLowerCase() };
      if (i === 5) return { qty: m[1], item: m[2].trim().toLowerCase() };
      if (i === 6) return { qty: '', item: m[1].trim().toLowerCase() };
    }
  }
  return { qty: '', item: line.toLowerCase() };
}

function parseGrams(qtyStr) {
  if (!qtyStr) return 0;
  const kgMatch = qtyStr.match(/([\d.]+)\s*kg/i);
  if (kgMatch) return parseFloat(kgMatch[1]) * 1000;
  const gMatch = qtyStr.match(/([\d.]+)\s*g/i);
  if (gMatch) return parseFloat(gMatch[1]);
  return 0;
}

function parsePieces(qtyStr) {
  if (!qtyStr) return 0;
  const m = qtyStr.match(/(\d+)\s*x/i);
  if (m) return parseInt(m[1]);
  const m2 = qtyStr.match(/^(\d+)$/);
  if (m2) return parseInt(m2[1]);
  return 0;
}

function containsNuts(text) {
  const lower = text.toLowerCase();
  return NUT_BLACKLIST.some(nut => {
    const re = new RegExp('\\b' + nut.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    return re.test(lower);
  });
}

function getDifficultyEmoji(d) {
  if (d === 'easy') return '🟢';
  if (d === 'medium') return '🟡';
  return '🔴';
}

function getDifficultyLabel(d) {
  if (d === 'easy') return 'Easy';
  if (d === 'medium') return 'Medium';
  return 'Complex';
}

function getYieldFactor(proteinName) {
  const lower = (proteinName || '').toLowerCase();
  for (const [key, val] of Object.entries(YIELD_FACTORS)) {
    if (lower.includes(key)) return val;
  }
  return YIELD_FACTORS.default;
}

// ============================================================
// SETTINGS
// ============================================================

function getDefaultSettings() {
  return {
    servings: 4,
    leftoverOn: true,
    adultDinnerProtein: 160,
    toddlerDinnerProtein: 60,
    adultLunchProtein: 140,
    maxTime: 60,
    cuisinePrefs: CUISINES.reduce((a, c) => { a[c] = true; return a; }, {}),
    nutFree: true,
    mexicanMax: 2
  };
}

function loadSettings() {
  state.settings = load('settings') || getDefaultSettings();
}

function saveSettings() {
  const s = state.settings;
  s.servings = Math.max(4, parseInt(document.getElementById('settingServings').value) || 4);
  s.leftoverOn = document.getElementById('settingLeftoverOn').checked;
  s.adultDinnerProtein = parseInt(document.getElementById('settingAdultDinner').value) || 160;
  s.toddlerDinnerProtein = parseInt(document.getElementById('settingToddlerDinner').value) || 60;
  s.adultLunchProtein = parseInt(document.getElementById('settingAdultLunch').value) || 140;
  s.maxTime = Math.min(60, parseInt(document.getElementById('settingMaxTime').value) || 60);
  document.querySelectorAll('.cuisine-toggle-check').forEach(cb => {
    s.cuisinePrefs[cb.dataset.cuisine] = cb.checked;
  });
  save('settings', s);
  toast('Settings saved', 'success');
  document.getElementById('settingsModal').style.display = 'none';
}

function openSettings() {
  const s = state.settings;
  document.getElementById('settingServings').value = s.servings;
  document.getElementById('settingLeftoverOn').checked = s.leftoverOn;
  document.getElementById('settingAdultDinner').value = s.adultDinnerProtein;
  document.getElementById('settingToddlerDinner').value = s.toddlerDinnerProtein;
  document.getElementById('settingAdultLunch').value = s.adultLunchProtein;
  document.getElementById('settingMaxTime').value = s.maxTime;
  // Cuisine toggles
  const ct = document.getElementById('cuisineToggles');
  ct.innerHTML = '';
  CUISINES.forEach(c => {
    const label = document.createElement('label');
    label.className = 'toggle-label';
    label.innerHTML = `<input type="checkbox" class="cuisine-toggle-check" data-cuisine="${c}" ${s.cuisinePrefs[c] ? 'checked' : ''}> ${c}`;
    ct.appendChild(label);
  });
  document.getElementById('settingsModal').style.display = 'flex';
}

// ============================================================
// STORAGE TABLE
// ============================================================

function generateStorageTable(items) {
  const tbody = document.getElementById('storageBody');
  tbody.innerHTML = '';
  const eatFirst = [];

  items.forEach(parsed => {
    const name = parsed.item;
    const key = Object.keys(STORAGE_RULES).find(k => name.includes(k)) || 'default';
    const rule = STORAGE_RULES[key] || STORAGE_RULES['default'];

    // Check perishability for eat-first
    const isPerishable = HIGHLY_PERISHABLE.some(p => name.includes(p));
    if (isPerishable || (rule.perishDays && rule.perishDays <= 3)) {
      eatFirst.push({ name, perishDays: rule.perishDays || 3 });
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${parsed.qty ? parsed.qty + ' ' : ''}${name}</strong></td>
      <td>${rule.location}</td>
      <td>${rule.howToStore}</td>
      <td>${rule.life}</td>
      <td>${rule.notes}</td>
    `;
    tbody.appendChild(tr);
  });

  // Eat first box
  const efBox = document.getElementById('eatFirstBox');
  const efList = document.getElementById('eatFirstList');
  if (eatFirst.length > 0) {
    eatFirst.sort((a, b) => a.perishDays - b.perishDays);
    const top = eatFirst.slice(0, 4);
    efList.innerHTML = top.map(e => `<span class="eat-first-item">${e.name} (${e.perishDays}d)</span>`).join('');
    efBox.style.display = 'block';
  } else {
    efBox.style.display = 'none';
  }

  document.getElementById('storageEmpty').style.display = items.length ? 'none' : 'block';
}

// ============================================================
// LEFTOVER SUFFICIENCY CALCULATOR
// ============================================================

function calcLeftoverSufficiency(recipe) {
  const s = state.settings;
  if (!s.leftoverOn) return { status: 'Pass', confidence: 'High', detail: '' };

  const target = (2 * s.adultDinnerProtein) + s.toddlerDinnerProtein + (2 * s.adultLunchProtein);
  const protein = recipe.primaryProtein;
  if (!protein) return { status: 'Risk', confidence: 'Low', estimated: 0, target, detail: 'No primary protein specified' };

  let rawGrams = protein.rawGrams || 0;
  // Apply feedback adjustments
  const fb = state.recipeFeedback[recipe.id];
  if (fb && fb.proteinMultiplier) {
    rawGrams = Math.round(rawGrams * fb.proteinMultiplier);
  }

  const yf = protein.yieldFactor || getYieldFactor(protein.name);
  const estimated = Math.round(rawGrams * yf);

  // Piece count safeguard for drumsticks
  let pieceWarning = '';
  if (protein.name && protein.name.toLowerCase().includes('drumstick') && protein.pieces) {
    if (protein.pieces < 6) {
      pieceWarning = 'Drumstick count < 6. For dinner + 2 lunches, consider 8–10 depending on size.';
    }
  }

  if (estimated >= target) {
    return { status: 'Pass', confidence: 'High', estimated, target, detail: '' };
  } else if (estimated >= target * 0.8) {
    return { status: 'Pass', confidence: 'Medium', estimated, target, detail: pieceWarning || 'Close to target — portion generously' };
  } else {
    const shortfall = target - estimated;
    const recommendedRaw = Math.round((target / yf) * 1.1); // 10% buffer
    return {
      status: 'Risk',
      confidence: 'Low',
      estimated, target,
      detail: pieceWarning || `Yield from ${rawGrams}g raw × ${yf} factor = ~${estimated}g cooked`,
      fixes: [
        { label: `Increase ${protein.name} to ${recommendedRaw}g raw`, newRaw: recommendedRaw },
        { label: 'Add chickpeas/lentils as high-satiety side', addSide: true }
      ]
    };
  }
}

// ============================================================
// MEAL PLAN GENERATOR
// ============================================================

function getMexicanCount14Days() {
  const now = Date.now();
  const fourteenDays = 14 * 24 * 60 * 60 * 1000;
  return state.mealHistory.filter(m => m.mexicanFlag && (now - m.date) < fourteenDays).length;
}

function isBlacklisted(recipeId) {
  const fb = state.recipeFeedback[recipeId];
  return fb && fb.blacklisted;
}

function getRecipePriority(recipe) {
  const fb = state.recipeFeedback[recipe.id];
  if (!fb) return 3; // neutral
  if (fb.blacklisted) return 0;
  return fb.rating || 3;
}

function generateMealPlan(deliveryItems, meatItems, leftoverItems, dislikes) {
  // Build available recipes pool
  let pool = [...SEED_RECIPES, ...state.recipeLibrary.filter(r => !SEED_RECIPES.find(s => s.id === r.id))];

  // Filter: remove blacklisted, nut-containing, over-time, disabled cuisines
  pool = pool.filter(r => {
    if (isBlacklisted(r.id)) return false;
    if (containsNuts(r.ingredients.join(' '))) return false;
    if (r.cookTime > state.settings.maxTime) return false;
    if (!state.settings.cuisinePrefs[r.cuisine]) return false;
    return true;
  });

  // Deprioritise disliked ingredients
  const dislikeList = (dislikes || '').split('\n').map(d => d.trim().toLowerCase()).filter(Boolean);
  pool.forEach(r => {
    r._score = getRecipePriority(r);
    // Check if recipe uses disliked ingredients
    const ingText = r.ingredients.join(' ').toLowerCase();
    dislikeList.forEach(d => {
      if (ingText.includes(d)) r._score -= 1;
    });
    // Bonus for using available produce
    const allItems = [...deliveryItems, ...leftoverItems].map(i => i.item);
    r.ingredients.forEach(ing => {
      const lower = ing.toLowerCase();
      if (allItems.some(item => lower.includes(item))) r._score += 0.5;
    });
  });

  // Sort pool by perishability match (leftover items used first), then score
  pool.sort((a, b) => b._score - a._score);

  // Week 1: 5 meals — 2 complex, 3 easy/medium
  // Week 2: 4 meals — 2 complex, 2 easy/medium
  const week1 = [];
  const week2 = [];
  const used = new Set();
  let mexicanCount = getMexicanCount14Days();

  function pickMeal(targetDifficulty) {
    for (const r of pool) {
      if (used.has(r.id)) continue;
      if (targetDifficulty === 'complex' && r.difficulty !== 'complex') continue;
      if (targetDifficulty === 'easy/medium' && r.difficulty === 'complex') continue;
      // Mexican limit check
      if (r.cuisine === 'Mexican' && mexicanCount >= state.settings.mexicanMax) continue;
      used.add(r.id);
      if (r.cuisine === 'Mexican') mexicanCount++;
      return { ...r };
    }
    // Fallback: pick any unused
    for (const r of pool) {
      if (used.has(r.id)) continue;
      if (r.cuisine === 'Mexican' && mexicanCount >= state.settings.mexicanMax) continue;
      used.add(r.id);
      if (r.cuisine === 'Mexican') mexicanCount++;
      return { ...r };
    }
    return null;
  }

  // Week 1: 2 complex then 3 easy/medium (interleave for variety)
  const w1Complex = [pickMeal('complex'), pickMeal('complex')];
  const w1Easy = [pickMeal('easy/medium'), pickMeal('easy/medium'), pickMeal('easy/medium')];
  // Interleave: easy, complex, easy, complex, easy
  week1.push(w1Easy[0], w1Complex[0], w1Easy[1], w1Complex[1], w1Easy[2]);

  // Week 2: 2 complex then 2 easy/medium
  const w2Complex = [pickMeal('complex'), pickMeal('complex')];
  const w2Easy = [pickMeal('easy/medium'), pickMeal('easy/medium')];
  week2.push(w2Easy[0], w2Complex[0], w2Easy[1], w2Complex[1]);

  // Sort within weeks by perishability of produce used
  function perishScore(recipe) {
    let score = 999;
    if (!recipe) return score;
    const ingText = recipe.ingredients.join(' ').toLowerCase();
    for (const p of HIGHLY_PERISHABLE) {
      if (ingText.includes(p)) {
        const rule = STORAGE_RULES[p] || STORAGE_RULES['default'];
        score = Math.min(score, rule.perishDays || 5);
      }
    }
    return score;
  }

  // Assign days and apply leftover sufficiency
  const dayNames1 = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const dayNames2 = ['Mon', 'Tue', 'Wed', 'Thu'];
  const plan = {
    week1: week1.filter(Boolean).map((meal, i) => {
      meal._day = dayNames1[i] || `Day ${i + 1}`;
      meal._week = 1;
      meal._locked = false;
      meal._sufficiency = calcLeftoverSufficiency(meal);
      return meal;
    }),
    week2: week2.filter(Boolean).map((meal, i) => {
      meal._day = dayNames2[i] || `Day ${i + 1}`;
      meal._week = 2;
      meal._locked = false;
      meal._sufficiency = calcLeftoverSufficiency(meal);
      return meal;
    })
  };

  return plan;
}

// ============================================================
// RENDER MEAL PLAN
// ============================================================

function renderMealPlan() {
  const plan = state.currentMealPlan;
  const container = document.getElementById('mealPlanContent');
  if (!plan) {
    container.innerHTML = '<p class="empty-state">Generate a fortnight plan from the "New Fortnight" tab first.</p>';
    return;
  }

  let html = '';

  function renderWeek(meals, weekNum) {
    html += `<div class="week-section">
      <div class="week-title">Week ${weekNum} — ${meals.length} Dinners</div>
      <div class="meal-cards">`;
    meals.forEach((meal, idx) => {
      if (!meal) return;
      const suf = meal._sufficiency || {};
      const sufClass = suf.status === 'Pass' ? 'leftover-pass' : 'leftover-risk';
      const sufIcon = suf.status === 'Pass' ? '✅' : '⚠️';
      let sufDetail = '';
      if (suf.status === 'Risk' && suf.fixes) {
        sufDetail = `<div class="risk-detail">~${suf.estimated}g vs target ${suf.target}g — ${suf.detail}</div>`;
        sufDetail += suf.fixes.map((f, fi) => `<button class="fix-btn" onclick="applyFix('${meal.id}', ${idx}, ${weekNum}, ${fi})">${f.label}</button>`).join(' ');
      } else if (suf.detail) {
        sufDetail = `<div class="risk-detail">${suf.detail}</div>`;
      }

      html += `
        <div class="meal-card ${meal._locked ? 'locked' : ''}" id="meal-${weekNum}-${idx}">
          <div class="meal-card-day">${meal._day} · Week ${weekNum}</div>
          <div class="meal-card-header">
            <div class="meal-card-title">${meal.title}</div>
          </div>
          <div class="meal-meta">
            <span class="tag tag-cuisine">${meal.cuisine}</span>
            <span class="tag">${getDifficultyEmoji(meal.difficulty)} ${getDifficultyLabel(meal.difficulty)}</span>
            <span class="tag tag-time">⏱ ${meal.cookTime} min</span>
          </div>
          <div class="produce-list">
            <strong>Protein:</strong> ${meal.primaryProtein ? meal.primaryProtein.name + ' (' + (meal.primaryProtein.rawGrams || '?') + 'g raw' + (meal.primaryProtein.pieces ? ', ' + meal.primaryProtein.pieces + ' pcs' : '') + ')' : 'Various'}
          </div>
          <div class="leftover-status ${sufClass}">
            ${sufIcon} Leftovers: ${suf.status} (${suf.confidence || 'N/A'} confidence)
            ${sufDetail}
          </div>
          <div class="meal-card-actions">
            <button class="btn-secondary btn-small" onclick="toggleLock(${weekNum}, ${idx})">${meal._locked ? '🔒 Unlock' : '🔓 Lock'}</button>
            <button class="btn-secondary btn-small" onclick="swapMeal(${weekNum}, ${idx}, -1)">↑ Move</button>
            <button class="btn-secondary btn-small" onclick="swapMeal(${weekNum}, ${idx}, 1)">↓ Move</button>
            <button class="btn-secondary btn-small" onclick="viewRecipe('${meal.id}')">📖 Recipe</button>
          </div>
        </div>`;
    });
    html += '</div></div>';
  }

  renderWeek(plan.week1, 1);
  renderWeek(plan.week2, 2);

  html += `<div class="action-bar mt-4">
    <button class="btn-primary" onclick="regenerateUnlocked()">🔄 Regenerate Unlocked Meals</button>
  </div>`;

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
  // Swap day labels back
  const tempDay = meals[idx]._day;
  meals[idx]._day = meals[newIdx]._day;
  meals[newIdx]._day = tempDay;
  renderMealPlan();
}

function regenerateUnlocked() {
  if (!state.currentSession) return;
  const locked1 = state.currentMealPlan.week1.filter(m => m._locked);
  const locked2 = state.currentMealPlan.week2.filter(m => m._locked);
  const newPlan = generateMealPlan(
    state.currentSession.delivery,
    state.currentSession.meat,
    state.currentSession.leftovers,
    state.currentSession.dislikes
  );
  // Restore locked meals
  const dayNames1 = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const dayNames2 = ['Mon', 'Tue', 'Wed', 'Thu'];

  state.currentMealPlan.week1 = dayNames1.map((day, i) => {
    const lockedMeal = locked1.find(m => m._day === day);
    if (lockedMeal) return lockedMeal;
    const fresh = newPlan.week1[i];
    if (fresh) { fresh._day = day; fresh._week = 1; return fresh; }
    return state.currentMealPlan.week1[i];
  });
  state.currentMealPlan.week2 = dayNames2.map((day, i) => {
    const lockedMeal = locked2.find(m => m._day === day);
    if (lockedMeal) return lockedMeal;
    const fresh = newPlan.week2[i];
    if (fresh) { fresh._day = day; fresh._week = 2; return fresh; }
    return state.currentMealPlan.week2[i];
  });

  saveCurrentSession();
  renderMealPlan();
  generateShoppingList();
  toast('Unlocked meals regenerated', 'success');
}

function applyFix(recipeId, mealIdx, weekNum, fixIdx) {
  const meals = weekNum === 1 ? state.currentMealPlan.week1 : state.currentMealPlan.week2;
  const meal = meals[mealIdx];
  if (!meal || !meal._sufficiency || !meal._sufficiency.fixes) return;
  const fix = meal._sufficiency.fixes[fixIdx];
  if (fix.newRaw && meal.primaryProtein) {
    meal.primaryProtein.rawGrams = fix.newRaw;
    if (meal.primaryProtein.pieces && meal.primaryProtein.name.toLowerCase().includes('drumstick')) {
      meal.primaryProtein.pieces = Math.ceil(fix.newRaw / 120); // ~120g per drumstick
    }
  }
  if (fix.addSide) {
    meal.ingredients.push('400g can chickpeas (drained) or 200g dried lentils');
    meal.steps.push('Add drained chickpeas or cooked lentils to boost protein and satiety for leftovers.');
  }
  meal._sufficiency = calcLeftoverSufficiency(meal);
  renderMealPlan();
  generateShoppingList();
  toast('Fix applied — quantities updated', 'success');
}

// ============================================================
// RECIPES + COOK MODE
// ============================================================

function renderRecipes() {
  const plan = state.currentMealPlan;
  const container = document.getElementById('recipesContent');
  if (!plan) {
    container.innerHTML = '<p class="empty-state">Generate a fortnight plan to see recipes.</p>';
    return;
  }

  const allMeals = [...plan.week1, ...plan.week2].filter(Boolean);
  let html = '<div class="recipe-list">';
  allMeals.forEach(meal => {
    // Apply feedback-driven modifications
    let ingredients = [...meal.ingredients];
    let steps = [...meal.steps];
    const fb = state.recipeFeedback[meal.id];
    if (fb) {
      if (fb.proteinMultiplier && meal.primaryProtein) {
        const newRaw = Math.round((meal.primaryProtein.rawGrams || 0) * fb.proteinMultiplier);
        if (newRaw > 0) {
          ingredients = ingredients.map(ing => {
            if (ing.toLowerCase().includes(meal.primaryProtein.name.toLowerCase())) {
              return ing.replace(/\d+g/, newRaw + 'g');
            }
            return ing;
          });
        }
      }
      if (fb.lessSalt) {
        steps.push('Finishing step: Season to taste at the very end — add salt gradually and taste between additions.');
      }
      if (fb.excludeIngredients && fb.excludeIngredients.length) {
        fb.excludeIngredients.forEach(excl => {
          ingredients = ingredients.filter(ing => !ing.toLowerCase().includes(excl.toLowerCase()));
        });
      }
    }

    html += `
      <div class="recipe-card" id="recipe-${meal.id}">
        <h3>${meal.title}</h3>
        <div class="meal-meta">
          <span class="tag tag-cuisine">${meal.cuisine}</span>
          <span class="tag">${getDifficultyEmoji(meal.difficulty)} ${getDifficultyLabel(meal.difficulty)}</span>
          <span class="tag tag-time">⏱ ${meal.cookTime} min</span>
        </div>

        <div class="recipe-section">
          <h4>Ingredients</h4>
          <ul class="ingredients-list">
            ${ingredients.map(i => `<li>${i}</li>`).join('')}
          </ul>
        </div>

        <div class="recipe-section">
          <h4>Method</h4>
          <ol class="steps-list">
            ${steps.map(s => `<li>${s}</li>`).join('')}
          </ol>
        </div>

        ${meal.meatTip ? `<div class="callout-box meat-tip"><h4>🥩 Meat Prep Tip</h4>${meal.meatTip}</div>` : ''}
        ${meal.toddlerAdjust ? `<div class="callout-box toddler"><h4>👶 Toddler Adjustment</h4>${meal.toddlerAdjust}</div>` : ''}
        ${meal.tips ? `<div class="callout-box tip"><h4>💡 Chef Tips</h4>${meal.tips}</div>` : ''}
        ${meal.leftoverHandling ? `<div class="callout-box"><h4>📦 Leftover Handling</h4>${meal.leftoverHandling}</div>` : ''}

        <div class="meal-card-actions mt-4">
          <button class="btn-primary btn-small" onclick="openCookMode('${meal.id}')">🍳 Cook Mode</button>
        </div>
      </div>`;
  });
  html += '</div>';
  container.innerHTML = html;
}

function viewRecipe(recipeId) {
  switchTab('recipes');
  setTimeout(() => {
    const el = document.getElementById('recipe-' + recipeId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

function openCookMode(recipeId) {
  const allMeals = [...(state.currentMealPlan?.week1 || []), ...(state.currentMealPlan?.week2 || [])];
  const meal = allMeals.find(m => m && m.id === recipeId);
  if (!meal) return;

  document.getElementById('cookModeTitle').textContent = '🍳 ' + meal.title;
  const body = document.getElementById('cookModeBody');
  let html = '';

  meal.steps.forEach((step, i) => {
    const stepIngs = (meal.stepIngredients && meal.stepIngredients[i]) || [];
    const timer = (meal.timers && meal.timers[i]) || null;

    html += `<div class="cook-step" id="cook-step-${i}">
      <div class="cook-step-header">
        <input type="checkbox" class="cook-step-check" data-step="${i}" onchange="toggleCookStep(${i})">
        <div class="cook-step-num">${i + 1}</div>
        <div class="cook-step-text">${step}</div>
      </div>
      ${stepIngs.length ? `<div class="cook-step-ingredients">Uses: ${stepIngs.join(', ')}</div>` : ''}
      ${timer ? `<div class="cook-timer-bar">
        <button class="timer-btn" onclick="startCookTimer(this, '${timer}')">⏱ Start Timer (${timer})</button>
        <span class="timer-display" id="timer-${i}">--:--</span>
      </div>` : ''}
    </div>`;
  });

  body.innerHTML = html;
  document.getElementById('cookModeModal').style.display = 'flex';
}

function toggleCookStep(idx) {
  const step = document.getElementById('cook-step-' + idx);
  const check = step.querySelector('.cook-step-check');
  if (check.checked) {
    step.style.opacity = '0.5';
    step.style.textDecoration = 'line-through';
    // Auto-scroll to next unchecked
    const next = document.getElementById('cook-step-' + (idx + 1));
    if (next) next.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else {
    step.style.opacity = '1';
    step.style.textDecoration = 'none';
  }
}

function startCookTimer(btn, timeStr) {
  // Parse time string: "5–6 min", "25–30 min", "30 sec"
  let seconds = 0;
  const minMatch = timeStr.match(/(\d+)/);
  if (minMatch) {
    if (timeStr.includes('sec')) {
      seconds = parseInt(minMatch[1]);
    } else {
      seconds = parseInt(minMatch[1]) * 60;
    }
  }
  if (seconds === 0) seconds = 60;

  const display = btn.parentElement.querySelector('.timer-display');
  btn.disabled = true;
  btn.textContent = '⏱ Running...';

  const interval = setInterval(() => {
    seconds--;
    if (seconds <= 0) {
      clearInterval(interval);
      display.textContent = '✅ DONE!';
      display.style.color = 'var(--color-success)';
      btn.textContent = '✅ Done';
      // Try to play a simple beep
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 800;
        osc.connect(ctx.destination);
        osc.start();
        setTimeout(() => osc.stop(), 300);
      } catch(e) {}
      return;
    }
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    display.textContent = `${m}:${s.toString().padStart(2, '0')}`;
  }, 1000);
}

// ============================================================
// RATINGS & NOTES
// ============================================================

function renderRateNotes() {
  const plan = state.currentMealPlan;
  const container = document.getElementById('rateNotesContent');
  if (!plan) {
    container.innerHTML = '<p class="empty-state">Cook a meal, then rate it here.</p>';
    return;
  }

  const allMeals = [...plan.week1, ...plan.week2].filter(Boolean);
  let html = '';
  allMeals.forEach(meal => {
    const fb = state.recipeFeedback[meal.id] || {};
    const rating = fb.rating || 0;
    const notes = fb.notes || '';
    const moreMeat = fb.moreMeat || false;
    const lessSalt = fb.lessSalt || false;
    const lessSpicy = fb.lessSpicy || false;
    const moreSpicy = fb.moreSpicy || false;
    const blacklisted = fb.blacklisted || false;
    const excludeIngredients = fb.excludeIngredients || [];

    html += `
      <div class="rate-card" id="rate-${meal.id}">
        <h3>${meal.title} ${blacklisted ? '<span class="blacklist-badge">BLACKLISTED</span>' : ''}</h3>
        <div class="star-rating">
          ${[1,2,3,4,5].map(s => `<span class="star-btn ${s <= rating ? 'active' : ''}" onclick="setRating('${meal.id}', ${s})">★</span>`).join('')}
          <span class="text-xs text-muted" style="margin-left:8px">${rating ? rating + '/5' : 'Not rated'}</span>
        </div>
        <div class="toggle-group">
          <span class="toggle-chip ${moreMeat ? 'active' : ''}" onclick="toggleFeedback('${meal.id}','moreMeat')">🥩 More meat next time</span>
          <span class="toggle-chip ${lessSalt ? 'active' : ''}" onclick="toggleFeedback('${meal.id}','lessSalt')">🧂 Less salty</span>
          <span class="toggle-chip ${lessSpicy ? 'active' : ''}" onclick="toggleFeedback('${meal.id}','lessSpicy')">🌶️ Less spicy</span>
          <span class="toggle-chip ${moreSpicy ? 'active' : ''}" onclick="toggleFeedback('${meal.id}','moreSpicy')">🔥 More spicy</span>
        </div>
        <label class="text-sm">
          Exclude ingredient:
          <select onchange="excludeIngredient('${meal.id}', this.value)">
            <option value="">— Select —</option>
            ${meal.ingredients.map(ing => {
              const short = ing.replace(/^\d+[gx]?\s*/i, '').replace(/,.*/, '').trim();
              const isExcluded = excludeIngredients.includes(short);
              return `<option value="${short}" ${isExcluded ? 'selected' : ''}>${short}${isExcluded ? ' ✗' : ''}</option>`;
            }).join('')}
          </select>
        </label>
        ${excludeIngredients.length ? `<div class="text-xs mt-2">Excluded: ${excludeIngredients.map(e => `<span class="tag">${e} <span style="cursor:pointer" onclick="removeExclusion('${meal.id}','${e}')">✕</span></span>`).join(' ')}</div>` : ''}
        <label class="text-sm mt-2">
          Notes
          <textarea rows="2" id="notes-${meal.id}" oninput="saveNotes('${meal.id}', this.value)">${notes}</textarea>
        </label>
        ${blacklisted ? `<button class="btn-secondary btn-small mt-2" onclick="unBlacklist('${meal.id}')">Remove from blacklist</button>` : ''}
      </div>`;
  });
  container.innerHTML = html;
}

function setRating(recipeId, rating) {
  if (!state.recipeFeedback[recipeId]) state.recipeFeedback[recipeId] = {};
  const fb = state.recipeFeedback[recipeId];
  fb.rating = rating;
  if (rating === 1) {
    fb.blacklisted = true;
    toast(`"${recipeId}" blacklisted — it won't appear in future plans.`, 'error');
  } else {
    fb.blacklisted = false;
  }
  save('recipeFeedback', state.recipeFeedback);
  renderRateNotes();
}

function toggleFeedback(recipeId, key) {
  if (!state.recipeFeedback[recipeId]) state.recipeFeedback[recipeId] = {};
  const fb = state.recipeFeedback[recipeId];
  fb[key] = !fb[key];

  // More meat logic
  if (key === 'moreMeat') {
    if (!fb.proteinMultiplier) fb.proteinMultiplier = 1;
    if (fb[key]) {
      fb.moreMeatCount = (fb.moreMeatCount || 0) + 1;
      if (fb.moreMeatCount === 1) {
        fb.proteinMultiplier = Math.min(1.6, fb.proteinMultiplier + 0.25);
      } else {
        fb.proteinMultiplier = Math.min(1.6, fb.proteinMultiplier + 0.10);
      }
      toast(`Protein increased to ${Math.round(fb.proteinMultiplier * 100)}% for this recipe`, 'info');
    }
  }

  save('recipeFeedback', state.recipeFeedback);
  renderRateNotes();
}

function excludeIngredient(recipeId, ingredient) {
  if (!ingredient) return;
  if (!state.recipeFeedback[recipeId]) state.recipeFeedback[recipeId] = {};
  const fb = state.recipeFeedback[recipeId];
  if (!fb.excludeIngredients) fb.excludeIngredients = [];
  if (!fb.excludeIngredients.includes(ingredient)) {
    fb.excludeIngredients.push(ingredient);
  }
  save('recipeFeedback', state.recipeFeedback);
  renderRateNotes();
  renderRecipes();
}

function removeExclusion(recipeId, ingredient) {
  const fb = state.recipeFeedback[recipeId];
  if (fb && fb.excludeIngredients) {
    fb.excludeIngredients = fb.excludeIngredients.filter(e => e !== ingredient);
    save('recipeFeedback', state.recipeFeedback);
    renderRateNotes();
    renderRecipes();
  }
}

function saveNotes(recipeId, notes) {
  if (!state.recipeFeedback[recipeId]) state.recipeFeedback[recipeId] = {};
  state.recipeFeedback[recipeId].notes = notes;

  // Parse notes for meat-related feedback
  const meatPhrases = ['not enough meat', 'too little chicken', 'needed more protein', 'more meat', 'not enough protein'];
  const lower = notes.toLowerCase();
  if (meatPhrases.some(p => lower.includes(p))) {
    const fb = state.recipeFeedback[recipeId];
    if (!fb.proteinMultiplier) fb.proteinMultiplier = 1;
    fb.moreMeatCount = (fb.moreMeatCount || 0) + 1;
    if (fb.moreMeatCount <= 1) {
      fb.proteinMultiplier = Math.min(1.6, fb.proteinMultiplier + 0.25);
    } else {
      fb.proteinMultiplier = Math.min(1.6, fb.proteinMultiplier + 0.10);
    }
  }

  save('recipeFeedback', state.recipeFeedback);
}

function unBlacklist(recipeId) {
  if (state.recipeFeedback[recipeId]) {
    state.recipeFeedback[recipeId].blacklisted = false;
    save('recipeFeedback', state.recipeFeedback);
    renderRateNotes();
    toast('Recipe removed from blacklist', 'success');
  }
}

// ============================================================
// PANTRY MANAGER
// ============================================================

function loadPantry() {
  state.pantry = load('pantry') || [...DEFAULT_PANTRY];
}

function renderPantry() {
  const tbody = document.getElementById('pantryBody');
  tbody.innerHTML = '';
  state.pantry.forEach((item, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.item}</td>
      <td><span class="text-xs">${item.category}</span></td>
      <td><span class="${item.have ? 'pantry-have' : 'pantry-missing'}">${item.have ? '✓' : '✗'}</span></td>
      <td class="text-xs">${item.qty}</td>
      <td>${item.low ? '<span class="pantry-low">LOW</span>' : '—'}</td>
      <td class="text-xs">${item.notes}</td>
      <td>
        <button class="btn-secondary btn-small" onclick="togglePantryHave(${idx})">${item.have ? 'Mark Out' : 'Mark Have'}</button>
        <button class="btn-danger btn-small" onclick="removePantryItem(${idx})">✕</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Show alerts
  renderPantryAlerts();
}

function togglePantryHave(idx) {
  state.pantry[idx].have = !state.pantry[idx].have;
  save('pantry', state.pantry);
  renderPantry();
}

function removePantryItem(idx) {
  state.pantry.splice(idx, 1);
  save('pantry', state.pantry);
  renderPantry();
}

function addPantryItem() {
  const name = document.getElementById('pantryItemName').value.trim();
  if (!name) return;
  state.pantry.push({
    item: name,
    category: document.getElementById('pantryItemCat').value,
    have: document.getElementById('pantryItemHave').checked,
    qty: document.getElementById('pantryItemQty').value.trim(),
    low: false,
    notes: document.getElementById('pantryItemNotes').value.trim()
  });
  save('pantry', state.pantry);
  document.getElementById('pantryModal').style.display = 'none';
  document.getElementById('pantryItemName').value = '';
  document.getElementById('pantryItemQty').value = '';
  document.getElementById('pantryItemNotes').value = '';
  renderPantry();
  toast('Pantry item added', 'success');
}

function renderPantryAlerts() {
  const alerts = document.getElementById('pantryAlerts');
  const newBox = document.getElementById('newStaplesBox');
  const restockBox = document.getElementById('restockBox');

  const newStaples = state.pantry.filter(p => p._new);
  const restock = state.pantry.filter(p => p.low || !p.have);

  if (newStaples.length === 0 && restock.length === 0) {
    alerts.style.display = 'none';
    return;
  }
  alerts.style.display = 'block';

  if (newStaples.length) {
    newBox.innerHTML = `<strong>New staples added this fortnight:</strong> ${newStaples.map(p => p.item).join(', ')}`;
    newBox.style.display = 'block';
  } else {
    newBox.style.display = 'none';
  }

  if (restock.length) {
    restockBox.innerHTML = `<strong>Restock soon:</strong> ${restock.map(p => p.item).join(', ')}`;
    restockBox.style.display = 'block';
  } else {
    restockBox.style.display = 'none';
  }
}

// ============================================================
// SHOPPING LIST
// ============================================================

function generateShoppingList() {
  if (!state.currentMealPlan) return;
  const allMeals = [...state.currentMealPlan.week1, ...state.currentMealPlan.week2].filter(Boolean);

  // Parse ingredient line into { qty, unit, name }
  function parseIngLine(raw) {
    const line = raw.trim();
    // Match patterns like: "900g chicken thigh fillets, sliced" or "2 tbsp soy sauce" or "2x broccoli" or "1 bunch coriander" or "Olive oil"
    const m = line.match(/^(\d+(?:[./]\d+)?)\s*(g|kg|ml|x|tbsp|tsp|cups?|bunch|punnet|bag|head|can|cloves?|large|small)?\s+(.+)$/i);
    if (m) {
      const cleanName = m[3].replace(/,.*/, '').replace(/\(.*\)/, '').trim().toLowerCase();
      return { qty: m[1], unit: (m[2] || '').toLowerCase(), name: cleanName, raw: line };
    }
    // No leading number — item only
    const cleanName = line.replace(/,.*/, '').replace(/\(.*\)/, '').trim().toLowerCase();
    return { qty: '', unit: '', name: cleanName, raw: line };
  }

  // Normalise name for dedup key
  function normaliseKey(name) {
    return name.replace(/s$/, '').replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  }

  // Collect all ingredients
  const ingredientMap = {};
  allMeals.forEach(meal => {
    meal.ingredients.forEach(ing => {
      const parsed = parseIngLine(ing);
      const key = normaliseKey(parsed.name);
      if (!ingredientMap[key]) {
        ingredientMap[key] = { name: parsed.name, displayName: parsed.raw.replace(/,.*/, '').trim(), qty: parsed.qty, unit: parsed.unit, mentions: 1 };
      } else {
        ingredientMap[key].mentions++;
      }
    });
  });

  // Check against pantry
  const list = [];
  for (const [key, val] of Object.entries(ingredientMap)) {
    const pantryMatch = state.pantry.find(p => {
      const pKey = normaliseKey(p.item.toLowerCase());
      return key.includes(pKey) || pKey.includes(key.split('_')[0]);
    });
    if (pantryMatch && pantryMatch.have) continue;

    // Generate store note
    let note = '';
    const lower = val.name;
    if (['soy sauce','sesame oil','mirin','fish sauce','oyster sauce','gochujang'].some(a => lower.includes(a))) {
      note = 'Asian aisle at Woolies';
    } else if (['cream','yoghurt','sour cream','butter','parmesan','egg'].some(a => lower.includes(a))) {
      note = 'Dairy section';
    } else if (lower.includes('can ') || lower.includes('canned')) {
      note = 'Canned goods aisle';
    }

    // Build clean qty string
    let qtyStr = '';
    if (val.qty && val.unit) qtyStr = val.qty + val.unit;
    else if (val.qty) qtyStr = val.qty;
    if (val.mentions > 1) qtyStr += val.mentions > 1 ? ` (×${val.mentions} recipes)` : '';

    // Capitalise display name
    const displayName = val.name.charAt(0).toUpperCase() + val.name.slice(1);

    list.push({ item: displayName, qty: qtyStr, notes: note, mentions: val.mentions });
  }

  state.currentShoppingList = list;
  save('shoppingLists', list);
  renderShoppingPreview();
  updateWooliesData();
  updateExportButtons();
}

function renderShoppingPreview() {
  const preview = document.getElementById('shoppingListPreview');
  const list = state.currentShoppingList;
  if (!list || !list.length) {
    preview.innerHTML = '<p class="text-sm text-muted">No shopping list yet.</p>';
    return;
  }

  let html = '<table class="data-table"><thead><tr><th>Item</th><th>Qty</th><th>Notes</th></tr></thead><tbody>';
  list.forEach(item => {
    html += `<tr><td>${item.item}</td><td>${item.qty}</td><td>${item.notes}</td></tr>`;
  });
  html += '</tbody></table>';
  preview.innerHTML = html;
}

function updateExportButtons() {
  document.getElementById('exportShoppingBtn').disabled = !state.currentShoppingList || !state.currentShoppingList.length;
  document.getElementById('exportRecipesBtn').disabled = !state.currentMealPlan;
}

// ============================================================
// WOOLIES CART ASSIST
// ============================================================

function updateWooliesData() {
  const list = state.currentShoppingList;
  if (!list || !list.length) return;

  // Plain text
  const plain = list.map(i => `${i.qty ? i.qty + ' ' : ''}${i.item}${i.notes ? ' (' + i.notes + ')' : ''}`).join('\n');
  document.getElementById('wooliesPlainText').textContent = plain;

  // JSON
  const jsonData = list.map(i => ({
    name: i.item,
    quantity: i.qty || '1',
    notes: i.notes,
    preferred_brand: ''
  }));
  document.getElementById('wooliesJSON').textContent = JSON.stringify(jsonData, null, 2);

  // Update prompt with shopping list
  const prompt = `Task: Add items to my Woolworths online cart, but DO NOT check out.
Inputs:
${plain}

Rules:
1) Open woolworths.com.au and prompt me to log in if needed.
2) For each item: search, choose sensible default unless Notes specify, ask me to pick if multiple close matches, add quantity.
3) If not found: add to a 'Could not add' list with closest matches and ask what to do.
4) After all items: open cart and summarise added items, substitutions, missing items.
5) Stop and wait for confirmation before any checkout step.`;
  document.getElementById('wooliesPrompt').textContent = prompt;
}

// ============================================================
// DOCX EXPORTS
// ============================================================

function exportShoppingDocx() {
  const list = state.currentShoppingList;
  if (!list || !list.length) return;

  const { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, TextRun, HeadingLevel, AlignmentType, BorderStyle } = docx;

  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
  const borders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

  const headerRow = new TableRow({
    children: ['Item', 'Quantity', 'Notes'].map(text =>
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 20, font: 'Calibri' })] })],
        borders,
        shading: { fill: 'F5F0E8' },
        width: { size: text === 'Item' ? 4000 : 2000, type: WidthType.DXA }
      })
    )
  });

  const rows = list.map(item =>
    new TableRow({
      children: [item.item, item.qty || '', item.notes || ''].map(text =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text, size: 20, font: 'Calibri' })] })],
          borders
        })
      )
    })
  );

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [new TextRun({ text: 'Shopping List — AU Family Dinner Planner', bold: true, size: 32, font: 'Calibri' })],
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [new TextRun({ text: `Generated: ${new Date().toLocaleDateString('en-AU')}`, size: 18, font: 'Calibri', color: '888888' })],
          spacing: { after: 300 }
        }),
        new Table({ rows: [headerRow, ...rows], width: { size: 100, type: WidthType.PERCENTAGE } })
      ]
    }]
  });

  Packer.toBlob(doc).then(blob => {
    saveAs(blob, 'shopping-list.docx');
    toast('Shopping list exported', 'success');
  });
}

function exportRecipesDocx() {
  const plan = state.currentMealPlan;
  if (!plan) return;

  const { Document, Packer, Paragraph, TextRun, HeadingLevel, TableOfContents, AlignmentType, PageBreak } = docx;
  const allMeals = [...plan.week1, ...plan.week2].filter(Boolean);

  const children = [
    new Paragraph({
      children: [new TextRun({ text: 'Recipe Pack — AU Family Dinner Planner', bold: true, size: 36, font: 'Calibri' })],
      heading: HeadingLevel.TITLE,
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [new TextRun({ text: `Fortnight starting ${new Date().toLocaleDateString('en-AU')}`, size: 22, font: 'Calibri', color: '888888' })],
      spacing: { after: 400 }
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Table of Contents', bold: true, size: 28, font: 'Calibri' })],
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 }
    })
  ];

  // TOC entries (manual since docx lib TOC is limited)
  allMeals.forEach((meal, i) => {
    children.push(new Paragraph({
      children: [new TextRun({ text: `${i + 1}. ${meal.title} — ${getDifficultyLabel(meal.difficulty)} — ${meal.cookTime} min`, size: 22, font: 'Calibri' })],
      spacing: { after: 80 }
    }));
  });

  // Recipe sections
  allMeals.forEach((meal, i) => {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: '', break: 1 })],
        pageBreakBefore: true
      }),
      new Paragraph({
        children: [new TextRun({ text: `${meal.title}`, bold: true, size: 30, font: 'Calibri' })],
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 100 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `${getDifficultyLabel(meal.difficulty)} · ${meal.cuisine} · ${meal.cookTime} min`, size: 20, font: 'Calibri', color: '888888' })
        ],
        spacing: { after: 200 }
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Ingredients', bold: true, size: 24, font: 'Calibri' })],
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 100 }
      })
    );

    meal.ingredients.forEach(ing => {
      children.push(new Paragraph({
        children: [new TextRun({ text: `• ${ing}`, size: 20, font: 'Calibri' })],
        spacing: { after: 40 }
      }));
    });

    children.push(new Paragraph({
      children: [new TextRun({ text: 'Method', bold: true, size: 24, font: 'Calibri' })],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 }
    }));

    meal.steps.forEach((step, si) => {
      children.push(new Paragraph({
        children: [new TextRun({ text: `${si + 1}. ${step}`, size: 20, font: 'Calibri' })],
        spacing: { after: 80 }
      }));
    });

    if (meal.meatTip) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: '🥩 Meat Prep Tip', bold: true, size: 20, font: 'Calibri', color: 'C77D0A' })],
          spacing: { before: 200, after: 60 }
        }),
        new Paragraph({
          children: [new TextRun({ text: meal.meatTip, size: 20, font: 'Calibri', italics: true })],
          spacing: { after: 100 }
        })
      );
    }

    if (meal.toddlerAdjust) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: '👶 Toddler Adjustment', bold: true, size: 20, font: 'Calibri', color: '2E6B8A' })],
          spacing: { before: 100, after: 60 }
        }),
        new Paragraph({
          children: [new TextRun({ text: meal.toddlerAdjust, size: 20, font: 'Calibri', italics: true })],
          spacing: { after: 100 }
        })
      );
    }

    if (meal.tips) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: '💡 Tips', bold: true, size: 20, font: 'Calibri', color: '3D7A3F' })],
          spacing: { before: 100, after: 60 }
        }),
        new Paragraph({
          children: [new TextRun({ text: meal.tips, size: 20, font: 'Calibri', italics: true })],
          spacing: { after: 100 }
        })
      );
    }

    if (meal.leftoverHandling) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: '📦 Leftover Handling', bold: true, size: 20, font: 'Calibri', color: 'C2703A' })],
          spacing: { before: 100, after: 60 }
        }),
        new Paragraph({
          children: [new TextRun({ text: meal.leftoverHandling, size: 20, font: 'Calibri', italics: true })],
          spacing: { after: 100 }
        })
      );
    }
  });

  const doc = new Document({ sections: [{ children }] });
  Packer.toBlob(doc).then(blob => {
    saveAs(blob, 'recipe-pack.docx');
    toast('Recipe pack exported', 'success');
  });
}

// ============================================================
// TAB NAVIGATION
// ============================================================

function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`[data-tab="${tabId}"]`)?.classList.add('active');
  document.getElementById('panel-' + tabId)?.classList.add('active');
}

// ============================================================
// MAIN SESSION FLOW
// ============================================================

function startFortnight() {
  const farmersText = document.getElementById('farmersPickInput').value;
  const meatText = document.getElementById('meatInput').value;
  const leftoversText = document.getElementById('leftoversInput').value;
  const dislikesText = document.getElementById('dislikesInput').value;

  if (!farmersText.trim() && !meatText.trim()) {
    toast('Please enter at least some produce or meat.', 'error');
    return;
  }

  const delivery = farmersText.split('\n').map(parseQuantityLine).filter(Boolean);
  const meat = meatText.split('\n').map(parseQuantityLine).filter(Boolean);
  const leftovers = leftoversText.split('\n').map(parseQuantityLine).filter(Boolean);
  const dislikes = dislikesText;

  // Archive previous session
  if (state.currentSession) {
    state.sessions.push({ ...state.currentSession, archived: true, archivedAt: Date.now() });
    save('sessions', state.sessions);
  }

  // Create new session
  state.currentSession = {
    id: generateId(),
    timestamp: Date.now(),
    delivery, meat, leftovers, dislikes,
    outputs: {}
  };

  // Generate storage table
  generateStorageTable([...delivery, ...leftovers]);

  // Generate meal plan
  state.currentMealPlan = generateMealPlan(delivery, meat, leftovers, dislikes);

  // Update meal history
  const allMeals = [...state.currentMealPlan.week1, ...state.currentMealPlan.week2].filter(Boolean);
  allMeals.forEach(m => {
    state.mealHistory.push({
      date: Date.now(),
      cuisine: m.cuisine,
      mexicanFlag: m.cuisine === 'Mexican',
      recipeId: m.id
    });
  });
  save('mealHistory', state.mealHistory);

  // Check pantry needs
  checkPantryNeeds(allMeals);

  // Generate shopping list
  generateShoppingList();

  // Save session
  saveCurrentSession();

  // Render everything
  renderMealPlan();
  renderRecipes();
  renderRateNotes();
  renderPantry();

  toast('Fortnight plan generated! Check each tab.', 'success');
  switchTab('storage');
}

function saveCurrentSession() {
  save('currentSession', state.currentSession);
  save('currentMealPlan', state.currentMealPlan);
}

function checkPantryNeeds(meals) {
  // Scan recipes for pantry items that might be needed
  const neededStaples = new Set();
  meals.forEach(meal => {
    meal.ingredients.forEach(ing => {
      const lower = ing.toLowerCase();
      // Check if it matches any pantry item
      state.pantry.forEach(p => {
        if (lower.includes(p.item.toLowerCase())) {
          if (!p.have) neededStaples.add(p.item);
        }
      });
    });
  });

  // Flag newly needed items
  neededStaples.forEach(name => {
    const idx = state.pantry.findIndex(p => p.item === name);
    if (idx >= 0) {
      state.pantry[idx].low = true;
      state.pantry[idx]._new = true;
    }
  });

  save('pantry', state.pantry);
}

function loadSeedData() {
  document.getElementById('farmersPickInput').value = SEED_FARMERS_PICK;
  document.getElementById('meatInput').value = SEED_MEAT;
  document.getElementById('leftoversInput').value = SEED_LEFTOVERS;
  toast('Sample data loaded — click "Generate Fortnight Plan"', 'info');
}

// ============================================================
// CLIPBOARD
// ============================================================

function copyToClipboard(elementId) {
  const text = document.getElementById(elementId).textContent;
  navigator.clipboard.writeText(text).then(() => {
    toast('Copied to clipboard', 'success');
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    toast('Copied to clipboard', 'success');
  });
}

// ============================================================
// THEME TOGGLE
// ============================================================

(function initTheme() {
  const toggle = document.getElementById('themeToggle');
  const root = document.documentElement;
  let theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  root.setAttribute('data-theme', theme);

  toggle.addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', theme);
    toggle.innerHTML = theme === 'dark'
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  });
})();

// ============================================================
// INIT
// ============================================================

function init() {
  // Load persisted data
  loadSettings();
  loadPantry();
  state.sessions = load('sessions') || [];
  state.mealHistory = load('mealHistory') || [];
  state.recipeLibrary = load('recipeLibrary') || [];
  state.recipeFeedback = load('recipeFeedback') || {};
  state.currentSession = load('currentSession') || null;
  state.currentMealPlan = load('currentMealPlan') || null;
  state.currentShoppingList = load('shoppingLists') || null;

  // Tab navigation
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Buttons
  document.getElementById('startFortnightBtn').addEventListener('click', startFortnight);
  document.getElementById('loadSeedBtn').addEventListener('click', loadSeedData);
  document.getElementById('settingsBtn').addEventListener('click', openSettings);
  document.getElementById('closeSettingsBtn').addEventListener('click', () => document.getElementById('settingsModal').style.display = 'none');
  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
  document.getElementById('addPantryItemBtn').addEventListener('click', () => document.getElementById('pantryModal').style.display = 'flex');
  document.getElementById('closePantryModal').addEventListener('click', () => document.getElementById('pantryModal').style.display = 'none');
  document.getElementById('savePantryItemBtn').addEventListener('click', addPantryItem);
  document.getElementById('closeCookMode').addEventListener('click', () => document.getElementById('cookModeModal').style.display = 'none');
  document.getElementById('exportShoppingBtn').addEventListener('click', exportShoppingDocx);
  document.getElementById('exportRecipesBtn').addEventListener('click', exportRecipesDocx);

  // Clipboard buttons
  document.getElementById('copyPlainBtn').addEventListener('click', () => copyToClipboard('wooliesPlainText'));
  document.getElementById('copyJSONBtn').addEventListener('click', () => copyToClipboard('wooliesJSON'));
  document.getElementById('copyPromptBtn').addEventListener('click', () => copyToClipboard('wooliesPrompt'));

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.style.display = 'none';
    });
  });

  // Restore previous session state if exists
  if (state.currentMealPlan) {
    renderMealPlan();
    renderRecipes();
    renderRateNotes();
    renderShoppingPreview();
    updateWooliesData();
    updateExportButtons();
  }
  if (state.currentSession) {
    generateStorageTable([...(state.currentSession.delivery || []), ...(state.currentSession.leftovers || [])]);
  }
  renderPantry();
}

document.addEventListener('DOMContentLoaded', init);
