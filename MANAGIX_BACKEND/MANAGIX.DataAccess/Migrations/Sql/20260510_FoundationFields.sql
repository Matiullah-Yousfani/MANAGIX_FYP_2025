-- =====================================================================
-- PHASE 0 — FoundationFields migration (idempotent, run once)
-- =====================================================================
-- Adds:
--   * ProjectModels.Methodology       (dashboard variant selector)
--   * TeamEmployees.ProjectId/IsActive/CreatedAt + filtered unique index
--   * Tasks.EstimatedHours/StoryPoints/Priority/RequiredSkillsJson
--   * UserProfiles.WeeklyCapacityHours
--   * Tables: Meetings, MeetingParticipants, Notifications, MonitoringSnapshots
--
-- HOW TO APPLY:
--   1. Open SSMS / Azure Data Studio, connect to the MANAGIX database.
--   2. Open this file and click Execute. Re-runnable — guards prevent dupes.
--
-- WHY SQL (not an EF migration .cs file):
--   The snapshot file is auto-generated and 500+ lines. Hand-editing it
--   risks drift; running this script once and then regenerating the
--   snapshot via `dotnet ef migrations add` (when needed) is cleaner for
--   the FYP demo timeline.
-- =====================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRANSACTION;

-- ---------------------------------------------------------------------
-- 1. ProjectModels.Methodology — backfilled from ModelName
-- ---------------------------------------------------------------------
IF COL_LENGTH('ProjectModels', 'Methodology') IS NULL
BEGIN
    ALTER TABLE ProjectModels ADD Methodology NVARCHAR(32) NULL;
END
GO

UPDATE ProjectModels
SET Methodology = CASE
    WHEN ModelName LIKE '%Scrum%'      THEN 'Scrum'
    WHEN ModelName LIKE '%Agile%'      THEN 'Agile'
    WHEN ModelName LIKE '%Kanban%'     THEN 'Kanban'
    WHEN ModelName LIKE '%Waterfall%'  THEN 'Waterfall'
    WHEN ModelName LIKE '%Hybrid%'     THEN 'Hybrid'
    WHEN ModelName LIKE '%Lean%'       THEN 'Agile'
    WHEN ModelName LIKE '%XP%'         THEN 'Agile'
    ELSE Methodology
END
WHERE Methodology IS NULL;
GO

-- ---------------------------------------------------------------------
-- 2. TeamEmployees: ProjectId, IsActive, CreatedAt + filtered unique
-- ---------------------------------------------------------------------
IF COL_LENGTH('TeamEmployees', 'ProjectId') IS NULL
    ALTER TABLE TeamEmployees ADD ProjectId UNIQUEIDENTIFIER NULL;
GO

IF COL_LENGTH('TeamEmployees', 'IsActive') IS NULL
    ALTER TABLE TeamEmployees ADD IsActive BIT NOT NULL CONSTRAINT DF_TeamEmployees_IsActive DEFAULT 1;
GO

IF COL_LENGTH('TeamEmployees', 'CreatedAt') IS NULL
    ALTER TABLE TeamEmployees ADD CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_TeamEmployees_CreatedAt DEFAULT SYSUTCDATETIME();
GO

-- Backfill ProjectId from existing ProjectTeam → TeamEmployee join.
UPDATE te
SET te.ProjectId = pt.ProjectId
FROM TeamEmployees te
JOIN ProjectTeams pt ON pt.TeamId = te.TeamId
WHERE te.ProjectId IS NULL;
GO

-- Filtered unique index = at most one active assignment per employee.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_TeamEmployee_Employee_ActiveProject')
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX IX_TeamEmployee_Employee_ActiveProject
        ON TeamEmployees (EmployeeId)
        WHERE IsActive = 1;
END
GO

-- ---------------------------------------------------------------------
-- 3. Tasks: workload + skill-targeting fields
-- ---------------------------------------------------------------------
IF COL_LENGTH('Tasks', 'EstimatedHours') IS NULL
    ALTER TABLE Tasks ADD EstimatedHours DECIMAL(6,2) NULL;
GO

IF COL_LENGTH('Tasks', 'StoryPoints') IS NULL
    ALTER TABLE Tasks ADD StoryPoints INT NULL;
GO

IF COL_LENGTH('Tasks', 'Priority') IS NULL
    ALTER TABLE Tasks ADD Priority NVARCHAR(16) NULL;
GO

IF COL_LENGTH('Tasks', 'RequiredSkillsJson') IS NULL
    ALTER TABLE Tasks ADD RequiredSkillsJson NVARCHAR(MAX) NULL;
GO

-- ---------------------------------------------------------------------
-- 4. UserProfiles: WeeklyCapacityHours (default 40)
-- ---------------------------------------------------------------------
IF COL_LENGTH('userProfiles', 'WeeklyCapacityHours') IS NULL
BEGIN
    ALTER TABLE userProfiles
        ADD WeeklyCapacityHours DECIMAL(5,2) NOT NULL
        CONSTRAINT DF_userProfiles_WeeklyCapacityHours DEFAULT 40;
END
GO

-- ---------------------------------------------------------------------
-- 5. Meetings table
-- ---------------------------------------------------------------------
IF OBJECT_ID('Meetings', 'U') IS NULL
BEGIN
    CREATE TABLE Meetings (
        MeetingId        UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        ProjectId        UNIQUEIDENTIFIER NULL,
        Title            NVARCHAR(MAX) NOT NULL,
        ScheduledAt      DATETIME2 NOT NULL,
        DurationMinutes  INT NOT NULL CONSTRAINT DF_Meetings_DurationMinutes DEFAULT 30,
        JitsiRoomName    NVARCHAR(128) NULL,
        CreatedBy        UNIQUEIDENTIFIER NOT NULL,
        Status           NVARCHAR(16) NOT NULL CONSTRAINT DF_Meetings_Status DEFAULT 'Scheduled',
        TranscriptText   NVARCHAR(MAX) NULL,
        CreatedAt        DATETIME2 NOT NULL CONSTRAINT DF_Meetings_CreatedAt DEFAULT SYSUTCDATETIME()
    );
END
GO

-- ---------------------------------------------------------------------
-- 6. MeetingParticipants table
-- ---------------------------------------------------------------------
IF OBJECT_ID('MeetingParticipants', 'U') IS NULL
BEGIN
    CREATE TABLE MeetingParticipants (
        Id          UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        MeetingId   UNIQUEIDENTIFIER NOT NULL,
        UserId      UNIQUEIDENTIFIER NOT NULL,
        Role        NVARCHAR(16) NOT NULL CONSTRAINT DF_MeetingParticipants_Role DEFAULT 'Attendee',
        AddedAt     DATETIME2 NOT NULL CONSTRAINT DF_MeetingParticipants_AddedAt DEFAULT SYSUTCDATETIME()
    );

    CREATE UNIQUE INDEX IX_MeetingParticipants_Meeting_User
        ON MeetingParticipants (MeetingId, UserId);
END
GO

-- ---------------------------------------------------------------------
-- 7. Notifications table
-- ---------------------------------------------------------------------
IF OBJECT_ID('Notifications', 'U') IS NULL
BEGIN
    CREATE TABLE Notifications (
        NotificationId  UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        UserId          UNIQUEIDENTIFIER NOT NULL,
        Type            NVARCHAR(40) NOT NULL,
        Title           NVARCHAR(MAX) NOT NULL,
        Body            NVARCHAR(MAX) NULL,
        Link            NVARCHAR(256) NULL,
        IsRead          BIT NOT NULL CONSTRAINT DF_Notifications_IsRead DEFAULT 0,
        CreatedAt       DATETIME2 NOT NULL CONSTRAINT DF_Notifications_CreatedAt DEFAULT SYSUTCDATETIME()
    );

    CREATE INDEX IX_Notification_User_Read_Time
        ON Notifications (UserId, IsRead, CreatedAt DESC);
END
GO

-- ---------------------------------------------------------------------
-- 8. MonitoringSnapshots table
-- ---------------------------------------------------------------------
IF OBJECT_ID('MonitoringSnapshots', 'U') IS NULL
BEGIN
    CREATE TABLE MonitoringSnapshots (
        Id                UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        ProjectId         UNIQUEIDENTIFIER NOT NULL,
        CapturedAt        DATETIME2 NOT NULL CONSTRAINT DF_MonitoringSnapshots_CapturedAt DEFAULT SYSUTCDATETIME(),
        OnTimeRatio       FLOAT NOT NULL CONSTRAINT DF_MonitoringSnapshots_OnTimeRatio DEFAULT 0,
        AvgWorkloadHours  FLOAT NOT NULL CONSTRAINT DF_MonitoringSnapshots_AvgWorkloadHours DEFAULT 0,
        OverloadedCount   INT NOT NULL CONSTRAINT DF_MonitoringSnapshots_OverloadedCount DEFAULT 0,
        BlockedTaskCount  INT NOT NULL CONSTRAINT DF_MonitoringSnapshots_BlockedTaskCount DEFAULT 0,
        BurndownJson      NVARCHAR(MAX) NULL
    );

    CREATE INDEX IX_MonitoringSnapshot_Project_Time
        ON MonitoringSnapshots (ProjectId, CapturedAt DESC);
END
GO

COMMIT TRANSACTION;
PRINT 'PHASE 0 — FoundationFields migration applied successfully.';
GO
