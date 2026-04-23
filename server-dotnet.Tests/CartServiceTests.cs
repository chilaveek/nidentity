using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using server_dotnet.Application.DTOs;
using server_dotnet.Application.Services;
using server_dotnet.Domain.Entities;
using server_dotnet.Domain.Enums;
using server_dotnet.Infrastructure.Data;

namespace server_dotnet.Tests.Application.Services;

public class CartServiceTests : IDisposable
{
    private readonly InMemoryDatabaseRoot _databaseRoot = new();
    private readonly DbContextOptions<ApplicationDbContext> _dbContextOptions;
    private readonly ApplicationDbContext _dbContext;
    private readonly CartService _service;

    public CartServiceTests()
    {
        _dbContextOptions = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString(), _databaseRoot)
            .Options;

        _dbContext = new ApplicationDbContext(_dbContextOptions);
        _dbContext.Database.EnsureCreated();
        _service = new CartService(_dbContext);
    }

    public void Dispose()
    {
        _dbContext.Database.EnsureDeleted();
        _dbContext.Dispose();
    }

    [Fact]
    public async Task GetCartAsync_UserHasActiveCart_ReturnsMappedItems()
    {
        // Организация (Arrange)
        var buyer = CreateUser();
        var author = CreateUser(email: "author@getcart.test");
        var marketItem = CreateMarketItem(
            authorId: author.Id,
            title: "Retro Wave",
            finalPrice: 230m,
            basePrice: 120m,
            thumbnailUrl: "front-image.png",
            backThumbnailUrl: "back-image.png");
        var order = CreateOrder(buyer.Id, totalAmount: 690m);
        var orderItem = CreateOrderItem(order, marketItem, quantity: 3, size: "L");
        await _dbContext.SaveChangesAsync();

        // Действие (Act)
        var result = (await _service.GetCartAsync(buyer.Id.ToString())).ToList();

        // Утверждение (Assert)
        var cartItem = Assert.Single(result);
        Assert.Equal(orderItem.Id, cartItem.Id);
        Assert.Equal(marketItem.Id, cartItem.ProductId);
        Assert.Equal("L", cartItem.Size);
        Assert.Equal(3, cartItem.Quantity);
        Assert.Equal("Retro Wave", cartItem.Title);
        Assert.Equal(230m, cartItem.Price);
        Assert.Equal("front-image.png", cartItem.ImageUrl);
        Assert.Equal("back-image.png", cartItem.BackImageUrl);
    }

    [Fact]
    public async Task GetCartAsync_UserHasNoActiveCart_ReturnsEmptyCollection()
    {
        // Организация (Arrange)
        var buyer = CreateUser();
        var author = CreateUser(email: "author-no-cart@test.local");
        var marketItem = CreateMarketItem(author.Id, title: "Inactive Cart Item");
        var order = CreateOrder(buyer.Id, status: OrderStatus.Printing, totalAmount: marketItem.FinalPrice);
        CreateOrderItem(order, marketItem);
        await _dbContext.SaveChangesAsync();

        // Действие (Act)
        var result = await _service.GetCartAsync(buyer.Id.ToString());

        // Утверждение (Assert)
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetCartAsync_InvalidUserId_ReturnsEmptyCollection()
    {
        // Организация (Arrange)

        // Действие (Act)
        var result = await _service.GetCartAsync("not-a-guid");

        // Утверждение (Assert)
        Assert.Empty(result);
    }

    [Fact]
    public async Task AddToCartAsync_CartDoesNotExist_CreatesOrderAndAddsItem()
    {
        // Организация (Arrange)
        var buyer = CreateUser();
        var author = CreateUser(email: "author-add-new@test.local");
        var marketItem = CreateMarketItem(author.Id, finalPrice: 175m, basePrice: 90m);
        await _dbContext.SaveChangesAsync();

        var dto = new AddToCartDto
        {
            ProductId = marketItem.Id,
            Size = "M",
            Quantity = 2
        };

        // Действие (Act)
        var result = await _service.AddToCartAsync(buyer.Id.ToString(), dto);

        // Утверждение (Assert)
        Assert.True(result.Success);
        Assert.Equal(string.Empty, result.Error);

        using var assertContext = CreateDbContext();
        var order = await assertContext.Orders
            .Include(o => o.OrderItems)
            .SingleAsync(o => o.UserId == buyer.Id);

        Assert.Equal(OrderStatus.New, order.Status);
        Assert.Equal(350m, order.TotalAmount);

        var orderItem = Assert.Single(order.OrderItems);
        Assert.Equal(marketItem.Id, orderItem.MarketItemId);
        Assert.Equal("M", orderItem.Size);
        Assert.Equal(2, orderItem.Quantity);
        Assert.Equal(175m, orderItem.PriceAtPurchase);
    }

    [Fact]
    public async Task AddToCartAsync_ItemAlreadyExists_IncreasesQuantityAndUpdatesTotalAmount()
    {
        // Организация (Arrange)
        var buyer = CreateUser();
        var author = CreateUser(email: "author-add-existing@test.local");
        var marketItem = CreateMarketItem(author.Id, finalPrice: 150m, basePrice: 80m);
        var order = CreateOrder(buyer.Id, totalAmount: 150m);
        CreateOrderItem(order, marketItem, quantity: 1, size: "M");
        await _dbContext.SaveChangesAsync();

        var dto = new AddToCartDto
        {
            ProductId = marketItem.Id,
            Size = "M",
            Quantity = 2
        };

        // Действие (Act)
        var result = await _service.AddToCartAsync(buyer.Id.ToString(), dto);

        // Утверждение (Assert)
        Assert.True(result.Success);
        Assert.Equal(string.Empty, result.Error);

        using var assertContext = CreateDbContext();
        var orderItems = await assertContext.OrderItems
            .Where(i => i.OrderId == order.Id)
            .ToListAsync();
        var actualOrder = await assertContext.Orders.SingleAsync(o => o.Id == order.Id);

        var orderItem = Assert.Single(orderItems);
        Assert.Equal(3, orderItem.Quantity);
        Assert.Equal(450m, actualOrder.TotalAmount);
    }

    [Fact]
    public async Task AddToCartAsync_InvalidProductId_ReturnsFalseAndError()
    {
        // Организация (Arrange)
        var buyer = CreateUser();
        await _dbContext.SaveChangesAsync();

        var dto = new AddToCartDto
        {
            ProductId = Guid.NewGuid(),
            Size = "S",
            Quantity = 1
        };

        // Действие (Act)
        var result = await _service.AddToCartAsync(buyer.Id.ToString(), dto);

        // Утверждение (Assert)
        Assert.False(result.Success);
        Assert.Equal("Товар не найден.", result.Error);
        Assert.Empty(_dbContext.Orders);
        Assert.Empty(_dbContext.OrderItems);
    }

    [Fact]
    public async Task AddCustomToCartAsync_ValidData_CreatesEntitiesAndAddsItemToCart()
    {
        // Организация (Arrange)
        var buyer = CreateUser();
        await _dbContext.SaveChangesAsync();

        var dto = new PublishDesignDto
        {
            Title = "Custom Hero Tee",
            ProductType = "TShirt",
            Color = "Black",
            ThumbnailUrl = "custom-preview.png",
            LayersDataJson = JsonSerializer.Serialize(new[]
            {
                new DesignLayer
                {
                    Id = "layer-1",
                    Type = "text",
                    Content = "Hero",
                    Scale = 1.0,
                    Color = "#ffffff",
                    FontFamily = "Montserrat",
                    Side = "front"
                }
            })
        };

        // Действие (Act)
        var result = await _service.AddCustomToCartAsync(buyer.Id.ToString(), dto, "XL", 2);

        // Утверждение (Assert)
        Assert.True(result.Success);
        Assert.Equal(string.Empty, result.Error);

        using var assertContext = CreateDbContext();

        var baseProduct = await assertContext.BaseProducts.SingleAsync();
        Assert.Equal(ProductType.TShirt, baseProduct.Type);
        Assert.Equal("Black", baseProduct.Color);
        Assert.Equal(800m, baseProduct.BasePrice);
        Assert.True(baseProduct.IsActive);

        var design = await assertContext.Designs.SingleAsync();
        Assert.Equal(buyer.Id, design.AuthorId);
        Assert.Equal("Custom Hero Tee", design.Title);
        Assert.Equal("custom-preview.png", design.ThumbnailUrl);
        Assert.Equal(DesignStatus.Draft, design.Status);
        Assert.Equal("[]", design.Tags);
        Assert.Single(design.LayersData);
        Assert.Equal("Hero", design.LayersData[0].Content);

        var marketItem = await assertContext.MarketItems.SingleAsync();
        Assert.Equal(design.Id, marketItem.DesignId);
        Assert.Equal(baseProduct.Id, marketItem.BaseProductId);
        Assert.Equal(1600m, marketItem.FinalPrice);
        Assert.Equal(0, marketItem.PopularityScore);

        var order = await assertContext.Orders
            .Include(o => o.OrderItems)
            .SingleAsync();
        Assert.Equal(buyer.Id, order.UserId);
        Assert.Equal(OrderStatus.New, order.Status);
        Assert.Equal(3200m, order.TotalAmount);

        var orderItem = Assert.Single(order.OrderItems);
        Assert.Equal(marketItem.Id, orderItem.MarketItemId);
        Assert.Equal("XL", orderItem.Size);
        Assert.Equal(2, orderItem.Quantity);
        Assert.Equal(1600m, orderItem.PriceAtPurchase);
    }

    [Fact]
    public async Task AddCustomToCartAsync_InvalidProductType_ReturnsFalseAndError()
    {
        // Организация (Arrange)
        var buyer = CreateUser();
        await _dbContext.SaveChangesAsync();

        var dto = new PublishDesignDto
        {
            Title = "Broken Product",
            ProductType = "Mug",
            Color = "White",
            LayersDataJson = "[]"
        };

        // Действие (Act)
        var result = await _service.AddCustomToCartAsync(buyer.Id.ToString(), dto, "M", 1);

        // Утверждение (Assert)
        Assert.False(result.Success);
        Assert.Equal("Неверный тип продукта.", result.Error);
        Assert.Empty(_dbContext.BaseProducts);
        Assert.Empty(_dbContext.Designs);
        Assert.Empty(_dbContext.MarketItems);
        Assert.Empty(_dbContext.Orders);
        Assert.Empty(_dbContext.OrderItems);
    }

    [Fact]
    public async Task RemoveFromCartAsync_ItemExistsInCart_RemovesItemAndRecalculatesTotalAmount()
    {
        // Организация (Arrange)
        var buyer = CreateUser();
        var author = CreateUser(email: "author-remove@test.local");
        var firstMarketItem = CreateMarketItem(author.Id, title: "First", finalPrice: 100m, basePrice: 60m);
        var secondMarketItem = CreateMarketItem(author.Id, title: "Second", finalPrice: 150m, basePrice: 75m);
        var order = CreateOrder(buyer.Id, totalAmount: 500m);
        var removableItem = CreateOrderItem(order, firstMarketItem, quantity: 2, size: "M");
        CreateOrderItem(order, secondMarketItem, quantity: 2, size: "L");
        await _dbContext.SaveChangesAsync();

        // Действие (Act)
        var result = await _service.RemoveFromCartAsync(buyer.Id.ToString(), removableItem.Id);

        // Утверждение (Assert)
        Assert.True(result.Success);
        Assert.Equal(string.Empty, result.Error);

        using var assertContext = CreateDbContext();
        var actualOrder = await assertContext.Orders
            .Include(o => o.OrderItems)
            .SingleAsync(o => o.Id == order.Id);

        var remainingItem = Assert.Single(actualOrder.OrderItems);
        Assert.Equal(secondMarketItem.Id, remainingItem.MarketItemId);
        Assert.Equal(300m, actualOrder.TotalAmount);
        Assert.Null(await assertContext.OrderItems.FindAsync(removableItem.Id));
    }

    [Fact]
    public async Task RemoveFromCartAsync_ItemDoesNotExist_ReturnsFalseAndError()
    {
        // Организация (Arrange)
        var buyer = CreateUser();
        var author = CreateUser(email: "author-remove-missing@test.local");
        var marketItem = CreateMarketItem(author.Id, finalPrice: 125m, basePrice: 70m);
        var order = CreateOrder(buyer.Id, totalAmount: 125m);
        CreateOrderItem(order, marketItem, quantity: 1, size: "M");
        await _dbContext.SaveChangesAsync();

        // Действие (Act)
        var result = await _service.RemoveFromCartAsync(buyer.Id.ToString(), Guid.NewGuid());

        // Утверждение (Assert)
        Assert.False(result.Success);
        Assert.Equal("Позиция не найдена.", result.Error);

        using var assertContext = CreateDbContext();
        var actualOrder = await assertContext.Orders
            .Include(o => o.OrderItems)
            .SingleAsync(o => o.Id == order.Id);

        Assert.Single(actualOrder.OrderItems);
        Assert.Equal(125m, actualOrder.TotalAmount);
    }

    [Fact]
    public async Task RemoveFromCartAsync_CartIsEmpty_ReturnsFalseAndError()
    {
        // Организация (Arrange)
        var buyer = CreateUser();
        await _dbContext.SaveChangesAsync();

        // Действие (Act)
        var result = await _service.RemoveFromCartAsync(buyer.Id.ToString(), Guid.NewGuid());

        // Утверждение (Assert)
        Assert.False(result.Success);
        Assert.Equal("Корзина пуста.", result.Error);
    }

    [Fact]
    public async Task CheckoutAsync_CartHasItems_UpdatesOrderPopularityAndAuthorStatistics()
    {
        // Организация (Arrange)
        var buyer = CreateUser(address: "Москва, ул. Тестовая, д. 10");
        var author = CreateUser(email: "author-checkout@test.local");

        _dbContext.AuthorStatistics.Add(new AuthorStatistic
        {
            Id = author.Id,
            TotalRevenue = 50m,
            TotalItemsSold = 1,
            ActiveDesignsCount = 2,
            Balance = 10m
        });

        var firstMarketItem = CreateMarketItem(author.Id, title: "Galaxy", finalPrice: 200m, basePrice: 100m, popularityScore: 5);
        var secondMarketItem = CreateMarketItem(author.Id, title: "Neon", finalPrice: 300m, basePrice: 150m, popularityScore: 7);
        var order = CreateOrder(buyer.Id, totalAmount: 700m);
        CreateOrderItem(order, firstMarketItem, quantity: 2, size: "M");
        CreateOrderItem(order, secondMarketItem, quantity: 1, size: "L");
        await _dbContext.SaveChangesAsync();

        // Действие (Act)
        var result = await _service.CheckoutAsync(buyer.Id.ToString());

        // Утверждение (Assert)
        Assert.True(result.Success);
        Assert.Equal(string.Empty, result.Error);

        using var assertContext = CreateDbContext();
        var actualOrder = await assertContext.Orders.SingleAsync(o => o.Id == order.Id);
        var actualStatistic = await assertContext.AuthorStatistics.SingleAsync(s => s.Id == author.Id);
        var actualFirstItem = await assertContext.MarketItems.SingleAsync(m => m.Id == firstMarketItem.Id);
        var actualSecondItem = await assertContext.MarketItems.SingleAsync(m => m.Id == secondMarketItem.Id);

        Assert.Equal(OrderStatus.Printing, actualOrder.Status);
        Assert.Equal("Москва, ул. Тестовая, д. 10", actualOrder.Address);
        Assert.Equal(7, actualFirstItem.PopularityScore);
        Assert.Equal(8, actualSecondItem.PopularityScore);
        Assert.Equal(4, actualStatistic.TotalItemsSold);
        Assert.Equal(750m, actualStatistic.TotalRevenue);
        Assert.Equal(255m, actualStatistic.Balance);
    }

    [Fact]
    public async Task CheckoutAsync_CartIsEmpty_ReturnsFalse()
    {
        // Организация (Arrange)
        var buyer = CreateUser(address: "Москва, ул. Пустая, д. 1");
        CreateOrder(buyer.Id, totalAmount: 0m);
        await _dbContext.SaveChangesAsync();

        // Действие (Act)
        var result = await _service.CheckoutAsync(buyer.Id.ToString());

        // Утверждение (Assert)
        Assert.False(result.Success);
        Assert.Equal("Корзина пуста.", result.Error);

        using var assertContext = CreateDbContext();
        var order = await assertContext.Orders.SingleAsync(o => o.UserId == buyer.Id);
        Assert.Equal(OrderStatus.New, order.Status);
        Assert.Null(order.Address);
    }

    private ApplicationDbContext CreateDbContext()
    {
        return new ApplicationDbContext(_dbContextOptions);
    }

    private AppUser CreateUser(string? email = null, string? address = null)
    {
        var user = new AppUser
        {
            Id = Guid.NewGuid(),
            Email = email ?? $"user-{Guid.NewGuid():N}@test.local",
            PasswordHash = "hashed-password",
            Address = address
        };

        _dbContext.Users.Add(user);
        return user;
    }

    private MarketItem CreateMarketItem(
        Guid authorId,
        string title = "Test Design",
        decimal finalPrice = 120m,
        decimal basePrice = 60m,
        ProductType productType = ProductType.TShirt,
        string color = "Black",
        int popularityScore = 0,
        string? thumbnailUrl = "preview.png",
        string? backThumbnailUrl = "preview-back.png")
    {
        var baseProduct = new BaseProduct
        {
            Id = Guid.NewGuid(),
            Type = productType,
            Color = color,
            BasePrice = basePrice,
            IsActive = true
        };

        var design = new Design
        {
            Id = Guid.NewGuid(),
            AuthorId = authorId,
            Title = title,
            LayersData =
            [
                new DesignLayer
                {
                    Id = "layer-default",
                    Type = "text",
                    Content = "Sample",
                    Scale = 1.0,
                    Color = "#000000",
                    FontFamily = "Arial",
                    Side = "front"
                }
            ],
            ThumbnailUrl = thumbnailUrl,
            BackThumbnailUrl = backThumbnailUrl,
            Tags = "[]",
            Status = DesignStatus.Draft,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var marketItem = new MarketItem
        {
            Id = Guid.NewGuid(),
            DesignId = design.Id,
            BaseProductId = baseProduct.Id,
            FinalPrice = finalPrice,
            PopularityScore = popularityScore,
            Design = design,
            BaseProduct = baseProduct
        };

        _dbContext.BaseProducts.Add(baseProduct);
        _dbContext.Designs.Add(design);
        _dbContext.MarketItems.Add(marketItem);

        return marketItem;
    }

    private Order CreateOrder(Guid userId, OrderStatus status = OrderStatus.New, decimal totalAmount = 0m)
    {
        var order = new Order
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Status = status,
            TotalAmount = totalAmount,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Orders.Add(order);
        return order;
    }

    private OrderItem CreateOrderItem(Order order, MarketItem marketItem, int quantity = 1, string size = "M")
    {
        var orderItem = new OrderItem
        {
            Id = Guid.NewGuid(),
            OrderId = order.Id,
            MarketItemId = marketItem.Id,
            Size = size,
            Quantity = quantity,
            PriceAtPurchase = marketItem.FinalPrice,
            Order = order,
            MarketItem = marketItem
        };

        order.OrderItems.Add(orderItem);
        marketItem.OrderItems.Add(orderItem);
        _dbContext.OrderItems.Add(orderItem);

        return orderItem;
    }
}
