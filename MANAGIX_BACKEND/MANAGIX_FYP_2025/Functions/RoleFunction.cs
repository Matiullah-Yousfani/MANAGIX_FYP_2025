using MANAGIX.Models.DTO;
using MANAGIX.Services;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;

namespace MANAGIX_FYP_2025.Functions
{
    public class RoleFunction
    {
        private readonly RoleService _roleService;

        public RoleFunction(RoleService roleService)
        {
            _roleService = roleService;
        }

        // GET /api/roles
        [Function("GetRoles")]
        public async Task<HttpResponseData> GetRoles(
            [HttpTrigger(AuthorizationLevel.Function, "get", Route = "roles")] HttpRequestData req)
        {
            var roles = await _roleService.GetAllRolesAsync();
            var response = req.CreateResponse(HttpStatusCode.OK);
            await response.WriteAsJsonAsync(roles);
            return response;
        }

        // POST /api/roles
        [Function("CreateRole")]
        public async Task<HttpResponseData> CreateRole(
            [HttpTrigger(AuthorizationLevel.Function, "post", Route = "roles")] HttpRequestData req)
        {
            try
            {
                string body = await new StreamReader(req.Body).ReadToEndAsync();
                var dto = JsonSerializer.Deserialize<RoleCreateDto>(body, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (dto == null || string.IsNullOrWhiteSpace(dto.RoleName))
                {
                    var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                    await badResp.WriteAsJsonAsync(new { message = "RoleName is required" });
                    return badResp;
                }

                var role = await _roleService.CreateRoleAsync(dto);
                var response = req.CreateResponse(HttpStatusCode.Created);
                await response.WriteAsJsonAsync(role);
                return response;
            }
            catch (Exception ex)
            {
                var err = req.CreateResponse(HttpStatusCode.InternalServerError);
                await err.WriteAsJsonAsync(new { message = "Server error", detail = ex.Message });
                return err;
            }
        }

        // PUT /api/roles/{id}
        [Function("UpdateRole")]
        public async Task<HttpResponseData> UpdateRole(
            [HttpTrigger(AuthorizationLevel.Function, "put", Route = "roles/{id}")] HttpRequestData req,
            string id)
        {
            if (!Guid.TryParse(id, out Guid roleId))
            {
                var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                await badResp.WriteAsJsonAsync(new { message = "Invalid ID" });
                return badResp;
            }

            try
            {
                string body = await new StreamReader(req.Body).ReadToEndAsync();
                var dto = JsonSerializer.Deserialize<RoleCreateDto>(body, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (dto == null || string.IsNullOrWhiteSpace(dto.RoleName))
                {
                    var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                    await badResp.WriteAsJsonAsync(new { message = "RoleName is required" });
                    return badResp;
                }

                var updated = await _roleService.UpdateRoleAsync(roleId, dto);
                var response = req.CreateResponse(updated ? HttpStatusCode.OK : HttpStatusCode.NotFound);
                return response;
            }
            catch (Exception ex)
            {
                var err = req.CreateResponse(HttpStatusCode.InternalServerError);
                await err.WriteAsJsonAsync(new { message = "Server error", detail = ex.Message });
                return err;
            }
        }

        // DELETE /api/roles/{id}
        [Function("DeleteRole")]
        public async Task<HttpResponseData> DeleteRole(
            [HttpTrigger(AuthorizationLevel.Function, "delete", Route = "roles/{id}")] HttpRequestData req,
            string id)
        {
            if (!Guid.TryParse(id, out Guid roleId))
            {
                var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                await badResp.WriteAsJsonAsync(new { message = "Invalid ID" });
                return badResp;
            }

            try
            {
                var deleted = await _roleService.DeleteRoleAsync(roleId);
                var response = req.CreateResponse(deleted ? HttpStatusCode.OK : HttpStatusCode.NotFound);
                return response;
            }
            catch (Exception ex)
            {
                var err = req.CreateResponse(HttpStatusCode.InternalServerError);
                await err.WriteAsJsonAsync(new { message = "Server error", detail = ex.Message });
                return err;
            }
        }
    }
}
