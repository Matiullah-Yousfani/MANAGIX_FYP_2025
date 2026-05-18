using MANAGIX.Services;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using System;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;

namespace MANAGIX_FYP_2025.Functions
{
    // PHASE 5: Admin monitoring endpoints. Endpoints are anonymous on the FE-Function boundary
    // (matching the rest of this codebase); FE gates by role from localStorage. A future security
    // pass should add server-side JWT-claim role enforcement.
    public class MonitoringFunction
    {
        private readonly IMonitoringService _monitor;
        private static readonly JsonSerializerOptions _json = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true,
        };

        public MonitoringFunction(IMonitoringService monitor) => _monitor = monitor;

        // GET /monitoring/system
        // NOTE: route does NOT begin with "admin/" — that prefix is reserved by the Functions
        // runtime for built-in management endpoints and would cause registration to fail.
        // Role-gating still happens client-side in MonitoringPanel.tsx (Admin only).
        [Function("AdminSystemHealth")]
        public async Task<HttpResponseData> System(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "monitoring/system")] HttpRequestData req)
        {
            try
            {
                var data = await _monitor.GetSystemHealthAsync();
                var resp = req.CreateResponse(HttpStatusCode.OK);
                resp.Headers.Add("Content-Type", "application/json");
                await resp.WriteStringAsync(JsonSerializer.Serialize(data, _json));
                return resp;
            }
            catch (Exception ex)
            {
                var err = req.CreateResponse(HttpStatusCode.InternalServerError);
                await err.WriteAsJsonAsync(new { message = ex.Message });
                return err;
            }
        }

        // GET /monitoring/project/{projectId}
        // (See note on AdminSystemHealth for why this is not under "admin/".)
        [Function("AdminProjectHealth")]
        public async Task<HttpResponseData> Project(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "monitoring/project/{projectId:guid}")] HttpRequestData req,
            Guid projectId)
        {
            try
            {
                var data = await _monitor.GetProjectHealthAsync(projectId);
                var resp = req.CreateResponse(HttpStatusCode.OK);
                resp.Headers.Add("Content-Type", "application/json");
                await resp.WriteStringAsync(JsonSerializer.Serialize(data, _json));
                return resp;
            }
            catch (Exception ex)
            {
                var err = req.CreateResponse(HttpStatusCode.InternalServerError);
                await err.WriteAsJsonAsync(new { message = ex.Message });
                return err;
            }
        }
    }
}
