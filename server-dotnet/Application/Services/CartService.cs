using Microsoft.EntityFrameworkCore;
using server_dotnet.Application.DTOs;
using server_dotnet.Application.Interfaces;
using server_dotnet.Domain.Entities;
using server_dotnet.Domain.Enums;
using server_dotnet.Infrastructure.Data;

namespace server_dotnet.Application.Services;

/// <summary>
/// Cart is implemented as an Order with Status = New.
/// Each user has at most one "active" (New) order acting as their cart.
/// </summary>
public class CartService : ICartService
{
    private readonly ApplicationDbContext _db;
    public CartService(ApplicationDbContext db) => _db = db;

    // ── Get cart items ────────────────────────────────────────────────────────
    public async Task<IEnumerable<CartItemDto>> GetCartAsync(string userId)
    {
        if (!Guid.TryParse(userId, out var guid)) return [];

        var order = await _db.Orders
            .Include(o => o.OrderItems)
                .ThenInclude(i => i.MarketItem)
                    .ThenInclude(m => m!.Design)
            .FirstOrDefaultAsync(o => o.UserId == guid && o.Status == OrderStatus.New);

        if (order == null) return [];

        return order.OrderItems
            .Select(i => new CartItemDto
            {
                Id          = i.Id,
                ProductId   = i.MarketItemId,
                Size        = i.Size,
                Quantity    = i.Quantity,
                Title       = i.MarketItem?.Design?.Title ?? "—",
                Price       = i.PriceAtPurchase,
                ImageUrl    = i.MarketItem?.Design?.ThumbnailUrl ?? string.Empty,
                BackImageUrl = i.MarketItem?.Design?.BackThumbnailUrl
            });
    }

    // ── Add to cart ───────────────────────────────────────────────────────────
    public async Task<(bool Success, string Error)> AddToCartAsync(string userId, AddToCartDto dto)
    {
        if (!Guid.TryParse(userId, out var guid))
            return (false, "Невалидный пользователь.");

        var marketItem = await _db.MarketItems
            .Include(m => m.Design)
            .FirstOrDefaultAsync(m => m.Id == dto.ProductId);

        if (marketItem == null)
            return (false, "Товар не найден.");

        // Ensure a cart order exists
        var order = await _db.Orders
            .FirstOrDefaultAsync(o => o.UserId == guid && o.Status == OrderStatus.New);

        if (order == null)
        {
            order = new Order { UserId = guid, Status = OrderStatus.New, TotalAmount = 0 };
            _db.Orders.Add(order);
            await _db.SaveChangesAsync();
        }

        // Check for existing item directly in DB (not via navigation)
        var existing = await _db.OrderItems
            .FirstOrDefaultAsync(i => i.OrderId == order.Id && i.MarketItemId == marketItem.Id && i.Size == dto.Size);

        if (existing != null)
        {
            existing.Quantity += dto.Quantity;
        }
        else
        {
            _db.OrderItems.Add(new OrderItem
            {
                OrderId         = order.Id,
                MarketItemId    = marketItem.Id,
                Size            = dto.Size,
                Quantity        = dto.Quantity,
                PriceAtPurchase = marketItem.FinalPrice
            });
        }

        await _db.SaveChangesAsync(); // Сохраняем добавленный/изменённый предмет в БД

        // Recalculate total
        var allItems = await _db.OrderItems.Where(i => i.OrderId == order.Id).ToListAsync();
        order.TotalAmount = allItems.Sum(i => i.PriceAtPurchase * i.Quantity);

        await _db.SaveChangesAsync(); // Сохраняем обновленный TotalAmount
        return (true, string.Empty);
    }

    // ── Add custom to cart ────────────────────────────────────────────────────
    public async Task<(bool Success, string Error)> AddCustomToCartAsync(string userId, PublishDesignDto dto, string size, int quantity)
    {
        if (!Guid.TryParse(userId, out var guid)) return (false, "Невалидный пользователь.");

        if (!Enum.TryParse<ProductType>(dto.ProductType, true, out var productType))
            return (false, "Неверный тип продукта.");

        List<DesignLayer> layers;
        try
        {
            layers = System.Text.Json.JsonSerializer.Deserialize<List<DesignLayer>>(dto.LayersDataJson,
                         new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? [];
        }
        catch { layers = []; }

        var baseProduct = await _db.BaseProducts.FirstOrDefaultAsync(p =>
            p.Type == productType && p.Color.ToLower() == dto.Color.ToLower() && p.IsActive);

        if (baseProduct == null)
        {
            baseProduct = new BaseProduct
            {
                Type      = productType,
                Color     = dto.Color,
                BasePrice = productType == ProductType.TShirt ? 800m : 1500m,
                IsActive  = true
            };
            _db.BaseProducts.Add(baseProduct);
            await _db.SaveChangesAsync();
        }

        var design = new Design
        {
            AuthorId     = guid,
            Title        = string.IsNullOrWhiteSpace(dto.Title) ? "Кастомный дизайн" : dto.Title,
            LayersData   = layers,
            ThumbnailUrl = string.IsNullOrWhiteSpace(dto.ThumbnailUrl) ? null : dto.ThumbnailUrl,
            Tags         = "[]",
            Status       = DesignStatus.Draft,
            CreatedAt    = DateTime.UtcNow,
            UpdatedAt    = DateTime.UtcNow
        };
        _db.Designs.Add(design);
        await _db.SaveChangesAsync();

        var marketItem = new MarketItem
        {
            DesignId       = design.Id,
            BaseProductId  = baseProduct.Id,
            FinalPrice     = baseProduct.BasePrice * 2,
            PopularityScore = 0
        };
        _db.MarketItems.Add(marketItem);
        await _db.SaveChangesAsync();

        return await AddToCartAsync(userId, new AddToCartDto { ProductId = marketItem.Id, Size = size, Quantity = quantity });
    }

    // ── Remove item ───────────────────────────────────────────────────────────
public async Task<(bool Success, string Error)> RemoveFromCartAsync(string userId, Guid itemId)
    {
        if (!Guid.TryParse(userId, out var guid))
            return (false, "Невалидный пользователь.");

        var order = await _db.Orders
            .Include(o => o.OrderItems)
            .FirstOrDefaultAsync(o => o.UserId == guid && o.Status == OrderStatus.New);

        if (order == null) return (false, "Корзина пуста.");

        var item = order.OrderItems.FirstOrDefault(i => i.Id == itemId);
        if (item == null) return (false, "Позиция не найдена.");

        order.OrderItems.Remove(item);
        _db.OrderItems.Remove(item);
        order.TotalAmount = order.OrderItems.Sum(i => i.PriceAtPurchase * i.Quantity);
        await _db.SaveChangesAsync();
        return (true, string.Empty);
    }

    // ── Checkout ──────────────────────────────────────────────────────────────
    public async Task<(bool Success, string Error)> CheckoutAsync(string userId)
    {
        if (!Guid.TryParse(userId, out var guid))
            return (false, "Невалидный пользователь.");

        var order = await _db.Orders
            .Include(o => o.OrderItems)
                .ThenInclude(i => i.MarketItem)
                    .ThenInclude(m => m!.Design)
            .Include(o => o.OrderItems)
                .ThenInclude(i => i.MarketItem)
                    .ThenInclude(m => m!.BaseProduct)
            .FirstOrDefaultAsync(o => o.UserId == guid && o.Status == OrderStatus.New);

        if (order == null || !order.OrderItems.Any())
            return (false, "Корзина пуста.");

        // Copy user address onto order
        var user = await _db.Users.FindAsync(guid);
        if (user != null)
            order.Address = user.Address;

        // Increase popularity score for each purchased market item
        foreach (var item in order.OrderItems)
        {
            if (item.MarketItem != null)
                item.MarketItem.PopularityScore += item.Quantity;
        }

        // Update author statistics + balance
        var authorGroups = order.OrderItems
            .Where(i => i.MarketItem?.Design != null)
            .GroupBy(i => i.MarketItem!.Design!.AuthorId);

        foreach (var group in authorGroups)
        {
            var stat = await _db.AuthorStatistics.FindAsync(group.Key);
            if (stat != null)
            {
                var totalQty = group.Sum(i => i.Quantity);
                var totalRevenue = group.Sum(i => i.PriceAtPurchase * i.Quantity);

                stat.TotalItemsSold += totalQty;
                stat.TotalRevenue   += totalRevenue;

                // Author earns 70% of (finalPrice - baseCost) per item
                var earnings = group.Sum(i =>
                {
                    var baseCost = i.MarketItem?.BaseProduct?.BasePrice ?? 0m;
                    var markup = Math.Max(0, i.PriceAtPurchase - baseCost);
                    return markup * 0.7m * i.Quantity;
                });
                stat.Balance += earnings;
            }
        }

        order.Status = OrderStatus.Printing;
        await _db.SaveChangesAsync();
        return (true, string.Empty);
    }

}
