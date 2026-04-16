namespace server_dotnet.Application.DTOs;

/// <summary>Sent by author to publish a design to the market.</summary>
public class PublishDesignDto
{
    public string Title { get; set; } = string.Empty;

    /// <summary>JSON-serialized list of DesignLayer objects from the editor.</summary>
    public string LayersDataJson { get; set; } = "[]";

    /// <summary>Base64 thumbnail or empty string.</summary>
    public string ThumbnailUrl { get; set; } = string.Empty;

    /// <summary>Base64 thumbnail of the back side (optional).</summary>
    public string? BackThumbnailUrl { get; set; }

    /// <summary>"TShirt" or "Hoodie"</summary>
    public string ProductType { get; set; } = "TShirt";

    public string Color { get; set; } = "Black";

    public decimal FinalPrice { get; set; }

    public List<string> Tags { get; set; } = [];
}

public class MyDesignDto
{
    public Guid   Id             { get; set; }
    public string Title          { get; set; } = string.Empty;
    public string ThumbnailUrl   { get; set; } = string.Empty;
    public string? BackThumbnailUrl { get; set; }
    public string Status         { get; set; } = string.Empty;
    public string? RejectionReason { get; set; }
    public Guid?  MarketItemId   { get; set; }
    public decimal? FinalPrice   { get; set; }
    public int    PopularityScore { get; set; }
    public DateTime CreatedAt    { get; set; }
    public string Tags           { get; set; } = "[]";
}

public class UpdateDesignDto
{
    public string? Title { get; set; }
    public decimal? FinalPrice { get; set; }
    public List<string>? Tags { get; set; }
}
