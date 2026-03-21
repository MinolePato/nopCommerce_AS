/**
 * k6 load test — nopCommerce "Customer places an order" flow
 *
 * What it exercises:
 *   1. Browse catalogue (product list page)
 *   2. View a product detail page
 *   3. Add product to basket
 *   4. Proceed through checkout (billing → shipping → payment → confirm)
 *   5. Submit the order
 *
 * This generates enough signal to make the Grafana dashboard meaningful:
 *   - nop.orders.placed counter climbs steadily
 *   - order.place span latency histograms fill up
 *   - HTTP error rate panel becomes non-zero if anything breaks
 *
 * Usage:
 *   k6 run load-test/order-flow.js
 *
 *   Override base URL:
 *   k6 run -e BASE_URL=http://localhost:5000 load-test/order-flow.js
 *
 *   Ramp up to 20 VUs for 2 minutes then ramp down:
 *   k6 run --vus 20 --duration 2m load-test/order-flow.js
 */

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Trend, Counter, Rate } from "k6/metrics";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const BASE_URL = __ENV.BASE_URL || "http://localhost:5000";

// Product slug to use in the test — change if your seed data differs.
// The demo install includes "Build your own computer" at /build-your-own-computer.
const PRODUCT_SLUG = __ENV.PRODUCT_SLUG || "build-your-own-computer";

export const options = {
  scenarios: {
    // Steady ramp: 0 → 10 VUs over 30 s, hold for 90 s, ramp down 30 s.
    order_flow: {
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
    // 95th-percentile checkout time under 3 s
    checkout_duration: ["p(95)<3000"],
    // Less than 1% of order submissions should fail
    order_errors: ["rate<0.01"],
  },
};

// ---------------------------------------------------------------------------
// Custom k6 metrics (visible in the k6 summary, not in Prometheus)
// ---------------------------------------------------------------------------
const checkoutDuration = new Trend("checkout_duration", true); // ms
const orderErrors      = new Rate("order_errors");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract an anti-forgery token from an HTML response body. */
function extractAntiForgery(body) {
  const match = body.match(
    /name="__RequestVerificationToken"\s+type="hidden"\s+value="([^"]+)"/
  );
  return match ? match[1] : "";
}

/** Parse a simple hidden input value from an HTML body. */
function extractHidden(body, name) {
  const re = new RegExp(`name="${name}"[^>]+value="([^"]+)"`);
  const match = body.match(re);
  return match ? match[1] : "";
}

// ---------------------------------------------------------------------------
// Main scenario
// ---------------------------------------------------------------------------
export default function () {
  const headers = {
    "Accept":          "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
  };

  // -------------------------------------------------------------------------
  // 1. Browse the catalogue
  // -------------------------------------------------------------------------
  group("1_browse_catalogue", () => {
    const res = http.get(`${BASE_URL}/computers`, { headers });
    check(res, { "catalogue 200": (r) => r.status === 200 });
    sleep(1);
  });

  // -------------------------------------------------------------------------
  // 2. View product detail
  // -------------------------------------------------------------------------
  let productToken = "";
  let productId    = "";

  group("2_view_product", () => {
    const res = http.get(`${BASE_URL}/${PRODUCT_SLUG}`, { headers });
    check(res, { "product page 200": (r) => r.status === 200 });
    productToken = extractAntiForgery(res.body);
    productId    = extractHidden(res.body, "ProductId") ||
                   extractHidden(res.body, "productId");
    sleep(1);
  });

  // -------------------------------------------------------------------------
  // 3. Add to cart
  // -------------------------------------------------------------------------
  group("3_add_to_cart", () => {
    const payload = {
      ProductId:                  productId || "1",
      addtocart_1_EnteredQuantity: "1",
      __RequestVerificationToken:  productToken,
    };
    const res = http.post(
      `${BASE_URL}/addproducttocart/details/${productId || "1"}/1`,
      payload,
      { headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" } }
    );
    check(res, { "add to cart ok": (r) => r.status === 200 || r.status === 302 });
    sleep(0.5);
  });

  // -------------------------------------------------------------------------
  // 4-7. Checkout flow — timed end-to-end
  // -------------------------------------------------------------------------
  const start = Date.now();

  group("4_checkout_billing", () => {
    const res = http.get(`${BASE_URL}/checkout`, { headers });
    check(res, { "checkout page 200": (r) => r.status === 200 });

    const token = extractAntiForgery(res.body);
    const billingPayload = {
      BillingNewAddress_FirstName:  "Test",
      BillingNewAddress_LastName:   "User",
      BillingNewAddress_Email:      `test${__VU}@example.com`,
      BillingNewAddress_CountryId:  "1",
      BillingNewAddress_City:       "TestCity",
      BillingNewAddress_Address1:   "123 Test St",
      BillingNewAddress_ZipPostalCode: "12345",
      BillingNewAddress_PhoneNumber: "555-0100",
      __RequestVerificationToken:   token,
    };
    const post = http.post(
      `${BASE_URL}/checkout/OpcSaveBilling`,
      JSON.stringify(billingPayload),
      { headers: { ...headers, "Content-Type": "application/json" } }
    );
    check(post, { "billing saved": (r) => r.status === 200 });
    sleep(0.5);
  });

  group("5_checkout_shipping", () => {
    const res = http.get(`${BASE_URL}/checkout/shippingmethod`, { headers });
    const token = extractAntiForgery(res.body ?? "");
    const post = http.post(
      `${BASE_URL}/checkout/OpcSaveShippingMethod`,
      JSON.stringify({ shippingoption: "___1___Ground" }),
      { headers: { ...headers, "Content-Type": "application/json" } }
    );
    check(post, { "shipping saved": (r) => r.status === 200 });
    sleep(0.5);
  });

  group("6_checkout_payment", () => {
    const post = http.post(
      `${BASE_URL}/checkout/OpcSavePaymentMethod`,
      JSON.stringify({ paymentmethod: "Payments.CheckMoneyOrder", useRewardPoints: false }),
      { headers: { ...headers, "Content-Type": "application/json" } }
    );
    check(post, { "payment method saved": (r) => r.status === 200 });
    sleep(0.5);
  });

  group("7_confirm_order", () => {
    const res = http.post(
      `${BASE_URL}/checkout/OpcConfirmOrder`,
      "{}",
      { headers: { ...headers, "Content-Type": "application/json" } }
    );
    const ok =
      res.status === 200 &&
      (res.body.includes("completed") || res.body.includes("orderId"));
    check(res, { "order confirmed": () => ok });
    orderErrors.add(!ok);
  });

  checkoutDuration.add(Date.now() - start);

  sleep(2);
}
