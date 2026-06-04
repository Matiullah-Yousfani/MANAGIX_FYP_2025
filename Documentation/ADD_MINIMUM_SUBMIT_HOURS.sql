-- Add admin-configurable minimum hours before daily timesheet submit.

IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'TimesheetPolicySettings')
   AND NOT EXISTS (
       SELECT 1 FROM sys.columns
       WHERE object_id = OBJECT_ID('TimesheetPolicySettings') AND name = 'MinimumSubmitHours'
   )
BEGIN
    ALTER TABLE TimesheetPolicySettings
    ADD MinimumSubmitHours decimal(18,2) NOT NULL CONSTRAINT DF_TimesheetPolicy_MinSubmit DEFAULT 0;
END

-- Example: require 5h before submit (run after column exists)
-- UPDATE TimesheetPolicySettings SET MinimumSubmitHours = 5;
