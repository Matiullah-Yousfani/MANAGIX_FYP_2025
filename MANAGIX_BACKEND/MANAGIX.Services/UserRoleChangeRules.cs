using MANAGIX.DataAccess.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;

namespace MANAGIX.Services
{
    /// <summary>
    /// Shared guards for role changes, admin user deletion, and similar mutations.
    /// </summary>
    public static class UserRoleChangeRules
    {
        private enum BlockReason
        {
            None,
            Tasks,
            ActiveProjects,
            TeamMembership
        }

        private static async Task<BlockReason> GetBlockReasonAsync(ApplicationDbContext db, Guid userId)
        {
            if (await db.Tasks.AnyAsync(t => t.AssignedEmployeeId == userId))
                return BlockReason.Tasks;

            if (await db.Projects.AnyAsync(p => p.CreatedBy == userId && !p.IsClosed))
                return BlockReason.ActiveProjects;

            if (await db.TeamEmployees.AnyAsync(te => te.EmployeeId == userId))
                return BlockReason.TeamMembership;

            return BlockReason.None;
        }

        public static async Task AssertUserMayReassignRoleAsync(ApplicationDbContext db, Guid userId)
        {
            switch (await GetBlockReasonAsync(db, userId))
            {
                case BlockReason.Tasks:
                    throw new InvalidOperationException("Role change blocked: user has task assignments.");
                case BlockReason.ActiveProjects:
                    throw new InvalidOperationException("Role change blocked: user is managing active projects.");
                case BlockReason.TeamMembership:
                    throw new InvalidOperationException("Role change blocked: user is assigned to a team.");
                default:
                    return;
            }
        }

        /// <summary>Returns null when delete is allowed; otherwise a message for the client.</summary>
        public static async Task<string?> TryGetDeleteBlockReasonAsync(ApplicationDbContext db, Guid userId)
        {
            switch (await GetBlockReasonAsync(db, userId))
            {
                case BlockReason.Tasks:
                    return "Cannot delete user: employee has task assignments.";
                case BlockReason.ActiveProjects:
                    return "Cannot delete user: manager has active projects.";
                case BlockReason.TeamMembership:
                    return "Cannot delete user: user is assigned to a team.";
                default:
                    return null;
            }
        }
    }
}
