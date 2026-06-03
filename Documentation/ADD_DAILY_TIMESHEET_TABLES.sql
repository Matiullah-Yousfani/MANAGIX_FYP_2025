-- Run on your MANAGIX database (SSMS / Azure Data Studio).
-- Safe to re-run: skips objects that already exist.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'TimesheetPolicySettings')
BEGIN
    CREATE TABLE TimesheetPolicySettings (
        Id int IDENTITY(1,1) NOT NULL PRIMARY KEY,
        StandardHoursPerDay decimal(18,2) NOT NULL DEFAULT 8,
        OvertimeGraceHours decimal(18,2) NOT NULL DEFAULT 2,
        DailyMaxHours decimal(18,2) NOT NULL DEFAULT 12
    );
END

IF NOT EXISTS (SELECT 1 FROM TimesheetPolicySettings)
BEGIN
    -- Do not specify Id when column is IDENTITY (matches EF migration).
    INSERT INTO TimesheetPolicySettings (StandardHoursPerDay, OvertimeGraceHours, DailyMaxHours)
    VALUES (8, 2, 12);
END

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

-- Close orphaned open time entries (fixes "Already clocked in" when UI shows 0h)
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'TimeEntries')
BEGIN
    UPDATE TimeEntries
    SET EndedAt = DATEADD(day, 1, CAST(StartedAt AS date)),
        Hours = CAST(DATEDIFF(second, StartedAt, DATEADD(day, 1, CAST(StartedAt AS date))) AS decimal(18,4)) / 3600.0
    WHERE EndedAt IS NULL AND CAST(StartedAt AS date) < CAST(SYSUTCDATETIME() AS date);
END
