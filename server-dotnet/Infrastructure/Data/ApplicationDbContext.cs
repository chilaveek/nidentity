using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using server_dotnet.Domain.Entities;
using server_dotnet.Domain.Enums;

namespace server_dotnet.Infrastructure.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options) { }

    // ── DbSets ──────────────────────────────────────────────────────────────
    public DbSet<AppUser>         Users            { get; set; }
    public DbSet<BaseProduct>     BaseProducts     { get; set; }
    public DbSet<Design>          Designs          { get; set; }
    public DbSet<MarketItem>      MarketItems      { get; set; }
    public DbSet<Order>           Orders           { get; set; }
    public DbSet<OrderItem>       OrderItems       { get; set; }
    public DbSet<AuthorStatistic> AuthorStatistics { get; set; }
    public DbSet<SupportTicket>   SupportTickets   { get; set; }
    public DbSet<SupportMessage>  SupportMessages  { get; set; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // ── PostgreSQL native ENUMs ─────────────────────────────────────────
        builder.HasPostgresEnum<UserRole>();
        builder.HasPostgresEnum<ProductType>();
        builder.HasPostgresEnum<DesignStatus>();
        builder.HasPostgresEnum<OrderStatus>();

        // ── AppUser ─────────────────────────────────────────────────────────
        builder.Entity<AppUser>(e =>
        {
            e.ToTable("users");
            e.HasKey(u => u.Id);

            e.Property(u => u.Email)
             .IsRequired()
             .HasMaxLength(256);

            e.HasIndex(u => u.Email)
             .IsUnique()
             .HasDatabaseName("ix_users_email");

            e.Property(u => u.AuthorNickname)
             .HasMaxLength(64);

            e.HasIndex(u => u.AuthorNickname)
             .IsUnique()
             .HasFilter("\"AuthorNickname\" IS NOT NULL")
             .HasDatabaseName("ix_users_author_nickname");

            e.Property(u => u.Role)
             .HasConversion<string>()   // stores as text; native enum requires HasPostgresEnum above
             .IsRequired()
             .HasDefaultValue(UserRole.User);

            e.Property(u => u.CreatedAt).IsRequired();
            e.Property(u => u.UpdatedAt).IsRequired();
        });

        // ── BaseProduct ─────────────────────────────────────────────────────
        builder.Entity<BaseProduct>(e =>
        {
            e.ToTable("base_products");
            e.HasKey(p => p.Id);

            e.Property(p => p.Type)
             .HasConversion<string>()
             .IsRequired();

            e.Property(p => p.Color)
             .IsRequired()
             .HasMaxLength(64);

            e.Property(p => p.BasePrice)
             .HasPrecision(18, 2)
             .IsRequired();

            e.Property(p => p.IsActive)
             .HasDefaultValue(true);

            e.HasIndex(p => p.IsActive)
             .HasDatabaseName("ix_base_products_is_active");
        });

        // ── Design ──────────────────────────────────────────────────────────
        builder.Entity<Design>(e =>
        {
            e.ToTable("designs");
            e.HasKey(d => d.Id);

            e.Property(d => d.Title)
             .IsRequired()
             .HasMaxLength(256);

            e.Property(d => d.Status)
             .HasConversion<string>()
             .HasDefaultValue(DesignStatus.Draft);

            // JSONB — serialize List<DesignLayer> with System.Text.Json
            e.Property(d => d.LayersData)
             .HasColumnType("jsonb")
             .HasConversion(
                 layers => JsonSerializer.Serialize(layers, (JsonSerializerOptions?)null),
                 json   => JsonSerializer.Deserialize<List<DesignLayer>>(json, (JsonSerializerOptions?)null) ?? new()
             )
             .Metadata.SetValueComparer(
                 new Microsoft.EntityFrameworkCore.ChangeTracking.ValueComparer<List<DesignLayer>>(
                     (a, b) => JsonSerializer.Serialize(a, (JsonSerializerOptions?)null) ==
                               JsonSerializer.Serialize(b, (JsonSerializerOptions?)null),
                     v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null).GetHashCode(),
                     v => JsonSerializer.Deserialize<List<DesignLayer>>(
                              JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                              (JsonSerializerOptions?)null) ?? new()));

            e.Property(d => d.ThumbnailUrl).HasColumnType("text");
            e.Property(d => d.BackThumbnailUrl).HasColumnType("text");

            e.Property(d => d.Tags)
             .HasColumnType("text")
             .HasDefaultValue("[]");

            e.Property(d => d.CreatedAt).IsRequired();
            e.Property(d => d.UpdatedAt).IsRequired();

            // FK → AppUser
            e.HasOne(d => d.Author)
             .WithMany(u => u.Designs)
             .HasForeignKey(d => d.AuthorId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasIndex(d => d.AuthorId)
             .HasDatabaseName("ix_designs_author_id");

            e.HasIndex(d => d.Status)
             .HasDatabaseName("ix_designs_status");
        });

        // ── MarketItem ──────────────────────────────────────────────────────
        builder.Entity<MarketItem>(e =>
        {
            e.ToTable("market_items");
            e.HasKey(m => m.Id);

            e.Property(m => m.FinalPrice)
             .HasPrecision(18, 2)
             .IsRequired();

            e.Property(m => m.PopularityScore)
             .HasDefaultValue(0);

            e.HasOne(m => m.Design)
             .WithMany(d => d.MarketItems)
             .HasForeignKey(m => m.DesignId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(m => m.BaseProduct)
             .WithMany(p => p.MarketItems)
             .HasForeignKey(m => m.BaseProductId)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasIndex(m => m.DesignId)
             .HasDatabaseName("ix_market_items_design_id");

            e.HasIndex(m => m.PopularityScore)
             .HasDatabaseName("ix_market_items_popularity_score");
        });

        // ── Order ───────────────────────────────────────────────────────────
        builder.Entity<Order>(e =>
        {
            e.ToTable("orders");
            e.HasKey(o => o.Id);

            e.Property(o => o.Status)
             .HasConversion<string>()
             .HasDefaultValue(OrderStatus.New);

            e.Property(o => o.TotalAmount)
             .HasPrecision(18, 2)
             .IsRequired();

            e.Property(o => o.CreatedAt).IsRequired();

            e.HasOne(o => o.User)
             .WithMany(u => u.Orders)
             .HasForeignKey(o => o.UserId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasIndex(o => o.UserId)
             .HasDatabaseName("ix_orders_user_id");

            e.HasIndex(o => o.Status)
             .HasDatabaseName("ix_orders_status");
        });

        // ── OrderItem ───────────────────────────────────────────────────────
        builder.Entity<OrderItem>(e =>
        {
            e.ToTable("order_items");
            e.HasKey(i => i.Id);

            e.Property(i => i.Size)
             .IsRequired()
             .HasMaxLength(16);

            e.Property(i => i.Quantity).IsRequired();

            e.Property(i => i.PriceAtPurchase)
             .HasPrecision(18, 2)
             .IsRequired();

            e.HasOne(i => i.Order)
             .WithMany(o => o.OrderItems)
             .HasForeignKey(i => i.OrderId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(i => i.MarketItem)
             .WithMany(m => m.OrderItems)
             .HasForeignKey(i => i.MarketItemId)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasIndex(i => i.OrderId)
             .HasDatabaseName("ix_order_items_order_id");
        });

        // ── AuthorStatistic ─────────────────────────────────────────────────
        builder.Entity<AuthorStatistic>(e =>
        {
            e.ToTable("author_statistics");

            // Shared PK/FK — no auto-generated Id
            e.HasKey(s => s.Id);
            e.Property(s => s.Id).ValueGeneratedNever();

            e.Property(s => s.TotalRevenue)
             .HasPrecision(18, 2)
             .HasDefaultValue(0m);

            e.Property(s => s.TotalItemsSold).HasDefaultValue(0);
            e.Property(s => s.ActiveDesignsCount).HasDefaultValue(0);
            e.Property(s => s.Balance)
             .HasPrecision(18, 2)
             .HasDefaultValue(0m);

            // One-to-one with AppUser
            e.HasOne(s => s.User)
             .WithOne(u => u.AuthorStatistic)
             .HasForeignKey<AuthorStatistic>(s => s.Id)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // ── SupportTicket ────────────────────────────────────────────────────
        builder.Entity<SupportTicket>(e =>
        {
            e.ToTable("support_tickets");
            e.HasKey(t => t.Id);

            e.Property(t => t.Subject).IsRequired().HasMaxLength(256);
            e.Property(t => t.Status).IsRequired().HasMaxLength(16).HasDefaultValue("Open");
            e.Property(t => t.CreatedAt).IsRequired();

            e.HasOne(t => t.User)
             .WithMany(u => u.SupportTickets)
             .HasForeignKey(t => t.UserId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasIndex(t => t.UserId).HasDatabaseName("ix_support_tickets_user_id");
        });

        // ── SupportMessage ───────────────────────────────────────────────────
        builder.Entity<SupportMessage>(e =>
        {
            e.ToTable("support_messages");
            e.HasKey(m => m.Id);

            e.Property(m => m.Text).IsRequired();
            e.Property(m => m.IsAdmin).IsRequired();
            e.Property(m => m.CreatedAt).IsRequired();

            e.HasOne(m => m.Ticket)
             .WithMany(t => t.Messages)
             .HasForeignKey(m => m.TicketId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(m => m.Sender)
             .WithMany()
             .HasForeignKey(m => m.SenderId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasIndex(m => m.TicketId).HasDatabaseName("ix_support_messages_ticket_id");
        });
    }
}
