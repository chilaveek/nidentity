using server_dotnet.Domain.Enums;

namespace server_dotnet.Domain.Entities;

public class Order
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }

    public OrderStatus Status { get; set; } = OrderStatus.New;

    public decimal TotalAmount { get; set; }

    public string? Address { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public AppUser User { get; set; } = null!;
    public ICollection<OrderItem> OrderItems { get; set; } = [];
}
