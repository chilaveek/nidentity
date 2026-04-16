using server_dotnet.Application.DTOs;

namespace server_dotnet.Application.Interfaces
{
    public interface IMarketService
    {
        Task<IEnumerable<ProductDto>> GetProductsAsync();
    }
}
