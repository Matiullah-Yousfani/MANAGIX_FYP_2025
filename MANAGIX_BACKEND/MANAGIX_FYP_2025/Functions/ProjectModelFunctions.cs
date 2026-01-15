using System.Net;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using MANAGIX.DataAccess.Repositories.IRepositories;

namespace ProjectLaunchpad.Functions
{
    public class ProjectModelFunctions
    {
        private readonly IUnitOfWork _unitOfWork;

        public ProjectModelFunctions(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        [Function("GetProjectModels")]
        public async Task<HttpResponseData> GetProjectModels(
            [HttpTrigger(AuthorizationLevel.Function, "get", Route = "project-models")] HttpRequestData req)
        {
            var models = await _unitOfWork.ProjectModels.GetAllAsync();

            var response = req.CreateResponse(HttpStatusCode.OK);
            await response.WriteAsJsonAsync(models);

            return response;
        }
    }
}