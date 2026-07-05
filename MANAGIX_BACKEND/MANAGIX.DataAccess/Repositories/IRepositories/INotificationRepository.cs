using MANAGIX.Models.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace MANAGIX.DataAccess.Repositories.IRepositories
{
    // PHASE 4: Notification reads/writes — feeds the bell-icon panel.
    public interface INotificationRepository
    {
        Task AddAsync(Notification notification);
        Task AddRangeAsync(IEnumerable<Notification> notifications);

        // Latest first, paged by `limit`. Used by the bell dropdown.
        Task<List<Notification>> GetForUserAsync(Guid userId, int limit = 25);

        Task<int> GetUnreadCountAsync(Guid userId);

        Task<Notification?> GetByIdAsync(Guid notificationId);

        // Marks one as read; service layer enforces ownership before calling.
        void MarkRead(Notification notification);

        // Bulk: marks all unread for a user as read in a single update.
        Task<int> MarkAllReadAsync(Guid userId);
        Task<List<Notification>> GetRecentOrgAsync(int limit = 30);
    }
}
