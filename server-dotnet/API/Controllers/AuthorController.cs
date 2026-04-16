using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server_dotnet.Application.DTOs;
using server_dotnet.Domain.Entities;
using server_dotnet.Domain.Enums;
using server_dotnet.Infrastructure.Data;

namespace server_dotnet.API.Controllers;

[Route("api/author")]
[ApiController]
[Authorize]
public class AuthorController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public AuthorController(ApplicationDbContext db) => _db = db;

    // ── GET /api/author/profile ───────────────────────────────────────────────
    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userId, out var guid)) return Unauthorized();

        var user = await _db.Users.FindAsync(guid);
        if (user == null || user.Role != UserRole.Author)
            return Ok(new AuthorProfileDto { IsAuthor = false });

        var stat = await _db.AuthorStatistics.FindAsync(guid);
        return Ok(new AuthorProfileDto
        {
            IsAuthor = true,
            Nickname = user.AuthorNickname ?? string.Empty,
            Balance  = stat?.Balance ?? 0m
        });
    }

    // ── GET /api/author/stats ─────────────────────────────────────────────────
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userId, out var guid)) return Unauthorized();

        var stat = await _db.AuthorStatistics.FindAsync(guid);
        var activeDesigns = await _db.Designs
            .CountAsync(d => d.AuthorId == guid && d.Status == DesignStatus.Published);

        return Ok(new AuthorStatsDto
        {
            TotalRevenue      = stat?.TotalRevenue ?? 0m,
            Balance           = stat?.Balance ?? 0m,
            TotalItemsSold    = stat?.TotalItemsSold ?? 0,
            ActiveDesignsCount = activeDesigns
        });
    }

    // ── GET /api/author/stats-full ────────────────────────────────────────────
    [HttpGet("stats-full")]
    public async Task<IActionResult> GetStatsFull()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userId, out var guid)) return Unauthorized();

        var stat = await _db.AuthorStatistics.FindAsync(guid);
        var activeDesigns = await _db.Designs
            .CountAsync(d => d.AuthorId == guid && d.Status == DesignStatus.Published);

        var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);

        var orderItems = await _db.OrderItems
            .Include(i => i.MarketItem)
                .ThenInclude(m => m.Design)
            .Include(i => i.MarketItem)
                .ThenInclude(m => m.BaseProduct)
            .Include(i => i.Order)
            .Where(i => i.MarketItem != null && 
                        i.MarketItem.Design != null &&
                        i.MarketItem.Design.AuthorId == guid && 
                        i.Order != null &&
                        i.Order.Status != OrderStatus.New &&
                        i.Order.Status != OrderStatus.Cancelled &&
                        i.Order.CreatedAt >= thirtyDaysAgo)
            .ToListAsync();

        var chartData = orderItems
            .GroupBy(i => i.Order!.CreatedAt.Date)
            .Select(g => new
            {
                Date = g.Key.ToString("yyyy-MM-dd"),
                ItemsSold = g.Sum(x => x.Quantity),
                Revenue = g.Sum(x => 
                {
                    var baseCost = x.MarketItem?.BaseProduct?.BasePrice ?? 0m;
                    var markup = x.PriceAtPurchase - baseCost;
                    return markup > 0 ? (markup * x.Quantity * 0.7m) : 0m;
                })
            })
            .OrderBy(x => x.Date)
            .ToList();

        // Fill empty days for last 30 days
        var finalChartData = new List<object>();
        for (int i = 29; i >= 0; i--)
        {
            var date = DateTime.UtcNow.AddDays(-i).Date.ToString("yyyy-MM-dd");
            var existing = chartData.FirstOrDefault(c => c.Date == date);
            if (existing != null)
                finalChartData.Add(existing);
            else
                finalChartData.Add(new { Date = date, ItemsSold = 0, Revenue = 0m });
        }

        var topDesigns = orderItems
            .Where(i => i.MarketItem?.Design != null)
            .GroupBy(i => i.MarketItem!.Design!.Id)
            .Select(g => new 
            {
                Title = g.First().MarketItem!.Design!.Title,
                Thumbnail = g.First().MarketItem!.Design!.ThumbnailUrl,
                SalesCount = g.Sum(x => x.Quantity)
            })
            .OrderByDescending(x => x.SalesCount)
            .Take(5)
            .ToList();

        return Ok(new
        {
            totalRevenue      = stat?.TotalRevenue ?? 0m,
            balance           = stat?.Balance ?? 0m,
            totalItemsSold    = stat?.TotalItemsSold ?? 0,
            activeDesignsCount = activeDesigns,
            chartData         = finalChartData,
            topDesigns        = topDesigns
        });
    }

    // ── POST /api/author/become ───────────────────────────────────────────────
    [HttpPost("become")]
    public async Task<IActionResult> BecomeAuthor([FromBody] BecomeAuthorDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userId, out var guid)) return Unauthorized();

        if (string.IsNullOrWhiteSpace(dto.Nickname))
            return BadRequest(new { error = "Никнейм не может быть пустым." });

        var user = await _db.Users.FindAsync(guid);
        if (user == null) return NotFound();

        if (user.Role == UserRole.Author)
            return Ok(new { message = "Вы уже автор!", nickname = user.AuthorNickname });

        bool taken = await _db.Users.AnyAsync(u =>
            u.AuthorNickname != null &&
            u.AuthorNickname.ToLower() == dto.Nickname.ToLower());

        if (taken) return BadRequest(new { error = "Этот никнейм уже занят." });

        user.Role           = UserRole.Author;
        user.AuthorNickname = dto.Nickname;
        user.UpdatedAt      = DateTime.UtcNow;

        if (!await _db.AuthorStatistics.AnyAsync(s => s.Id == guid))
            _db.AuthorStatistics.Add(new AuthorStatistic { Id = guid });

        await _db.SaveChangesAsync();
        return Ok(new { message = "Вы успешно стали автором!", nickname = dto.Nickname });
    }

    // ── GET /api/author/my-designs ────────────────────────────────────────────
    [HttpGet("my-designs")]
    public async Task<IActionResult> GetMyDesigns()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userId, out var guid)) return Unauthorized();

        var designs = await _db.Designs
            .Where(d => d.AuthorId == guid)
            .OrderByDescending(d => d.CreatedAt)
            .Select(d => new MyDesignDto
            {
                Id              = d.Id,
                Title           = d.Title,
                ThumbnailUrl    = d.ThumbnailUrl ?? string.Empty,
                BackThumbnailUrl = d.BackThumbnailUrl,
                Status          = d.Status.ToString(),
                RejectionReason = d.RejectionReason,
                CreatedAt       = d.CreatedAt,
                MarketItemId    = d.MarketItems.Select(m => (Guid?)m.Id).FirstOrDefault(),
                FinalPrice      = d.MarketItems.Select(m => (decimal?)m.FinalPrice).FirstOrDefault(),
                PopularityScore = d.MarketItems.Sum(m => m.PopularityScore),
                Tags            = d.Tags
            })
            .ToListAsync();

        return Ok(designs);
    }

    // ── POST /api/author/publish ──────────────────────────────────────────────
    [HttpPost("publish")]
    public async Task<IActionResult> PublishDesign([FromBody] PublishDesignDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userId, out var guid)) return Unauthorized();

        var user = await _db.Users.FindAsync(guid);
        if (user == null || user.Role != UserRole.Author)
            return Forbid();

        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest(new { error = "Название не может быть пустым." });

        if (dto.FinalPrice <= 0)
            return BadRequest(new { error = "Цена должна быть больше 0." });

        // Parse ProductType enum
        if (!Enum.TryParse<ProductType>(dto.ProductType, ignoreCase: true, out var productType))
            return BadRequest(new { error = "Неверный тип продукта." });

        // Parse layers JSON safely
        List<DesignLayer> layers;
        try
        {
            layers = JsonSerializer.Deserialize<List<DesignLayer>>(dto.LayersDataJson,
                         new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                     ?? [];
        }
        catch
        {
            layers = [];
        }

        // Find or create matching BaseProduct
        var baseProduct = await _db.BaseProducts.FirstOrDefaultAsync(p =>
            p.Type == productType &&
            p.Color.ToLower() == dto.Color.ToLower() &&
            p.IsActive);

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

        // Create Design
        var design = new Design
        {
            AuthorId     = guid,
            Title        = dto.Title,
            LayersData   = layers,
            ThumbnailUrl = string.IsNullOrWhiteSpace(dto.ThumbnailUrl) ? null : dto.ThumbnailUrl,
            BackThumbnailUrl = string.IsNullOrWhiteSpace(dto.BackThumbnailUrl) ? null : dto.BackThumbnailUrl,
            Tags         = JsonSerializer.Serialize(dto.Tags ?? new List<string>()),
            Status       = DesignStatus.Moderation,
            CreatedAt    = DateTime.UtcNow,
            UpdatedAt    = DateTime.UtcNow
        };
        _db.Designs.Add(design);
        await _db.SaveChangesAsync();

        // Create MarketItem
        var marketItem = new MarketItem
        {
            DesignId       = design.Id,
            BaseProductId  = baseProduct.Id,
            FinalPrice     = dto.FinalPrice,
            PopularityScore = 0
        };
        _db.MarketItems.Add(marketItem);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            message      = "Дизайн опубликован в маркет!",
            designId     = design.Id,
            marketItemId = marketItem.Id
        });
    }

    // ── PUT /api/author/designs/{id} ─────────────────────────────────────────
    [HttpPut("designs/{id}")]
    public async Task<IActionResult> UpdateDesign(Guid id, [FromBody] UpdateDesignDto dto)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userId, out var guid)) return Unauthorized();

        var design = await _db.Designs
            .Include(d => d.MarketItems)
            .FirstOrDefaultAsync(d => d.Id == id && d.AuthorId == guid);

        if (design == null) return NotFound(new { error = "Дизайн не найден." });

        if (!string.IsNullOrWhiteSpace(dto.Title))
        {
            design.Title = dto.Title;
        }

        if (dto.FinalPrice.HasValue)
        {
            if (dto.FinalPrice.Value <= 0)
                return BadRequest(new { error = "Цена должна быть больше 0." });

            var marketItem = design.MarketItems.FirstOrDefault();
            if (marketItem != null)
                marketItem.FinalPrice = dto.FinalPrice.Value;
        }

        if (dto.Tags != null)
        {
            design.Tags = JsonSerializer.Serialize(dto.Tags);
        }

        design.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Дизайн обновлён." });
    }

    // ── DELETE /api/author/designs/{id} ──────────────────────────────────────
    [HttpDelete("designs/{id}")]
    public async Task<IActionResult> DeleteDesign(Guid id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userId, out var guid)) return Unauthorized();

        var design = await _db.Designs
            .Include(d => d.MarketItems)
            .FirstOrDefaultAsync(d => d.Id == id && d.AuthorId == guid);

        if (design == null) return NotFound(new { error = "Дизайн не найден." });

        // Remove linked market items first
        _db.MarketItems.RemoveRange(design.MarketItems);
        _db.Designs.Remove(design);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Дизайн удалён." });
    }
}
