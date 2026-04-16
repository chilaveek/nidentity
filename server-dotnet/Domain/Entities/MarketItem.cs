namespace server_dotnet.Domain.Entities;

public class MarketItem
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid DesignId { get; set; }

    public Guid BaseProductId { get; set; }

    public decimal FinalPrice { get; set; }

    public int PopularityScore { get; set; } = 0;

    // Navigation
    public Design Design { get; set; } = null!;
    public BaseProduct BaseProduct { get; set; } = null!;
    public ICollection<OrderItem> OrderItems { get; set; } = [];
}
