import api from './axiosInstance';

export interface EducationDto {
  degree?: string;
  institution?: string;
  year?: string;
  details?: string;
}

export interface ProjectDto {
  title?: string;
  description?: string;
}

export interface ExperienceDto {
  title?: string;
  company?: string;
  duration?: string;
  description?: string;
}

export interface ResumeParsedDataDto {
  name?: string;
  email?: string;
  phone?: string;
  summary?: string;
  education: EducationDto[];
  skills: string[];
  projects: ProjectDto[];
  experience: ExperienceDto[];
}

export interface ResumeSaveProfileDto {
  userId: string;
  name?: string;
  email?: string;
  phone?: string;
  summary?: string;
  education: EducationDto[];
  skills: string[];
  projects: ProjectDto[];
  experience: ExperienceDto[];
}

export const resumeService = {
  parseResume: async (fileName: string, fileBase64: string): Promise<ResumeParsedDataDto> => {
    const response = await api.post('/resume/parse', {
      FileName: fileName,  // Match C# DTO property name
      FileBase64: fileBase64  // Match C# DTO property name
    });
    return response.data;
  },

  saveResumeProfile: async (data: ResumeSaveProfileDto): Promise<any> => {
    const response = await api.post('/resume/save', data);
    return response.data;
  },

  getResumeProfile: async (userId: string): Promise<ResumeSaveProfileDto> => {
    const response = await api.get(`/resume/${userId}`);
    return response.data;
  }
};
