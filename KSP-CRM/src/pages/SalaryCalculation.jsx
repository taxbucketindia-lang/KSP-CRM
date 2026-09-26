import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import { 
  Calculator, Calendar, Save, IndianRupee, AlertCircle, RefreshCw, CheckCircle2, RotateCcw, UserMinus, Download
} from 'lucide-react';

// 🔴 IMPORT PDF LIBRARIES
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

      // 1. Fetch Data
      const [empRes, attRes, salRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/hr/employees`, { headers }),
        axios.get(`${import.meta.env.VITE_API_URL}/hr/attendance`, { headers }),
        axios.get(`${import.meta.env.VITE_API_URL}/hr/salary?monthYear=${selectedMonth}`, { headers })
      ]);

      const allEmployees = empRes.data || [];
      const allAttendance = attRes.data || [];
      const savedSalaries = salRes.data || [];

      const monthAttendance = allAttendance.filter(a => a.date && a.date.startsWith(selectedMonth));

      // 2. Filter Employees
      const validEmps = allEmployees.filter(emp => {
        const hasSavedSalary = savedSalaries.some(s => s.employee?._id === emp._id || s.employee === emp._id);
        if (hasSavedSalary) return true;
        if (emp.joiningDate && new Date(emp.joiningDate) > endOfMonthDate) return false;
        if (['Active', 'Notice Period'].includes(emp.status)) return true;
        if (['Resigned', 'Terminated', 'Absconded'].includes(emp.status)) {
            if (emp.lastWorkingDate) {
                const lwd = new Date(emp.lastWorkingDate);
                const lwdYearMonth = `${lwd.getFullYear()}-${String(lwd.getMonth() + 1).padStart(2, '0')}`;
                if (lwdYearMonth >= selectedMonth) return true;
            } else {
               const hasAttThisMonth = monthAttendance.some(a => a.employee?._id === emp._id || a.employee === emp._id);
               if (hasAttThisMonth) return true;
            }
        }
        return false;
      });

      // 3. Generate Sheet Logic
      const sheet = validEmps.map(emp => {
        const empAtt = monthAttendance.filter(a => a.employee?._id === emp._id || a.employee === emp._id);
          
        let present = 0, absent = 0, halfDay = 0, leave = 0, wfh = 0, holiday = 0, weeklyOff = 0;
        let totalLates = 0;
        let autoHalfDays = 0;
        
        empAtt.forEach(row => {
          if (row.status === 'Present') present++;
          else if (row.status === 'Absent') absent++;
          else if (row.status === 'Half Day') {
              halfDay++;
              if (row.remarks?.includes('Auto-Half Day')) autoHalfDays++;
          }
          else if (row.status === 'Leave') leave++;
          else if (row.status === 'WFH') wfh++;
          else if (row.status === 'Holiday') holiday++;
          else if (row.status === 'Weekly Off') weeklyOff++;
          
          if (row.isLate || row.remarks?.includes('Late entry') || row.remarks?.includes('Auto-Half Day')) {
             totalLates++;
          }
        });

        const rawAtt = { present, absent, halfDay, leave, wfh, holiday, weeklyOff, autoHalfDays };

        const savedRecord = savedSalaries.find(s => s.employee?._id === emp._id || s.employee === emp._id);
        
        // 🔴 SMART FIELD MATCHER: Database ke different field names ko capture karega
        const fullEmpDetails = {
           department: emp.department || 'N/A',
           designation: emp.designation || 'N/A',
           joiningDate: emp.joiningDate,
           pan: emp.pan || 'N/A',
          //  uan: emp.uan || emp.uanNumber || emp.UAN || 'N/A',
           bankAccount: String(emp.accountNo || emp.bankAccount || emp.bankAccountNumber || emp.accountNumber || emp.bankAccountNo || 'N/A'),
           basic: emp.salaryStructure?.basic || 0,
           hra: emp.salaryStructure?.hra || 0,
           conveyance: emp.salaryStructure?.conveyance || 0,
           specialAllowance: emp.salaryStructure?.specialAllowance || 0,
           otherAllowance: emp.salaryStructure?.otherAllowance || 0,
           pf: emp.salaryStructure?.pf || 0,
           esi: emp.salaryStructure?.esi || 0,
           pt: emp.salaryStructure?.pt || 0,
           tds: emp.salaryStructure?.tds || 0
        };

        if (savedRecord && !isForceRecalculate) {
          const latesForgiven = savedRecord.adjustments?.latesForgiven || 0;
          return {
            ...savedRecord,
            employeeId: emp._id,
            empName: emp.name,
            empCode: emp.empId,
            status: emp.status,
            lastWorkingDate: emp.lastWorkingDate,
            empDetails: fullEmpDetails, 
            attendanceSummary: {
              ...savedRecord.attendanceSummary,
              totalLates,
              raw: rawAtt
            },
            isSaved: true
          };
        } else {
          const latesForgiven = savedRecord?.adjustments?.latesForgiven || 0;
          
          const realHalfDays = rawAtt.halfDay - rawAtt.autoHalfDays;
          const realPresent = rawAtt.present + rawAtt.autoHalfDays;

          const totalMarkedDays = realPresent + wfh + holiday + weeklyOff + realHalfDays + absent + leave;
          const unmarkedDays = Math.max(0, daysInMonth - totalMarkedDays);

          const explicitAbsences = absent + leave + (realHalfDays * 0.5);
          const paidLeaveGranted = explicitAbsences >= 1 ? 1 : explicitAbsences;
          const netAbsenceLoss = Math.max(0, explicitAbsences - paidLeaveGranted);

          const totalAllowedLates = 3 + parseInt(latesForgiven, 10);
          const penalizedLates = Math.max(0, totalLates - totalAllowedLates);
          const latePenaltyDays = penalizedLates * 0.5;

          const totalLopDays = unmarkedDays + netAbsenceLoss + latePenaltyDays;
          const finalPaidDays = Math.max(0, daysInMonth - totalLopDays);

          const gross = emp.salaryStructure?.gross || 0;
          const perDaySalary = gross / daysInMonth;
          const lopDeduction = Math.round(perDaySalary * totalLopDays) || 0;

          let existingAdj = savedRecord ? savedRecord.adjustments : { lopDeduction: 0, otherDeduction: 0, incentiveBonus: 0, reimbursement: 0, latesForgiven: 0 };

          return {
            employee: emp._id,
            employeeId: emp._id,
            companyName: emp.companyName || 'SkyEdge Taxbucket India Private Limited',
            empName: emp.name,
            empCode: emp.empId,
            status: emp.status,
            lastWorkingDate: emp.lastWorkingDate,
            monthYear: selectedMonth,
            isSaved: false, 
            empDetails: fullEmpDetails,
            salarySnapshot: {
              basic: fullEmpDetails.basic,
              hra: fullEmpDetails.hra,
              conveyance: fullEmpDetails.conveyance,
              specialAllowance: fullEmpDetails.specialAllowance,
              otherAllowance: fullEmpDetails.otherAllowance,
              pf: fullEmpDetails.pf,
              esi: fullEmpDetails.esi,
              pt: fullEmpDetails.pt,
              tds: fullEmpDetails.tds,
              gross: gross
            },
            attendanceSummary: {
              totalDays: daysInMonth,
              paidDays: finalPaidDays, 
              lopDays: totalLopDays,
              totalLates: totalLates,
              penalizedLates: Math.max(0, totalLates - 3),
              raw: rawAtt 
            },
            adjustments: {
              lopDeduction: lopDeduction, 
              otherDeduction: existingAdj.otherDeduction || 0,
              incentiveBonus: existingAdj.incentiveBonus || 0,
              reimbursement: existingAdj.reimbursement || 0,
              latesForgiven: latesForgiven
            },
            netPayable: gross - lopDeduction - fullEmpDetails.pf - fullEmpDetails.esi - fullEmpDetails.pt - fullEmpDetails.tds + (existingAdj.incentiveBonus || 0) + (existingAdj.reimbursement || 0) - (existingAdj.otherDeduction || 0)
          };
        }
      });

      setSalarySheet(sheet.filter(row => row !== undefined));
      if (isForceRecalculate) toast.success("Sheet Synced & Calculated!");
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

    const row = updatedSheet[index];
    const snap = row.salarySnapshot;
    const adj = row.adjustments;
    const att = row.attendanceSummary;

    if (field === 'latesForgiven') {
        const raw = att.raw || { present: 0, absent: 0, halfDay: 0, leave: 0, wfh: 0, holiday: 0, weeklyOff: 0, autoHalfDays: 0 };
        const realHalfDays = raw.halfDay - (raw.autoHalfDays || 0);
        const realPresent = raw.present + (raw.autoHalfDays || 0);

        const totalMarkedDays = realPresent + raw.wfh + raw.holiday + raw.weeklyOff + realHalfDays + raw.absent + raw.leave;
        const unmarkedDays = Math.max(0, att.totalDays - totalMarkedDays);

        const explicitAbsences = raw.absent + raw.leave + (realHalfDays * 0.5);
        const paidLeaveGranted = explicitAbsences >= 1 ? 1 : explicitAbsences;
        const netAbsenceLoss = Math.max(0, explicitAbsences - paidLeaveGranted);

        const totalAllowedLates = 3 + val;
        const penalizedLates = Math.max(0, (att.totalLates || 0) - totalAllowedLates);
        const latePenaltyDays = penalizedLates * 0.5;

        const totalLopDays = unmarkedDays + netAbsenceLoss + latePenaltyDays;
        const finalPaidDays = Math.max(0, att.totalDays - totalLopDays);

        const perDaySalary = snap.gross / att.totalDays;
        const lopDeduction = Math.round(perDaySalary * totalLopDays) || 0;

        att.paidDays = finalPaidDays;
        att.lopDays = totalLopDays;
        adj.lopDeduction = lopDeduction;
    }

    row.netPayable = 
      snap.gross - (snap.pf||0) - (snap.esi||0) - (snap.pt||0) - (snap.tds||0) + adj.incentiveBonus + adj.reimbursement - adj.lopDeduction - adj.otherDeduction;

    setSalarySheet(updatedSheet);
  };

  const handleSaveAll = async () => {
    if (salarySheet.length === 0) return;
    setSaving(true);
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      
      const payload = salarySheet.map(row => ({
        employee: row.employeeId || row.employee._id,
        companyName: row.companyName || 'SkyEdge Taxbucket India Private Limited',
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
      toast.error("Failed to save salary");
    } finally {
      setSaving(false);
    }
  };

  // 🔴 MAGIC: PDF GENERATOR FUNCTION
  const generateSalarySlip = (row) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    const [year, monthNum] = row.monthYear.split('-');
    const date = new Date(year, monthNum - 1);
    const monthName = date.toLocaleString('default', { month: 'long' });
    const formattedMonth = `${monthName} ${year}`;

    const formatCurrency = (amount) => `Rs. ${Number(amount).toLocaleString('en-IN')}`;

    const numberToWords = (num) => {
      const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
      const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];
      if ((num = num.toString()).length > 9) return 'Overflow';
      let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
      if (!n) return;
      let str = '';
      str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
      str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
      str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
      str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
      str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
      return str.trim() + ' Only';
    };

    // --- HEADER ---
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 138); 
    doc.text("TAXBUCKET", pageWidth / 2, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Tax | Accounting | Compliance | Business Advisory", pageWidth / 2, 26, { align: "center" });

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text(row.companyName || "SkyEdge TaxBucket India Private Limited", pageWidth / 2, 34, { align: "center" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Email: hr_taxbucket@gmail.com | Landline: 011-4646-6266", pageWidth / 2, 40, { align: "center" });
    doc.text("Website: www.TaxBucket.in", pageWidth / 2, 45, { align: "center" });
    
    doc.setDrawColor(200);
    doc.line(14, 49, pageWidth - 14, 49);

    // --- TITLE ---
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`PAYSLIP FOR THE MONTH OF ${formattedMonth.toUpperCase()}`, pageWidth / 2, 58, { align: "center" });

    // 🔴 Safe Bank Masking Logic
    const bankAcc = row.empDetails?.bankAccount;
    const maskedBank = (bankAcc && bankAcc !== 'N/A' && bankAcc.length >= 4) 
      ? `XXXX-XXXX-${bankAcc.slice(-4)}` 
      : (bankAcc || 'N/A');

    // --- EMPLOYEE DETAILS ---
    autoTable(doc, {
      startY: 65,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: [80, 80, 80], cellWidth: 35 },
        1: { cellWidth: 55 },
        2: { fontStyle: 'bold', textColor: [80, 80, 80], cellWidth: 35 },
        3: { cellWidth: 55 }
      },
      body: [
        ['Employee Name:', row.empName, 'Employee ID:', row.empCode],
        ['Designation:', row.empDetails?.designation || 'N/A', 'Department:', row.empDetails?.department || 'N/A'],
        ['Date of Joining:', row.empDetails?.joiningDate ? new Date(row.empDetails.joiningDate).toLocaleDateString('en-IN') : 'N/A', 'PAN:', row.empDetails?.pan || 'N/A'],
        ['Bank A/c No:', maskedBank, 'Working Days:', row.attendanceSummary.totalDays.toString()],
        ['LOP Days:', row.attendanceSummary.lopDays.toString(), 'Paid Days:', row.attendanceSummary.paidDays.toString()],
      ]
    });

    // --- SALARY COMPONENTS ---
    let finalY = doc.lastAutoTable.finalY + 8;
    
    const snap = row.salarySnapshot;
    const adj = row.adjustments;
    const incentives = (adj.incentiveBonus || 0) + (adj.reimbursement || 0);

    const earningsData = [
      ['Basic Salary', formatCurrency(snap.basic || 0)],
      ['House Rent Allowance (HRA)', formatCurrency(snap.hra || 0)],
      ['Conveyance Allowance', formatCurrency(snap.conveyance || 0)],
      ['Special Allowance', formatCurrency(snap.specialAllowance || 0)],
      ['Other Allowance', formatCurrency(snap.otherAllowance || 0)],
      ['Incentives / Bonus / Reimb.', formatCurrency(incentives)],
      ['', ''] 
    ];

    const totalDeductions = (snap.pf||0) + (snap.esi||0) + (snap.pt||0) + (snap.tds||0) + (adj.lopDeduction||0) + (adj.otherDeduction||0);

    const deductionsData = [
      ['Employee PF', formatCurrency(snap.pf || 0)],
      ['Employee ESI', formatCurrency(snap.esi || 0)],
      ['Professional Tax', formatCurrency(snap.pt || 0)],
      ['TDS', formatCurrency(snap.tds || 0)],
      ['LOP Deduction', formatCurrency(adj.lopDeduction || 0)],
      ['Other Deductions / Advance', formatCurrency(adj.otherDeduction || 0)],
      ['', ''] 
    ];

    const rowCount = Math.max(earningsData.length, deductionsData.length);
    while(earningsData.length < rowCount) earningsData.push(['', '']);
    while(deductionsData.length < rowCount) deductionsData.push(['', '']);

    const tableBody = [];
    for(let i=0; i<rowCount; i++) {
       tableBody.push([...earningsData[i], ...deductionsData[i]]);
    }
    
    tableBody.push([
      { content: 'Total Earnings', styles: { fontStyle: 'bold' } }, 
      { content: formatCurrency(snap.gross + incentives), styles: { fontStyle: 'bold' } }, 
      { content: 'Total Deductions', styles: { fontStyle: 'bold' } }, 
      { content: formatCurrency(totalDeductions), styles: { fontStyle: 'bold' } }
    ]);

    autoTable(doc, {
      startY: finalY,
      theme: 'grid',
      headStyles: { fillColor: [240, 240, 240], textColor: [0,0,0], fontStyle: 'bold', halign: 'center' },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 35, halign: 'right' },
        2: { cellWidth: 55 },
        3: { cellWidth: 35, halign: 'right' }
      },
      head: [['EARNINGS', 'AMOUNT', 'DEDUCTIONS', 'AMOUNT']],
      body: tableBody
    });

    // --- NET SALARY BLOCK ---
    finalY = doc.lastAutoTable.finalY + 10;
    
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(200);
    doc.rect(14, finalY, pageWidth - 28, 25, 'FD');

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`NET PAYABLE AMOUNT: ${formatCurrency(row.netPayable)}`, 20, finalY + 10);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(80);
    doc.text(`Amount in Words: ${numberToWords(row.netPayable)}`, 20, finalY + 18);

    // --- FOOTER NOTES ---
    finalY += 35;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("Notes:", 14, finalY);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);
    const notes = [
      "1. TaxBucket is a registered brand of SkyEdge TaxBucket India Private Limited.",
      "2. This salary slip is generated electronically and is valid without a physical signature.",
      "3. Salary components and deductions are based on the payroll records maintained by the Company for the respective month.",
      "4. Any discrepancy should be reported to the HR Department within 7 days of receipt."
    ];
    
    notes.forEach((note, i) => {
      doc.text(note, 14, finalY + 6 + (i * 5));
    });

    // --- SIGNATURE ---
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("For SkyEdge TaxBucket India Private Limited", pageWidth - 15, finalY + 10, { align: "right" });
    doc.text("Authorised Signatory", pageWidth - 15, finalY + 25, { align: "right" });

    // --- SAVE PDF ---
    doc.save(`${row.empCode}_${row.empName.replace(/ /g, '_')}_Payslip_${formattedMonth.replace(/ /g, '_')}.pdf`);
  };

  return (
    <div className="max-w-[100rem] mx-auto p-4 md:p-6 space-y-6 pb-12">
      <Toaster position="top-right" />

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <Calculator size={28} className="text-blue-600" /> Salary Calculation & Payslips
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Auto-calculate exact per-day salary synced with marked attendance.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => fetchSalaryData(true)} 
            disabled={loading} 
            className="inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 text-sm font-bold px-4 py-2.5 rounded-xl transition-all disabled:opacity-50"
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
             <span><strong>Late Policy:</strong> First 3 Lates Free. 4th onward = Half-Day cut. Forgiven lates will instantly restore salary.</span>
          </div>
        </div>
      </div>

      {/* SALARY SHEET TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1400px]">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th colSpan="2" className="py-2 px-4 border-r border-slate-200 text-center text-[10px] font-black uppercase text-slate-500">Employee Details</th>
                <th colSpan="2" className="py-2 px-4 border-r border-slate-200 text-center text-[10px] font-black uppercase text-emerald-600 bg-emerald-50">Salary Snapshot</th>
                <th colSpan="3" className="py-2 px-4 border-r border-slate-200 text-center text-[10px] font-black uppercase text-amber-600 bg-amber-50">Attendance Data</th>
                <th colSpan="5" className="py-2 px-4 border-r border-slate-200 text-center text-[10px] font-black uppercase text-rose-600 bg-rose-50">Adjustments & Deductions</th>
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
                
                <th className="py-3 px-4 text-center bg-rose-50/30">Forgiven Lates</th>
                <th className="py-3 px-4 text-right bg-rose-50/30">LOP Ded. (₹)</th>
                <th className="py-3 px-4 text-right bg-rose-50/30">Other Ded. (₹)</th>
                <th className="py-3 px-4 text-right bg-rose-50/30">Bonus (₹)</th>
                <th className="py-3 px-4 text-right border-r border-slate-200 bg-rose-50/30">Reimb. (₹)</th>
                
                <th className="py-3 px-4 text-right bg-blue-50/30 font-black">Net Salary</th>
                <th className="py-3 px-4 text-center bg-blue-50/30 w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
              {loading ? (
                <tr><td colSpan="14" className="text-center py-16 text-slate-400"><RefreshCw className="animate-spin inline-block mr-2" size={18}/> Calculating Payroll...</td></tr>
              ) : salarySheet.length === 0 ? (
                <tr><td colSpan="14" className="text-center py-16 text-slate-400">No active employees found for this month based on joining/exit dates.</td></tr>
              ) : (
                salarySheet.map((row, index) => {
                  const snap = row.salarySnapshot || { basic: 0, hra: 0, gross: 0 };
                  const att = row.attendanceSummary || { totalDays: 0, paidDays: 0, lopDays: 0, totalLates: 0, penalizedLates: 0 };
                  const adj = row.adjustments || { lopDeduction: 0, otherDeduction: 0, incentiveBonus: 0, reimbursement: 0, latesForgiven: 0 };
                  
                  const isOffboarded = ['Resigned', 'Terminated', 'Absconded'].includes(row.status);
                  const rowClass = isOffboarded 
                        ? 'bg-rose-50/40 hover:bg-rose-50 transition-colors border-l-4 border-rose-500' 
                        : 'hover:bg-slate-50/50 transition-colors';

                  return (
                    <tr key={row.employeeId} className={rowClass}>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                           {isOffboarded && <UserMinus size={14} className="text-rose-500 shrink-0"/>}
                           <div>
                              <p className={`font-bold ${isOffboarded ? 'text-rose-800' : 'text-slate-800'}`}>{row.empName}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{row.empCode}</p>
                           </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center border-r border-slate-100">
                        {row.isSaved ? (
                          <span className="flex items-center justify-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded"><CheckCircle2 size={12}/> Saved</span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded">Draft</span>
                        )}
                        {isOffboarded && (
                           <div className="text-[9px] font-black text-rose-600 uppercase mt-1">
                               {row.status}
                           </div>
                        )}
                      </td>
                      
                      <td className="py-3 px-4 text-right bg-emerald-50/10 text-xs">{(snap.basic + snap.hra).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right border-r border-slate-100 bg-emerald-50/10 font-bold text-emerald-700">{snap.gross.toLocaleString('en-IN')}</td>
                      
                      <td className="py-3 px-4 text-center bg-amber-50/10 text-xs">{att.totalDays}</td>
                      <td className="py-3 px-4 text-center bg-amber-50/10 text-sm font-black text-blue-600">{att.paidDays}</td>
                      <td className="py-3 px-4 text-center border-r border-slate-100 bg-amber-50/10 text-sm font-black text-rose-500">
                        {att.lopDays}
                        <br/>
                        <div className="flex flex-col text-[8px] leading-tight text-slate-500 mt-1">
                           <span>Total Lates: {att.totalLates} <span className="text-emerald-500 font-bold">(3 Free)</span></span>
                           {att.penalizedLates > 0 && <span className="text-rose-500 font-bold">Penalty: {att.penalizedLates}</span>}
                        </div>
                      </td>
                      
                      <td className="py-3 px-4 bg-rose-50/10">
                        <input 
                           type="number" 
                           min="0" 
                           value={adj.latesForgiven} 
                           onChange={(e) => handleAdjustmentChange(index, 'latesForgiven', e.target.value)} 
                           className="w-16 mx-auto block text-center p-1.5 border border-amber-200 rounded text-xs focus:ring-2 focus:ring-amber-500/20 text-amber-600 font-semibold bg-white" 
                           title="Forgive lates to recover salary" 
                        />
                      </td>
                      <td className="py-3 px-4 bg-rose-50/10">
                        <input type="number" min="0" value={adj.lopDeduction} onChange={(e) => handleAdjustmentChange(index, 'lopDeduction', e.target.value)} className="w-full text-right p-1.5 border border-slate-200 rounded text-xs focus:ring-2 focus:ring-blue-500/20 text-rose-600 font-semibold bg-white" />
                      </td>
                      <td className="py-3 px-4 bg-rose-50/10">
                        <input type="number" min="0" value={adj.otherDeduction} onChange={(e) => handleAdjustmentChange(index, 'otherDeduction', e.target.value)} className="w-full text-right p-1.5 border border-slate-200 rounded text-xs focus:ring-2 focus:ring-blue-500/20 text-rose-600 font-semibold bg-white" />
                      </td>
                      <td className="py-3 px-4 bg-rose-50/10">
                        <input type="number" min="0" value={adj.incentiveBonus} onChange={(e) => handleAdjustmentChange(index, 'incentiveBonus', e.target.value)} className="w-full text-right p-1.5 border border-slate-200 rounded text-xs focus:ring-2 focus:ring-blue-500/20 text-emerald-600 font-semibold bg-white" />
                      </td>
                      <td className="py-3 px-4 border-r border-slate-100 bg-rose-50/10">
                        <input type="number" min="0" value={adj.reimbursement} onChange={(e) => handleAdjustmentChange(index, 'reimbursement', e.target.value)} className="w-full text-right p-1.5 border border-slate-200 rounded text-xs focus:ring-2 focus:ring-blue-500/20 text-blue-600 font-semibold bg-white" />
                      </td>
                      
                      <td className="py-3 px-4 text-right bg-blue-50/10">
                        <div className="flex items-center justify-end gap-1 font-black text-blue-700 text-lg">
                          <IndianRupee size={16}/> {row.netPayable.toLocaleString('en-IN')}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center bg-blue-50/10">
                        <button 
                          onClick={() => generateSalarySlip(row)}
                          title="Download Salary Slip (PDF)"
                          className="p-2 bg-white hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-200 rounded-lg shadow-sm transition-colors mx-auto flex items-center justify-center group"
                        >
                          <Download size={16} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                        </button>
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