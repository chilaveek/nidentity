using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using server_dotnet.Application.Services;
using server_dotnet.Domain.Entities;
using server_dotnet.Domain.Enums;
using server_dotnet.Infrastructure.Data;

namespace server_dotnet.Tests.Application.Services;

public class MarketServiceTests : IDisposable
{
    private readonly InMemoryDatabaseRoot _databaseRoot = new();
    private readonly DbContextOptions<ApplicationDbContext> _dbContextOptions;
    private readonly ApplicationDbContext _dbContext;
    private readonly MarketService _service;

    public MarketServiceTests()
    {
        _dbContextOptions = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString(), _databaseRoot)
            .Options;

        _dbContext = new ApplicationDbContext(_dbContextOptions);
        _dbContext.Database.EnsureCreated();
        _service = new MarketService(_dbContext);
    }

    public void Dispose()
    {
        _dbContext.Database.EnsureDeleted();
        _dbContext.Dispose();
    }

    [Fact]
    public async Task GetProductsAsync_PublishedItemsExist_ReturnsMappedProductsOrderedByPopularity()
    {
        // Организация (Arrange)
        var authorWithNickname = CreateUser("author1@test.local", "artfox");
        var authorWithoutNickname = CreateUser("author2@test.local");

        CreateMarketItem(
            authorWithNickname,
            title: "Low Popularity",
            status: DesignStatus.Published,
            finalPrice: 120m,
            popularityScore: 3,
            tags: "[\"retro\"]",
            thumbnailUrl: "low-front.png",
            backThumbnailUrl: "low-back.png");

        CreateMarketItem(
            authorWithoutNickname,
            title: "High Popularity",
            status: DesignStatus.Published,
            finalPrice: 250m,
            popularityScore: 10,
            tags: "[\"anime\",\"streetwear\"]",
            thumbnailUrl: "high-front.png",
            backThumbnailUrl: "high-back.png");

        CreateMarketItem(
            authorWithNickname,
            title: "Draft Item",
            status: DesignStatus.Draft,
            finalPrice: 999m,
            popularityScore: 99,
            tags: "[\"hidden\"]",
            thumbnailUrl: "draft.png",
            backThumbnailUrl: null);

        await _dbContext.SaveChangesAsync();

        // Действие (Act)
        var result = (await _service.GetProductsAsync()).ToList();

        // Утверждение (Assert)
        Assert.Equal(2, result.Count);

        var first = result[0];
        Assert.Equal("High Popularity", first.Title);
        Assert.Equal(250m, first.Price);
        Assert.Equal(10, first.PopularityScore);
        Assert.Equal("author2@test.local", first.AuthorNickname);
        Assert.Equal("high-front.png", first.ImageUrl);
        Assert.Equal("high-back.png", first.BackImageUrl);
        Assert.Equal("[\"anime\",\"streetwear\"]", first.Tags);

        var second = result[1];
        Assert.Equal("Low Popularity", second.Title);
        Assert.Equal(120m, second.Price);
        Assert.Equal(3, second.PopularityScore);
        Assert.Equal("artfox", second.AuthorNickname);
        Assert.Equal("low-front.png", second.ImageUrl);
        Assert.Equal("low-back.png", second.BackImageUrl);
        Assert.Equal("[\"retro\"]", second.Tags);
    }

    [Fact]
    public async Task GetProductsAsync_NoPublishedItems_ReturnsEmptyCollection()
    {
        // Организация (Arrange)
        var author = CreateUser("author@test.local", "draft-only");
        CreateMarketItem(
            author,
            title: "Only Draft",
            status: DesignStatus.Draft,
            finalPrice: 150m,
            popularityScore: 5);
        await _dbContext.SaveChangesAsync();

        // Действие (Act)
        var result = await _service.GetProductsAsync();

        // Утверждение (Assert)
        Assert.Empty(result);
    }

    private AppUser CreateUser(string email, string? authorNickname = null)
    {
        var user = new AppUser
        {
            Id = Guid.NewGuid(),
            Email = email,
            PasswordHash = "hashed-password",
            Role = UserRole.Author,
            AuthorNickname = authorNickname
        };

        _dbContext.Users.Add(user);
        return user;
    }

    private void CreateMarketItem(
        AppUser author,
        string title,
        DesignStatus status,
        decimal finalPrice,
        int popularityScore,
        string tags = "[]",
        string? thumbnailUrl = "preview.png",
        string? backThumbnailUrl = null)
    {
        var baseProduct = new BaseProduct
        {
            Id = Guid.NewGuid(),
            Type = ProductType.TShirt,
            Color = "Black",
            BasePrice = 80m,
            IsActive = true
        };

        var design = new Design
        {
            Id = Guid.NewGuid(),
            AuthorId = author.Id,
            Author = author,
            Title = title,
            Status = status,
            ThumbnailUrl = thumbnailUrl,
            BackThumbnailUrl = backThumbnailUrl,
            Tags = tags,
            LayersData = [],
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
    }
}
