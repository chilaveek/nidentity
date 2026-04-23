using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Configuration;
using server_dotnet.Application.DTOs;
using server_dotnet.Application.Services;
using server_dotnet.Domain.Entities;
using server_dotnet.Domain.Enums;
using server_dotnet.Infrastructure.Data;
using server_dotnet.Infrastructure.Security;

namespace server_dotnet.Tests.Application.Services;

public class AuthServiceTests : IDisposable
{
    private readonly InMemoryDatabaseRoot _databaseRoot = new();
    private readonly DbContextOptions<ApplicationDbContext> _dbContextOptions;
    private readonly ApplicationDbContext _dbContext;
    private readonly AuthService _service;
    private readonly IConfiguration _configuration;

    public AuthServiceTests()
    {
        _dbContextOptions = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString(), _databaseRoot)
            .Options;

        _dbContext = new ApplicationDbContext(_dbContextOptions);
        _dbContext.Database.EnsureCreated();
        _configuration = CreateConfiguration();
        _service = new AuthService(_dbContext, _configuration);
    }

    public void Dispose()
    {
        _dbContext.Database.EnsureDeleted();
        _dbContext.Dispose();
    }

    [Fact]
    public async Task RegisterAsync_ValidModel_CreatesUserReturnsTokenAndMappedUser()
    {
        // Организация (Arrange)
        var model = new RegisterModel
        {
            Email = "register@test.local",
            Password = "secret123"
        };

        // Действие (Act)
        var result = await _service.RegisterAsync(model);

        // Утверждение (Assert)
        Assert.True(result.Success);
        Assert.Equal(string.Empty, result.Error);
        Assert.NotNull(result.User);
        Assert.False(string.IsNullOrWhiteSpace(result.Token));

        using var assertContext = CreateDbContext();
        var user = await assertContext.Users.SingleAsync(u => u.Email == "register@test.local");

        Assert.Equal(UserRole.User, user.Role);
        Assert.NotEqual("secret123", user.PasswordHash);
        Assert.True(PasswordHasher.Verify("secret123", user.PasswordHash));

        var userJson = JsonSerializer.SerializeToElement(result.User);
        Assert.Equal(user.Id.ToString(), userJson.GetProperty("id").GetString());
        Assert.Equal("register@test.local", userJson.GetProperty("email").GetString());
        Assert.Equal("User", userJson.GetProperty("role").GetString());

        var token = new JwtSecurityTokenHandler().ReadJwtToken(result.Token);
        Assert.Equal("nidshop-tests", token.Issuer);
        Assert.Equal("nidshop-tests-client", token.Audiences.Single());
        Assert.Equal(user.Id.ToString(), token.Claims.First(c => c.Type == ClaimTypes.NameIdentifier).Value);
        Assert.Equal("register@test.local", token.Claims.First(c => c.Type == ClaimTypes.Email).Value);
        Assert.Equal("User", token.Claims.First(c => c.Type == ClaimTypes.Role).Value);
    }

    [Fact]
    public async Task RegisterAsync_EmailAlreadyExists_ReturnsFalseAndDoesNotCreateDuplicate()
    {
        // Организация (Arrange)
        _dbContext.Users.Add(new AppUser
        {
            Id = Guid.NewGuid(),
            Email = "duplicate@test.local",
            PasswordHash = PasswordHasher.Hash("old-password"),
            Role = UserRole.User
        });
        await _dbContext.SaveChangesAsync();

        var model = new RegisterModel
        {
            Email = "duplicate@test.local",
            Password = "new-password"
        };

        // Действие (Act)
        var result = await _service.RegisterAsync(model);

        // Утверждение (Assert)
        Assert.False(result.Success);
        Assert.Equal(string.Empty, result.Token);
        Assert.Equal("Пользователь с таким email уже существует", result.Error);
        Assert.Null(result.User);
        Assert.Equal(1, await _dbContext.Users.CountAsync(u => u.Email == "duplicate@test.local"));
    }

    [Fact]
    public async Task LoginAsync_ValidCredentials_ReturnsTokenAndMappedUser()
    {
        // Организация (Arrange)
        var user = new AppUser
        {
            Id = Guid.NewGuid(),
            Email = "login@test.local",
            PasswordHash = PasswordHasher.Hash("right-password"),
            Role = UserRole.Author,
            AuthorNickname = "login-author",
            FirstName = "Иван",
            Address = "Москва"
        };
        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync();

        var model = new LoginModel
        {
            Email = "login@test.local",
            Password = "right-password"
        };

        // Действие (Act)
        var result = await _service.LoginAsync(model);

        // Утверждение (Assert)
        Assert.True(result.Success);
        Assert.Equal(string.Empty, result.Error);
        Assert.NotNull(result.User);
        Assert.False(string.IsNullOrWhiteSpace(result.Token));

        var userJson = JsonSerializer.SerializeToElement(result.User);
        Assert.Equal(user.Id.ToString(), userJson.GetProperty("id").GetString());
        Assert.Equal("login@test.local", userJson.GetProperty("email").GetString());
        Assert.Equal("Author", userJson.GetProperty("role").GetString());
        Assert.Equal("login-author", userJson.GetProperty("authorNickname").GetString());
        Assert.Equal("Иван", userJson.GetProperty("firstName").GetString());
        Assert.Equal("Москва", userJson.GetProperty("address").GetString());
    }

    [Fact]
    public async Task LoginAsync_InvalidPassword_ReturnsFalseAndError()
    {
        // Организация (Arrange)
        _dbContext.Users.Add(new AppUser
        {
            Id = Guid.NewGuid(),
            Email = "wrong-password@test.local",
            PasswordHash = PasswordHasher.Hash("right-password"),
            Role = UserRole.User
        });
        await _dbContext.SaveChangesAsync();

        var model = new LoginModel
        {
            Email = "wrong-password@test.local",
            Password = "incorrect-password"
        };

        // Действие (Act)
        var result = await _service.LoginAsync(model);

        // Утверждение (Assert)
        Assert.False(result.Success);
        Assert.Equal(string.Empty, result.Token);
        Assert.Equal("Неверный email или пароль", result.Error);
        Assert.Null(result.User);
    }

    [Fact]
    public async Task GetMeAsync_ValidUserId_ReturnsMappedUser()
    {
        // Организация (Arrange)
        var user = new AppUser
        {
            Id = Guid.NewGuid(),
            Email = "me@test.local",
            PasswordHash = PasswordHasher.Hash("password"),
            Role = UserRole.Author,
            AuthorNickname = "me-author",
            Phone = "+79990000000"
        };
        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync();

        // Действие (Act)
        var result = await _service.GetMeAsync(user.Id.ToString());

        // Утверждение (Assert)
        Assert.NotNull(result);

        var userJson = JsonSerializer.SerializeToElement(result);
        Assert.Equal(user.Id.ToString(), userJson.GetProperty("id").GetString());
        Assert.Equal("me@test.local", userJson.GetProperty("email").GetString());
        Assert.Equal("Author", userJson.GetProperty("role").GetString());
        Assert.Equal("me-author", userJson.GetProperty("authorNickname").GetString());
        Assert.Equal("+79990000000", userJson.GetProperty("phone").GetString());
    }

    [Fact]
    public async Task GetMeAsync_InvalidUserId_ReturnsNull()
    {
        // Организация (Arrange)

        // Действие (Act)
        var result = await _service.GetMeAsync("invalid-guid");

        // Утверждение (Assert)
        Assert.Null(result);
    }

    [Fact]
    public async Task GetMeAsync_UserNotFound_ReturnsNull()
    {
        // Организация (Arrange)

        // Действие (Act)
        var result = await _service.GetMeAsync(Guid.NewGuid().ToString());

        // Утверждение (Assert)
        Assert.Null(result);
    }

    [Fact]
    public async Task RefreshTokenAsync_ValidUserId_ReturnsNewToken()
    {
        // Организация (Arrange)
        var user = new AppUser
        {
            Id = Guid.NewGuid(),
            Email = "refresh@test.local",
            PasswordHash = PasswordHasher.Hash("password"),
            Role = UserRole.Author
        };
        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync();

        // Действие (Act)
        var tokenString = await _service.RefreshTokenAsync(user.Id.ToString());

        // Утверждение (Assert)
        Assert.False(string.IsNullOrWhiteSpace(tokenString));

        var token = new JwtSecurityTokenHandler().ReadJwtToken(tokenString);
        Assert.Equal(user.Id.ToString(), token.Claims.First(c => c.Type == ClaimTypes.NameIdentifier).Value);
        Assert.Equal("refresh@test.local", token.Claims.First(c => c.Type == ClaimTypes.Email).Value);
        Assert.Equal("Author", token.Claims.First(c => c.Type == ClaimTypes.Role).Value);
    }

    [Fact]
    public async Task RefreshTokenAsync_InvalidUserId_ReturnsNull()
    {
        // Организация (Arrange)

        // Действие (Act)
        var result = await _service.RefreshTokenAsync("invalid-guid");

        // Утверждение (Assert)
        Assert.Null(result);
    }

    [Fact]
    public async Task RefreshTokenAsync_UserNotFound_ReturnsNull()
    {
        // Организация (Arrange)

        // Действие (Act)
        var result = await _service.RefreshTokenAsync(Guid.NewGuid().ToString());

        // Утверждение (Assert)
        Assert.Null(result);
    }

    private ApplicationDbContext CreateDbContext()
    {
        return new ApplicationDbContext(_dbContextOptions);
    }

    private static IConfiguration CreateConfiguration()
    {
        return new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"] = "super-secret-test-key-with-sufficient-length-12345",
                ["Jwt:Issuer"] = "nidshop-tests",
                ["Jwt:Audience"] = "nidshop-tests-client"
            })
            .Build();
    }
}
