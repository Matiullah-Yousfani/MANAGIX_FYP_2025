-- Run this if you already got error 544 (identity insert) or API says tables missing.
-- Seeds the default org policy row without specifying Id.

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'TimesheetPolicySettings')
BEGIN
    RAISERROR('Table TimesheetPolicySettings does not exist. Run ADD_DAILY_TIMESHEET_TABLES.sql or dotnet ef database update first.', 16, 1);
    RETURN;
END

IF NOT EXISTS (SELECT 1 FROM TimesheetPolicySettings)
BEGIN
    INSERT INTO TimesheetPolicySettings (StandardHoursPerDay, OvertimeGraceHours, DailyMaxHours)
    VALUES (8, 2, 12);
    PRINT 'Inserted default timesheet policy (8h shift, 2h grace, 12h max).';
END
ELSE
BEGIN
    PRINT 'Timesheet policy row already exists — no change.';
END

SELECT * FROM TimesheetPolicySettings;
