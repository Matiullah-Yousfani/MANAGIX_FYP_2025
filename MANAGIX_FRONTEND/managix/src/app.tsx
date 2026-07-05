import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import Dashboard from './pages/dashboard/Dashboard';
import AdminPortal from './pages/auth/AdminPortal';
import Milestone from './pages/milestone/Milestone';
import Project from './pages/project/Project';
import ProjectDetails from './pages/project/ProjectDetails';
import QAReview from './pages/qa/QAReview';
import CreateProject from './pages/manager/CreateProject';
import Layout from './components/Layout';
import { Toaster } from './components/ui';

// STEP 3 IMPORT: Correctly pointed to your new folder
import Profile from './pages/user/Profile';
import Teams from './pages/team/Teams';
import PerformanceDashboard from './components/PerformanceDashboard';
import TaskCenter from './pages/task/TaskHub';
import Task from './pages/task/Task';
import TaskHub from './pages/task/TaskHub';
import KanbanBoard from './pages/task/KanbanBoard';
import Meeting from './pages/meeting/Meeting';
import ScheduleMeeting from './pages/meeting/ScheduleMeeting';
import MeetingSummaries from './pages/meeting/MeetingSummaries';
import MeetingTranscripts from './pages/meeting/MeetingTranscripts';
// PHASE 3: Workload panel.
import WorkloadPanel from './pages/workload/WorkloadPanel';
import EmployeeInsights from './pages/employee/EmployeeInsights';
import PayrollPanel from './pages/payroll/PayrollPanel';
import TimesheetsPage from './pages/timesheet/TimesheetsPage';
import EmployeeTimesheetPage from './pages/timesheet/EmployeeTimesheetPage';

function App() {
  return (
    <Router>
      <Toaster />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected Routes wrapped in Layout */}
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />

        {/* Admin Section: Both links point to AdminPortal */}
        <Route path="/admin" element={<Layout><AdminPortal /></Layout>} />
        <Route path="/admin/approvals" element={<Layout><AdminPortal /></Layout>} />
        <Route path="/admin/roles" element={<Layout><AdminPortal /></Layout>} />
        <Route path="/admin/monitoring" element={<Layout><AdminPortal /></Layout>} />
        <Route path="/insights" element={<Layout><EmployeeInsights /></Layout>} />
        <Route path="/payroll" element={<Layout><PayrollPanel /></Layout>} />

        {/* Shared Section: Profile & Resume (STEP 3) */}
        <Route path="/profile" element={<Layout><Profile /></Layout>} />
        <Route path="/meeting" element={<Layout><Meeting /></Layout>} />
        <Route path="/meeting/schedule" element={<Layout><ScheduleMeeting /></Layout>} />
        <Route path="/meeting/summaries" element={<Layout><MeetingSummaries /></Layout>} />
        <Route path="/meeting/transcripts" element={<Layout><MeetingTranscripts /></Layout>} />

        {/* Manager Section */}
        <Route path="/create-project" element={<Layout><CreateProject /></Layout>} />
        <Route path="/projects" element={<Layout><Project /></Layout>} />
        <Route path="/milestones" element={<Layout><Milestone /></Layout>} />
        <Route path="/ai-allocation" element={<Navigate to="/teams" replace />} />

        {/* Step 5 Placeholder - We will replace this in the next step */}
        <Route path="/teams" element={<Layout><Teams /></Layout>} />
        {/* Step 9 Placeholder */}
        <Route path="/performance/:projectId" element={<Layout><PerformanceDashboard /></Layout>} />        {/* Project View & QA */}
        <Route path="/projects/:projectId" element={<Layout><ProjectDetails /></Layout>} />
        <Route path="/qa/review" element={<Layout><QAReview /></Layout>} />
        
       <Route path="/task-hub" element={<Layout><KanbanBoard /></Layout>} />
       {/* PHASE 3: Workload panel — accessible to managers and admins. */}
       <Route path="/workload" element={<Layout><WorkloadPanel /></Layout>} />
       <Route path="/timesheets" element={<Layout><TimesheetsPage /></Layout>} />
       <Route path="/my-timesheet" element={<Layout><EmployeeTimesheetPage /></Layout>} />
       <Route
              path="/projects/:projectId/milestones/:milestoneId/tasks"
              element={<Task />}
            />


        {/* Catch-all: If path is not found, redirect to login */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;