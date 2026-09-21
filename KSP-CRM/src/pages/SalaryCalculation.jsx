import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import { 
  Calculator, Calendar, Save, IndianRupee, AlertCircle, RefreshCw, CheckCircle2, RotateCcw
} from 'lucide-react';

const SalaryCalculation = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [salarySheet, setSalarySheet] = useState([]);

  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  const fetchSalaryData = async (isForceRecalculate = false) => {
    if (!selectedMonth) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const [year, month] = selectedMonth.split('-');
      const daysInMonth = new Date(year, month, 0).getDate();
      
      const endOfMonthDate = new Date(year, month, 0); 

      // 1. Fetch Employees
      const empRes = await axios.get(`${import.meta.env.VITE_API_URL}/hr/employees`, { headers });
      
      // 2. Fetch Attendance
      const attRes = await axios.get(`${import.meta.env.VITE_API_URL}/hr/attendance`, { headers });
      const monthAttendance = attRes.data.filter(a => a.date && a.date.startsWith(selectedMonth));

      // 3. Fetch Saved Salaries
      const salRes = await axios.get(`${import.meta.env.VITE_API_URL}/hr/salary?monthYear=${selectedMonth}`, { headers });
      const savedSalaries = salRes.data;

      const validEmps = empRes.data.filter(emp => {
        const hasSavedSalary = savedSalaries.some(s => s.employee._id === emp._id || s.employee === emp._id);
        if (hasSavedSalary) return true;

        if (emp.status !== 'Active') return false;
        if (!emp.joiningDate) return true; 
        
        const joinDate = new Date(emp.joiningDate);
        return joinDate <= endOfMonthDate; 
      });

      // 4. Generate Sheet Logic
      const sheet = validEmps.map(emp => {
        const savedRecord = savedSalaries.find(s => s.employee._id === emp._id);
        
        if (savedRecord && !isForceRecalculate) {
          return {
            ...savedRecord,
            employeeId: emp._id,
            empName: emp.name,
            empCode: emp.empId,
            isSaved: true
          };
        } else {
          const empAtt = monthAttendance.filter(a => a.employee._id === emp._id || a.employee === emp._id);
          
          let present = 0, absent = 0, halfDay = 0, leave = 0, wfh = 0, holiday = 0, weeklyOff = 0;
          empAtt.forEach(row => {
            if (row.status === 'Present') present++;
            else if (row.status === 'Absent') absent++;
            else if (row.status === 'Half Day') halfDay++;
            else if (row.status === 'Leave') leave++;
            else if (row.status === 'WFH') wfh++;
            else if (row.status === 'Holiday') holiday++;
            else if (row.status === 'Weekly Off') weeklyOff++;
          });

          // 🔴 NEW LOGIC: Dynamic Per Day Salary Calculation
          // 1. Calculate base earned days (Jitne din office aaya / work kiya)
          const baseEarnedDays = present + wfh + holiday + weeklyOff + (halfDay * 0.5);
          
          // 2. Calculate explicitly marked leaves
          const explicitAbsences = absent + leave + (halfDay * 0.5);

          // 3. 1 Paid Leave Rule: Ek chhutti par paise nahi katenge
          const paidLeaveGranted = explicitAbsences >= 1 ? 1 : explicitAbsences;
          
          // 4. Final Paid Days = Jo din aaya + 1 PL (agar li hai)
          let finalPaidDays = baseEarnedDays + paidLeaveGranted;
          if (finalPaidDays > daysInMonth) finalPaidDays = daysInMonth;

          // 5. Baaki bache hue saare din Unpaid/LOP mane jayenge automatically
          const lopDays = daysInMonth - finalPaidDays;

          const gross = emp.salaryStructure?.gross || 0;
          const perDaySalary = gross / daysInMonth;
          
          // 6. LOP Deduction = Unpaid dino ki total salary
          const lopDeduction = Math.round(perDaySalary * lopDays) || 0;

          return {
            employee: emp._id,
            employeeId: emp._id,
            companyName: emp.companyName || 'SkyEdge Taxbucket India',
            empName: emp.name,
            empCode: emp.empId,
            monthYear: selectedMonth,
            isSaved: false, 
            salarySnapshot: {
              basic: emp.salaryStructure?.basic || 0,
              hra: emp.salaryStructure?.hra || 0,
              otherAllowance: emp.salaryStructure?.otherAllowance || 0,
              gross: gross
            },
            attendanceSummary: {
              totalDays: daysInMonth,
              paidDays: finalPaidDays, // Dikhayega exactly kitne din ki salary mil rahi hai
              lopDays: lopDays // Bacha hua mahina automatically LOP dikhega
            },
            adjustments: {
              lopDeduction: lopDeduction,
              otherDeduction: 0,
              incentiveBonus: 0,
              reimbursement: 0
            },
            netPayable: gross - lopDeduction // Final salary dynamically banegi
          };
        }
      });

      setSalarySheet(sheet);
      if (isForceRecalculate) {
        toast.success("Sheet Synced! Showing dynamic per-day salary.");
      }
    } catch (error) {
      toast.error("Failed to fetch salary details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalaryData();
    // eslint-disable-next-line
  }, [selectedMonth]);

  const handleAdjustmentChange = (index, field, value) => {
    const updatedSheet = [...salarySheet];
    const val = Number(value) || 0;
    
    updatedSheet[index].adjustments[field] = val;

    const snap = updatedSheet[index].salarySnapshot;
    const adj = updatedSheet[index].adjustments;
    
    updatedSheet[index].netPayable = 
      snap.gross + adj.incentiveBonus + adj.reimbursement - adj.lopDeduction - adj.otherDeduction;

    setSalarySheet(updatedSheet);
  };

  const handleSaveAll = async () => {
    if (salarySheet.length === 0) return;
    setSaving(true);
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      
      const payload = salarySheet.map(row => ({
        employee: row.employeeId || row.employee._id,
        companyName: row.companyName,
        monthYear: row.monthYear,
        salarySnapshot: row.salarySnapshot,
        attendanceSummary: row.attendanceSummary,
        adjustments: row.adjustments,
        netPayable: row.netPayable,
        status: 'Finalized'
      }));

      await axios.post(`${import.meta.env.VITE_API_URL}/hr/salary`, { records: payload }, { headers });
      toast.success("Salary Sheet Finalized & Saved!");
      fetchSalaryData(); 
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save salary");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 pb-12">
      <Toaster position="top-right" />

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <Calculator size={28} className="text-blue-600" /> Salary Calculation
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Auto-calculate exact per-day salary synced with marked attendance.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => fetchSalaryData(true)} 
            disabled={loading} 
            className="inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 text-sm font-bold px-4 py-2.5 rounded-xl transition-all"
            title="Force fetch latest attendance and recalculate"
          >
            <RotateCcw size={18} className={loading ? 'animate-spin' : ''} /> Sync Data
          </button>

          <button 
            onClick={handleSaveAll} 
            disabled={saving || salarySheet.length === 0} 
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold px-6 py-2.5 rounded-xl shadow-md transition-all disabled:opacity-50"
          >
            {saving ? <RefreshCw size={18} className="animate-spin"/> : <Save size={18} />} 
            Finalize Sheet
          </button>
        </div>
      </div>

      {/* CONFIGURATION BAR */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row gap-4 items-center">
        <div className="w-full md:w-64">
          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1 flex items-center gap-1">
            <Calendar size={12}/> Payroll Month
          </label>
          <input 
            type="month" 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)} 
            className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold bg-slate-50 focus:ring-2 focus:ring-blue-500/20 outline-none" 
          />
        </div>
        <div className="text-xs font-bold text-slate-400 bg-slate-50 p-3 rounded-xl border border-slate-100 flex-1 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-slate-500">
             <AlertCircle size={16} className="text-blue-500 shrink-0"/>
             <span><strong>Dynamic Per-Day Logic:</strong> Net salary calculates strictly for the marked days (+1 Paid Leave if taken). Unmarked blank days are automatically treated as LOP/Unpaid.</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400 pl-6">
             <span>* Click <strong>Sync Data</strong> to pull the latest attendance and apply rules.</span>
          </div>
        </div>
      </div>

      {/* SALARY SHEET TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th colSpan="2" className="py-2 px-4 border-r border-slate-200 text-center text-[10px] font-black uppercase text-slate-500">Employee Details</th>
                <th colSpan="2" className="py-2 px-4 border-r border-slate-200 text-center text-[10px] font-black uppercase text-emerald-600 bg-emerald-50">Salary Snapshot</th>
                <th colSpan="3" className="py-2 px-4 border-r border-slate-200 text-center text-[10px] font-black uppercase text-amber-600 bg-amber-50">Attendance Data</th>
                <th colSpan="4" className="py-2 px-4 border-r border-slate-200 text-center text-[10px] font-black uppercase text-rose-600 bg-rose-50">Adjustments & Deductions</th>
                <th colSpan="2" className="py-2 px-4 text-center text-[10px] font-black uppercase text-blue-600 bg-blue-50">Final Output</th>
              </tr>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                <th className="py-3 px-4 w-48">Name & ID</th>
                <th className="py-3 px-4 text-center w-24">Status</th>
                
                <th className="py-3 px-4 text-right bg-emerald-50/30">Basic+HRA</th>
                <th className="py-3 px-4 text-right border-r border-slate-200 bg-emerald-50/30">Gross</th>
                
                <th className="py-3 px-4 text-center bg-amber-50/30">Month Days</th>
                <th className="py-3 px-4 text-center bg-amber-50/30">Paid Days</th> 
                <th className="py-3 px-4 text-center border-r border-slate-200 bg-amber-50/30">Unpaid/LOP</th>
                
                <th className="py-3 px-4 text-right bg-rose-50/30">LOP Ded. (₹)</th>
                <th className="py-3 px-4 text-right bg-rose-50/30">Other Ded. (₹)</th>
                <th className="py-3 px-4 text-right bg-rose-50/30">Bonus (₹)</th>
                <th className="py-3 px-4 text-right border-r border-slate-200 bg-rose-50/30">Reimb. (₹)</th>
                
                <th className="py-3 px-4 text-right bg-blue-50/30 font-black">Net Salary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
              {loading ? (
                <tr><td colSpan="12" className="text-center py-16 text-slate-400"><RefreshCw className="animate-spin inline-block mr-2" size={18}/> Calculating Payroll...</td></tr>
              ) : salarySheet.length === 0 ? (
                <tr><td colSpan="12" className="text-center py-16 text-slate-400">No active employees found for this month based on joining dates.</td></tr>
              ) : (
                salarySheet.map((row, index) => {
                  const snap = row.salarySnapshot;
                  const att = row.attendanceSummary;
                  const adj = row.adjustments;

                  return (
                    <tr key={row.employeeId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2 px-4 whitespace-nowrap">
                        <p className="font-bold text-slate-800">{row.empName}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{row.empCode}</p>
                      </td>
                      <td className="py-2 px-4 text-center border-r border-slate-100">
                        {row.isSaved ? (
                          <span className="flex items-center justify-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded"><CheckCircle2 size={12}/> Saved</span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded">Draft</span>
                        )}
                      </td>
                      
                      <td className="py-2 px-4 text-right bg-emerald-50/10 text-xs">{(snap.basic + snap.hra).toLocaleString('en-IN')}</td>
                      <td className="py-2 px-4 text-right border-r border-slate-100 bg-emerald-50/10 font-bold text-emerald-700">{snap.gross.toLocaleString('en-IN')}</td>
                      
                      <td className="py-2 px-4 text-center bg-amber-50/10 text-xs">{att.totalDays}</td>
                      <td className="py-2 px-4 text-center bg-amber-50/10 text-sm font-black text-blue-600">{att.paidDays}</td>
                      <td className="py-2 px-4 text-center border-r border-slate-100 bg-amber-50/10 text-sm font-black text-rose-500">{att.lopDays}</td>
                      
                      <td className="py-2 px-4 bg-rose-50/10">
                        <input type="number" min="0" value={adj.lopDeduction} onChange={(e) => handleAdjustmentChange(index, 'lopDeduction', e.target.value)} className="w-full text-right p-1.5 border border-slate-200 rounded text-xs focus:ring-2 focus:ring-blue-500/20 text-rose-600 font-semibold" />
                      </td>
                      <td className="py-2 px-4 bg-rose-50/10">
                        <input type="number" min="0" value={adj.otherDeduction} onChange={(e) => handleAdjustmentChange(index, 'otherDeduction', e.target.value)} className="w-full text-right p-1.5 border border-slate-200 rounded text-xs focus:ring-2 focus:ring-blue-500/20 text-rose-600 font-semibold" />
                      </td>
                      <td className="py-2 px-4 bg-rose-50/10">
                        <input type="number" min="0" value={adj.incentiveBonus} onChange={(e) => handleAdjustmentChange(index, 'incentiveBonus', e.target.value)} className="w-full text-right p-1.5 border border-slate-200 rounded text-xs focus:ring-2 focus:ring-blue-500/20 text-emerald-600 font-semibold" />
                      </td>
                      <td className="py-2 px-4 border-r border-slate-100 bg-rose-50/10">
                        <input type="number" min="0" value={adj.reimbursement} onChange={(e) => handleAdjustmentChange(index, 'reimbursement', e.target.value)} className="w-full text-right p-1.5 border border-slate-200 rounded text-xs focus:ring-2 focus:ring-blue-500/20 text-blue-600 font-semibold" />
                      </td>
                      
                      <td className="py-2 px-4 text-right bg-blue-50/10">
                        <div className="flex items-center justify-end gap-1 font-black text-blue-700 text-lg">
                          <IndianRupee size={16}/> {row.netPayable.toLocaleString('en-IN')}
                        </div>
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

export default SalaryCalculation;