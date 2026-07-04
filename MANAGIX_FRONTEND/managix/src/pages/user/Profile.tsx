import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axiosInstance';
import { userService } from '../../api/userService';
import { resumeService, ResumeParsedDataDto, ResumeSaveProfileDto, EducationDto, ProjectDto, ExperienceDto } from '../../api/resumeService';
import { User, FileText, Shield, Upload, CheckCircle, Edit3, X, Brain, Plus, Save } from 'lucide-react';
import { canUploadResume, normalizeAppRole } from '../../utils/roles';

const Profile = () => {
    const navigate = useNavigate();
    const [userProfile, setUserProfile] = useState<any>(null);
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [parsing, setParsing] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [showParsedForm, setShowParsedForm] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // Parsed data state
    const [parsedData, setParsedData] = useState<ResumeParsedDataDto | null>(null);
    
    // Form state for parsed data
    const [parsedForm, setParsedForm] = useState<ResumeSaveProfileDto>({
        userId: '',
        name: '',
        email: '',
        phone: '',
        summary: '',
        education: [],
        skills: [],
        projects: [],
        experience: []
    });
    
    // Aligned with your backend JSON structure
    const [editForm, setEditForm] = useState({ 
        fullName: '', 
        email: '',
        bio: '', 
        skills: '',
        phone: '',
        address: '',
    });
    
    const [message, setMessage] = useState({ type: '', text: '' });
    
    const userId = localStorage.getItem('userId');
    const role = localStorage.getItem('roleName') || localStorage.getItem('userRole');
    const appRole = normalizeAppRole(role);
    const showResumeUpload = canUploadResume(role);

    useEffect(() => {
        fetchProfile();
    }, []);

    useEffect(() => {
        if (userId) {
            setParsedForm(prev => ({ ...prev, userId }));
        }
    }, [userId]);

    const mapToEditForm = (profile: any, user: any) => ({
        fullName: user?.fullName ?? user?.FullName ?? localStorage.getItem('userName') ?? '',
        email: user?.email ?? user?.Email ?? localStorage.getItem('userEmail') ?? '',
        bio: profile?.bio ?? profile?.Bio ?? profile?.summary ?? profile?.Summary ?? '',
        skills: profile?.skills ?? profile?.Skills ?? '',
        phone: profile?.phone ?? profile?.Phone ?? '',
        address: profile?.address ?? profile?.Address ?? '',
    });

    const fetchProfile = async () => {
        if (!userId) return;
        try {
            const [userRes, profileData] = await Promise.all([
                api.get(`/users/${userId}`).catch(() => ({ data: null })),
                userService.getProfile(userId).catch(() => null),
            ]);
            const user = userRes?.data;
            const data = profileData ?? {};
            setUserProfile({ ...data, ...user });
            setEditForm(mapToEditForm(data, user));

            // Try to load resume data if exists
            try {
                const resumeData = await resumeService.getResumeProfile(userId);
                setParsedForm(resumeData);
            } catch (err) {
                // Resume data doesn't exist yet, that's okay
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to load profile data.' });
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) return;
        try {
            // Sends the updated Bio, Skills, Phone, Address to [PUT] /api/profile/{userId}
            await userService.updateProfile(userId, {
                bio: editForm.bio,
                skills: userProfile?.skills ?? userProfile?.Skills ?? editForm.skills,
                phone: editForm.phone,
                address: editForm.address,
            });
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            setIsEditing(false);
            fetchProfile();
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to update profile.' });
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !userId) return;

        setParsing(true);
        setMessage({ type: '', text: '' });
        try {
            // Convert file to Base64 string
            const reader = new FileReader();
            reader.readAsDataURL(file);
            
                reader.onload = async () => {
                try {
                    const base64String = (reader.result as string).split(',')[1]; // Remove metadata prefix

                    // Call parse resume endpoint
                    const parsed = await resumeService.parseResume(file.name, base64String);
                    
                    console.log('Parsed data received:', parsed); // Debug log
                    
                    setParsedData(parsed);
                    
                    // Normalize the response - handle both PascalCase (legacy) and camelCase (new)
                    const normalizedParsed = {
                        name: (parsed as any).Name || (parsed as any).name || '',
                        email: (parsed as any).Email || (parsed as any).email || '',
                        phone: (parsed as any).Phone || (parsed as any).phone || '',
                        summary: (parsed as any).Summary || (parsed as any).summary || '',
                        education: (parsed as any).Education || (parsed as any).education || [],
                        skills: (parsed as any).Skills || (parsed as any).skills || [],
                        projects: (parsed as any).Projects || (parsed as any).projects || [],
                        experience: (parsed as any).Experience || (parsed as any).experience || []
                    };
                    
                    // Normalize nested objects (education, projects, experience) - handle both cases
                    const normalizedEducation = (normalizedParsed.education || []).map((edu: any) => ({
                        degree: edu.Degree || edu.degree || '',
                        institution: edu.Institution || edu.institution || '',
                        year: edu.Year || edu.year || '',
                        details: edu.Details || edu.details || ''
                    }));
                    
                    const normalizedProjects = (normalizedParsed.projects || []).map((proj: any) => ({
                        title: proj.Title || proj.title || '',
                        description: proj.Description || proj.description || ''
                    }));
                    
                    const normalizedExperience = (normalizedParsed.experience || []).map((exp: any) => ({
                        title: exp.Title || exp.title || '',
                        company: exp.Company || exp.company || '',
                        duration: exp.Duration || exp.duration || '',
                        description: exp.Description || exp.description || ''
                    }));
                    
                    // Populate form with parsed data
                    setParsedForm({
                        userId: userId,
                        name: normalizedParsed.name,
                        email: normalizedParsed.email,
                        phone: normalizedParsed.phone,
                        summary: normalizedParsed.summary,
                        education: normalizedEducation,
                        skills: Array.isArray(normalizedParsed.skills) ? normalizedParsed.skills : [],
                        projects: normalizedProjects,
                        experience: normalizedExperience
                    });

                    setShowParsedForm(true);
                    setMessage({ type: 'success', text: 'Resume parsed successfully! Please review and edit the data below, then click Save.' });
                    setFile(null);
                } catch (err: any) {
                    console.error('Parse error:', err); // Debug log
                    setMessage({ 
                        type: 'error', 
                        text: `Resume parsing failed: ${err.response?.data?.message || err.message || 'Unknown error'}` 
                    });
                } finally {
                    setParsing(false);
                }
            };
        } catch (err: any) {
            setMessage({ type: 'error', text: `Resume upload failed: ${err.message}` });
            setParsing(false);
        }
    };

    const handleSaveParsedData = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) return;

        setSaving(true);
        try {
            await resumeService.saveResumeProfile({
                ...parsedForm,
                userId: userId
            });

            const cvName = parsedForm.name?.trim();
            if (cvName) {
                localStorage.setItem('userName', cvName);
            }

            setMessage({ type: 'success', text: 'Resume profile saved successfully!' });
            setShowParsedForm(false);
            fetchProfile();
        } catch (err: any) {
            setMessage({ 
                type: 'error', 
                text: `Failed to save profile: ${err.response?.data?.message || err.message || 'Unknown error'}` 
            });
        } finally {
            setSaving(false);
        }
    };

    // Helper functions to add/remove items from arrays
    const addEducation = () => {
        setParsedForm(prev => ({
            ...prev,
            education: [...prev.education, { degree: '', institution: '', year: '', details: '' }]
        }));
    };

    const removeEducation = (index: number) => {
        setParsedForm(prev => ({
            ...prev,
            education: prev.education.filter((_, i) => i !== index)
        }));
    };

    const updateEducation = (index: number, field: keyof EducationDto, value: string) => {
        setParsedForm(prev => ({
            ...prev,
            education: prev.education.map((edu, i) => 
                i === index ? { ...edu, [field]: value } : edu
            )
        }));
    };

    const addSkill = () => {
        setParsedForm(prev => ({
            ...prev,
            skills: [...prev.skills, '']
        }));
    };

    const removeSkill = (index: number) => {
        setParsedForm(prev => ({
            ...prev,
            skills: prev.skills.filter((_, i) => i !== index)
        }));
    };

    const updateSkill = (index: number, value: string) => {
        setParsedForm(prev => ({
            ...prev,
            skills: prev.skills.map((skill, i) => i === index ? value : skill)
        }));
    };

    const addProject = () => {
        setParsedForm(prev => ({
            ...prev,
            projects: [...prev.projects, { title: '', description: '' }]
        }));
    };

    const removeProject = (index: number) => {
        setParsedForm(prev => ({
            ...prev,
            projects: prev.projects.filter((_, i) => i !== index)
        }));
    };

    const updateProject = (index: number, field: keyof ProjectDto, value: string) => {
        setParsedForm(prev => ({
            ...prev,
            projects: prev.projects.map((proj, i) => 
                i === index ? { ...proj, [field]: value } : proj
            )
        }));
    };

    const addExperience = () => {
        setParsedForm(prev => ({
            ...prev,
            experience: [...prev.experience, { title: '', company: '', duration: '', description: '' }]
        }));
    };

    const removeExperience = (index: number) => {
        setParsedForm(prev => ({
            ...prev,
            experience: prev.experience.filter((_, i) => i !== index)
        }));
    };

    const updateExperience = (index: number, field: keyof ExperienceDto, value: string) => {
        setParsedForm(prev => ({
            ...prev,
            experience: prev.experience.map((exp, i) => 
                i === index ? { ...exp, [field]: value } : exp
            )
        }));
    };

    if (!userProfile) return <div className="p-10 font-bold animate-pulse text-fg-subtle uppercase">Loading Profile...</div>;

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="mb-10 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold tracking-tighter uppercase">Profile Settings</h1>
                    <p className="text-fg-subtle font-bold text-sm tracking-widest uppercase">Identity & AI Resume Parsing</p>
                </div>
                {!isEditing && !showParsedForm && (
                    <button 
                        onClick={() => {
                            setEditForm(mapToEditForm(userProfile, userProfile));
                            setIsEditing(true);
                        }}
                        className="flex items-center gap-2 bg-surface-2 hover:bg-surface-3 px-4 py-2 rounded-lg font-bold text-xs transition border border-line"
                    >
                        <Edit3 size={14} /> EDIT DETAILS
                    </button>
                )}
            </div>

            {message.text && (
                <div className={`mb-6 p-4 rounded-lg font-bold flex items-center gap-3 ${message.type === 'success' ? 'bg-success-soft text-success border border-success/25' : 'bg-danger-soft text-danger border border-danger/25'}`}>
                    {message.type === 'success' && <CheckCircle size={20} />}
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {showParsedForm ? (
                        // Parsed Data Form
                        <div className="bg-surface p-8 rounded-xl border border-line shadow-e1">
                            <form onSubmit={handleSaveParsedData} className="space-y-6">
                                <div className="mb-6">
                                    <h2 className="text-xl font-bold text-fg mb-2">Resume Parsed Data</h2>
                                    <p className="text-sm text-fg-muted">Review and edit the parsed information, then click Save.</p>
                                </div>

                                {/* Personal Information */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-fg-subtle uppercase mb-1">Name</label>
                                        <input 
                                            className="w-full p-4 bg-surface-2 border border-line rounded-lg font-bold focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none"
                                            value={parsedForm.name}
                                            onChange={e => setParsedForm(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="Full Name"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-fg-subtle uppercase mb-1">Email</label>
                                        <input 
                                            className="w-full p-4 bg-surface-2 border border-line rounded-lg font-bold focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none"
                                            type="email"
                                            value={parsedForm.email}
                                            onChange={e => setParsedForm(prev => ({ ...prev, email: e.target.value }))}
                                            placeholder="email@example.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-fg-subtle uppercase mb-1">Phone</label>
                                        <input 
                                            className="w-full p-4 bg-surface-2 border border-line rounded-lg font-bold focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none"
                                            value={parsedForm.phone}
                                            onChange={e => setParsedForm(prev => ({ ...prev, phone: e.target.value }))}
                                            placeholder="+1234567890"
                                        />
                                    </div>
                                </div>

                                {/* Summary */}
                                <div>
                                    <label className="text-[10px] font-bold text-fg-subtle uppercase mb-1">Professional Summary</label>
                                    <textarea 
                                        className="w-full p-4 bg-surface-2 border border-line rounded-lg font-bold focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none h-32"
                                        value={parsedForm.summary}
                                        onChange={e => setParsedForm(prev => ({ ...prev, summary: e.target.value }))}
                                        placeholder="Professional summary..."
                                    />
                                </div>

                                {/* Education */}
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-[10px] font-bold text-fg-subtle uppercase">Education</label>
                                        <button type="button" onClick={addEducation} className="text-info hover:text-info">
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                    {parsedForm.education.map((edu, index) => (
                                        <div key={index} className="mb-4 p-4 bg-surface-2 rounded-lg border border-line">
                                            <div className="flex justify-end mb-2">
                                                <button type="button" onClick={() => removeEducation(index)} className="text-danger hover:text-danger">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <input 
                                                    className="p-3 bg-surface border border-line rounded-lg font-bold focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none text-sm"
                                                    placeholder="Degree"
                                                    value={edu.degree || ''}
                                                    onChange={e => updateEducation(index, 'degree', e.target.value)}
                                                />
                                                <input 
                                                    className="p-3 bg-surface border border-line rounded-lg font-bold focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none text-sm"
                                                    placeholder="Institution"
                                                    value={edu.institution || ''}
                                                    onChange={e => updateEducation(index, 'institution', e.target.value)}
                                                />
                                                <input 
                                                    className="p-3 bg-surface border border-line rounded-lg font-bold focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none text-sm"
                                                    placeholder="Year"
                                                    value={edu.year || ''}
                                                    onChange={e => updateEducation(index, 'year', e.target.value)}
                                                />
                                                <textarea 
                                                    className="p-3 bg-surface border border-line rounded-lg font-bold focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none text-sm md:col-span-2"
                                                    placeholder="Details"
                                                    value={edu.details || ''}
                                                    onChange={e => updateEducation(index, 'details', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Skills */}
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-[10px] font-bold text-fg-subtle uppercase">Skills</label>
                                        <button type="button" onClick={addSkill} className="text-info hover:text-info">
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {parsedForm.skills.map((skill, index) => (
                                            <div key={index} className="flex gap-2">
                                                <input 
                                                    className="flex-1 p-3 bg-surface-2 border border-line rounded-lg font-bold focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none text-sm"
                                                    placeholder="Skill name"
                                                    value={skill}
                                                    onChange={e => updateSkill(index, e.target.value)}
                                                />
                                                <button type="button" onClick={() => removeSkill(index)} className="text-danger hover:text-danger">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Projects */}
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-[10px] font-bold text-fg-subtle uppercase">Projects</label>
                                        <button type="button" onClick={addProject} className="text-info hover:text-info">
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                    {parsedForm.projects.map((proj, index) => (
                                        <div key={index} className="mb-4 p-4 bg-surface-2 rounded-lg border border-line">
                                            <div className="flex justify-end mb-2">
                                                <button type="button" onClick={() => removeProject(index)} className="text-danger hover:text-danger">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                            <div className="space-y-3">
                                                <input 
                                                    className="w-full p-3 bg-surface border border-line rounded-lg font-bold focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none text-sm"
                                                    placeholder="Project Title"
                                                    value={proj.title || ''}
                                                    onChange={e => updateProject(index, 'title', e.target.value)}
                                                />
                                                <textarea 
                                                    className="w-full p-3 bg-surface border border-line rounded-lg font-bold focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none text-sm"
                                                    placeholder="Project Description"
                                                    value={proj.description || ''}
                                                    onChange={e => updateProject(index, 'description', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Experience */}
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-[10px] font-bold text-fg-subtle uppercase">Work Experience</label>
                                        <button type="button" onClick={addExperience} className="text-info hover:text-info">
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                    {parsedForm.experience.map((exp, index) => (
                                        <div key={index} className="mb-4 p-4 bg-surface-2 rounded-lg border border-line">
                                            <div className="flex justify-end mb-2">
                                                <button type="button" onClick={() => removeExperience(index)} className="text-danger hover:text-danger">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <input 
                                                    className="p-3 bg-surface border border-line rounded-lg font-bold focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none text-sm"
                                                    placeholder="Job Title"
                                                    value={exp.title || ''}
                                                    onChange={e => updateExperience(index, 'title', e.target.value)}
                                                />
                                                <input 
                                                    className="p-3 bg-surface border border-line rounded-lg font-bold focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none text-sm"
                                                    placeholder="Company"
                                                    value={exp.company || ''}
                                                    onChange={e => updateExperience(index, 'company', e.target.value)}
                                                />
                                                <input 
                                                    className="p-3 bg-surface border border-line rounded-lg font-bold focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none text-sm md:col-span-2"
                                                    placeholder="Duration (e.g., Jan 2020 - Dec 2022)"
                                                    value={exp.duration || ''}
                                                    onChange={e => updateExperience(index, 'duration', e.target.value)}
                                                />
                                                <textarea 
                                                    className="p-3 bg-surface border border-line rounded-lg font-bold focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none text-sm md:col-span-2"
                                                    placeholder="Job Description"
                                                    value={exp.description || ''}
                                                    onChange={e => updateExperience(index, 'description', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button 
                                        type="submit" 
                                        disabled={saving}
                                        className="bg-primary text-primary-fg px-8 py-4 rounded-lg font-bold text-xs uppercase hover:bg-primary-hover transition disabled:opacity-50 flex items-center gap-2"
                                    >
                                        <Save size={16} />
                                        {saving ? 'Saving...' : 'Save Profile'}
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => setShowParsedForm(false)} 
                                        className="bg-surface-2 text-fg-muted px-8 py-4 rounded-lg font-bold text-xs uppercase"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : isEditing ? (
                        // Original Edit Form
                        <div className="bg-surface p-8 rounded-xl border border-line shadow-e1">
                            <form onSubmit={handleUpdateProfile} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="text-[10px] font-bold text-fg-subtle uppercase mb-1">Professional Bio</label>
                                        <textarea 
                                            className="w-full p-4 bg-surface-2 border border-line rounded-lg font-bold focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none h-24"
                                            value={editForm.bio}
                                            onChange={e => setEditForm({...editForm, bio: e.target.value})}
                                            placeholder="Briefly describe your experience..."
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-[10px] font-bold text-fg-subtle uppercase mb-1">Phone Number</label>
                                        <input 
                                            className="w-full p-4 bg-surface-2 border border-line rounded-lg font-bold focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none"
                                            value={editForm.phone}
                                            onChange={e => setEditForm({...editForm, phone: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button type="submit" className="bg-primary text-primary-fg px-8 py-4 rounded-lg font-bold text-xs uppercase hover:bg-primary-hover transition">Save Profile</button>
                                    <button type="button" onClick={() => setIsEditing(false)} className="bg-surface-2 text-fg-muted px-8 py-4 rounded-lg font-bold text-xs uppercase">Cancel</button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        // Original Display View
                        <>
                            <div className="bg-surface p-8 rounded-xl border border-line shadow-e1">
                                <div className="flex items-center gap-5 mb-10 pb-10 border-b border-line">
                                    <div className="h-20 w-20 bg-primary rounded-xl flex items-center justify-center text-primary-fg text-3xl font-bold shadow-e2">
                                        {editForm.fullName?.charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-fg tracking-tighter">{editForm.fullName}</h2>
                                        <div className="flex gap-2 items-center mt-1">
                                            <span className="px-3 py-1 bg-info text-primary-fg rounded-lg text-[9px] font-bold uppercase tracking-widest">
                                                {appRole === 'QA' ? 'Quality Assurance' : appRole}
                                            </span>
                                            <span className="px-3 py-1 bg-success-soft text-success rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center gap-1">
                                                <Shield size={10} /> Verified
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="md:col-span-2">
                                        <label className="text-[10px] font-bold text-fg-subtle uppercase tracking-widest block mb-2">Professional Summary</label>
                                        <p className="text-fg-muted font-medium leading-relaxed bg-surface-2 p-6 rounded-xl border border-line">
                                            "{userProfile.Bio || userProfile.Summary || "No bio available. Update your profile to add one."}"
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-fg-subtle uppercase tracking-widest block mb-3">Technical Expertise</label>
                                        <div className="flex flex-wrap gap-2">
                                            {userProfile.Skills ? userProfile.Skills.split(',').map((s: string) => (
                                                <span key={s} className="px-4 py-2 bg-surface-2 border-2 border-line text-fg rounded-lg text-xs font-bold uppercase tracking-tight">
                                                    {s.trim()}
                                                </span>
                                            )) : (
                                                <div className="flex items-center gap-2 text-fg-subtle text-xs font-bold">
                                                    <Brain size={14} /> AI parsing pending resume upload...
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-fg-subtle uppercase tracking-widest block mb-1">Phone</label>
                                            <p className="font-bold text-fg">{userProfile.Phone || 'Not Provided'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="lg:col-span-1">
                    {showResumeUpload && !showParsedForm && (
                        <div className="bg-primary text-primary-fg p-8 rounded-xl shadow-e3 relative overflow-hidden">
                            <div className="relative z-10">
                                <div className="h-12 w-12 bg-black/20 rounded-lg flex items-center justify-center mb-6">
                                    <FileText className="text-primary-fg" size={24} />
                                </div>
                                <h3 className="text-2xl font-bold mb-2 tracking-tighter">AI RESUME PARSER</h3>
                                <p className="text-sm text-primary-fg/70 font-medium mb-8 leading-relaxed">
                                    Upload your resume to let our AI automatically detect your skills and match you to tasks.
                                </p>

                                <form onSubmit={handleUpload} className="space-y-4">
                                    <div className="group border-2 border-dashed border-primary-fg/30 rounded-xl p-8 text-center hover:border-primary-fg transition-all cursor-pointer relative bg-black/20">
                                        <input 
                                            type="file" 
                                            className="absolute inset-0 opacity-0 cursor-pointer" 
                                            onChange={(e) => {
                                                if (e.target.files) setFile(e.target.files[0]);
                                            }}
                                            accept=".pdf,.doc,.docx"
                                            disabled={parsing}
                                        />
                                        <Upload className="mx-auto mb-3 text-primary-fg/50 group-hover:text-primary-fg transition-colors" size={32} />
                                        <p className="text-[10px] font-bold text-primary-fg/70 uppercase tracking-widest">
                                            {file ? file.name : "Drop Resume Here"}
                                        </p>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={!file || parsing}
                                        className="w-full bg-primary-fg text-primary font-bold py-5 rounded-lg hover:opacity-90 transition-all shadow-e2 disabled:opacity-50 uppercase text-xs tracking-widest"
                                    >
                                        {parsing ? "Parsing..." : "Process with AI"}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;
