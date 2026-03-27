using System.Diagnostics;
using System.Diagnostics.Metrics;

namespace Nop.Services.Orders;

/// <summary>
/// Central place for all OpenTelemetry ActivitySource and Meter definitions
/// used by the order-flow and catalogue/search instrumentation.
///
/// Using built-in System.Diagnostics primitives means Nop.Services needs
/// zero new NuGet dependencies — the OTel SDK lives only in Nop.Web.
/// </summary>
public static class NopTelemetry
{
    /// <summary>Service name propagated through all traces.</summary>
    public const string ServiceName = "nopCommerce";

    // ---------------------------------------------------------------
    // Tracing
    // ---------------------------------------------------------------

    /// <summary>
    /// ActivitySource for the order placement flow.
    /// Registered with the OTel SDK in <c>OpenTelemetryExtensions.AddNopOpenTelemetry</c>.
    /// </summary>
    public static readonly ActivitySource OrderSource =
        new(ServiceName + ".orders", "1.0.0");

    /// <summary>
    /// ActivitySource for the catalogue search and product-view flow.
    /// Registered with the OTel SDK in <c>OpenTelemetryExtensions.AddNopOpenTelemetry</c>.
    /// </summary>
    public static readonly ActivitySource CatalogSource =
        new(ServiceName + ".catalog", "1.0.0");

    // ---------------------------------------------------------------
    // Metrics
    // ---------------------------------------------------------------

    private static readonly Meter _meter = new(ServiceName, "1.0.0");

    /// <summary>
    /// Counts every successfully placed order.
    ///
    /// Operational value: if this counter stops increasing during business
    /// hours, the checkout pipeline is broken — alertable before users
    /// start reporting errors.  Tags allow drilling into which payment
    /// method or store is affected.
    /// </summary>
    public static readonly Counter<long> OrdersPlaced =
        _meter.CreateCounter<long>(
            name: "nop.orders.placed",
            unit: "{order}",
            description: "Number of orders successfully placed");

    /// <summary>
    /// Records how many line items each order contains.
    ///
    /// Operational value: a sudden spike (e.g., mean jumps from 2 to 50)
    /// at 3am signals bot activity or a misconfigured bulk-import hitting
    /// the checkout flow — an on-call engineer can act on this before it
    /// exhausts inventory or payment-processor rate limits.
    /// </summary>
    public static readonly Histogram<int> OrderItemCount =
        _meter.CreateHistogram<int>(
            name: "nop.order.item_count",
            unit: "{item}",
            description: "Number of line items per placed order");

    // ---------------------------------------------------------------
    // Catalogue / Search flow metrics
    // ---------------------------------------------------------------

    /// <summary>
    /// Counts every product detail page view.
    ///
    /// Operational value: product pages use SEO-friendly URLs so there is no
    /// stable http_route label to filter on — this counter is the only reliable
    /// way to track product view volume and detect catalogue availability drops.
    /// </summary>
    public static readonly Counter<long> ProductViews =
        _meter.CreateCounter<long>(
            name: "nop.catalog.product_views",
            unit: "{view}",
            description: "Number of product detail page views");

    /// <summary>
    /// Counts every search executed on the public store.
    ///
    /// Operational value: tag <c>found_results=false</c> lets you alert on
    /// zero-result rate — a spike means missing catalogue content or a broken
    /// search index, catchable before users start abandoning the site.
    /// </summary>
    public static readonly Counter<long> SearchesExecuted =
        _meter.CreateCounter<long>(
            name: "nop.catalog.searches",
            unit: "{search}",
            description: "Number of searches executed on the public store");

    /// <summary>
    /// Records how many products each search query returns.
    ///
    /// Operational value: if the p50 suddenly collapses to 0 the catalogue
    /// or search index is broken — detectable without waiting for user complaints.
    /// </summary>
    public static readonly Histogram<int> SearchResultCount =
        _meter.CreateHistogram<int>(
            name: "nop.catalog.search.result_count",
            unit: "{product}",
            description: "Number of products returned per search query");

    /// <summary>
    /// Counts every public product pricing calculation.
    ///
    /// Operational value: tag <c>has_discount=true</c> shows what fraction of
    /// product views are discounted — a spike means a discount campaign is driving
    /// traffic; a sudden drop signals a discount rule was accidentally deactivated.
    /// </summary>
    public static readonly Counter<long> PricingRequests =
        _meter.CreateCounter<long>(
            name: "nop.catalog.pricing_requests",
            unit: "{request}",
            description: "Number of product pricing calculations, tagged by whether a discount was applied");
}
