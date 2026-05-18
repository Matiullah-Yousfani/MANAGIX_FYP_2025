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
    // PHASE 4: Notification endpoints used by the bell-icon panel.
    //
    // Auth note: authentication in this codebase is currently localStorage-based on the FE side and
    // unauth'd on the FE-Function boundary. We accept userId as a query parameter to stay consistent
    // with the existing AdminPortal / Profile patterns. A future security pass should swap this for
    // a JWT-validated claim — out of scope for this task.
    public class NotificationFunction
    {
        private readonly INotificationService _notif;
        private static readonly JsonSerializerOptions _json = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true,
        };

        public NotificationFunction(INotificationService notif) => _notif = notif;

        // GET /notifications?userId={uuid}&limit=25
        [Function("ListNotifications")]
        public async Task<HttpResponseData> List(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "notifications")] HttpRequestData req)
        {
            var userId = ParseGuidQuery(req, "userId");
            if (userId == null)
            {
                var bad = req.CreateResponse(HttpStatusCode.BadRequest);
                await bad.WriteAsJsonAsync(new { message = "userId query parameter is required" });
                return bad;
            }
            var limit = ParseIntQuery(req, "limit") ?? 25;
            var rows = await _notif.GetForUserAsync(userId.Value, limit);

            var resp = req.CreateResponse(HttpStatusCode.OK);
            resp.Headers.Add("Content-Type", "application/json");
            await resp.WriteStringAsync(JsonSerializer.Serialize(rows, _json));
            return resp;
        }

        // GET /notifications/unread-count?userId={uuid}
        [Function("UnreadNotificationsCount")]
        public async Task<HttpResponseData> UnreadCount(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "notifications/unread-count")] HttpRequestData req)
        {
            var userId = ParseGuidQuery(req, "userId");
            if (userId == null)
            {
                var bad = req.CreateResponse(HttpStatusCode.BadRequest);
                await bad.WriteAsJsonAsync(new { message = "userId query parameter is required" });
                return bad;
            }
            var count = await _notif.GetUnreadCountAsync(userId.Value);
            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(new { unread = count });
            return resp;
        }

        // POST /notifications/{notificationId}/read   body: { userId }
        [Function("MarkNotificationRead")]
        public async Task<HttpResponseData> MarkRead(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "notifications/{notificationId:guid}/read")] HttpRequestData req,
            Guid notificationId)
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            Guid actingUserId;
            try
            {
                using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(body) ? "{}" : body);
                actingUserId = doc.RootElement.TryGetProperty("userId", out var u)
                    && Guid.TryParse(u.GetString(), out var p) ? p : Guid.Empty;
            }
            catch { actingUserId = Guid.Empty; }

            if (actingUserId == Guid.Empty)
            {
                var bad = req.CreateResponse(HttpStatusCode.BadRequest);
                await bad.WriteAsJsonAsync(new { message = "userId required in body" });
                return bad;
            }

            var ok = await _notif.MarkReadAsync(notificationId, actingUserId);
            var status = ok ? HttpStatusCode.OK : HttpStatusCode.Forbidden;
            var resp = req.CreateResponse(status);
            await resp.WriteAsJsonAsync(new { ok });
            return resp;
        }

        // POST /notifications/read-all   body: { userId }
        [Function("MarkAllNotificationsRead")]
        public async Task<HttpResponseData> MarkAllRead(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "notifications/read-all")] HttpRequestData req)
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            Guid actingUserId;
            try
            {
                using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(body) ? "{}" : body);
                actingUserId = doc.RootElement.TryGetProperty("userId", out var u)
                    && Guid.TryParse(u.GetString(), out var p) ? p : Guid.Empty;
            }
            catch { actingUserId = Guid.Empty; }

            if (actingUserId == Guid.Empty)
            {
                var bad = req.CreateResponse(HttpStatusCode.BadRequest);
                await bad.WriteAsJsonAsync(new { message = "userId required in body" });
                return bad;
            }

            var n = await _notif.MarkAllReadAsync(actingUserId);
            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(new { markedRead = n });
            return resp;
        }

        // ── helpers ──
        private static Guid? ParseGuidQuery(HttpRequestData req, string key)
        {
            var raw = req.Url.Query?.TrimStart('?') ?? string.Empty;
            foreach (var part in raw.Split('&', StringSplitOptions.RemoveEmptyEntries))
            {
                var eq = part.IndexOf('=');
                if (eq <= 0) continue;
                var k = Uri.UnescapeDataString(part.Substring(0, eq));
                var v = Uri.UnescapeDataString(part.Substring(eq + 1));
                if (string.Equals(k, key, StringComparison.OrdinalIgnoreCase) && Guid.TryParse(v, out var g))
                    return g;
            }
            return null;
        }

        private static int? ParseIntQuery(HttpRequestData req, string key)
        {
            var raw = req.Url.Query?.TrimStart('?') ?? string.Empty;
            foreach (var part in raw.Split('&', StringSplitOptions.RemoveEmptyEntries))
            {
                var eq = part.IndexOf('=');
                if (eq <= 0) continue;
                var k = Uri.UnescapeDataString(part.Substring(0, eq));
                var v = Uri.UnescapeDataString(part.Substring(eq + 1));
                if (string.Equals(k, key, StringComparison.OrdinalIgnoreCase) && int.TryParse(v, out var n))
                    return n;
            }
            return null;
        }
    }
}
