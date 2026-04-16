using Microsoft.EntityFrameworkCore;
using server_dotnet.Application.DTOs;
using server_dotnet.Application.Interfaces;
using server_dotnet.Domain.Enums;
using server_dotnet.Infrastructure.Data;

namespace server_dotnet.Application.Services;

public class AuthorService : IAuthorService
{
    private readonly ApplicationDbContext _db;

    public AuthorService(ApplicationDbContext db) => _db = db;

    public async Task<AuthorProfileDto> GetProfileAsync(string userId)
    {
        if (!Guid.TryParse(userId, out var guid)) return new AuthorProfileDto { IsAuthor = false };

        var user = await _db.Users.FindAsync(guid);
        if (user == null || user.Role != UserRole.Author)
            return new AuthorProfileDto { IsAuthor = false };

        return new AuthorProfileDto
        {
            IsAuthor = true,
            Nickname = user.AuthorNickname,
            Balance  = 0  // AuthorStatistic.TotalRevenue could be used here
        };
    }

    public async Task<(bool Success, string Error, string Nickname)> BecomeAuthorAsync(string userId, string nickname)
    {
        if (!Guid.TryParse(userId, out var guid))
            return (false, "Невалидный идентификатор пользователя.", string.Empty);

        if (string.IsNullOrWhiteSpace(nickname))
            return (false, "Никнейм не может быть пустым.", string.Empty);

        var user = await _db.Users.FindAsync(guid);
        if (user == null)
            return (false, "Пользователь не найден.", string.Empty);

        // Already an author — just return existing nickname
        if (user.Role == UserRole.Author)
            return (true, string.Empty, user.AuthorNickname ?? nickname);

        // Check nickname uniqueness (case-insensitive)
        bool taken = await _db.Users.AnyAsync(u =>
            u.AuthorNickname != null &&
            u.AuthorNickname.ToLower() == nickname.ToLower());

        if (taken)
            return (false, "Этот никнейм уже занят.", string.Empty);

        user.Role           = UserRole.Author;
        user.AuthorNickname = nickname;
        user.UpdatedAt      = DateTime.UtcNow;

        // Create a blank AuthorStatistic row (1-to-1)
        if (!await _db.AuthorStatistics.AnyAsync(s => s.Id == guid))
        {
            _db.AuthorStatistics.Add(new Domain.Entities.AuthorStatistic { Id = guid });
        }

        await _db.SaveChangesAsync();
        return (true, string.Empty, nickname);
    }
}
