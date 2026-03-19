using System.Diagnostics;
using Nop.Core.Domain.Orders;
using Nop.Services.Events;

namespace Nop.Services.Orders;

/// <summary>
/// Records OpenTelemetry metrics whenever an order is successfully placed.
///
/// This consumer is discovered automatically by <c>NopEngine</c> at startup
/// through the existing <c>ITypeFinder</c> scan — no registration code needed.
///
/// Design rationale: using the <c>IConsumer&lt;OrderPlacedEvent&gt;</c> pattern
/// means zero changes to business logic.  The consumer fires after the order
/// has been committed and the <c>EntityInsertedEvent&lt;Order&gt;</c> has already
/// invalidated caches, so recording metrics here does not add latency to the
/// checkout critical path.
/// </summary>
public class OrderTelemetryConsumer : IConsumer<OrderPlacedEvent>
{
    private readonly IOrderService _orderService;

    public OrderTelemetryConsumer(IOrderService orderService)
    {
        _orderService = orderService;
    }

    public async Task HandleEventAsync(OrderPlacedEvent eventMessage)
    {
        var order = eventMessage.Order;

        // Safe tags — no PII.  PaymentMethodSystemName is a plugin key like
        // "Payments.CheckMoneyOrder", not a card number or customer identifier.
        var tags = new TagList
        {
            { "payment_method", order.PaymentMethodSystemName ?? "unknown" },
            { "store_id", order.StoreId.ToString() }
        };

        NopTelemetry.OrdersPlaced.Add(1, tags);

        // Fetch item count via the existing service (already cached).
        var items = await _orderService.GetOrderItemsAsync(order.Id);
        NopTelemetry.OrderItemCount.Record(items.Count, new TagList
        {
            { "payment_method", order.PaymentMethodSystemName ?? "unknown" }
        });
    }
}
