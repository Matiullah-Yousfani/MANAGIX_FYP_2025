import api from './axiosInstance';
import { normalizePayrollSummary } from './normalize';

export const payrollService = {
  byProject: async (projectId: string) => {
    const r = await api.get(`/payroll/project/${projectId}`);
    return normalizePayrollSummary(r.data);
  },
  organization: async () => {
    const r = await api.get('/payroll/organization');
    return normalizePayrollSummary(r.data);
  },
};
