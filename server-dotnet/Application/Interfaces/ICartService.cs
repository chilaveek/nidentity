using server_dotnet.Application.DTOs;

namespace server_dotnet.Application.Interfaces
{
    public interface ICartService
    {
        Task<IEnumerable<CartItemDto>> GetCartAsync(string userId);
        Task<(bool Success, string Error)> AddToCartAsync(string userId, AddToCartDto dto);
        Task<(bool Success, string Error)> AddCustomToCartAsync(string userId, PublishDesignDto dto, string size, int quantity);
        Task<(bool Success, string Error)> RemoveFromCartAsync(string userId, Guid itemId);
        Task<(bool Success, string Error)> CheckoutAsync(string userId);
    }
}
