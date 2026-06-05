using System;

namespace MANAGIX.Utility
{
    /// <summary>
    /// Canonical task lifecycle: Todo → InProgress → Done → Approved (QA).
    /// </summary>
    public static class TaskWorkflow
    {
        public const int MaxActiveTasksPerEmployee = 5;

        public const string Todo = "Todo";
        public const string InProgress = "InProgress";
        public const string Done = "Done";
        public const string Approved = "Approved";

        public static string Normalize(string? status)
        {
            if (string.IsNullOrWhiteSpace(status))
                return Todo;

            var s = status.Trim();

            if (s.Equals("Pending", StringComparison.OrdinalIgnoreCase))
                return Todo;

            // Legacy: submission stored tasks as "Submitted" — treat as QA-ready same as Done
            if (s.Equals("Submitted", StringComparison.OrdinalIgnoreCase))
                return Done;

            if (s.Equals("In Progress", StringComparison.OrdinalIgnoreCase) ||
                s.Equals("Inprogress", StringComparison.OrdinalIgnoreCase))
                return InProgress;

            if (s.Equals(Todo, StringComparison.OrdinalIgnoreCase))
                return Todo;

            if (s.Equals(InProgress, StringComparison.OrdinalIgnoreCase))
                return InProgress;

            if (s.Equals(Done, StringComparison.OrdinalIgnoreCase))
                return Done;

            if (s.Equals(Approved, StringComparison.OrdinalIgnoreCase))
                return Approved;

            return s;
        }

        public static bool IsActiveForWorkload(string? status)
        {
            var n = Normalize(status);
            return n == Todo || n == InProgress;
        }

        public static bool IsQaReviewable(string? status)
        {
            var n = Normalize(status);
            return n == Done;
        }

        /// <summary>
        /// Validates status changes from UpdateTask (not QA approve/reject endpoints).
        /// </summary>
        public static bool TryValidateManualStatusChange(
            string? fromRaw,
            string? toRaw,
            bool callerIsQa,
            out string normalizedTo,
            out string? error)
        {
            error = null;
            normalizedTo = Normalize(toRaw);
            var from = Normalize(fromRaw);

            if (from == normalizedTo)
                return true;

            if (normalizedTo == Approved)
            {
                if (!callerIsQa)
                {
                    error = "Only QA can mark a task Approved; use the QA approve endpoint.";
                    return false;
                }

                if (from != Done)
                {
                    error = "A task must be Done before it can be Approved.";
                    return false;
                }

                return true;
            }

            if (from == Approved)
            {
                error = "Approved tasks cannot change status.";
                return false;
            }

            // Linear progression: no skips, no backwards (reject flow uses dedicated endpoint)
            if (from == Todo && normalizedTo == InProgress)
                return true;

            if (from == InProgress && normalizedTo == Done)
                return true;

            if (from == Todo && normalizedTo == Done)
            {
                error = "Invalid transition: cannot skip from Todo to Done.";
                return false;
            }

            if (from == InProgress && normalizedTo == Todo)
                return true;

            if (from == Done && normalizedTo == InProgress)
            {
                error = "Use the QA reject endpoint to return a task to InProgress.";
                return false;
            }

            if (from == Done && normalizedTo != Approved)
            {
                error = "Done tasks can only move to Approved via QA.";
                return false;
            }

            error = $"Invalid status transition from {from} to {normalizedTo}.";
            return false;
        }
    }
}
