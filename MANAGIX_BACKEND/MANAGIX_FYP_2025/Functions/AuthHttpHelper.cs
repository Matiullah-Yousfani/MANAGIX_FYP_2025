using Microsoft.Azure.Functions.Worker.Http;
using System;
using System.Net;
using System.Threading.Tasks;
using MANAGIX.Utility;

namespace MANAGIX_FYP_2025.Functions
{
    public static class AuthHttpHelper
    {
        public static async Task<(Guid UserId, HttpResponseData? Error)> RequireAuthenticatedAsync(HttpRequestData req)
        {
            try
            {
                return (req.GetUserId(), null);
            }
            catch (UnauthorizedAccessException ex)
            {
                var r = req.CreateResponse(HttpStatusCode.Unauthorized);
                await r.WriteAsJsonAsync(new { message = ex.Message });
                return (Guid.Empty, r);
            }
        }

        public static async Task<(Guid UserId, HttpResponseData? Error)> RequireAdminAsync(HttpRequestData req)
        {
            var (userId, err) = await RequireAuthenticatedAsync(req);
            if (err != null) return (Guid.Empty, err);

            if (!req.JwtHasAnyRole("Admin"))
            {
                var forbidden = req.CreateResponse(HttpStatusCode.Forbidden);
                await forbidden.WriteAsJsonAsync(new { message = "Admin role required." });
                return (Guid.Empty, forbidden);
            }

            return (userId, null);
        }

        public static async Task<(Guid UserId, HttpResponseData? Error)> RequireManagerOrAdminAsync(HttpRequestData req)
        {
            var (userId, err) = await RequireAuthenticatedAsync(req);
            if (err != null) return (Guid.Empty, err);

            if (!req.JwtHasAnyRole("Admin", "Manager"))
            {
                var forbidden = req.CreateResponse(HttpStatusCode.Forbidden);
                await forbidden.WriteAsJsonAsync(new { message = "Manager or Admin role required." });
                return (Guid.Empty, forbidden);
            }

            return (userId, null);
        }
    }
}
