using server_dotnet.Domain.Enums;

namespace server_dotnet.Domain.Entities;

public class BaseProduct
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public ProductType Type { get; set; }

    public string Color { get; set; } = string.Empty;

    public decimal BasePrice { get; set; }

    public bool IsActive { get; set; } = true;

    // Navigation
    public ICollection<MarketItem> MarketItems { get; set; } = [];
}
