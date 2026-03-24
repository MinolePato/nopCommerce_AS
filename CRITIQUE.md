# Critique — Observability in nopCommerce

## What helped

The strict layered architecture was the biggest enabler. All business logic lives in `Nop.Services` behind constructor-injected interfaces, so `ActivitySource.StartActivity()` dropped in without touching anything above or below. The async-throughout design meant trace context propagated automatically via `AsyncLocal`, a span started at the controller is the automatic parent of every `await`ed call beneath it, with no manual context threading. MySqlConnector 2.x ships its own `ActivitySource`, so database spans appeared for free just by registering `.AddSource("MySqlConnector")`.

## What hindered

Three patterns made instrumentation harder than it should be:

**`EngineContext.Current` static service locator.** Used in ~35 places including `EventPublisher` itself. Services resolved through a static locator cannot be wrapped by DI decorators, which is the standard OTel pattern for cross-cutting concerns. Any span started inside a consumer resolved this way is disconnected from the request trace unless you manually propagate context.

**SEO slug-based URLs.** Product pages are served at `/apple-macbook-pro`, so `http_route` is always an empty string in ASP.NET Core auto-metrics. There is no built-in way to identify product page traffic, HTTP auto-instrumentation is blind to it. A custom counter with a `product_category` tag was the only viable fix.

**Silent `EventPublisher` failures.** The publisher catches and swallows all consumer exceptions, logging only to the database. A broken consumer is completely invisible to traces or metrics without modifying the core class, which I chose not to do.

## Surgical changes made

Two additions were unavoidable:

1. **`NopTelemetry.cs`**, a single static class in `Nop.Services` defining all `ActivitySource` and `Meter` instances. This is infrastructure, not business logic, and keeps all OTel definitions in one place. Lower layers (`Nop.Data`, `Nop.Core`) have zero new dependencies — the OTel SDK NuGet packages remain a `Nop.Web`-only concern.

2. **`RecordProductViewAsync` on `IProductService`**, one new method added to the interface and called from the existing `ProductDetails` controller action with a single line. The controller itself gained no observability logic. The alternative, instrumenting inside the pricing or model factory, would have scattered span creation across unrelated classes.

Both changes are additive. No existing method signature was modified, no business logic was altered.

## What I would change going forward


The `nop.catalog.search.page_depth` histogram currently records the page index from the server-side `SearchProductsAsync` call, but that method is also invoked internally by `CatalogModelFactory` with `pageSize=1` to probe the min/max price filter bounds, up to three times per page render. Even with the `pageSize > 1` guard, the metric only captures what the server received, not what the user actually requested. A more reliable implementation would record page depth from the controller action parameter before the service call, ensuring only explicit user pagination is counted.

A metric that is entirely missing is product engagement time, how long a customer spends on a product detail page before leaving or adding to cart. Server-side instrumentation cannot measure this: the span closes as soon as the HTTP response is sent, not when the user stops reading. Capturing it would require a small client-side beacon (a JavaScript `visibilitychange` or `beforeunload` event posting elapsed time to a lightweight endpoint) which the server then records as a histogram. The operational value is real, a high view count with low engagement time on a product suggests the page is not convincing, which is a different problem from an out-of-stock item and warrants a different response.
