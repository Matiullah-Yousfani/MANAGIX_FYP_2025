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
    public class PayrollFunction
    {
        private readonly IPayrollService _payroll;
        private readonly IManagerScopeService _scope;
        private static readonly JsonSerializerOptions _json = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true,
        };

        public PayrollFunction(IPayrollService payroll, IManagerScopeService scope)
        {
            _payroll = payroll;
            _scope = scope;
        }

        [Function("ProjectPayroll")]
        public async Task<HttpResponseData> ProjectPayroll(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "payroll/project/{projectId:guid}")] HttpRequestData req,
            Guid projectId)
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

            var data = await _payroll.GetProjectPayrollAsync(projectId);
            var resp = req.CreateResponse(HttpStatusCode.OK);
            resp.Headers.Add("Content-Type", "application/json");
            await resp.WriteStringAsync(JsonSerializer.Serialize(data, _json));
            return resp;
        }

        [Function("OrganizationPayroll")]
        public async Task<HttpResponseData> OrgPayroll(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "payroll/organization")] HttpRequestData req)
        {
            var (_, err) = await AuthHttpHelper.RequireAdminAsync(req);
            if (err != null) return err;

            var data = await _payroll.GetOrganizationPayrollAsync();
            var resp = req.CreateResponse(HttpStatusCode.OK);
            resp.Headers.Add("Content-Type", "application/json");
            await resp.WriteStringAsync(JsonSerializer.Serialize(data, _json));
            return resp;
        }
    }
}
