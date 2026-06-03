-- Adds MeetingLink + Description to Meetings (idempotent).
SET NOCOUNT ON;

IF COL_LENGTH('Meetings', 'MeetingLink') IS NULL
BEGIN
    ALTER TABLE Meetings ADD MeetingLink NVARCHAR(512) NULL;
END
GO

IF COL_LENGTH('Meetings', 'Description') IS NULL
BEGIN
    ALTER TABLE Meetings ADD Description NVARCHAR(MAX) NULL;
END
GO
