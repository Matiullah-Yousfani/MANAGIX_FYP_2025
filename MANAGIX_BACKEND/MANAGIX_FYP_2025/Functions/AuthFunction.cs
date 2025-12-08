using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.DTO;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using System.Net;
using System;
using System.Threading.Tasks;
using MANAGIX.Services;
using System.Text.Json;

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

                if (dto == null || string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
                {
                    var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                    await badResp.WriteAsJsonAsync(new { message = "Invalid data" });
                    return badResp;
                }

                var message = await _authService.RegisterAsync(dto);
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

                var token = await _authService.LoginAsync(dto);

                if (token == null)
                {
                    var unauthResp = req.CreateResponse(HttpStatusCode.Unauthorized);
                    await unauthResp.WriteAsJsonAsync(new { message = "Invalid credentials" });
                    return unauthResp;
                }

                var resp = req.CreateResponse(HttpStatusCode.OK);
                await resp.WriteAsJsonAsync(new { token });
                return resp;
            }
            catch (Exception ex)
            {
                var err = req.CreateResponse(HttpStatusCode.InternalServerError);
                await err.WriteAsJsonAsync(new { message = "Server error", detail = ex.Message });
                return err;
            }
        }

        // GET /api/management/pending-users
        [Function("PendingUsers")]
        public async Task<HttpResponseData> PendingUsers(
            [HttpTrigger(AuthorizationLevel.Function, "get", Route = "management/pending-users")] HttpRequestData req)
        {
            try
            {
                var list = await _unitOfWork.UserRequests.GetPendingRequestsAsync();
                var resp = req.CreateResponse(HttpStatusCode.OK);
                await resp.WriteAsJsonAsync(list);
                return resp;
            }
            catch (Exception ex)
            {
                var err = req.CreateResponse(HttpStatusCode.InternalServerError);
                await err.WriteAsJsonAsync(new { message = "Server error", detail = ex.Message });
                return err;
            }
        }

        // PUT /api/management/approve-user/{id}
        [Function("ApproveUser")]
        public async Task<HttpResponseData> ApproveUser(
            [HttpTrigger(AuthorizationLevel.Function, "put", Route = "management/approve-user/{id}")] HttpRequestData req,
            string id)
        {
            if (!Guid.TryParse(id, out Guid requestId))
            {
                var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                await badResp.WriteAsJsonAsync(new { message = "Invalid request ID" });
                return badResp;
            }

            try
            {
                var ok = await _authService.ApproveAsync(requestId);
                var resp = req.CreateResponse(HttpStatusCode.OK);
                await resp.WriteAsJsonAsync(new { success = ok });
                return resp;
            }
            catch (Exception ex)
            {
                var err = req.CreateResponse(HttpStatusCode.InternalServerError);
                await err.WriteAsJsonAsync(new { message = "Server error", detail = ex.Message });
                return err;
            }
        }

        // PUT /api/management/reject-user/{id}
        [Function("RejectUser")]
        public async Task<HttpResponseData> RejectUser(
            [HttpTrigger(AuthorizationLevel.Function, "put", Route = "management/reject-user/{id}")] HttpRequestData req,
            string id)
        {
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
                var err = req.CreateResponse(HttpStatusCode.InternalServerError);
                await err.WriteAsJsonAsync(new { message = "Server error", detail = ex.Message });
                return err;
            }
        }
    }
}
