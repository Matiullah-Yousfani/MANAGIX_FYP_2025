using MANAGIX.Models.DTO;
using MANAGIX.Services;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace MANAGIX_FYP_2025.Functions
{
    public class ResumeFunction
    {
        private readonly IResumeService _resumeService;
        private readonly HttpClient _httpClient;
        private const string PYTHON_PARSER_URL = "http://localhost:8000"; // FastAPI service URL

        public ResumeFunction(IResumeService resumeService)
        {
            _resumeService = resumeService;
            _httpClient = new HttpClient
            {
                Timeout = TimeSpan.FromMinutes(5) // 5 minutes timeout for parsing (Groq API can be slow)
            };
        }

        // POST /api/resume/parse - Parse resume using Python service (NO AUTH NEEDED FOR TESTING)
        [Function("ParseResume")]
        public async Task<HttpResponseData> ParseResume(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "resume/parse")] HttpRequestData req)
        {
            try
            {
                Console.WriteLine("[ParseResume] Starting resume parse request");
               
                string body = await new StreamReader(req.Body).ReadToEndAsync();
                var uploadDto = JsonSerializer.Deserialize<ResumeUploadRequestDto>(body,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                // For testing: userId not required, just need filename and file
                if (uploadDto == null || string.IsNullOrWhiteSpace(uploadDto.FileBase64) || string.IsNullOrWhiteSpace(uploadDto.FileName))
                {
                    Console.WriteLine("[ParseResume] Invalid request data");
                    var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                    await badResp.WriteAsJsonAsync(new { message = "Invalid request data: filename and file_base64 are required" });
                    return badResp;
                }

                Console.WriteLine($"[ParseResume] Received file: {uploadDto.FileName}, Size: {uploadDto.FileBase64.Length} chars");
                Console.WriteLine($"[ParseResume] Calling Python service at: {PYTHON_PARSER_URL}/parse-resume");

                // Call Python FastAPI service to parse resume
                var pythonRequest = new
                {
                    filename = uploadDto.FileName,
                    file_base64 = uploadDto.FileBase64
                };

                var jsonContent = new StringContent(
                    JsonSerializer.Serialize(pythonRequest),
                    Encoding.UTF8,
                    "application/json"
                );

                Console.WriteLine("[ParseResume] Sending request to Python service...");
                var startTime = DateTime.UtcNow;

                HttpResponseMessage pythonResponse;
                try
                {
                    // Test connection first
                    Console.WriteLine($"[ParseResume] Testing connection to {PYTHON_PARSER_URL}...");
                    var testResponse = await _httpClient.GetAsync($"{PYTHON_PARSER_URL}/");
                    if (!testResponse.IsSuccessStatusCode)
                    {
                        throw new HttpRequestException($"Python service health check failed: {testResponse.StatusCode}");
                    }
                    Console.WriteLine("[ParseResume] Python service is reachable, sending parse request...");
                   
                    pythonResponse = await _httpClient.PostAsync($"{PYTHON_PARSER_URL}/parse-resume", jsonContent);
                    var elapsed = (DateTime.UtcNow - startTime).TotalSeconds;
                    Console.WriteLine($"[ParseResume] Python service responded in {elapsed} seconds with status: {pythonResponse.StatusCode}");
                }
                catch (TaskCanceledException ex)
                {
                    Console.WriteLine($"[ParseResume] Request timeout: {ex.Message}");
                    var errorResp = req.CreateResponse(HttpStatusCode.GatewayTimeout);
                    await errorResp.WriteAsJsonAsync(new {
                        message = "Python service timeout - parsing took too long (max 5 minutes). The Groq API might be slow.",
                        detail = "Make sure FastAPI is running on http://localhost:8000 and your GROQ_API_KEY is valid."
                    });
                    return errorResp;
                }
                catch (HttpRequestException ex)
                {
                    Console.WriteLine($"[ParseResume] HTTP request error: {ex.Message}");
                    var errorResp = req.CreateResponse(HttpStatusCode.BadGateway);
                    await errorResp.WriteAsJsonAsync(new {
                        message = "Cannot connect to Python service",
                        detail = $"Make sure FastAPI is running on {PYTHON_PARSER_URL}. Start it with: cd resume_parser && python fastapi_app.py. Error: {ex.Message}"
                    });
                    return errorResp;
                }

                if (!pythonResponse.IsSuccessStatusCode)
                {
                    var errorMsg = await pythonResponse.Content.ReadAsStringAsync();
                    Console.WriteLine($"[ParseResume] Python service returned error: {pythonResponse.StatusCode} - {errorMsg}");
                    var errorResp = req.CreateResponse(HttpStatusCode.InternalServerError);
                    await errorResp.WriteAsJsonAsync(new { message = "Resume parsing failed", error = errorMsg });
                    return errorResp;
                }

                Console.WriteLine("[ParseResume] Reading response from Python service...");
                var parsedData = await pythonResponse.Content.ReadAsStringAsync();
                Console.WriteLine($"[ParseResume] Received {parsedData.Length} characters from Python service");

                var parsedDto = JsonSerializer.Deserialize<ResumeParsedDataDto>(parsedData,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                Console.WriteLine("[ParseResume] Successfully parsed response");
                
                // Serialize with camelCase naming policy for consistency with frontend
                var jsonOptions = new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                    WriteIndented = false
                };
                
                var resp = req.CreateResponse(HttpStatusCode.OK);
                resp.Headers.Add("Content-Type", "application/json");
                var json = JsonSerializer.Serialize(parsedDto, jsonOptions);
                await resp.WriteStringAsync(json);
                return resp;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ParseResume] Exception: {ex.Message}");
                Console.WriteLine($"[ParseResume] StackTrace: {ex.StackTrace}");
                var errorResp = req.CreateResponse(HttpStatusCode.InternalServerError);
                await errorResp.WriteAsJsonAsync(new { message = "Server error", detail = ex.Message, type = ex.GetType().Name });
                return errorResp;
            }
        }

        // POST /api/resume/save - Save parsed resume data to database (NO AUTH NEEDED FOR TESTING)
        [Function("SaveResumeProfile")]
        public async Task<HttpResponseData> SaveResumeProfile(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "resume/save")] HttpRequestData req)
        {
            try
            {
                Console.WriteLine("[SaveResumeProfile] Starting save request");
                string body = await new StreamReader(req.Body).ReadToEndAsync();
                Console.WriteLine($"[SaveResumeProfile] Received data: {body.Substring(0, Math.Min(200, body.Length))}...");
               
                var saveDto = JsonSerializer.Deserialize<ResumeSaveProfileDto>(body,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (saveDto == null)
                {
                    Console.WriteLine("[SaveResumeProfile] DTO is null");
                    var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                    await badResp.WriteAsJsonAsync(new { message = "Invalid request data: DTO is null" });
                    return badResp;
                }

                // For testing: Allow empty Guid, generate a new one if needed
                if (saveDto.UserId == Guid.Empty)
                {
                    Console.WriteLine("[SaveResumeProfile] UserId is empty, generating new Guid for testing");
                    saveDto.UserId = Guid.NewGuid();
                }

                Console.WriteLine($"[SaveResumeProfile] Saving profile for UserId: {saveDto.UserId}");

                var savedData = await _resumeService.SaveResumeProfileAsync(saveDto);

                var jsonOptions = new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                    WriteIndented = false
                };

                var resp = req.CreateResponse(HttpStatusCode.OK);
                resp.Headers.Add("Content-Type", "application/json");
                var json = JsonSerializer.Serialize(new
                {
                    message = "Resume profile saved successfully",
                    data = savedData
                }, jsonOptions);
                await resp.WriteStringAsync(json);
                return resp;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SaveResumeProfile] Exception: {ex.Message}");
                Console.WriteLine($"[SaveResumeProfile] StackTrace: {ex.StackTrace}");
                var errorResp = req.CreateResponse(HttpStatusCode.InternalServerError);
                await errorResp.WriteAsJsonAsync(new { message = "Server error", detail = ex.Message });
                return errorResp;
            }
        }

        // GET /api/resume/{userId} - Get resume data for a user
        [Function("GetResumeProfile")]
        public async Task<HttpResponseData> GetResumeProfile(
            [HttpTrigger(AuthorizationLevel.Function, "get", Route = "resume/{userId}")] HttpRequestData req,
            string userId)
        {
            try
            {
                if (!Guid.TryParse(userId, out var uid))
                {
                    var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                    await badResp.WriteAsJsonAsync(new { message = "Invalid User ID" });
                    return badResp;
                }

                var resumeData = await _resumeService.GetResumeDataAsync(uid);

                var jsonOptions = new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                    WriteIndented = false
                };

                var resp = req.CreateResponse(HttpStatusCode.OK);
                resp.Headers.Add("Content-Type", "application/json");
                var json = JsonSerializer.Serialize(resumeData, jsonOptions);
                await resp.WriteStringAsync(json);
                return resp;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GetResumeProfile] Exception: {ex.Message}");
                Console.WriteLine($"[GetResumeProfile] StackTrace: {ex.StackTrace}");
                var errorResp = req.CreateResponse(HttpStatusCode.InternalServerError);
                await errorResp.WriteAsJsonAsync(new { message = "Server error", detail = ex.Message });
                return errorResp;
            }
        }
    }
}
