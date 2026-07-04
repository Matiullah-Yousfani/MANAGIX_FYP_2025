using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MANAGIX.Services
{
    /// <summary>In-memory WebRTC signaling for mesh peer connections (dev / single-instance).</summary>
    public class WebRtcSignalingService : IWebRtcSignalingService
    {
        private static readonly ConcurrentDictionary<string, ConcurrentBag<StoredSignal>> _rooms = new(StringComparer.OrdinalIgnoreCase);
        private static readonly TimeSpan PeerTtl = TimeSpan.FromSeconds(45);

        private sealed class StoredSignal
        {
            public Guid Id { get; init; }
            public Guid FromUserId { get; init; }
            public Guid? ToUserId { get; init; }
            public string Type { get; init; } = string.Empty;
            public string Payload { get; init; } = "{}";
            public DateTime CreatedAt { get; init; }
        }

        public Task PostSignalAsync(string roomId, WebRtcSignalPostDto signal)
        {
            if (string.IsNullOrWhiteSpace(roomId))
                return Task.CompletedTask;

            var bag = _rooms.GetOrAdd(roomId.Trim(), _ => new ConcurrentBag<StoredSignal>());
            bag.Add(new StoredSignal
            {
                Id = Guid.NewGuid(),
                FromUserId = signal.FromUserId,
                ToUserId = signal.ToUserId,
                Type = signal.Type.Trim(),
                Payload = signal.Payload ?? "{}",
                CreatedAt = DateTime.UtcNow,
            });

            // Keep memory bounded — drop room after heavy use (signals are short-lived)
            if (bag.Count > 800)
                _rooms.TryRemove(roomId.Trim(), out _);

            return Task.CompletedTask;
        }

        public Task<List<WebRtcSignalDto>> GetSignalsAsync(string roomId, Guid userId, DateTime sinceUtc)
        {
            if (string.IsNullOrWhiteSpace(roomId) || !_rooms.TryGetValue(roomId.Trim(), out var bag))
                return Task.FromResult(new List<WebRtcSignalDto>());

            var list = bag
                .Where(s =>
                    s.CreatedAt > sinceUtc &&
                    s.FromUserId != userId &&
                    (s.ToUserId == null || s.ToUserId == userId))
                .OrderBy(s => s.CreatedAt)
                .Select(s => new WebRtcSignalDto
                {
                    Id = s.Id,
                    FromUserId = s.FromUserId,
                    ToUserId = s.ToUserId,
                    Type = s.Type,
                    Payload = s.Payload,
                    CreatedAt = s.CreatedAt,
                })
                .ToList();

            return Task.FromResult(list);
        }

        public Task<List<WebRtcPeerDto>> GetPeersAsync(string roomId)
        {
            if (string.IsNullOrWhiteSpace(roomId) || !_rooms.TryGetValue(roomId.Trim(), out var bag))
                return Task.FromResult(new List<WebRtcPeerDto>());

            var cutoff = DateTime.UtcNow - PeerTtl;
            var peers = bag
                .Where(s => s.Type == "join" && s.CreatedAt >= cutoff)
                .GroupBy(s => s.FromUserId)
                .Select(g =>
                {
                    var latest = g.OrderByDescending(x => x.CreatedAt).First();
                    string name = "Participant";
                    try
                    {
                        var doc = System.Text.Json.JsonDocument.Parse(latest.Payload);
                        if (doc.RootElement.TryGetProperty("userName", out var n))
                            name = n.GetString() ?? name;
                    }
                    catch { /* ignore */ }

                    return new WebRtcPeerDto
                    {
                        UserId = g.Key,
                        UserName = name,
                        LastSeen = latest.CreatedAt,
                    };
                })
                .Where(p => !string.IsNullOrWhiteSpace(p.UserName))
                .OrderBy(p => p.UserName)
                .ToList();

            return Task.FromResult(peers);
        }
    }
}
