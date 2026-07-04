using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace MANAGIX.Services
{
    public class WebRtcSignalDto
    {
        public Guid Id { get; set; }
        public Guid FromUserId { get; set; }
        public Guid? ToUserId { get; set; }
        public string Type { get; set; } = string.Empty;
        public string Payload { get; set; } = "{}";
        public DateTime CreatedAt { get; set; }
    }

    public class WebRtcPeerDto
    {
        public Guid UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public DateTime LastSeen { get; set; }
    }

    public class WebRtcSignalPostDto
    {
        public Guid FromUserId { get; set; }
        public Guid? ToUserId { get; set; }
        public string Type { get; set; } = string.Empty;
        public string Payload { get; set; } = "{}";
    }

    public interface IWebRtcSignalingService
    {
        Task PostSignalAsync(string roomId, WebRtcSignalPostDto signal);
        Task<List<WebRtcSignalDto>> GetSignalsAsync(string roomId, Guid userId, DateTime sinceUtc);
        Task<List<WebRtcPeerDto>> GetPeersAsync(string roomId);
    }
}
