using MANAGIX.Models.DTO;
using MANAGIX.Services;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace MANAGIX_FYP_2025.Functions
{
    public class UserProfileFunction
    {
        private readonly IUserProfileService _service;

        public UserProfileFunction(IUserProfileService service)
        {
            _service = service;
        }

        // GET /api/profile/{userId}
        [Function("GetProfile")]
        public async Task<HttpResponseData> GetProfile(
            [HttpTrigger(AuthorizationLevel.Function, "get", Route = "profile/{userId}")] HttpRequestData req,
            string userId)
        {
            if (!Guid.TryParse(userId, out var uid))
            {
                var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                await badResp.WriteAsJsonAsync(new { message = "Invalid User ID" });
                return badResp;
            }

            var profile = await _service.GetProfileAsync(uid);
            var resp = req.CreateResponse(profile != null ? HttpStatusCode.OK : HttpStatusCode.NotFound);
            if (profile == null)
            {
                await resp.WriteAsJsonAsync(new { message = "Profile not found" });
            }
            else
            {
                await resp.WriteAsJsonAsync(profile);
            }
            return resp;
        }

        // PUT /api/profile/{userId}
        [Function("UpdateProfile")]
        public async Task<HttpResponseData> UpdateProfile(
            [HttpTrigger(AuthorizationLevel.Function, "put", Route = "profile/{userId}")] HttpRequestData req,
            string userId)
        {
            if (!Guid.TryParse(userId, out var uid))
            {
                var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                await badResp.WriteAsJsonAsync(new { message = "Invalid User ID" });
                return badResp;
            }

            string body = await new StreamReader(req.Body).ReadToEndAsync();
            var dto = JsonSerializer.Deserialize<ProfileUpdateDto>(body,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            var updated = await _service.UpdateProfileAsync(uid, dto);
            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(updated);
            return resp;
        }

        // POST /api/profile/upload-resume
        [Function("UploadResume")]
        public async Task<HttpResponseData> UploadResume(
    [HttpTrigger(AuthorizationLevel.Function, "post", Route = "profile/upload-resume")] HttpRequestData req)
        {
            try
            {
                // Read request body
                string body = await new StreamReader(req.Body).ReadToEndAsync();

                // Deserialize JSON into DTO
                var dto = JsonSerializer.Deserialize<ResumeUploadDto>(body, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (dto == null || dto.UserId == Guid.Empty|| string.IsNullOrWhiteSpace(dto.Resume))
                {
                    var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                    await badResp.WriteAsJsonAsync(new { message = "Invalid data" });
                    return badResp;
                }

                // Convert base64 resume string to byte array
                var resumeBytes = Convert.FromBase64String(dto.Resume);

                // Save file to wwwroot/resumes folder
                var fileName = $"{dto.UserId}_resume.pdf";
                var filePath = Path.Combine("wwwroot", "resumes", fileName);
                Directory.CreateDirectory(Path.GetDirectoryName(filePath)!); // ensure folder exists
                await File.WriteAllBytesAsync(filePath, resumeBytes);

                // Update profile using service
                var profile = await _service.UploadResumeAsync(Guid.Parse(dto.UserId.ToString()), filePath);

                // Return updated profile
                var resp = req.CreateResponse(HttpStatusCode.OK);
                await resp.WriteAsJsonAsync(profile);
                return resp;
            }
            catch (Exception ex)
            {
                var errResp = req.CreateResponse(HttpStatusCode.InternalServerError);
                await errResp.WriteAsJsonAsync(new { message = "Server error", detail = ex.Message });
                return errResp;
            }
        }

    }
}
