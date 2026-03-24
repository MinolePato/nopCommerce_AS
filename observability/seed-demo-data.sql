
-- criar produtos para fazer a analsie(full AI)
-- -----------------------------------------------------------------------------
-- 1. Update existing products
-- -----------------------------------------------------------------------------

-- Out of stock
UPDATE Product SET ManageInventoryMethodId = 1, StockQuantity = 0
WHERE Name IN (
    'HTC One Mini Blue',
    'Nike Floral Roshe Customized Running Shoes',
    'Fahrenheit 451 by Ray Bradbury'
);

-- Call for price
UPDATE Product SET CallForPrice = 1
WHERE Name IN ('Apple MacBook Pro');

-- -----------------------------------------------------------------------------
-- 2. Insert new products
--    Columns match the minimum required by nopCommerce (based on existing rows)
-- -----------------------------------------------------------------------------

INSERT INTO Product (
    Name, Sku, ProductTypeId, ParentGroupedProductId, VisibleIndividually,
    ShortDescription, FullDescription,
    ProductTemplateId, VendorId, ShowOnHomepage, AllowCustomerReviews,
    ApprovedRatingSum, NotApprovedRatingSum, ApprovedTotalReviews, NotApprovedTotalReviews,
    SubjectToAcl, LimitedToStores,
    IsGiftCard, GiftCardTypeId,
    RequireOtherProducts, AutomaticallyAddRequiredProducts,
    IsDownload, DownloadId, UnlimitedDownloads, MaxNumberOfDownloads, DownloadActivationTypeId,
    HasSampleDownload, SampleDownloadId, HasUserAgreement,
    IsRecurring, RecurringCycleLength, RecurringCyclePeriodId, RecurringTotalCycles,
    IsRental, RentalPriceLength, RentalPricePeriodId,
    IsShipEnabled, IsFreeShipping, ShipSeparately, AdditionalShippingCharge,
    DeliveryDateId, IsTaxExempt, TaxCategoryId,
    ManageInventoryMethodId, ProductAvailabilityRangeId, UseMultipleWarehouses, WarehouseId,
    StockQuantity, MinStockQuantity, LowStockActivityId, NotifyAdminForQuantityBelow,
    AllowBackInStockSubscriptions, BackorderModeId, OrderMinimumQuantity, OrderMaximumQuantity,
    AllowAddingOnlyExistingAttributeCombinations, DisplayAttributeCombinationImagesOnly,
    NotReturnable, DisableBuyButton, DisableWishlistButton,
    DisplayStockAvailability, DisplayStockQuantity,
    AvailableForPreOrder,
    CallForPrice, Price, OldPrice, ProductCost,
    CustomerEntersPrice, MinimumCustomerEnteredPrice, MaximumCustomerEnteredPrice,
    BasepriceEnabled, BasepriceAmount, BasepriceUnitId, BasepriceBaseAmount, BasepriceBaseUnitId,
    MarkAsNew, Weight, Length, Width, Height,
    DisplayOrder, Published, Deleted, CreatedOnUtc, UpdatedOnUtc,
    AgeVerification, MinimumAgeToPurchase
) VALUES

-- ── Electronics ─────────────────────────────────────────────────────────────
('Sony WH-1000XM5 Headphones',  'SONY-WH1000XM5', 5, 0, 1, 'Industry-leading noise cancellation headphones.', '', 1, 0, 0, 1, 0,0,0,0, 0,0, 0,0, 0,0, 0,0,1,0,0, 0,0,0, 0,0,0,0, 0,0,0, 1,0,0,0, 0,0,1, 1,0,0,0, 10000,0,0,1, 0,0,1,10000, 0,0, 0,0,0, 0,0, 0,0,349.00,399.00,0, 0,0,0, 0,0,0,0,0, 0,0.5,1,1,0.5, 0,1,0,NOW(),NOW(), 0,0),

('Bose SoundLink Flex Speaker',  'BOSE-SLF', 5, 0, 1, 'Portable waterproof Bluetooth speaker.', '', 1, 0, 0, 1, 0,0,0,0, 0,0, 0,0, 0,0, 0,0,1,0,0, 0,0,0, 0,0,0,0, 0,0,0, 1,0,0,0, 0,0,1, 1,0,0,0, 0,0,0,1, 0,0,1,10000, 0,0, 0,0,0, 0,0, 0,0,199.00,229.00,0, 0,0,0, 0,0,0,0,0, 0,0.8,1,1,0.8, 0,1,0,NOW(),NOW(), 0,0),

('Bang & Olufsen Beoplay H95',   'BO-H95', 5, 0, 1, 'Premium wireless headphones with adaptive noise cancellation.', '', 1, 0, 0, 1, 0,0,0,0, 0,0, 0,0, 0,0, 0,0,1,0,0, 0,0,0, 0,0,0,0, 0,0,0, 1,0,0,0, 0,0,1, 1,0,0,0, 10000,0,0,1, 0,0,1,10000, 0,0, 0,0,0, 0,0, 0,1,0.00,0.00,0, 0,0,0, 0,0,0,0,0, 0,0.4,1,1,0.4, 0,1,0,NOW(),NOW(), 0,0),

-- ── Computers ───────────────────────────────────────────────────────────────
('Dell XPS 15 Laptop',           'DELL-XPS15', 5, 0, 1, 'High-performance 15-inch laptop with OLED display.', '', 1, 0, 0, 1, 0,0,0,0, 0,0, 0,0, 0,0, 0,0,1,0,0, 0,0,0, 0,0,0,0, 0,0,0, 1,0,0,0, 0,0,1, 1,0,0,0, 10000,0,0,1, 0,0,1,10000, 0,0, 0,0,0, 0,0, 0,0,1299.00,1499.00,0, 0,0,0, 0,0,0,0,0, 0,2,38,26,2, 0,1,0,NOW(),NOW(), 0,0),

('Lenovo ThinkPad X1 Carbon',    'LEN-X1C', 5, 0, 1, 'Ultra-light business laptop with legendary keyboard.', '', 1, 0, 0, 1, 0,0,0,0, 0,0, 0,0, 0,0, 0,0,1,0,0, 0,0,0, 0,0,0,0, 0,0,0, 1,0,0,0, 0,0,1, 1,0,0,0, 0,0,0,1, 0,0,1,10000, 0,0, 0,0,0, 0,0, 0,0,1199.00,1399.00,0, 0,0,0, 0,0,0,0,0, 0,1.1,32,22,1.5, 0,1,0,NOW(),NOW(), 0,0),

('Alienware Aurora R16',         'AW-R16', 5, 0, 1, 'High-end gaming desktop with latest GPU.', '', 1, 0, 0, 1, 0,0,0,0, 0,0, 0,0, 0,0, 0,0,1,0,0, 0,0,0, 0,0,0,0, 0,0,0, 1,0,0,0, 0,0,1, 1,0,0,0, 10000,0,0,1, 0,0,1,10000, 0,0, 0,0,0, 0,0, 0,1,0.00,0.00,0, 0,0,0, 0,0,0,0,0, 0,15,50,30,45, 0,1,0,NOW(),NOW(), 0,0),

-- ── Camera & Photo ───────────────────────────────────────────────────────────
('Sony Alpha A7 IV Mirrorless',  'SONY-A7IV', 5, 0, 1, 'Full-frame mirrorless camera, 33MP sensor.', '', 1, 0, 0, 1, 0,0,0,0, 0,0, 0,0, 0,0, 0,0,1,0,0, 0,0,0, 0,0,0,0, 0,0,0, 1,0,0,0, 0,0,1, 1,0,0,0, 10000,0,0,1, 0,0,1,10000, 0,0, 0,0,0, 0,0, 0,1,0.00,0.00,0, 0,0,0, 0,0,0,0,0, 0,0.66,13,9,0.8, 0,1,0,NOW(),NOW(), 0,0),

('GoPro Hero 12 Black',          'GOPRO-H12', 5, 0, 1, 'Waterproof action camera with 5.3K video.', '', 1, 0, 0, 1, 0,0,0,0, 0,0, 0,0, 0,0, 0,0,1,0,0, 0,0,0, 0,0,0,0, 0,0,0, 1,0,0,0, 0,0,1, 1,0,0,0, 10000,0,0,1, 0,0,1,10000, 0,0, 0,0,0, 0,0, 0,0,399.00,449.00,0, 0,0,0, 0,0,0,0,0, 0,0.15,7,5,3, 0,1,0,NOW(),NOW(), 0,0),

('Canon EOS R5 Mark II',         'CANON-R5II', 5, 0, 1, 'Professional mirrorless camera with 8K video.', '', 1, 0, 0, 1, 0,0,0,0, 0,0, 0,0, 0,0, 0,0,1,0,0, 0,0,0, 0,0,0,0, 0,0,0, 1,0,0,0, 0,0,1, 1,0,0,0, 0,0,0,1, 0,0,1,10000, 0,0, 0,0,0, 0,0, 0,0,4299.00,4499.00,0, 0,0,0, 0,0,0,0,0, 0,0.74,14,10,0.9, 0,1,0,NOW(),NOW(), 0,0),

-- ── Cell phones ─────────────────────────────────────────────────────────────
('Google Pixel 9 Pro',           'GOOG-PIX9P', 5, 0, 1, 'Google flagship with advanced AI photography.', '', 1, 0, 0, 1, 0,0,0,0, 0,0, 0,0, 0,0, 0,0,1,0,0, 0,0,0, 0,0,0,0, 0,0,0, 1,0,0,0, 0,0,1, 1,0,0,0, 10000,0,0,1, 0,0,1,10000, 0,0, 0,0,0, 0,0, 0,0,999.00,1099.00,0, 0,0,0, 0,0,0,0,0, 0,0.22,16,7,0.9, 0,1,0,NOW(),NOW(), 0,0),

('OnePlus 12 5G',                'OP-12-5G', 5, 0, 1, 'Flagship killer with Hasselblad tuned cameras.', '', 1, 0, 0, 1, 0,0,0,0, 0,0, 0,0, 0,0, 0,0,1,0,0, 0,0,0, 0,0,0,0, 0,0,0, 1,0,0,0, 0,0,1, 1,0,0,0, 0,0,0,1, 0,0,1,10000, 0,0, 0,0,0, 0,0, 0,0,799.00,899.00,0, 0,0,0, 0,0,0,0,0, 0,0.22,16,7,0.9, 0,1,0,NOW(),NOW(), 0,0),

('Vertu Signature Touch',        'VERTU-ST', 5, 0, 1, 'Luxury handcrafted smartphone with concierge service.', '', 1, 0, 0, 1, 0,0,0,0, 0,0, 0,0, 0,0, 0,0,1,0,0, 0,0,0, 0,0,0,0, 0,0,0, 1,0,0,0, 0,0,1, 1,0,0,0, 10000,0,0,1, 0,0,1,10000, 0,0, 0,0,0, 0,0, 0,1,0.00,0.00,0, 0,0,0, 0,0,0,0,0, 0,0.25,15,8,1, 0,1,0,NOW(),NOW(), 0,0),

-- ── Books ────────────────────────────────────────────────────────────────────
('Clean Code by Robert C. Martin','BOOK-CC', 5, 0, 1, 'A handbook of agile software craftsmanship.', '', 1, 0, 0, 1, 0,0,0,0, 0,0, 0,0, 0,0, 0,0,1,0,0, 0,0,0, 0,0,0,0, 0,0,0, 1,0,0,0, 0,0,1, 1,0,0,0, 10000,0,0,1, 0,0,1,10000, 0,0, 0,0,0, 0,0, 0,0,45.00,55.00,0, 0,0,0, 0,0,0,0,0, 0,0.5,23,19,2, 0,1,0,NOW(),NOW(), 0,0),

('The Pragmatic Programmer',     'BOOK-PP', 5, 0, 1, 'Your journey to mastery, 20th Anniversary Edition.', '', 1, 0, 0, 1, 0,0,0,0, 0,0, 0,0, 0,0, 0,0,1,0,0, 0,0,0, 0,0,0,0, 0,0,0, 1,0,0,0, 0,0,1, 1,0,0,0, 0,0,0,1, 0,0,1,10000, 0,0, 0,0,0, 0,0, 0,0,49.00,59.00,0, 0,0,0, 0,0,0,0,0, 0,0.6,24,19,2, 0,1,0,NOW(),NOW(), 0,0),

('Designing Data-Intensive Apps', 'BOOK-DDIA', 5, 0, 1, 'The big ideas behind reliable, scalable and maintainable systems.', '', 1, 0, 0, 1, 0,0,0,0, 0,0, 0,0, 0,0, 0,0,1,0,0, 0,0,0, 0,0,0,0, 0,0,0, 1,0,0,0, 0,0,1, 1,0,0,0, 10000,0,0,1, 0,0,1,10000, 0,0, 0,0,0, 0,0, 0,1,0.00,0.00,0, 0,0,0, 0,0,0,0,0, 0,0.9,25,18,5, 0,1,0,NOW(),NOW(), 0,0),

-- ── Clothing ─────────────────────────────────────────────────────────────────
('Patagonia Nano Puff Jacket',   'PAT-NPJ', 5, 0, 1, 'Lightweight packable insulated jacket.', '', 1, 0, 0, 1, 0,0,0,0, 0,0, 0,0, 0,0, 0,0,1,0,0, 0,0,0, 0,0,0,0, 0,0,0, 1,0,0,0, 0,0,1, 1,0,0,0, 10000,0,0,1, 0,0,1,10000, 0,0, 0,0,0, 0,0, 0,0,229.00,279.00,0, 0,0,0, 0,0,0,0,0, 0,0.3,70,55,5, 0,1,0,NOW(),NOW(), 0,0),

('The North Face Puffer Coat',   'TNF-PC', 5, 0, 1, 'Warm winter coat with 700-fill down insulation.', '', 1, 0, 0, 1, 0,0,0,0, 0,0, 0,0, 0,0, 0,0,1,0,0, 0,0,0, 0,0,0,0, 0,0,0, 1,0,0,0, 0,0,1, 1,0,0,0, 0,0,0,1, 0,0,1,10000, 0,0, 0,0,0, 0,0, 0,0,349.00,399.00,0, 0,0,0, 0,0,0,0,0, 0,0.8,75,55,5, 0,1,0,NOW(),NOW(), 0,0),

('Hermès Birkin 30',             'HERMES-B30', 5, 0, 1, 'Handcrafted luxury leather handbag.', '', 1, 0, 0, 1, 0,0,0,0, 0,0, 0,0, 0,0, 0,0,1,0,0, 0,0,0, 0,0,0,0, 0,0,0, 1,0,0,0, 0,0,1, 1,0,0,0, 10000,0,0,1, 0,0,1,10000, 0,0, 0,0,0, 0,0, 0,1,0.00,0.00,0, 0,0,0, 0,0,0,0,0, 0,0.5,30,20,20, 0,1,0,NOW(),NOW(), 0,0),

-- ── Shoes ─────────────────────────────────────────────────────────────────────
('Adidas Ultraboost 24',         'ADI-UB24', 5, 0, 1, 'Responsive running shoe with Boost midsole.', '', 1, 0, 0, 1, 0,0,0,0, 0,0, 0,0, 0,0, 0,0,1,0,0, 0,0,0, 0,0,0,0, 0,0,0, 1,0,0,0, 0,0,1, 1,0,0,0, 10000,0,0,1, 0,0,1,10000, 0,0, 0,0,0, 0,0, 0,0,180.00,200.00,0, 0,0,0, 0,0,0,0,0, 0,0.35,30,10,12, 0,1,0,NOW(),NOW(), 0,0),

('Jordan 1 Retro High OG',       'NIKE-J1HI', 5, 0, 1, 'Classic basketball shoe, limited edition colourway.', '', 1, 0, 0, 1, 0,0,0,0, 0,0, 0,0, 0,0, 0,0,1,0,0, 0,0,0, 0,0,0,0, 0,0,0, 1,0,0,0, 0,0,1, 1,0,0,0, 0,0,0,1, 0,0,1,10000, 0,0, 0,0,0, 0,0, 0,0,170.00,0.00,0, 0,0,0, 0,0,0,0,0, 0,0.4,30,10,12, 0,1,0,NOW(),NOW(), 0,0),

('Balenciaga Triple S Sneakers', 'BAL-TS', 5, 0, 1, 'Iconic chunky-sole designer sneakers.', '', 1, 0, 0, 1, 0,0,0,0, 0,0, 0,0, 0,0, 0,0,1,0,0, 0,0,0, 0,0,0,0, 0,0,0, 1,0,0,0, 0,0,1, 1,0,0,0, 10000,0,0,1, 0,0,1,10000, 0,0, 0,0,0, 0,0, 0,1,0.00,0.00,0, 0,0,0, 0,0,0,0,0, 0,0.6,30,12,15, 0,1,0,NOW(),NOW(), 0,0),

-- ── Accessories ──────────────────────────────────────────────────────────────
('Apple AirPods Pro 2nd Gen',    'APPLE-APP2', 5, 0, 1, 'Active noise cancellation earbuds with H2 chip.', '', 1, 0, 0, 1, 0,0,0,0, 0,0, 0,0, 0,0, 0,0,1,0,0, 0,0,0, 0,0,0,0, 0,0,0, 1,0,0,0, 0,0,1, 1,0,0,0, 10000,0,0,1, 0,0,1,10000, 0,0, 0,0,0, 0,0, 0,0,249.00,279.00,0, 0,0,0, 0,0,0,0,0, 0,0.06,6,5,3, 0,1,0,NOW(),NOW(), 0,0),

('Sony WF-1000XM5 Earbuds',      'SONY-WF5', 5, 0, 1, 'Premium noise-cancelling wireless earbuds.', '', 1, 0, 0, 1, 0,0,0,0, 0,0, 0,0, 0,0, 0,0,1,0,0, 0,0,0, 0,0,0,0, 0,0,0, 1,0,0,0, 0,0,1, 1,0,0,0, 0,0,0,1, 0,0,1,10000, 0,0, 0,0,0, 0,0, 0,0,279.00,299.00,0, 0,0,0, 0,0,0,0,0, 0,0.05,6,5,3, 0,1,0,NOW(),NOW(), 0,0),

('Rolex Submariner Date',        'ROX-SUB', 5, 0, 1, 'Iconic Swiss luxury dive watch.', '', 1, 0, 0, 1, 0,0,0,0, 0,0, 0,0, 0,0, 0,0,1,0,0, 0,0,0, 0,0,0,0, 0,0,0, 1,0,0,0, 0,0,1, 1,0,0,0, 10000,0,0,1, 0,0,1,10000, 0,0, 0,0,0, 0,0, 0,1,0.00,0.00,0, 0,0,0, 0,0,0,0,0, 0,0.15,4,4,1.5, 0,1,0,NOW(),NOW(), 0,0);

-- -----------------------------------------------------------------------------
-- 3. URL records  (SEO slugs, one per product)
-- -----------------------------------------------------------------------------
INSERT INTO UrlRecord (EntityId, EntityName, Slug, IsActive, LanguageId)
SELECT p.Id, 'Product',
       LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
           p.Name,
           ' ', '-'), '&', ''), '.', ''), ',', ''), '\'', ''), '"', ''), '(', ''), ')', '')),
       1, 0
FROM Product p
WHERE p.Sku IN (
    'SONY-WH1000XM5','BOSE-SLF','BO-H95',
    'DELL-XPS15','LEN-X1C','AW-R16',
    'SONY-A7IV','GOPRO-H12','CANON-R5II',
    'GOOG-PIX9P','OP-12-5G','VERTU-ST',
    'BOOK-CC','BOOK-PP','BOOK-DDIA',
    'PAT-NPJ','TNF-PC','HERMES-B30',
    'ADI-UB24','NIKE-J1HI','BAL-TS',
    'APPLE-APP2','SONY-WF5','ROX-SUB'
);

-- -----------------------------------------------------------------------------
-- 4. Category mappings
-- -----------------------------------------------------------------------------
INSERT INTO Product_Category_Mapping (ProductId, CategoryId, IsFeaturedProduct, DisplayOrder)
SELECT p.Id, c.Id, 0, 0
FROM Product p
JOIN Category c ON 1=1
WHERE (p.Sku = 'SONY-WH1000XM5' AND c.Name = 'Electronics')
   OR (p.Sku = 'BOSE-SLF'       AND c.Name = 'Electronics')
   OR (p.Sku = 'BO-H95'         AND c.Name = 'Electronics')
   OR (p.Sku = 'DELL-XPS15'     AND c.Name = 'Notebooks')
   OR (p.Sku = 'LEN-X1C'        AND c.Name = 'Notebooks')
   OR (p.Sku = 'AW-R16'         AND c.Name = 'Desktops')
   OR (p.Sku = 'SONY-A7IV'      AND c.Name = 'Camera & photo')
   OR (p.Sku = 'GOPRO-H12'      AND c.Name = 'Camera & photo')
   OR (p.Sku = 'CANON-R5II'     AND c.Name = 'Camera & photo')
   OR (p.Sku = 'GOOG-PIX9P'     AND c.Name = 'Cell phones')
   OR (p.Sku = 'OP-12-5G'       AND c.Name = 'Cell phones')
   OR (p.Sku = 'VERTU-ST'       AND c.Name = 'Cell phones')
   OR (p.Sku = 'BOOK-CC'        AND c.Name = 'Books')
   OR (p.Sku = 'BOOK-PP'        AND c.Name = 'Books')
   OR (p.Sku = 'BOOK-DDIA'      AND c.Name = 'Books')
   OR (p.Sku = 'PAT-NPJ'        AND c.Name = 'Clothing')
   OR (p.Sku = 'TNF-PC'         AND c.Name = 'Clothing')
   OR (p.Sku = 'HERMES-B30'     AND c.Name = 'Clothing')
   OR (p.Sku = 'ADI-UB24'       AND c.Name = 'Shoes')
   OR (p.Sku = 'NIKE-J1HI'      AND c.Name = 'Shoes')
   OR (p.Sku = 'BAL-TS'         AND c.Name = 'Shoes')
   OR (p.Sku = 'APPLE-APP2'     AND c.Name = 'Accessories')
   OR (p.Sku = 'SONY-WF5'       AND c.Name = 'Accessories')
   OR (p.Sku = 'ROX-SUB'        AND c.Name = 'Accessories');

-- -----------------------------------------------------------------------------
-- 5. Summary
-- -----------------------------------------------------------------------------
SELECT
    c.Name                                              AS Category,
    p.Name                                              AS Product,
    CASE p.CallForPrice WHEN 1 THEN 'Call for price'
         ELSE CASE WHEN p.StockQuantity = 0 THEN 'Out of stock'
              ELSE 'In stock' END
    END                                                 AS Status,
    ur.Slug
FROM Product p
JOIN Product_Category_Mapping pcm ON pcm.ProductId = p.Id
JOIN Category c                   ON c.Id = pcm.CategoryId
JOIN UrlRecord ur                 ON ur.EntityId = p.Id AND ur.EntityName = 'Product' AND ur.IsActive = 1
WHERE p.Deleted = 0
ORDER BY c.Name, Status, p.Name;
