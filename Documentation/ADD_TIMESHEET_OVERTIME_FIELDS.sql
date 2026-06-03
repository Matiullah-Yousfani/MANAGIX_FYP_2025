-- Run on MANAGIX SQL Server database (adjust schema/table names if needed).
-- Adds timesheet policy fields, task deadlines, and overtime requests.

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'userProfiles') AND name = 'StandardHoursPerDay')
    ALTER TABLE userProfiles ADD StandardHoursPerDay decimal(18,2) NOT NULL CONSTRAINT DF_userProfiles_StandardHoursPerDay DEFAULT 8;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'userProfiles') AND name = 'OvertimeGraceHours')
    ALTER TABLE userProfiles ADD OvertimeGraceHours decimal(18,2) NOT NULL CONSTRAINT DF_userProfiles_OvertimeGraceHours DEFAULT 2;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'userProfiles') AND name = 'ShiftStartTime')
    ALTER TABLE userProfiles ADD ShiftStartTime time NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'userProfiles') AND name = 'ShiftEndTime')
    ALTER TABLE userProfiles ADD ShiftEndTime time NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Tasks') AND name = 'Deadline')
    ALTER TABLE Tasks ADD Deadline datetime2 NULL;

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'OvertimeRequests')
BEGIN
    CREATE TABLE OvertimeRequests (
        OvertimeRequestId uniqueidentifier NOT NULL PRIMARY KEY,
        UserId uniqueidentifier NOT NULL,
        ProjectId uniqueidentifier NULL,
        TaskId uniqueidentifier NULL,
        WorkDate datetime2 NOT NULL,
        TotalHoursThatDay decimal(18,4) NOT NULL,
        EmployeeReason nvarchar(2000) NULL,
        Status nvarchar(32) NOT NULL,
        ManagerId uniqueidentifier NULL,
        ManagerAction nvarchar(32) NULL,
        CreatedAt datetime2 NOT NULL,
        ResolvedAt datetime2 NULL
    );
    CREATE INDEX IX_OvertimeRequest_User_WorkDate ON OvertimeRequests (UserId, WorkDate);
END
