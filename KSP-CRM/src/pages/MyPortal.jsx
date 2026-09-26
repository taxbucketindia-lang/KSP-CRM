import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import { 
  UserCircle, Building2, Briefcase, Mail, Phone, 
  Calendar, Clock, CheckCircle2, AlertCircle, Save, LogIn, LogOut, MapPin, ExternalLink, Lock
} from 'lucide-react';

const MyPortal = () => {
  const { user } = useContext(AuthContext);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  
  const [myProfile, setMyProfile] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  
  // Date Utilities
  const offset = new Date().getTimezoneOffset() * 60000;
  const localToday = new Date(Date.now() - offset).toISOString().split('T')[0];
  const currentMonthStr = localToday.substring(0, 7);

  // 🔴 LOCK STATES
  const [isStatusLocked, setIsStatusLocked] = useState(false);
  const [isInTimeLocked, setIsInTimeLocked] = useState(false);
  const [isOutTimeLocked, setIsOutTimeLocked] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false); // Enable/Disable Save button

  const [todayRecord, setTodayRecord] = useState({
    date: localToday,
    inTime: '',
    outTime: '',
    inLocation: '',
    outLocation: '',
    totalHours: '',
    status: '', // Blank initally
    remarks: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      
      const empRes = await axios.get(`${import.meta.env.VITE_API_URL}/hr/employees`, { headers });
      
      const me = empRes.data.find(emp => 
        emp.email === user.email || (emp.userId && (emp.userId._id === user._id || emp.userId === user._id))
      );

      if (me) {
        setMyProfile(me);

        const attRes = await axios.get(`${import.meta.env.VITE_API_URL}/hr/attendance?employee=${me._id}`, { headers });
        
        const thisMonthAtt = attRes.data.filter(a => a.date && a.date.startsWith(currentMonthStr));
        
        thisMonthAtt.sort((a, b) => new Date(b.date) - new Date(a.date));
        setAttendanceHistory(thisMonthAtt);

        const todayData = thisMonthAtt.find(a => a.date.startsWith(localToday));
        
        if (todayData) {
          setTodayRecord({
            date: todayData.displayDate || localToday,
            inTime: todayData.inTime || '',
            outTime: todayData.outTime || '',
            inLocation: todayData.inLocation || '',   
            outLocation: todayData.outLocation || '', 
            totalHours: todayData.totalHours || '',
            status: todayData.status || '',
            remarks: todayData.remarks || ''
          });

          // 🔴 CHECKING LOCKS BASED ON SAVED DATA
          if (todayData.status) setIsStatusLocked(true);
          if (todayData.inTime) setIsInTimeLocked(true);
          if (todayData.outTime) setIsOutTimeLocked(true);
        } else {
          // If no data exists for today, set default to Present and keep unlocked
          setTodayRecord(prev => ({ ...prev, status: 'Present' }));
        }
      }
    } catch (error) {
      toast.error("Failed to load your profile data.");
    } finally {
      setLoading(false);
      setHasUnsavedChanges(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [user]);

  // GEOLOCATION FETCH FUNCTION
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

  const handleRecordChange = (field, value) => {
    const updated = { ...todayRecord, [field]: value };
    setHasUnsavedChanges(true); // 🔴 Enable save button

    if (field === 'inTime' || field === 'outTime') {
      const inT = updated.inTime;
      const outT = updated.outTime;
      
      if (inT && outT) {
        const [inH, inM] = inT.split(':').map(Number);
        const [outH, outM] = outT.split(':').map(Number);
        
        let diffMins = (outH * 60 + outM) - (inH * 60 + inM);
        if (diffMins < 0) diffMins += 24 * 60; 
        
        const h = Math.floor(diffMins / 60);
        const m = diffMins % 60;
        updated.totalHours = `${h}h ${m}m`;
      } else {
        updated.totalHours = '';
      }
    }

    if (field === 'status' && ['Absent', 'Leave', 'Weekly Off', 'Holiday'].includes(value)) {
      updated.inTime = '';
      updated.outTime = '';
      updated.inLocation = '';  
      updated.outLocation = ''; 
      updated.totalHours = '';
    }

    setTodayRecord(updated);
  };

  const handlePunchIn = async () => {
    if (isInTimeLocked) return;
    
    const now = new Date();
    const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    
    setFetchingLocation(true);
    let locStr = '';
    try {
      locStr = await fetchCurrentLocation();
      toast.success("Check-In location captured!");
    } catch (err) {
      toast.error("Could not capture location. Ensure GPS is enabled.");
      locStr = 'Location Denied';
    }
    setFetchingLocation(false);

    const updated = { ...todayRecord, inTime: timeStr, inLocation: locStr };
    setTodayRecord(calculateHours(updated));
    setHasUnsavedChanges(true);
  };

  const handlePunchOut = async () => {
    if (isOutTimeLocked) return;

    const now = new Date();
    const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    
    setFetchingLocation(true);
    let locStr = '';
    try {
      locStr = await fetchCurrentLocation();
      toast.success("Check-Out location captured!");
    } catch (err) {
      toast.error("Could not capture location. Ensure GPS is enabled.");
      locStr = 'Location Denied';
    }
    setFetchingLocation(false);

    const updated = { ...todayRecord, outTime: timeStr, outLocation: locStr };
    setTodayRecord(calculateHours(updated));
    setHasUnsavedChanges(true);
  };

  const calculateHours = (record) => {
    if (record.inTime && record.outTime) {
      const [inH, inM] = record.inTime.split(':').map(Number);
      const [outH, outM] = record.outTime.split(':').map(Number);
      let diffMins = (outH * 60 + outM) - (inH * 60 + inM);
      if (diffMins < 0) diffMins += 24 * 60; 
      const h = Math.floor(diffMins / 60);
      const m = diffMins % 60;
      record.totalHours = `${h}h ${m}m`;
    }
    return record;
  }

  const submitAttendance = async () => {
    if (!myProfile || !hasUnsavedChanges) return;
    if (!todayRecord.status) {
        toast.error("Please select a status (Present, Absent, etc.) first.");
        return;
    }

    setSaving(true);
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      
      const payload = {
        employee: myProfile._id,
        companyName: myProfile.companyName || 'SkyEdge Taxbucket India',
        date: localToday,
        inTime: todayRecord.inTime,
        outTime: todayRecord.outTime,
        inLocation: todayRecord.inLocation,
        outLocation: todayRecord.outLocation, 
        totalHours: todayRecord.totalHours,
        status: todayRecord.status,
        remarks: todayRecord.remarks
      };

      await axios.post(`${import.meta.env.VITE_API_URL}/hr/attendance`, { records: [payload] }, { headers });
      toast.success("Attendance marked successfully!");
      setHasUnsavedChanges(false);
      fetchData(); // This will lock the inputs automatically because data is now saved
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to mark attendance.");
    } finally {
      setSaving(false);
    }
  };

  const renderLocationDisplay = (locStr, prefix) => {
    if (!locStr || locStr === 'System Generated' || locStr === 'Location Denied') {
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
        {/* {link && (
          <a href={link} target="_blank" rel="noreferrer" className="text-[9px] text-blue-600 hover:text-blue-800 underline mt-0.5 flex items-center gap-1">
            <ExternalLink size={10} /> View Map
          </a>
        )} */}
      </div>
    );
  };

  // 🔴 CALCULATE MONTHLY STATS
  const totalPresent = attendanceHistory.filter(a => a.status === 'Present' || a.status === 'Half Day').length;
  const totalAbsent = attendanceHistory.filter(a => a.status === 'Absent' || a.status === 'Leave').length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-slate-500 font-medium">Loading your portal...</p>
      </div>
    );
  }

  if (!myProfile) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center mt-20">
        <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center">
          <AlertCircle size={48} className="text-amber-500 mb-4" />
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Profile Not Found</h2>
          <p className="text-slate-500 mt-2 max-w-md">Your HR employee record has not been linked to your login yet. Please contact the Administrator to complete your onboarding.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 pb-12">
      <Toaster position="top-right" />

      {/* LOCATION LOADER OVERLAY */}
      {fetchingLocation && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
               <div className="bg-white p-6 rounded-2xl flex flex-col items-center shadow-xl animate-in fade-in zoom-in-95">
                   <MapPin className="animate-bounce text-blue-500 mb-2" size={32} />
                   <p className="text-slate-800 font-bold">Capturing GPS Coordinates...</p>
                   <p className="text-xs text-slate-500 mt-1">Please allow location access if prompted.</p>
               </div>
          </div>
      )}

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <UserCircle size={28} className="text-blue-600" /> Welcome, {myProfile.name.split(' ')[0]}!
        </h1>
        <p className="text-sm text-slate-500 mt-1 font-medium">Manage your daily attendance and view your profile details.</p>
      </div>

      {/* TOP SECTION: MARK ATTENDANCE WIDGET */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-100 pb-4">
          <h3 className="text-base font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Clock size={18} className="text-blue-600"/> Mark Today's Attendance
          </h3>
          
          <div className="flex items-center gap-3">
            {todayRecord.totalHours && (
              <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-xl flex gap-2 items-center">
                <span className="text-xs font-bold text-emerald-700 uppercase">Logged:</span>
                <span className="text-sm font-black text-emerald-600">{todayRecord.totalHours}</span>
              </div>
            )}
            <div className="text-sm font-black text-slate-700 bg-slate-100 px-4 py-1.5 rounded-xl border border-slate-200">
              {new Date(localToday).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 items-start">
          <div className="lg:col-span-1 relative">
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5 flex justify-between">
                Status {isStatusLocked && <Lock size={12} className="text-emerald-500"/>}
            </label>
            <select 
              value={todayRecord.status} 
              onChange={(e) => handleRecordChange('status', e.target.value)} 
              disabled={isStatusLocked}
              className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
            >
              <option value="" disabled>Select...</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Half Day">Half Day</option>
              <option value="Leave">Leave</option>
              <option value="WFH">WFH</option>
              <option value="Weekly Off">Weekly Off</option>
              <option value="Holiday">Holiday</option>
            </select>
          </div>

          <div className="lg:col-span-1">
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5 flex justify-between">
                Punch In {isInTimeLocked && <Lock size={12} className="text-emerald-500"/>}
            </label>
            <div className="flex gap-2">
              <input 
                type="time" 
                value={todayRecord.inTime} 
                readOnly // 🔴 MADE READ-ONLY
                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 bg-slate-50 text-slate-700 cursor-not-allowed"
                placeholder="--:--"
              />
              <button 
                onClick={handlePunchIn}
                disabled={isInTimeLocked || ['Absent', 'Leave', 'Weekly Off', 'Holiday'].includes(todayRecord.status)}
                className="px-3 flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl border border-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Auto Punch In (with GPS)"
              >
                <LogIn size={16}/>
              </button>
            </div>
            {todayRecord.inLocation && (
                <p className="text-[9px] text-blue-500 font-bold mt-1 truncate" title={todayRecord.inLocation.split('|')[0]}>📍 {todayRecord.inLocation.split('|')[0]}</p>
            )}
          </div>

          <div className="lg:col-span-1">
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5 flex justify-between">
                Punch Out {isOutTimeLocked && <Lock size={12} className="text-emerald-500"/>}
            </label>
            <div className="flex gap-2">
              <input 
                type="time" 
                value={todayRecord.outTime} 
                readOnly // 🔴 MADE READ-ONLY
                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 bg-slate-50 text-slate-700 cursor-not-allowed"
                placeholder="--:--"
              />
              <button 
                onClick={handlePunchOut}
                disabled={isOutTimeLocked || ['Absent', 'Leave', 'Weekly Off', 'Holiday'].includes(todayRecord.status)}
                className="px-3 flex items-center justify-center bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl border border-rose-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Auto Punch Out (with GPS)"
              >
                <LogOut size={16}/>
              </button>
            </div>
            {todayRecord.outLocation && (
                <p className="text-[9px] text-rose-500 font-bold mt-1 truncate" title={todayRecord.outLocation.split('|')[0]}>📍 {todayRecord.outLocation.split('|')[0]}</p>
            )}
          </div>

          <div className="lg:col-span-1">
            <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1.5 flex justify-between">
                Remarks / Notes {isOutTimeLocked && <Lock size={12} className="text-emerald-500"/>}
            </label>
            <input 
              type="text" 
              placeholder="Any notes..." 
              value={todayRecord.remarks} 
              onChange={(e) => handleRecordChange('remarks', e.target.value)} 
              disabled={isOutTimeLocked}
              className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
            />
          </div>

          <div className="lg:col-span-1 flex items-end">
            <button 
              onClick={submitAttendance} 
              disabled={saving || !hasUnsavedChanges}
              className={`w-full h-[42px] text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 ${hasUnsavedChanges ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-400 cursor-not-allowed opacity-80'}`}
            >
              {saving ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save size={16} />} 
              {saving ? 'Saving...' : (hasUnsavedChanges ? 'Save Info' : 'Up to Date')}
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: PROFILE & HISTORY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Profile Card */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
              <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-20 h-20 bg-blue-500/10 rounded-full blur-xl"></div>
              
              <div className="relative mx-auto h-20 w-20 rounded-2xl bg-white text-blue-600 flex items-center justify-center font-black text-3xl shadow-xl mb-4 border-2 border-white/20 transform rotate-3">
                {myProfile.name.charAt(0).toUpperCase()}
              </div>
              <h2 className="relative text-xl font-black text-white">{myProfile.name}</h2>
              <p className="relative text-xs text-blue-200 font-medium uppercase tracking-wider mt-1">{myProfile.empId}</p>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100"><Briefcase size={16} className="text-blue-500"/></div>
                <div>
                  <p className="font-bold text-slate-800">{myProfile.designation || 'N/A'}</p>
                  <p className="text-[11px] text-slate-500">{myProfile.department || 'N/A Department'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100"><Building2 size={16} className="text-emerald-500"/></div>
                <div>
                  <p className="font-bold text-slate-800">{myProfile.companyName}</p>
                  <p className="text-[11px] text-slate-500">{myProfile.employmentType}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 border border-amber-100"><Phone size={16} className="text-amber-500"/></div>
                <div>
                  <p className="font-bold text-slate-800">{myProfile.mobile}</p>
                  <p className="text-[11px] text-slate-500">{myProfile.email || 'No email'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0 border border-purple-100"><Calendar size={16} className="text-purple-500"/></div>
                <div>
                  <p className="font-bold text-slate-800">Joined On</p>
                  <p className="text-[11px] text-slate-500">{myProfile.joiningDate ? new Date(myProfile.joiningDate).toLocaleDateString('en-IN') : 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 🔴 NEW: MONTHLY STATS SUMMARY CARD */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 flex items-center justify-around">
            <div className="text-center">
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Present</p>
               <div className="text-2xl font-black text-emerald-600">{totalPresent}</div>
            </div>
            <div className="w-px h-10 bg-slate-200"></div>
            <div className="text-center">
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Absent</p>
               <div className="text-2xl font-black text-rose-600">{totalAbsent}</div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: History Table */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
               <div>
                 <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                   <Calendar size={18} className="text-blue-600"/> Attendance History
                 </h3>
                 <p className="text-xs text-slate-500 mt-0.5 font-medium">Your logs for {new Date(localToday).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
               </div>
            </div>
            
            <div className="flex-1 overflow-x-auto p-5">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b-2 border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                    <th className="pb-3 px-2 w-28">Date</th>
                    <th className="pb-3 px-2 w-28">Status</th>
                    <th className="pb-3 px-2 text-center w-20">In</th>
                    <th className="pb-3 px-2 text-center w-20">Out</th>
                    <th className="pb-3 px-2 w-32">Location Info</th>
                    <th className="pb-3 px-2 text-center w-24">Hours</th>
                    <th className="pb-3 px-2">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                  {attendanceHistory.length === 0 ? (
                    <tr><td colSpan="7" className="text-center py-12 text-slate-400">No attendance records found for this month yet.</td></tr>
                  ) : (
                    attendanceHistory.map((row) => {
                      const displayDate = row.date.split('T')[0];
                      const dayName = new Date(displayDate).toLocaleDateString('en-US', { weekday: 'short' });
                      const isWeekend = dayName === 'Sat' || dayName === 'Sun';

                      return (
                        <tr key={row._id || displayDate} className={`hover:bg-slate-50 transition-colors ${isWeekend ? 'bg-slate-50/50' : ''}`}>
                          <td className="py-3 px-2 whitespace-nowrap">
                            <span className="font-bold text-slate-800 mr-2">{new Date(displayDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isWeekend ? 'bg-rose-100 text-rose-600' : 'bg-slate-200 text-slate-500'}`}>{dayName}</span>
                          </td>
                          <td className="py-3 px-2">
                            <span className={`inline-block px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                              row.status === 'Present' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
                              row.status === 'Absent' ? 'border-rose-200 bg-rose-50 text-rose-700' :
                              row.status === 'Weekly Off' ? 'border-slate-300 bg-slate-200 text-slate-600' :
                              row.status ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500'
                            }`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center font-semibold text-slate-600">{row.inTime || '-'}</td>
                          <td className="py-3 px-2 text-center font-semibold text-slate-600">{row.outTime || '-'}</td>
                          
                          <td className="py-3 px-2">
                            <div className="flex flex-col gap-1 text-[9px] font-bold text-slate-500">
                                <div className="bg-slate-50 px-1.5 py-1 rounded border border-slate-200">
                                    {renderLocationDisplay(row.inLocation, 'IN')}
                                </div>
                                <div className="bg-slate-50 px-1.5 py-1 rounded border border-slate-200">
                                    {renderLocationDisplay(row.outLocation, 'OUT')}
                                </div>
                            </div>
                          </td>

                          <td className="py-3 px-2 text-center">
                            {row.totalHours ? (
                              <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                                {row.totalHours}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="py-3 px-2 text-xs text-slate-500 truncate max-w-[120px]" title={row.remarks}>
                            {row.remarks || '-'}
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
      </div>
    </div>
  );
};

export default MyPortal;