import React, { useEffect, useState } from 'react';
import { userService } from '../../api/userService';
import { User, FileText, Shield, Upload, CheckCircle, Edit3, X, Brain } from 'lucide-react';

const Profile = () => {
    const [userProfile, setUserProfile] = useState<any>(null);
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    
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

    setUploading(true);
    try {
        // Convert file to Base64 string
        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onload = async () => {
            const base64String = (reader.result as string).split(',')[1]; // Remove metadata prefix

            // Send as JSON object, not FormData
            const payload = {
                userId: userId,
                resume: base64String 
            };

            await userService.uploadResume(payload);
            
            setMessage({ type: 'success', text: 'Resume uploaded! AI is parsing your skills.' });
            setFile(null);
            setTimeout(fetchProfile, 3000);
        };
    } catch (err) {
        setMessage({ type: 'error', text: 'Resume upload failed.' });
    } finally {
        setUploading(false);
    }
};

    if (!userProfile) return <div className="p-10 font-bold animate-pulse text-gray-400 uppercase">Loading Profile...</div>;

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="mb-10 flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black italic tracking-tighter uppercase">Profile Settings</h1>
                    <p className="text-gray-400 font-bold text-sm tracking-widest uppercase">Scenario Step 3: Identity & AI Skill Parsing</p>
                </div>
                {!isEditing && (
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
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                        {isEditing ? (
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
                        ) : (
                            <>
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
                                            "{userProfile.Bio || "No bio available. Update your profile to add one."}"
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
                                        {/* <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Email</label>
                                            <p className="font-bold text-gray-800">{editForm.email}</p>
                                        </div> */}
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Phone</label>
                                            <p className="font-bold text-gray-800">{userProfile.Phone || 'Not Provided'}</p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-1">
                    {role === 'Employee' ? (
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
                                        />
                                        <Upload className="mx-auto mb-3 text-gray-600 group-hover:text-blue-400 transition-colors" size={32} />
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                            {file ? file.name : "Drop Resume Here"}
                                        </p>
                                    </div>
                                    <button 
                                        type="submit"
                                        disabled={!file || uploading}
                                        className="w-full bg-blue-600 text-white font-black py-5 rounded-3xl hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/20 disabled:opacity-50 disabled:bg-gray-800 uppercase text-xs tracking-widest"
                                    >
                                        {uploading ? "Analyzing..." : "Process with AI"}
                                    </button>
                                </form>
                            </div>
                        </div>
                    ) : (
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