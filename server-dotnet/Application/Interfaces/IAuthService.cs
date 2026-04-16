using server_dotnet.Application.DTOs;

namespace server_dotnet.Application.Interfaces
{
    public interface IAuthService
    {
        Task<(bool Success, string Token, string Error, object? User)> RegisterAsync(RegisterModel model);
        Task<(bool Success, string Token, string Error, object? User)> LoginAsync(LoginModel model);
        Task<object?> GetMeAsync(string userId);
        Task<string?> RefreshTokenAsync(string userId);
    }
}
