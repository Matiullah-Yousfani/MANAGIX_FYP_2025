using MANAGIX.Models.DTO;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace MANAGIX.Services
{
    // PHASE 4: Centralised notification publisher — every service calls this rather than
    // poking the repository directly. Keeps cross-cutting fan-out logic (e.g. templating,
    // de-duplication) in one place.
    public interface INotificationService
    {
        Task<NotificationDto> PublishAsync(Guid userId, NotificationCreateDto template);
        Task PublishToManyAsync(IEnumerable<Guid> userIds, NotificationCreateDto template);

        Task<List<NotificationDto>> GetForUserAsync(Guid userId, int limit = 25);
        Task<int> GetUnreadCountAsync(Guid userId);
        Task<bool> MarkReadAsync(Guid notificationId, Guid actingUserId);
        Task<int> MarkAllReadAsync(Guid userId);
    }
}
