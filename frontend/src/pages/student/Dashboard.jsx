import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Book, Award, Briefcase, Activity, LogOut, Loader2, Plus, Edit3, X, Bell, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import FileUpload from '../../components/FileUpload';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const SUBMISSION_TYPES = {
  'field-project': {
    label: 'Field Project / Student Project', api: '/student/field-project',
    fields: ['year', 'project_name', 'activity', 'document_url']
  },
  'internship': {
    label: 'Internship Data', api: '/student/internship',
    fields: ['year', 'duration', 'agency_name', 'document_url']
  },
  'club-activity': {
    label: 'Club Activity', api: '/student/club-activity',
    fields: ['year', 'club_name', 'activity_name', 'duration', 'document_url']
  },
  'sports-activity': {
    label: 'Sports Activity', api: '/student/sports-activity',
    fields: ['year', 'sport_name', 'venue', 'achievement', 'document_url']
  },
  'higher-education': {
    label: 'Higher Education', api: '/student/higher-education',
    fields: ['year_of_passing', 'program_graduated', 'institution_joined', 'program_admitted']
  },
  'examination': {
    label: 'Professional Examination', api: '/student/examination',
    fields: ['year', 'registration_number', 'exam_name', 'score', 'admit_card_url', 'result_document_url']
  },
  'hackathon': {
    label: 'Hackathon', api: '/student/hackathon',
    fields: ['year', 'organization_name', 'achievement', 'project_name', 'document_url']
  },
  'extra-curricular': {
    label: 'Extra-Curricular Activity', api: '/student/extra-curricular',
    fields: ['year', 'activity_name', 'description', 'document_url']
  }
};

const FIELD_LABELS = {
  year: 'Year', project_name: 'Project Name', activity: 'Activity Type', document_url: 'Document URL',
  duration: 'Duration', agency_name: 'Agency / Company Name', club_name: 'Club Name',
  activity_name: 'Activity Name', sport_name: 'Sport Name', venue: 'Venue', achievement: 'Achievement',
  year_of_passing: 'Year of Passing', program_graduated: 'Program Graduated',
  institution_joined: 'Institution Joined', program_admitted: 'Program Admitted',
  registration_number: 'Registration Number', exam_name: 'Exam Name', score: 'Score',
  admit_card_url: 'Admit Card URL', result_document_url: 'Result Document URL',
  organization_name: 'Organization Name', description: 'Description',
};

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({});

  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitType, setSubmitType] = useState('field-project');
  const [submitForm, setSubmitForm] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit rejected record
  const [editModal, setEditModal] = useState(null); // { id, record_type, title, fields }
  const [editForm, setEditForm] = useState({});
  const [isEditing, setIsEditing] = useState(false);

  // Notifications panel
  const [showNotifications, setShowNotifications] = useState(false);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/student/dashboard');
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error("Dashboard error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      const formattedSkills = typeof profileForm.skills === 'string' 
        ? profileForm.skills.split(',').map(s => s.trim()) 
        : profileForm.skills;
        
      const res = await api.put('/student/profile', { ...profileForm, skills: formattedSkills });
      if (res.data.success) {
        toast.success('Profile updated');
        setShowEditProfile(false);
        fetchDashboard();
      }
    } catch (err) {
      toast.error('Failed to update profile');
    }
  };

  const openProfileModal = () => {
    setProfileForm({
      name: user.name,
      department: data.student.department || '',
      year: data.student.year || '',
      cgpa: data.student.cgpa || '',
      roll_number: data.student.roll_number || '',
      phone: data.student.phone || '',
      address: data.student.address || '',
      skills: data.student.skills ? data.student.skills.join(', ') : ''
    });
    setShowEditProfile(true);
  };

  const handleActivitySubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const endpoint = SUBMISSION_TYPES[submitType].api;
      const res = await api.post(endpoint, submitForm);
      if (res.data.success) {
        toast.success('Record submitted successfully!');
        setShowSubmitModal(false);
        setSubmitForm({});
        fetchDashboard();
      }
    } catch (err) {
      toast.error('Failed to submit record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (submission) => {
    const typeConfig = SUBMISSION_TYPES[submission.record_type];
    if (!typeConfig) return;
    setEditModal({ id: submission.id, record_type: submission.record_type, title: submission.title, fields: typeConfig.fields });
    setEditForm({});
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsEditing(true);
    try {
      const res = await api.put(`/student/record/${editModal.record_type}/${editModal.id}`, editForm);
      if (res.data.success) {
        toast.success('Record updated and resubmitted for approval.');
        setEditModal(null);
        setEditForm({});
        fetchDashboard();
      }
    } catch (err) {
      toast.error('Failed to update record.');
    } finally {
      setIsEditing(false);
    }
  };

  if (loading || !data) {
    return <div className="h-screen flex items-center justify-center text-indigo-500"><Loader2 className="animate-spin w-10 h-10" /></div>;
  }

  const { student, stats } = data;
  const submissions = data.submissions || [];
  const rejectedSubmissions = submissions.filter(s => s.verification_status === 'Rejected');
  const pendingSubmissions = submissions.filter(s => s.verification_status === 'Pending');

  const chartData = {
    labels: stats.activityByCategory.map(a => a.category),
    datasets: [{
      label: 'Activities',
      data: stats.activityByCategory.map(a => a.count),
      backgroundColor: 'rgba(99, 102, 241, 0.8)',
    }]
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="glass sticky top-0 z-50 flex justify-between items-center px-8 py-4">
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center gap-2">
          <Book className="text-indigo-600"/> SADAS Portal
        </h1>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowSubmitModal(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow">
            <Plus size={18} /> Add Record
          </button>
          {/* Notification Bell */}
          <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition border border-gray-200">
            <Bell size={20} />
            {rejectedSubmissions.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {rejectedSubmissions.length}
              </span>
            )}
          </button>
          <div className="flex flex-col text-right hidden sm:flex">
            <span className="font-semibold text-gray-800">{user.name}</span>
            <span className="text-xs text-gray-500">{student.department} • Year {student.year}</span>
          </div>
          <button onClick={logout} className="p-2 ml-4 rounded-lg bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-500 transition border border-gray-200">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
        
        {/* Top Info Banner */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-lg p-6 sm:p-10 text-white flex justify-between items-center relative overflow-hidden">
          <div className="z-10">
            <p className="text-indigo-100 mb-1 font-medium">Student Profile</p>
            <h2 className="text-3xl font-bold">{user.name}</h2>
            <div className="mt-4 flex gap-4 text-sm font-medium flex-wrap">
              <span className="bg-white/20 px-3 py-1 rounded-full border border-white/30 backdrop-blur-sm">Roll No: {student.roll_number || 'N/A'}</span>
              <span className="bg-white/20 px-3 py-1 rounded-full border border-white/30 backdrop-blur-sm">CGPA: {student.cgpa || 'N/A'}</span>
              {student.phone && <span className="bg-white/20 px-3 py-1 rounded-full border border-white/30 backdrop-blur-sm">Ph: {student.phone}</span>}
            </div>
          </div>
          <button onClick={openProfileModal} className="z-10 w-12 h-12 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center transition border border-white/30 text-white shadow-lg">
            <Edit3 size={20} />
          </button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="glass p-6 rounded-2xl border-t-4 border-indigo-500 flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Total Activities</p>
              <h3 className="text-3xl font-bold text-gray-800">{stats.totalActivities}</h3>
            </div>
            <div className="p-4 bg-indigo-50 rounded-full text-indigo-500"><Activity size={24}/></div>
          </div>
          
          <div className="glass p-6 rounded-2xl border-t-4 border-purple-500 flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Internships</p>
              <h3 className="text-3xl font-bold text-gray-800">{stats.totalInternships}</h3>
            </div>
            <div className="p-4 bg-purple-50 rounded-full text-purple-500"><Briefcase size={24}/></div>
          </div>
          
          <div className="glass p-6 rounded-2xl border-t-4 border-emerald-500 flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Certifications</p>
              <h3 className="text-3xl font-bold text-gray-800">{stats.totalCertifications}</h3>
            </div>
            <div className="p-4 bg-emerald-50 rounded-full text-emerald-500"><Award size={24}/></div>
          </div>
        </div>

        {/* Charts & Listings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass p-6 rounded-2xl">
            <h3 className="font-bold text-gray-800 text-lg mb-4 border-b pb-2">Activity by Category</h3>
            <div className="relative h-[300px]">
              <Bar data={chartData} options={{ maintainAspectRatio: false }} />
            </div>
          </div>

          <div className="glass p-6 rounded-2xl">
            <h3 className="font-bold text-gray-800 text-lg mb-4 border-b pb-2">Your Skills</h3>
            {student.skills && student.skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {student.skills.map((skill, idx) => (
                  <span key={idx} className="bg-gray-100 border border-gray-200 text-indigo-600 px-3 py-1 rounded-full text-sm font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No skills listed yet.</p>
            )}
          </div>
        </div>
      </main>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl relative my-8">
            <button onClick={() => setShowEditProfile(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24} /></button>
            <div className="p-6 border-b"><h2 className="text-2xl font-bold text-gray-800">Edit Profile</h2></div>
            <form onSubmit={handleProfileSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label><input type="text" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="w-full border rounded-lg p-2" required /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Roll Number (PRN)</label><input type="text" value={profileForm.roll_number} onChange={e => setProfileForm({...profileForm, roll_number: e.target.value})} className="w-full border rounded-lg p-2" required /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Department</label><input type="text" value={profileForm.department} onChange={e => setProfileForm({...profileForm, department: e.target.value})} className="w-full border rounded-lg p-2" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Year</label><input type="number" min="1" max="4" value={profileForm.year} onChange={e => setProfileForm({...profileForm, year: e.target.value})} className="w-full border rounded-lg p-2" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">CGPA</label><input type="number" step="0.01" value={profileForm.cgpa} onChange={e => setProfileForm({...profileForm, cgpa: e.target.value})} className="w-full border rounded-lg p-2" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input type="text" value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} className="w-full border rounded-lg p-2" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Address</label><textarea value={profileForm.address} onChange={e => setProfileForm({...profileForm, address: e.target.value})} className="w-full border rounded-lg p-2" rows="2"></textarea></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Skills (comma separated)</label><input type="text" value={profileForm.skills} onChange={e => setProfileForm({...profileForm, skills: e.target.value})} placeholder="React, Node, Python" className="w-full border rounded-lg p-2" /></div>
              <div className="flex justify-end pt-4"><button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700">Save Changes</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Add Record Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl relative my-8">
            <button onClick={() => setShowSubmitModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24} /></button>
            <div className="p-6 border-b"><h2 className="text-2xl font-bold text-gray-800">Add New Record</h2></div>
            <form onSubmit={handleActivitySubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Record Type</label>
                <select value={submitType} onChange={(e) => { setSubmitType(e.target.value); setSubmitForm({}); }} className="w-full border rounded-lg p-2 bg-white text-gray-800 focus:bg-white transition">
                  {Object.entries(SUBMISSION_TYPES).map(([key, info]) => (
                    <option key={key} value={key} style={{color: '#1f2937', background: '#fff'}}>{info.label}</option>
                  ))}
                </select>
              </div>
              <div className="bg-indigo-50 p-4 rounded-lg text-sm text-indigo-700 mb-4 border border-indigo-100">
                Student Name and PRN will be automatically linked to this submission.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {SUBMISSION_TYPES[submitType].fields.map((field) => {
                  const isFileField = field === 'document_url' || field === 'admit_card_url' || field === 'result_document_url';
                  return (
                    <div key={field} className={field === 'description' || isFileField ? 'sm:col-span-2' : ''}>
                      {field === 'description' ? (
                        <>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{FIELD_LABELS[field] || field.replace(/_/g, ' ')}</label>
                          <textarea required value={submitForm[field] || ''} onChange={(e) => setSubmitForm({...submitForm, [field]: e.target.value})} className="w-full border rounded-lg p-2" rows="3"></textarea>
                        </>
                      ) : isFileField ? (
                        <FileUpload
                          label={FIELD_LABELS[field] || field.replace(/_/g, ' ')}
                          value={submitForm[field] || ''}
                          onChange={(url) => setSubmitForm({...submitForm, [field]: url})}
                        />
                      ) : (
                        <>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{FIELD_LABELS[field] || field.replace(/_/g, ' ')}</label>
                          <input type="text" required value={submitForm[field] || ''} onChange={(e) => setSubmitForm({...submitForm, [field]: e.target.value})} className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500" />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end pt-4 border-t mt-6">
                <button type="submit" disabled={isSubmitting} className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {isSubmitting ? 'Submitting...' : 'Submit Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notifications Panel */}
      {showNotifications && (
        <div className="fixed inset-0 z-[90]" onClick={() => setShowNotifications(false)}>
          <div className="absolute top-16 right-4 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><Bell size={16}/> Notifications</h3>
              <button onClick={() => setShowNotifications(false)}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
              {submissions.length === 0 ? (
                <p className="p-6 text-center text-gray-400 text-sm">No submissions yet.</p>
              ) : submissions.map((s, i) => (
                <div key={i} className="p-4 hover:bg-gray-50 transition">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 text-sm">{s.title || 'Untitled'}</p>
                      <p className="text-xs text-gray-400 capitalize">{s.record_type?.replace(/-/g, ' ')}</p>
                      {s.rejection_reason && (
                        <div className="mt-1 flex items-start gap-1 text-xs text-red-600 bg-red-50 rounded p-2">
                          <AlertTriangle size={12} className="mt-0.5 shrink-0"/>
                          <span>{s.rejection_reason}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {s.verification_status === 'Approved' && <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold"><CheckCircle size={12}/> Approved</span>}
                      {s.verification_status === 'Pending' && <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-semibold"><Clock size={12}/> Pending</span>}
                      {s.verification_status === 'Rejected' && (
                        <>
                          <span className="inline-flex items-center gap-1 text-red-600 text-xs font-semibold"><XCircle size={12}/> Rejected</span>
                          <button onClick={() => { openEditModal(s); setShowNotifications(false); }} className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-md hover:bg-indigo-700 transition">
                            Edit & Resubmit
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit Record Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl relative my-8">
            <button onClick={() => setEditModal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24} /></button>
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-800">Edit Record</h2>
              <p className="text-sm text-gray-500 mt-1">Update and resubmit for approval</p>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700 flex items-center gap-2">
                <AlertTriangle size={16}/> Editing will reset status to Pending and resubmit for admin review.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {editModal.fields.map((field) => {
                  const isFileField = field === 'document_url' || field === 'admit_card_url' || field === 'result_document_url';
                  return (
                    <div key={field} className={field === 'description' || isFileField ? 'sm:col-span-2' : ''}>
                      {field === 'description' ? (
                        <>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{FIELD_LABELS[field] || field.replace(/_/g, ' ')}</label>
                          <textarea value={editForm[field] || ''} onChange={(e) => setEditForm({...editForm, [field]: e.target.value})} className="w-full border rounded-lg p-2" rows="3" placeholder="Leave blank to keep existing value"></textarea>
                        </>
                      ) : isFileField ? (
                        <FileUpload
                          label={`${FIELD_LABELS[field] || field.replace(/_/g, ' ')} (leave unchanged to keep existing)`}
                          value={editForm[field] || ''}
                          onChange={(url) => setEditForm({...editForm, [field]: url})}
                        />
                      ) : (
                        <>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{FIELD_LABELS[field] || field.replace(/_/g, ' ')}</label>
                          <input type="text" value={editForm[field] || ''} onChange={(e) => setEditForm({...editForm, [field]: e.target.value})} placeholder="Leave blank to keep existing value" className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500" />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end pt-4 border-t mt-6 gap-3">
                <button type="button" onClick={() => setEditModal(null)} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={isEditing} className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {isEditing ? 'Saving...' : 'Save & Resubmit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default StudentDashboard;
