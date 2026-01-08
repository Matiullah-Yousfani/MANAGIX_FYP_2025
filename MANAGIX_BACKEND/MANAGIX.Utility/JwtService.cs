using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.Utility
{
    public class JwtService
    {
        private readonly IConfiguration _config;

        public JwtService(IConfiguration config)
        {
            _config = config;
        }

        public string GenerateToken(Guid userId, string email, List<string> roles)
        {
            // --- CHANGES START HERE ---
            var claims = new List<Claim>
            {
                // ADDED: This satisfies ClaimTypes.NameIdentifier used in HttpRequestDataExtensions.cs
                new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
                
                // KEPT: Existing claim for backward compatibility
                new Claim("userId", userId.ToString()),

                new Claim(ClaimTypes.Email, email)
            };
            // --- CHANGES END HERE ---

            foreach (var role in roles.Where(r => !string.IsNullOrEmpty(r)))
                claims.Add(new Claim(ClaimTypes.Role, role));

            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_config["Jwt:Key"])
            );

            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddDays(5),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}