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
    }
}
