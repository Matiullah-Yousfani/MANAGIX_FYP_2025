using MANAGIX.Models.DTO;
using MANAGIX.Services;
using MANAGIX.Utility;
using MANAGIX_FYP_2025.Functions;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using System;
using System.IO;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;

namespace MANAGIX_FYP_2025.Functions
{
    public class TimesheetFunction
    {
        private readonly ITimesheetService _timesheet;
        private readonly IDailyTimesheetService _daily;
        private static readonly JsonSerializerOptions _json = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true,
        };

        public TimesheetFunction(ITimesheetService timesheet, IDailyTimesheetService daily)
        {
            _timesheet = timesheet;
            _daily = daily;
        }

        private async Task WriteJsonAsync<T>(HttpRequestData req, HttpResponseData resp, T data)
        {
            resp.Headers.Add("Content-Type", "application/json");
            await resp.WriteStringAsync(JsonSerializer.Serialize(data, _json));
        }

        [Function("PresenceHeartbeat")]
        public async Task<HttpResponseData> Heartbeat(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "timesheet/heartbeat/{userId:guid}")] HttpRequestData req,
            Guid userId)
        {
            var result = await _timesheet.HeartbeatAsync(userId);
            var resp = req.CreateResponse(HttpStatusCode.OK);
            await WriteJsonAsync(req, resp, result);
            return resp;
        }

        [Function("TimesheetClockIn")]
        public async Task<HttpResponseData> ClockIn(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "timesheet/clock-in")] HttpRequestData req)
        {
            try
            {
                var body = await new StreamReader(req.Body).ReadToEndAsync();
                var dto = JsonSerializer.Deserialize<ClockInDto>(body, _json);
                if (dto == null || dto.UserId == Guid.Empty)
                {
                    var bad = req.CreateResponse(HttpStatusCode.BadRequest);
                    await bad.WriteAsJsonAsync(new { message = "userId required" });
                    return bad;
                }
                var entry = await _timesheet.ClockInAsync(dto);
                var resp = req.CreateResponse(HttpStatusCode.OK);
                await WriteJsonAsync(req, resp, entry);
                return resp;
            }
            catch (System.InvalidOperationException ex)
            {
                var c = req.CreateResponse(HttpStatusCode.Conflict);
                await c.WriteAsJsonAsync(new { message = ex.Message });
                return c;
            }
            catch (Exception ex) when (IsMissingTimesheetSchema(ex))
            {
                return await SchemaErrorAsync(req, ex);
            }
            catch (Exception ex)
            {
                var err = req.CreateResponse(HttpStatusCode.InternalServerError);
                await err.WriteAsJsonAsync(new { message = ex.Message });
                return err;
            }
        }

        [Function("TimesheetClockOut")]
        public async Task<HttpResponseData> ClockOut(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "timesheet/clock-out/{userId:guid}")] HttpRequestData req,
            Guid userId)
        {
            try
            {
                var result = await _timesheet.ClockOutAsync(userId);
                var resp = req.CreateResponse(HttpStatusCode.OK);
                await WriteJsonAsync(req, resp, result);
                return resp;
            }
            catch (Exception ex) when (IsMissingTimesheetSchema(ex))
            {
                return await SchemaErrorAsync(req, ex);
            }
        }

        [Function("TimesheetToday")]
        public async Task<HttpResponseData> Today(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "timesheet/today/{userId:guid}")] HttpRequestData req,
            Guid userId)
        {
            try
            {
                var today = await _timesheet.GetTodayAsync(userId);
                var resp = req.CreateResponse(HttpStatusCode.OK);
                await WriteJsonAsync(req, resp, today);
                return resp;
            }
            catch (Exception ex) when (IsMissingTimesheetSchema(ex))
            {
                return await SchemaErrorAsync(req, ex);
            }
        }

        [Function("TimesheetSummary")]
        public async Task<HttpResponseData> Summary(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "timesheet/summary/{userId:guid}")] HttpRequestData req,
            Guid userId)
        {
            var summary = await _timesheet.GetSummaryAsync(userId);
            var resp = req.CreateResponse(HttpStatusCode.OK);
            await WriteJsonAsync(req, resp, summary);
            return resp;
        }

        [Function("TimesheetPolicyGet")]
        public async Task<HttpResponseData> GetPolicy(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "timesheet/policy")] HttpRequestData req)
        {
            try
            {
                var policy = await _daily.GetPolicyAsync();
                var resp = req.CreateResponse(HttpStatusCode.OK);
                await WriteJsonAsync(req, resp, policy);
                return resp;
            }
            catch (Exception ex) when (IsMissingTimesheetSchema(ex))
            {
                return await SchemaErrorAsync(req, ex);
            }
        }

        private static bool IsMissingTimesheetSchema(Exception ex)
        {
            for (var e = ex; e != null; e = e.InnerException)
            {
                if (e is SqlException sql && (sql.Number == 208 || sql.Number == 207))
                    return true;
                if (e.Message.Contains("TimesheetPolicySettings", StringComparison.OrdinalIgnoreCase)
                    || e.Message.Contains("DailyTimesheets", StringComparison.OrdinalIgnoreCase)
                    || e.Message.Contains("Invalid object name", StringComparison.OrdinalIgnoreCase))
                    return true;
            }
            return false;
        }

        private static async Task<HttpResponseData> SchemaErrorAsync(HttpRequestData req, Exception ex)
        {
            var resp = req.CreateResponse(HttpStatusCode.ServiceUnavailable);
            await resp.WriteAsJsonAsync(new
            {
                message = "Timesheet database schema is out of date. Run Documentation/FIX_TIMESHEET_SCHEMA_COMPLETE.sql on your SQL database, then restart func start.",
                detail = ex.Message,
            });
            return resp;
        }

        [Function("TimesheetPolicyPut")]
        public async Task<HttpResponseData> PutPolicy(
            [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "timesheet/policy")] HttpRequestData req)
        {
            var (_, err) = await AuthHttpHelper.RequireAdminAsync(req);
            if (err != null) return err;
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var dto = JsonSerializer.Deserialize<TimesheetPolicyDto>(body, _json) ?? new TimesheetPolicyDto();
            var policy = await _daily.UpdatePolicyAsync(dto);
            var resp = req.CreateResponse(HttpStatusCode.OK);
            await WriteJsonAsync(req, resp, policy);
            return resp;
        }

        [Function("TimesheetSubmitDaily")]
        public async Task<HttpResponseData> SubmitDaily(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "timesheet/submit")] HttpRequestData req)
        {
            try
            {
                var (userId, err) = await AuthHttpHelper.RequireAuthenticatedAsync(req);
                if (err != null) return err;
                var body = await new StreamReader(req.Body).ReadToEndAsync();
                var dto = JsonSerializer.Deserialize<SubmitDailyTimesheetDto>(body, _json) ?? new SubmitDailyTimesheetDto();
                dto.UserId = userId;
                var result = await _daily.SubmitAsync(dto);
                var resp = req.CreateResponse(HttpStatusCode.OK);
                await WriteJsonAsync(req, resp, result);
                return resp;
            }
            catch (InvalidOperationException ex)
            {
                var b = req.CreateResponse(HttpStatusCode.BadRequest);
                await b.WriteAsJsonAsync(new { message = ex.Message });
                return b;
            }
        }

        [Function("TimesheetReviewDaily")]
        public async Task<HttpResponseData> ReviewDaily(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "timesheet/review/{dailyTimesheetId:guid}")] HttpRequestData req,
            Guid dailyTimesheetId)
        {
            try
            {
                var (userId, err) = await AuthHttpHelper.RequireManagerOrAdminAsync(req);
                if (err != null) return err;
                var body = await new StreamReader(req.Body).ReadToEndAsync();
                var dto = JsonSerializer.Deserialize<ReviewDailyTimesheetDto>(body, _json) ?? new ReviewDailyTimesheetDto();
                dto.ActingUserId = userId;
                var result = await _daily.ReviewAsync(dailyTimesheetId, dto);
                var resp = req.CreateResponse(HttpStatusCode.OK);
                await WriteJsonAsync(req, resp, result);
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

        [Function("TimesheetListAdmin")]
        public async Task<HttpResponseData> ListAdmin(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "timesheet/admin/all")] HttpRequestData req)
        {
            var (_, err) = await AuthHttpHelper.RequireAdminAsync(req);
            if (err != null) return err;
            var list = await _daily.GetForAdminAsync(null, null);
            var resp = req.CreateResponse(HttpStatusCode.OK);
            await WriteJsonAsync(req, resp, list);
            return resp;
        }

        [Function("TimesheetListManager")]
        public async Task<HttpResponseData> ListManager(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "timesheet/manager/{managerId:guid}")] HttpRequestData req,
            Guid managerId)
        {
            var (callerId, err) = await AuthHttpHelper.RequireAuthenticatedAsync(req);
            if (err != null) return err;
            if (callerId != managerId && !req.JwtHasAnyRole("Admin"))
            {
                var f = req.CreateResponse(HttpStatusCode.Forbidden);
                await f.WriteAsJsonAsync(new { message = "Forbidden." });
                return f;
            }
            var list = await _daily.GetForManagerAsync(managerId, null, null);
            var resp = req.CreateResponse(HttpStatusCode.OK);
            await WriteJsonAsync(req, resp, list);
            return resp;
        }

        [Function("TimesheetMyHistory")]
        public async Task<HttpResponseData> MyHistory(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "timesheet/history/{userId:guid}")] HttpRequestData req,
            Guid userId)
        {
            var (callerId, err) = await AuthHttpHelper.RequireAuthenticatedAsync(req);
            if (err != null) return err;
            if (callerId != userId && !req.JwtHasAnyRole("Admin", "Manager"))
            {
                var f = req.CreateResponse(HttpStatusCode.Forbidden);
                await f.WriteAsJsonAsync(new { message = "Forbidden." });
                return f;
            }
            var list = await _daily.GetMyHistoryAsync(userId);
            var resp = req.CreateResponse(HttpStatusCode.OK);
            await WriteJsonAsync(req, resp, list);
            return resp;
        }
    }
}
