using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using server_dotnet.Application.DTOs;
using server_dotnet.Application.Interfaces;
using server_dotnet.Domain.Entities;
using server_dotnet.Domain.Enums;
using server_dotnet.Infrastructure.Security;
using server_dotnet.Infrastructure.Data;

namespace server_dotnet.Application.Services;

public class AuthService : IAuthService
{
    private readonly ApplicationDbContext _db;
    private readonly IConfiguration _config;

    public AuthService(ApplicationDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    public async Task<(bool Success, string Token, string Error, object? User)> RegisterAsync(RegisterModel model)
    {
        if (await _db.Users.AnyAsync(u => u.Email == model.Email))
            return (false, string.Empty, "Пользователь с таким email уже существует", null);

        var user = new AppUser
        {
            Email        = model.Email,
            PasswordHash = PasswordHasher.Hash(model.Password),
            Role         = UserRole.User
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        var token = GenerateJwt(user);
        return (true, token, string.Empty, MapToDto(user));
    }

    public async Task<(bool Success, string Token, string Error, object? User)> LoginAsync(LoginModel model)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == model.Email);
        if (user == null || !PasswordHasher.Verify(model.Password, user.PasswordHash))
            return (false, string.Empty, "Неверный email или пароль", null);

        var token = GenerateJwt(user);
        return (true, token, string.Empty, MapToDto(user));
    }

    public async Task<object?> GetMeAsync(string userId)
    {
        if (!Guid.TryParse(userId, out var guid)) return null;
        var user = await _db.Users.FindAsync(guid);
        return user == null ? null : MapToDto(user);
    }

    public async Task<string?> RefreshTokenAsync(string userId)
    {
        if (!Guid.TryParse(userId, out var guid)) return null;
        var user = await _db.Users.FindAsync(guid);
        return user == null ? null : GenerateJwt(user);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private string GenerateJwt(AppUser user)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email,          user.Email),
            new(ClaimTypes.Role,           user.Role.ToString()),
        };

        var key    = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        var creds  = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var jwt = new JwtSecurityToken(
            issuer:            _config["Jwt:Issuer"],
            audience:          _config["Jwt:Audience"],
            claims:            claims,
            expires:           DateTime.UtcNow.AddDays(7),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(jwt);
    }

    private static object MapToDto(AppUser u) =>
        new {
            id = u.Id,
            name = u.Email,
            email = u.Email,
            role = u.Role.ToString(),
            authorNickname = u.AuthorNickname,
            firstName = u.FirstName,
            lastName = u.LastName,
            phone = u.Phone,
            address = u.Address
        };
}
