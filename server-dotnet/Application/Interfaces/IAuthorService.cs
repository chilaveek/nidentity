using server_dotnet.Application.DTOs;

namespace server_dotnet.Application.Interfaces
{
    public interface IAuthorService
    {
        Task<AuthorProfileDto> GetProfileAsync(string userId);
        Task<(bool Success, string Error, string Nickname)> BecomeAuthorAsync(string userId, string nickname);
    }
}
