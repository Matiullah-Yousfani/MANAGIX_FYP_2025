using System.IO;
using System.Net;
using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using MANAGIX.Models.DTO;
using MANAGIX.Services;

namespace MANAGIX_FYP_2025.Functions
{
    public class AiAllocationFunction
    {
        private readonly IAiAllocationService _aiService;

        private static readonly JsonSerializerOptions _jsonOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true
        };

        public AiAllocationFunction(IAiAllocationService aiService)
        {
            _aiService = aiService;
        }

        [Function("SuggestBestTeam")]
        public async Task<HttpResponseData> SuggestBestTeam(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "ai/suggest-team")] HttpRequestData req)
        {
            try
            {
                Console.WriteLine("[SuggestBestTeam] Starting request");

                string body = await new StreamReader(req.Body).ReadToEndAsync();
                var dto = JsonSerializer.Deserialize<SuggestTeamRequestDto>(body, _jsonOptions);

                if (dto == null || dto.ProjectId == Guid.Empty)
                {
                    var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                    await badResp.WriteAsJsonAsync(new { message = "Invalid request: projectId is required" });
                    return badResp;
                }

                Console.WriteLine($"[SuggestBestTeam] ProjectId: {dto.ProjectId}");
                var result = await _aiService.SuggestBestTeamAsync(dto.ProjectId);

                var resp = req.CreateResponse(HttpStatusCode.OK);
                resp.Headers.Add("Content-Type", "application/json");
                var json = JsonSerializer.Serialize(result, _jsonOptions);
                await resp.WriteStringAsync(json);
                return resp;
            }
            catch (TaskCanceledException ex)
            {
                Console.WriteLine($"[SuggestBestTeam] Timeout: {ex.Message}");
                var errorResp = req.CreateResponse(HttpStatusCode.GatewayTimeout);
                await errorResp.WriteAsJsonAsync(new { message = "AI service timeout", detail = ex.Message });
                return errorResp;
            }
            catch (HttpRequestException ex)
            {
                Console.WriteLine($"[SuggestBestTeam] HTTP error: {ex.Message}");
                var errorResp = req.CreateResponse(HttpStatusCode.BadGateway);
                await errorResp.WriteAsJsonAsync(new { message = "Cannot connect to AI service", detail = ex.Message });
                return errorResp;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SuggestBestTeam] Exception: {ex.Message}");
                Console.WriteLine($"[SuggestBestTeam] StackTrace: {ex.StackTrace}");
                var errorResp = req.CreateResponse(HttpStatusCode.InternalServerError);
                await errorResp.WriteAsJsonAsync(new { message = "Server error", detail = ex.Message });
                return errorResp;
            }
        }

        [Function("SuggestEmployees")]
        public async Task<HttpResponseData> SuggestEmployees(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "ai/suggest-employees")] HttpRequestData req)
        {
            try
            {
                Console.WriteLine("[SuggestEmployees] Starting request");

                string body = await new StreamReader(req.Body).ReadToEndAsync();
                var dto = JsonSerializer.Deserialize<SuggestEmployeesRequestDto>(body, _jsonOptions);

                if (dto == null || string.IsNullOrWhiteSpace(dto.ProjectDescription))
                {
                    var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                    await badResp.WriteAsJsonAsync(new { message = "Invalid request: projectDescription is required" });
                    return badResp;
                }

                Console.WriteLine($"[SuggestEmployees] Description length: {dto.ProjectDescription.Length}");
                var result = await _aiService.SuggestEmployeesAsync(dto.ProjectDescription);

                var resp = req.CreateResponse(HttpStatusCode.OK);
                resp.Headers.Add("Content-Type", "application/json");
                var json = JsonSerializer.Serialize(result, _jsonOptions);
                await resp.WriteStringAsync(json);
                return resp;
            }
            catch (TaskCanceledException ex)
            {
                Console.WriteLine($"[SuggestEmployees] Timeout: {ex.Message}");
                var errorResp = req.CreateResponse(HttpStatusCode.GatewayTimeout);
                await errorResp.WriteAsJsonAsync(new { message = "AI service timeout", detail = ex.Message });
                return errorResp;
            }
            catch (HttpRequestException ex)
            {
                Console.WriteLine($"[SuggestEmployees] HTTP error: {ex.Message}");
                var errorResp = req.CreateResponse(HttpStatusCode.BadGateway);
                await errorResp.WriteAsJsonAsync(new { message = "Cannot connect to AI service", detail = ex.Message });
                return errorResp;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SuggestEmployees] Exception: {ex.Message}");
                Console.WriteLine($"[SuggestEmployees] StackTrace: {ex.StackTrace}");
                var errorResp = req.CreateResponse(HttpStatusCode.InternalServerError);
                await errorResp.WriteAsJsonAsync(new { message = "Server error", detail = ex.Message });
                return errorResp;
            }
        }

        [Function("SuggestTaskAllocation")]
        public async Task<HttpResponseData> SuggestTaskAllocation(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "ai/suggest-task-allocation")] HttpRequestData req)
        {
            try
            {
                Console.WriteLine("[SuggestTaskAllocation] Starting request");

                string body = await new StreamReader(req.Body).ReadToEndAsync();
                var dto = JsonSerializer.Deserialize<SuggestTaskAllocationRequestDto>(body, _jsonOptions);

                if (dto == null || dto.ProjectId == Guid.Empty)
                {
                    var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                    await badResp.WriteAsJsonAsync(new { message = "Invalid request: projectId is required" });
                    return badResp;
                }

                Console.WriteLine($"[SuggestTaskAllocation] ProjectId: {dto.ProjectId}");
                var result = await _aiService.SuggestTaskAllocationAsync(dto.ProjectId);

                var resp = req.CreateResponse(HttpStatusCode.OK);
                resp.Headers.Add("Content-Type", "application/json");
                var json = JsonSerializer.Serialize(result, _jsonOptions);
                await resp.WriteStringAsync(json);
                return resp;
            }
            catch (TaskCanceledException ex)
            {
                Console.WriteLine($"[SuggestTaskAllocation] Timeout: {ex.Message}");
                var errorResp = req.CreateResponse(HttpStatusCode.GatewayTimeout);
                await errorResp.WriteAsJsonAsync(new { message = "AI service timeout", detail = ex.Message });
                return errorResp;
            }
            catch (HttpRequestException ex)
            {
                Console.WriteLine($"[SuggestTaskAllocation] HTTP error: {ex.Message}");
                var errorResp = req.CreateResponse(HttpStatusCode.BadGateway);
                await errorResp.WriteAsJsonAsync(new { message = "Cannot connect to AI service", detail = ex.Message });
                return errorResp;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SuggestTaskAllocation] Exception: {ex.Message}");
                Console.WriteLine($"[SuggestTaskAllocation] StackTrace: {ex.StackTrace}");
                var errorResp = req.CreateResponse(HttpStatusCode.InternalServerError);
                await errorResp.WriteAsJsonAsync(new { message = "Server error", detail = ex.Message });
                return errorResp;
            }
        }
    }
}
