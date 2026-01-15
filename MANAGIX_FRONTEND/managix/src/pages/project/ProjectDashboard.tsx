import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { projectService } from "../../api/projectService";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiActivity, FiCheckCircle, FiClock, FiFlag, 
  FiLayers, FiPieChart, FiSearch, FiArrowLeft, FiXCircle 
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";

interface DashboardData {
  projectId: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  totalMilestones: number;
  completedMilestones: number;
  progressPercentage: number;
}

const ProjectDashboard = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'error' | 'success' }[]>([]);

  const addToast = (message: string, type: 'error' | 'success' = 'error') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  useEffect(() => {
    if (!projectId) return;

    projectService
      .getProjectDashboard(projectId)
      .then(setData)
      .catch(() => addToast("Failed to load dashboard data", "error"))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="p-4 rounded-3xl bg-white shadow-xl border border-gray-100"
        >
          <FiActivity className="text-indigo-600 size-8" />
        </motion.div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-3 hover:bg-gray-50 rounded-2xl transition-colors text-gray-400 hover:text-indigo-600"
          >
            <FiArrowLeft size={20} strokeWidth={3} />
          </button>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Performance Analytics</h1>
        </div>
        <div className="relative w-96">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text"
            placeholder="Search metrics..."
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-600/20 transition-all"
          />
        </div>
      </header>

      <main className="p-8 max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="flex flex-col lg:flex-row gap-8 mb-8">
          {/* Main Progress Card */}
          <div className="flex-[2] bg-indigo-600 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-indigo-200">
            <div className="relative z-10">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-2 block">Current Velocity</label>
              <h2 className="text-5xl font-black mb-8">Overall Progress</h2>
              
              <div className="flex items-end gap-6">
                <div className="text-7xl font-black tracking-tighter">
                  {Math.round(data.progressPercentage)}%
                </div>
                <div className="mb-2 font-bold opacity-80 italic underline underline-offset-8 decoration-2">
                  Project Health: Optimized
                </div>
              </div>

              {/* Progress Bar Container */}
              <div className="mt-10 bg-white/10 h-6 rounded-full overflow-hidden p-1.5 border border-white/10 backdrop-blur-sm">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${data.progressPercentage}%` }}
                  transition={{ duration: 1.5, ease: "circOut" }}
                  className="h-full bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                />
              </div>
            </div>
            <FiPieChart className="absolute -bottom-10 -right-10 size-64 opacity-10 rotate-12" />
          </div>

          {/* Quick Stats Sidebar */}
          <div className="flex-1 space-y-4">
            <StatSmallCard 
              label="Completed Tasks" 
              value={data.completedTasks} 
              total={data.totalTasks}
              icon={<FiCheckCircle />}
              color="text-emerald-600"
              bg="bg-emerald-50"
            />
            <StatSmallCard 
              label="Pending Tasks" 
              value={data.pendingTasks} 
              total={data.totalTasks}
              icon={<FiClock />}
              color="text-amber-600"
              bg="bg-amber-50"
            />
          </div>
        </div>

        {/* Secondary Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <DashboardCard 
            title="Total Milestones" 
            value={data.totalMilestones} 
            subtitle="Defined Goals"
            icon={<FiFlag />}
          />
          <DashboardCard 
            title="Milestones Completed" 
            value={data.completedMilestones} 
            subtitle="Success Rate"
            icon={<FiCheckCircle />}
          />
          <DashboardCard 
            title="Active Layers" 
            value={data.totalTasks} 
            subtitle="Total Work Packages"
            icon={<FiLayers />}
          />
        </div>
      </main>

      {/* Toast Notifications */}
      <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] bg-white border-l-4 min-w-[320px] ${
                toast.type === 'error' ? 'border-red-600' : 'border-emerald-600'
              }`}
            >
              {toast.type === 'error' ? (
                <FiXCircle className="text-red-600 text-xl shrink-0" />
              ) : (
                <FiCheckCircle className="text-emerald-600 text-xl shrink-0" />
              )}
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">System Message</span>
                <span className="text-sm font-bold text-gray-700">{toast.message}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

const DashboardCard = ({ title, value, subtitle, icon }: { title: string; value: number; subtitle: string; icon: React.ReactNode }) => (
  <div className="group bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm transition-all hover:-translate-y-2 hover:shadow-2xl relative overflow-hidden">
    <div className="relative z-10">
      <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl w-fit mb-6 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
        {icon}
      </div>
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">{title}</label>
      <h2 className="text-4xl font-black text-gray-900 tracking-tighter mb-2">{value}</h2>
      <p className="text-sm font-medium italic text-gray-500">{subtitle}</p>
    </div>
    <div className="absolute -bottom-4 -right-4 size-24 opacity-[0.03] text-gray-900 group-hover:scale-110 transition-transform">
      {icon}
    </div>
  </div>
);

const StatSmallCard = ({ label, value, total, icon, color, bg }: any) => (
  <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between">
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-xl ${bg} ${color}`}>
        {icon}
      </div>
      <div>
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">{label}</label>
        <div className="text-xl font-black text-gray-900">{value} <span className="text-sm font-medium text-gray-300">/ {total}</span></div>
      </div>
    </div>
  </div>
);

export default ProjectDashboard;