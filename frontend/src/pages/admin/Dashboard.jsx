import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Users, BookOpen, Download, LayoutDashboard, Loader2, Award, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminSidebar from '../../components/AdminSidebar';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await api.get('/admin/analytics');
        if (response.data.success) {
          setData(response.data.data);
        }
      } catch (error) {
        toast.error("Failed to fetch analytics");
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const handleDownload = async (type) => {
    try {
      toast.success(`Generated Request for ${type} Report..`, { icon: '⏳' });
      // Direct window location binding for download since axios converts blobs if we don't setup arrayBuffers
      const userObj = JSON.parse(localStorage.getItem('sadas_user'));
      window.location.href = `http://localhost:5000/api/admin/reports/${type}?token=${userObj.token}`;
      setTimeout(() => toast.success('Download Initiated!'), 1500);
    } catch(err) {
      toast.error("Download failed.");
    }
  }

  if (loading || !data) {
    return <div className="h-screen flex items-center justify-center text-purple-600"><Loader2 className="animate-spin w-12 h-12" /></div>;
  }

  const { summary, topStudents, departmentDistribution } = data;

  const deptChartData = {
    labels: departmentDistribution.map(d => d.department),
    datasets: [{
      label: 'Students',
      data: departmentDistribution.map(d => d.count),
      backgroundColor: [
        'rgba(99, 102, 241, 0.8)',
        'rgba(168, 85, 247, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(236, 72, 153, 0.8)'
      ],
      borderWidth: 0,
    }]
  };

  return (
    <div className="min-h-screen bg-gray-100 flex font-outfit">
      
      <AdminSidebar />

      {/* Main Board */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b px-8 py-5 flex justify-between items-center sticky top-0 z-40">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Institute Overview</h1>
            <p className="text-sm text-gray-500">Live Statistics & Accolades Tracking</p>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => handleDownload('excel')} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium shadow-md transition flex items-center gap-2 text-sm">
               <Download size={16}/> Excel DB
            </button>
            <button onClick={() => handleDownload('pdf')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-md transition flex items-center gap-2 text-sm">
               <Download size={16}/> PDF Report
            </button>
          </div>
        </header>

        {/* Content Matrix */}
        <div className="p-8 space-y-8 flex-1">
          
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "Total Students", value: summary.totalStudents, c: "blue" },
              { title: "Total Activities", value: summary.totalActivities, c: "indigo" },
              { title: "Internships", value: summary.totalInternships, c: "purple" },
              { title: "Certifications", value: summary.totalCertifications, c: "pink" }
            ].map((s, idx) => (
              <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
                <div className={`absolute top-0 left-0 w-1 h-full bg-${s.c}-500 transform origin-left transition-transform group-hover:scale-x-[4]`} />
                <p className="text-gray-500 text-sm font-medium ml-2">{s.title}</p>
                <h3 className={`text-4xl font-bold mt-2 ml-2 text-gray-800`}>{s.value}</h3>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 align-top">
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-1">
              <h3 className="font-bold text-gray-800 mb-6 border-b pb-2">Department Spread</h3>
              <div className="relative h-[280px]">
                <Doughnut data={deptChartData} options={{ maintainAspectRatio: false, cutout: '70%' }} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
              <h3 className="font-bold text-gray-800 mb-4 border-b pb-2 flex justify-between items-center">
                Top Performing Students
                <span className="text-xs text-indigo-500 flex items-center gap-1"><Award size={14}/> CGPA Measured</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 rounded-l-lg">Name</th>
                      <th className="px-4 py-3">Dept</th>
                      <th className="px-4 py-3">Year</th>
                      <th className="px-4 py-3">Activities</th>
                      <th className="px-4 py-3 text-right">CGPA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topStudents.map((st, i) => (
                      <tr key={i} className="border-b last:border-0 border-gray-100 hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-semibold text-gray-800">{st.name}</td>
                        <td className="px-4 py-3 text-gray-500">{st.department}</td>
                        <td className="px-4 py-3">{st.year}</td>
                        <td className="px-4 py-3">
                           <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-md text-xs font-bold">{st.activity_count}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-indigo-600">{st.cgpa}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
};

export default AdminDashboard;
