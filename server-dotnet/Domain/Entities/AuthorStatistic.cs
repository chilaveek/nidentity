namespace server_dotnet.Domain.Entities;

/// <summary>One-to-one with AppUser. The primary key IS the user's Id.</summary>
public class AuthorStatistic
{
    /// <summary>Shared PK / FK with AppUser.</summary>
    public Guid Id { get; set; }

    public decimal TotalRevenue { get; set; } = 0m;

    public int TotalItemsSold { get; set; } = 0;

    public int ActiveDesignsCount { get; set; } = 0;

    public decimal Balance { get; set; } = 0m;

    // Navigation
    public AppUser User { get; set; } = null!;
}
