using MANAGIX.Models.DTO;
using MANAGIX.Services;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using System;
using System.IO;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;

namespace MANAGIX_FYP_2025.Functions
{
    // Routes must NOT start with "admin/" — Azure Functions reserves that prefix (see MonitoringFunction).
    public class AdminPayrollSettingsFunction
    {
        private readonly IAdminPayrollSettingsService _settings;
        private static readonly JsonSerializerOptions _json = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true,
        };

        public AdminPayrollSettingsFunction(IAdminPayrollSettingsService settings) => _settings = settings;

        [Function("AdminPayrollSettingsList")]
        public async Task<HttpResponseData> List(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "management/payroll-settings/users")] HttpRequestData req)
        {
            var (_, err) = await AuthHttpHelper.RequireAdminAsync(req);
            if (err != null) return err;

            var list = await _settings.GetEmployeeSettingsAsync();
            var resp = req.CreateResponse(HttpStatusCode.OK);
            resp.Headers.Add("Content-Type", "application/json");
            await resp.WriteStringAsync(JsonSerializer.Serialize(list, _json));
            return resp;
        }

        [Function("AdminPayrollSettingsUpdate")]
        public async Task<HttpResponseData> Update(
            [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "management/payroll-settings/users/{userId:guid}")] HttpRequestData req,
            Guid userId)
        {
            try
            {
                var (_, err) = await AuthHttpHelper.RequireAdminAsync(req);
                if (err != null) return err;

                var body = await new StreamReader(req.Body).ReadToEndAsync();
                var dto = JsonSerializer.Deserialize<AdminPayrollSettingsUpdateDto>(body, _json)
                    ?? new AdminPayrollSettingsUpdateDto();

                var result = await _settings.UpdateEmployeeSettingsAsync(userId, dto);
                var resp = req.CreateResponse(HttpStatusCode.OK);
                resp.Headers.Add("Content-Type", "application/json");
                await resp.WriteStringAsync(JsonSerializer.Serialize(result, _json));
                return resp;
            }
            catch (InvalidOperationException ex)
            {
                var b = req.CreateResponse(HttpStatusCode.BadRequest);
                await b.WriteAsJsonAsync(new { message = ex.Message });
                return b;
            }
        }
    }
}
