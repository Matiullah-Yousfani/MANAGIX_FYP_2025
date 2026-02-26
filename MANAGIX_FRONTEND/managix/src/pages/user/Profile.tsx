import React, { useEffect, useState } from 'react';
import { userService } from '../../api/userService';
import { resumeService, ResumeParsedDataDto, ResumeSaveProfileDto, EducationDto, ProjectDto, ExperienceDto } from '../../api/resumeService';
import { User, FileText, Shield, Upload, CheckCircle, Edit3, X, Brain, Plus, Save } from 'lucide-react';

const Profile = () => {
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
        fullName: localStorage.getItem('userName') || '', 
        email: localStorage.getItem('userEmail') || '',
        bio: '', 
        skills: '',
        phone: '',
        address: ''
    });
    
    const [message, setMessage] = useState({ type: '', text: '' });
    
    const userId = localStorage.getItem('userId');
    const role = localStorage.getItem('roleName') || localStorage.getItem('userRole');

    useEffect(() => {
        fetchProfile();
    }, []);

    useEffect(() => {
        if (userId) {
            setParsedForm(prev => ({ ...prev, userId }));
        }
    }, [userId]);

    const fetchProfile = async () => {
        if (!userId) return;
        try {
            const data = await userService.getProfile(userId);
            setUserProfile(data);
            
            // Map backend JSON to edit form
            setEditForm({
                fullName: localStorage.getItem('userName') || '',
                email: localStorage.getItem('userEmail') || '',
                bio: data.Bio || '',
                skills: data.Skills || '',
                phone: data.Phone || '',
                address: data.Address || ''
            });

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
                Bio: editForm.bio,
                Skills: editForm.skills,
                Phone: editForm.phone,
                Address: editForm.address
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

    if (!userProfile) return <div className="p-10 font-bold animate-pulse text-gray-400 uppercase">Loading Profile...</div>;

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="mb-10 flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black italic tracking-tighter uppercase">Profile Settings</h1>
                    <p className="text-gray-400 font-bold text-sm tracking-widest uppercase">Identity & AI Resume Parsing</p>
                </div>
                {!isEditing && !showParsedForm && (
                    <button 
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl font-black text-xs transition border border-gray-200"
                    >
                        <Edit3 size={14} /> EDIT DETAILS
                    </button>
                )}
            </div>

            {message.text && (
                <div className={`mb-6 p-4 rounded-2xl font-bold flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                    {message.type === 'success' && <CheckCircle size={20} />}
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {showParsedForm ? (
                        // Parsed Data Form
                        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                            <form onSubmit={handleSaveParsedData} className="space-y-6">
                                <div className="mb-6">
                                    <h2 className="text-2xl font-black text-gray-800 mb-2">Resume Parsed Data</h2>
                                    <p className="text-sm text-gray-500">Review and edit the parsed information, then click Save.</p>
                                </div>

                                {/* Personal Information */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase mb-1">Name</label>
                                        <input 
                                            className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-black outline-none"
                                            value={parsedForm.name}
                                            onChange={e => setParsedForm(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="Full Name"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase mb-1">Email</label>
                                        <input 
                                            className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-black outline-none"
                                            type="email"
                                            value={parsedForm.email}
                                            onChange={e => setParsedForm(prev => ({ ...prev, email: e.target.value }))}
                                            placeholder="email@example.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase mb-1">Phone</label>
                                        <input 
                                            className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-black outline-none"
                                            value={parsedForm.phone}
                                            onChange={e => setParsedForm(prev => ({ ...prev, phone: e.target.value }))}
                                            placeholder="+1234567890"
                                        />
                                    </div>
                                </div>

                                {/* Summary */}
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase mb-1">Professional Summary</label>
                                    <textarea 
                                        className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-black outline-none h-32"
                                        value={parsedForm.summary}
                                        onChange={e => setParsedForm(prev => ({ ...prev, summary: e.target.value }))}
                                        placeholder="Professional summary..."
                                    />
                                </div>

                                {/* Education */}
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase">Education</label>
                                        <button type="button" onClick={addEducation} className="text-blue-600 hover:text-blue-700">
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                    {parsedForm.education.map((edu, index) => (
                                        <div key={index} className="mb-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                            <div className="flex justify-end mb-2">
                                                <button type="button" onClick={() => removeEducation(index)} className="text-red-600 hover:text-red-700">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <input 
                                                    className="p-3 bg-white border-none rounded-xl font-bold focus:ring-2 focus:ring-black outline-none text-sm"
                                                    placeholder="Degree"
                                                    value={edu.degree || ''}
                                                    onChange={e => updateEducation(index, 'degree', e.target.value)}
                                                />
                                                <input 
                                                    className="p-3 bg-white border-none rounded-xl font-bold focus:ring-2 focus:ring-black outline-none text-sm"
                                                    placeholder="Institution"
                                                    value={edu.institution || ''}
                                                    onChange={e => updateEducation(index, 'institution', e.target.value)}
                                                />
                                                <input 
                                                    className="p-3 bg-white border-none rounded-xl font-bold focus:ring-2 focus:ring-black outline-none text-sm"
                                                    placeholder="Year"
                                                    value={edu.year || ''}
                                                    onChange={e => updateEducation(index, 'year', e.target.value)}
                                                />
                                                <textarea 
                                                    className="p-3 bg-white border-none rounded-xl font-bold focus:ring-2 focus:ring-black outline-none text-sm md:col-span-2"
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
                                        <label className="text-[10px] font-black text-gray-400 uppercase">Skills</label>
                                        <button type="button" onClick={addSkill} className="text-blue-600 hover:text-blue-700">
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {parsedForm.skills.map((skill, index) => (
                                            <div key={index} className="flex gap-2">
                                                <input 
                                                    className="flex-1 p-3 bg-gray-50 border-none rounded-xl font-bold focus:ring-2 focus:ring-black outline-none text-sm"
                                                    placeholder="Skill name"
                                                    value={skill}
                                                    onChange={e => updateSkill(index, e.target.value)}
                                                />
                                                <button type="button" onClick={() => removeSkill(index)} className="text-red-600 hover:text-red-700">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Projects */}
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-[10px] font-black text-gray-400 uppercase">Projects</label>
                                        <button type="button" onClick={addProject} className="text-blue-600 hover:text-blue-700">
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                    {parsedForm.projects.map((proj, index) => (
                                        <div key={index} className="mb-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                            <div className="flex justify-end mb-2">
                                                <button type="button" onClick={() => removeProject(index)} className="text-red-600 hover:text-red-700">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                            <div className="space-y-3">
                                                <input 
                                                    className="w-full p-3 bg-white border-none rounded-xl font-bold focus:ring-2 focus:ring-black outline-none text-sm"
                                                    placeholder="Project Title"
                                                    value={proj.title || ''}
                                                    onChange={e => updateProject(index, 'title', e.target.value)}
                                                />
                                                <textarea 
                                                    className="w-full p-3 bg-white border-none rounded-xl font-bold focus:ring-2 focus:ring-black outline-none text-sm"
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
                                        <label className="text-[10px] font-black text-gray-400 uppercase">Work Experience</label>
                                        <button type="button" onClick={addExperience} className="text-blue-600 hover:text-blue-700">
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                    {parsedForm.experience.map((exp, index) => (
                                        <div key={index} className="mb-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                            <div className="flex justify-end mb-2">
                                                <button type="button" onClick={() => removeExperience(index)} className="text-red-600 hover:text-red-700">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <input 
                                                    className="p-3 bg-white border-none rounded-xl font-bold focus:ring-2 focus:ring-black outline-none text-sm"
                                                    placeholder="Job Title"
                                                    value={exp.title || ''}
                                                    onChange={e => updateExperience(index, 'title', e.target.value)}
                                                />
                                                <input 
                                                    className="p-3 bg-white border-none rounded-xl font-bold focus:ring-2 focus:ring-black outline-none text-sm"
                                                    placeholder="Company"
                                                    value={exp.company || ''}
                                                    onChange={e => updateExperience(index, 'company', e.target.value)}
                                                />
                                                <input 
                                                    className="p-3 bg-white border-none rounded-xl font-bold focus:ring-2 focus:ring-black outline-none text-sm md:col-span-2"
                                                    placeholder="Duration (e.g., Jan 2020 - Dec 2022)"
                                                    value={exp.duration || ''}
                                                    onChange={e => updateExperience(index, 'duration', e.target.value)}
                                                />
                                                <textarea 
                                                    className="p-3 bg-white border-none rounded-xl font-bold focus:ring-2 focus:ring-black outline-none text-sm md:col-span-2"
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
                                        className="bg-black text-white px-8 py-4 rounded-2xl font-black text-xs uppercase hover:bg-gray-800 transition disabled:opacity-50 flex items-center gap-2"
                                    >
                                        <Save size={16} />
                                        {saving ? 'Saving...' : 'Save Profile'}
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => setShowParsedForm(false)} 
                                        className="bg-gray-100 text-gray-500 px-8 py-4 rounded-2xl font-black text-xs uppercase"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : isEditing ? (
                        // Original Edit Form
                        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                            <form onSubmit={handleUpdateProfile} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase mb-1">Professional Bio</label>
                                        <textarea 
                                            className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-black outline-none h-24"
                                            value={editForm.bio}
                                            onChange={e => setEditForm({...editForm, bio: e.target.value})}
                                            placeholder="Briefly describe your experience..."
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase mb-1">Skills (Comma Separated)</label>
                                        <input 
                                            className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-black outline-none"
                                            value={editForm.skills}
                                            onChange={e => setEditForm({...editForm, skills: e.target.value})}
                                            placeholder="React, C#, SQL..."
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase mb-1">Phone Number</label>
                                        <input 
                                            className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-black outline-none"
                                            value={editForm.phone}
                                            onChange={e => setEditForm({...editForm, phone: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button type="submit" className="bg-black text-white px-8 py-4 rounded-2xl font-black text-xs uppercase hover:bg-gray-800 transition">Save Profile</button>
                                    <button type="button" onClick={() => setIsEditing(false)} className="bg-gray-100 text-gray-500 px-8 py-4 rounded-2xl font-black text-xs uppercase">Cancel</button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        // Original Display View
                        <>
                            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                                <div className="flex items-center gap-5 mb-10 pb-10 border-b border-gray-50">
                                    <div className="h-20 w-20 bg-black rounded-[2rem] flex items-center justify-center text-white text-3xl font-black italic shadow-lg">
                                        {editForm.fullName?.charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black text-gray-800 tracking-tighter">{editForm.fullName}</h2>
                                        <div className="flex gap-2 items-center mt-1">
                                            <span className="px-3 py-1 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest">
                                                {role}
                                            </span>
                                            <span className="px-3 py-1 bg-green-50 text-green-600 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                                                <Shield size={10} /> Verified
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="md:col-span-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Professional Summary</label>
                                        <p className="text-gray-700 font-medium leading-relaxed bg-gray-50 p-6 rounded-3xl italic border border-gray-100">
                                            "{userProfile.Bio || userProfile.Summary || "No bio available. Update your profile to add one."}"
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-3">Technical Expertise</label>
                                        <div className="flex flex-wrap gap-2">
                                            {userProfile.Skills ? userProfile.Skills.split(',').map((s: string) => (
                                                <span key={s} className="px-4 py-2 bg-white border-2 border-gray-100 text-gray-800 rounded-xl text-xs font-black uppercase tracking-tight">
                                                    {s.trim()}
                                                </span>
                                            )) : (
                                                <div className="flex items-center gap-2 text-gray-400 text-xs font-bold italic">
                                                    <Brain size={14} /> AI parsing pending resume upload...
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Phone</label>
                                            <p className="font-bold text-gray-800">{userProfile.Phone || 'Not Provided'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="lg:col-span-1">
                    {(role === 'Employee' || role === 'Manager' || role === 'QA') && !showParsedForm && (
                        <div className="bg-black text-white p-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
                            <div className="relative z-10">
                                <div className="h-12 w-12 bg-gray-800 rounded-2xl flex items-center justify-center mb-6">
                                    <FileText className="text-blue-400" size={24} />
                                </div>
                                <h3 className="text-2xl font-black mb-2 italic tracking-tighter">AI RESUME PARSER</h3>
                                <p className="text-sm text-gray-400 font-medium mb-8 leading-relaxed">
                                    Upload your resume to let our AI automatically detect your skills and match you to tasks.
                                </p>

                                <form onSubmit={handleUpload} className="space-y-4">
                                    <div className="group border-2 border-dashed border-gray-700 rounded-3xl p-8 text-center hover:border-blue-500 transition-all cursor-pointer relative bg-gray-900/50">
                                        <input 
                                            type="file" 
                                            className="absolute inset-0 opacity-0 cursor-pointer" 
                                            onChange={(e) => {
                                                if (e.target.files) setFile(e.target.files[0]);
                                            }}
                                            accept=".pdf,.doc,.docx"
                                            disabled={parsing}
                                        />
                                        <Upload className="mx-auto mb-3 text-gray-600 group-hover:text-blue-400 transition-colors" size={32} />
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                            {file ? file.name : "Drop Resume Here"}
                                        </p>
                                    </div>
                                    <button 
                                        type="submit"
                                        disabled={!file || parsing}
                                        className="w-full bg-blue-600 text-white font-black py-5 rounded-3xl hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/20 disabled:opacity-50 disabled:bg-gray-800 uppercase text-xs tracking-widest"
                                    >
                                        {parsing ? "Parsing..." : "Process with AI"}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                    {!(role === 'Employee' || role === 'Manager') && !showParsedForm && (
                        <div className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest">Employee Access</h3>
                            <p className="text-xs text-gray-500 leading-relaxed font-bold italic">
                                Resume uploading is reserved for the Employee role to facilitate AI-driven task allocation.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;
