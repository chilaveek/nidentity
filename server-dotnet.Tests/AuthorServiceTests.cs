using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using server_dotnet.Application.Services;
using server_dotnet.Domain.Entities;
using server_dotnet.Domain.Enums;
using server_dotnet.Infrastructure.Data;

namespace server_dotnet.Tests.Application.Services;

public class AuthorServiceTests : IDisposable
{
    private readonly InMemoryDatabaseRoot _databaseRoot = new();
    private readonly DbContextOptions<ApplicationDbContext> _dbContextOptions;
    private readonly ApplicationDbContext _dbContext;
    private readonly AuthorService _service;

    public AuthorServiceTests()
    {
        _dbContextOptions = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString(), _databaseRoot)
            .Options;

        _dbContext = new ApplicationDbContext(_dbContextOptions);
        _dbContext.Database.EnsureCreated();
        _service = new AuthorService(_dbContext);
    }

    public void Dispose()
    {
        _dbContext.Database.EnsureDeleted();
        _dbContext.Dispose();
    }

    [Fact]
    public async Task GetProfileAsync_UserIsAuthor_ReturnsAuthorProfile()
    {
        // Организация (Arrange)
        var user = CreateUser(role: UserRole.Author, authorNickname: "pixel-master");
        await _dbContext.SaveChangesAsync();

        // Действие (Act)
        var result = await _service.GetProfileAsync(user.Id.ToString());

        // Утверждение (Assert)
        Assert.True(result.IsAuthor);
        Assert.Equal("pixel-master", result.Nickname);
        Assert.Equal(0m, result.Balance);
    }

    [Fact]
    public async Task GetProfileAsync_UserIsNotAuthor_ReturnsNonAuthorProfile()
    {
        // Организация (Arrange)
        var user = CreateUser(role: UserRole.User);
        await _dbContext.SaveChangesAsync();

        // Действие (Act)
        var result = await _service.GetProfileAsync(user.Id.ToString());

        // Утверждение (Assert)
        Assert.False(result.IsAuthor);
        Assert.Equal(string.Empty, result.Nickname);
        Assert.Equal(0m, result.Balance);
    }

    [Fact]
    public async Task GetProfileAsync_InvalidUserId_ReturnsNonAuthorProfile()
    {
        // Организация (Arrange)

        // Действие (Act)
        var result = await _service.GetProfileAsync("invalid-guid");

        // Утверждение (Assert)
        Assert.False(result.IsAuthor);
        Assert.Equal(string.Empty, result.Nickname);
        Assert.Equal(0m, result.Balance);
    }

    [Fact]
    public async Task BecomeAuthorAsync_ValidData_UpdatesUserAndCreatesStatistics()
    {
        // Организация (Arrange)
        var user = CreateUser(role: UserRole.User);
        await _dbContext.SaveChangesAsync();

        // Действие (Act)
        var result = await _service.BecomeAuthorAsync(user.Id.ToString(), "neonfox");

        // Утверждение (Assert)
        Assert.True(result.Success);
        Assert.Equal(string.Empty, result.Error);
        Assert.Equal("neonfox", result.Nickname);

        using var assertContext = CreateDbContext();
        var actualUser = await assertContext.Users.SingleAsync(u => u.Id == user.Id);
        var statistic = await assertContext.AuthorStatistics.SingleAsync(s => s.Id == user.Id);

        Assert.Equal(UserRole.Author, actualUser.Role);
        Assert.Equal("neonfox", actualUser.AuthorNickname);
        Assert.Equal(user.Id, statistic.Id);
        Assert.Equal(0m, statistic.TotalRevenue);
        Assert.Equal(0m, statistic.Balance);
        Assert.Equal(0, statistic.TotalItemsSold);
    }

    [Fact]
    public async Task BecomeAuthorAsync_InvalidUserId_ReturnsFalseAndError()
    {
        // Организация (Arrange)

        // Действие (Act)
        var result = await _service.BecomeAuthorAsync("bad-guid", "nickname");

        // Утверждение (Assert)
        Assert.False(result.Success);
        Assert.Equal("Невалидный идентификатор пользователя.", result.Error);
        Assert.Equal(string.Empty, result.Nickname);
    }

    [Fact]
    public async Task BecomeAuthorAsync_EmptyNickname_ReturnsFalseAndError()
    {
        // Организация (Arrange)
        var user = CreateUser(role: UserRole.User);
        await _dbContext.SaveChangesAsync();

        // Действие (Act)
        var result = await _service.BecomeAuthorAsync(user.Id.ToString(), "   ");

        // Утверждение (Assert)
        Assert.False(result.Success);
        Assert.Equal("Никнейм не может быть пустым.", result.Error);
        Assert.Equal(string.Empty, result.Nickname);
        Assert.Empty(_dbContext.AuthorStatistics);
    }

    [Fact]
    public async Task BecomeAuthorAsync_UserNotFound_ReturnsFalseAndError()
    {
        // Организация (Arrange)

        // Действие (Act)
        var result = await _service.BecomeAuthorAsync(Guid.NewGuid().ToString(), "nickname");

        // Утверждение (Assert)
        Assert.False(result.Success);
        Assert.Equal("Пользователь не найден.", result.Error);
        Assert.Equal(string.Empty, result.Nickname);
    }

    [Fact]
    public async Task BecomeAuthorAsync_UserAlreadyAuthor_ReturnsExistingNickname()
    {
        // Организация (Arrange)
        var user = CreateUser(role: UserRole.Author, authorNickname: "current-name");
        _dbContext.AuthorStatistics.Add(new AuthorStatistic { Id = user.Id });
        await _dbContext.SaveChangesAsync();

        // Действие (Act)
        var result = await _service.BecomeAuthorAsync(user.Id.ToString(), "new-name");

        // Утверждение (Assert)
        Assert.True(result.Success);
        Assert.Equal(string.Empty, result.Error);
        Assert.Equal("current-name", result.Nickname);

        using var assertContext = CreateDbContext();
        Assert.Single(assertContext.AuthorStatistics);
        var actualUser = await assertContext.Users.SingleAsync(u => u.Id == user.Id);
        Assert.Equal("current-name", actualUser.AuthorNickname);
    }

    [Fact]
    public async Task BecomeAuthorAsync_NicknameAlreadyTakenCaseInsensitive_ReturnsFalseAndError()
    {
        // Организация (Arrange)
        CreateUser(role: UserRole.Author, authorNickname: "TakenName", email: "taken@test.local");
        var candidate = CreateUser(role: UserRole.User, email: "candidate@test.local");
        await _dbContext.SaveChangesAsync();

        // Действие (Act)
        var result = await _service.BecomeAuthorAsync(candidate.Id.ToString(), "takenname");

        // Утверждение (Assert)
        Assert.False(result.Success);
        Assert.Equal("Этот никнейм уже занят.", result.Error);
        Assert.Equal(string.Empty, result.Nickname);

        using var assertContext = CreateDbContext();
        var actualUser = await assertContext.Users.SingleAsync(u => u.Id == candidate.Id);
        Assert.Equal(UserRole.User, actualUser.Role);
        Assert.Null(actualUser.AuthorNickname);
        Assert.Empty(assertContext.AuthorStatistics);
    }

    private ApplicationDbContext CreateDbContext()
    {
        return new ApplicationDbContext(_dbContextOptions);
    }

    private AppUser CreateUser(
        UserRole role,
        string? authorNickname = null,
        string? email = null)
    {
        var user = new AppUser
        {
            Id = Guid.NewGuid(),
            Email = email ?? $"user-{Guid.NewGuid():N}@test.local",
            PasswordHash = "hashed-password",
            Role = role,
            AuthorNickname = authorNickname,
            UpdatedAt = DateTime.UtcNow.AddDays(-1)
        };

        _dbContext.Users.Add(user);
        return user;
    }
}
