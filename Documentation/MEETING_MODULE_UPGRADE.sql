-- MANAGIX meeting module — full schema (idempotent, safe to re-run)
-- Run in SSMS against FYP_MANAGIX_2026 (or your MANAGIX database).

SET NOCOUNT ON;

IF OBJECT_ID('Meetings', 'U') IS NULL
BEGIN
    CREATE TABLE Meetings (
        MeetingId UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        ProjectId UNIQUEIDENTIFIER NULL,
        Title NVARCHAR(MAX) NOT NULL,
        Description NVARCHAR(MAX) NULL,
        ScheduledAt DATETIME2 NOT NULL,
        DurationMinutes INT NOT NULL CONSTRAINT DF_Meetings_Duration DEFAULT 30,
        MeetingLink NVARCHAR(512) NULL,
        JitsiRoomName NVARCHAR(128) NULL,
        CreatedBy UNIQUEIDENTIFIER NOT NULL,
        Status NVARCHAR(16) NOT NULL CONSTRAINT DF_Meetings_Status DEFAULT 'Scheduled',
        TranscriptText NVARCHAR(MAX) NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Meetings_CreatedAt DEFAULT SYSUTCDATETIME()
    );
END
GO

IF COL_LENGTH('Meetings', 'MeetingLink') IS NULL
    ALTER TABLE Meetings ADD MeetingLink NVARCHAR(512) NULL;
GO

IF COL_LENGTH('Meetings', 'Description') IS NULL
    ALTER TABLE Meetings ADD Description NVARCHAR(MAX) NULL;
GO

IF COL_LENGTH('Meetings', 'JitsiRoomName') IS NULL
    ALTER TABLE Meetings ADD JitsiRoomName NVARCHAR(128) NULL;
GO

IF COL_LENGTH('Meetings', 'SprintNumber') IS NULL
    ALTER TABLE Meetings ADD SprintNumber INT NOT NULL CONSTRAINT DF_Meetings_SprintNumber DEFAULT 1;
GO

IF OBJECT_ID('MeetingParticipants', 'U') IS NULL
BEGIN
    CREATE TABLE MeetingParticipants (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        MeetingId UNIQUEIDENTIFIER NOT NULL,
        UserId UNIQUEIDENTIFIER NOT NULL,
        Role NVARCHAR(16) NOT NULL,
        AddedAt DATETIME2 NOT NULL CONSTRAINT DF_MeetingParticipants_AddedAt DEFAULT SYSUTCDATETIME()
    );
    CREATE UNIQUE INDEX IX_MeetingParticipants_MeetingId_UserId
        ON MeetingParticipants (MeetingId, UserId);
END
GO

IF COL_LENGTH('MeetingParticipants', 'AddedAt') IS NULL
    ALTER TABLE MeetingParticipants ADD AddedAt DATETIME2 NOT NULL
        CONSTRAINT DF_MeetingParticipants_AddedAt_Alt DEFAULT SYSUTCDATETIME();
GO

IF OBJECT_ID('Notifications', 'U') IS NULL
BEGIN
    CREATE TABLE Notifications (
        NotificationId UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        UserId UNIQUEIDENTIFIER NOT NULL,
        Type NVARCHAR(40) NOT NULL,
        Title NVARCHAR(MAX) NOT NULL,
        Body NVARCHAR(MAX) NULL,
        Link NVARCHAR(256) NULL,
        IsRead BIT NOT NULL CONSTRAINT DF_Notifications_IsRead DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Notifications_CreatedAt DEFAULT SYSUTCDATETIME()
    );
    CREATE INDEX IX_Notification_User_Read_Time
        ON Notifications (UserId, IsRead, CreatedAt);
END
GO

IF OBJECT_ID('MeetingParticipantTranscripts', 'U') IS NULL
BEGIN
    CREATE TABLE MeetingParticipantTranscripts (
        Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        MeetingId UNIQUEIDENTIFIER NOT NULL,
        UserId UNIQUEIDENTIFIER NOT NULL,
        TranscriptText NVARCHAR(MAX) NOT NULL,
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    );
    CREATE UNIQUE INDEX IX_MeetingParticipantTranscripts_Meeting_User
        ON MeetingParticipantTranscripts (MeetingId, UserId);
END
GO

IF COL_LENGTH('Meetings', 'SummaryText') IS NULL
    ALTER TABLE Meetings ADD SummaryText NVARCHAR(MAX) NULL;
GO

IF COL_LENGTH('Meetings', 'MeetingNotesText') IS NULL
    ALTER TABLE Meetings ADD MeetingNotesText NVARCHAR(MAX) NULL;
GO

IF COL_LENGTH('Meetings', 'BacklogJson') IS NULL
    ALTER TABLE Meetings ADD BacklogJson NVARCHAR(MAX) NULL;
GO

IF COL_LENGTH('Meetings', 'JoinCode') IS NULL
    ALTER TABLE Meetings ADD JoinCode NVARCHAR(8) NULL;
GO

-- Backfill meetings created before join codes (run once after adding column)
UPDATE Meetings
SET JoinCode = UPPER(SUBSTRING(REPLACE(CONVERT(varchar(36), NEWID()), '-', ''), 1, 6))
WHERE JoinCode IS NULL OR LTRIM(RTRIM(JoinCode)) = '';
GO

UPDATE Meetings
SET MeetingLink = MeetingLink + '&code=' + JoinCode
WHERE MeetingLink IS NOT NULL
  AND MeetingLink NOT LIKE '%code=%'
  AND JoinCode IS NOT NULL;
GO

PRINT 'Meeting module schema OK.';
GO
