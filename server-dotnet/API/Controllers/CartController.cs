using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using server_dotnet.Application.DTOs;
using server_dotnet.Application.Interfaces;

namespace server_dotnet.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class CartController : ControllerBase
    {
        private readonly ICartService _cartService;
        public CartController(ICartService cartService) => _cartService = cartService;

        [HttpGet]
        public async Task<IActionResult> GetCart()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            return Ok(await _cartService.GetCartAsync(userId));
        }

        [HttpPost("add")]
        public async Task<IActionResult> AddToCart([FromBody] AddToCartDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var result = await _cartService.AddToCartAsync(userId, dto);
            if (!result.Success) return BadRequest(new { error = result.Error });

            return Ok(new { message = "Добавлено в корзину." });
        }

        [HttpDelete("remove/{id}")]
        public async Task<IActionResult> RemoveFromCart(Guid id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var result = await _cartService.RemoveFromCartAsync(userId, id);
            if (!result.Success) return NotFound(new { error = result.Error });

            return Ok(new { message = "Товар удален из корзины." });
        }

        [HttpPost("checkout")]
        public async Task<IActionResult> Checkout()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var result = await _cartService.CheckoutAsync(userId);
            if (!result.Success) return BadRequest(new { error = result.Error });

            return Ok(new { message = "Заказ успешно оформлен!" });
        }

        [HttpPost("add-custom")]
        public async Task<IActionResult> AddCustom([FromBody] AddCustomToCartRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            // Convert to PublishDesignDto format for the service
            var dto = new PublishDesignDto
            {
                Title = request.Title,
                LayersDataJson = request.LayersDataJson,
                ThumbnailUrl = request.ThumbnailUrl,
                BackThumbnailUrl = request.BackThumbnailUrl,
                ProductType = request.ProductType,
                Color = request.Color,
                FinalPrice = 0, // Ignored for custom orders (uses base price)
                Tags = request.Tags
            };

            var result = await _cartService.AddCustomToCartAsync(userId, dto, request.Size, request.Quantity);
            if (!result.Success) return BadRequest(new { error = result.Error });

            return Ok(new { message = "Кастомный дизайн добавлен в корзину." });
        }
    }

    public class AddCustomToCartRequest : PublishDesignDto
    {
        public string Size { get; set; } = "M";
        public int Quantity { get; set; } = 1;
    }
}
