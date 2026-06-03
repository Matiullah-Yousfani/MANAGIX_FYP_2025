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
    public class InsightsFunction
    {
        private readonly IEmployeeInsightsService _insights;
        private readonly IManagerScopeService _scope;
        private static readonly JsonSerializerOptions _json = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true,
        };

        public InsightsFunction(IEmployeeInsightsService insights, IManagerScopeService scope)
        {
            _insights = insights;
            _scope = scope;
        }

        [Function("EmployeeInsights")]
        public async Task<HttpResponseData> Get(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "insights/employee/{userId:guid}")] HttpRequestData req,
            Guid userId)
        {
            var (callerId, err) = await AuthHttpHelper.RequireAuthenticatedAsync(req);
            if (err != null) return err;

            Guid? scopedManagerId = null;
            if (req.JwtHasAnyRole("Manager") && !req.JwtHasAnyRole("Admin"))
                scopedManagerId = callerId;
            else if (callerId != userId && !req.JwtHasAnyRole("Admin"))
            {
                var forbidden = req.CreateResponse(HttpStatusCode.Forbidden);
                await forbidden.WriteAsJsonAsync(new { message = "Access denied." });
                return forbidden;
            }

            var data = await _insights.GetAsync(userId, scopedManagerId);
            if (data == null)
            {
                var notFound = req.CreateResponse(HttpStatusCode.NotFound);
                await notFound.WriteAsJsonAsync(new { message = "Insights not found or not in your team scope." });
                return notFound;
            }

            var resp = req.CreateResponse(HttpStatusCode.OK);
            resp.Headers.Add("Content-Type", "application/json");
            await resp.WriteStringAsync(JsonSerializer.Serialize(data, _json));
            return resp;
        }

        [Function("ManagerTeamInsightsMembers")]
        public async Task<HttpResponseData> GetTeamMembers(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "insights/manager/{managerId:guid}/team")] HttpRequestData req,
            Guid managerId)
        {
            var (callerId, err) = await AuthHttpHelper.RequireManagerOrAdminAsync(req);
            if (err != null) return err;

            if (!req.JwtHasAnyRole("Admin") && callerId != managerId)
            {
                var forbidden = req.CreateResponse(HttpStatusCode.Forbidden);
                await forbidden.WriteAsJsonAsync(new { message = "Managers can only list their own team." });
                return forbidden;
            }

            var members = await _scope.GetScopedTeamMembersAsync(managerId);
            var resp = req.CreateResponse(HttpStatusCode.OK);
            resp.Headers.Add("Content-Type", "application/json");
            await resp.WriteStringAsync(JsonSerializer.Serialize(members, _json));
            return resp;
        }
    }
}
