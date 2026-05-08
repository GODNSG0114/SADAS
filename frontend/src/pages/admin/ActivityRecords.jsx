import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import AdminSidebar from '../../components/AdminSidebar';
import { Loader2, Search, CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

const TYPE_LABELS = {
  'activity': 'Activity', 'field-project': 'Field Project', 'internship': 'Internship',
  'club-activity': 'Club Activity', 'sports-activity': 'Sports', 'higher-education': 'Higher Edu',
  'examination': 'Examination', 'hackathon': 'Hackathon', 'extra-curricular': 'Extra-Curricular',
};
const TYPE_COLORS = {
  'activity': 'bg-indigo-100 text-indigo-700', 'field-project': 'bg-blue-100 text-blue-700',
  'internship': 'bg-green-100 text-green-700', 'club-activity': 'bg-yellow-100 text-yellow-700',
  'sports-activity': 'bg-orange-100 text-orange-700', 'higher-education': 'bg-purple-100 text-purple-700',
  'examination': 'bg-pink-100 text-pink-700', 'hackathon': 'bg-red-100 text-red-700',
  'extra-curricular': 'bg-teal-100 text-teal-700',
};

const ActivityRecords = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Reject modal state
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const response = await api.get('/admin/activities');
      if (response.data.success) setActivities(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch activity records.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = React.useMemo(() => activities.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (a.title || '').toLowerCase().includes(q) ||
      (a.student_name || '').toLowerCase().includes(q) ||
      (a.roll_number || '').toLowerCase().includes(q) ||
      (a.department || '').toLowerCase().includes(q);
    const matchType = filterType === 'all' || a.record_type === filterType;
    const matchStatus = filterStatus === 'all' || a.verification_status === filterStatus;
    return matchSearch && matchType && matchStatus;
  }), [activities, search, filterType, filterStatus]);

  const handleUpdateStatus = async (id, record_type, newStatus, rejection_reason = null) => {
    try {
      await api.put(`/admin/activity/${id}/status`, { verification_status: newStatus, record_type, rejection_reason });
      // Refresh from server to ensure data is accurate
      await fetchActivities();
      toast.success(`Marked as ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update status.');
    }
  };

  const openRejectModal = (act) => {
    setRejectModal({ id: act.id, record_type: act.record_type, title: act.title });
    setRejectReason('');
  };

  const submitRejection = async () => {
    if (!rejectReason.trim()) { toast.error('Please provide a rejection reason.'); return; }
    await handleUpdateStatus(rejectModal.id, rejectModal.record_type, 'Rejected', rejectReason.trim());
    setRejectModal(null);
    setRejectReason('');
  };

  const renderBadge = (status) => {
    if (status === 'Approved') return <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-md text-xs font-semibold"><CheckCircle size={13}/> Approved</span>;
    if (status === 'Rejected') return <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 border border-red-100 px-2 py-1 rounded-md text-xs font-semibold"><XCircle size={13}/> Rejected</span>;
    return <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 border border-amber-100 px-2 py-1 rounded-md text-xs font-semibold"><Clock size={13}/> Pending</span>;
  };

  const pendingCount = activities.filter(a => a.verification_status === 'Pending').length;

  return (
    <div className="min-h-screen bg-gray-100 flex font-outfit">
      <AdminSidebar />
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <header className="bg-white/80 backdrop-blur-md border-b px-8 py-5 sticky top-0 z-40">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Activity Records</h1>
              <p className="text-sm text-gray-500">All student submissions across all record types</p>
            </div>
            {pendingCount > 0 && (
              <span className="bg-amber-100 text-amber-700 border border-amber-200 px-3 py-1 rounded-full text-sm font-semibold">
                {pendingCount} Pending Approval
              </span>
            )}
          </div>
        </header>

        <div className="p-8 pb-10 flex-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b flex flex-wrap gap-3 items-center justify-between bg-gray-50/50">
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setFilterType('all')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filterType === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>All Types</button>
                {Object.entries(TYPE_LABELS).map(([key, label]) => (
                  <button key={key} onClick={() => setFilterType(key)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${filterType === key ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{label}</button>
                ))}
              </div>
              <div className="flex gap-2 items-center">
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 bg-white">
                  <option value="all">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input type="text" placeholder="Search..." className="pl-9 pr-4 py-2 border rounded-xl outline-none focus:border-indigo-500 text-sm w-56 transition" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="p-12 flex justify-center text-indigo-500"><Loader2 className="animate-spin w-8 h-8" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50/80 text-gray-500 uppercase text-xs border-b">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Student</th>
                      <th className="px-4 py-3 font-semibold">Title / Record</th>
                      <th className="px-4 py-3 font-semibold">Type</th>
                      <th className="px-4 py-3 font-semibold">Document</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.length === 0 ? (
                      <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-400">No records found.</td></tr>
                    ) : filtered.map((act) => {
                      const key = `${act.record_type}-${act.id}`;
                      return (
                        <tr key={key} className="hover:bg-gray-50/50 transition">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-800">{act.student_name}</p>
                            <p className="text-xs text-gray-400">{act.roll_number || '—'} · {act.department || '—'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-indigo-900">{act.title || '—'}</p>
                            <p className="text-xs text-gray-400">{act.date || '—'}</p>
                            {act.rejection_reason && (
                              <p className="text-xs text-red-500 mt-1 italic">Reason: {act.rejection_reason}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${TYPE_COLORS[act.record_type] || 'bg-gray-100 text-gray-600'}`}>
                              {TYPE_LABELS[act.record_type] || act.record_type}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {act.certificate_url
                              ? <a href={act.certificate_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 underline text-xs font-medium"><ExternalLink size={13}/> View</a>
                              : <span className="text-gray-400 text-xs italic">None</span>}
                          </td>
                          <td className="px-4 py-3">{renderBadge(act.verification_status)}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleUpdateStatus(act.id, act.record_type, 'Approved')}
                                disabled={act.verification_status === 'Approved'}
                                className="px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-xs font-semibold disabled:opacity-40 transition border border-emerald-200/50">
                                Approve
                              </button>
                              <button
                                onClick={() => openRejectModal(act)}
                                disabled={act.verification_status === 'Rejected'}
                                className="px-3 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded text-xs font-semibold disabled:opacity-40 transition border border-red-200/50">
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="px-6 py-3 bg-gray-50/50 border-t text-xs text-gray-400">
                  Showing {filtered.length} of {activities.length} total records
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-1">Reject Submission</h3>
            <p className="text-sm text-gray-500 mb-4">"{rejectModal.title}"</p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for rejection <span className="text-red-500">*</span></label>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Explain why this record is being rejected..."
              className="w-full border rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-red-400 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setRejectModal(null)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition">Cancel</button>
              <button onClick={submitRejection} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition">Confirm Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityRecords;
