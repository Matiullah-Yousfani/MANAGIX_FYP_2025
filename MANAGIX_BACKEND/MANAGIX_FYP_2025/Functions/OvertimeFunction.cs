using MANAGIX.Models.DTO;
using MANAGIX.Services;
using MANAGIX_FYP_2025.Functions;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using System;
using System.IO;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;

namespace MANAGIX_FYP_2025.Functions
{
    public class OvertimeFunction
    {
        private readonly IOvertimeService _overtime;
        private static readonly JsonSerializerOptions _json = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true,
        };

        public OvertimeFunction(IOvertimeService overtime) => _overtime = overtime;

        private async Task WriteJsonAsync<T>(HttpResponseData resp, T data)
        {
            resp.Headers.Add("Content-Type", "application/json");
            await resp.WriteStringAsync(JsonSerializer.Serialize(data, _json));
        }

        [Function("GetOvertimeRequest")]
        public async Task<HttpResponseData> Get(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "overtime/{requestId:guid}")] HttpRequestData req,
            Guid requestId)
        {
            var (userId, err) = await AuthHttpHelper.RequireAuthenticatedAsync(req);
            if (err != null) return err;

            var dto = await _overtime.GetRequestAsync(requestId, userId);
            if (dto == null)
            {
                var nf = req.CreateResponse(HttpStatusCode.NotFound);
                await nf.WriteAsJsonAsync(new { message = "Not found or access denied." });
                return nf;
            }
            var resp = req.CreateResponse(HttpStatusCode.OK);
            await WriteJsonAsync(resp, dto);
            return resp;
        }

        [Function("SubmitOvertimeReason")]
        public async Task<HttpResponseData> SubmitReason(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "overtime/{requestId:guid}/reason")] HttpRequestData req,
            Guid requestId)
        {
            try
            {
                var (userId, err) = await AuthHttpHelper.RequireAuthenticatedAsync(req);
                if (err != null) return err;

                var body = await new StreamReader(req.Body).ReadToEndAsync();
                var dto = JsonSerializer.Deserialize<OvertimeReasonDto>(body, _json) ?? new OvertimeReasonDto();
                dto.ActingUserId = userId;

                var result = await _overtime.SubmitReasonAsync(requestId, dto);
                var resp = req.CreateResponse(HttpStatusCode.OK);
                await WriteJsonAsync(resp, result);
                return resp;
            }
            catch (UnauthorizedAccessException ex)
            {
                var f = req.CreateResponse(HttpStatusCode.Forbidden);
                await f.WriteAsJsonAsync(new { message = ex.Message });
                return f;
            }
            catch (InvalidOperationException ex)
            {
                var b = req.CreateResponse(HttpStatusCode.BadRequest);
                await b.WriteAsJsonAsync(new { message = ex.Message });
                return b;
            }
        }

        [Function("ResolveOvertimeRequest")]
        public async Task<HttpResponseData> Resolve(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "overtime/{requestId:guid}/resolve")] HttpRequestData req,
            Guid requestId)
        {
            try
            {
                var (userId, err) = await AuthHttpHelper.RequireManagerOrAdminAsync(req);
                if (err != null) return err;

                var body = await new StreamReader(req.Body).ReadToEndAsync();
                var dto = JsonSerializer.Deserialize<OvertimeResolveDto>(body, _json) ?? new OvertimeResolveDto();
                dto.ActingUserId = userId;

                var result = await _overtime.ResolveAsync(requestId, dto);
                var resp = req.CreateResponse(HttpStatusCode.OK);
                await WriteJsonAsync(resp, result);
                return resp;
            }
            catch (UnauthorizedAccessException ex)
            {
                var f = req.CreateResponse(HttpStatusCode.Forbidden);
                await f.WriteAsJsonAsync(new { message = ex.Message });
                return f;
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
