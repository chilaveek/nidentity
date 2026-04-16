namespace server_dotnet.Domain.Entities;

/// <summary>Represents a single layer in the merch canvas editor. Stored as JSONB.</summary>
public class DesignLayer
{
    public string Id { get; set; } = string.Empty;

    /// <summary>"image" or "text"</summary>
    public string Type { get; set; } = string.Empty;

    /// <summary>Base64 data URL for images, plain text for text layers.</summary>
    public string Content { get; set; } = string.Empty;

    public double Scale { get; set; } = 1.0;

    /// <summary>CSS color string, e.g. "#ffffff". Relevant for text layers.</summary>
    public string? Color { get; set; }

    /// <summary>Font family name. Relevant for text layers.</summary>
    public string? FontFamily { get; set; }

    /// <summary>"front" or "back" — which side of the garment this layer belongs to.</summary>
    public string Side { get; set; } = "front";
}
