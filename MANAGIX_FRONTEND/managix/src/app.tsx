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

// STEP 3 IMPORT: Correctly pointed to your new folder
import Profile from './pages/user/Profile';
import Teams from './pages/team/Teams';
import PerformanceDashboard from './components/PerformanceDashboard';
import TaskCenter from './pages/task/TaskHub';
import Task from './pages/task/Task';
import TaskHub from './pages/task/TaskHub';
import KanbanBoard from './pages/task/KanbanBoard';
import Meeting from './pages/meeting/Meeting';

function App() {
  return (
    <Router>
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
        {/* Handled by the sidebar logic we added to AdminPortal */}
        <Route path="/admin/roles" element={<Layout><AdminPortal /></Layout>} />

        {/* Shared Section: Profile & Resume (STEP 3) */}
        <Route path="/profile" element={<Layout><Profile /></Layout>} />
        <Route path="/meeting" element={<Layout><Meeting /></Layout>} />

        {/* Manager Section */}
        <Route path="/create-project" element={<Layout><CreateProject /></Layout>} />
        <Route path="/projects" element={<Layout><Project /></Layout>} />
        <Route path="/milestones" element={<Layout><Milestone /></Layout>} />

        {/* Step 5 Placeholder - We will replace this in the next step */}
        <Route path="/teams" element={<Layout><Teams /></Layout>} />
        {/* Step 9 Placeholder */}
        <Route path="/performance/:projectId" element={<Layout><PerformanceDashboard /></Layout>} />        {/* Project View & QA */}
        <Route path="/projects/:projectId" element={<Layout><ProjectDetails /></Layout>} />
        <Route path="/qa/review" element={<Layout><QAReview /></Layout>} />
        
       <Route path="/task-hub" element={<Layout><KanbanBoard /></Layout>} />
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