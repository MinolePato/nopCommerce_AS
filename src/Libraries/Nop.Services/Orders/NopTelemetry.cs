using System.Diagnostics;
using System.Diagnostics.Metrics;

namespace Nop.Services.Orders;

/// <summary>
/// Central place for all OpenTelemetry ActivitySource and Meter definitions
/// used by the order-flow instrumentation.
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
}
