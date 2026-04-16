using Microsoft.EntityFrameworkCore;
using server_dotnet.Application.DTOs;
using server_dotnet.Application.Interfaces;
using server_dotnet.Domain.Enums;
using server_dotnet.Infrastructure.Data;

namespace server_dotnet.Application.Services;

public class MarketService : IMarketService
{
    private readonly ApplicationDbContext _db;
    public MarketService(ApplicationDbContext db) => _db = db;

    public async Task<IEnumerable<ProductDto>> GetProductsAsync()
    {
        return await _db.MarketItems
            .Include(m => m.Design)
                .ThenInclude(d => d.Author)
            .Include(m => m.BaseProduct)
            .Where(m => m.Design.Status == DesignStatus.Published)
            .OrderByDescending(m => m.PopularityScore)
            .Select(m => new ProductDto
            {
                Id              = m.Id,
                Title           = m.Design.Title,
                ImageUrl        = m.Design.ThumbnailUrl ?? string.Empty,
                BackImageUrl    = m.Design.BackThumbnailUrl,
                Price           = m.FinalPrice,
                PopularityScore = m.PopularityScore,
                AuthorNickname  = m.Design.Author.AuthorNickname ?? m.Design.Author.Email,
                Tags            = m.Design.Tags
            })
            .ToListAsync();
    }
}
