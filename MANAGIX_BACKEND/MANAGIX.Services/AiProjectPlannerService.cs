using MANAGIX.Models.DTO;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace MANAGIX.Services
{
    public class AiProjectPlannerService : IAiProjectPlannerService
    {
        private readonly HttpClient _httpClient;
        private readonly string _baseUrl;

        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true
        };

        public AiProjectPlannerService(IConfiguration config)
        {
            _baseUrl = (config["AiPlannerUrl"] ?? "http://127.0.0.1:8001").TrimEnd('/');
            _httpClient = new HttpClient { Timeout = TimeSpan.FromMinutes(3) };
        }

        public async Task<AiProjectPlanResponseDto> GeneratePlanAsync(
            AiProjectPlanRequestDto request,
            IReadOnlyList<string> methodologyNames)
        {
            var payload = new
            {
                projectName = request.ProjectName,
                projectDescription = request.ProjectDescription,
                deadline = request.Deadline,
                budget = request.Budget,
                methodologyOptions = methodologyNames?.ToList() ?? new List<string>()
            };

            var json = JsonSerializer.Serialize(payload, JsonOptions);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            HttpResponseMessage response;
            try
            {
                response = await _httpClient.PostAsync($"{_baseUrl}/api/generate-plan", content);
            }
            catch (TaskCanceledException)
            {
                throw new TaskCanceledException("AI planner request timed out. Ensure resume_parser ai_planner.py is running on port 8001.");
            }
            catch (HttpRequestException ex)
            {
                throw new HttpRequestException(
                    $"Cannot reach AI planner at {_baseUrl}. Start: python ai_planner.py (from resume_parser). {ex.Message}", ex);
            }

            var body = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
                throw new HttpRequestException($"AI planner returned {(int)response.StatusCode}: {body}");

            var parsed = JsonSerializer.Deserialize<AiProjectPlanResponseDto>(body, JsonOptions)
                         ?? new AiProjectPlanResponseDto();

            return parsed;
        }
    }
}
