using System.ComponentModel.DataAnnotations;

namespace server_dotnet.Application.DTOs
{
    public class ProductDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string ImageUrl { get; set; } = string.Empty;
        public string? BackImageUrl { get; set; }
        public decimal Price { get; set; }
        public int PopularityScore { get; set; }
        public string AuthorNickname { get; set; } = string.Empty;
        public string Tags { get; set; } = "[]";
    }

    public class AuthorProfileDto
    {
        public bool IsAuthor { get; set; }
        public string Nickname { get; set; } = string.Empty;
        public decimal Balance { get; set; }
    }

    public class BecomeAuthorDto
    {
        public string Nickname { get; set; } = string.Empty;
    }

    public class CartItemDto
    {
        public Guid Id { get; set; }
        public Guid ProductId { get; set; }
        public string Size { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public string Title { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public string ImageUrl { get; set; } = string.Empty;
        public string? BackImageUrl { get; set; }
    }

    public class AddToCartDto
    {
        public Guid ProductId { get; set; }
        public string Size { get; set; } = "M";
        public int Quantity { get; set; } = 1;
    }

    public class OrderDto
    {
        public Guid Id { get; set; }
        public string Status { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public string? Address { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<OrderItemDto> Items { get; set; } = [];
    }

    public class OrderItemDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string ImageUrl { get; set; } = string.Empty;
        public string Size { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal Price { get; set; }
    }

    public class AuthorStatsDto
    {
        public decimal TotalRevenue { get; set; }
        public decimal Balance { get; set; }
        public int TotalItemsSold { get; set; }
        public int ActiveDesignsCount { get; set; }
    }
}
