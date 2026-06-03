using System;
using System.IO;

namespace MANAGIX.Utility
{
    public static class TaskUploadPathHelper
    {
        public static string GetWwwRootDirectory()
        {
            var env = Environment.GetEnvironmentVariable("TASK_UPLOAD_ROOT");
            if (!string.IsNullOrWhiteSpace(env))
            {
                var tasksDir = Path.Combine(env, "tasks");
                if (!Directory.Exists(tasksDir))
                    Directory.CreateDirectory(tasksDir);
                return env;
            }

            var candidates = new[]
            {
                Path.Combine(AppContext.BaseDirectory, "wwwroot"),
                Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"),
                Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "wwwroot")),
            };

            foreach (var root in candidates)
            {
                if (string.IsNullOrWhiteSpace(root)) continue;
                try
                {
                    var tasks = Path.Combine(root, "tasks");
                    if (!Directory.Exists(tasks))
                        Directory.CreateDirectory(tasks);
                    return root;
                }
                catch
                {
                    // try next candidate
                }
            }

            var fallback = Path.Combine(AppContext.BaseDirectory, "wwwroot");
            Directory.CreateDirectory(Path.Combine(fallback, "tasks"));
            return fallback;
        }

        public static string ToPhysicalPath(string? filePathUrl)
        {
            if (string.IsNullOrWhiteSpace(filePathUrl))
                return string.Empty;

            var relative = filePathUrl.TrimStart('/', '\\')
                .Replace('/', Path.DirectorySeparatorChar)
                .Replace('\\', Path.DirectorySeparatorChar);
            return Path.Combine(GetWwwRootDirectory(), relative);
        }

        public static string? DisplayFileName(string? storedFileName, string? filePathUrl)
        {
            if (!string.IsNullOrWhiteSpace(storedFileName))
                return storedFileName;
            if (string.IsNullOrWhiteSpace(filePathUrl))
                return null;
            return Path.GetFileName(filePathUrl.TrimStart('/'));
        }
    }
}
