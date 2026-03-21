﻿nopCommerce: free and open-source eCommerce solution
===========

---

## Observability Assignment — Order Flow Instrumentation

This fork adds OpenTelemetry tracing and metrics to the **"Customer places an order"** flow
(Basket → OrderProcessingService → Payment → Inventory) as part of Assignment 01.

### Architecture diagram — instrumented flow

```
Browser
  │  HTTP POST /checkout/OpcConfirmOrder
  ▼
[ASP.NET Core] ──(auto span: HTTP)──────────────────────────────────┐
  │                                                                  │
  ▼                                                                  │
CheckoutController.OpcConfirmOrderAsync                             │
  │                                                                  │
  ▼                                                                  │
IOrderProcessingService.PlaceOrderAsync                             │
  │  ◄── custom span: "order.place"  (NopTelemetry.OrderSource) ──► │
  │                                                                  │
  ├─► GetProcessPaymentResultAsync                                   │
  │     └─ IPaymentService (plugin call)                            │
  │                                                                  │
  ├─► SaveOrderDetailsAsync                                          │
  │     └─ IRepository<Order>.InsertAsync ──(auto span: SQL)────────┤
  │                                                                  │
  ├─► MoveShoppingCartItemsToOrderItemsAsync                         │
  │     └─ IRepository<OrderItem>.InsertAsync ──(auto span: SQL)────┤
  │                                                                  │
  └─► IEventPublisher.PublishAsync(OrderPlacedEvent)                │
        └─ OrderTelemetryConsumer                                   │
             ├─ nop.orders.placed  (Counter, tags: payment_method)  │
             └─ nop.order.item_count  (Histogram)                   │
                                                                     │
All spans exported via OTLP ──► OTel Collector ──► Jaeger ◄── Grafana
                                                └──► Prometheus ◄── Grafana
```

### Quick start

**1. Start the observability stack**

```bash
docker compose -f observability/docker-compose.yml up -d
```

| Service    | URL                      |
|------------|--------------------------|
| Grafana    | http://localhost:3000  (admin/admin) |
| Jaeger UI  | http://localhost:16686   |
| Prometheus | http://localhost:9090    |

**2. Run nopCommerce**

```bash
# Requires .NET 9 SDK and a running MySQL/Postgres/MSSQL instance.
# See mysql-docker-compose.yml for a ready-made MySQL setup.

export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
dotnet run --project src/Presentation/Nop.Web --configuration Release
```

**3. View the dashboard**

Open Grafana → Dashboards → **nopCommerce — Order Flow**.
The dashboard auto-provisions on first start via `observability/grafana/dashboards/`.

**4. Run the load test**

```bash
# Install k6: https://grafana.com/docs/k6/latest/set-up/install-k6/
k6 run load-test/order-flow.js

# Target a different host or increase VUs:
k6 run -e BASE_URL=http://localhost:5000 --vus 20 --duration 2m load-test/order-flow.js
```

### Key files added

| File | Purpose |
|------|---------|
| `src/Libraries/Nop.Services/Orders/NopTelemetry.cs` | `ActivitySource` and metric instrument definitions |
| `src/Libraries/Nop.Services/Orders/OrderTelemetryConsumer.cs` | `IConsumer<OrderPlacedEvent>` — records metrics non-invasively |
| `src/Presentation/Nop.Web/Infrastructure/OpenTelemetryExtensions.cs` | OTel SDK registration + `PiiSanitizingProcessor` |
| `observability/` | Docker Compose stack, OTel Collector config, Grafana provisioning |
| `load-test/order-flow.js` | k6 script driving the full checkout flow |
| `CRITIQUE.md` | Architectural critique |
| `ARCHITECTURE.md` | Pre-instrumentation architectural analysis |

### Sensitive data

A `PiiSanitizingProcessor` (registered in `OpenTelemetryExtensions`) removes customer
email, billing address, cookie, and authorization headers from all spans before they leave
the process.  The OTel Collector config applies a second filter as a defence-in-depth
measure.  Only operationally safe tags appear in Jaeger: `order.id`, `order.store_id`,
`order.success`, and `payment_method` (plugin key, not card data).

---


[nopCommerce](https://www.nopcommerce.com/?utm_source=github&utm_medium=content&utm_campaign=homepage) is the best open-source eCommerce platform. nopCommerce is free, and it is the most popular ASP.NET Core shopping cart.

![nopCommerce demo](https://www.nopcommerce.com/images/github/responsive_devices_codeplex.png#v1)

### Key features ###

* The product is being developed and supported by the professional team since 2008.
* nopCommerce has been downloaded more than 3,000,000 times.
* The active developer community has more than 250,000 members.
* nopCommerce runs on .NET 9 with an MS SQL 2012 (or higher) backend database.
* nopCommerce is cross-platform, and you can run it on Windows, Linux, or Mac.
* nopCommerce supports Docker out of the box, so you can easily run nopCommerce on a Linux machine.
* nopCommerce supports PostgreSQL and MySQL databases.
* nopCommerce fully supports web farms. You can read more about it [here](https://docs.nopcommerce.com/en/developer/tutorials/web-farms.html?utm_source=github&utm_medium=referral&utm_campaign=documentation&utm_content=text).  
* All methods in nopCommerce are async.
* nopCommerce supports multi-factor authentication out of the box.
* Start our [online course for developers](https://nopcommerce.com/training?utm_source=github&utm_medium=referral&utm_campaign=course&utm_content=text) and get the practical and technical skills you need to run and customize nopCommerce websites.

![Logo](https://www.nopcommerce.com/images/github/logos.png#v2)

nopCommerce architecture follows well-known software patterns and the best security practices. The source code is fully customizable. Pluggable and clear architecture makes it easy to develop custom functionality and follow any business requirements.

Using the latest Microsoft technologies, nopCommerce provides high performance, stability, and security. nopCommerce is also fully compatible with Azure and web farms.

Our clear and detailed [documentation](https://docs.nopcommerce.com/developer/index.html?utm_source=github&utm_medium=referral&utm_campaign=documentation&utm_content=text) and [online course](https://nopcommerce.com/training?utm_source=github&utm_medium=referral&utm_campaign=course&utm_content=text) for developers will help you start with nopCommerce easily.


### The advantages of working with nopCommerce ###

nopCommerce offers powerful [out-of-the-box features](https://www.nopcommerce.com/features?utm_source=github&utm_medium=referral&utm_campaign=features&utm_content=text) for creating an online store of any size and type.

nopCommerce is integrated with all the popular third-party services. You can find thousands of integrations on nopCommerce [Marketplace](https://www.nopcommerce.com/marketplace?utm_source=github&utm_medium=referral&utm_campaign=marketplace&utm_content=text).

The [Web API plugin](https://www.nopcommerce.com/web-api?utm_source=github&utm_medium=referral&utm_campaign=WebAPI&utm_content=text) by the nopCommerce team lets you build integrations with third-party services or mobile applications using REST. The Web API plugin is available with source code and covers all methods of nopCommerce: backend and frontend. You can read more about it [here](https://www.nopcommerce.com/web-api?utm_source=github&utm_medium=referral&utm_campaign=WebAPI&utm_content=text).

Friendly members of the [nopCommerce community](https://www.nopcommerce.com/boards?utm_source=github&utm_medium=referral&utm_campaign=forum&utm_content=text) will always help with advice and share their experiences. nopCommerce core development team provides [professional support](https://www.nopcommerce.com/nopcommerce-premium-support-services?utm_source=github&utm_medium=referral&utm_campaign=premium_support&utm_content=text) within 24 hours.


## Store demo ##

Evaluate the functionality and convenience of nopCommerce as a customer and store owner.

Front End | Admin area
----|------
[![ScreenShot](https://www.nopcommerce.com/images/github/public-demo.png#v1)](https://demo.nopcommerce.com?utm_source=github&utm_medium=referral&utm_campaign=demo_store&utm_content=button) | [![ScreenShot](https://www.nopcommerce.com/images/github/admin-demo.png#v1)](https://admin-demo.nopcommerce.com/admin?utm_source=github&utm_medium=referral&utm_campaign=demo_store&utm_content=button)


### nopCommerce resources ###

nopCommerce official site: [https://www.nopcommerce.com](https://www.nopcommerce.com/?utm_source=github&utm_medium=referral&utm_campaign=homepage&utm_content=links)

* [Demo store](https://www.nopcommerce.com/demo?utm_source=github&utm_medium=referral&utm_campaign=demo_store&utm_content=links)
* [Download nopCommerce](https://www.nopcommerce.com/download-nopcommerce?utm_source=github&utm_medium=referral&utm_campaign=download_nop&utm_content=links)
* [Online course for developers](https://nopcommerce.com/training?utm_source=github&utm_medium=referral&utm_campaign=course&utm_content=links)
* [Feature list](https://www.nopcommerce.com/features?utm_source=github&utm_medium=referral&utm_campaign=features&utm_content=links)
* [Web API plugin](https://www.nopcommerce.com/web-api?utm_source=github&utm_medium=referral&utm_campaign=WebAPI&utm_content=links)
* [nopCommerce documentation](https://docs.nopcommerce.com?utm_source=github&utm_medium=referral&utm_campaign=documentation&utm_content=links)
* [Community forums](https://www.nopcommerce.com/boards?utm_source=github&utm_medium=referral&utm_campaign=forum&utm_content=links)
* [Premium support services](https://www.nopcommerce.com/nopcommerce-premium-support-services?utm_source=github&utm_medium=referral&utm_campaign=premium_support&utm_content=links)
* [Certified developer program](https://www.nopcommerce.com/certified-developer-program?utm_source=github&utm_medium=referral&utm_campaign=certified_developer&utm_content=links)
* [nopCommerce partners](https://www.nopcommerce.com/partners?utm_source=github&utm_medium=referral&utm_campaign=solution_partners&utm_content=links)

nopCommerce YouTube: [The Architecture behind the nopCommerce eCommerce Platform](https://www.youtube.com/watch?v=6gLbizzSA9o&list=PLnL_aDfmRHwtJmzeA7SxrpH3-XDY2ue0a)


### Earn with nopCommerce ###

60,000 stores worldwide are powered by nopCommerce, and 10,000 new stores open every year. nopCommerce [solution partners’ directory](https://www.nopcommerce.com/partners?utm_source=github&utm_medium=referral&utm_campaign=solution_partners&utm_content=text_become_partner) gets 80,000+ page views per year from store owners who are looking for a partner to build a store from scratch, migrate from another platform, or improve and customize an existing store.

Become a solution partner of nopCommerce and get new clients – [learn more](https://www.nopcommerce.com/become-partner?utm_source=github&utm_medium=referral&utm_campaign=become-partner&utm_content=learn_more).

Create a new graphical theme or develop a new plugin or integration and sell it on the nopCommerce [Marketplace](https://www.nopcommerce.com/marketplace?utm_source=github&utm_medium=referral&utm_campaign=marketplace&utm_content=text_sell_on_marketplace).


### Contribute ###

As a free and open-source project, we are very grateful to everyone who helps us to develop nopCommerce. Please find more details about the options and bonuses for contributors at [contribute page](https://www.nopcommerce.com/contribute?utm_source=github&utm_medium=referral&utm_campaign=contribute&utm_content=text).
