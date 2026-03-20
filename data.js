/* ========================================
   data.js — Seed data, heuristics, recipes
   AU Family Dinner Planner
   ======================================== */

// --- Nut Blacklist ---
const NUT_BLACKLIST = [
  'almond','almonds','cashew','cashews','walnut','walnuts','pistachio','pistachios',
  'peanut','peanuts','pecan','pecans','macadamia','macadamias','hazelnut','hazelnuts',
  'pine nut','pine nuts','brazil nut','brazil nuts',
  'peanut butter','almond butter','cashew butter','hazelnut spread','nutella',
  'peanut oil','groundnut oil','nut oil','almond oil','walnut oil',
  'almond meal','almond flour','hazelnut meal','coconut almond',
  'satay sauce','satay','praline','marzipan','nougat','frangipane',
  'nut milk','almond milk','cashew milk','pistachio cream',
  'pesto with nuts','traditional pesto'
];

const NUT_HIGH_RISK_ITEMS = [
  'satay sauce','pesto','pad thai sauce','korma paste','mole sauce',
  'dukkah','granola','muesli','trail mix','energy balls',
  'some curry pastes','nougat','praline','baklava','frangipane',
  'panforte','nut-based milk','some protein bars'
];

// --- Protein Yield Factors ---
const YIELD_FACTORS = {
  'chicken breast': 0.75,
  'chicken thigh fillet': 0.75,
  'chicken thigh fillets': 0.75,
  'chicken thigh': 0.75,
  'boneless chicken': 0.75,
  'chicken drumstick': 0.50,
  'chicken drumsticks': 0.50,
  'bone-in chicken thigh': 0.55,
  'bone-in chicken thighs': 0.55,
  'beef steak': 0.70,
  'beef mince': 0.70,
  'lamb mince': 0.70,
  'pork mince': 0.70,
  'mince': 0.70,
  'pork loin': 0.70,
  'pork chop': 0.65,
  'pork steak': 0.70,
  'pork loin steaks': 0.70,
  'pork boneless': 0.70,
  'lamb chop': 0.55,
  'lamb cutlet': 0.55,
  'lamb shank': 0.50,
  'fish fillet': 0.80,
  'salmon fillet': 0.80,
  'salmon fillets': 0.80,
  'barramundi fillet': 0.80,
  'snapper fillet': 0.80,
  'prawns': 0.85,
  'tofu': 0.90,
  'default': 0.70
};

// --- Storage Heuristics ---
const STORAGE_RULES = {
  // Vegetables
  'broccoli':       { location: 'Fridge', howToStore: 'Unwashed in loose plastic bag, crisper drawer', life: '5–7 days', notes: 'Wrap stem end in damp paper towel', perishDays: 5 },
  'green beans':    { location: 'Fridge', howToStore: 'Paper towel-lined container, crisper', life: '4–6 days', notes: 'Don\'t wash until use', perishDays: 4 },
  'coriander':      { location: 'Fridge', howToStore: 'Stems in jar of water, loose bag over top', life: '5–7 days', notes: 'Change water every 2 days', perishDays: 4 },
  'cherry tomatoes': { location: 'Bench', howToStore: 'Room temp in single layer, stem side down', life: '5–7 days', notes: 'Fridge only if very ripe', perishDays: 5 },
  'tomatoes':       { location: 'Bench', howToStore: 'Room temp, stem side down', life: '5–7 days', notes: 'Fridge only if very ripe', perishDays: 5 },
  'zucchini':       { location: 'Fridge', howToStore: 'Unwashed in perforated bag, crisper', life: '5–7 days', notes: 'Avoid moisture', perishDays: 5 },
  'baby spinach':   { location: 'Fridge', howToStore: 'Original bag or container with paper towel', life: '3–5 days', notes: 'Very perishable — use early', perishDays: 2 },
  'spinach':        { location: 'Fridge', howToStore: 'Paper towel in container', life: '3–5 days', notes: 'Very perishable', perishDays: 2 },
  'carrots':        { location: 'Fridge', howToStore: 'Remove tops, store in sealed bag', life: '2–3 weeks', notes: 'Lasts well', perishDays: 14 },
  'cauliflower':    { location: 'Fridge', howToStore: 'Loose plastic wrap, stem side down', life: '5–7 days', notes: 'Cut florets last longer in container', perishDays: 6 },
  'mushrooms':      { location: 'Fridge', howToStore: 'Paper bag, never in plastic', life: '3–5 days', notes: 'Very perishable — use early', perishDays: 2 },
  'capsicum':       { location: 'Fridge', howToStore: 'Unwashed in crisper drawer', life: '7–10 days', notes: 'Green last longer than red/yellow', perishDays: 7 },
  'potatoes':       { location: 'Pantry', howToStore: 'Cool dark place, paper bag', life: '2–3 weeks', notes: 'Keep away from onions', perishDays: 14 },
  'sweet potato':   { location: 'Pantry', howToStore: 'Cool dark place, not in fridge', life: '1–2 weeks', notes: 'Don\'t refrigerate', perishDays: 10 },
  'onion':          { location: 'Pantry', howToStore: 'Cool dark place in mesh bag', life: '2–4 weeks', notes: 'Keep away from potatoes', perishDays: 21 },
  'onions':         { location: 'Pantry', howToStore: 'Cool dark place in mesh bag', life: '2–4 weeks', notes: 'Keep away from potatoes', perishDays: 21 },
  'garlic':         { location: 'Pantry', howToStore: 'Cool dark place, good airflow', life: '3–4 weeks', notes: 'Don\'t refrigerate whole bulbs', perishDays: 21 },
  'ginger':         { location: 'Fridge', howToStore: 'Unpeeled in zip bag, or freeze whole', life: '2–3 weeks fridge, months frozen', notes: 'Grate from frozen works well', perishDays: 14 },
  'corn':           { location: 'Fridge', howToStore: 'Husks on in crisper', life: '2–3 days', notes: 'Best eaten fresh', perishDays: 2 },
  'lettuce':        { location: 'Fridge', howToStore: 'Wrap in damp paper towel, bag', life: '3–5 days', notes: 'Keep dry, perishable', perishDays: 3 },
  'cucumber':       { location: 'Fridge', howToStore: 'Wrap in paper towel, bag', life: '5–7 days', notes: '', perishDays: 5 },
  'avocado':        { location: 'Bench', howToStore: 'Room temp until ripe, then fridge', life: '3–5 days', notes: 'Check daily for ripeness', perishDays: 3 },
  'beans':          { location: 'Fridge', howToStore: 'Paper towel-lined container', life: '4–6 days', notes: '', perishDays: 4 },
  'peas':           { location: 'Fridge', howToStore: 'In pod in bag, or shelled in container', life: '3–5 days', notes: 'Shell close to cooking', perishDays: 3 },
  'celery':         { location: 'Fridge', howToStore: 'Wrap in foil for crispness', life: '1–2 weeks', notes: 'Foil keeps it crunchier than plastic', perishDays: 10 },
  'kale':           { location: 'Fridge', howToStore: 'Damp paper towel in bag', life: '5–7 days', notes: '', perishDays: 4 },
  'bok choy':       { location: 'Fridge', howToStore: 'Loose in crisper, damp towel', life: '3–5 days', notes: 'Use early', perishDays: 3 },
  'spring onions':  { location: 'Fridge', howToStore: 'Damp paper towel in bag, or stems in water', life: '5–7 days', notes: '', perishDays: 5 },
  'leek':           { location: 'Fridge', howToStore: 'Unwashed in loose bag', life: '1–2 weeks', notes: '', perishDays: 10 },
  'pumpkin':        { location: 'Pantry', howToStore: 'Cool dark place, whole', life: '2–3 months whole', notes: 'Cut pumpkin: fridge, 5 days', perishDays: 30 },
  'eggplant':       { location: 'Fridge', howToStore: 'In crisper, not in plastic', life: '3–5 days', notes: '', perishDays: 4 },
  'asparagus':      { location: 'Fridge', howToStore: 'Stems in jar of water, bag over top', life: '3–5 days', notes: 'Treat like fresh flowers', perishDays: 3 },
  // Fruits
  'berries':        { location: 'Fridge', howToStore: 'Single layer in container, paper towel', life: '2–4 days', notes: 'Extremely perishable — eat first', perishDays: 1 },
  'strawberries':   { location: 'Fridge', howToStore: 'Don\'t wash until eating, paper towel lined', life: '3–5 days', notes: 'Very perishable', perishDays: 2 },
  'blueberries':    { location: 'Fridge', howToStore: 'Original punnet, paper towel layer', life: '5–7 days', notes: '', perishDays: 4 },
  'bananas':        { location: 'Bench', howToStore: 'Separate from other fruit', life: '3–5 days', notes: 'Fridge when ripe (skin browns but flesh fine)', perishDays: 3 },
  'apples':         { location: 'Fridge', howToStore: 'Crisper drawer, away from other fruit', life: '2–4 weeks', notes: 'Ethylene producer', perishDays: 14 },
  'oranges':        { location: 'Fridge', howToStore: 'Mesh bag in crisper', life: '2–3 weeks', notes: '', perishDays: 14 },
  'lemons':         { location: 'Fridge', howToStore: 'Sealed bag in fridge', life: '2–3 weeks', notes: 'Last much longer in fridge than bench', perishDays: 14 },
  'limes':          { location: 'Fridge', howToStore: 'Sealed bag', life: '1–2 weeks', notes: '', perishDays: 10 },
  'grapes':         { location: 'Fridge', howToStore: 'In bag with holes, don\'t wash until eating', life: '5–7 days', notes: '', perishDays: 5 },
  'pear':           { location: 'Bench', howToStore: 'Room temp until ripe, then fridge', life: '3–5 days room, 1 week fridge', notes: '', perishDays: 4 },
  'pears':          { location: 'Bench', howToStore: 'Room temp until ripe, then fridge', life: '3–5 days room, 1 week fridge', notes: '', perishDays: 4 },
  'mango':          { location: 'Bench', howToStore: 'Room temp until ripe, then fridge', life: '3–5 days', notes: '', perishDays: 3 },
  'kiwi':           { location: 'Fridge', howToStore: 'In crisper, separate from bananas', life: '1–2 weeks', notes: '', perishDays: 10 },
  'herbs':          { location: 'Fridge', howToStore: 'Stems in water, bag over top', life: '3–7 days', notes: 'Very perishable', perishDays: 3 },
  'basil':          { location: 'Bench', howToStore: 'Stems in water like flowers, room temp', life: '3–5 days', notes: 'Do NOT refrigerate — turns black', perishDays: 3 },
  'parsley':        { location: 'Fridge', howToStore: 'Stems in jar of water, bag over top', life: '5–7 days', notes: '', perishDays: 5 },
  'mint':           { location: 'Fridge', howToStore: 'Damp paper towel, bag', life: '3–5 days', notes: '', perishDays: 3 },
  'default':        { location: 'Fridge', howToStore: 'Sealed container or bag', life: '3–7 days', notes: 'Check daily', perishDays: 5 }
};

// --- Cuisine Types ---
const CUISINES = [
  'Italian','Asian','Mexican','Mediterranean','Indian','Thai',
  'Japanese','Middle Eastern','Australian/BBQ','Greek','Korean','French'
];

// --- Seed Recipe Library (nut-free) ---
const SEED_RECIPES = [
  {
    id: 'r001',
    title: 'Honey Soy Chicken Thigh Stir-Fry',
    cuisine: 'Asian',
    difficulty: 'easy',
    cookTime: 30,
    primaryProtein: { name: 'chicken thigh fillets', rawGrams: 900, pieces: null, yieldFactor: 0.75 },
    ingredients: [
      '900g chicken thigh fillets, sliced',
      '2 tbsp soy sauce',
      '1 tbsp honey',
      '1 tbsp sesame oil',
      '2 cloves garlic, minced',
      '1 tbsp fresh ginger, grated',
      '2x broccoli, cut into florets',
      '2x zucchini, sliced',
      '1 bunch bok choy or baby spinach',
      '2 cups jasmine rice',
      '1 tbsp vegetable oil',
      'Spring onions for garnish'
    ],
    steps: [
      'Cook jasmine rice according to packet directions.',
      'Mix soy sauce, honey, sesame oil, garlic, and ginger in a bowl.',
      'Heat vegetable oil in a large wok or pan over high heat until smoking.',
      'Add chicken in batches — don\'t crowd the pan. Sear 2–3 min per side until golden. Remove and set aside.',
      'In the same wok, stir-fry broccoli and zucchini for 3–4 minutes until tender-crisp.',
      'Return chicken to wok, pour over sauce. Toss 1–2 minutes until chicken is coated and sauce thickens slightly.',
      'Add bok choy or spinach in the last 30 seconds — just enough to wilt.',
      'Serve over rice, garnish with sliced spring onions.'
    ],
    stepIngredients: [
      ['2 cups jasmine rice'],
      ['2 tbsp soy sauce','1 tbsp honey','1 tbsp sesame oil','2 cloves garlic','1 tbsp ginger'],
      ['1 tbsp vegetable oil'],
      ['900g chicken thigh fillets'],
      ['2x broccoli','2x zucchini'],
      ['chicken','sauce'],
      ['bok choy or baby spinach'],
      ['spring onions']
    ],
    meatTip: 'Velvet the chicken: toss sliced thigh in 1 tsp cornflour + 1 tsp soy + 1 tsp oil for 10 min before cooking. This creates a silky coating that keeps the chicken incredibly juicy during high-heat stir-frying.',
    toddlerAdjust: 'Remove toddler portion before adding soy sauce in step 6. Cut chicken into small strips. Serve rice with plain steamed veg on the side. The honey glaze is fine — just skip the soy for less sodium.',
    tips: 'Wok must be screaming hot for proper sear. If your stovetop is weak, cook chicken in two small batches instead of one crowded one — crowding steams the meat instead of searing it.',
    leftoverHandling: 'Store rice and stir-fry separately. Reheat chicken + veg in a hot pan (not microwave — it goes rubbery). Rice can be microwaved with a splash of water.',
    timers: [null, null, null, '2–3 min per side', '3–4 min', '1–2 min', '30 sec', null]
  },
  {
    id: 'r002',
    title: 'Beef Mince Bolognese with Hidden Veg',
    cuisine: 'Italian',
    difficulty: 'easy',
    cookTime: 45,
    primaryProtein: { name: 'beef mince', rawGrams: 800, pieces: null, yieldFactor: 0.70 },
    ingredients: [
      '800g beef mince',
      '1x onion, finely diced',
      '3 cloves garlic, minced',
      '2x carrots, grated',
      '2x zucchini, grated',
      '400g can crushed tomatoes',
      '2 tbsp tomato paste',
      '1 tsp dried oregano',
      '1 tsp dried basil',
      '1/2 cup beef stock',
      '500g spaghetti or penne',
      'Olive oil',
      'Salt and pepper',
      'Parmesan to serve'
    ],
    steps: [
      'Heat olive oil in a large deep pan over medium-high heat.',
      'Add beef mince, breaking it up with a wooden spoon. Cook 5–6 min until browned. Don\'t stir constantly — let it develop colour. Drain excess fat.',
      'Add diced onion and garlic, cook 2–3 min until softened.',
      'Add grated carrot and zucchini. Cook 3–4 min until softened and starting to break down (the toddler won\'t notice them).',
      'Add crushed tomatoes, tomato paste, oregano, basil, and beef stock. Stir well.',
      'Reduce heat to low, simmer uncovered for 20–25 min, stirring occasionally, until sauce is thick and rich.',
      'Meanwhile, cook pasta in salted boiling water according to packet. Reserve 1 cup pasta water before draining.',
      'Toss pasta through sauce, adding a splash of pasta water to loosen if needed.',
      'Serve with parmesan.'
    ],
    stepIngredients: [
      ['olive oil'],
      ['800g beef mince'],
      ['1x onion','3 cloves garlic'],
      ['2x carrots','2x zucchini'],
      ['400g crushed tomatoes','2 tbsp tomato paste','oregano','basil','beef stock'],
      [],
      ['500g spaghetti or penne'],
      ['pasta','sauce'],
      ['parmesan']
    ],
    meatTip: 'Don\'t break the mince up too much initially. Let it sit in the pan undisturbed for 2 minutes to get a proper Maillard crust on the bottom — this is where deep meaty flavour comes from. Then break and stir.',
    toddlerAdjust: 'Use small pasta shapes (spirals or risoni). Separate toddler portion before final seasoning. The grated veg hides perfectly in the sauce — no texture issues.',
    tips: 'The reserved pasta water is liquid gold — it\'s starchy and helps the sauce cling to the pasta. Add it gradually.',
    leftoverHandling: 'Bolognese keeps beautifully for 3 days fridge or 3 months frozen. Reheat gently with a splash of water. Cook fresh pasta for leftovers if you prefer.',
    timers: [null, '5–6 min', '2–3 min', '3–4 min', null, '20–25 min', null, null, null]
  },
  {
    id: 'r003',
    title: 'Mexican Chicken Burrito Bowls',
    cuisine: 'Mexican',
    difficulty: 'medium',
    cookTime: 40,
    primaryProtein: { name: 'chicken thigh fillets', rawGrams: 900, pieces: null, yieldFactor: 0.75 },
    ingredients: [
      '900g chicken thigh fillets',
      '2 tsp smoked paprika',
      '1 tsp cumin',
      '1 tsp garlic powder',
      '1/2 tsp chilli flakes (optional)',
      '2 cups long grain rice',
      '400g can black beans, drained',
      '1 punnet cherry tomatoes, halved',
      '1 avocado, sliced',
      '1/2 cup sour cream',
      '1 lime, juiced',
      'Bag of baby spinach or lettuce',
      'Olive oil',
      'Salt and pepper'
    ],
    steps: [
      'Mix paprika, cumin, garlic powder, chilli flakes (set aside chilli for after toddler portion), salt and pepper. Rub over chicken thighs.',
      'Cook rice according to packet directions. Fluff with lime juice when done.',
      'Heat olive oil in a large pan over medium-high heat. Cook chicken thighs 5–6 min per side until charred and cooked through (internal 75°C).',
      'Rest chicken 5 min, then slice thickly.',
      'Warm black beans in a small pot or microwave with a pinch of cumin.',
      'Assemble bowls: rice base, sliced chicken, black beans, cherry tomatoes, avocado, spinach/lettuce.',
      'Top with sour cream and extra lime.'
    ],
    stepIngredients: [
      ['paprika','cumin','garlic powder','chilli flakes'],
      ['2 cups rice','lime'],
      ['olive oil','chicken thighs'],
      ['chicken'],
      ['400g black beans','cumin'],
      ['rice','chicken','beans','tomatoes','avocado','spinach'],
      ['sour cream','lime']
    ],
    meatTip: 'Score the thickest part of each thigh with 2–3 shallow cuts before rubbing in the spice mix. This lets the seasoning penetrate deeper and ensures even cooking — no raw centre on thick pieces.',
    toddlerAdjust: 'Set aside toddler chicken before adding chilli flakes to the spice mix. Cut into small pieces. Mash a little avocado and black beans together for an easy toddler side. Skip sour cream if preferred.',
    tips: 'Letting the chicken rest after cooking is non-negotiable. Cutting immediately releases all the juices onto the board instead of staying in the meat.',
    leftoverHandling: 'Store components separately. Chicken reheats well in a pan. Avocado doesn\'t store well — add fresh the next day or skip for lunch leftovers.',
    timers: [null, null, '5–6 min per side', '5 min rest', null, null, null]
  },
  {
    id: 'r004',
    title: 'One-Pan Roast Drumsticks with Root Veg',
    cuisine: 'Australian/BBQ',
    difficulty: 'easy',
    cookTime: 50,
    primaryProtein: { name: 'chicken drumsticks', rawGrams: 1200, pieces: 10, yieldFactor: 0.50 },
    ingredients: [
      '10x chicken drumsticks (~1.2kg)',
      '1kg potatoes, quartered',
      '2x carrots, chunked',
      '1x sweet potato, chunked',
      '1x onion, wedged',
      '4 cloves garlic, whole',
      '2 tbsp olive oil',
      '1 tsp paprika',
      '1 tsp dried thyme',
      '1 tsp garlic powder',
      'Salt and pepper'
    ],
    steps: [
      'Preheat oven to 200°C fan-forced.',
      'Toss potato, carrot, sweet potato, onion, and garlic cloves in 1 tbsp olive oil, salt, pepper, and thyme in a large roasting pan.',
      'Pat drumsticks dry with paper towel. Rub with remaining olive oil, paprika, garlic powder, salt, and pepper.',
      'Nestle drumsticks on top of vegetables — don\'t bury them (skin needs to be exposed to heat).',
      'Roast 45–50 min until drumstick skin is crispy and golden, and internal temp reaches 75°C.',
      'Rest 5 min. Serve drumsticks on a bed of roast veg.'
    ],
    stepIngredients: [
      [],
      ['potatoes','carrots','sweet potato','onion','garlic','olive oil','thyme'],
      ['drumsticks','olive oil','paprika','garlic powder'],
      ['drumsticks','vegetables'],
      [],
      []
    ],
    meatTip: 'Pat drumsticks bone-dry with paper towel before seasoning — moisture is the enemy of crispy skin. For extra crunch, score the skin side with 2 diagonal slashes. This renders the fat better and lets seasoning penetrate.',
    toddlerAdjust: 'Pull meat off the bone and shred for toddler. The roast veg is soft enough to serve as-is. Go easy on salt when seasoning — you can always add salt at the table for adults.',
    tips: 'Elevating the drumsticks on top of veg means the fat drips down and bastes the vegetables. The veg essentially cook in chicken fat — which is why they taste incredible.',
    leftoverHandling: 'Cold drumsticks are great in lunchboxes. Reheat in oven at 180°C for 10 min to re-crisp skin. Roast veg can be pan-fried with a splash of oil for a crispy hash.',
    timers: [null, null, null, null, '45–50 min', '5 min rest']
  },
  {
    id: 'r005',
    title: 'Thai Basil Pork (Pad Krapow)',
    cuisine: 'Thai',
    difficulty: 'easy',
    cookTime: 25,
    primaryProtein: { name: 'pork mince', rawGrams: 800, pieces: null, yieldFactor: 0.70 },
    ingredients: [
      '800g pork mince (or use pork loin steaks, finely diced)',
      '4 cloves garlic, minced',
      '2 long red chillies, sliced (optional)',
      '2 tbsp soy sauce',
      '1 tbsp oyster sauce',
      '1 tbsp fish sauce',
      '1 tsp sugar',
      '1 large bunch fresh basil leaves',
      '2x zucchini, diced small',
      '1 bag baby spinach',
      '2 cups jasmine rice',
      '4 eggs (for fried eggs on top)',
      'Vegetable oil'
    ],
    steps: [
      'Cook jasmine rice according to packet.',
      'Heat a generous amount of vegetable oil in a wok or large pan over very high heat.',
      'Add garlic and chilli (set chilli aside for toddler portion). Stir-fry 30 seconds until fragrant — not burnt.',
      'Add pork mince. Cook 4–5 min, breaking up, until browned and slightly crispy on edges.',
      'Add diced zucchini, cook 2 min.',
      'Add soy sauce, oyster sauce, fish sauce, and sugar. Toss well for 1 min.',
      'Kill the heat. Fold in basil leaves and spinach — they\'ll wilt in residual heat.',
      'In a separate pan, fry eggs sunny side up in a little oil.',
      'Serve pork mixture over rice, topped with a fried egg.'
    ],
    stepIngredients: [
      ['2 cups jasmine rice'],
      ['vegetable oil'],
      ['4 cloves garlic','chillies'],
      ['800g pork mince'],
      ['2x zucchini'],
      ['soy sauce','oyster sauce','fish sauce','sugar'],
      ['basil leaves','baby spinach'],
      ['4 eggs','oil'],
      []
    ],
    meatTip: 'Get the mince really crispy — don\'t stir it for the first 2 minutes. Let it sit and develop a crust on the bottom of the wok. This textural contrast (crispy edges, tender centre) is what makes pad krapow so addictive in Thai street stalls.',
    toddlerAdjust: 'Set aside toddler portion before adding chilli and fish sauce (high sodium). A small portion of the plain seasoned pork with rice and wilted spinach is perfect. Skip the fried egg if toddler doesn\'t like runny yolk.',
    tips: 'The basil must go in OFF the heat — it should wilt but not cook. Overcooked basil turns black and bitter. Use Thai basil if you can find it at an Asian grocer, but regular basil works fine.',
    leftoverHandling: 'Reheats brilliantly in a hot pan. Don\'t microwave — the texture suffers. Skip the egg for leftovers or fry a fresh one.',
    timers: [null, null, '30 sec', '4–5 min', '2 min', '1 min', null, null, null]
  },
  {
    id: 'r006',
    title: 'Salmon with Lemon Herb Crust and Smashed Potatoes',
    cuisine: 'Mediterranean',
    difficulty: 'complex',
    cookTime: 45,
    primaryProtein: { name: 'salmon fillets', rawGrams: 800, pieces: 4, yieldFactor: 0.80 },
    ingredients: [
      '4x salmon fillets (~200g each)',
      '1kg baby potatoes',
      '2x broccoli heads, cut into florets',
      '2 lemons (1 zested + juiced, 1 sliced)',
      '2 tbsp olive oil',
      '2 cloves garlic, minced',
      '2 tbsp fresh parsley, chopped',
      '1 tbsp fresh dill or thyme',
      '1/4 cup breadcrumbs (check nut-free)',
      '2 tbsp butter',
      'Salt and pepper'
    ],
    steps: [
      'Boil baby potatoes in salted water 15–18 min until fork-tender. Drain.',
      'Using a glass or your palm, gently smash each potato to about 1cm thick. Drizzle with olive oil, salt, pepper.',
      'Place smashed potatoes on a lined baking tray. Grill/broil at 220°C for 10–12 min until crispy and golden.',
      'While potatoes crisp, mix breadcrumbs, lemon zest, garlic, parsley, dill, 1 tbsp olive oil, salt and pepper.',
      'Pat salmon dry. Season with salt and pepper. Press herb crust mixture onto the top of each fillet.',
      'Heat a pan over medium-high heat with a little oil. Place salmon crust-side UP, skin-side down. Cook 3–4 min until skin is crispy.',
      'Flip gently, cook crust-side down for 2 min until golden. Or finish in oven at 200°C for 5 min.',
      'Steam or blanch broccoli florets 3–4 min until bright green and tender-crisp.',
      'Serve salmon on smashed potatoes with broccoli and lemon wedges. Finish with a knob of butter on the potatoes.'
    ],
    stepIngredients: [
      ['1kg baby potatoes'],
      ['olive oil','salt','pepper'],
      ['smashed potatoes'],
      ['breadcrumbs','lemon zest','garlic','parsley','dill','olive oil'],
      ['4x salmon fillets','herb crust'],
      ['oil','salmon'],
      ['salmon'],
      ['broccoli'],
      ['butter','lemon']
    ],
    meatTip: 'Temper the salmon: take fillets out of the fridge 15–20 min before cooking. Cold fish in a hot pan contracts and squeezes out moisture. Room-temp fish cooks more evenly and stays juicier. Also, pat bone-dry before seasoning.',
    toddlerAdjust: 'Salmon is excellent for toddlers — omega-3 rich. Remove any visible bones. Serve a plain portion without the breadcrumb crust if texture is an issue. Mash some potato and broccoli together.',
    tips: 'The secret to crispy salmon skin: dry skin + hot pan + don\'t touch it. Press down gently with a spatula for the first 30 sec to prevent curling, then leave it alone.',
    leftoverHandling: 'Leftover salmon is delicious cold on a salad. Smashed potatoes reheat well in a hot pan with butter. Don\'t microwave salmon — it dries out and smells up the office.',
    timers: ['15–18 min', null, '10–12 min', null, null, '3–4 min', '2–5 min', '3–4 min', null]
  },
  {
    id: 'r007',
    title: 'Lamb Mince Kofta with Roast Cauliflower and Yoghurt',
    cuisine: 'Middle Eastern',
    difficulty: 'complex',
    cookTime: 50,
    primaryProtein: { name: 'lamb mince', rawGrams: 800, pieces: null, yieldFactor: 0.70 },
    ingredients: [
      '800g lamb mince',
      '1 head cauliflower, broken into florets',
      '1x onion, grated',
      '3 cloves garlic, minced',
      '2 tsp cumin',
      '1 tsp coriander (ground)',
      '1 tsp paprika',
      '1/2 tsp cinnamon',
      'Handful fresh parsley, chopped',
      '200g Greek yoghurt',
      '1 lemon, juiced',
      '2 tbsp olive oil',
      'Flatbreads or rice',
      'Salt and pepper'
    ],
    steps: [
      'Preheat oven to 200°C fan-forced.',
      'Toss cauliflower florets in 1 tbsp olive oil, 1 tsp cumin, salt and pepper. Spread on a lined tray. Roast 25–30 min until charred on edges.',
      'In a large bowl, combine lamb mince, grated onion, garlic, remaining cumin, coriander, paprika, cinnamon, half the parsley, salt and pepper. Mix with your hands until just combined — don\'t overwork.',
      'Form into 12–14 oval kofta shapes, roughly 2 fingers thick.',
      'Heat remaining olive oil in a large pan over medium-high heat. Cook kofta in batches, 3–4 min per side, until well browned and cooked through.',
      'Mix yoghurt with lemon juice, a pinch of salt, and remaining parsley.',
      'Serve kofta with roast cauliflower, yoghurt sauce, and warmed flatbreads or rice.'
    ],
    stepIngredients: [
      [],
      ['cauliflower','olive oil','cumin','salt','pepper'],
      ['lamb mince','onion','garlic','cumin','coriander','paprika','cinnamon','parsley'],
      ['lamb mixture'],
      ['olive oil','kofta'],
      ['yoghurt','lemon juice','parsley'],
      ['kofta','cauliflower','yoghurt','flatbreads']
    ],
    meatTip: 'Grate the onion instead of dicing it — the onion juice mixes into the mince and keeps the kofta incredibly moist. Also, refrigerate the formed kofta for 15 min before cooking — they hold shape better in the pan.',
    toddlerAdjust: 'Kofta are perfect toddler food — easy to hold, well-flavoured. Make a few smaller ones for little hands. Skip the yoghurt sauce if toddler dislikes tanginess, or just offer a small dip. Serve with soft flatbread torn into strips.',
    tips: 'Don\'t overwork the mince — it makes kofta dense and tough. Mix until just combined, like you\'re folding laundry, not kneading bread.',
    leftoverHandling: 'Kofta reheat well in a pan or oven. Great cold in lunchboxes with a wrap and salad. Cauliflower reheats beautifully at 180°C for 8 min.',
    timers: [null, '25–30 min', null, null, '3–4 min per side', null, null]
  },
  {
    id: 'r008',
    title: 'Japanese-Style Teriyaki Chicken with Sticky Rice',
    cuisine: 'Japanese',
    difficulty: 'medium',
    cookTime: 35,
    primaryProtein: { name: 'chicken thigh fillets', rawGrams: 900, pieces: null, yieldFactor: 0.75 },
    ingredients: [
      '900g chicken thigh fillets',
      '3 tbsp soy sauce',
      '2 tbsp mirin',
      '1 tbsp honey',
      '1 tsp sesame oil',
      '2 cloves garlic, minced',
      '1 tbsp fresh ginger, grated',
      '2 cups sushi or short-grain rice',
      '2x zucchini, sliced into rounds',
      '200g green beans, trimmed',
      '1 tbsp vegetable oil',
      'Sesame seeds and spring onions to garnish'
    ],
    steps: [
      'Wash sushi rice until water runs clear. Cook according to packet or rice cooker.',
      'Mix soy sauce, mirin, honey, sesame oil, garlic, and ginger for the teriyaki sauce.',
      'Heat vegetable oil in a large pan over medium-high heat.',
      'Add chicken thighs (whole, not sliced). Cook 5–6 min per side until golden brown and cooked through.',
      'In the last 2 minutes, pour teriyaki sauce into the pan. Let it bubble and reduce, turning chicken to coat — it should become glossy and sticky.',
      'Remove chicken, rest 3 min, then slice on the diagonal.',
      'In the same pan (don\'t wash it), quickly toss zucchini and green beans in the residual sauce for 3–4 min.',
      'Serve sliced chicken over rice, with glazed veg on the side. Sprinkle sesame seeds and spring onions.'
    ],
    stepIngredients: [
      ['2 cups sushi rice'],
      ['soy sauce','mirin','honey','sesame oil','garlic','ginger'],
      ['vegetable oil'],
      ['900g chicken thigh fillets'],
      ['teriyaki sauce'],
      ['chicken'],
      ['zucchini','green beans'],
      ['sesame seeds','spring onions']
    ],
    meatTip: 'Cook the thighs whole and slice after resting — this keeps maximum juice inside. If you slice before cooking, the smaller pieces lose moisture much faster. Also, deglaze the pan with the teriyaki sauce — all that brown fond on the bottom is concentrated flavour.',
    toddlerAdjust: 'The teriyaki glaze has quite a bit of sodium from soy. Set aside a small portion of plain cooked chicken before adding sauce. Serve with plain rice and some steamed veg.',
    tips: 'Real teriyaki is just soy + mirin + sugar, reduced to a glaze. The commercial bottled stuff is thick and corn-syrupy. Making it from scratch takes 2 minutes and tastes ten times better.',
    leftoverHandling: 'Teriyaki chicken is excellent cold. Rice reheats well with a splash of water in the microwave. Pack in separate containers for lunch.',
    timers: [null, null, null, '5–6 min per side', '2 min', '3 min rest', '3–4 min', null]
  },
  {
    id: 'r009',
    title: 'Slow-Cooked Indian Butter Chicken (Stovetop)',
    cuisine: 'Indian',
    difficulty: 'complex',
    cookTime: 55,
    primaryProtein: { name: 'chicken thigh fillets', rawGrams: 1000, pieces: null, yieldFactor: 0.75 },
    ingredients: [
      '1kg chicken thigh fillets, cubed',
      '2 tbsp butter',
      '1 tbsp vegetable oil',
      '1x onion, finely diced',
      '4 cloves garlic, minced',
      '2 tbsp fresh ginger, grated',
      '2 tbsp tomato paste',
      '400g can crushed tomatoes',
      '200ml cream (or coconut cream)',
      '2 tsp garam masala',
      '1 tsp turmeric',
      '1 tsp cumin',
      '1 tsp smoked paprika',
      '1/2 tsp chilli powder (optional)',
      '1 tsp sugar',
      '2 cups basmati rice',
      'Fresh coriander to serve',
      'Salt and pepper'
    ],
    steps: [
      'Start basmati rice — rinse until clear, cook according to packet.',
      'Heat butter and oil in a large deep pan over medium-high heat.',
      'Season chicken with salt, turmeric, and half the garam masala. Add to pan and sear 3–4 min until golden on all sides. Don\'t cook through — just colour. Remove and set aside.',
      'In the same pan, cook onion 4–5 min until soft and translucent. Add garlic and ginger, cook 1 min until fragrant.',
      'Temper the spices: add remaining garam masala, cumin, paprika, and chilli powder (set aside chilli for after toddler portion). Toast in the oil for 30–60 seconds until aromatic — this blooms the spices and deepens the flavour massively.',
      'Add tomato paste, cook 1 min. Add crushed tomatoes and sugar. Stir well.',
      'Return chicken and any resting juices. Reduce heat to low, cover, simmer 25–30 min until chicken is falling-apart tender and sauce has thickened.',
      'Stir in cream. Simmer uncovered 5 min. Taste and adjust salt.',
      'Serve over basmati rice, garnished with fresh coriander.'
    ],
    stepIngredients: [
      ['2 cups basmati rice'],
      ['2 tbsp butter','1 tbsp vegetable oil'],
      ['chicken thigh fillets','turmeric','garam masala'],
      ['onion','garlic','ginger'],
      ['garam masala','cumin','paprika','chilli powder'],
      ['tomato paste','crushed tomatoes','sugar'],
      ['chicken'],
      ['cream'],
      ['fresh coriander']
    ],
    meatTip: 'Tempering spices (step 5) is the difference between flat-tasting curry and restaurant-quality. Dry spices need to hit hot oil/fat for 30–60 seconds to release their essential oils. You\'ll smell the transformation — that\'s when you know they\'re ready. Don\'t skip this.',
    toddlerAdjust: 'Butter chicken is usually toddler-friendly — it\'s mild and creamy. Remove toddler portion before adding chilli powder. The sauce is soft enough to eat with rice. Cut chicken into small pieces.',
    tips: 'Finish with a squeeze of lemon juice right before serving — the acid brightens the entire dish. A tablespoon of kasuri methi (dried fenugreek leaves), crumbled in at the cream stage, gives authentic restaurant flavour.',
    leftoverHandling: 'Butter chicken is one of the best leftover meals — it improves overnight as flavours meld. Reheat gently. Cook fresh rice or use naan. Freezes beautifully for up to 3 months.',
    timers: [null, null, '3–4 min', '4–5 min + 1 min', '30–60 sec', '1 min', '25–30 min', '5 min', null]
  },
  {
    id: 'r010',
    title: 'Greek Lamb Mince with Roasted Vegetables and Tzatziki',
    cuisine: 'Greek',
    difficulty: 'medium',
    cookTime: 45,
    primaryProtein: { name: 'lamb mince', rawGrams: 800, pieces: null, yieldFactor: 0.70 },
    ingredients: [
      '800g lamb mince',
      '2x zucchini, chunked',
      '1x capsicum, chunked',
      '1 punnet cherry tomatoes',
      '1x red onion, wedged',
      '2 tbsp olive oil',
      '2 tsp dried oregano',
      '1 tsp garlic powder',
      '1 lemon, juiced',
      '200g Greek yoghurt',
      '1/2 cucumber, grated',
      '1 clove garlic, minced',
      'Flatbreads or pita',
      'Salt and pepper'
    ],
    steps: [
      'Preheat oven to 200°C fan-forced.',
      'Toss zucchini, capsicum, cherry tomatoes, and red onion in 1 tbsp olive oil, 1 tsp oregano, salt and pepper. Spread on a lined tray. Roast 25–30 min.',
      'Make tzatziki: grate cucumber, squeeze out excess moisture in a clean tea towel. Mix with yoghurt, minced garlic, half the lemon juice, and a pinch of salt.',
      'Heat remaining olive oil in a large pan over high heat. Add lamb mince in a flat layer — don\'t stir for 2–3 min to get a proper crust.',
      'Break up lamb, add remaining oregano, garlic powder, salt, pepper. Cook 5–6 more min until well browned and slightly crispy.',
      'Squeeze remaining lemon juice over the lamb. Toss.',
      'Serve lamb mince with roast veg, a generous dollop of tzatziki, and warmed flatbreads.'
    ],
    stepIngredients: [
      [],
      ['zucchini','capsicum','cherry tomatoes','red onion','olive oil','oregano'],
      ['cucumber','yoghurt','garlic','lemon juice'],
      ['olive oil','lamb mince'],
      ['lamb','oregano','garlic powder'],
      ['lemon juice'],
      ['lamb','roast veg','tzatziki','flatbreads']
    ],
    meatTip: 'Lamb mince has a higher fat content than beef — use this to your advantage. Let it render in a dry pan (no added oil) for the first 2 minutes to crisp up. The lamb fat is incredibly flavourful. Drain only if excessive.',
    toddlerAdjust: 'Lamb mince is soft and easy to chew. The roast veg are soft enough for a toddler. Offer tzatziki as a dip — most toddlers love it. Tear flatbread into strips for dipping.',
    tips: 'Squeezing the grated cucumber dry is essential for tzatziki — skip this and you get watery sauce. Wrap it in a tea towel and wring hard.',
    leftoverHandling: 'Lamb mince reheats well in a pan. Roast veg can be warmed in the oven. Tzatziki keeps 2 days in fridge. Pack together in a container for a Mediterranean lunch bowl.',
    timers: [null, '25–30 min', null, '2–3 min', '5–6 min', null, null]
  },
  {
    id: 'r011',
    title: 'Pork Loin Steaks with Apple Slaw and Sweet Potato Mash',
    cuisine: 'Australian/BBQ',
    difficulty: 'medium',
    cookTime: 40,
    primaryProtein: { name: 'pork loin steaks', rawGrams: 800, pieces: 4, yieldFactor: 0.70 },
    ingredients: [
      '800g pork loin steaks (4 steaks)',
      '3x sweet potatoes, peeled and cubed',
      '2 tbsp butter',
      '1 apple, julienned',
      '1/4 cabbage, finely shredded',
      '1 carrot, grated',
      '2 tbsp apple cider vinegar',
      '1 tbsp honey',
      '1 tbsp olive oil',
      '1 tsp smoked paprika',
      '1 tsp garlic powder',
      'Salt and pepper'
    ],
    steps: [
      'Boil sweet potato in salted water 12–15 min until very tender. Drain.',
      'Mash sweet potato with butter, salt and pepper until smooth.',
      'Meanwhile, make the slaw: toss julienned apple, shredded cabbage, and grated carrot with apple cider vinegar, honey, a pinch of salt.',
      'Pat pork steaks dry. Season both sides with smoked paprika, garlic powder, salt, pepper.',
      'Heat olive oil in a large pan over medium-high heat. Cook pork steaks 3–4 min per side until golden and just cooked through — slightly pink in the centre is fine and preferred.',
      'Rest 3 min before serving.',
      'Plate: sweet potato mash, sliced pork, apple slaw on the side.'
    ],
    stepIngredients: [
      ['3x sweet potatoes'],
      ['butter','salt','pepper'],
      ['apple','cabbage','carrot','apple cider vinegar','honey'],
      ['pork loin steaks','paprika','garlic powder'],
      ['olive oil','pork steaks'],
      [],
      []
    ],
    meatTip: 'Pork loin is lean and overcooks fast. Pull it OFF the heat when it still looks slightly underdone — carryover heat during the rest will finish it to perfect. Use a meat thermometer: 63°C internal, then rest to reach 65°C. Anything above 70°C and it\'s shoe leather.',
    toddlerAdjust: 'Sweet potato mash is excellent toddler food. Cut pork into small, thin strips. The apple slaw may need to be finely chopped for a 2-year-old. Serve the apple pieces soft-side up.',
    tips: 'The apple slaw is deliberately raw and crunchy — it cuts through the richness of the pork and mash. Don\'t dress it too early or the apple oxidises and the cabbage goes limp.',
    leftoverHandling: 'Pork slices cold on sandwiches are excellent. Sweet potato mash can be reheated with a splash of milk. Apple slaw doesn\'t keep well — make fresh if needed.',
    timers: ['12–15 min', null, null, null, '3–4 min per side', '3 min rest', null]
  },
  {
    id: 'r012',
    title: 'Korean-Style Beef Mince Bibimbap',
    cuisine: 'Korean',
    difficulty: 'complex',
    cookTime: 45,
    primaryProtein: { name: 'beef mince', rawGrams: 800, pieces: null, yieldFactor: 0.70 },
    ingredients: [
      '800g beef mince',
      '3 tbsp soy sauce',
      '1 tbsp sesame oil',
      '2 tbsp gochujang (Korean chilli paste) — check nut-free',
      '1 tbsp honey',
      '3 cloves garlic, minced',
      '2 cups short-grain rice',
      '200g mushrooms, sliced',
      '2x zucchini, julienned',
      '2x carrots, julienned',
      'Bag of baby spinach',
      '4 eggs',
      '1 tbsp vegetable oil',
      'Sesame seeds',
      'Spring onions'
    ],
    steps: [
      'Cook short-grain rice according to packet.',
      'Mix soy sauce, sesame oil, gochujang (set aside 1 tbsp for adult topping), honey, and garlic.',
      'Heat vegetable oil in a large pan over high heat. Cook beef mince 5–6 min until well browned and slightly crispy.',
      'Add half the sauce to the mince, toss well. Remove and set aside.',
      'In the same pan (add a little more oil if needed), quickly sauté mushrooms 3 min until golden. Set aside.',
      'Quickly sauté julienned carrots and zucchini 2–3 min. Set aside.',
      'Wilt baby spinach in the pan 30 seconds, season with a drizzle of sesame oil.',
      'Fry eggs sunny-side up.',
      'Assemble bowls: rice base, arrange beef, mushrooms, zucchini, carrot, spinach in sections. Top with fried egg, sesame seeds, spring onions, extra gochujang on the side.'
    ],
    stepIngredients: [
      ['2 cups short-grain rice'],
      ['soy sauce','sesame oil','gochujang','honey','garlic'],
      ['vegetable oil','beef mince'],
      ['sauce','mince'],
      ['mushrooms'],
      ['carrots','zucchini'],
      ['baby spinach','sesame oil'],
      ['4 eggs'],
      ['all components','sesame seeds','spring onions','gochujang']
    ],
    meatTip: 'For bibimbap, you want the mince to be crumbly and slightly crispy — not wet and clumpy. Spread it flat in the pan and leave it undisturbed for 2 min before breaking up. Drain any excess liquid before adding sauce.',
    toddlerAdjust: 'Remove toddler portion of mince before adding gochujang (it\'s spicy). Serve with plain rice, sautéed veg (no sesame seeds for very young toddlers — choking risk), and a soft egg. All the individual components work well for toddler finger food.',
    tips: 'The magic of bibimbap is mixing everything together with the sauce and runny egg yolk right before eating. Serve with a side of the remaining gochujang for adults who want more heat.',
    leftoverHandling: 'Pack components separately for lunch. Reheat mince and veg in a pan. Fresh egg makes all the difference — fry a new one if possible.',
    timers: [null, null, '5–6 min', null, '3 min', '2–3 min', '30 sec', null, null]
  }
];

// --- Seed Sample Input Data ---
const SEED_FARMERS_PICK = `2x broccoli
500g green beans
1 bunch coriander
punnet cherry tomatoes
4x zucchini
bag baby spinach
1kg carrots
head cauliflower
3x potatoes
2x sweet potatoes
1 capsicum
200g mushrooms
1 cucumber
2x onions
1 head garlic
knob fresh ginger
1 bunch spring onions
1 lemon
2x apples
punnet strawberries
1/4 cabbage`;

const SEED_MEAT = `1kg chicken thigh fillets
500g beef mince
10x chicken drumsticks
600g pork loin steaks
500g lamb mince
4x salmon fillets`;

const SEED_LEFTOVERS = `3x potatoes
1 sweet potato
half bag spinach
200g mushrooms`;

// --- Default Pantry Staples ---
const DEFAULT_PANTRY = [
  { item: 'Olive oil', category: 'Oil & Vinegar', have: true, qty: '1 bottle', low: false, notes: '' },
  { item: 'Vegetable oil', category: 'Oil & Vinegar', have: true, qty: '1 bottle', low: false, notes: '' },
  { item: 'Sesame oil', category: 'Oil & Vinegar', have: true, qty: '1 bottle', low: false, notes: 'Asian aisle' },
  { item: 'Soy sauce', category: 'Sauce & Condiment', have: true, qty: '1 bottle', low: false, notes: '' },
  { item: 'Fish sauce', category: 'Sauce & Condiment', have: true, qty: '1 bottle', low: false, notes: '' },
  { item: 'Oyster sauce', category: 'Sauce & Condiment', have: true, qty: '1 bottle', low: false, notes: '' },
  { item: 'Tomato paste', category: 'Sauce & Condiment', have: true, qty: '2 tubes', low: false, notes: '' },
  { item: 'Honey', category: 'Sauce & Condiment', have: true, qty: '1 jar', low: false, notes: '' },
  { item: 'Apple cider vinegar', category: 'Oil & Vinegar', have: true, qty: '1 bottle', low: false, notes: '' },
  { item: 'Mirin', category: 'Sauce & Condiment', have: true, qty: '1 bottle', low: false, notes: 'Asian aisle at Woolies' },
  { item: 'Gochujang', category: 'Sauce & Condiment', have: false, qty: '1 tub', low: false, notes: 'Korean chilli paste — Asian aisle or Asian grocer' },
  { item: 'Salt', category: 'Spices', have: true, qty: '1 container', low: false, notes: '' },
  { item: 'Black pepper', category: 'Spices', have: true, qty: '1 grinder', low: false, notes: '' },
  { item: 'Smoked paprika', category: 'Spices', have: true, qty: '1 jar', low: false, notes: '' },
  { item: 'Cumin', category: 'Spices', have: true, qty: '1 jar', low: false, notes: '' },
  { item: 'Garam masala', category: 'Spices', have: true, qty: '1 jar', low: false, notes: '' },
  { item: 'Turmeric', category: 'Spices', have: true, qty: '1 jar', low: false, notes: '' },
  { item: 'Dried oregano', category: 'Spices', have: true, qty: '1 jar', low: false, notes: '' },
  { item: 'Dried basil', category: 'Spices', have: true, qty: '1 jar', low: false, notes: '' },
  { item: 'Dried thyme', category: 'Spices', have: true, qty: '1 jar', low: false, notes: '' },
  { item: 'Garlic powder', category: 'Spices', have: true, qty: '1 jar', low: false, notes: '' },
  { item: 'Cinnamon', category: 'Spices', have: true, qty: '1 jar', low: false, notes: '' },
  { item: 'Ground coriander', category: 'Spices', have: true, qty: '1 jar', low: false, notes: '' },
  { item: 'Jasmine rice', category: 'Grain & Pasta', have: true, qty: '2kg bag', low: false, notes: '' },
  { item: 'Basmati rice', category: 'Grain & Pasta', have: true, qty: '1kg bag', low: false, notes: '' },
  { item: 'Short-grain rice', category: 'Grain & Pasta', have: true, qty: '1kg bag', low: false, notes: '' },
  { item: 'Spaghetti', category: 'Grain & Pasta', have: true, qty: '500g pack', low: false, notes: '' },
  { item: 'Canned crushed tomatoes', category: 'Canned Goods', have: true, qty: '4 cans', low: false, notes: '' },
  { item: 'Canned black beans', category: 'Canned Goods', have: true, qty: '2 cans', low: false, notes: '' },
  { item: 'Beef stock', category: 'Sauce & Condiment', have: true, qty: '1 carton', low: false, notes: '' },
  { item: 'Breadcrumbs', category: 'Baking', have: true, qty: '1 bag', low: false, notes: 'Check nut-free' },
  { item: 'Sugar', category: 'Baking', have: true, qty: '1 bag', low: false, notes: '' },
  { item: 'Butter', category: 'Dairy', have: true, qty: '250g block', low: false, notes: '' },
  { item: 'Cream', category: 'Dairy', have: false, qty: '300ml', low: false, notes: 'Or coconut cream' },
  { item: 'Greek yoghurt', category: 'Dairy', have: false, qty: '500g tub', low: false, notes: '' },
  { item: 'Sour cream', category: 'Dairy', have: false, qty: '300ml tub', low: false, notes: '' },
  { item: 'Eggs', category: 'Dairy', have: true, qty: '1 dozen', low: false, notes: '' },
  { item: 'Parmesan', category: 'Dairy', have: true, qty: '1 block', low: false, notes: '' },
  { item: 'Flatbreads', category: 'Grain & Pasta', have: false, qty: '1 pack', low: false, notes: '' },
  { item: 'Sesame seeds', category: 'Spices', have: true, qty: '1 jar', low: false, notes: '' },
  { item: 'Cornflour', category: 'Baking', have: true, qty: '1 box', low: false, notes: '' }
];

// Perishability heuristic categories for "eat first"
const HIGHLY_PERISHABLE = ['berries','strawberries','blueberries','raspberries','baby spinach','spinach','mushrooms','herbs','basil','mint','coriander','parsley','corn','asparagus','bean sprouts','lettuce','rocket','avocado','fresh herbs','bok choy','peas','cherry tomatoes'];
