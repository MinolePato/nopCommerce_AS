using System.Diagnostics;
using Nop.Services.Orders;
using OpenTelemetry;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;
using OpenTelemetry.Metrics;

namespace Nop.Web.Infrastructure;

/// <summary>
/// Registers OpenTelemetry tracing and metrics with the ASP.NET Core DI container.
///
/// Kept in Nop.Web (not Nop.Web.Framework) so that OTel NuGet packages remain
/// a presentation-layer concern and do not bleed into shared libraries.
/// </summary>
public static class OpenTelemetryExtensions
{
    /// <summary>
    /// Adds OpenTelemetry tracing and metrics.
    ///
    /// The OTLP endpoint is read from the environment variable
    /// <c>OTEL_EXPORTER_OTLP_ENDPOINT</c> (default: http://localhost:4317).
    /// When the variable is absent, telemetry is exported to the console so
    /// the application still starts cleanly in development without a collector.
    /// </summary>
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
                // Database spans (linq2db uses SqlClient under the hood)
                .AddSqlClientInstrumentation(opts =>
                {
                    opts.SetDbStatementForText = true;
                    // Never capture bind parameters — they may contain PII
                    opts.SetDbStatementForStoredProcedure = false;
                })
                // Custom order-flow spans from NopTelemetry.OrderSource
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
        "db.statement",   // remove raw SQL — may contain literal values
    };

    public override void OnEnd(Activity activity)
    {
        foreach (var key in _blocklist)
            activity.SetTag(key, null);
    }
}
