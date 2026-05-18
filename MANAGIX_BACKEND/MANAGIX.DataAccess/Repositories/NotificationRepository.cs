using MANAGIX.DataAccess.Data;
using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MANAGIX.DataAccess.Repositories
{
    // PHASE 4: Notification persistence.
    public class NotificationRepository : INotificationRepository
    {
        private readonly ApplicationDbContext _context;
        public NotificationRepository(ApplicationDbContext context) => _context = context;

        public async Task AddAsync(Notification notification) =>
            await _context.Notifications.AddAsync(notification);

        public async Task AddRangeAsync(IEnumerable<Notification> notifications) =>
            await _context.Notifications.AddRangeAsync(notifications);

        public async Task<List<Notification>> GetForUserAsync(Guid userId, int limit = 25) =>
            await _context.Notifications
                .Where(n => n.UserId == userId)
                .OrderByDescending(n => n.CreatedAt)
                .Take(limit)
                .ToListAsync();

        public async Task<int> GetUnreadCountAsync(Guid userId) =>
            await _context.Notifications
                .CountAsync(n => n.UserId == userId && !n.IsRead);

        public async Task<Notification?> GetByIdAsync(Guid notificationId) =>
            await _context.Notifications.FirstOrDefaultAsync(n => n.NotificationId == notificationId);

        public void MarkRead(Notification notification)
        {
            notification.IsRead = true;
            _context.Notifications.Update(notification);
        }

        // Bulk update — avoids per-row round-trip when a user clicks "Mark all read".
        public async Task<int> MarkAllReadAsync(Guid userId)
        {
            var unread = await _context.Notifications
                .Where(n => n.UserId == userId && !n.IsRead)
                .ToListAsync();

            foreach (var n in unread) n.IsRead = true;
            return unread.Count;
        }
    }
}
