namespace server_dotnet.Domain.Entities;

public class OrderItem
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid OrderId { get; set; }

    public Guid MarketItemId { get; set; }

    public string Size { get; set; } = string.Empty;

    public int Quantity { get; set; }

    public decimal PriceAtPurchase { get; set; }

    // Navigation
    public Order Order { get; set; } = null!;
    public MarketItem MarketItem { get; set; } = null!;
}
