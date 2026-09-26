// import React, { useState, useEffect, useContext, useMemo } from 'react';
// import axios from 'axios';
// import { AuthContext } from '../context/AuthContext';
// import toast, { Toaster } from 'react-hot-toast';
// import { 
//   Building, Search, Plus, X, Mail, Phone, MapPin, 
//   CheckCircle2, Edit, AlertCircle, RefreshCw, Trash2, AlertTriangle, 
//   Briefcase, Eye, UserCircle, Hash, FileText, Calculator, Building2, ShieldCheck, FileKey
// } from 'lucide-react';

// const ClientMaster = () => {
//   const { user } = useContext(AuthContext);
  
//   const [clients, setClients] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
  
//   // Filters
//   const [searchQuery, setSearchQuery] = useState('');
//   const [statusFilter, setStatusFilter] = useState('Active');
//   const [typeFilter, setTypeFilter] = useState('All');

//   // Modals
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [editingId, setEditingId] = useState(null);
//   const [deleteModal, setDeleteModal] = useState({ open: false, client: null });
  
//   // View Profile Modal
//   const [isViewModalOpen, setIsViewModalOpen] = useState(false);
//   const [clientToView, setClientToView] = useState(null);

//   // 🔴 UPDATED: New common fields added
//   const initialForm = {
//     pan: '', name: '', mobile: '', email: '', 
//     clientType: 'Individual', address: '', state: '', pinCode: '',
//     gstin: '', aadhaar: '', dob: '', fatherName: '', 
//     status: 'Active', remarks: ''
//   };
  
//   const [formData, setFormData] = useState(initialForm);

//   const fetchClients = async () => {
//     setLoading(true);
//     try {
//       const headers = { Authorization: `Bearer ${user.token}` };
//       const res = await axios.get(`${import.meta.env.VITE_API_URL}/client-master`, { headers });
//       setClients(res.data || []);
//     } catch (error) {
//       toast.error("Failed to load clients");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchClients();
//     // eslint-disable-next-line
//   }, [user.token]);

//   const filteredClients = useMemo(() => {
//     return clients.filter(client => {
//       const searchStr = searchQuery.toLowerCase();
//       const matchesSearch = 
//         (client.name?.toLowerCase() || '').includes(searchStr) || 
//         (client.pan?.toLowerCase() || '').includes(searchStr) ||
//         (client.gstin?.toLowerCase() || '').includes(searchStr);
        
//       const matchesStatus = statusFilter === 'All' || client.status === statusFilter;
//       const matchesType = typeFilter === 'All' || client.clientType === typeFilter;
      
//       return matchesSearch && matchesStatus && matchesType;
//     });
//   }, [clients, searchQuery, statusFilter, typeFilter]);

//   const handleSave = async (e) => {
//     e.preventDefault();
//     if (!formData.pan) return toast.error("PAN Number is required!");
//     if (formData.pan.length !== 10) return toast.error("PAN must be exactly 10 characters.");
    
//     setSaving(true);
//     try {
//       const headers = { Authorization: `Bearer ${user.token}` };
      
//       if (editingId) {
//         await axios.put(`${import.meta.env.VITE_API_URL}/client-master/${editingId}`, formData, { headers });
//         toast.success("Client Updated Successfully!");
//       } else {
//         await axios.post(`${import.meta.env.VITE_API_URL}/client-master`, formData, { headers });
//         toast.success("New Client Added!");
//       }
      
//       setIsModalOpen(false);
//       fetchClients();
//     } catch (error) {
//       toast.error(error.response?.data?.message || "Failed to save client");
//     } finally {
//       setSaving(false);
//     }
//   };

//   const handleEdit = (client) => {
//     setEditingId(client._id);
    
//     const parseDate = (d) => d ? new Date(d).toISOString().split('T')[0] : '';

//     setFormData({
//       pan: client.pan || '', 
//       name: client.name || '', 
//       mobile: client.mobile || '', 
//       email: client.email || '', 
//       clientType: client.clientType || 'Individual', 
//       address: client.address || '', 
//       state: client.state || '', 
//       pinCode: client.pinCode || '',
//       gstin: client.gstin || '',
//       aadhaar: client.aadhaar || '',
//       dob: parseDate(client.dob),
//       fatherName: client.fatherName || '',
//       status: client.status || 'Active', 
//       remarks: client.remarks || ''
//     });
//     setIsModalOpen(true);
//   };

//   const openNewModal = () => {
//     setEditingId(null);
//     setFormData(initialForm);
//     setIsModalOpen(true);
//   };

//   const handleOpenView = (client) => {
//     setClientToView(client);
//     setIsViewModalOpen(true);
//   };

//   const executeDelete = async () => {
//     try {
//       const headers = { Authorization: `Bearer ${user.token}` };
//       await axios.delete(`${import.meta.env.VITE_API_URL}/client-master/${deleteModal.client._id}`, { headers });
//       toast.success("Client deleted permanently.");
//       setDeleteModal({ open: false, client: null });
//       fetchClients();
//     } catch (error) {
//       toast.error(error.response?.data?.message || "Error deleting client");
//     }
//   };

//   const getStatusBadge = (status) => {
//     return status === 'Active' 
//       ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
//       : 'bg-rose-50 text-rose-700 border-rose-200';
//   };

//   return (
//     <div className="max-w-7xl mx-auto p-6 space-y-6 pb-12">
//       <Toaster position="top-right" />

//       {/* HEADER */}
//       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//         <div>
//           <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
//             <Building size={28} className="text-blue-600" /> Client Master (360° Profile)
//           </h1>
//           <p className="text-sm text-slate-500 mt-1 font-medium">Global central database for all your clients across ITR, GST, ROC & Audits.</p>
//         </div>
//         <button onClick={openNewModal} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-md shadow-blue-500/20 transition-all">
//           <Plus size={18} strokeWidth={2.5} /> Add New Client
//         </button>
//       </div>

//       {/* FILTERS */}
//       <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
//         <div className="p-4 bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center justify-between border-b border-slate-100">
//           <div className="relative w-full md:w-1/3">
//             <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
//             <input 
//               type="text" 
//               placeholder="Search by Name, PAN or GSTIN..." 
//               value={searchQuery} 
//               onChange={(e) => setSearchQuery(e.target.value)} 
//               className="w-full pl-9 pr-3.5 py-2.5 text-sm font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm" 
//             />
//           </div>
          
//           <div className="w-full md:w-auto flex gap-3">
//             <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full md:w-auto text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer">
//               <option value="All">All Types</option>
//               <option value="Individual">Individual</option>
//               <option value="Proprietorship">Proprietorship</option>
//               <option value="Partnership Firm">Partnership Firm</option>
//               <option value="LLP">LLP</option>
//               <option value="Private Limited">Private Limited</option>
//               <option value="Other">Other</option>
//             </select>

//             <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full md:w-auto text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer">
//               <option value="All">All Statuses</option>
//               <option value="Active">Active</option>
//               <option value="Inactive">Inactive</option>
//             </select>
//           </div>
//         </div>

//         {/* CLIENT LIST TABLE */}
//         <div className="overflow-x-auto custom-scrollbar max-h-[65vh]">
//           <table className="w-full text-left border-collapse relative">
//             <thead className="sticky top-0 z-10 shadow-sm bg-slate-100 border-b border-slate-200">
//               <tr className="text-slate-600 text-[10px] font-black uppercase tracking-wider">
//                 <th className="py-4 px-5">Client Info</th>
//                 <th className="py-4 px-5">Tax & Identifiers</th>
//                 <th className="py-4 px-5">Contact Details</th>
//                 <th className="py-4 px-5">Entity & Location</th>
//                 <th className="py-4 px-5">Status</th>
//                 <th className="py-4 px-5 text-right">Action</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-100 text-sm">
//               {loading ? (
//                 <tr><td colSpan="6" className="text-center py-16 text-slate-400"><RefreshCw className="animate-spin inline-block mr-2" size={18}/> Loading Master Database...</td></tr>
//               ) : filteredClients.length === 0 ? (
//                 <tr><td colSpan="6" className="text-center py-16 text-slate-400 flex flex-col items-center"><AlertCircle size={36} className="mb-3 text-slate-300"/> No clients found.</td></tr>
//               ) : (
//                 filteredClients.map((client) => (
//                   <tr key={client._id} className="hover:bg-slate-50/70 transition-colors group">
//                     <td className="py-3 px-5">
//                       <div className="flex items-center gap-3">
//                         <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-sm shrink-0 border border-blue-200">
//                           {client.name.charAt(0).toUpperCase()}
//                         </div>
//                         <div>
//                           <p className="font-bold text-slate-800">{client.name}</p>
//                           <p className="text-[10px] font-bold text-slate-500 mt-0.5 flex items-center gap-1">
//                             <Briefcase size={10} /> {client.clientType}
//                           </p>
//                         </div>
//                       </div>
//                     </td>
//                     <td className="py-3 px-5">
//                       <div className="space-y-1.5">
//                         <p className="text-[11px] font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 inline-block w-max">
//                           PAN: {client.pan}
//                         </p>
//                         {client.gstin && (
//                           <p className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 inline-block w-max">
//                             GST: {client.gstin}
//                           </p>
//                         )}
//                       </div>
//                     </td>
//                     <td className="py-3 px-5">
//                       <div className="space-y-1">
//                         <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"><Phone size={12} className="text-slate-400"/> {client.mobile || 'N/A'}</p>
//                         {client.email && <p className="text-[10px] font-bold text-blue-600 flex items-center gap-1.5 truncate max-w-[150px]" title={client.email}><Mail size={10} className="shrink-0"/> {client.email}</p>}
//                       </div>
//                     </td>
//                     <td className="py-3 px-5">
//                       <p className="text-[11px] text-slate-600 flex items-start gap-1.5 mt-0.5 max-w-[180px]">
//                         <MapPin size={12} className="text-slate-400 mt-0.5 shrink-0"/> 
//                         <span className="truncate">{client.state ? `${client.state} ${client.pinCode ? `(${client.pinCode})` : ''}` : 'Location not added'}</span>
//                       </p>
//                     </td>
//                     <td className="py-3 px-5">
//                       <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(client.status)}`}>
//                         {client.status}
//                       </span>
//                     </td>
//                     <td className="py-3 px-5 text-right">
//                       <div className="flex items-center justify-end gap-1">
//                         <button onClick={() => handleOpenView(client)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent" title="View 360 Profile">
//                           <Eye size={16}/>
//                         </button>
//                         <button onClick={() => handleEdit(client)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent" title="Edit Client">
//                           <Edit size={16}/>
//                         </button>
//                         <button onClick={() => setDeleteModal({ open: true, client: client })} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent" title="Delete Client">
//                           <Trash2 size={16}/>
//                         </button>
//                       </div>
//                     </td>
//                   </tr>
//                 ))
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* 🔴 FULL VIEW 360 PROFILE MODAL */}
//       {isViewModalOpen && clientToView && (
//         <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
//           <div className="bg-slate-50 rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
            
//             <div className="relative px-8 pt-6 pb-16 bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-t-3xl flex justify-between items-start overflow-hidden">
//               <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
              
//               <div className="flex items-center gap-5 z-10">
//                 <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/30 shadow-inner">
//                   <UserCircle size={36} className="text-white" />
//                 </div>
//                 <div>
//                   <h2 className="text-2xl font-black tracking-tight">{clientToView.name}</h2>
//                   <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-blue-100 font-medium">
//                     <span className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-md border border-white/10 font-mono tracking-wider text-white">
//                       PAN: {clientToView.pan}
//                     </span>
//                     <span className="flex items-center gap-1.5">
//                       <Briefcase size={14} className="opacity-70"/> {clientToView.clientType}
//                     </span>
//                     <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${clientToView.status === 'Active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}`}>
//                       {clientToView.status}
//                     </span>
//                   </div>
//                 </div>
//               </div>
//               <button onClick={() => setIsViewModalOpen(false)} className="z-10 p-2 rounded-full bg-black/10 hover:bg-black/20 text-white transition-colors"><X size={20} strokeWidth={2.5} /></button>
//             </div>
            
//             <div className="overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar">
              
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
//                 {/* Contact & General Card */}
//                 <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
//                   <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
//                   <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
//                     <MapPin size={14}/> General & Contact Info
//                   </h3>
                  
//                   <div className="space-y-4">
//                     <div className="grid grid-cols-2 gap-4">
//                       <div>
//                         <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Mobile</p>
//                         <p className="text-sm font-semibold text-slate-800">{clientToView.mobile || 'N/A'}</p>
//                       </div>
//                       <div>
//                         <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Email</p>
//                         <p className="text-sm font-semibold text-slate-800 truncate" title={clientToView.email}>{clientToView.email || 'N/A'}</p>
//                       </div>
//                     </div>
//                     <div className="grid grid-cols-2 gap-4">
//                       <div>
//                         <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">DOB / Incorporation</p>
//                         <p className="text-sm font-semibold text-slate-800">{clientToView.dob ? new Date(clientToView.dob).toLocaleDateString('en-IN') : 'N/A'}</p>
//                       </div>
//                       <div>
//                         <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Father's Name</p>
//                         <p className="text-sm font-semibold text-slate-800">{clientToView.fatherName || 'N/A'}</p>
//                       </div>
//                     </div>
//                     <div className="pt-3 border-t border-slate-100">
//                       <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Full Address</p>
//                       <p className="text-sm font-semibold text-slate-700">
//                         {[clientToView.address, clientToView.district, clientToView.state, clientToView.pinCode].filter(Boolean).join(', ') || 'N/A'}
//                       </p>
//                     </div>
//                   </div>
//                 </div>

//                 {/* Tax Identifiers Card */}
//                 <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
//                   <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
//                   <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
//                     <Hash size={14}/> Tax & ID Credentials
//                   </h3>
                  
//                   <div className="space-y-4">
//                     <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
//                       <span className="text-xs font-bold text-slate-500">PAN Number</span>
//                       <span className="text-sm font-mono font-black text-slate-800 tracking-widest">{clientToView.pan}</span>
//                     </div>
//                     <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
//                       <span className="text-xs font-bold text-slate-500">GSTIN</span>
//                       <span className="text-sm font-mono font-bold text-indigo-700">{clientToView.gstin || 'Not Provided'}</span>
//                     </div>
//                     <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
//                       <span className="text-xs font-bold text-slate-500">Aadhaar (Masked)</span>
//                       <span className="text-sm font-mono font-bold text-slate-600">
//                         {clientToView.aadhaar ? `XXXX-XXXX-${clientToView.aadhaar.slice(-4)}` : 'Not Provided'}
//                       </span>
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               {/* 🔴 SERVICE LINKAGE SUMMARY (The 360 View) */}
//               {/* 🔴 SERVICE LINKAGE SUMMARY (The 360 View) */}
//               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
//                 <h3 className="text-sm font-black text-slate-800 mb-5 pb-2 border-b border-slate-100 flex items-center gap-2">
//                   <ShieldCheck size={18} className="text-emerald-600"/> Connected Workspaces & Services
//                 </h3>
                
//                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//                   {/* ITR Box */}
//                   <div className={`border rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2 transition-all ${clientToView.services?.itr ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 border-slate-100 opacity-60 grayscale'}`}>
//                     <div className={`h-10 w-10 rounded-full flex items-center justify-center ${clientToView.services?.itr ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-400'}`}><FileText size={18}/></div>
//                     <span className="text-xs font-bold text-slate-700">Income Tax (ITR)</span>
//                     {clientToView.services?.itr ? (
//                        <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded shadow-sm flex items-center gap-1"><CheckCircle2 size={10}/> Active</span>
//                     ) : (
//                        <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded">Not Linked</span>
//                     )}
//                   </div>
                  
//                   {/* GST Box */}
//                   <div className={`border rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2 transition-all ${clientToView.services?.gst ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50 border-slate-100 opacity-60 grayscale'}`}>
//                     <div className={`h-10 w-10 rounded-full flex items-center justify-center ${clientToView.services?.gst ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-400'}`}><Calculator size={18}/></div>
//                     <span className="text-xs font-bold text-slate-700">GST Returns</span>
//                     {clientToView.services?.gst ? (
//                       <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded shadow-sm flex items-center gap-1"><CheckCircle2 size={10}/> Active</span>
//                     ) : (
//                       <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded">Not Linked</span>
//                     )}
//                   </div>

//                   {/* ROC Box */}
//                   <div className={`border rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2 transition-all ${clientToView.services?.roc ? 'bg-purple-50/50 border-purple-200' : 'bg-slate-50 border-slate-100 opacity-60 grayscale'}`}>
//                     <div className={`h-10 w-10 rounded-full flex items-center justify-center ${clientToView.services?.roc ? 'bg-purple-100 text-purple-600' : 'bg-slate-200 text-slate-400'}`}><Building2 size={18}/></div>
//                     <span className="text-xs font-bold text-slate-700">ROC / MCA</span>
//                     {clientToView.services?.roc ? (
//                        <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded shadow-sm flex items-center gap-1"><CheckCircle2 size={10}/> Active</span>
//                     ) : (
//                        <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded">Not Linked</span>
//                     )}
//                   </div>

//                   {/* Audit & TDS Box (Static for now) */}
//                   <div className="bg-slate-50 border border-slate-100 opacity-60 grayscale rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2">
//                     <div className="h-10 w-10 bg-slate-200 text-slate-400 rounded-full flex items-center justify-center"><FileKey size={18}/></div>
//                     <span className="text-xs font-bold text-slate-700">TDS & Audit</span>
//                     <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded">Not Linked</span>
//                   </div>
//                 </div>
//               </div>

//             </div>
            
//             <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100 bg-white rounded-b-3xl">
//               <div></div>
//               <div className="flex items-center gap-3">
//                 <button onClick={() => setIsViewModalOpen(false)} className="px-5 py-2.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors">
//                   Close Profile
//                 </button>
//                 <button onClick={() => { setIsViewModalOpen(false); handleEdit(clientToView); }} className="px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-2">
//                   <Edit size={15} strokeWidth={2.5}/> Edit Details
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* ADD / EDIT CLIENT MODAL */}
//       {isModalOpen && (
//         <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
//           <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
            
//             <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/80">
//               <div>
//                 <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
//                   <Building className="text-blue-600" size={20}/> {editingId ? 'Edit Client Details' : 'Add New Client'}
//                 </h2>
//               </div>
//               <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"><X size={18} /></button>
//             </div>

//             <form onSubmit={handleSave} className="overflow-y-auto p-6 space-y-6 custom-scrollbar">
              
//               <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                
//                 {/* 🔴 PAN (Master Key) & Core Details */}
//                 <div className="md:col-span-4 bg-blue-50/40 p-5 rounded-2xl border border-blue-100">
//                   <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider border-b border-blue-200/50 pb-2 mb-4 flex items-center gap-2">
//                      Core Details (Master Identifiers)
//                   </h3>
//                   <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//                     <div className="md:col-span-1">
//                       <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">PAN Number *</label>
//                       <input 
//                         type="text" 
//                         required 
//                         maxLength="10"
//                         value={formData.pan} 
//                         onChange={(e) => setFormData({...formData, pan: e.target.value.toUpperCase()})} 
//                         disabled={editingId} // Usually PAN shouldn't be edited once created as it's the master key
//                         placeholder="ABCDE1234F" 
//                         className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-black text-slate-800 uppercase tracking-widest bg-white focus:ring-2 focus:ring-blue-500/20 outline-none disabled:bg-slate-100 disabled:text-slate-400"
//                       />
//                     </div>
//                     <div className="md:col-span-2">
//                       <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Client Name / Entity Name *</label>
//                       <input 
//                         type="text" 
//                         required 
//                         value={formData.name} 
//                         onChange={(e) => setFormData({...formData, name: e.target.value})} 
//                         className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold bg-white focus:ring-2 focus:ring-blue-500/20"
//                       />
//                     </div>
//                     <div>
//                       <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Entity Type</label>
//                       <select 
//                         value={formData.clientType} 
//                         onChange={(e) => setFormData({...formData, clientType: e.target.value})} 
//                         className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 bg-white focus:ring-2 focus:ring-blue-500/20"
//                       >
//                         <option value="Individual">Individual</option>
//                         <option value="Proprietorship">Proprietorship</option>
//                         <option value="Partnership Firm">Partnership Firm</option>
//                         <option value="LLP">LLP</option>
//                         <option value="Private Limited">Private Limited</option>
//                         <option value="Public Limited">Public Limited</option>
//                         <option value="HUF">HUF</option>
//                         <option value="Trust">Trust</option>
//                         <option value="Other">Other</option>
//                       </select>
//                     </div>
//                   </div>
                  
//                   {/* Additional Common Identifiers */}
//                   <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-blue-100">
//                     <div className="md:col-span-1">
//                       <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">GSTIN (If Any)</label>
//                       <input 
//                         type="text" 
//                         value={formData.gstin} 
//                         onChange={(e) => setFormData({...formData, gstin: e.target.value.toUpperCase()})} 
//                         placeholder="22AAAAA0000A1Z5" 
//                         className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-mono font-bold text-indigo-700 uppercase bg-white focus:ring-2 focus:ring-blue-500/20"
//                       />
//                     </div>
//                     <div className="md:col-span-1">
//                       <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Aadhaar (Last 4 Digits)</label>
//                       <input 
//                         type="text" 
//                         maxLength="12"
//                         value={formData.aadhaar} 
//                         onChange={(e) => setFormData({...formData, aadhaar: e.target.value})} 
//                         placeholder="e.g. 1234" 
//                         className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold bg-white focus:ring-2 focus:ring-blue-500/20"
//                       />
//                     </div>
//                     <div className="md:col-span-1">
//                       <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">DOB / Incorporation</label>
//                       <input 
//                         type="date" 
//                         value={formData.dob} 
//                         onChange={(e) => setFormData({...formData, dob: e.target.value})} 
//                         className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white focus:ring-2 focus:ring-blue-500/20"
//                       />
//                     </div>
//                     <div className="md:col-span-1">
//                       <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Father's Name (For ITR)</label>
//                       <input 
//                         type="text" 
//                         value={formData.fatherName} 
//                         onChange={(e) => setFormData({...formData, fatherName: e.target.value})} 
//                         placeholder="Name..." 
//                         className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold bg-white focus:ring-2 focus:ring-blue-500/20"
//                       />
//                     </div>
//                   </div>
//                 </div>

//                 {/* Contact & Location Details */}
//                 <div className="md:col-span-4 mt-2">
//                   <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-2 mb-4">Contact & Location Info</h3>
//                   <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//                     <div>
//                       <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Mobile Number</label>
//                       <input type="text" value={formData.mobile} onChange={(e) => setFormData({...formData, mobile: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20"/>
//                     </div>
//                     <div>
//                       <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Email Address</label>
//                       <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20"/>
//                     </div>
//                     <div>
//                       <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">State</label>
//                       <input type="text" placeholder="e.g. Delhi" value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20"/>
//                     </div>
//                     <div>
//                       <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">PIN Code</label>
//                       <input type="text" value={formData.pinCode} onChange={(e) => setFormData({...formData, pinCode: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20"/>
//                     </div>
//                     <div className="md:col-span-4">
//                       <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Full Address</label>
//                       <textarea rows="2" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold resize-none focus:ring-2 focus:ring-blue-500/20"/>
//                     </div>
//                   </div>
//                 </div>

//                 {/* Status & Remarks */}
//                 <div className="md:col-span-4 mt-2">
//                   <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//                     <div>
//                       <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Current Status</label>
//                       <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20">
//                         <option value="Active">Active</option>
//                         <option value="Inactive">Inactive</option>
//                       </select>
//                     </div>
//                     <div className="md:col-span-3">
//                       <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Remarks / Notes</label>
//                       <input type="text" placeholder="Any internal notes for this client" value={formData.remarks} onChange={(e) => setFormData({...formData, remarks: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20"/>
//                     </div>
//                   </div>
//                 </div>

//               </div>

//               <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
//                 <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
//                 <button type="submit" disabled={saving} className="px-8 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50">
//                   {saving ? <RefreshCw size={18} className="animate-spin"/> : <CheckCircle2 size={18} />} 
//                   {editingId ? 'Update Master Profile' : 'Save Client'}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* DELETE CONFIRMATION MODAL */}
//       {deleteModal.open && (
//         <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
//           <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 p-8 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
//             <div className="mx-auto h-16 w-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 mb-2">
//               <AlertTriangle size={32} />
//             </div>
//             <div>
//               <h3 className="text-xl font-bold text-slate-800 tracking-tight">Delete Client?</h3>
//               <p className="text-sm text-slate-500 mt-2 leading-relaxed">
//                 Are you sure you want to permanently delete <span className="font-bold text-slate-700">{deleteModal.client?.name}</span>? 
//                 <br/><span className="text-[10px] text-rose-500 font-bold">*Note: Linked ITR/GST data might lose client reference!</span>
//               </p>
//             </div>
//             <div className="flex justify-center gap-3 pt-4">
//               <button onClick={() => setDeleteModal({ open: false, client: null })} className="px-6 py-2.5 text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors">Cancel</button>
//               <button onClick={executeDelete} className="px-6 py-2.5 text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md shadow-rose-500/20 transition-all active:scale-95">Yes, Delete</button>
//             </div>
//           </div>
//         </div>
//       )}

//     </div>
//   );
// };

// export default ClientMaster;













import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import { 
  Building, Search, Plus, X, Mail, Phone, MapPin, 
  CheckCircle2, Edit, AlertCircle, RefreshCw, Trash2, AlertTriangle, 
  Briefcase, Eye, UserCircle, Hash, FileText, Calculator, Building2, FileKey, ShieldCheck,
  IndianRupee, MessageCircle, Clock
} from 'lucide-react';

const ClientMaster = () => {
  const { user } = useContext(AuthContext);
  
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [typeFilter, setTypeFilter] = useState('All');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, client: null });
  
  // View Profile Modal
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [clientToView, setClientToView] = useState(null);

  // 🔴 Invoices Data State for View Modal
  const [clientInvoices, setClientInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Initial Form State
  const initialForm = {
    pan: '', name: '', mobile: '', email: '', 
    clientType: 'Individual', address: '', state: '', pinCode: '',
    gstin: '', aadhaar: '', dob: '', fatherName: '', 
    status: 'Active', remarks: ''
  };
  
  const [formData, setFormData] = useState(initialForm);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/client-master`, { headers });
      setClients(res.data || []);
    } catch (error) {
      toast.error("Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
    // eslint-disable-next-line
  }, [user.token]);

  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const searchStr = searchQuery.toLowerCase();
      const matchesSearch = 
        (client.name?.toLowerCase() || '').includes(searchStr) || 
        (client.pan?.toLowerCase() || '').includes(searchStr) ||
        (client.gstin?.toLowerCase() || '').includes(searchStr) ||
        (client.clientId?.toLowerCase() || '').includes(searchStr);
        
      const matchesStatus = statusFilter === 'All' || client.status === statusFilter;
      const matchesType = typeFilter === 'All' || client.clientType === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [clients, searchQuery, statusFilter, typeFilter]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.pan) return toast.error("PAN Number is required!");
    if (formData.pan.length !== 10) return toast.error("PAN must be exactly 10 characters.");
    
    setSaving(true);
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      
      if (editingId) {
        await axios.put(`${import.meta.env.VITE_API_URL}/client-master/${editingId}`, formData, { headers });
        toast.success("Client Updated Successfully!");
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/client-master`, formData, { headers });
        toast.success("New Client Added!");
      }
      
      setIsModalOpen(false);
      fetchClients();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save client");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (client) => {
    setEditingId(client._id);
    
    const parseDate = (d) => d ? new Date(d).toISOString().split('T')[0] : '';

    setFormData({
      pan: client.pan || '', 
      name: client.name || '', 
      mobile: client.mobile || '', 
      email: client.email || '', 
      clientType: client.clientType || 'Individual', 
      address: client.address || '', 
      state: client.state || '', 
      pinCode: client.pinCode || '',
      gstin: client.gstin || '',
      aadhaar: client.aadhaar || '',
      dob: parseDate(client.dob),
      fatherName: client.fatherName || '',
      status: client.status || 'Active', 
      remarks: client.remarks || ''
    });
    setIsModalOpen(true);
  };

  const openNewModal = () => {
    setEditingId(null);
    setFormData(initialForm);
    setIsModalOpen(true);
  };

  // 🔴 FETCH INVOICES WHEN PROFILE OPENS
  const handleOpenView = async (client) => {
    setClientToView(client);
    setIsViewModalOpen(true);
    
    setLoadingInvoices(true);
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/invoices`, { headers });
      const allInvoices = res.data.data || [];
      
      // Match invoices by PAN, GSTIN, or exact Name
      const matchingInvoices = allInvoices.filter(inv => 
        (client.pan && inv.customer?.pan?.toUpperCase() === client.pan?.toUpperCase()) || 
        (client.gstin && inv.customer?.gstin?.toUpperCase() === client.gstin?.toUpperCase()) ||
        (inv.customer?.name?.toLowerCase() === client.name?.toLowerCase())
      );
      
      setClientInvoices(matchingInvoices);
    } catch (error) {
      console.error("Failed to load invoices", error);
    } finally {
      setLoadingInvoices(false);
    }
  };

  // 🔴 WHATSAPP REMINDER FUNCTION
  const sendWhatsappReminder = (inv, client) => {
    const phone = inv.customer?.phone || client.mobile;
    if (!phone) {
       return toast.error("Mobile number is missing for this client!");
    }
    
    const text = `Hello ${client.name},\n\nThis is a gentle reminder regarding your Invoice (${inv.invoiceNo}) for Rs. ${inv.totalAmountAfterTax?.toLocaleString('en-IN')}.\n\nThe payment status is currently marked as *PENDING*.\nPlease process the payment at your earliest convenience.\n\nThank you,\nSkyEdge Taxbucket`;
    const encodedText = encodeURIComponent(text);
    const waLink = `https://wa.me/91${phone.replace(/\D/g, '')}?text=${encodedText}`;
    
    window.open(waLink, '_blank');
    toast.success("Opening WhatsApp for Reminder!");
  };

  const executeDelete = async () => {
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      await axios.delete(`${import.meta.env.VITE_API_URL}/client-master/${deleteModal.client._id}`, { headers });
      toast.success("Client deleted permanently.");
      setDeleteModal({ open: false, client: null });
      fetchClients();
    } catch (error) {
      toast.error(error.response?.data?.message || "Error deleting client");
    }
  };

  const getStatusBadge = (status) => {
    return status === 'Active' 
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
      : 'bg-rose-50 text-rose-700 border-rose-200';
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 pb-12">
      <Toaster position="top-right" />

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <Building size={28} className="text-blue-600" /> Client Master (360° Profile)
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Global central database for all your clients across ITR, GST, ROC & Audits.</p>
        </div>
        <button onClick={openNewModal} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-md shadow-blue-500/20 transition-all">
          <Plus size={18} strokeWidth={2.5} /> Add New Client
        </button>
      </div>

      {/* FILTERS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center justify-between border-b border-slate-100">
          <div className="relative w-full md:w-1/3">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search by ID, Name, PAN or GSTIN..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full pl-9 pr-3.5 py-2.5 text-sm font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm" 
            />
          </div>
          
          <div className="w-full md:w-auto flex gap-3">
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full md:w-auto text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer">
              <option value="All">All Types</option>
              <option value="Individual">Individual</option>
              <option value="Proprietorship">Proprietorship</option>
              <option value="Partnership Firm">Partnership Firm</option>
              <option value="LLP">LLP</option>
              <option value="Private Limited">Private Limited</option>
              <option value="Other">Other</option>
            </select>

            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full md:w-auto text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer">
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* CLIENT LIST TABLE */}
        <div className="overflow-x-auto custom-scrollbar max-h-[65vh]">
          <table className="w-full text-left border-collapse relative">
            <thead className="sticky top-0 z-10 shadow-sm bg-slate-100 border-b border-slate-200">
              <tr className="text-slate-600 text-[10px] font-black uppercase tracking-wider">
                <th className="py-4 px-5">Client Info</th>
                <th className="py-4 px-5">Tax & Identifiers</th>
                <th className="py-4 px-5">Contact Details</th>
                <th className="py-4 px-5">Entity & Location</th>
                <th className="py-4 px-5">Status</th>
                <th className="py-4 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr><td colSpan="6" className="text-center py-16 text-slate-400"><RefreshCw className="animate-spin inline-block mr-2" size={18}/> Loading Master Database...</td></tr>
              ) : filteredClients.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-16 text-slate-400 flex flex-col items-center"><AlertCircle size={36} className="mb-3 text-slate-300"/> No clients found.</td></tr>
              ) : (
                filteredClients.map((client) => (
                  <tr key={client._id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-sm shrink-0 border border-blue-200">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 flex items-center gap-2">
                            {client.name}
                            {client.clientId && (
                               <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-slate-200/70 text-slate-600 tracking-wider">
                                 {client.clientId}
                               </span>
                            )}
                          </p>
                          <p className="text-[10px] font-bold text-slate-500 mt-0.5 flex items-center gap-1">
                            <Briefcase size={10} /> {client.clientType}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-5">
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 inline-block w-max">
                          PAN: {client.pan}
                        </p>
                        {client.gstin && (
                          <p className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 inline-block w-max">
                            GST: {client.gstin}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-5">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"><Phone size={12} className="text-slate-400"/> {client.mobile || 'N/A'}</p>
                        {client.email && <p className="text-[10px] font-bold text-blue-600 flex items-center gap-1.5 truncate max-w-[150px]" title={client.email}><Mail size={10} className="shrink-0"/> {client.email}</p>}
                      </div>
                    </td>
                    <td className="py-3 px-5">
                      <p className="text-[11px] text-slate-600 flex items-start gap-1.5 mt-0.5 max-w-[180px]">
                        <MapPin size={12} className="text-slate-400 mt-0.5 shrink-0"/> 
                        <span className="truncate">{client.state ? `${client.state} ${client.pinCode ? `(${client.pinCode})` : ''}` : 'Location not added'}</span>
                      </p>
                    </td>
                    <td className="py-3 px-5">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(client.status)}`}>
                        {client.status}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleOpenView(client)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent" title="View 360 Profile">
                          <Eye size={16}/>
                        </button>
                        <button onClick={() => handleEdit(client)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent" title="Edit Client">
                          <Edit size={16}/>
                        </button>
                        <button onClick={() => setDeleteModal({ open: true, client: client })} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent" title="Delete Client">
                          <Trash2 size={16}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FULL VIEW 360 PROFILE MODAL */}
      {isViewModalOpen && clientToView && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-slate-50 rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
            
            <div className="relative px-8 pt-6 pb-16 bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-t-3xl flex justify-between items-start overflow-hidden">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
              
              <div className="flex items-center gap-5 z-10">
                <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/30 shadow-inner">
                  <UserCircle size={36} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight">{clientToView.name}</h2>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-blue-100 font-medium">
                    {clientToView.clientId && (
                      <span className="flex items-center gap-1.5 bg-white/20 px-2.5 py-1 rounded-md border border-white/30 font-mono tracking-wider text-white font-bold">
                        ID: {clientToView.clientId}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-md border border-white/10 font-mono tracking-wider text-white">
                      PAN: {clientToView.pan}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Briefcase size={14} className="opacity-70"/> {clientToView.clientType}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${clientToView.status === 'Active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}`}>
                      {clientToView.status}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} className="z-10 p-2 rounded-full bg-black/10 hover:bg-black/20 text-white transition-colors"><X size={20} strokeWidth={2.5} /></button>
            </div>
            
            <div className="overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contact & General Card */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                    <MapPin size={14}/> General & Contact Info
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Mobile</p>
                        <p className="text-sm font-semibold text-slate-800">{clientToView.mobile || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Email</p>
                        <p className="text-sm font-semibold text-slate-800 truncate" title={clientToView.email}>{clientToView.email || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">DOB / Incorporation</p>
                        <p className="text-sm font-semibold text-slate-800">{clientToView.dob ? new Date(clientToView.dob).toLocaleDateString('en-IN') : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Father's Name</p>
                        <p className="text-sm font-semibold text-slate-800">{clientToView.fatherName || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-slate-100">
                      <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Full Address</p>
                      <p className="text-sm font-semibold text-slate-700">
                        {[clientToView.address, clientToView.district, clientToView.state, clientToView.pinCode].filter(Boolean).join(', ') || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tax Identifiers Card */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                    <Hash size={14}/> Tax & ID Credentials
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500">PAN Number</span>
                      <span className="text-sm font-mono font-black text-slate-800 tracking-widest">{clientToView.pan}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500">GSTIN</span>
                      <span className="text-sm font-mono font-bold text-indigo-700">{clientToView.gstin || 'Not Provided'}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500">Aadhaar (Masked)</span>
                      <span className="text-sm font-mono font-bold text-slate-600">
                        {clientToView.aadhaar ? `XXXX-XXXX-${clientToView.aadhaar.slice(-4)}` : 'Not Provided'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SERVICE LINKAGE SUMMARY (The 360 View) */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-sm font-black text-slate-800 mb-5 pb-2 border-b border-slate-100 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-600"/> Connected Workspaces & Services
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className={`border rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2 transition-all ${clientToView.services?.itr ? 'bg-blue-50/50 border-blue-200' : 'bg-slate-50 border-slate-100 opacity-60 grayscale'}`}>
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${clientToView.services?.itr ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-400'}`}><FileText size={18}/></div>
                    <span className="text-xs font-bold text-slate-700">Income Tax (ITR)</span>
                    {clientToView.services?.itr ? (
                       <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded shadow-sm flex items-center gap-1"><CheckCircle2 size={10}/> Active</span>
                    ) : (
                       <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded">Not Linked</span>
                    )}
                  </div>
                  
                  <div className={`border rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2 transition-all ${clientToView.services?.gst ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50 border-slate-100 opacity-60 grayscale'}`}>
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${clientToView.services?.gst ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-400'}`}><Calculator size={18}/></div>
                    <span className="text-xs font-bold text-slate-700">GST Returns</span>
                    {clientToView.services?.gst ? (
                      <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded shadow-sm flex items-center gap-1"><CheckCircle2 size={10}/> Active</span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded">Not Linked</span>
                    )}
                  </div>

                  <div className={`border rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2 transition-all ${clientToView.services?.roc ? 'bg-purple-50/50 border-purple-200' : 'bg-slate-50 border-slate-100 opacity-60 grayscale'}`}>
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${clientToView.services?.roc ? 'bg-purple-100 text-purple-600' : 'bg-slate-200 text-slate-400'}`}><Building2 size={18}/></div>
                    <span className="text-xs font-bold text-slate-700">ROC / MCA</span>
                    {clientToView.services?.roc ? (
                       <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded shadow-sm flex items-center gap-1"><CheckCircle2 size={10}/> Active</span>
                    ) : (
                       <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded">Not Linked</span>
                    )}
                  </div>

                  <div className="bg-slate-50 border border-slate-100 opacity-60 grayscale rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2">
                    <div className="h-10 w-10 bg-slate-200 text-slate-400 rounded-full flex items-center justify-center"><FileKey size={18}/></div>
                    <span className="text-xs font-bold text-slate-700">TDS & Audit</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded">Not Linked</span>
                  </div>
                </div>
              </div>

              {/* 🔴 NEW: BILLING & INVOICES SUMMARY */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-sm font-black text-slate-800 mb-5 pb-2 border-b border-slate-100 flex items-center gap-2">
                  <FileText size={18} className="text-blue-600"/> Billing & Invoices
                </h3>
                
                {loadingInvoices ? (
                  <div className="flex justify-center items-center py-6 text-slate-400">
                    <RefreshCw className="animate-spin mr-2" size={16}/> Loading invoices...
                  </div>
                ) : clientInvoices.length === 0 ? (
                  <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                     <p className="text-xs font-bold text-slate-400">No invoices generated for this client yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                          <th className="py-2 px-3">Invoice No</th>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Amount</th>
                          <th className="py-2 px-3">Status</th>
                          <th className="py-2 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                        {clientInvoices.map((inv, idx) => (
                          <tr key={inv._id || idx} className="hover:bg-slate-50/50">
                            <td className="py-3 px-3 font-bold text-blue-900">{inv.invoiceNo} {inv.isProforma && <span className="text-[9px] bg-purple-100 text-purple-700 px-1 rounded ml-1">PROFORMA</span>}</td>
                            <td className="py-3 px-3">{inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('en-IN') : 'N/A'}</td>
                            <td className="py-3 px-3 font-black text-slate-800 flex items-center gap-0.5"><IndianRupee size={12}/>{inv.totalAmountAfterTax?.toLocaleString('en-IN')}</td>
                            <td className="py-3 px-3">
                              {inv.paymentStatus === 'Paid' ? (
                                <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-1 rounded w-max border border-emerald-200"><CheckCircle2 size={12}/> Paid</span>
                              ) : (
                                <span className="flex items-center gap-1 text-[10px] font-bold bg-rose-50 text-rose-700 px-2 py-1 rounded w-max border border-rose-200"><Clock size={12}/> Pending</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right">
                              {inv.paymentStatus !== 'Paid' && (
                                <button 
                                  onClick={() => sendWhatsappReminder(inv, clientToView)}
                                  className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-sm transition-colors"
                                  title="Send WhatsApp Reminder"
                                >
                                  <MessageCircle size={12}/> Reminder
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
            
            <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100 bg-white rounded-b-3xl">
              <div></div>
              <div className="flex items-center gap-3">
                <button onClick={() => setIsViewModalOpen(false)} className="px-5 py-2.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors">
                  Close Profile
                </button>
                <button onClick={() => { setIsViewModalOpen(false); handleEdit(clientToView); }} className="px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-2">
                  <Edit size={15} strokeWidth={2.5}/> Edit Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT CLIENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
            
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Building className="text-blue-600" size={20}/> {editingId ? 'Edit Client Details' : 'Add New Client'}
                </h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"><X size={18} /></button>
            </div>

            <form onSubmit={handleSave} className="overflow-y-auto p-6 space-y-6 custom-scrollbar">
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                
                {/* PAN (Master Key) & Core Details */}
                <div className="md:col-span-4 bg-blue-50/40 p-5 rounded-2xl border border-blue-100">
                  <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider border-b border-blue-200/50 pb-2 mb-4 flex items-center gap-2">
                     Core Details (Master Identifiers)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-1">
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">PAN Number *</label>
                      <input 
                        type="text" 
                        required 
                        maxLength="10"
                        value={formData.pan} 
                        onChange={(e) => setFormData({...formData, pan: e.target.value.toUpperCase()})} 
                        disabled={editingId} 
                        placeholder="ABCDE1234F" 
                        className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-black text-slate-800 uppercase tracking-widest bg-white focus:ring-2 focus:ring-blue-500/20 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Client Name / Entity Name *</label>
                      <input 
                        type="text" 
                        required 
                        value={formData.name} 
                        onChange={(e) => setFormData({...formData, name: e.target.value})} 
                        className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold bg-white focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Entity Type</label>
                      <select 
                        value={formData.clientType} 
                        onChange={(e) => setFormData({...formData, clientType: e.target.value})} 
                        className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 bg-white focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="Individual">Individual</option>
                        <option value="Proprietorship">Proprietorship</option>
                        <option value="Partnership Firm">Partnership Firm</option>
                        <option value="LLP">LLP</option>
                        <option value="Private Limited">Private Limited</option>
                        <option value="Public Limited">Public Limited</option>
                        <option value="HUF">HUF</option>
                        <option value="Trust">Trust</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Additional Common Identifiers */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-blue-100">
                    <div className="md:col-span-1">
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">GSTIN (If Any)</label>
                      <input 
                        type="text" 
                        value={formData.gstin} 
                        onChange={(e) => setFormData({...formData, gstin: e.target.value.toUpperCase()})} 
                        placeholder="22AAAAA0000A1Z5" 
                        className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-mono font-bold text-indigo-700 uppercase bg-white focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Aadhaar (Last 4 Digits)</label>
                      <input 
                        type="text" 
                        maxLength="12"
                        value={formData.aadhaar} 
                        onChange={(e) => setFormData({...formData, aadhaar: e.target.value})} 
                        placeholder="e.g. 1234" 
                        className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold bg-white focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">DOB / Incorporation</label>
                      <input 
                        type="date" 
                        value={formData.dob} 
                        onChange={(e) => setFormData({...formData, dob: e.target.value})} 
                        className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Father's Name (For ITR)</label>
                      <input 
                        type="text" 
                        value={formData.fatherName} 
                        onChange={(e) => setFormData({...formData, fatherName: e.target.value})} 
                        placeholder="Name..." 
                        className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold bg-white focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact & Location Details */}
                <div className="md:col-span-4 mt-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-2 mb-4">Contact & Location Info</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Mobile Number</label>
                      <input type="text" value={formData.mobile} onChange={(e) => setFormData({...formData, mobile: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20"/>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Email Address</label>
                      <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20"/>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">State</label>
                      <input type="text" placeholder="e.g. Delhi" value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20"/>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">PIN Code</label>
                      <input type="text" value={formData.pinCode} onChange={(e) => setFormData({...formData, pinCode: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20"/>
                    </div>
                    <div className="md:col-span-4">
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Full Address</label>
                      <textarea rows="2" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold resize-none focus:ring-2 focus:ring-blue-500/20"/>
                    </div>
                  </div>
                </div>

                {/* Status & Remarks */}
                <div className="md:col-span-4 mt-2">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Current Status</label>
                      <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20">
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Remarks / Notes</label>
                      <input type="text" placeholder="Any internal notes for this client" value={formData.remarks} onChange={(e) => setFormData({...formData, remarks: e.target.value})} className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20"/>
                    </div>
                  </div>
                </div>

              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="px-8 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50">
                  {saving ? <RefreshCw size={18} className="animate-spin"/> : <CheckCircle2 size={18} />} 
                  {editingId ? 'Update Master Profile' : 'Save Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 p-8 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto h-16 w-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 mb-2">
              <AlertTriangle size={32} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800 tracking-tight">Delete Client?</h3>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                Are you sure you want to permanently delete <span className="font-bold text-slate-700">{deleteModal.client?.name}</span>? 
                <br/><span className="text-[10px] text-rose-500 font-bold">*Note: Linked ITR/GST data might lose client reference!</span>
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-4">
              <button onClick={() => setDeleteModal({ open: false, client: null })} className="px-6 py-2.5 text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors">Cancel</button>
              <button onClick={executeDelete} className="px-6 py-2.5 text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md shadow-rose-500/20 transition-all active:scale-95">Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ClientMaster;