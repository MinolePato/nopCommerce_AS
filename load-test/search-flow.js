/**
 * k6 load test — nopCommerce "Customer searches and views a product" flow
 *
 * What it exercises:
 *   1. Land on the homepage
 *   2. Submit a search query (POST → /catalog/searchproducts)
 *   3. View a product detail page from the results
 *   4. Repeat with a second keyword that returns zero results
 *      (exercises the found_results=false branch of nop.catalog.searches)
 *
 * This generates enough signal to make the Grafana catalog dashboard meaningful:
 *   - nop.catalog.searches counter climbs with found_results=true / false labels
 *   - nop.catalog.search.result_count histogram fills up
 *   - nop.catalog.product_views counter reflects product page traffic
 *   - catalog.search and catalog.product.view spans appear in Jaeger
 *   - catalog.pricing spans visible nested inside catalog.product.view
 *
 * Usage:
 *   k6 run load-test/search-flow.js
 *
 *   Override base URL:
 *   k6 run -e BASE_URL=http://localhost:80 load-test/search-flow.js
 *
 *   Ramp up to 20 VUs for 2 minutes then ramp down:
 *   k6 run --vus 20 --duration 2m load-test/search-flow.js
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Trend, Counter, Rate } from "k6/metrics";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const BASE_URL = __ENV.BASE_URL || "http://localhost:80";

// Keywords that should return results (based on nopCommerce demo data)
const KEYWORDS_WITH_RESULTS = [
  "computer",
  "apple",
  "camera",
  "phone",
  "book",
];

// Keywords that should return zero results — exercises the zero-result metric path
const KEYWORDS_NO_RESULTS = [
  "zzznoresults",
  "xyznotaproduct",
];

// Product slugs from the nopCommerce demo install
const PRODUCT_SLUGS = [
  "build-your-own-computer",
  "apple-macbook-pro-13-inch",
  "htc-one-m8-android-l-5-0-lollipop",
  "nike-floral-roshe-customizable-running-shoes",
  "fahrenheit-451-by-ray-bradbury",
];

// ---------------------------------------------------------------------------
// k6 scenario options
// ---------------------------------------------------------------------------
export const options = {
  scenarios: {
    search_flow: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 10 },
        { duration: "90s", target: 10 },
        { duration: "30s", target: 0 },
      ],
    },
  },
  thresholds: {
    // Search page p95 under 2 s
    search_duration:       ["p(95)<2000"],
    // Product page p95 under 3 s
    product_view_duration: ["p(95)<3000"],
    // Less than 1% of requests should fail
    http_req_failed:       ["rate<0.01"],
  },
};

// ---------------------------------------------------------------------------
// Custom k6 metrics
// ---------------------------------------------------------------------------
const searchDuration      = new Trend("search_duration", true);      // ms
const productViewDuration = new Trend("product_view_duration", true); // ms
const searchErrors        = new Rate("search_errors");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Pick a random element from an array. */
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Extract an anti-forgery token from an HTML body. */
function extractAntiForgery(body) {
  const match = body.match(
    /name="__RequestVerificationToken"\s+type="hidden"\s+value="([^"]+)"/
  );
  return match ? match[1] : "";
}

// ---------------------------------------------------------------------------
// Main scenario
// ---------------------------------------------------------------------------
export default function () {
  const headers = {
    Accept:          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  };

  // -------------------------------------------------------------------------
  // 1. Homepage — establishes session / cookies
  // -------------------------------------------------------------------------
  group("1_homepage", () => {
    const res = http.get(`${BASE_URL}/`, { headers });
    check(res, { "homepage 200": (r) => r.status === 200 });
    sleep(1);
  });

  // -------------------------------------------------------------------------
  // 2. Search with results
  // -------------------------------------------------------------------------
  let firstProductSlug = null;

  group("2_search_with_results", () => {
    const keyword = pick(KEYWORDS_WITH_RESULTS);

    // GET /search — loads the search page with results inline
    const start = Date.now();
    const res = http.get(
      `${BASE_URL}/search?q=${encodeURIComponent(keyword)}&cid=0&mid=0&advs=false&isc=false&sid=false`,
      { headers }
    );
    searchDuration.add(Date.now() - start);

    const ok = res.status === 200;
    check(res, { "search 200": () => ok });
    searchErrors.add(!ok);

    // Try to extract a product slug from the results for step 3
    if (ok && res.body) {
      const match = res.body.match(/href="\/([a-z0-9-]+)"[^>]*class="[^"]*product-title/);
      if (match) firstProductSlug = match[1];
    }

    sleep(1);
  });

  // -------------------------------------------------------------------------
  // 3. View a product detail page
  // -------------------------------------------------------------------------
  group("3_view_product", () => {
    // Prefer a slug extracted from search results; fall back to known demo slugs
    const slug = firstProductSlug || pick(PRODUCT_SLUGS);

    const start = Date.now();
    const res = http.get(`${BASE_URL}/${slug}`, { headers });
    productViewDuration.add(Date.now() - start);

    check(res, {
      "product page 200": (r) => r.status === 200,
      "product page has price": (r) => r.body && r.body.includes("price"),
    });

    sleep(1.5);
  });

  // -------------------------------------------------------------------------
  // 4. Search with zero results — exercises found_results=false metric path
  // -------------------------------------------------------------------------
  group("4_search_no_results", () => {
    const keyword = pick(KEYWORDS_NO_RESULTS);

    const start = Date.now();
    const res = http.get(
      `${BASE_URL}/search?q=${encodeURIComponent(keyword)}&cid=0&mid=0&advs=false&isc=false&sid=false`,
      { headers }
    );
    searchDuration.add(Date.now() - start);

    check(res, { "zero-result search 200": (r) => r.status === 200 });

    sleep(1);
  });

  // -------------------------------------------------------------------------
  // 5. Browse a second product directly (increases product_views counter)
  // -------------------------------------------------------------------------
  group("5_browse_second_product", () => {
    const slug = pick(PRODUCT_SLUGS);

    const start = Date.now();
    const res = http.get(`${BASE_URL}/${slug}`, { headers });
    productViewDuration.add(Date.now() - start);

    check(res, { "second product 200": (r) => r.status === 200 });

    sleep(1);
  });

  sleep(2);
}
