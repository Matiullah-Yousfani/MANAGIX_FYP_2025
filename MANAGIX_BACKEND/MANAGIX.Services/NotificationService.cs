using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.DTO;
using MANAGIX.Models.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MANAGIX.Services
{
    // PHASE 4: Notification publisher implementation.
    // Ownership rule for mark-read: the actingUserId must match the row's UserId.
    public class NotificationService : INotificationService
    {
        private readonly IUnitOfWork _unitOfWork;

        public NotificationService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<NotificationDto> PublishAsync(Guid userId, NotificationCreateDto template)
        {
            var notif = new Notification
            {
                UserId = userId,
                Type = template.Type,
                Title = template.Title,
                Body = template.Body,
                Link = template.Link,
            };
            await _unitOfWork.Notifications.AddAsync(notif);
            await _unitOfWork.CompleteAsync();
            return ToDto(notif);
        }

        // Bulk fan-out — one CompleteAsync per call, regardless of how many users.
        public async Task PublishToManyAsync(IEnumerable<Guid> userIds, NotificationCreateDto template)
        {
            var rows = userIds
                .Where(id => id != Guid.Empty)
                .Distinct()
                .Select(uid => new Notification
                {
                    UserId = uid,
                    Type = template.Type,
                    Title = template.Title,
                    Body = template.Body,
                    Link = template.Link,
                })
                .ToList();

            if (rows.Count == 0) return;

            await _unitOfWork.Notifications.AddRangeAsync(rows);
            await _unitOfWork.CompleteAsync();
        }

        public async Task<List<NotificationDto>> GetForUserAsync(Guid userId, int limit = 25)
        {
            var rows = await _unitOfWork.Notifications.GetForUserAsync(userId, limit);
            return rows.Select(ToDto).ToList();
        }

        public async Task<int> GetUnreadCountAsync(Guid userId)
            => await _unitOfWork.Notifications.GetUnreadCountAsync(userId);

        public async Task<bool> MarkReadAsync(Guid notificationId, Guid actingUserId)
        {
            var row = await _unitOfWork.Notifications.GetByIdAsync(notificationId);
            if (row == null || row.UserId != actingUserId) return false;
            _unitOfWork.Notifications.MarkRead(row);
            await _unitOfWork.CompleteAsync();
            return true;
        }

        public async Task<int> MarkAllReadAsync(Guid userId)
        {
            var n = await _unitOfWork.Notifications.MarkAllReadAsync(userId);
            await _unitOfWork.CompleteAsync();
            return n;
        }

        private static NotificationDto ToDto(Notification n) => new()
        {
            NotificationId = n.NotificationId,
            UserId = n.UserId,
            Type = n.Type,
            Title = n.Title,
            Body = n.Body,
            Link = n.Link,
            IsRead = n.IsRead,
            CreatedAt = n.CreatedAt,
        };
    }
}
