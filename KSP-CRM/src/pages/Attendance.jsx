import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import { 
  CalendarDays, Search, Building2, UserCircle, Save, 
  Clock, CheckCircle2, AlertCircle, RefreshCw, CheckSquare
} from 'lucide-react';

const Attendance = () => {
  const { user } = useContext(AuthContext);
  
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filters
  const [companyFilter, setCompanyFilter] = useState('SkyEdge Taxbucket India');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  
  // Default to Current Month (YYYY-MM)
  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  const [sheetData, setSheetData] = useState([]);

  // 1. Fetch Employees by Company
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const headers = { Authorization: `Bearer ${user.token}` };
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/hr/employees?company=${companyFilter}`, { headers });
        const activeEmps = res.data.filter(emp => emp.status === 'Active');
        setEmployees(activeEmps);
        if (activeEmps.length > 0) {
          setSelectedEmployee(activeEmps[0]._id);
        } else {
          setSelectedEmployee('');
        }
      } catch (error) {
        toast.error("Failed to load employees");
      }
    };
    fetchEmployees();
  }, [companyFilter, user.token]);

  // 2. Fetch Attendance Sheet Data for selected Employee & Month
  useEffect(() => {
    const loadAttendanceSheet = async () => {
      if (!selectedEmployee || !selectedMonth) {
        setSheetData([]);
        return;
      }
      setLoading(true);
      try {
        const headers = { Authorization: `Bearer ${user.token}` };
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/hr/attendance?employee=${selectedEmployee}&company=${companyFilter}`, { headers });
        
        // Find days in selected month
        const [year, month] = selectedMonth.split('-');
        const daysInMonth = new Date(year, month, 0).getDate();
        
        const generatedSheet = [];
        
        for (let i = 1; i <= daysInMonth; i++) {
          const dateStr = `${year}-${month}-${String(i).padStart(2, '0')}`; // YYYY-MM-DD
          
          // Check if record exists in backend for this date
          const existingRecord = res.data.find(r => r.date && r.date.startsWith(dateStr));
          
          if (existingRecord) {
            generatedSheet.push({ ...existingRecord, displayDate: dateStr });
          } else {
            // Default Empty Row
            generatedSheet.push({
              employee: selectedEmployee,
              companyName: companyFilter,
              date: dateStr,
              displayDate: dateStr,
              inTime: '',
              outTime: '',
              totalHours: '',
              status: '', 
              remarks: ''
            });
          }
        }
        setSheetData(generatedSheet);
      } catch (error) {
        toast.error("Failed to load attendance sheet");
      } finally {
        setLoading(false);
      }
    };

    loadAttendanceSheet();
  }, [selectedEmployee, selectedMonth, companyFilter, user.token]);

  // Handle Row Changes & Auto Calculate Time
  const handleRowChange = (index, field, value) => {
    const updatedSheet = [...sheetData];
    updatedSheet[index][field] = value;

    // Auto calculate Total Hours if In Time and Out Time are provided
    if (field === 'inTime' || field === 'outTime') {
      const inT = updatedSheet[index].inTime;
      const outT = updatedSheet[index].outTime;
      
      if (inT && outT) {
        const [inH, inM] = inT.split(':').map(Number);
        const [outH, outM] = outT.split(':').map(Number);
        
        let diffMins = (outH * 60 + outM) - (inH * 60 + inM);
        if (diffMins < 0) diffMins += 24 * 60; // Handle overnight shifts
        
        const h = Math.floor(diffMins / 60);
        const m = diffMins % 60;
        updatedSheet[index].totalHours = `${h}h ${m}m`;
      } else {
        updatedSheet[index].totalHours = '';
      }
    }

    // Auto clear time if absent/leave[cite: 7]
    if (field === 'status') {
      if (['Absent', 'Leave', 'Holiday', 'Weekly Off'].includes(value)) {
        updatedSheet[index].inTime = '';
        updatedSheet[index].outTime = '';
        updatedSheet[index].totalHours = '';
      }
    }

    setSheetData(updatedSheet);
  };

  // Bulk Mark Present
  const markRemainingPresent = () => {
    const updated = sheetData.map(row => {
      if (!row.status) {
        return { ...row, status: 'Present', inTime: '09:30', outTime: '18:30', totalHours: '9h 0m' };
      }
      return row;
    });
    setSheetData(updated);
    toast.success("Remaining days marked as Present");
  };

  // Save Attendance to Backend
  const handleSave = async () => {
    if (sheetData.length === 0) return;
    setSaving(true);
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      // Filter out rows that have no status selected (don't save empty rows)
      const recordsToSave = sheetData.filter(row => row.status);
      
      if (recordsToSave.length === 0) {
        toast.error("Please fill at least one status before saving.");
        setSaving(false);
        return;
      }

      await axios.post(`${import.meta.env.VITE_API_URL}/hr/attendance`, { records: recordsToSave }, { headers });
      toast.success("Monthly Attendance Saved Successfully!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  // Calculate Monthly Summary Dynamically[cite: 7]
  const summary = useMemo(() => {
    let totalDays = sheetData.length;
    let present = 0, absent = 0, halfDay = 0, leave = 0, wfh = 0, holiday = 0, weeklyOff = 0;

    sheetData.forEach(row => {
      if (row.status === 'Present') present++;
      else if (row.status === 'Absent') absent++;
      else if (row.status === 'Half Day') halfDay++;
      else if (row.status === 'Leave') leave++;
      else if (row.status === 'WFH') wfh++;
      else if (row.status === 'Holiday') holiday++;
      else if (row.status === 'Weekly Off') weeklyOff++;
    });

    // Formula Rules for Paid/LOP Days[cite: 7]
    const paidDays = present + wfh + holiday + weeklyOff + (halfDay * 0.5);
    const lopDays = absent + leave + (halfDay * 0.5); // Assuming Leaves are unpaid for LOP calculation

    return { totalDays, present, absent, halfDay, leave, wfh, holiday, weeklyOff, paidDays, lopDays };
  }, [sheetData]);

  // Utility to get Day name from Date
  const getDayName = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 pb-12">
      <Toaster position="top-right" />

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <CalendarDays size={28} className="text-blue-600" /> Attendance Management
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Track daily in/out time and generate monthly attendance sheets.</p>
        </div>
        <button onClick={handleSave} disabled={saving || sheetData.length === 0} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-6 py-2.5 rounded-xl shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50">
          {saving ? <RefreshCw size={18} className="animate-spin"/> : <Save size={18} strokeWidth={2.5} />} 
          Save Attendance Sheet
        </button>
      </div>

      {/* CONFIGURATION BAR */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row gap-4 items-center">
        <div className="w-full md:w-1/3">
          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1 flex items-center gap-1"><Building2 size={12}/> Select Company</label>
          <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold bg-slate-50 focus:ring-2 focus:ring-blue-500/20 outline-none">
            <option value="SkyEdge Taxbucket India">SkyEdge Taxbucket India</option>
            <option value="Other Company">Other Company</option>
          </select>
        </div>
        
        <div className="w-full md:w-1/3">
          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1 flex items-center gap-1"><UserCircle size={12}/> Select Employee</label>
          <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold bg-slate-50 focus:ring-2 focus:ring-blue-500/20 outline-none">
            {employees.length === 0 ? <option value="">No Active Employees</option> : null}
            {employees.map(emp => (
              <option key={emp._id} value={emp._id}>{emp.name} ({emp.empId})</option>
            ))}
          </select>
        </div>

        <div className="w-full md:w-1/3">
          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1 flex items-center gap-1"><Clock size={12}/> Select Month</label>
          <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold bg-slate-50 focus:ring-2 focus:ring-blue-500/20 outline-none" />
        </div>
      </div>

      {/* MONTHLY SUMMARY CARDS[cite: 7] */}
      {sheetData.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-slate-800 text-white p-4 rounded-2xl shadow-sm border border-slate-700">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Days</p>
            <h3 className="text-2xl font-black mt-1">{summary.totalDays}</h3>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-blue-500">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Present & WFH</p>
            <h3 className="text-2xl font-black text-blue-700 mt-1">{summary.present + summary.wfh}</h3>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-rose-500">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Absent / Leave</p>
            <h3 className="text-2xl font-black text-rose-700 mt-1">{summary.absent + summary.leave}</h3>
          </div>
          <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Total Paid Days</p>
            <h3 className="text-2xl font-black text-emerald-700 mt-1">{summary.paidDays}</h3>
          </div>
          <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Total LOP Days</p>
            <h3 className="text-2xl font-black text-rose-700 mt-1">{summary.lopDays}</h3>
          </div>
        </div>
      )}

      {/* ATTENDANCE SHEET TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        
        {/* Table Header Action */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
           <h3 className="text-sm font-bold text-slate-700">Monthly Time Sheet</h3>
           <button onClick={markRemainingPresent} className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors border border-blue-100">
             <CheckSquare size={14}/> Mark Remaining as Present
           </button>
        </div>

        {/* Table Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider">
                <th className="py-3 px-4 w-28">Date</th>
                <th className="py-3 px-4 w-40">Status</th>
                <th className="py-3 px-4 w-32">In Time</th>
                <th className="py-3 px-4 w-32">Out Time</th>
                <th className="py-3 px-4 w-32">Total Hrs</th>
                <th className="py-3 px-4">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
              {loading ? (
                <tr><td colSpan="6" className="text-center py-16 text-slate-400"><RefreshCw className="animate-spin inline-block mr-2" size={18}/> Generating Sheet...</td></tr>
              ) : sheetData.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-16 text-slate-400 flex flex-col items-center"><AlertCircle size={36} className="mb-3 text-slate-300"/> Select an employee and month to view sheet.</td></tr>
              ) : (
                sheetData.map((row, index) => {
                  const dayName = getDayName(row.displayDate);
                  const isWeekend = dayName === 'Sat' || dayName === 'Sun';

                  return (
                    <tr key={row.displayDate} className={`hover:bg-slate-50/50 transition-colors ${isWeekend ? 'bg-slate-50/80' : ''}`}>
                      <td className="py-2 px-4 whitespace-nowrap">
                        <span className="font-bold text-slate-800 mr-2">{new Date(row.displayDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isWeekend ? 'bg-rose-100 text-rose-600' : 'bg-slate-200 text-slate-500'}`}>{dayName}</span>
                      </td>
                      <td className="py-2 px-4">
                        <select 
                          value={row.status || ''} 
                          onChange={(e) => handleRowChange(index, 'status', e.target.value)} 
                          className={`w-full p-1.5 border rounded-lg text-xs font-bold shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20 ${
                            row.status === 'Present' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                            row.status === 'Absent' ? 'border-rose-200 bg-rose-50 text-rose-700' :
                            row.status === 'Weekly Off' ? 'border-slate-300 bg-slate-200 text-slate-600' :
                            row.status ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500'
                          }`}
                        >
                          <option value="" disabled>Select...</option>
                          <option value="Present">Present</option>
                          <option value="Absent">Absent</option>
                          <option value="Half Day">Half Day</option>
                          <option value="Leave">Leave</option>
                          <option value="WFH">WFH</option>
                          <option value="Holiday">Holiday</option>
                          <option value="Weekly Off">Weekly Off</option>
                        </select>
                      </td>
                      <td className="py-2 px-4">
                        <input 
                          type="time" 
                          value={row.inTime || ''} 
                          onChange={(e) => handleRowChange(index, 'inTime', e.target.value)} 
                          disabled={['Absent', 'Leave', 'Holiday', 'Weekly Off'].includes(row.status)}
                          className="w-full p-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:bg-slate-100"
                        />
                      </td>
                      <td className="py-2 px-4">
                        <input 
                          type="time" 
                          value={row.outTime || ''} 
                          onChange={(e) => handleRowChange(index, 'outTime', e.target.value)} 
                          disabled={['Absent', 'Leave', 'Holiday', 'Weekly Off'].includes(row.status)}
                          className="w-full p-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:bg-slate-100"
                        />
                      </td>
                      <td className="py-2 px-4">
                        <div className="font-mono text-xs font-bold text-slate-700 bg-slate-100 p-1.5 rounded-lg text-center border border-slate-200 min-h-[28px]">
                          {row.totalHours || '-'}
                        </div>
                      </td>
                      <td className="py-2 px-4">
                        <input 
                          type="text" 
                          placeholder="Note..." 
                          value={row.remarks || ''} 
                          onChange={(e) => handleRowChange(index, 'remarks', e.target.value)} 
                          className="w-full p-1.5 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500/20"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Attendance;