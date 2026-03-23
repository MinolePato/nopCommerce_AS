using System.Diagnostics;
using Nop.Services.Orders;
using OpenTelemetry;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using OpenTelemetry.Metrics;

namespace Nop.Web.Infrastructure;


public static class OpenTelemetryExtensions
{
    public static IServiceCollection AddNopOpenTelemetry(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var otlpEndpoint = configuration["OpenTelemetry:OtlpEndpoint"]
            ?? Environment.GetEnvironmentVariable("OTEL_EXPORTER_OTLP_ENDPOINT")
            ?? "http://localhost:4317";

        var resourceBuilder = ResourceBuilder.CreateDefault()
            .AddService(
                serviceName: NopTelemetry.ServiceName,
                serviceVersion: "5.0.0")
            .AddAttributes(new Dictionary<string, object>
            {
                ["deployment.environment"] =
                    Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production"
            });

        services.AddOpenTelemetry()
            .WithTracing(tracing => tracing
                .SetResourceBuilder(resourceBuilder)
                // Automatic HTTP + ASP.NET Core spans
                .AddAspNetCoreInstrumentation(opts =>
                {
                    // Exclude health-check and static-file routes from tracing noise
                    opts.Filter = ctx =>
                        !ctx.Request.Path.StartsWithSegments("/health") &&
                        !ctx.Request.Path.StartsWithSegments("/favicon");
                })
                .AddHttpClientInstrumentation()
                .AddSqlClientInstrumentation()
                .AddSource(NopTelemetry.OrderSource.Name)
                // Drop span attributes that contain PII before export
                .AddProcessor(new PiiSanitizingProcessor())
                .AddOtlpExporter(opts => opts.Endpoint = new Uri(otlpEndpoint)))
            .WithMetrics(metrics => metrics
                .SetResourceBuilder(resourceBuilder)
                .AddAspNetCoreInstrumentation()
                .AddHttpClientInstrumentation()
                // Custom nop.* metrics defined in NopTelemetry
                .AddMeter(NopTelemetry.ServiceName)
                .AddOtlpExporter(opts => opts.Endpoint = new Uri(otlpEndpoint)));

        return services;
    }
}

/// <summary>
/// OTel processor that removes known PII fields from span attributes
/// before they reach the exporter.
///
/// A processor is the right place for this: it applies uniformly to every
/// span regardless of where attributes were set, without requiring every
/// instrumentation call-site to remember which fields to exclude.
/// </summary>
internal sealed class PiiSanitizingProcessor : BaseProcessor<Activity>
{
    // Attribute keys that must never leave the process boundary.
    private static readonly HashSet<string> _blocklist = new(StringComparer.OrdinalIgnoreCase)
    {
        "customer.email",
        "customer.username",
        "customer.phone",
        "billing.name",
        "billing.address",
        "billing.city",
        "billing.postcode",
        "http.request.header.cookie",
        "http.request.header.authorization",
        "http.response.header.set-cookie",
        "db.statement",   
    };

    public override void OnEnd(Activity activity)
    {
        foreach (var key in _blocklist)
            activity.SetTag(key, null);
    }
}
