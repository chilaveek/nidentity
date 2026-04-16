using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server_dotnet.Domain.Entities;
using server_dotnet.Domain.Enums;
using server_dotnet.Infrastructure.Data;

namespace server_dotnet.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Policy = "AdminOnly")]
    public class AdminController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        public AdminController(ApplicationDbContext db) => _db = db;

        // ── SUPPORT ──────────────────────────────────────────────────────────

        /// <summary>Get all support tickets (newest first)</summary>
        [HttpGet("support/tickets")]
        public async Task<IActionResult> GetTickets()
        {
            var tickets = await _db.SupportTickets
                .Include(t => t.User)
                .Include(t => t.Messages)
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new
                {
                    t.Id,
                    User = t.User!.Email,
                    UserName = t.User.FirstName ?? t.User.Email,
                    t.Subject,
                    t.Status,
                    t.CreatedAt,
                    LastMessage = t.Messages.OrderByDescending(m => m.CreatedAt).Select(m => m.Text).FirstOrDefault(),
                    MessageCount = t.Messages.Count
                })
                .ToListAsync();

            return Ok(tickets);
        }

        /// <summary>Get messages for a specific ticket</summary>
        [HttpGet("support/tickets/{ticketId}/messages")]
        public async Task<IActionResult> GetTicketMessages(Guid ticketId)
        {
            var messages = await _db.SupportMessages
                .Where(m => m.TicketId == ticketId)
                .OrderBy(m => m.CreatedAt)
                .Select(m => new
                {
                    m.Id,
                    m.Text,
                    m.IsAdmin,
                    m.CreatedAt,
                    SenderName = m.IsAdmin ? "Администратор" : (m.Sender!.FirstName ?? m.Sender.Email)
                })
                .ToListAsync();

            return Ok(messages);
        }

        /// <summary>Admin replies to a ticket</summary>
        [HttpPost("support/tickets/{ticketId}/reply")]
        public async Task<IActionResult> ReplyToTicket(Guid ticketId, [FromBody] ReplyDto dto)
        {
            var ticket = await _db.SupportTickets.FindAsync(ticketId);
            if (ticket == null) return NotFound();

            var adminId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var message = new SupportMessage
            {
                TicketId = ticketId,
                SenderId = adminId,
                IsAdmin = true,
                Text = dto.Text
            };
            _db.SupportMessages.Add(message);
            await _db.SaveChangesAsync();

            return Ok(new { message.Id, message.Text, message.IsAdmin, message.CreatedAt, SenderName = "Администратор" });
        }

        /// <summary>Close a ticket</summary>
        [HttpPost("support/tickets/{ticketId}/close")]
        public async Task<IActionResult> CloseTicket(Guid ticketId)
        {
            var ticket = await _db.SupportTickets.FindAsync(ticketId);
            if (ticket == null) return NotFound();
            ticket.Status = "Closed";
            await _db.SaveChangesAsync();
            return Ok();
        }

        //MODERATION

        /// <summary>Get all designs awaiting moderation</summary>
        [HttpGet("moderation/designs")]
        public async Task<IActionResult> GetDesignsForModeration()
        {
            var designs = await _db.Designs
                .Include(d => d.Author)
                .Where(d => d.Status == DesignStatus.Moderation)
                .OrderBy(d => d.CreatedAt)
                .Select(d => new
                {
                    d.Id,
                    d.Title,
                    d.ThumbnailUrl,
                    d.BackThumbnailUrl,
                    d.Tags,
                    d.CreatedAt,
                    AuthorNickname = d.Author.AuthorNickname ?? d.Author.Email,
                    AuthorId = d.AuthorId
                })
                .ToListAsync();

            return Ok(designs);
        }

        /// <summary>Approve a design — sets Published status</summary>
        [HttpPost("moderation/designs/{designId}/approve")]
        public async Task<IActionResult> ApproveDesign(Guid designId)
        {
            var design = await _db.Designs.FindAsync(designId);
            if (design == null) return NotFound();
            if (design.Status != DesignStatus.Moderation && design.Status != DesignStatus.Rejected)
                return BadRequest("Design is not in moderation or rejected");

            design.Status = DesignStatus.Published;
            design.RejectionReason = null;
            design.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(new { message = "Design approved" });
        }

        /// <summary>Reject a design with reason</summary>
        [HttpPost("moderation/designs/{designId}/reject")]
        public async Task<IActionResult> RejectDesign(Guid designId, [FromBody] RejectDto dto)
        {
            var design = await _db.Designs.FindAsync(designId);
            if (design == null) return NotFound();
            if (design.Status != DesignStatus.Moderation && design.Status != DesignStatus.Rejected)
                return BadRequest("Design is not in moderation or rejected");

            design.Status = DesignStatus.Rejected;
            design.RejectionReason = dto.Reason;
            design.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(new { message = "Design rejected" });
        }

        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard()
        {
            var openTickets = await _db.SupportTickets.CountAsync(t => t.Status == "Open");
            var pendingDesigns = await _db.Designs.CountAsync(d => d.Status == DesignStatus.Moderation);
            var totalUsers = await _db.Users.CountAsync();
            var totalOrders = await _db.Orders.CountAsync(o => o.Status != OrderStatus.New);

            return Ok(new { openTickets, pendingDesigns, totalUsers, totalOrders });
        }
    }

    public record ReplyDto(string Text);
    public record RejectDto(string Reason);
}
