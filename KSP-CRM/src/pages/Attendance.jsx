import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import { 
  CalendarDays, Search, Building2, UserCircle, Save, 
  Clock, CheckCircle2, AlertCircle, RefreshCw, CheckSquare, MapPin, ExternalLink, Users, AlertTriangle, UserMinus
} from 'lucide-react';

const Attendance = () => {
  const { user } = useContext(AuthContext);
  
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);

  const [companyFilter, setCompanyFilter] = useState('SkyEdge Taxbucket India');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  
  const offset = new Date().getTimezoneOffset() * 60000;
  const localTodayStr = new Date(Date.now() - offset).toISOString().split('T')[0];
  const currentMonthStr = localTodayStr.substring(0, 7);

  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [sheetData, setSheetData] = useState([]);
  const [todayTeamAtt, setTodayTeamAtt] = useState([]);

  const checkIsLate = (inTimeStr, shiftStartStr) => {
    if (!inTimeStr || !shiftStartStr) return false;
    const parseTime = (timeStr) => {
      let [hStr, mStr] = timeStr.split(':');
      let h = parseInt(hStr, 10);
      let m = parseInt(mStr, 10);
      if (timeStr.toLowerCase().includes('pm') && h < 12) h += 12;
      if (timeStr.toLowerCase().includes('am') && h === 12) h = 0;
      return (h * 60) + m;
    };
    return parseTime(inTimeStr) > parseTime(shiftStartStr); 
  };

  const enforceLatePolicy = (sheet, shiftStartTime) => {
    let lateCounter = 0;
    
    return sheet.map(row => {
      const newRow = { ...row };

      if (newRow.inTime && !['Absent', 'Leave', 'Holiday', 'Weekly Off'].includes(newRow.status)) {
         
         if (!newRow.status) {
             newRow.status = 'Present';
         }

         newRow.isLate = checkIsLate(newRow.inTime, shiftStartTime);
         
         if (newRow.isLate) {
           lateCounter++; 
           
           if (lateCounter > 3) {
             if (!newRow.status || newRow.status === 'Present') {
               newRow.status = 'Half Day';
               newRow.remarks = `Auto-Half Day (Late mark #${lateCounter} > 3 allowed).`;
             }
           } else {
             if (newRow.status === 'Half Day' && newRow.remarks?.includes('Auto-Half Day')) {
               newRow.status = 'Present'; 
             }
             if (!newRow.remarks || newRow.remarks.includes('Auto-Half Day') || newRow.remarks.includes('Warning: Late entry')) {
               newRow.remarks = `Warning: Late entry (${lateCounter}/3 allowed).`;
             }
           }
         } else {
           newRow.isLate = false;
           if (newRow.remarks?.includes('Auto-Half Day') || newRow.remarks?.includes('Warning: Late entry')) {
             newRow.remarks = ''; 
             if (newRow.status === 'Half Day') newRow.status = 'Present';
           }
         }
      } else {
         newRow.isLate = false;
      }
      return newRow;
    });
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const headers = { Authorization: `Bearer ${user.token}` };
        
        const empRes = await axios.get(`${import.meta.env.VITE_API_URL}/hr/employees?company=${companyFilter}`, { headers });
        setEmployees(empRes.data || []);
        
        if (empRes.data.length > 0 && !selectedEmployee) {
          const firstActive = empRes.data.find(emp => emp.status === 'Active');
          setSelectedEmployee(firstActive ? firstActive._id : empRes.data[0]._id);
        }

        const attRes = await axios.get(`${import.meta.env.VITE_API_URL}/hr/attendance?company=${companyFilter}`, { headers });
        const todaysRecords = attRes.data.filter(a => a.date && a.date.startsWith(localTodayStr));
        setTodayTeamAtt(todaysRecords);

      } catch (error) {
        toast.error("Failed to load company data");
      }
    };
    
    fetchInitialData();
    // eslint-disable-next-line
  }, [companyFilter, user.token]); 

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
        
        const [year, month] = selectedMonth.split('-');
        const daysInMonth = new Date(year, month, 0).getDate();
        const empDetails = employees.find(e => e._id === selectedEmployee);
        const shiftStartTime = empDetails?.shiftStartTime || '09:30';
        
        let generatedSheet = [];
        
        for (let i = 1; i <= daysInMonth; i++) {
          const dateStr = `${year}-${month}-${String(i).padStart(2, '0')}`;
          const existingRecord = res.data.find(r => r.date === dateStr || (r.date && r.date.startsWith(dateStr)));
          
          if (existingRecord) {
            generatedSheet.push({ ...existingRecord, displayDate: dateStr, isLate: existingRecord.isLate || false });
          } else {
            generatedSheet.push({
              employee: selectedEmployee,
              companyName: companyFilter,
              date: dateStr,
              displayDate: dateStr,
              inTime: '',
              outTime: '',
              inLocation: '',  
              outLocation: '', 
              totalHours: '',
              status: '', 
              remarks: '',
              isLate: false
            });
          }
        }
        
        const policyEnforcedSheet = enforceLatePolicy(generatedSheet, shiftStartTime);
        setSheetData(policyEnforcedSheet);

      } catch (error) {
        toast.error("Failed to load attendance sheet");
      } finally {
        setLoading(false);
      }
    };

    loadAttendanceSheet();
  }, [selectedEmployee, selectedMonth, companyFilter, user.token, employees]);

  const fetchCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject("Geolocation is not supported by your browser.");
      } else {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            const googleMapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
            try {
              const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
              if (res.data && res.data.display_name) {
                const addressParts = res.data.display_name.split(',');
                const shortAddress = addressParts.slice(0, 3).join(',');
                resolve(`${shortAddress}|${googleMapsLink}`);
              } else {
                resolve(`Lat: ${latitude.toFixed(2)}, Lng: ${longitude.toFixed(2)}|${googleMapsLink}`);
              }
            } catch (err) {
              resolve(`Lat: ${latitude.toFixed(2)}, Lng: ${longitude.toFixed(2)}|${googleMapsLink}`); 
            }
          },
          (error) => {
            reject("Location access denied or failed.");
          }
        );
      }
    });
  };

  const handleRowChange = (index, field, value) => {
    let updatedSheet = [...sheetData];
    updatedSheet[index][field] = value;

    const empDetails = employees.find(e => e._id === selectedEmployee);
    const shiftStartTime = empDetails?.shiftStartTime || '09:30';

    if (field === 'inTime' || field === 'outTime') {
      const inT = updatedSheet[index].inTime;
      const outT = updatedSheet[index].outTime;
      if (inT && outT) {
        const [inH, inM] = inT.split(':').map(Number);
        const [outH, outM] = outT.split(':').map(Number);
        let diffMins = (outH * 60 + outM) - (inH * 60 + inM);
        if (diffMins < 0) diffMins += 24 * 60; 
        const h = Math.floor(diffMins / 60);
        const m = diffMins % 60;
        updatedSheet[index].totalHours = `${h}h ${m}m`;
      } else {
        updatedSheet[index].totalHours = '';
      }
    }

    if (field === 'status') {
      if (['Absent', 'Leave', 'Holiday', 'Weekly Off'].includes(value)) {
        updatedSheet[index].inTime = '';
        updatedSheet[index].outTime = '';
        updatedSheet[index].inLocation = '';
        updatedSheet[index].outLocation = '';
        updatedSheet[index].totalHours = '';
        updatedSheet[index].isLate = false;
      }
    }

    updatedSheet = enforceLatePolicy(updatedSheet, shiftStartTime);
    setSheetData(updatedSheet);

    if (field === 'inTime' && value !== '') {
       setFetchingLocation(true);
       fetchCurrentLocation().then(loc => {
           setSheetData(prev => {
               const newSheet = [...prev];
               newSheet[index].inLocation = loc;
               return newSheet;
           });
           toast.success("Check-In location captured!");
       }).catch(err => toast.error(err)).finally(() => setFetchingLocation(false));
    }
    
    if (field === 'outTime' && value !== '') {
       setFetchingLocation(true);
       fetchCurrentLocation().then(loc => {
           setSheetData(prev => {
               const newSheet = [...prev];
               newSheet[index].outLocation = loc;
               return newSheet;
           });
           toast.success("Check-Out location captured!");
       }).catch(err => toast.error(err)).finally(() => setFetchingLocation(false));
    }
  };

  const markRemainingPresent = () => {
    const empDetails = employees.find(e => e._id === selectedEmployee);
    const shiftStartTime = empDetails?.shiftStartTime || '09:30';

    let updated = sheetData.map(row => {
      if (!row.status) {
        return { 
          ...row, 
          status: 'Present', 
          inTime: shiftStartTime, 
          outTime: '18:30', 
          totalHours: '9h 0m',
          inLocation: 'System Generated',
          outLocation: 'System Generated'
        };
      }
      return row;
    });

    updated = enforceLatePolicy(updated, shiftStartTime);
    setSheetData(updated);
    toast.success("Remaining days marked as Present");
  };

  const handleSave = async () => {
    if (sheetData.length === 0) return;
    setSaving(true);
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const recordsToSave = sheetData.filter(row => row.status);
      
      if (recordsToSave.length === 0) {
        toast.error("Please fill at least one status before saving.");
        setSaving(false);
        return;
      }

      await axios.post(`${import.meta.env.VITE_API_URL}/hr/attendance`, { records: recordsToSave }, { headers });
      toast.success("Monthly Attendance & Locations Saved Successfully!");
      
      const attRes = await axios.get(`${import.meta.env.VITE_API_URL}/hr/attendance?company=${companyFilter}`, { headers });
      const todaysRecords = attRes.data.filter(a => a.date && a.date.startsWith(localTodayStr));
      setTodayTeamAtt(todaysRecords);

    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  const summary = useMemo(() => {
    let totalDays = sheetData.length;
    let present = 0, absent = 0, halfDay = 0, leave = 0, wfh = 0, holiday = 0, weeklyOff = 0;
    let totalLateMarks = 0;

    sheetData.forEach(row => {
      if (row.status === 'Present') present++;
      else if (row.status === 'Absent') absent++;
      else if (row.status === 'Half Day') halfDay++;
      else if (row.status === 'Leave') leave++;
      else if (row.status === 'WFH') wfh++;
      else if (row.status === 'Holiday') holiday++;
      else if (row.status === 'Weekly Off') weeklyOff++;

      if (row.isLate) totalLateMarks++;
    });

    const paidDays = present + wfh + holiday + weeklyOff + (halfDay * 0.5);
    const lopDays = absent + leave + (halfDay * 0.5); 

    return { totalDays, present, absent, halfDay, leave, wfh, holiday, weeklyOff, paidDays, lopDays, totalLateMarks };
  }, [sheetData]);

  const teamTodayStats = useMemo(() => {
    let present = [];
    let absent = [];
    let notMarked = [];

    const activeEmps = employees.filter(e => e.status === 'Active');

    activeEmps.forEach(emp => {
      const record = todayTeamAtt.find(a => {
          const recordEmpId = a.employee._id ? a.employee._id : a.employee;
          return recordEmpId === emp._id;
      });

      if (record) {
        if (['Present', 'WFH', 'Half Day'].includes(record.status)) {
            present.push({ ...emp, status: record.status, inTime: record.inTime });
        } else if (['Absent', 'Leave', 'Weekly Off', 'Holiday'].includes(record.status)) {
            absent.push({ ...emp, status: record.status });
        } else {
            notMarked.push(emp);
        }
      } else {
        notMarked.push(emp);
      }
    });

    return { present, absent, notMarked };
  }, [employees, todayTeamAtt]);

  const getDayName = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
  };

  const renderLocationDisplay = (locStr, prefix) => {
    if (!locStr || locStr === 'System Generated') {
      return (
        <span className="truncate">
          <span className={prefix === 'IN' ? 'text-blue-500' : 'text-amber-500'}>{prefix}:</span> {locStr || '-'}
        </span>
      );
    }
    const [address, link] = locStr.split('|');
    return (
      <div className="flex flex-col">
        <span className="truncate" title={address}>
          <span className={prefix === 'IN' ? 'text-blue-500' : 'text-amber-500'}>{prefix}:</span> {address}
        </span>
      </div>
    );
  };

  const activeEmployeeData = employees.find(e => e._id === selectedEmployee);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 pb-0 relative">
      <Toaster position="top-right" />

      {fetchingLocation && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
               <div className="bg-white p-6 rounded-2xl flex flex-col items-center shadow-xl">
                   <MapPin className="animate-bounce text-blue-500 mb-2" size={32} />
                   <p className="text-slate-800 font-bold">Capturing Location Coordinates...</p>
                   <p className="text-xs text-slate-500 mt-1">Please allow location access if prompted.</p>
               </div>
          </div>
      )}

      {/* 1. HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <CalendarDays size={28} className="text-blue-600" /> Attendance & Tracking
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Track daily in/out time, GPS location, and automatic late marks.</p>
        </div>
      </div>

      {/* 2. TODAY'S TEAM STATUS */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Users size={18} className="text-blue-600" /> Today's Team Status ({new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="border border-emerald-100 bg-emerald-50/40 rounded-2xl p-4">
                 <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3 border-b border-emerald-100 pb-2 flex justify-between items-center">
                    Present & WFH <span className="bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-md">{teamTodayStats.present.length}</span>
                 </h4>
                 <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                     {teamTodayStats.present.map(e => (
                         <div key={e._id} className="flex justify-between items-center bg-white px-3 py-2 rounded-lg shadow-sm border border-emerald-50 text-[11px] font-medium text-slate-700">
                             <span className="truncate pr-2">{e.name}</span>
                             <span className="text-emerald-600 font-bold shrink-0">{e.status} {e.inTime && <span className="text-emerald-400 font-mono ml-1">({e.inTime})</span>}</span>
                         </div>
                     ))}
                 </div>
              </div>

              <div className="border border-rose-100 bg-rose-50/40 rounded-2xl p-4">
                 <h4 className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-3 border-b border-rose-100 pb-2 flex justify-between items-center">
                    Absent & Leave <span className="bg-rose-200 text-rose-800 px-2 py-0.5 rounded-md">{teamTodayStats.absent.length}</span>
                 </h4>
                 <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                     {teamTodayStats.absent.map(e => (
                         <div key={e._id} className="flex justify-between items-center bg-white px-3 py-2 rounded-lg shadow-sm border border-rose-50 text-[11px] font-medium text-slate-700">
                             <span className="truncate pr-2">{e.name}</span>
                             <span className="text-rose-600 font-bold shrink-0">{e.status}</span>
                         </div>
                     ))}
                 </div>
              </div>

              <div className="border border-slate-200 bg-slate-50/50 rounded-2xl p-4">
                 <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 border-b border-slate-200 pb-2 flex justify-between items-center">
                    Not Marked <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md">{teamTodayStats.notMarked.length}</span>
                 </h4>
                 <div className="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto custom-scrollbar content-start">
                     {teamTodayStats.notMarked.map(e => (
                         <span key={e._id} className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-600 shadow-sm">{e.name}</span>
                     ))}
                 </div>
              </div>
          </div>
      </div>

      {/* 3. STICKY COMMAND CENTER (Sticks to top of screen on page scroll) */}
      <div className="sticky -top-6 z-40 px-6 -mx-6 space-y-4">
        
        {/* Controls */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="w-full md:w-2/3 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1 flex items-center gap-1"><UserCircle size={12}/> Select Employee</label>
              <div className="flex items-center gap-2">
                <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold bg-slate-50 focus:ring-2 focus:ring-blue-500/20 outline-none">
                  {employees.length === 0 ? <option value="">No Employees</option> : null}
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>
                      {emp.name} ({emp.empId}) {emp.status !== 'Active' ? `- [${emp.status.toUpperCase()}]` : ''}
                    </option>
                  ))}
                </select>
                {activeEmployeeData && (
                  <div className="bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-bold px-3 py-2 rounded-xl whitespace-nowrap" title="Shift Start Time">
                    Shift: {activeEmployeeData.shiftStartTime || '09:30'}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1 flex items-center gap-1"><Clock size={12}/> Select Month</label>
              <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold bg-slate-50 focus:ring-2 focus:ring-blue-500/20 outline-none" />
            </div>
          </div>

          <button onClick={handleSave} disabled={saving || sheetData.length === 0} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-6 py-2.5 rounded-xl shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50 mt-4 md:mt-0">
            {saving ? <RefreshCw size={18} className="animate-spin"/> : <Save size={18} strokeWidth={2.5} />} 
            Save Attendance Sheet
          </button>
        </div>

        {/* Warning if Offboarded */}
        {activeEmployeeData && activeEmployeeData.status !== 'Active' && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-4 animate-in slide-in-from-top-2">
            <div className="bg-rose-100 p-2 rounded-full text-rose-600">
              <UserMinus size={24}/>
            </div>
            <div>
              <h4 className="text-sm font-black text-rose-800 uppercase tracking-tight">Warning: Employee is {activeEmployeeData.status}</h4>
              <div className="flex items-center gap-4 mt-1 text-[11px] font-bold text-rose-600">
                {activeEmployeeData.lastWorkingDate && <span>• Last Day: {new Date(activeEmployeeData.lastWorkingDate).toLocaleDateString('en-GB')}</span>}
                {activeEmployeeData.resignationDate && <span>• Resigned: {new Date(activeEmployeeData.resignationDate).toLocaleDateString('en-GB')}</span>}
                {activeEmployeeData.noticePeriod && <span>• Notice Period: {activeEmployeeData.noticePeriod}</span>}
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        {sheetData.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="bg-slate-800 text-white p-3 rounded-2xl shadow-sm border border-slate-700">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Total Days</p>
              <h3 className="text-xl font-black mt-1">{summary.totalDays}</h3>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-blue-500">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Present</p>
              <h3 className="text-xl font-black text-blue-700 mt-1">{summary.present + summary.wfh}</h3>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-rose-500">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Absent/Leave</p>
              <h3 className="text-xl font-black text-rose-700 mt-1">{summary.absent + summary.leave}</h3>
            </div>
            <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 shadow-sm">
              <p className="text-[9px] font-bold uppercase tracking-wider text-amber-600">Late Entries</p>
              <h3 className="text-xl font-black text-amber-700 mt-1">{summary.totalLateMarks} <span className="text-[10px] text-amber-500 font-medium">/ 3 Allowed</span></h3>
            </div>
            <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-200 shadow-sm">
              <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-600">Paid Days</p>
              <h3 className="text-xl font-black text-emerald-700 mt-1">{summary.paidDays}</h3>
            </div>
            <div className="bg-rose-50 p-3 rounded-2xl border border-rose-200 shadow-sm">
              <p className="text-[9px] font-bold uppercase tracking-wider text-rose-600">LOP Days</p>
              <h3 className="text-xl font-black text-rose-700 mt-1">{summary.lopDays}</h3>
            </div>
          </div>
        )}
      </div>

      {/* 4. TABLE SECTION */}
      <div className="sticky z-40 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        
        {/* 🔴 LINE 1 (Title): Yeh bahar hai, isliye hamesha table ke upar fixed rahegi */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center z-20 shadow-sm ">
           <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
             Monthly Time & Location Sheet 
             <span className="bg-amber-100 text-amber-700 text-[9px] px-2 py-0.5 rounded font-bold uppercase ml-2 flex items-center gap-1">
               <AlertTriangle size={10}/> Auto Half-Day Active
             </span>
           </h3>
           <button onClick={markRemainingPresent} className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors border border-blue-100">
             <CheckSquare size={14}/> Mark Remaining as Present
           </button>
        </div>

        {/* 🔴 INTERNAL SCROLL CONTAINER: Isme max-height hai, taaki dates scroll hon par heding nahi */}
        <div className="overflow-auto custom-scrollbar max-h-[48vh]">
          <table className="w-full text-left border-collapse min-w-[1000px] relative">
            
            {/* 🔴 LINE 2 (Headers): Sticky Top */}
            <thead className="sticky top-0 z-10 shadow-sm">
              <tr className="border-b border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider">
                <th className="py-3 px-4 w-28 bg-slate-100">Date</th>
                <th className="py-3 px-4 w-36 bg-slate-100">Status</th>
                <th className="py-3 px-4 w-28 bg-slate-100">In Time</th>
                <th className="py-3 px-4 w-28 bg-slate-100">Out Time</th>
                <th className="py-3 px-4 w-48 bg-slate-100">GPS Location Info</th>
                <th className="py-3 px-4 w-24 bg-slate-100">Total Hrs</th>
                <th className="py-3 px-4 bg-slate-100">Remarks / Auto-Notes</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
              {loading ? (
                <tr><td colSpan="7" className="text-center py-16 text-slate-400"><RefreshCw className="animate-spin inline-block mr-2" size={18}/> Generating Sheet...</td></tr>
              ) : sheetData.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-16 text-slate-400 flex flex-col items-center"><AlertCircle size={36} className="mb-3 text-slate-300"/> Select an employee and month to view sheet.</td></tr>
              ) : (
                sheetData.map((row, index) => {
                  const dayName = getDayName(row.displayDate);
                  const isWeekend = dayName === 'Sat' || dayName === 'Sun';

                  return (
                    <tr key={row.displayDate} className={`hover:bg-slate-50/50 transition-colors ${isWeekend ? 'bg-slate-50/80' : ''} ${row.isLate ? 'bg-amber-50/30' : ''}`}>
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
                            row.status === 'Half Day' ? 'border-amber-300 bg-amber-100 text-amber-800' :
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
                      <td className="py-2 px-4 relative">
                        <input 
                          type="time" 
                          value={row.inTime || ''} 
                          onChange={(e) => handleRowChange(index, 'inTime', e.target.value)} 
                          disabled={['Absent', 'Leave', 'Holiday', 'Weekly Off'].includes(row.status)}
                          className={`w-full p-1.5 border rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:bg-slate-100 ${row.isLate ? 'border-rose-300 text-rose-700 bg-rose-50' : 'border-slate-200'}`}
                        />
                        {row.isLate && <span className="absolute top-0 right-3 text-[8px] bg-rose-600 text-white px-1 rounded-sm z-0">LATE</span>}
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
                          <div className="flex flex-col gap-1.5 text-[9px] font-bold text-slate-500">
                              <div className="bg-slate-100 px-2 py-1.5 rounded border border-slate-200">
                                  {renderLocationDisplay(row.inLocation, 'IN')}
                              </div>
                              <div className="bg-slate-100 px-2 py-1.5 rounded border border-slate-200">
                                  {renderLocationDisplay(row.outLocation, 'OUT')}
                              </div>
                          </div>
                      </td>

                      <td className="py-2 px-4">
                        <div className="font-mono text-xs font-bold text-slate-700 bg-slate-100 p-1.5 rounded-lg text-center border border-slate-200 min-h-[28px] flex items-center justify-center">
                          {row.totalHours || '-'}
                        </div>
                      </td>
                      <td className="py-2 px-4">
                        <input 
                          type="text" 
                          placeholder="Note..." 
                          value={row.remarks || ''} 
                          onChange={(e) => handleRowChange(index, 'remarks', e.target.value)} 
                          className={`w-full p-1.5 border rounded-lg text-[11px] font-medium focus:ring-2 focus:ring-blue-500/20 ${row.isLate ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-200'}`}
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