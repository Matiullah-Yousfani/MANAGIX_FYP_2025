-- Run once before: DELETE FROM roles WHERE RoleName = 'QA'
-- Re-assigns users from duplicate "QA" role to canonical "Quality Assurance" role.

DECLARE @QaCanonical UNIQUEIDENTIFIER = (
    SELECT TOP 1 RoleId FROM roles WHERE RoleName = N'Quality Assurance'
);
DECLARE @QaDuplicate UNIQUEIDENTIFIER = (
    SELECT TOP 1 RoleId FROM roles WHERE RoleName = N'QA'
);

IF @QaCanonical IS NOT NULL AND @QaDuplicate IS NOT NULL
BEGIN
    UPDATE ur
    SET ur.RoleId = @QaCanonical
    FROM userRoles ur
    WHERE ur.RoleId = @QaDuplicate
      AND NOT EXISTS (
          SELECT 1 FROM userRoles x
          WHERE x.UserId = ur.UserId AND x.RoleId = @QaCanonical
      );

    DELETE FROM userRoles WHERE RoleId = @QaDuplicate;
    DELETE FROM roles WHERE RoleId = @QaDuplicate;
END
