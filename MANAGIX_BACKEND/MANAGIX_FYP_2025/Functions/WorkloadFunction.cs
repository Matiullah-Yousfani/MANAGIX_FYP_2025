using MANAGIX.Services;
using MANAGIX.Utility;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using System;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;

namespace MANAGIX_FYP_2025.Functions
{
    public class WorkloadFunction
    {
        private readonly IWorkloadService _workload;
        private readonly IManagerScopeService _scope;
        private static readonly JsonSerializerOptions _json = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true
        };

        public WorkloadFunction(IWorkloadService workload, IManagerScopeService scope)
        {
            _workload = workload;
            _scope = scope;
        }

        [Function("GetEmployeeWorkload")]
        public async Task<HttpResponseData> GetEmployeeWorkload(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "workload/employee/{userId:guid}")] HttpRequestData req,
            Guid userId)
        {
            try
            {
                var (callerId, err) = await AuthHttpHelper.RequireAuthenticatedAsync(req);
                if (err != null) return err;

                if (!req.JwtHasAnyRole("Admin"))
                {
                    if (req.JwtHasAnyRole("Manager"))
                    {
                        if (callerId != userId &&
                            !await _scope.IsMemberInManagerScopeAsync(callerId, userId))
                        {
                            var forbidden = req.CreateResponse(HttpStatusCode.Forbidden);
                            await forbidden.WriteAsJsonAsync(new { message = "Not on your project teams." });
                            return forbidden;
                        }
                    }
                    else if (callerId != userId)
                    {
                        var forbidden = req.CreateResponse(HttpStatusCode.Forbidden);
                        await forbidden.WriteAsJsonAsync(new { message = "Access denied." });
                        return forbidden;
                    }
                }

                var result = await _workload.GetEmployeeLoadAsync(userId);
                var resp = req.CreateResponse(HttpStatusCode.OK);
                resp.Headers.Add("Content-Type", "application/json");
                await resp.WriteStringAsync(JsonSerializer.Serialize(result, _json));
                return resp;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GetEmployeeWorkload] {ex.Message}");
                var err = req.CreateResponse(HttpStatusCode.InternalServerError);
                await err.WriteAsJsonAsync(new { message = ex.Message });
                return err;
            }
        }

        [Function("GetProjectWorkload")]
        public async Task<HttpResponseData> GetProjectWorkload(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "workload/project/{projectId:guid}")] HttpRequestData req,
            Guid projectId)
        {
            try
            {
                var (callerId, err) = await AuthHttpHelper.RequireAuthenticatedAsync(req);
                if (err != null) return err;

                if (req.JwtHasAnyRole("Manager") && !req.JwtHasAnyRole("Admin"))
                {
                    if (!await _scope.ManagerOwnsProjectAsync(callerId, projectId))
                    {
                        var forbidden = req.CreateResponse(HttpStatusCode.Forbidden);
                        await forbidden.WriteAsJsonAsync(new { message = "Not your project." });
                        return forbidden;
                    }
                }

                var result = await _workload.GetProjectWorkloadAsync(projectId);
                var resp = req.CreateResponse(HttpStatusCode.OK);
                resp.Headers.Add("Content-Type", "application/json");
                await resp.WriteStringAsync(JsonSerializer.Serialize(result, _json));
                return resp;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GetProjectWorkload] {ex.Message}");
                var err = req.CreateResponse(HttpStatusCode.InternalServerError);
                await err.WriteAsJsonAsync(new { message = ex.Message });
                return err;
            }
        }

        [Function("GetManagerTeamWorkload")]
        public async Task<HttpResponseData> GetManagerTeamWorkload(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "workload/manager/{managerId:guid}")] HttpRequestData req,
            Guid managerId)
        {
            var (callerId, err) = await AuthHttpHelper.RequireManagerOrAdminAsync(req);
            if (err != null) return err;

            if (!req.JwtHasAnyRole("Admin") && callerId != managerId)
            {
                var forbidden = req.CreateResponse(HttpStatusCode.Forbidden);
                await forbidden.WriteAsJsonAsync(new { message = "Managers can only view their own team workload." });
                return forbidden;
            }

            try
            {
                var result = await _workload.GetTeamWorkloadAsync(managerId);
                var resp = req.CreateResponse(HttpStatusCode.OK);
                resp.Headers.Add("Content-Type", "application/json");
                await resp.WriteStringAsync(JsonSerializer.Serialize(result, _json));
                return resp;
            }
            catch (Exception ex)
            {
                var errResp = req.CreateResponse(HttpStatusCode.InternalServerError);
                await errResp.WriteAsJsonAsync(new { message = ex.Message });
                return errResp;
            }
        }

        [Function("GetOverloadedEmployees")]
        public async Task<HttpResponseData> GetOverloaded(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "workload/overloaded")] HttpRequestData req)
        {
            try
            {
                var (callerId, authErr) = await AuthHttpHelper.RequireAuthenticatedAsync(req);
                if (authErr != null) return authErr;

                double threshold = 0.9;
                Guid? managerScope = null;

                var raw = req.Url.Query?.TrimStart('?') ?? string.Empty;
                foreach (var part in raw.Split('&', StringSplitOptions.RemoveEmptyEntries))
                {
                    var eq = part.IndexOf('=');
                    if (eq <= 0) continue;
                    var k = Uri.UnescapeDataString(part.Substring(0, eq));
                    var v = Uri.UnescapeDataString(part.Substring(eq + 1));
                    if (string.Equals(k, "threshold", StringComparison.OrdinalIgnoreCase) &&
                        double.TryParse(v, out var parsed))
                        threshold = parsed;
                    else if (string.Equals(k, "managerId", StringComparison.OrdinalIgnoreCase) &&
                             Guid.TryParse(v, out var mid))
                        managerScope = mid;
                }

                if (req.JwtHasAnyRole("Manager") && !req.JwtHasAnyRole("Admin"))
                    managerScope = callerId;
                else if (!req.JwtHasAnyRole("Admin"))
                    managerScope = null;

                if (managerScope.HasValue && !req.JwtHasAnyRole("Admin") && managerScope.Value != callerId)
                {
                    var forbidden = req.CreateResponse(HttpStatusCode.Forbidden);
                    await forbidden.WriteAsJsonAsync(new { message = "Invalid manager scope." });
                    return forbidden;
                }

                var result = await _workload.GetOverloadedEmployeesAsync(threshold, managerScope);
                var resp = req.CreateResponse(HttpStatusCode.OK);
                resp.Headers.Add("Content-Type", "application/json");
                await resp.WriteStringAsync(JsonSerializer.Serialize(result, _json));
                return resp;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GetOverloadedEmployees] {ex.Message}");
                var err = req.CreateResponse(HttpStatusCode.InternalServerError);
                await err.WriteAsJsonAsync(new { message = ex.Message });
                return err;
            }
        }
    }
}
