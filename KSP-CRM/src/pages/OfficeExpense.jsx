import React, { useState, useEffect, useContext, useMemo } from 'react';
import { IndianRupee, Plus, Receipt, Calendar, User, FileText, Loader2, Filter } from 'lucide-react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext'; 

const OfficeExpense = () => {
  const { user } = useContext(AuthContext);

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0], 
    nature: '',
    paidBy: '',
    amount: '',
    remarks: ''
  });

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false); 
  const [fetchLoading, setFetchLoading] = useState(true); 

  // 🔴 NAYA: Default filter abhi ka mahina aur saal uthayega
  const currentMonth = String(new Date().getMonth() + 1);
  const currentYear = String(new Date().getFullYear());

  const [monthFilter, setMonthFilter] = useState(currentMonth);
  const [yearFilter, setYearFilter] = useState(currentYear);

  // 1. Fetch Expenses from Backend
  const fetchExpenses = async () => {
    try {
      const headers = user?.token ? { Authorization: `Bearer ${user.token}` } : {};
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/expenses`, { headers });
      setExpenses(res.data.data || res.data || []);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      toast.error("Failed to load past expenses.");
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle Input Changes
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 2. Submit New Expense to Backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.nature || !formData.paidBy) {
      return toast.error("Please fill all mandatory fields");
    }

    setLoading(true);
    try {
      const headers = user?.token ? { Authorization: `Bearer ${user.token}` } : {};
      const payload = {
        ...formData,
        amount: Number(formData.amount) 
      };

      const res = await axios.post(`${import.meta.env.VITE_API_URL}/expenses`, payload, { headers });
      
      const newExpense = res.data.data || res.data; 
      setExpenses((prev) => [newExpense, ...prev]); 

      toast.success("Office Expense Recorded!");
      
      setFormData({
        date: formData.date,
        nature: '',
        paidBy: '',
        amount: '',
        remarks: ''
      });
    } catch (error) {
      console.error("Error saving expense:", error);
      toast.error(error.response?.data?.message || "Failed to record expense");
    } finally {
      setLoading(false);
    }
  };

  // Unique Years for Filter (Current year hamesha include karega)
  const uniqueYears = useMemo(() => {
    const years = expenses.map(e => new Date(e.date).getFullYear());
    if (!years.includes(Number(currentYear))) years.push(Number(currentYear)); // Ensure current year is in list
    return [...new Set(years)].sort((a,b) => b - a);
  }, [expenses, currentYear]);

  // Filter Logic (Month & Year ke hisaab se)
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const expDate = new Date(exp.date);
      const matchesMonth = monthFilter === 'All' || (expDate.getMonth() + 1).toString() === monthFilter;
      const matchesYear = yearFilter === 'All' || expDate.getFullYear().toString() === yearFilter;
      return matchesMonth && matchesYear;
    });
  }, [expenses, monthFilter, yearFilter]);

  // Total amount calculate karna (Sirf Filtered Data ka)
  const totalExpenses = filteredExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-wrap gap-4 justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Receipt className="text-blue-600" /> Office Expense Record
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage and track daily office expenditures</p>
        </div>
        
        {/* Total Expense Box (Updates Dynamically) */}
        <div className="bg-blue-50 border border-blue-200 px-5 py-2.5 rounded-xl text-right shadow-sm">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">
            {monthFilter !== 'All' || yearFilter !== 'All' ? 'Filtered Total' : 'Total Expenses'}
          </p>
          <p className="text-xl font-black text-blue-900 flex items-center justify-end gap-1">
            <IndianRupee size={18} /> {totalExpenses.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ADD EXPENSE FORM */}
        <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-200 shadow-lg self-start sticky top-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Add New Expense</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1 flex items-center gap-1">
                <Calendar size={14}/> Date *
              </label>
              <input
                type="date"
                name="date"
                required
                value={formData.date}
                onChange={handleChange}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Nature of Expense *
              </label>
              <input
                type="text"
                name="nature"
                required
                placeholder="e.g. Electricity, Tea, Marketing"
                value={formData.nature}
                onChange={handleChange}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1 flex items-center gap-1">
                <User size={14}/> Paid By *
              </label>
              <input
                type="text"
                name="paidBy"
                required
                placeholder="e.g. Shubham, Cash, HDFC Card"
                value={formData.paidBy}
                onChange={handleChange}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1 flex items-center gap-1">
                <IndianRupee size={14}/> Amount (₹) *
              </label>
              <input
                type="number"
                name="amount"
                required
                min="1"
                placeholder="0"
                value={formData.amount}
                onChange={handleChange}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-bold text-blue-700 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1 flex items-center gap-1">
                <FileText size={14}/> Remarks (Optional)
              </label>
              <textarea
                name="remarks"
                rows="2"
                placeholder="Any additional details..."
                value={formData.remarks}
                onChange={handleChange}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 resize-none"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} 
              {loading ? 'Saving...' : 'Record Expense'}
            </button>
          </form>
        </div>

        {/* EXPENSE LIST TABLE */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden flex flex-col min-h-[500px]">
          
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-slate-800">Expense Ledger</h2>
              <span className="text-xs font-bold bg-white px-3 py-1 border border-slate-200 rounded-full text-slate-500 shadow-sm">
                {filteredExpenses.length} Records
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 mr-1">
                <Filter size={14} className="text-slate-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Filter:</span>
              </div>
              <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-500/20 cursor-pointer">
                <option value="All">All Months</option>
                {Array.from({length: 12}, (_, i) => <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('en', {month: 'long'})}</option>)}
              </select>
              <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm focus:ring-2 focus:ring-blue-500/20 cursor-pointer">
                <option value="All">All Years</option>
                {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
          
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="text-[11px] text-slate-500 bg-white border-b border-slate-200 uppercase font-black tracking-wider sticky top-0">
                <tr>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Nature</th>
                  <th className="px-5 py-4">Paid By</th>
                  <th className="px-5 py-4">Remarks</th>
                  <th className="px-5 py-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fetchLoading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500 font-medium">
                      <Loader2 size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
                      Loading expenses...
                    </td>
                  </tr>
                ) : filteredExpenses.length > 0 ? (
                  filteredExpenses.map((item) => (
                    <tr key={item._id || item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap text-slate-600 font-bold text-xs">
                        {new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-4 text-slate-800 font-bold">{item.nature}</td>
                      <td className="px-5 py-4 text-slate-600">
                        <span className="bg-slate-100 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase border border-slate-200 tracking-wider">
                          {item.paidBy}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-500 text-xs max-w-[200px] truncate" title={item.remarks}>
                        {item.remarks || '-'}
                      </td>
                      <td className="px-5 py-4 text-right font-black text-rose-600 whitespace-nowrap text-sm">
                        - ₹{Number(item.amount).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-medium bg-slate-50/50">
                      No expenses found for the selected period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default OfficeExpense;