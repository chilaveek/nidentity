using server_dotnet.Domain.Enums;

namespace server_dotnet.Domain.Entities;

public class AppUser
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string Email { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public UserRole Role { get; set; } = UserRole.User;

    /// <summary>Nullable — only set when role is Author.</summary>
    public string? AuthorNickname { get; set; }

    // General Profile Info
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Phone { get; set; }
    public string? Address { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<Design> Designs { get; set; } = [];
    public ICollection<Order> Orders { get; set; } = [];
    public ICollection<SupportTicket> SupportTickets { get; set; } = [];
    public AuthorStatistic? AuthorStatistic { get; set; }
}
