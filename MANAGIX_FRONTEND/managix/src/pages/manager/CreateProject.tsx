import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../../api/projectService';
import { milestoneService } from '../../api/milestoneService';
import { taskService } from '../../api/taskService';
import { aiService } from '../../api/aiService';
import { validateProjectStep1, validateProjectStep2, MIN_PROJECT_DESCRIPTION_CHARS, MIN_PROJECT_BUDGET_USD } from '../../utils/formValidation';
import { validateDescriptionQuality } from '../../utils/descriptionQuality';
import { formatLocalDateYmd, parseYmdLocal, compareYmd } from '../../utils/dateOnlyLocal';
import { minDateToday } from '../../utils/dateInput';
import { preprocessTextForAi } from '../../utils/textPreprocess';
import { DatePicker, toast, Select } from '../../components/ui';
import {
  FiCalendar,
  FiDollarSign,
  FiTrash2,
  FiPlus,
  FiChevronRight,
  FiChevronLeft,
  FiCheckCircle,
  FiLayers,
  FiZap,
} from 'react-icons/fi';

type MilestoneDraft = {
  title: string;
  description: string;
  deadline: string;
  budgetAllocated: number;
  tasks?: { title: string; description: string; estimatedHours?: number }[];
};

const CreateProject = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [aiPlanning, setAiPlanning] = useState(false);
  const [methodologyNote, setMethodologyNote] = useState('');
  const [projectModels, setProjectModels] = useState<any[]>([]);
  const [shouldAutoPlan, setShouldAutoPlan] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: '',
    budget: 0,
    modelId: '',
    managerId: localStorage.getItem('userId') || '',
  });

  const [milestones, setMilestones] = useState<MilestoneDraft[]>([]);

  const [currentMilestone, setCurrentMilestone] = useState({
    title: '',
    description: '',
    deadline: '',
    budgetAllocated: 0,
  });

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const data = await projectService.getProjectModels();
        setProjectModels(data);
      } catch (err) {
        console.error('Failed to load project models:', err);
      }
    };
    fetchModels();
  }, []);

  /** Do not auto-pick first methodology — manager or AI must choose explicitly */

  const runAiPlanner = useCallback(async () => {
    const step1Err = validateProjectStep1(formData.title, formData.description);
    if (step1Err) {
      toast(step1Err);
      return;
    }
    const step2Err = validateProjectStep2(formData.deadline, formData.budget);
    if (step2Err) {
      toast(step2Err);
      return;
    }
    setAiPlanning(true);
    setMethodologyNote('');
    try {
      const res = await aiService.generateProjectPlan({
        projectName: formData.title.trim(),
        projectDescription: preprocessTextForAi(formData.description.trim()),
        deadline: formData.deadline,
        budget: formData.budget,
      });

      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const projEnd = new Date(formData.deadline);
      projEnd.setHours(0, 0, 0, 0);

      const mapped: MilestoneDraft[] = (res.milestones || []).map((ms) => {
        const d = new Date(start);
        d.setDate(d.getDate() + Number(ms.deadlineOffsetDays || 0));
        if (d.getTime() > projEnd.getTime()) {
          d.setTime(projEnd.getTime());
        }
        const ymd = formatLocalDateYmd(d);
        const budgetAllocated =
          Math.round(((Number(ms.budgetPercentage) || 0) / 100) * formData.budget * 100) / 100;
        return {
          title: (ms.title || 'Milestone').trim(),
          description: ms.description || '',
          deadline: ymd,
          budgetAllocated,
          tasks: (ms.tasks || []).map((t) => ({
            title: (t.title || '').trim(),
            description: t.description || '',
            estimatedHours: (t as { estimatedHours?: number }).estimatedHours,
          })),
        };
      });

      setMilestones(mapped);
      const mid =
        res.suggestedModelId || (res as { SuggestedModelId?: string }).SuggestedModelId;
      if (mid) {
        setFormData((f) => ({ ...f, modelId: String(mid) }));
      }
      const rationale =
        res.methodologyRationale || (res as { MethodologyRationale?: string }).MethodologyRationale;
      const sm =
        res.suggestedMethodology || (res as { SuggestedMethodology?: string }).SuggestedMethodology;
      if (rationale || sm) {
        setMethodologyNote(
          [sm ? `Suggested methodology: ${sm}` : '', rationale || ''].filter(Boolean).join(' — ')
        );
      }
    } catch (err: unknown) {
      console.error(err);
      const ax = err as {
        response?: { data?: { message?: string; detail?: string }; status?: number };
        message?: string;
      };
      const serverMsg = ax?.response?.data?.message ?? ax?.response?.data?.detail;
      const msg =
        serverMsg && String(serverMsg).trim()
          ? String(serverMsg)
          : ax?.message?.includes('Network Error') || ax?.message?.includes('502')
            ? 'AI planner unreachable. Restart AI services: .\\scripts\\start-ai-services.ps1'
            : 'AI planner failed. Ensure ai_planner.py is running (port 8001) and GROQ_API_KEY is set in resume_parser/.env';
      toast(msg);
    } finally {
      setAiPlanning(false);
    }
  }, [formData.title, formData.description, formData.deadline, formData.budget]);

  useEffect(() => {
    if (step !== 3 || !shouldAutoPlan) return;
    setShouldAutoPlan(false);
    void runAiPlanner();
  }, [step, shouldAutoPlan, runAiPlanner]);

  const totalAllocated = milestones.reduce((sum, m) => sum + m.budgetAllocated, 0);
  const remainingBudget = formData.budget - totalAllocated;

  const updateMilestone = (index: number, patch: Partial<MilestoneDraft>) => {
    setMilestones((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  };

  const updateTask = (
    mi: number,
    ti: number,
    patch: Partial<{ title: string; description: string }>
  ) => {
    setMilestones((prev) =>
      prev.map((m, i) => {
        if (i !== mi) return m;
        const tasks = [...(m.tasks || [])];
        const cur = tasks[ti] || { title: '', description: '' };
        tasks[ti] = { ...cur, ...patch };
        return { ...m, tasks };
      })
    );
  };

  const removeTask = (mi: number, ti: number) => {
    setMilestones((prev) =>
      prev.map((m, i) => {
        if (i !== mi) return m;
        const tasks = [...(m.tasks || [])];
        tasks.splice(ti, 1);
        return { ...m, tasks };
      })
    );
  };

  const addTaskToMilestone = (mi: number) => {
    setMilestones((prev) =>
      prev.map((m, i) => {
        if (i !== mi) return m;
        return { ...m, tasks: [...(m.tasks || []), { title: '', description: '' }] };
      })
    );
  };

  const addMilestoneToList = () => {
    const { title, deadline, budgetAllocated, description } = currentMilestone;
    if (!title || !deadline) {
      toast('Please fill in Milestone Title and Date');
      return;
    }
    const projectDeadline = parseYmdLocal(formData.deadline);
    const milestoneDate = parseYmdLocal(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (milestoneDate < today) {
      toast('Milestone deadline cannot be in the past.');
      return;
    }
    if (milestoneDate > projectDeadline) {
      toast(`Milestone deadline cannot exceed project deadline (${formData.deadline}).`);
      return;
    }
    if (budgetAllocated > remainingBudget) {
      const excess = budgetAllocated - remainingBudget;
      toast(`Budget Exceeded! Milestone exceeds remaining budget by $${excess.toFixed(2)}.`);
      return;
    }
    if (budgetAllocated < 0) {
      toast('Milestone budget cannot be negative.');
      return;
    }
    if (
      milestones.some((m) => m.title.trim().toLowerCase() === title.trim().toLowerCase())
    ) {
      toast('A milestone with this name is already in the list.');
      return;
    }

    setMilestones([
      ...milestones,
      { title: title.trim(), description: description || '', deadline, budgetAllocated, tasks: [] },
    ]);
    setCurrentMilestone({ title: '', description: '', deadline: '', budgetAllocated: 0 });
  };

  const removeMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const validateMilestonesForLaunch = (): string | null => {
    const step1Err = validateProjectStep1(formData.title, formData.description);
    if (step1Err) return step1Err;
    const step2Err = validateProjectStep2(formData.deadline, formData.budget);
    if (step2Err) return step2Err;
    if (!formData.modelId) {
      return 'Choose a methodology (AI sets one after planning, or pick from the list).';
    }
    if (milestones.length === 0) return 'Add at least one milestone.';
    const todayYmd = formatLocalDateYmd(new Date());
    const projYmd = formData.deadline;
    let sum = 0;
    for (const m of milestones) {
      if (!m.title?.trim()) return 'Each milestone needs a title.';
      if (!m.deadline?.trim()) return 'Each milestone needs a deadline.';
      if (compareYmd(m.deadline, todayYmd) < 0) {
        return `Milestone "${m.title}" deadline must be today or a future date.`;
      }
      if (compareYmd(m.deadline, projYmd) > 0) {
        return `Milestone "${m.title}" cannot be after the project deadline (${projYmd}).`;
      }
      if (m.budgetAllocated < 0) return `Milestone "${m.title}" budget cannot be negative.`;
      sum += m.budgetAllocated;
    }
    if (sum > formData.budget + 0.01) {
      return 'Total milestone budgets cannot exceed the project budget.';
    }
    let totalTasks = 0;
    for (const m of milestones) {
      const validTasks = (m.tasks ?? []).filter((t) => t.title?.trim());
      if (validTasks.length === 0) {
        return `Milestone "${m.title}" must have at least one task with a title.`;
      }
      for (const t of validTasks) {
        if (!t.description?.trim()) {
          return `Task "${t.title}" in "${m.title}" needs a short description.`;
        }
      }
      totalTasks += validTasks.length;
    }
    if (totalTasks === 0) {
      return 'Add at least one task across your milestones before launching.';
    }
    return null;
  };

  const handleLaunchProject = async () => {
    const preErr = validateMilestonesForLaunch();
    if (preErr) {
      toast(preErr);
      return;
    }
    if (!formData.managerId) {
      toast('You must be logged in as a manager to create a project.');
      return;
    }
    setLoading(true);
    let projectId: string | undefined;
    try {
      let newProject;
      try {
        newProject = await projectService.create({
          ...formData,
          title: formData.title.trim(),
          deadline: formData.deadline,
        });
      } catch (createErr: any) {
        const msg = createErr?.response?.data?.message;
        if (createErr?.response?.status === 409) {
          toast(msg || 'A project with this title already exists.');
          setLoading(false);
          return;
        }
        throw createErr;
      }
      projectId = String(newProject.ProjectId || newProject.projectId);

      try {
        for (const m of milestones) {
          const createdMs = await milestoneService.create({
            projectId,
            title: m.title,
            description: m.description,
            deadline: m.deadline,
            budgetAllocated: m.budgetAllocated,
          });
          const milestoneId = createdMs.milestoneId || createdMs.MilestoneId;
          const taskList = m.tasks || [];
          const defaultHoursPerTask =
            taskList.length > 0
              ? Math.max(2, Math.round(((m.budgetAllocated || 0) / 40) / taskList.length) * 10) / 10
              : 4;
          for (const t of taskList) {
            if (!t.title?.trim()) continue;
            const hours =
              t.estimatedHours && t.estimatedHours > 0
                ? t.estimatedHours
                : defaultHoursPerTask;
            await taskService.create({
              projectId,
              milestoneId: String(milestoneId),
              title: t.title.trim(),
              description: t.description || '',
              estimatedHours: hours,
            } as any);
          }
        }
      } catch (inner: unknown) {
        if (projectId) {
          try {
            await projectService.delete(projectId);
          } catch {
            /* ignore rollback failure */
          }
        }
        throw inner;
      }

      toast('Project Launched Successfully!');
      navigate('/dashboard');
    } catch (err: unknown) {
      console.error(err);
      const ax = err as { response?: { data?: { message?: string; detail?: string } } };
      const msg =
        ax.response?.data?.message ??
        ax.response?.data?.detail ??
        'Failed to launch project. If a rollback ran, you can try again with the same title.';
      toast(msg);
    } finally {
      setLoading(false);
    }
  };

  const descriptionLen = formData.description.trim().length;
  const step1Valid = validateProjectStep1(formData.title, formData.description) === null;
  const step2Valid = validateProjectStep2(formData.deadline, formData.budget) === null;

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-sm border border-gray-200/70 overflow-hidden">
        <div className="bg-white px-8 pt-8 pb-4">
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Create Project</h2>
          <p className="text-gray-500 text-sm mt-1">
            Describe the project; methodology and milestones are suggested by AI on the last step (editable).
          </p>
        </div>

        <div className="px-8 mb-8">
          <div className="flex items-center justify-between relative">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex flex-col items-center z-10">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    step >= s
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {step > s ? <FiCheckCircle size={16} /> : s}
                </div>
              </div>
            ))}
            <div className="absolute top-4 left-0 w-full h-[2px] bg-gray-100 -z-0">
              <div
                className="h-full bg-indigo-600 transition-all duration-500"
                style={{ width: `${(step - 1) * 50}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="px-8 pb-10">
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Project Title
                </label>
                <input
                  type="text"
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-gray-800 font-medium"
                  placeholder="Enter a catchy title..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Description
                </label>
                <textarea
                  rows={5}
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-gray-800"
                  placeholder="What is this project about? Include goals, features, and domain context (min. 200 characters). AI uses this to suggest methodology, milestones, and tasks."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
                <p className={`text-xs mt-2 font-medium ${descriptionLen >= MIN_PROJECT_DESCRIPTION_CHARS ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {descriptionLen}/{MIN_PROJECT_DESCRIPTION_CHARS} characters minimum
                  {descriptionLen < MIN_PROJECT_DESCRIPTION_CHARS
                    ? ` — ${MIN_PROJECT_DESCRIPTION_CHARS - descriptionLen} more needed`
                    : ' — ready to continue'}
                </p>
              </div>

              <button
                onClick={() => {
                  const err = validateProjectStep1(formData.title, formData.description);
                  if (err) {
                    toast(err);
                    return;
                  }
                  setStep(2);
                }}
                disabled={!step1Valid}
                className="w-full bg-indigo-600 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-50"
              >
                Continue <FiChevronRight />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="grid grid-cols-1 gap-6">
                <div className="relative">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Target Deadline
                  </label>
                  <DatePicker
                    min={minDateToday()}
                    value={formData.deadline}
                    onChange={(v) => setFormData({ ...formData, deadline: v })}
                  />
                </div>
                <div className="relative">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Total Budget
                  </label>
                  <div className="relative">
                    <FiDollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      inputMode="numeric"
                      className="w-full pl-12 p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-indigo-600"
                      placeholder="0.00"
                      value={formData.budget === 0 ? '' : formData.budget}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, '');
                        setFormData({ ...formData, budget: parseFloat(val) || 0 });
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Minimum budget: ${MIN_PROJECT_BUDGET_USD}</p>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-100 text-gray-600 p-4 rounded-2xl font-bold flex items-center justify-center gap-2"
                >
                  <FiChevronLeft /> Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const err = validateProjectStep2(formData.deadline, formData.budget);
                    if (err) {
                      toast(err);
                      return;
                    }
                    if (milestones.length === 0) setShouldAutoPlan(true);
                    setStep(3);
                  }}
                  disabled={!step2Valid}
                  className="flex-1 bg-indigo-600 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next Step <FiChevronRight />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="bg-gradient-to-r from-violet-50 to-indigo-50 p-5 rounded-3xl border border-indigo-100">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-2">
                      <FiZap className="inline" /> AI planning
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      We run AI when you open this step (if milestones are empty). Regenerate anytime; edit any field
                      before launch.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void runAiPlanner()}
                    disabled={aiPlanning}
                    className="shrink-0 bg-indigo-600 text-white px-5 py-3 rounded-2xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <FiZap />
                    {aiPlanning ? 'Planning…' : 'Regenerate with AI'}
                  </button>
                </div>
                {methodologyNote ? (
                  <p className="text-xs text-indigo-900 mt-3 leading-relaxed border-t border-indigo-100 pt-3">
                    {methodologyNote}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <FiLayers className="text-gray-400" /> Project methodology
                </label>
                <Select
                  className="w-full"
                  value={formData.modelId}
                  onChange={(v) => setFormData({ ...formData, modelId: v })}
                  placeholder="Select methodology…"
                  options={[{ value: '', label: 'Select methodology…' }, ...projectModels.map((model) => ({ value: String(model.ModelId), label: model.ModelName || model.modelName }))]}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Pre-filled when AI runs; you can override before launch.
                </p>
              </div>

              <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                <h3 className="text-indigo-900 font-bold mb-4 flex items-center gap-2">
                  <FiPlus /> Add milestone manually
                </h3>
                <div className="space-y-3">
                  <input
                    className="w-full p-3 bg-white border-none rounded-xl shadow-sm outline-none"
                    placeholder="Milestone Name"
                    value={currentMilestone.title}
                    onChange={(e) => setCurrentMilestone({ ...currentMilestone, title: e.target.value })}
                  />
                  <input
                    className="w-full p-3 bg-white border-none rounded-xl shadow-sm outline-none text-sm"
                    placeholder="Description (optional)"
                    value={currentMilestone.description}
                    onChange={(e) =>
                      setCurrentMilestone({ ...currentMilestone, description: e.target.value })
                    }
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <DatePicker
                      min={minDateToday()}
                      value={currentMilestone.deadline}
                      onChange={(v) =>
                        setCurrentMilestone({ ...currentMilestone, deadline: v })
                      }
                    />
                    <input
                      type="text"
                      className="p-3 bg-white border-none rounded-xl shadow-sm outline-none text-sm font-bold text-indigo-600"
                      placeholder="$ Amount"
                      value={currentMilestone.budgetAllocated === 0 ? '' : currentMilestone.budgetAllocated}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, '');
                        setCurrentMilestone({
                          ...currentMilestone,
                          budgetAllocated: parseFloat(val) || 0,
                        });
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addMilestoneToList}
                    className="w-full bg-indigo-600 text-white p-3 rounded-xl font-bold text-sm shadow-md shadow-indigo-100"
                  >
                    + Add to Project
                  </button>
                </div>
              </div>

              <div className="card p-6 bg-gradient-to-br from-indigo-50 to-violet-50">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-slate-500 text-sm font-semibold">Allocation Status</span>
                  <span
                    className={`text-[11px] font-bold px-3 py-1 rounded-full border ${
                      remainingBudget < 0
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {remainingBudget >= 0 ? 'Budget OK' : 'Over Budget'}
                  </span>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-widest font-bold">Remaining</p>
                    <p className={`text-3xl font-extrabold nums ${remainingBudget < 0 ? 'text-red-600' : 'text-slate-900'}`}>${remainingBudget.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400 text-xs nums">Total: ${formData.budget}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 max-h-[28rem] overflow-y-auto pr-2 custom-scrollbar">
                {milestones.map((m, i) => (
                  <div
                    key={i}
                    className="p-4 bg-white border border-gray-200/70 rounded-2xl hover:border-indigo-200 transition-colors space-y-3"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-bold text-gray-400">Milestone {i + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeMilestone(i)}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                    <input
                      className="w-full p-3 bg-gray-50 rounded-xl text-sm font-bold text-gray-900 outline-none"
                      value={m.title}
                      onChange={(e) => updateMilestone(i, { title: e.target.value })}
                    />
                    <textarea
                      rows={2}
                      className="w-full p-3 bg-gray-50 rounded-xl text-xs text-gray-700 outline-none resize-none"
                      placeholder="Description"
                      value={m.description}
                      onChange={(e) => updateMilestone(i, { description: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] uppercase text-gray-400 font-bold">Deadline</label>
                        <DatePicker
                          className="mt-1"
                          min={minDateToday()}
                          value={m.deadline}
                          onChange={(v) => updateMilestone(i, { deadline: v })}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase text-gray-400 font-bold">Budget</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          className="w-full p-2 bg-gray-50 rounded-lg text-sm outline-none mt-1 font-semibold text-indigo-600"
                          value={m.budgetAllocated === 0 ? '' : m.budgetAllocated}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9.]/g, '');
                            updateMilestone(i, { budgetAllocated: parseFloat(val) || 0 });
                          }}
                        />
                      </div>
                    </div>
                    <div className="border-t border-gray-200/70 pt-3 space-y-2">
                      <p className="text-xs font-bold text-gray-500">Tasks</p>
                      {(m.tasks || []).map((t, ti) => (
                        <div key={ti} className="flex gap-2 items-start pl-2 border-l-2 border-indigo-100">
                          <div className="flex-1 space-y-1 min-w-0">
                            <input
                              className="w-full text-xs p-2 bg-gray-50 rounded-lg outline-none"
                              placeholder="Task title"
                              value={t.title}
                              onChange={(e) => updateTask(i, ti, { title: e.target.value })}
                            />
                            <input
                              className="w-full text-xs p-2 bg-gray-50 rounded-lg outline-none text-gray-600"
                              placeholder="Description (optional)"
                              value={t.description}
                              onChange={(e) => updateTask(i, ti, { description: e.target.value })}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeTask(i, ti)}
                            className="text-gray-300 hover:text-red-500 p-1 shrink-0"
                            aria-label="Remove task"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addTaskToMilestone(i)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                      >
                        + Add task
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200/70">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 bg-gray-50 text-gray-500 p-4 rounded-2xl font-bold"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleLaunchProject}
                  disabled={loading}
                  className="flex-[2] bg-indigo-600 text-white p-4 rounded-2xl font-bold hover:shadow-lg hover:shadow-indigo-200 transition-all disabled:bg-gray-300"
                >
                  {loading ? 'Processing...' : 'Launch Project'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateProject;
