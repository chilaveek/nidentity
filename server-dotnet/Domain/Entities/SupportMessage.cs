namespace server_dotnet.Domain.Entities;

public class SupportMessage
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TicketId { get; set; }
    public Guid SenderId { get; set; }
    public bool IsAdmin { get; set; }
    public string Text { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public SupportTicket? Ticket { get; set; }
    public AppUser? Sender { get; set; }
}
