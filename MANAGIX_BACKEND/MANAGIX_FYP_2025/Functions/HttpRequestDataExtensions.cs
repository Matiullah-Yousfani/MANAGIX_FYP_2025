using Microsoft.Azure.Functions.Worker.Http;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.Utility
{
    public static class HttpRequestDataExtensions
    {
        public static Guid GetUserId(this HttpRequestData req)
        {
            if (!req.Headers.TryGetValues("Authorization", out var authHeaders))
                throw new UnauthorizedAccessException("Authorization header missing");

            var authHeader = authHeaders.First();

            if (!authHeader.StartsWith("Bearer "))
                throw new UnauthorizedAccessException("Invalid Authorization header");

            var token = authHeader.Replace("Bearer ", "");

            var handler = new JwtSecurityTokenHandler();
            var jwt = handler.ReadJwtToken(token);

            var userIdClaim = jwt.Claims
                .FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);

            if (userIdClaim == null)
                throw new UnauthorizedAccessException("UserId claim missing");

            return Guid.Parse(userIdClaim.Value);
        }

        /// <summary>
        /// Returns role claim values from the Bearer token (JWT).
        /// </summary>
        public static IReadOnlyList<string> GetJwtRoles(this HttpRequestData req)
        {
            if (!req.Headers.TryGetValues("Authorization", out var authHeaders))
                return Array.Empty<string>();

            var authHeader = authHeaders.FirstOrDefault();
            if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
                return Array.Empty<string>();

            var token = authHeader.Replace("Bearer ", "", StringComparison.OrdinalIgnoreCase).Trim();
            var handler = new JwtSecurityTokenHandler();
            var jwt = handler.ReadJwtToken(token);

            return jwt.Claims
                .Where(c => c.Type == ClaimTypes.Role)
                .Select(c => c.Value)
                .ToList();
        }

        public static bool JwtHasAnyRole(this HttpRequestData req, params string[] roleNames)
        {
            if (roleNames == null || roleNames.Length == 0)
                return false;

            var roles = req.GetJwtRoles();
            foreach (var r in roles)
            {
                foreach (var allowed in roleNames)
                {
                    if (!string.IsNullOrEmpty(allowed) &&
                        r.Equals(allowed, StringComparison.OrdinalIgnoreCase))
                        return true;
                }
            }

            return false;
        }
    }
}
