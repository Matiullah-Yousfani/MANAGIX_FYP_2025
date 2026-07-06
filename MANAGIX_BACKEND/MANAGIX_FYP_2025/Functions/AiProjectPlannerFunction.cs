using System.IO;
using System.Linq;
using System.Net;
using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.DTO;
using MANAGIX.Services;
using MANAGIX.Utility;

namespace MANAGIX_FYP_2025.Functions
{
    public class AiProjectPlannerFunction
    {
        private readonly IAiProjectPlannerService _planner;
        private readonly IUnitOfWork _unitOfWork;

        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true
        };

        public AiProjectPlannerFunction(IAiProjectPlannerService planner, IUnitOfWork unitOfWork)
        {
            _planner = planner;
            _unitOfWork = unitOfWork;
        }

        [Function("AiGenerateProjectPlan")]
        public async Task<HttpResponseData> GenerateProjectPlan(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "ai/generate-project-plan")] HttpRequestData req)
        {
            try
            {
                var body = await new StreamReader(req.Body).ReadToEndAsync();
                var dto = JsonSerializer.Deserialize<AiProjectPlanRequestDto>(body, JsonOptions);
                if (dto == null
                    || string.IsNullOrWhiteSpace(dto.ProjectName)
                    || string.IsNullOrWhiteSpace(dto.ProjectDescription)
                    || string.IsNullOrWhiteSpace(dto.Deadline))
                {
                    var bad = req.CreateResponse(HttpStatusCode.BadRequest);
                    await bad.WriteAsJsonAsync(new { message = "projectName, projectDescription, and deadline are required." });
                    return bad;
                }

                var descErr = ProjectRules.ValidateDescription(dto.ProjectDescription);
                if (descErr != null)
                {
                    var bad = req.CreateResponse(HttpStatusCode.BadRequest);
                    await bad.WriteAsJsonAsync(new { message = descErr });
                    return bad;
                }

                var budgetErr = ProjectRules.ValidateBudget((decimal)dto.Budget);
                if (budgetErr != null)
                {
                    var bad = req.CreateResponse(HttpStatusCode.BadRequest);
                    await bad.WriteAsJsonAsync(new { message = budgetErr });
                    return bad;
                }

                var models = (await _unitOfWork.ProjectModels.GetAllAsync()).ToList();
                var names = models
                    .Select(m => m.ModelName)
                    .Where(n => !string.IsNullOrWhiteSpace(n))
                    .ToList();

                var plan = await _planner.GeneratePlanAsync(dto, names);

                if (!string.IsNullOrWhiteSpace(plan.SuggestedMethodology))
                {
                    var sm = plan.SuggestedMethodology.Trim();
                    var exact = models.FirstOrDefault(m =>
                        string.Equals(m.ModelName, sm, StringComparison.OrdinalIgnoreCase));
                    if (exact != null)
                        plan.SuggestedModelId = exact.ModelId;
                    else
                    {
                        var fuzzy = models.FirstOrDefault(m =>
                            sm.Contains(m.ModelName, StringComparison.OrdinalIgnoreCase) ||
                            m.ModelName.Contains(sm, StringComparison.OrdinalIgnoreCase));
                        if (fuzzy != null)
                            plan.SuggestedModelId = fuzzy.ModelId;
                    }
                }

                var resp = req.CreateResponse(HttpStatusCode.OK);
                resp.Headers.Add("Content-Type", "application/json");
                await resp.WriteStringAsync(JsonSerializer.Serialize(plan, JsonOptions));
                return resp;
            }
            catch (TaskCanceledException ex)
            {
                var err = req.CreateResponse(HttpStatusCode.GatewayTimeout);
                await err.WriteAsJsonAsync(new { message = "AI planner timeout", detail = ex.Message });
                return err;
            }
            catch (HttpRequestException ex)
            {
                var err = req.CreateResponse(HttpStatusCode.BadGateway);
                await err.WriteAsJsonAsync(new { message = ex.Message, detail = ex.Message });
                return err;
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
