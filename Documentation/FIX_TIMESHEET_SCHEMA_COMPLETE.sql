-- Run on your MANAGIX database (SSMS). Execute the FULL script (F5).
-- GO splits batches so new columns exist before INSERT/SELECT use them.

-- ========== Batch 1: Tables ==========
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'TimesheetPolicySettings')
BEGIN
    CREATE TABLE TimesheetPolicySettings (
        Id int IDENTITY(1,1) NOT NULL PRIMARY KEY,
        StandardHoursPerDay decimal(18,2) NOT NULL DEFAULT 8,
        OvertimeGraceHours decimal(18,2) NOT NULL DEFAULT 2,
        DailyMaxHours decimal(18,2) NOT NULL DEFAULT 12
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'DailyTimesheets')
BEGIN
    CREATE TABLE DailyTimesheets (
        DailyTimesheetId uniqueidentifier NOT NULL PRIMARY KEY,
        UserId uniqueidentifier NOT NULL,
        WorkDate datetime2 NOT NULL,
        TotalHours decimal(18,4) NOT NULL,
        Status nvarchar(32) NOT NULL,
        EmployeeNote nvarchar(max) NULL,
        OvertimeReason nvarchar(max) NULL,
        ManagerComment nvarchar(max) NULL,
        ReviewedBy uniqueidentifier NULL,
        SubmittedAt datetime2 NULL,
        ReviewedAt datetime2 NULL,
        CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    CREATE UNIQUE INDEX IX_DailyTimesheet_User_WorkDate ON DailyTimesheets (UserId, WorkDate);
END
GO

-- ========== Batch 2: Add MinimumSubmitHours column ==========
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'TimesheetPolicySettings')
   AND NOT EXISTS (
       SELECT 1 FROM sys.columns
       WHERE object_id = OBJECT_ID('TimesheetPolicySettings') AND name = 'MinimumSubmitHours'
   )
BEGIN
    ALTER TABLE TimesheetPolicySettings
    ADD MinimumSubmitHours decimal(18,2) NOT NULL CONSTRAINT DF_TimesheetPolicy_MinSubmit DEFAULT 0;
END
GO

-- ========== Batch 3: Seed policy (column must exist now) ==========
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'TimesheetPolicySettings')
   AND NOT EXISTS (SELECT 1 FROM TimesheetPolicySettings)
BEGIN
    INSERT INTO TimesheetPolicySettings (StandardHoursPerDay, OvertimeGraceHours, DailyMaxHours, MinimumSubmitHours)
    VALUES (8, 2, 12, 0);
END
GO

-- ========== Batch 4: EF migration history ==========
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = '__EFMigrationsHistory')
   AND NOT EXISTS (SELECT 1 FROM [__EFMigrationsHistory] WHERE MigrationId = N'20260604120000_AddMinimumSubmitHours')
BEGIN
    INSERT INTO [__EFMigrationsHistory] (MigrationId, ProductVersion)
    VALUES (N'20260604120000_AddMinimumSubmitHours', N'8.0.0');
END
GO

-- ========== Batch 5: Stale clock sessions ==========
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'TimeEntries')
BEGIN
    UPDATE TimeEntries
    SET EndedAt = DATEADD(day, 1, CAST(StartedAt AS date)),
        Hours = CAST(DATEDIFF(second, StartedAt, DATEADD(day, 1, CAST(StartedAt AS date))) AS decimal(18,4)) / 3600.0
    WHERE EndedAt IS NULL AND CAST(StartedAt AS date) < CAST(SYSUTCDATETIME() AS date);
END
GO

-- ========== Batch 6: Verify ==========
SELECT Id, StandardHoursPerDay, OvertimeGraceHours, DailyMaxHours, MinimumSubmitHours
FROM TimesheetPolicySettings;
GO
