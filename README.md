﻿# Assignment 1 — nopCommerce + OpenTelemetry

**Software Architectures** | Master in Informatics Engineering | Individual Assignment

---

## 1. Architecture Analysis

### Layer Structure

![Architecture diagram](docs/images/architecture.png)

nopCommerce follows a strict **five-layer architecture** with compiler-enforced unidirectional dependencies — every arrow points downward, lower layers have zero knowledge of upper ones:

```
Nop.Web  (Presentation)
    └─▶ Nop.Web.Framework  (MVC filters, routing, middleware)
            └─▶ Nop.Services  (Business logic — one service per domain)
                    └─▶ Nop.Data  (linq2db repositories, FluentMigrator)
                            └─▶ Nop.Core  (Domain entities, interfaces — no project deps)
```

All cross-cutting concerns (caching, events, logging) are defined as interfaces in `Nop.Core` and implemented in `Nop.Services` or `Nop.Web.Framework`, keeping the direction clean. The full analysis is in [`ARCHITECTURE.md`](ARCHITECTURE.md).

### IEventPublisher — Internal Event Mechanism

nopCommerce uses in-process pub/sub for inter-service communication. `EventPublisher.PublishAsync` resolves all `IConsumer<T>` implementations at runtime via Autofac and calls them sequentially. The primary use today is cache invalidation — over 100 `*CacheEventConsumer` files across `Nop.Services`. The event boundary is also a natural instrumentation point: a single consumer can capture metrics for the entire order lifecycle without touching business logic.

### Where Observability Is Easy vs Hard

**Easy:**
- **Service layer**: all services are constructor-injected interfaces — `ActivitySource.StartActivity()` drops in without modifying business logic
- **Async throughout**: `Activity` flows via `AsyncLocal`, so a span started at the controller is automatically parent of everything awaited below — no manual context threading
- **MySqlConnector 2.x**: built-in OTel `ActivitySource` — registered with `.AddSource("MySqlConnector")`, zero extra packages

**Hard:**
- **`EngineContext.Current` static locator**: appears in ~35 locations including `EventPublisher` itself — services resolved this way cannot be wrapped by DI decorators, breaking the standard OTel instrumentation pattern
- **SEO product URLs**: product pages use slug-based routes (`/apple-macbook-pro-13-inch`), so `http_route` is always `(missing)` — HTTP auto-metrics cannot identify product page traffic without a custom counter
- **Silent consumer failures**: `EventPublisher` catches and swallows all consumer exceptions, logging only to the DB — failures are invisible to metrics or traces without modifying the core class
- **`IStaticCacheManager`**: caching is transparent across the stack — impossible to distinguish cache hits from DB queries without instrumenting the cache manager globally

### Approach

All instrumentation was added as **surgical additions** — no business logic was modified. `NopTelemetry` centralises all `ActivitySource` and `Meter` definitions in `Nop.Services`, using only `System.Diagnostics` primitives (part of the .NET runtime). OTel NuGet packages remain a `Nop.Web` concern only — zero new dependencies in lower layers.

---

## 2. Instrumented Flows



### Flow — Customer Searches and Views a Product

**Why this flow**: covers Catalogue · Search · Pricing. The search index and pricing pipeline can fail silently — an HTTP 200 with zero results or a wrong price is invisible to error-rate monitors but immediately detectable with the right metrics.

#### Span Hierarchy

```
GET /search?q=laptop                        ← auto (ASP.NET Core)
  └── catalog.search                        ← custom (ProductService.SearchProductsAsync)
        ├── tags: search.has_keyword, search.result_count
        └── MySqlConnector × N              ← auto (product/category/filter queries)

GET /apple-macbook-pro-13-inch              ← auto (ASP.NET Core)
  └── catalog.product.view                 ← custom (ProductController.ProductDetails)
        ├── tags: product.id, product.type, product.is_call_for_price
        ├── catalog.pricing                 ← custom (PriceCalculationService.GetFinalPriceAsync)
        │     tags: product.id, pricing.include_discounts, pricing.quantity, pricing.has_discount
        └── MySqlConnector × N              ← auto (product/picture/attribute/price queries)
```

**Note on span placement**: `catalog.search` lives in `Nop.Services` (service layer), consistent with `order.place`. `catalog.product.view` lives in the controller — there is no single "view product" method in the service layer; the controller is where the intent is established. `catalog.pricing` lives in `Nop.Services.Catalog`, making it the deepest service-layer span in the product view trace.

#### Custom Metrics

| Metric | Type | Operational justification |
|--------|------|--------------------------|
| `nop.catalog.searches` | Counter | Tag `found_results=false` enables alerting on zero-result rate — a spike means catalogue content is missing or the search index is broken, catchable before users start abandoning the site. |
| `nop.catalog.search.result_count` | Histogram | A collapse of the p50 to 0 across all searches indicates the search pipeline is broken — detectable without waiting for user complaints or HTTP error spikes. |
| `nop.catalog.product_views` | Counter | Product pages use SEO URLs so `http_route` is always `(missing)` in auto metrics — this is the only reliable way to track product view volume. Tag `product_type` distinguishes simple vs grouped products. |

---

## 3. Privacy Strategy — Defence in Depth

### In Code

Only operational attributes are recorded. Each tag was a deliberate choice:

- **Included**: `order.store_id`, `order.id`, `order.success`, `search.has_keyword`, `search.result_count`, `product.id`, `product.type`, `pricing.include_discounts`, `pricing.has_discount`
- **Excluded**: customer email, billing/shipping address, customer name, payment card details, search keyword text, cookie values, authorization headers

The raw search keyword is never recorded — only `search.has_keyword` (bool) appears in spans, so a customer searching for their own name leaves no trace in Jaeger.

### SDK Layer — PiiSanitizingProcessor

A custom `BaseProcessor<Activity>` registered in the OTel SDK strips known PII attribute keys from every span before export, regardless of where they were set:

```csharp
private static readonly HashSet<string> _blocklist = new(StringComparer.OrdinalIgnoreCase)
{
    "customer.email", "customer.username", "customer.phone",
    "billing.name", "billing.address", "billing.city", "billing.postcode",
    "http.request.header.cookie", "http.request.header.authorization",
    "http.response.header.set-cookie",
    "db.statement",   // raw SQL may contain literal values
};
```

This catches PII that auto-instrumentation (ASP.NET Core, MySqlConnector) might attach without our knowledge.

### Collector Layer — attributes/drop_pii processor

The OTel Collector applies a second filter before data reaches Jaeger or Prometheus. This matters because the Collector receives spans from all sources — not just our code. Configuration: [`observability/otel-collector-config.yaml`](observability/otel-collector-config.yaml).

**Rejected alternative**: filtering only in code — fragile, because auto-instrumentation operates outside our control.

---

## 4. Grafana Dashboards



### Catalogue Search Dashboard (`nop-catalog-search`)

| Panel | Query | Purpose |
|-------|-------|---------|
| Search volume / min | `rate(nop_nop_catalog_searches_total[1m]) by (found_results)` | Search throughput split by result |
| Zero-result rate | `rate(found_results="false") / rate(total)` | Search index health |
| Search result count p50/p90 | `histogram_quantile` on result_count bucket | Result distribution |
| Product views / min | `rate(nop_nop_catalog_product_views_total[1m]) by (product_type)` | Product page traffic |
| Product page latency p50/p95 | `histogram_quantile` on HTTP bucket for `(missing)` route | Page load degradation |
| Traces table | Jaeger search — `catalog.search` / `catalog.product.view` | Last 20 traces per operation |

---

## 5. Load Tests

### Order flow — [`load-test/order-flow.js`](load-test/order-flow.js)

Exercises the complete order placement flow: browse catalogue → view product → add to cart → checkout (billing, shipping, payment, confirm).

```bash
# Default: ramp to 10 VUs over 30s, hold 90s, ramp down 30s
k6 run load-test/order-flow.js

# Custom parameters
k6 run --vus 5 --duration 2m load-test/order-flow.js
```

| Threshold | Value |
|-----------|-------|
| Checkout p95 duration | < 3 000 ms |
| Order submission error rate | < 1% |

### Search & product view flow — [`load-test/search-flow.js`](load-test/search-flow.js)

Exercises the catalogue search flow: homepage → search with results → view product detail → search with zero results (exercises `found_results=false` metric path) → view second product.

```bash
# Default: ramp to 10 VUs over 30s, hold 90s, ramp down 30s
k6 run load-test/search-flow.js

# Override base URL
k6 run -e BASE_URL=http://localhost:80 load-test/search-flow.js
```

| Threshold | Value |
|-----------|-------|
| Search p95 duration | < 2 000 ms |
| Product page p95 duration | < 3 000 ms |
| HTTP error rate | < 1% |

---

## 6. How to Run

### Prerequisites

- Docker and Docker Compose
- k6 (load test only): [k6.io/docs/getting-started/installation](https://k6.io/docs/getting-started/installation/)

### 1. Start everything

```bash
docker compose up -d --build
```

This starts: nopCommerce · MySQL · OTel Collector · Jaeger · Prometheus · Grafana

### 2. First-time installation

Open `http://localhost:80` and complete the nopCommerce setup wizard:

- **Database type**: MySQL
- **Server name**: `nopcommerce_mysql`
- **Database name**: `nopcommerce`
- **Username / Password**: `root` / `nopCommerce_db_password`

After installation, wait ~30 seconds for the app to restart.

### 3. Observability UIs

| Tool | URL | Credentials |
|------|-----|-------------|
| nopCommerce | `http://localhost:80` | — |
| Grafana | `http://localhost:3000` | admin / admin |
| Jaeger | `http://localhost:16686` | — |
| Prometheus | `http://localhost:9090` | — |

### 4. Generate telemetry

1. Browse to `http://localhost:80`, search for a product and open its detail page
2. Add a product to the cart and complete a checkout
3. In Jaeger: select service `nopCommerce`, operation `catalog.search` or `order.place`
4. In Grafana: open **nopCommerce — Order Flow** or **nopCommerce — Catalogue Search & Product View**

### 5. Run the load test

```bash
k6 run load-test/order-flow.js
```

### 6. Stop everything

```bash
docker compose down
```

To also wipe data volumes (reset to fresh install):

```bash
docker compose down -v
```

---

## 7. Files Changed

| File | What changed |
|------|-------------|
| `src/Libraries/Nop.Services/Orders/NopTelemetry.cs` | Central definitions: `OrderSource`, `CatalogSource`, all metric instruments |
| `src/Libraries/Nop.Services/Orders/OrderProcessingService.cs` | `order.place` span + `nop.orders.placed` / `nop.order.item_count` metrics in `PlaceOrderAsync` |
| `src/Libraries/Nop.Services/Catalog/ProductService.cs` | `catalog.search` span + `nop.catalog.searches` / `nop.catalog.search.result_count` metrics in `SearchProductsAsync` |
| `src/Libraries/Nop.Services/Catalog/PriceCalculationService.cs` | `catalog.pricing` span in `GetFinalPriceAsync` |
| `src/Presentation/Nop.Web/Controllers/ProductController.cs` | `catalog.product.view` span + `nop.catalog.product_views` metric in `ProductDetails` |
| `src/Presentation/Nop.Web/Nop.Web.csproj` | OTel NuGet packages (Extensions.Hosting, Instrumentation.*, Exporter.OpenTelemetryProtocol) |
| `src/Presentation/Nop.Web/Infrastructure/OpenTelemetryExtensions.cs` | OTel SDK setup: tracing + metrics + OTLP exporter + `PiiSanitizingProcessor` |
| `src/Presentation/Nop.Web/Program.cs` | `AddNopOpenTelemetry()` registration |
| `docker-compose.yml` | Added MySQL, OTel Collector, Jaeger, Prometheus, Grafana services |
| `observability/otel-collector-config.yaml` | Collector pipeline: OTLP receiver → PII drop → Jaeger + Prometheus |
| `observability/grafana/dashboards/nop-order-flow.json` | Order flow dashboard |
| `observability/grafana/dashboards/nop-catalog-search.json` | Catalogue search & product view dashboard |
| `load-test/order-flow.js` | k6 script — full checkout flow |
| `load-test/search-flow.js` | k6 script — search & product view flow |

---
