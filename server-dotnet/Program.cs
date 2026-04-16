using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using server_dotnet.Application.Interfaces;
using server_dotnet.Application.Services;
using server_dotnet.Domain.Entities;
using server_dotnet.Domain.Enums;
using server_dotnet.Infrastructure.Data;
using server_dotnet.Infrastructure.Security;

var builder = WebApplication.CreateBuilder(args);

// ── Database ─────────────────────────────────────────────────────────────────
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

builder.Services.AddDbContext<ApplicationDbContext>(opt =>
    opt.UseNpgsql(connectionString));

// ── Application Services ──────────────────────────────────────────────────────
builder.Services.AddScoped<IAuthService,   AuthService>();
builder.Services.AddScoped<IAuthorService, AuthorService>();
builder.Services.AddScoped<IMarketService, MarketService>();
builder.Services.AddScoped<ICartService,   CartService>();

// ── JWT Authentication ────────────────────────────────────────────────────────
builder.Services
    .AddAuthentication(opt =>
    {
        opt.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        opt.DefaultChallengeScheme    = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = builder.Configuration["Jwt:Issuer"],
            ValidAudience            = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey         = new SymmetricSecurityKey(
                                           Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
        };
    });

// ── Authorization Policies ────────────────────────────────────────────────────
builder.Services.AddAuthorization(opt =>
{
    opt.AddPolicy("AdminOnly",  p => p.RequireRole("Admin"));
    opt.AddPolicy("AuthorOnly", p => p.RequireRole("Author", "Admin"));
    opt.AddPolicy("UserOnly",   p => p.RequireRole("User", "Author", "Admin"));
});

// ── CORS ──────────────────────────────────────────────────────────────────────
builder.Services.AddCors(opt =>
    opt.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:5173", "http://localhost:3000", "http://localhost:5174")
              .AllowAnyHeader()
              .AllowAnyMethod()));

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// ── Migrate + Seed ────────────────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    try
    {
        db.Database.Migrate();

        // Fix existing designs with null Tags
        db.Database.ExecuteSqlRaw("UPDATE designs SET \"Tags\" = '[]' WHERE \"Tags\" IS NULL");

        // Seed demo users if table is empty
        if (!db.Users.Any())
        {
            var users = new[]
            {
                new AppUser
                {
                    Email        = "user@ya.ru",
                    PasswordHash = PasswordHasher.Hash("user"),
                    Role         = UserRole.User
                },
                new AppUser
                {
                    Email           = "author@ya.ru",
                    PasswordHash    = PasswordHasher.Hash("author"),
                    Role            = UserRole.Author,
                    AuthorNickname  = "GigaChard"
                },
                new AppUser
                {
                    Email        = "admin@ya.ru",
                    PasswordHash = PasswordHasher.Hash("admin"),
                    Role         = UserRole.Admin
                }
            };

            db.Users.AddRange(users);
            await db.SaveChangesAsync();

            // Create AuthorStatistic for the author seed
            var author = db.Users.First(u => u.Role == UserRole.Author);
            db.AuthorStatistics.Add(new AuthorStatistic { Id = author.Id });

            // Seed base products
            db.BaseProducts.AddRange(
                new BaseProduct { Type = ProductType.TShirt, Color = "Black", BasePrice = 800m },
                new BaseProduct { Type = ProductType.TShirt, Color = "White", BasePrice = 800m },
                new BaseProduct { Type = ProductType.Hoodie, Color = "Black", BasePrice = 1500m }
            );

            await db.SaveChangesAsync();
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[SEED ERROR] {ex.Message}");
    }
}

// ── Middleware ─────────────────────────────────────────────────────────────────
app.UseSwagger();
app.UseSwaggerUI();

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.Run();
