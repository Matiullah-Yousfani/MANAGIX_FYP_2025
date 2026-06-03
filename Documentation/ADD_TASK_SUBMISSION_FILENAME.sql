-- Run once on MANAGIX database if task submission file names are missing in the UI.
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.TaskSubmissions') AND name = N'FileName'
)
BEGIN
    ALTER TABLE dbo.TaskSubmissions ADD FileName NVARCHAR(512) NULL;
END
GO
