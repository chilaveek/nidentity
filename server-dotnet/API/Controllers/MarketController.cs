using Microsoft.AspNetCore.Mvc;
using server_dotnet.Application.Interfaces;

namespace server_dotnet.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MarketController : ControllerBase
    {
        private readonly IMarketService _marketService;
        public MarketController(IMarketService marketService) => _marketService = marketService;

        [HttpGet("products")]
        public async Task<IActionResult> GetProducts()
        {
            var products = await _marketService.GetProductsAsync();
            return Ok(products);
        }
    }
}
