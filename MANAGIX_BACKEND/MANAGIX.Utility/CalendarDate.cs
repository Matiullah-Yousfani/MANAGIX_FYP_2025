using System;

namespace MANAGIX.Utility
{
    /// <summary>
    /// Compares DateTime values by calendar date only (year/month/day), avoiding UTC/local shifts from JSON date strings.
    /// </summary>
    public static class CalendarDate
    {
        public static bool IsBeforeUtcCalendarToday(DateTime value)
        {
            var today = DateTime.UtcNow;
            return CompareComponents(value, today) < 0;
        }

        /// <summary>True if <paramref name="value"/> is strictly after <paramref name="limit"/> on the calendar.</summary>
        public static bool IsAfterCalendarDate(DateTime value, DateTime limit)
        {
            return CompareComponents(value, limit) > 0;
        }

        private static int CompareComponents(DateTime a, DateTime b)
        {
            var ay = a.Year;
            var am = a.Month;
            var ad = a.Day;
            var by = b.Year;
            var bm = b.Month;
            var bd = b.Day;
            if (ay != by) return ay.CompareTo(by);
            if (am != bm) return am.CompareTo(bm);
            return ad.CompareTo(bd);
        }
    }
}
