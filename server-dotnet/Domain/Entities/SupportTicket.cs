namespace server_dotnet.Domain.Entities;

public class SupportTicket
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Status { get; set; } = "Open"; // Open, Closed
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public AppUser? User { get; set; }
    public List<SupportMessage> Messages { get; set; } = new();
}
