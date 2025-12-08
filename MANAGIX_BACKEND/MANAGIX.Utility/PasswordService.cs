using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.Utility
{
    public static class PasswordService
    {
        public static string Hash(string password) => BCrypt.Net.BCrypt.HashPassword(password);
        public static bool Verify(string password, string hash) => BCrypt.Net.BCrypt.Verify(password, hash);
    }
}
