/**
 * k6 load test — nopCommerce Catalogue Search & Product View
 * Multi-phase test producing distinct observability signals in each phase.
 *
 * Phase 1 — Normal browsing      (0–2 min,  5 VUs)
 *   Healthy traffic: 90% searches return results, rare out-of-stock or
 *   call-for-price encounters. Establishes the "green" baseline on dashboards.
 *
 * Phase 2 — Category explorer    (2–4 min,  8 VUs)
 *   VU picks a random category and browses entirely within it: keyword search,
 *   in-stock product view, then the out-of-stock product in the same category.
 *   Shows per-category inventory gaps on the product_category panel.
 *
 * Phase 3 — Catalogue stress     (4–6 min, 12 VUs)
 *   60% zero-result searches + heavy out-of-stock views across every category.
 *   Simulates a broken search index or a large inventory shortage.
 *   Dashboard zero-result rate turns red; out-of-stock bars spike.
 *
 * Phase 4 — Premium demand spike (6–8 min, 10 VUs)
 *   40% of product views are call-for-price items spread across all categories.
 *   Simulates a marketing campaign targeting luxury products.
 *   Call-for-price panel spikes; per-category view panel shows premium mix.
 *
 * Phase 5 — Recovery             (8–10 min, 6 VUs)
 *   Balanced traffic returning to healthy patterns after the stress phase.
 *   Verifies latency normalises and zero-result rate recovers.
 *
 * Usage:
 *   k6 run load-test/search-flow.js
 *   k6 run -e BASE_URL=http://localhost:80 load-test/search-flow.js
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Trend, Rate } from "k6/metrics";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const BASE_URL = __ENV.BASE_URL || "http://localhost:80";

// ---------------------------------------------------------------------------
// Product catalogue — organised by category and availability status
// ---------------------------------------------------------------------------
const AVAILABLE = {
  electronics: {
    keywords: ["sony wh", "beats pill"],
    slugs:    ["sony-wh-1000xm5-headphones", "beats-pill-wireless-speaker"],
  },
  computers: {
    keywords: ["dell xps", "computer", "asus"],
    slugs:    ["dell-xps-15-laptop", "build-your-own-computer", "asus-laptop"],
  },
  camera: {
    keywords: ["gopro", "nikon", "leica"],
    slugs:    ["gopro-hero-12-black", "nikon-d5500-dslr", "leica-t-mirrorless-digital-camera"],
  },
  phones: {
    keywords: ["google pixel", "samsung", "iphone"],
    slugs:    ["google-pixel-9-pro", "samsung-galaxy-s24-256gb", "apple-iphone-16-128gb"],
  },
  books: {
    keywords: ["clean code", "pride and prejudice"],
    slugs:    ["clean-code-by-robert-c-martin", "pride-and-prejudice"],
  },
  clothing: {
    keywords: ["patagonia", "levi", "nike tailwind"],
    slugs:    ["patagonia-nano-puff-jacket", "levis-511-jeans",
               "nike-tailwind-loose-short-sleeve-running-shirt"],
  },
  shoes: {
    keywords: ["adidas", "nike sb"],
    slugs:    ["adidas-ultraboost-24", "nike-sb-zoom-stefan-janoski-medium-mint"],
  },
  accessories: {
    keywords: ["airpods", "ray ban"],
    slugs:    ["apple-airpods-pro-2nd-gen", "ray-ban-aviator-sunglasses"],
  },
};

const OUT_OF_STOCK = {
  electronics: {
    keywords: ["bose soundlink"],
    slugs:    ["bose-soundlink-flex-speaker"],
  },
  computers: {
    keywords: ["lenovo thinkpad x1"],
    slugs:    ["lenovo-thinkpad-x1-carbon"],
  },
  camera: {
    keywords: ["canon r5"],
    slugs:    ["canon-eos-r5-mark-ii"],
  },
  phones: {
    keywords: ["oneplus", "htc one mini"],
    slugs:    ["oneplus-12-5g", "htc-one-mini-blue"],
  },
  books: {
    keywords: ["pragmatic", "fahrenheit"],
    slugs:    ["the-pragmatic-programmer", "fahrenheit-451-by-ray-bradbury"],
  },
  clothing: {
    keywords: ["north face", "nike floral"],
    slugs:    ["the-north-face-puffer-coat", "nike-floral-roshe-customized-running-shoes"],
  },
  shoes: {
    keywords: ["jordan 1"],
    slugs:    ["jordan-1-retro-high-og"],
  },
  accessories: {
    keywords: ["sony wf"],
    slugs:    ["sony-wf-1000xm5-earbuds"],
  },
};

// Hermès slug is garbled in DB (accented char) so clothing is omitted here
const CALL_FOR_PRICE = {
  electronics: ["bang--olufsen-beoplay-h95"],
  computers:   ["apple-macbook-pro", "alienware-aurora-r16"],
  camera:      ["sony-alpha-a7-iv-mirrorless"],
  phones:      ["vertu-signature-touch"],
  books:       ["designing-data-intensive-apps"],
  clothing:    [],
  shoes:       ["balenciaga-triple-s-sneakers"],
  accessories: ["rolex-submariner-date"],
};

// Queries guaranteed to return zero results
const NO_RESULTS = ["zzznoresults", "xyznotaproduct", "fakebrand404"];

const CATEGORIES = Object.keys(AVAILABLE);

// ---------------------------------------------------------------------------
// Flat helpers — pull across all categories
// ---------------------------------------------------------------------------
function flatMap(pool, key) { return CATEGORIES.flatMap(c => pool[c][key]); }
const allAvailableKeywords  = () => flatMap(AVAILABLE, "keywords");
const allAvailableSlugs     = () => flatMap(AVAILABLE, "slugs");
const allOutOfStockKeywords = () => flatMap(OUT_OF_STOCK, "keywords");
const allOutOfStockSlugs    = () => flatMap(OUT_OF_STOCK, "slugs");
const allCallForPrice       = () => CATEGORIES.flatMap(c => CALL_FOR_PRICE[c]);

// ---------------------------------------------------------------------------
// k6 custom metrics
// ---------------------------------------------------------------------------
const searchDuration      = new Trend("search_duration", true);
const productViewDuration = new Trend("product_view_duration", true);
const searchErrors        = new Rate("search_errors");

// ---------------------------------------------------------------------------
// k6 scenario options — 5 sequential phases
// ---------------------------------------------------------------------------
export const options = {
  scenarios: {
    phase1_normal: {
      executor:  "ramping-vus",
      startTime: "0s",
      stages: [
        { duration: "10s", target: 8 },
        { duration: "40s", target: 8 },
        { duration: "10s", target: 0 },
      ],
      exec: "normalBrowsing",
    },
    phase2_category: {
      executor:  "ramping-vus",
      startTime: "1m",
      stages: [
        { duration: "10s", target: 12 },
        { duration: "40s", target: 12 },
        { duration: "10s", target: 0 },
      ],
      exec: "categoryExplorer",
    },
    phase3_stress: {
      executor:  "ramping-vus",
      startTime: "2m",
      stages: [
        { duration: "10s", target: 15 },
        { duration: "40s", target: 15 },
        { duration: "10s", target: 0 },
      ],
      exec: "catalogStress",
    },
    phase4_premium: {
      executor:  "ramping-vus",
      startTime: "3m",
      stages: [
        { duration: "10s", target: 12 },
        { duration: "40s", target: 12 },
        { duration: "10s", target: 0 },
      ],
      exec: "premiumDemand",
    },
    phase5_recovery: {
      executor:  "ramping-vus",
      startTime: "4m",
      stages: [
        { duration: "10s", target: 8 },
        { duration: "40s", target: 8 },
        { duration: "10s", target: 0 },
      ],
      exec: "recovery",
    },
  },
  thresholds: {
    search_duration:       ["p(95)<2000"],
    product_view_duration: ["p(95)<3000"],
    http_req_failed:       ["rate<0.01"],
  },
};

// ---------------------------------------------------------------------------
// Low-level helpers
// ---------------------------------------------------------------------------
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function hdrs() {
  return {
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  };
}

function doSearch(keyword) {
  const start = Date.now();
  const res = http.get(
    `${BASE_URL}/search?q=${encodeURIComponent(keyword)}&cid=0&mid=0&advs=false&isc=false&sid=false`,
    { headers: hdrs() }
  );
  searchDuration.add(Date.now() - start);
  searchErrors.add(res.status !== 200);
  return res;
}

function doView(slug) {
  const start = Date.now();
  const res = http.get(`${BASE_URL}/${slug}`, { headers: hdrs() });
  productViewDuration.add(Date.now() - start);
  return res;
}

function extractSlug(body) {
  const m = body && body.match(/href="\/([a-z0-9-]+)"[^>]*class="[^"]*product-title/);
  return m ? m[1] : null;
}

// ---------------------------------------------------------------------------
// Phase 1 — Normal browsing
//   Baseline healthy traffic. 10% zero-result searches, 5% out-of-stock views,
//   5% call-for-price views. Most users find and buy products without friction.
// ---------------------------------------------------------------------------
export function normalBrowsing() {
  group("p1_homepage", () => {
    check(http.get(`${BASE_URL}/`, { headers: hdrs() }), { "200": r => r.status === 200 });
    sleep(0.5);
  });

  let slug = null;
  group("p1_search", () => {
    const r = Math.random();
    const keyword = r < 0.10 ? pick(NO_RESULTS) : pick(allAvailableKeywords());
    const res = doSearch(keyword);
    check(res, { "200": r => r.status === 200 });
    slug = extractSlug(res.body);
    sleep(0.5);
  });

  group("p1_view", () => {
    const r = Math.random();
    let target;
    if      (r < 0.05) target = pick(allCallForPrice());
    else if (r < 0.10) target = pick(allOutOfStockSlugs());
    else               target = slug || pick(allAvailableSlugs());
    check(doView(target), { "200": r => r.status === 200 });
    sleep(0.5);
  });

  sleep(1);
}

// ---------------------------------------------------------------------------
// Phase 2 — Category explorer
//   Each VU iteration picks one category and browses only within it:
//   keyword search → view in-stock product → view out-of-stock product.
//   Produces per-category breakdown on the product_category Grafana panel
//   and reveals which categories have inventory gaps.
// ---------------------------------------------------------------------------
export function categoryExplorer() {
  const cat = pick(CATEGORIES);

  group("p2_search_in_category", () => {
    const res = doSearch(pick(AVAILABLE[cat].keywords));
    check(res, { "200": r => r.status === 200 });
    sleep(0.5);
  });

  group("p2_view_available", () => {
    check(doView(pick(AVAILABLE[cat].slugs)), { "200": r => r.status === 200 });
    sleep(0.5);
  });

  group("p2_view_out_of_stock_same_cat", () => {
    const slugs = OUT_OF_STOCK[cat].slugs;
    if (slugs.length > 0) {
      check(doView(pick(slugs)), { "200": r => r.status === 200 });
    }
    sleep(0.5);
  });

  sleep(1);
}

// ---------------------------------------------------------------------------
// Phase 3 — Catalogue stress
//   60% of searches return zero results. Every iteration also visits two
//   out-of-stock products across different categories. Simulates a broken
//   search index or a major inventory shortage across the catalogue.
//   Expected dashboard signals: zero-result rate > 60% (red), heavy
//   out-of-stock bar on the product views panel.
// ---------------------------------------------------------------------------
export function catalogStress() {
  group("p3_search_high_zero_result", () => {
    const r = Math.random();
    const keyword = r < 0.60 ? pick(NO_RESULTS) : pick(allAvailableKeywords());
    check(doSearch(keyword), { "200": r => r.status === 200 });
    sleep(0.5);
  });

  group("p3_search_out_of_stock", () => {
    check(doSearch(pick(allOutOfStockKeywords())), { "200": r => r.status === 200 });
    sleep(0.5);
  });

  group("p3_view_out_of_stock_A", () => {
    check(doView(pick(allOutOfStockSlugs())), { "200": r => r.status === 200 });
    sleep(0.3);
  });

  group("p3_view_out_of_stock_B", () => {
    // Second out-of-stock view in a different category for variety
    const cat = pick(CATEGORIES);
    const slugs = OUT_OF_STOCK[cat].slugs;
    if (slugs.length > 0) {
      check(doView(pick(slugs)), { "200": r => r.status === 200 });
    }
    sleep(0.3);
  });

  sleep(0.5);
}

// ---------------------------------------------------------------------------
// Phase 4 — Premium demand spike
//   Each VU picks a category and views its call-for-price product, then
//   views a second call-for-price product from another category (60%) or an
//   available product for comparison (40%). 15% of searches return no results.
//   Expected signals: call-for-price panel spikes; category panel shows
//   premium categories (computers, accessories, shoes) dominating.
// ---------------------------------------------------------------------------
export function premiumDemand() {
  const cat = pick(CATEGORIES);

  group("p4_search_category", () => {
    const r = Math.random();
    const keyword = r < 0.15 ? pick(NO_RESULTS) : pick(AVAILABLE[cat].keywords);
    check(doSearch(keyword), { "200": r => r.status === 200 });
    sleep(0.5);
  });

  group("p4_view_call_for_price_primary", () => {
    const cfp = CALL_FOR_PRICE[cat].length > 0
      ? pick(CALL_FOR_PRICE[cat])
      : pick(allCallForPrice());
    check(doView(cfp), { "200": r => r.status === 200 });
    sleep(0.5);
  });

  group("p4_view_second_product", () => {
    const r = Math.random();
    let slug;
    if (r < 0.60) {
      // Another call-for-price in a different category
      const other = pick(CATEGORIES.filter(c => c !== cat && CALL_FOR_PRICE[c].length > 0));
      slug = pick(CALL_FOR_PRICE[other]);
    } else {
      // Available product in same category for comparison
      slug = pick(AVAILABLE[cat].slugs);
    }
    check(doView(slug), { "200": r => r.status === 200 });
    sleep(0.5);
  });

  sleep(0.5);
}

// ---------------------------------------------------------------------------
// Phase 5 — Recovery
//   Mixed traffic back to healthy patterns: 15% zero-result, 15% out-of-stock
//   views, 15% call-for-price, 70% normal in-stock browsing.
//   Verifies latency and error rate return to baseline after the stress phase.
// ---------------------------------------------------------------------------
export function recovery() {
  group("p5_homepage", () => {
    check(http.get(`${BASE_URL}/`, { headers: hdrs() }), { "200": r => r.status === 200 });
    sleep(0.5);
  });

  let slug = null;
  group("p5_search", () => {
    const r = Math.random();
    let keyword;
    if      (r < 0.15) keyword = pick(NO_RESULTS);
    else if (r < 0.30) keyword = pick(allOutOfStockKeywords());
    else               keyword = pick(allAvailableKeywords());
    const res = doSearch(keyword);
    check(res, { "200": r => r.status === 200 });
    slug = extractSlug(res.body);
    sleep(0.5);
  });

  group("p5_view", () => {
    const r = Math.random();
    let target;
    if      (r < 0.15) target = pick(allCallForPrice());
    else if (r < 0.30) target = pick(allOutOfStockSlugs());
    else               target = slug || pick(allAvailableSlugs());
    check(doView(target), { "200": r => r.status === 200 });
    sleep(0.5);
  });

  sleep(1);
}
