using MANAGIX.Services;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using System;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;

namespace MANAGIX_FYP_2025.Functions
{
    // PHASE 3: Workload endpoints — feed the workload panel + the dashboard widgets.
    public class WorkloadFunction
    {
        private readonly IWorkloadService _workload;
        private static readonly JsonSerializerOptions _json = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true
        };

        public WorkloadFunction(IWorkloadService workload) => _workload = workload;

        // GET /workload/employee/{userId}
        [Function("GetEmployeeWorkload")]
        public async Task<HttpResponseData> GetEmployeeWorkload(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "workload/employee/{userId:guid}")] HttpRequestData req,
            Guid userId)
        {
            try
            {
                var result = await _workload.GetEmployeeLoadAsync(userId);
                var resp = req.CreateResponse(HttpStatusCode.OK);
                await resp.WriteStringAsync(JsonSerializer.Serialize(result, _json));
                resp.Headers.Add("Content-Type", "application/json");
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

        // GET /workload/project/{projectId}
        [Function("GetProjectWorkload")]
        public async Task<HttpResponseData> GetProjectWorkload(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "workload/project/{projectId:guid}")] HttpRequestData req,
            Guid projectId)
        {
            try
            {
                var result = await _workload.GetProjectWorkloadAsync(projectId);
                var resp = req.CreateResponse(HttpStatusCode.OK);
                await resp.WriteStringAsync(JsonSerializer.Serialize(result, _json));
                resp.Headers.Add("Content-Type", "application/json");
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

        // GET /workload/overloaded?threshold=0.9
        [Function("GetOverloadedEmployees")]
        public async Task<HttpResponseData> GetOverloaded(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "workload/overloaded")] HttpRequestData req)
        {
            try
            {
                // Read optional threshold from query string. Manual parse — avoids pulling in System.Web.
                double threshold = 0.9;
                var raw = req.Url.Query?.TrimStart('?') ?? string.Empty;
                foreach (var part in raw.Split('&', StringSplitOptions.RemoveEmptyEntries))
                {
                    var eq = part.IndexOf('=');
                    if (eq <= 0) continue;
                    var k = Uri.UnescapeDataString(part.Substring(0, eq));
                    var v = Uri.UnescapeDataString(part.Substring(eq + 1));
                    if (string.Equals(k, "threshold", StringComparison.OrdinalIgnoreCase) && double.TryParse(v, out var parsed))
                    {
                        threshold = parsed;
                        break;
                    }
                }

                var result = await _workload.GetOverloadedEmployeesAsync(threshold);
                var resp = req.CreateResponse(HttpStatusCode.OK);
                await resp.WriteStringAsync(JsonSerializer.Serialize(result, _json));
                resp.Headers.Add("Content-Type", "application/json");
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
