using server_dotnet.Domain.Enums;

namespace server_dotnet.Domain.Entities;

public class Design
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid AuthorId { get; set; }

    public string Title { get; set; } = string.Empty;

    /// <summary>Serialized as JSONB in PostgreSQL.</summary>
    public List<DesignLayer> LayersData { get; set; } = [];

    public string? ThumbnailUrl { get; set; }

    /// <summary>Base64 preview of the back side (null when no back print).</summary>
    public string? BackThumbnailUrl { get; set; }

    /// <summary>Hashtags stored as JSON string, e.g. '["anime","retro"]'.</summary>
    public string Tags { get; set; } = "[]";

    public DesignStatus Status { get; set; } = DesignStatus.Draft;
    public string? RejectionReason { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public AppUser Author { get; set; } = null!;
    public ICollection<MarketItem> MarketItems { get; set; } = [];
}
