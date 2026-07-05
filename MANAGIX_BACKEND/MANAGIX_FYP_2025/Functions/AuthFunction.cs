using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.DTO;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using System.Net;
using System;
using System.Threading.Tasks;
using MANAGIX.Services;
using System.Text.Json;
using MANAGIX.Utility;
using System.Security.Cryptography;

namespace MANAGIX_FYP_2025.Functions
{
    public class AuthFunction
    {
        private readonly AUTH_SERVICE _authService;
        private readonly IUnitOfWork _unitOfWork;

        public AuthFunction(AUTH_SERVICE authService, IUnitOfWork unitOfWork)
        {
            _authService = authService;
            _unitOfWork = unitOfWork;
        }

        [Function("AuthMe")]
        public async Task<HttpResponseData> AuthMe(
    [HttpTrigger(AuthorizationLevel.Function, "get", Route = "auth/me")] HttpRequestData req)
        {
            try
            {
                var userId = req.GetUserId();

                var user = await _authService.GetCurrentUserAsync(userId);
                if (user == null)
                {
                    var notFound = req.CreateResponse(HttpStatusCode.NotFound);
                    await notFound.WriteAsJsonAsync(new { message = "User not found" });
                    return notFound;
                }

                var resp = req.CreateResponse(HttpStatusCode.OK);
                await resp.WriteAsJsonAsync(user);
                return resp;
            }
            catch (Exception ex)
            {
                var err = req.CreateResponse(HttpStatusCode.InternalServerError);
                await err.WriteAsJsonAsync(new { message = "Server error", detail = ex.Message });
                return err;
            }
        }



        [Function("AuthStatus")]
        public async Task<HttpResponseData> AuthStatus(
    [HttpTrigger(AuthorizationLevel.Function, "get", Route = "auth/status")] HttpRequestData req)
        {
            try
            {
                var userId = req.GetUserId(); // your existing extension

                var status = await _authService.GetAuthStatusAsync(userId);
                if (status == null)
                {
                    var notFound = req.CreateResponse(HttpStatusCode.NotFound);
                    await notFound.WriteAsJsonAsync(new { message = "User not found" });
                    return notFound;
                }

                var resp = req.CreateResponse(HttpStatusCode.OK);
                await resp.WriteAsJsonAsync(status);
                return resp;
            }
            catch (Exception ex)
            {
                var err = req.CreateResponse(HttpStatusCode.InternalServerError);
                await err.WriteAsJsonAsync(new { message = "Server error", detail = ex.Message });
                return err;
            }
        }


        // POST /api/auth/register
        [Function("Register")]
        public async Task<HttpResponseData> Register(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "auth/register")] HttpRequestData req)
        {
            try
            {
                string body = await new StreamReader(req.Body).ReadToEndAsync();
                var dto = JsonSerializer.Deserialize<RegisterRequestDto>(body, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (dto == null || string.IsNullOrWhiteSpace(dto.FullName) || string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
                {
                    var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                    await badResp.WriteAsJsonAsync(new { message = "Invalid data" });
                    return badResp;
                }

                var message = await _authService.RegisterAsync(dto);
                var validationTone = message.Contains("required", StringComparison.OrdinalIgnoreCase)
                    || message.Contains("at least", StringComparison.OrdinalIgnoreCase)
                    || message.Contains("Invalid role", StringComparison.OrdinalIgnoreCase);
                var duplicateOrPending = message.Contains("Email already", StringComparison.OrdinalIgnoreCase)
                    || message.Contains("already registered", StringComparison.OrdinalIgnoreCase);
                if (validationTone || duplicateOrPending)
                {
                    var status = duplicateOrPending ? HttpStatusCode.Conflict : HttpStatusCode.BadRequest;
                    var bad = req.CreateResponse(status);
                    await bad.WriteAsJsonAsync(new { message });
                    return bad;
                }

                var resp = req.CreateResponse(HttpStatusCode.OK);
                await resp.WriteAsJsonAsync(new { message });
                return resp;
            }
            catch (Exception ex)
            {
                var err = req.CreateResponse(HttpStatusCode.InternalServerError);
                await err.WriteAsJsonAsync(new { message = "Server error", detail = ex.Message });
                return err;
            }
        }

        // POST /api/auth/login
        [Function("Login")]
        public async Task<HttpResponseData> Login(
     [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "auth/login")] HttpRequestData req)
        {
            try
            {
                string body = await new StreamReader(req.Body).ReadToEndAsync();

                var dto = JsonSerializer.Deserialize<LoginRequestDto>(body, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (dto == null || string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
                {
                    var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                    await badResp.WriteAsJsonAsync(new { message = "Invalid data" });
                    return badResp;
                }

                var result = await _authService.LoginAsync(dto);

                // ❌ Login failed
                if (!result.Success)
                {
                    var resp = req.CreateResponse(HttpStatusCode.Unauthorized);
                    await resp.WriteAsJsonAsync(new { message = result.Message });
                    return resp;
                }

                // ✅ Login success
                var okResp = req.CreateResponse(HttpStatusCode.OK);
                await okResp.WriteAsJsonAsync(new { token = result.Token });
                return okResp;
            }
            catch (Exception ex)
            {
                var err = req.CreateResponse(HttpStatusCode.InternalServerError);
                await err.WriteAsJsonAsync(new { message = "Server error", detail = ex.Message });
                return err;
            }
        }

        [Function("ChangePassword")]
        public async Task<HttpResponseData> ChangePassword(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "auth/change-password")] HttpRequestData req)
        {
            try
            {
                var (callerId, authErr) = await AuthHttpHelper.RequireAuthenticatedAsync(req);
                if (authErr != null) return authErr;

                var body = await new StreamReader(req.Body).ReadToEndAsync();
                var dto = JsonSerializer.Deserialize<ChangePasswordDto>(body, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true,
                });

                if (dto == null || dto.UserId == Guid.Empty
                    || string.IsNullOrWhiteSpace(dto.CurrentPassword)
                    || string.IsNullOrWhiteSpace(dto.NewPassword))
                {
                    var bad = req.CreateResponse(HttpStatusCode.BadRequest);
                    await bad.WriteAsJsonAsync(new { message = "userId, currentPassword, and newPassword are required.", ok = false });
                    return bad;
                }

                if (callerId != dto.UserId && !req.JwtHasAnyRole("Admin"))
                {
                    var forbidden = req.CreateResponse(HttpStatusCode.Forbidden);
                    await forbidden.WriteAsJsonAsync(new { message = "You can only change your own password.", ok = false });
                    return forbidden;
                }

                if (dto.NewPassword != dto.NewPassword.Trim() || dto.NewPassword.Length < 6)
                {
                    var bad = req.CreateResponse(HttpStatusCode.BadRequest);
                    await bad.WriteAsJsonAsync(new { message = "New password must be at least 6 characters.", ok = false });
                    return bad;
                }

                var (ok, message) = await _authService.ChangePasswordAsync(dto.UserId, dto.CurrentPassword, dto.NewPassword);
                var resp = req.CreateResponse(ok ? HttpStatusCode.OK : HttpStatusCode.BadRequest);
                await resp.WriteAsJsonAsync(new { ok, message });
                return resp;
            }
            catch (Exception ex)
            {
                var err = req.CreateResponse(HttpStatusCode.InternalServerError);
                await err.WriteAsJsonAsync(new { message = "Server error", detail = ex.Message, ok = false });
                return err;
            }
        }

        // Add this to your Backend AuthFunction or Management section
        [Function("GetAllUsers")]
        public async Task<HttpResponseData> GetAllUsers(
            [HttpTrigger(AuthorizationLevel.Function, "get", Route = "users")] HttpRequestData req)
        {
            try
            {
                // Change: Ensure the query includes the RoleId field
                var users = await _unitOfWork.Users.GetAllAsync();

                var resp = req.CreateResponse(HttpStatusCode.OK);
                // This will now include the RoleId property you added to User.cs
                await resp.WriteAsJsonAsync(users);
                return resp;
            }
            catch (Exception ex)
            {
                var err = req.CreateResponse(HttpStatusCode.InternalServerError);
                await err.WriteAsJsonAsync(new { message = "Error fetching all users", detail = ex.Message });
                return err;
            }
        }

        // GET /api/management/pending-users
        [Function("PendingUsers")]
        public async Task<HttpResponseData> PendingUsers(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "management/pending-users")] HttpRequestData req)
        {
            var (_, err) = await AuthHttpHelper.RequireAdminAsync(req);
            if (err != null) return err;

            try
            {
                var list = await _unitOfWork.UserRequests.GetPendingRequestsAsync();
                var resp = req.CreateResponse(HttpStatusCode.OK);
                await resp.WriteAsJsonAsync(list);
                return resp;
            }
            catch (Exception ex)
            {
                var errorResp = req.CreateResponse(HttpStatusCode.InternalServerError);
                await errorResp.WriteAsJsonAsync(new { message = "Server error", detail = ex.Message });
                return errorResp;
            }
        }

        // PUT /api/management/approve-user/{id}
        [Function("ApproveUser")]
        public async Task<HttpResponseData> ApproveUser(
            [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "management/approve-user/{id}/{roleId}")] HttpRequestData req, string id , string roleId)
        {
            var (_, err) = await AuthHttpHelper.RequireAdminAsync(req);
            if (err != null) return err;

            if (!Guid.TryParse(id, out Guid requestId) || !Guid.TryParse(roleId, out Guid rId))
            {
                var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                await badResp.WriteAsJsonAsync(new { message = "Invalid request ID" });
                return badResp;
            }

            try
            {
                var ok = await _authService.ApproveAsync(requestId, rId);
                var resp = req.CreateResponse(HttpStatusCode.OK);
                await resp.WriteAsJsonAsync(new { success = ok });
                return resp;
            }
            catch (InvalidOperationException ex)
            {
                var conflict = req.CreateResponse(HttpStatusCode.Conflict);
                await conflict.WriteAsJsonAsync(new { message = ex.Message });
                return conflict;
            }
            catch (Exception ex)
            {
                var errorResp = req.CreateResponse(HttpStatusCode.InternalServerError);
                await errorResp.WriteAsJsonAsync(new { message = "Server error", detail = ex.Message });
                return errorResp;
            }
        }



        // PUT /api/management/reject-user/{id}
        [Function("RejectUser")]
        public async Task<HttpResponseData> RejectUser(
            [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "management/reject-user/{id}")] HttpRequestData req,
            string id)
        {
            var (_, err) = await AuthHttpHelper.RequireAdminAsync(req);
            if (err != null) return err;

            if (!Guid.TryParse(id, out Guid requestId))
            {
                var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                await badResp.WriteAsJsonAsync(new { message = "Invalid request ID" });
                return badResp;
            }

            try
            {
                string body = await new StreamReader(req.Body).ReadToEndAsync();
                var payload = JsonSerializer.Deserialize<Dictionary<string, string>>(body, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                string comment = payload != null && payload.ContainsKey("comment") ? payload["comment"] : "";

                var ok = await _authService.RejectAsync(requestId, comment);
                var resp = req.CreateResponse(HttpStatusCode.OK);
                await resp.WriteAsJsonAsync(new { success = ok });
                return resp;
            }
            catch (Exception ex)
            {
                var errorResp = req.CreateResponse(HttpStatusCode.InternalServerError);
                await errorResp.WriteAsJsonAsync(new { message = "Server error", detail = ex.Message });
                return errorResp;
            }
        }

        [Function("AdminDeleteUser")]
        public async Task<HttpResponseData> AdminDeleteUser(
            [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "management/users/{userId}")] HttpRequestData req,
            string userId)
        {
            var (actingUserId, err) = await AuthHttpHelper.RequireAdminAsync(req);
            if (err != null) return err;

            if (!Guid.TryParse(userId, out var uid))
            {
                var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                await badResp.WriteAsJsonAsync(new { message = "Invalid user ID." });
                return badResp;
            }

            try
            {
                var (ok, message) = await _authService.TryDeleteUserAsync(uid);
                var status = ok ? HttpStatusCode.OK : HttpStatusCode.Conflict;
                var resp = req.CreateResponse(status);
                await resp.WriteAsJsonAsync(new { success = ok, message });
                return resp;
            }
            catch (Exception ex)
            {
                var errorResp = req.CreateResponse(HttpStatusCode.InternalServerError);
                await errorResp.WriteAsJsonAsync(new { message = "Server error", detail = ex.Message });
                return errorResp;
            }
        }
    }
}
