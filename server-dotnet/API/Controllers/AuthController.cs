using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server_dotnet.Application.DTOs;
using server_dotnet.Application.Interfaces;
using server_dotnet.Domain.Enums;
using server_dotnet.Infrastructure.Data;

namespace server_dotnet.API.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ApplicationDbContext _db;

    public AuthController(IAuthService authService, ApplicationDbContext db)
    {
        _authService = authService;
        _db = db;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterModel model)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var result = await _authService.RegisterAsync(model);
        if (!result.Success) return BadRequest(new { error = result.Error });
        return Created("", new AuthResponse { Token = result.Token, User = result.User! });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginModel model)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        var result = await _authService.LoginAsync(model);
        if (!result.Success) return Unauthorized(new { error = result.Error });
        return Ok(new AuthResponse { Token = result.Token, User = result.User! });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetMe()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();
        var user = await _authService.GetMeAsync(userId);
        if (user == null) return NotFound(new { error = "Пользователь не найден" });
        return Ok(new { user });
    }

    [HttpPost("refresh")]
    [Authorize]
    public async Task<IActionResult> RefreshToken()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null) return Unauthorized();
        var token = await _authService.RefreshTokenAsync(userId);
        if (token == null) return Unauthorized();
        return Ok(new { token });
    }

    [HttpPost("become-admin")]
    [Authorize]
    public async Task<IActionResult> BecomeAdmin()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userId, out var guid)) return Unauthorized();

        var user = await _db.Users.FindAsync(guid);
        if (user == null) return NotFound();

        user.Role      = UserRole.Admin;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Вы стали администратором!" });
    }

    [HttpPost("resign-author")]
    [Authorize]
    public async Task<IActionResult> ResignAuthor()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userId, out var guid)) return Unauthorized();

        var user = await _db.Users.FindAsync(guid);
        if (user == null) return NotFound();
        if (user.Role != UserRole.Author)
            return BadRequest(new { error = "Вы не являетесь автором." });

        user.Role           = UserRole.User;
        user.AuthorNickname = null;
        user.UpdatedAt      = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Вы больше не автор." });
    }

    [HttpPost("resign-admin")]
    [Authorize]
    public async Task<IActionResult> ResignAdmin()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userId, out var guid)) return Unauthorized();

        var user = await _db.Users.FindAsync(guid);
        if (user == null) return NotFound();
        if (user.Role != UserRole.Admin)
            return BadRequest(new { error = "Вы не являетесь администратором." });

        user.Role      = UserRole.User;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Вы больше не администратор." });
    }

    [HttpPut("profile")]
    [Authorize]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileModel model)
    {
        var uidStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(uidStr, out var uid)) return Unauthorized();

        var user = await _db.Users.FindAsync(uid);
        if (user == null) return NotFound("Пользователь не найден.");

        user.FirstName = model.FirstName;
        user.LastName = model.LastName;
        user.Phone = model.Phone;
        user.Address = model.Address;
        user.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(new { message = "Профиль обновлен" });
    }

    [HttpGet("orders")]
    [Authorize]
    public async Task<IActionResult> GetMyOrders()
    {
        var uidStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(uidStr, out var uid)) return Unauthorized();

        var orders = await _db.Orders
            .Where(o => o.UserId == uid && o.Status != OrderStatus.New)
            .OrderByDescending(o => o.CreatedAt)
            .Include(o => o.OrderItems)
                .ThenInclude(i => i.MarketItem)
                    .ThenInclude(m => m!.Design)
            .ToListAsync();

        var result = orders.Select(o => new OrderDto
        {
            Id = o.Id,
            Status = o.Status.ToString(),
            TotalAmount = o.TotalAmount,
            Address = o.Address,
            CreatedAt = o.CreatedAt,
            Items = o.OrderItems.Select(i => new OrderItemDto
            {
                Id = i.Id,
                Title = i.MarketItem?.Design?.Title ?? "—",
                ImageUrl = i.MarketItem?.Design?.ThumbnailUrl ?? string.Empty,
                Size = i.Size,
                Quantity = i.Quantity,
                Price = i.PriceAtPurchase
            }).ToList()
        });

        return Ok(result);
    }

    // ── SUPPORT TICKETS (User side) ──────────────────────────────────────

    /// <summary>Create a new support ticket</summary>
    [Authorize]
    [HttpPost("support/tickets")]
    public async Task<IActionResult> CreateTicket([FromBody] CreateTicketDto dto)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var ticket = new server_dotnet.Domain.Entities.SupportTicket
        {
            UserId = userId,
            Subject = dto.Subject
        };
        _db.SupportTickets.Add(ticket);

        var msg = new server_dotnet.Domain.Entities.SupportMessage
        {
            TicketId = ticket.Id,
            SenderId = userId,
            IsAdmin = false,
            Text = dto.Message
        };
        _db.SupportMessages.Add(msg);
        await _db.SaveChangesAsync();

        return Ok(new { ticket.Id, ticket.Subject, ticket.Status, ticket.CreatedAt });
    }

    /// <summary>List my tickets</summary>
    [Authorize]
    [HttpGet("support/tickets")]
    public async Task<IActionResult> GetMyTickets()
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var tickets = await _db.SupportTickets
            .Where(t => t.UserId == userId)
            .Include(t => t.Messages)
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new
            {
                t.Id,
                t.Subject,
                t.Status,
                t.CreatedAt,
                LastMessage = t.Messages.OrderByDescending(m => m.CreatedAt).Select(m => m.Text).FirstOrDefault(),
                MessageCount = t.Messages.Count
            })
            .ToListAsync();

        return Ok(tickets);
    }

    /// <summary>Get messages in a ticket (only own)</summary>
    [Authorize]
    [HttpGet("support/tickets/{ticketId}/messages")]
    public async Task<IActionResult> GetTicketMessages(Guid ticketId)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var ticket = await _db.SupportTickets.FirstOrDefaultAsync(t => t.Id == ticketId && t.UserId == userId);
        if (ticket == null) return NotFound();

        var messages = await _db.SupportMessages
            .Where(m => m.TicketId == ticketId)
            .OrderBy(m => m.CreatedAt)
            .Select(m => new
            {
                m.Id,
                m.Text,
                m.IsAdmin,
                m.CreatedAt,
                SenderName = m.IsAdmin ? "Администратор" : "Вы"
            })
            .ToListAsync();

        return Ok(messages);
    }

    /// <summary>User sends a message to an existing ticket</summary>
    [Authorize]
    [HttpPost("support/tickets/{ticketId}/message")]
    public async Task<IActionResult> SendMessage(Guid ticketId, [FromBody] SendMessageDto dto)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var ticket = await _db.SupportTickets.FirstOrDefaultAsync(t => t.Id == ticketId && t.UserId == userId);
        if (ticket == null) return NotFound();

        // Re-open if closed
        if (ticket.Status == "Closed") ticket.Status = "Open";

        var msg = new server_dotnet.Domain.Entities.SupportMessage
        {
            TicketId = ticketId,
            SenderId = userId,
            IsAdmin = false,
            Text = dto.Text
        };
        _db.SupportMessages.Add(msg);
        await _db.SaveChangesAsync();

        return Ok(new { msg.Id, msg.Text, msg.IsAdmin, msg.CreatedAt, SenderName = "Вы" });
    }
}

public record CreateTicketDto(string Subject, string Message);
public record SendMessageDto(string Text);
