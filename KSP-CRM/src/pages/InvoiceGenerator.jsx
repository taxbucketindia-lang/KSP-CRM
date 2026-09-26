import React, { useState, useEffect, useContext } from 'react';
import { Printer, FileText, Plus, Trash2, History, Save, Building2, ToggleLeft, ToggleRight, Send, Mail, MessageCircle, X, CheckCircle2, Loader2, AlertTriangle, IndianRupee } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import toast, { Toaster } from 'react-hot-toast';
import { toJpeg } from 'html-to-image';
import jsPDF from 'jspdf';

// HELPER FUNCTION: Number to Words (Indian Format)
const numberToWords = (num) => {
  if (num === 0 || isNaN(num)) return "Zero Rupees Only";
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  
  const inWords = (n) => {
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : "");
      if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " " + inWords(n % 100) : "");
      if (n < 100000) return inWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + inWords(n % 1000) : "");
      if (n < 10000000) return inWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 !== 0 ? " " + inWords(n % 100000) : "");
      return inWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 !== 0 ? " " + inWords(n % 10000000) : "");
  };
  
  const integerPart = Math.floor(num);
  return "Rupees " + inWords(integerPart).trim() + " Only";
};

const InvoiceGenerator = () => {
  const { user } = useContext(AuthContext); 

  const defaultCompany = {
    name: "SkyEdge Taxbucket India Private Limited",
    phone: "011-4747-6266",
    email: "info@taxbucket.in",
    website: "https://www.taxbucket.in",
    cin: "U69202DL2023PTC423901",
    udyam: "DL-10-0057184",
    gstin: "07ABMCS3120R1ZU"
  };

  const emptyCompany = { name: "", phone: "", email: "", website: "", cin: "", udyam: "", gstin: "" };

  const [invoiceId, setInvoiceId] = useState(null); 
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  
  const [isTaxbucket, setIsTaxbucket] = useState(true); 
  const [isProforma, setIsProforma] = useState(false); 
  const [isGstEnabled, setIsGstEnabled] = useState(true); 
  
  const [companyDetails, setCompanyDetails] = useState(defaultCompany);
  const [showQr, setShowQr] = useState(true); 
  
  const [logoImage, setLogoImage] = useState(null);
  const [customQrImage, setCustomQrImage] = useState(null);
  const [stampImage, setStampImage] = useState(null);

  const [customer, setCustomer] = useState({
    name: "", address: "", phone: "", email: "", gstin: "", pan: "", placeOfSupply: ""
  });

  const [items, setItems] = useState([{ description: '', hsn: '', qty: 1, rate: 0, gstRate: 18 }]);

  const [bank, setBank] = useState({
    bankName: "Axis Bank Ltd", branch: "Gopi Nath Bazar, Delhi Cantt", accNo: "924020007339476", ifsc: "UTIB0004552", upiId: "taxbucket@axis"
  });

  const [historyList, setHistoryList] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // 🔴 Autocomplete States
  const [fetchingPan, setFetchingPan] = useState(false);
  const [panSuggestions, setPanSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [showSendModal, setShowSendModal] = useState(false);
  const [sendMethod, setSendMethod] = useState('whatsapp'); 
  const [sendContact, setSendContact] = useState('');

  const handleCompanyToggle = () => {
    if (isTaxbucket) {
      setIsTaxbucket(false);
      setCompanyDetails(emptyCompany);
      setLogoImage(null);
      setStampImage(null);
      setCustomQrImage(null);
    } else {
      setIsTaxbucket(true);
      setCompanyDetails(defaultCompany);
      setLogoImage(null);
      setStampImage(null);
      setCustomQrImage(null);
    }
  };

  const handleImageUpload = (e, setter) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setter(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // 🔴 PAN AUTOCOMPLETE LOGIC
  const handlePanChange = async (e) => {
    const val = e.target.value.toUpperCase();
    setCustomer(prev => ({ ...prev, pan: val }));

    if (val.length >= 2) {
      setFetchingPan(true);
      try {
        const headers = { Authorization: `Bearer ${user.token}` };
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/client-master?search=${val}`, { headers });
        setPanSuggestions(res.data || []);
        setShowSuggestions(true);
      } catch (error) {
        console.error("Error fetching PAN details", error);
      } finally {
        setFetchingPan(false);
      }
    } else {
      setPanSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (client) => {
    setCustomer(prev => ({
      ...prev,
      pan: client.pan,
      name: client.name || prev.name,
      phone: client.mobile || prev.phone,
      email: client.email || prev.email,
      address: [client.address, client.district, client.pinCode].filter(Boolean).join(', ') || prev.address,
      gstin: client.gstin || prev.gstin,
      placeOfSupply: client.state || prev.placeOfSupply
    }));
    setShowSuggestions(false);
    toast.success("✅ Client Data Auto-Filled!");
  };

  const taxableAmount = items.reduce((acc, item) => acc + (Number(item.qty || 0) * Number(item.rate || 0)), 0);
  const totalGstAmount = isGstEnabled 
    ? items.reduce((acc, item) => acc + ((Number(item.qty || 0) * Number(item.rate || 0) * Number(item.gstRate || 0)) / 100), 0)
    : 0;
  const totalAmountAfterTax = taxableAmount + totalGstAmount;

  const addItem = () => setItems([...items, { description: '', hsn: '', qty: 1, rate: 0, gstRate: 18 }]);
  const removeItem = (index) => { const list = [...items]; list.splice(index, 1); setItems(list); };

  const handlePrint = () => window.print();

  const fetchHistory = async () => {
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/invoices`, { headers });
      setHistoryList(res.data.data || []);
      setShowHistoryModal(true);
    } catch (error) {
      toast.error("History load karne mein error aayi!");
    }
  };

  // 🔴 TOGGLE PAYMENT STATUS (IN HISTORY)
  const togglePaymentStatus = async (invId, currentStatus) => {
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const newStatus = currentStatus === 'Paid' ? 'Pending' : 'Paid';
      await axios.put(`${import.meta.env.VITE_API_URL}/invoices/${invId}`, { paymentStatus: newStatus }, { headers });
      toast.success(`Payment marked as ${newStatus}`);
      fetchHistory(); // Refresh list
    } catch (error) {
      toast.error("Failed to update payment status");
    }
  };

  const handleSaveInvoice = async (returnIdOnly = false) => {
    try {
      if (!invoiceNo || !customer.name || !companyDetails.name) {
        toast.error("Please enter Invoice Number, Customer Name, and Company Name!");
        return false;
      }

      setLoading(true);
      const headers = { Authorization: `Bearer ${user.token}` };

      const payload = {
        invoiceNo, invoiceDate, companyDetails, isTaxbucket, isProforma, isGstEnabled, showQr, customer, items, bank,
        taxableAmount, totalGstAmount, totalAmountAfterTax,
        logoImage, stampImage, customQrImage 
      };

      let savedId = invoiceId;

      if (invoiceId) {
        await axios.put(`${import.meta.env.VITE_API_URL}/invoices/${invoiceId}`, payload, { headers });
        if(!returnIdOnly) toast.success("Invoice Updated Successfully!");
      } else {
        const res = await axios.post(`${import.meta.env.VITE_API_URL}/invoices`, payload, { headers });
        savedId = res.data.data._id;
        setInvoiceId(savedId);
        if(!returnIdOnly) toast.success("Invoice Saved Successfully!");
      }
      return savedId;
    } catch (error) {
      toast.error("Invoice save karne mein fail ho gaya.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const loadInvoiceForEdit = (inv) => {
    setInvoiceId(inv._id);
    setInvoiceNo(inv.invoiceNo || "");
    setInvoiceDate(inv.invoiceDate ? inv.invoiceDate.split('T')[0] : "");
    setCompanyDetails(inv.companyDetails || defaultCompany);
    setIsTaxbucket(inv.isTaxbucket !== undefined ? inv.isTaxbucket : true);
    setIsProforma(inv.isProforma || false); 
    setIsGstEnabled(inv.isGstEnabled !== undefined ? inv.isGstEnabled : true);
    setShowQr(inv.showQr !== undefined ? inv.showQr : true); 
    setCustomer(inv.customer || {});
    setItems(inv.items && inv.items.length > 0 ? inv.items : [{ description: '', hsn: '', qty: 1, rate: 0, gstRate: 18 }]);
    setBank(inv.bank || {});
    setLogoImage(inv.logoImage || null);
    setStampImage(inv.stampImage || null);
    setCustomQrImage(inv.customQrImage || null);
    setShowHistoryModal(false);
  };

  const handleNewInvoice = () => {
    setInvoiceId(null);
    setInvoiceNo("");
    setInvoiceDate("");
    setIsTaxbucket(true);
    setIsProforma(false);
    setIsGstEnabled(true);
    setCompanyDetails(defaultCompany);
    setShowQr(true);
    setCustomer({ name: "", address: "", phone: "", email: "", gstin: "", pan: "", placeOfSupply: "" });
    setItems([{ description: '', hsn: '', qty: 1, rate: 0, gstRate: 18 }]);
    setLogoImage(null);
    setStampImage(null);
    setCustomQrImage(null);
  };

  const openSendModal = () => {
    if (!invoiceNo || !customer.name) {
      return toast.error("Please enter Invoice No and Customer Name before sending!");
    }
    setSendContact(customer.phone || customer.email || '');
    setShowSendModal(true);
  };

  const handleSendInvoice = async (e) => {
    e.preventDefault();
    const currentInvId = await handleSaveInvoice(true);
    if (!currentInvId) return;

    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const element = document.getElementById('invoice-printable');
      
      const imgData = await toJpeg(element, { quality: 0.95, pixelRatio: 2 });
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (element.offsetHeight * pdfWidth) / element.offsetWidth;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

      let payload = {
        invoiceId: currentInvId,
        method: sendMethod,
        contact: sendContact,
        customerName: customer.name,
        amount: totalAmountAfterTax,
        isProforma,
        invoiceNo
      };

      if (sendMethod === 'email') {
        const pdfBase64 = pdf.output('datauristring').split(',')[1];
        payload.pdfBase64 = pdfBase64;
        
        await axios.post(`${import.meta.env.VITE_API_URL}/invoices/${currentInvId}/send`, payload, { headers });
        toast.success(`Invoice sent via Email to ${sendContact}`);
      
      } else if (sendMethod === 'whatsapp') {
        const fileName = `${invoiceNo.replace(/\//g, '-')}.pdf`;
        pdf.save(fileName);
        
        await axios.post(`${import.meta.env.VITE_API_URL}/invoices/${currentInvId}/send`, payload, { headers });
        
        const text = `Hello ${customer.name},\n\nPlease find attached your ${isProforma ? 'Proforma Invoice' : 'Tax Invoice'} (${invoiceNo}) for Rs. ${totalAmountAfterTax.toLocaleString('en-IN')}.\n\nThank you,\n${companyDetails.name}`;
        const encodedText = encodeURIComponent(text);
        const waLink = `https://wa.me/91${sendContact.replace(/\D/g, '')}?text=${encodedText}`;
        window.open(waLink, '_blank');
        
        toast.success(`PDF Downloaded! Please attach it in the WhatsApp chat.`);
      }
      setShowSendModal(false);
    } catch (error) {
      console.error("PDF Generation Error:", error);
      toast.error("Failed to generate PDF. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const defaultLogo = "/taxbucket-logo.webp";
  const defaultStamp = "/taxbucket-stamp.png";
  const defaultQr = "/taxbucket-qr.png";

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 pb-12">
      <Toaster position="top-right"/>
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          #invoice-printable, #invoice-printable * { visibility: visible; }
          #invoice-printable {
            position: absolute; left: 0; top: 0; width: 100%; margin: 0;
            padding: 10px; border: none !important; box-shadow: none !important;
          }
          .print\\:hidden { display: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}} />

      {/* INPUT FORM CONTROLS */}
      <div className="print:hidden bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-wrap justify-between items-center border-b pb-4 gap-3">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <FileText className="text-blue-600"/> Invoice Generator {invoiceId ? "(Editing)" : ""}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={handleNewInvoice} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-all">
              + New Invoice
            </button>
            <button onClick={fetchHistory} className="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all">
              <History size={16}/> History & Payments
            </button>
            <button onClick={handleSaveInvoice} disabled={loading} className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all">
              <Save size={16}/> {invoiceId ? "Update" : "Save"}
            </button>
            <button onClick={handlePrint} className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md transition-all">
              <Printer size={16}/> Print / PDF
            </button>
            
            <button onClick={openSendModal} className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all ml-2 border-l border-blue-400">
              <Send size={16}/> Send PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex justify-center items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
             <div className="flex items-center gap-3">
               <span className={`text-sm font-bold ${isTaxbucket ? 'text-blue-600' : 'text-slate-400'}`}>TaxBucket</span>
               <button type="button" onClick={handleCompanyToggle} className="focus:outline-none transition-transform hover:scale-105">
                 {isTaxbucket ? <ToggleLeft size={36} className="text-blue-600"/> : <ToggleRight size={36} className="text-emerald-600"/>}
               </button>
               <span className={`text-sm font-bold ${!isTaxbucket ? 'text-emerald-600' : 'text-slate-400'}`}>Other Co.</span>
             </div>
          </div>
          
          <div className="flex justify-center items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
             <div className="flex items-center gap-3">
               <span className={`text-sm font-bold ${!isProforma ? 'text-blue-600' : 'text-slate-400'}`}>Tax Invoice</span>
               <button type="button" onClick={() => setIsProforma(!isProforma)} className="focus:outline-none transition-transform hover:scale-105">
                 {!isProforma ? <ToggleLeft size={36} className="text-blue-600"/> : <ToggleRight size={36} className="text-purple-600"/>}
               </button>
               <span className={`text-sm font-bold ${isProforma ? 'text-purple-600' : 'text-slate-400'}`}>Proforma</span>
             </div>
          </div>

          <div className="flex justify-center items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
             <div className="flex items-center gap-3">
               <span className={`text-sm font-bold ${isGstEnabled ? 'text-blue-600' : 'text-slate-400'}`}>With GST</span>
               <button type="button" onClick={() => setIsGstEnabled(!isGstEnabled)} className="focus:outline-none transition-transform hover:scale-105">
                 {isGstEnabled ? <ToggleLeft size={36} className="text-blue-600"/> : <ToggleRight size={36} className="text-amber-600"/>}
               </button>
               <span className={`text-sm font-bold ${!isGstEnabled ? 'text-amber-600' : 'text-slate-400'}`}>Without GST</span>
             </div>
          </div>
        </div>

        {!isTaxbucket && (
          <div className="animate-in slide-in-from-top-4">
            <h3 className="text-sm font-bold text-slate-700 uppercase mb-3 flex items-center gap-2"><Building2 size={16}/> Fill Custom Company Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
               <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Upload Company Logo</label>
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setLogoImage)} className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 border border-slate-200 p-1"/>
               </div>
               <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Upload Stamp & Signature</label>
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setStampImage)} className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 border border-slate-200 p-1"/>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-emerald-50/30 p-4 rounded-xl border border-emerald-100">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Company Name *</label>
                <input type="text" value={companyDetails.name} onChange={(e) => setCompanyDetails({...companyDetails, name: e.target.value})} className="w-full p-2.5 border rounded-lg text-sm font-semibold"/>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">GSTIN</label>
                <input type="text" value={companyDetails.gstin} onChange={(e) => setCompanyDetails({...companyDetails, gstin: e.target.value})} className="w-full p-2.5 border rounded-lg text-sm font-semibold"/>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">CIN</label>
                <input type="text" value={companyDetails.cin} onChange={(e) => setCompanyDetails({...companyDetails, cin: e.target.value})} className="w-full p-2.5 border rounded-lg text-sm font-semibold"/>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">UDYAM NO.</label>
                <input type="text" value={companyDetails.udyam} onChange={(e) => setCompanyDetails({...companyDetails, udyam: e.target.value})} className="w-full p-2.5 border rounded-lg text-sm font-semibold"/>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Phone</label>
                <input type="text" value={companyDetails.phone} onChange={(e) => setCompanyDetails({...companyDetails, phone: e.target.value})} className="w-full p-2.5 border rounded-lg text-sm font-semibold"/>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Email</label>
                <input type="text" value={companyDetails.email} onChange={(e) => setCompanyDetails({...companyDetails, email: e.target.value})} className="w-full p-2.5 border rounded-lg text-sm font-semibold"/>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Website</label>
                <input type="text" value={companyDetails.website} onChange={(e) => setCompanyDetails({...companyDetails, website: e.target.value})} className="w-full p-2.5 border rounded-lg text-sm font-semibold"/>
              </div>
            </div>
          </div>
        )}

        <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* 🔴 NAYA PAN AUTOCOMPLETE DROPDOWN */}
          <div className="relative z-20">
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1 text-blue-600">Search by PAN *</label>
            <input 
              type="text" 
              placeholder="Type PAN to auto-fill..." 
              value={customer.pan} 
              onChange={handlePanChange} 
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} 
              className="w-full p-2.5 border border-blue-300 bg-blue-50 rounded-lg text-sm font-bold uppercase relative z-10 focus:ring-2 focus:ring-blue-500/50 outline-none" 
              autoComplete="off"
            />
            {fetchingPan && <Loader2 size={14} className="absolute right-3 top-9 animate-spin text-blue-500 z-20"/>}
            {showSuggestions && panSuggestions.length > 0 && (
               <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto">
                 {panSuggestions.map((client) => (
                   <div key={client._id} onClick={() => handleSelectSuggestion(client)} className="p-3 border-b border-slate-50 hover:bg-blue-50 cursor-pointer transition-colors">
                     <p className="text-xs font-black text-slate-800 tracking-wider uppercase">{client.pan}</p>
                     <p className="text-[10px] font-bold text-slate-500 truncate">{client.name}</p>
                   </div>
                 ))}
               </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Invoice Number *</label>
            <input type="text" placeholder="e.g. INV-001" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm font-semibold"/>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Invoice Date</label>
            <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm font-semibold"/>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Customer Name / M/S *</label>
            <input type="text" placeholder="Enter client name" value={customer.name} onChange={(e) => setCustomer({...customer, name: e.target.value})} className="w-full p-2.5 border rounded-lg text-sm font-semibold"/>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Customer Address</label>
            <input type="text" placeholder="Enter full address" value={customer.address} onChange={(e) => setCustomer({...customer, address: e.target.value})} className="w-full p-2.5 border rounded-lg text-sm font-semibold"/>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Customer Phone</label>
            <input type="text" placeholder="Mobile number" value={customer.phone} onChange={(e) => setCustomer({...customer, phone: e.target.value})} className="w-full p-2.5 border rounded-lg text-sm font-semibold"/>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Customer Email</label>
            <input type="text" placeholder="Email address" value={customer.email} onChange={(e) => setCustomer({...customer, email: e.target.value})} className="w-full p-2.5 border rounded-lg text-sm font-semibold"/>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Customer GSTIN</label>
            <input type="text" placeholder="GSTIN number" value={customer.gstin} onChange={(e) => setCustomer({...customer, gstin: e.target.value})} className="w-full p-2.5 border rounded-lg text-sm font-semibold"/>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Place of Supply</label>
            <input type="text" placeholder="e.g. Haryana (06)" value={customer.placeOfSupply} onChange={(e) => setCustomer({...customer, placeOfSupply: e.target.value})} className="w-full p-2.5 border rounded-lg text-sm font-semibold"/>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between items-center mb-3">
             <h3 className="text-sm font-bold text-slate-700 uppercase">Bank Details Configuration</h3>
             <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 cursor-pointer">
               <input type="checkbox" id="showQr" checked={showQr} onChange={(e) => setShowQr(e.target.checked)} className="cursor-pointer w-4 h-4 text-indigo-600 rounded"/>
               <label htmlFor="showQr" className="text-xs font-bold text-indigo-900 cursor-pointer">Show UPI QR Code</label>
             </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Bank Name</label>
              <input type="text" placeholder="e.g. Axis Bank Ltd" value={bank.bankName} onChange={(e) => setBank({...bank, bankName: e.target.value})} className="w-full p-2.5 border rounded-lg text-sm font-semibold"/>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Branch</label>
              <input type="text" placeholder="e.g. Gopi Nath Bazar" value={bank.branch} onChange={(e) => setBank({...bank, branch: e.target.value})} className="w-full p-2.5 border rounded-lg text-sm font-semibold"/>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Account Number</label>
              <input type="text" placeholder="Account Number" value={bank.accNo} onChange={(e) => setBank({...bank, accNo: e.target.value})} className="w-full p-2.5 border rounded-lg text-sm font-semibold"/>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">IFSC Code</label>
              <input type="text" placeholder="IFSC Code" value={bank.ifsc} onChange={(e) => setBank({...bank, ifsc: e.target.value})} className="w-full p-2.5 border rounded-lg text-sm font-semibold"/>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">UPI ID</label>
              <input type="text" placeholder="e.g. taxbucket@axis" value={bank.upiId} onChange={(e) => setBank({...bank, upiId: e.target.value})} className="w-full p-2.5 border rounded-lg text-sm font-semibold"/>
            </div>
            {!isTaxbucket && (
               <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Custom QR Code (Optional)</label>
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setCustomQrImage)} className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 bg-white border border-slate-200 rounded p-1"/>
               </div>
            )}
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-slate-700 uppercase">Line Items / Services</h3>
            <button type="button" onClick={addItem} className="text-xs bg-slate-100 hover:bg-slate-200 text-blue-600 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
              <Plus size={14}/> Add Item
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 mb-1 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden md:grid">
             <div className={isGstEnabled ? "md:col-span-4" : "md:col-span-6"}>Service / Product Description</div>
             <div className="md:col-span-2">HSN / SAC Code</div>
             <div className="md:col-span-1">Quantity</div>
             <div className="md:col-span-2">Rate (₹)</div>
             {isGstEnabled && <div className="md:col-span-2">GST %</div>}
             <div className="md:col-span-1 text-right">Action</div>
          </div>

          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 mb-2 items-center bg-slate-50 p-3 rounded-xl">
              <div className={isGstEnabled ? "md:col-span-4" : "md:col-span-6"}>
                <input type="text" placeholder="Enter service description..." value={item.description} onChange={(e) => {
                  const list = [...items]; list[index].description = e.target.value; setItems(list);
                }} className="w-full p-2 border rounded text-xs"/>
              </div>
              <div className="md:col-span-2">
                <input type="text" placeholder="HSN/SAC (e.g. 9983)" value={item.hsn} onChange={(e) => {
                  const list = [...items]; list[index].hsn = e.target.value; setItems(list);
                }} className="w-full p-2 border rounded text-xs"/>
              </div>
              <div className="md:col-span-1">
                <input type="number" placeholder="Qty" value={item.qty} onChange={(e) => {
                  const list = [...items]; list[index].qty = Number(e.target.value); setItems(list);
                }} className="w-full p-2 border rounded text-xs"/>
              </div>
              <div className="md:col-span-2">
                <input type="number" placeholder="Rate (₹)" value={item.rate} onChange={(e) => {
                  const list = [...items]; list[index].rate = Number(e.target.value); setItems(list);
                }} className="w-full p-2 border rounded text-xs"/>
              </div>
              {isGstEnabled && (
                <div className="md:col-span-2">
                  <input type="number" placeholder="GST %" value={item.gstRate} onChange={(e) => {
                    const list = [...items]; list[index].gstRate = Number(e.target.value); setItems(list);
                  }} className="w-full p-2 border rounded text-xs"/>
                </div>
              )}
              <div className="md:col-span-1 text-right">
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(index)} className="text-rose-500 hover:bg-rose-50 p-2 rounded">
                    <Trash2 size={16}/>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showSendModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Send className="text-blue-600" size={20}/> Send PDF Invoice
              </h3>
              <button onClick={() => setShowSendModal(false)} className="text-slate-400 hover:text-slate-700 bg-slate-100 rounded-lg p-1.5 transition-colors">
                <X size={16}/>
              </button>
            </div>
            
            <form onSubmit={handleSendInvoice} className="space-y-5">
              <div className="flex gap-2">
                <button type="button" onClick={() => setSendMethod('whatsapp')} className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${sendMethod === 'whatsapp' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                  <MessageCircle size={24} className="mb-1"/>
                  <span className="text-xs font-bold">WhatsApp</span>
                </button>
                <button type="button" onClick={() => setSendMethod('email')} className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${sendMethod === 'email' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                  <Mail size={24} className="mb-1"/>
                  <span className="text-xs font-bold">Email</span>
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Enter {sendMethod === 'whatsapp' ? 'Mobile Number' : 'Email Address'}
                </label>
                <input 
                  type={sendMethod === 'whatsapp' ? 'tel' : 'email'}
                  required
                  value={sendContact}
                  onChange={(e) => setSendContact(e.target.value)}
                  placeholder={sendMethod === 'whatsapp' ? '9876543210' : 'client@email.com'}
                  className="w-full text-sm font-bold border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-[10px] text-slate-500 italic">
                {sendMethod === 'whatsapp' ? (
                  <><strong>Note:</strong> WhatsApp does not allow auto-attaching files from browser. We will <strong>auto-download the PDF</strong> for you and open the chat. You just need to attach it!</>
                ) : (
                  <>The PDF will be automatically generated and sent to this email directly from the server.</>
                )}
              </div>

              <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2">
                <Send size={16}/> {loading ? 'Processing PDF...' : `Send via ${sendMethod === 'whatsapp' ? 'WhatsApp' : 'Email'}`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 🔴 PAYMENT TRACKER & HISTORY MODAL */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2"><History size={20} className="text-purple-600"/> Saved Invoices & Payments</h3>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-slate-800 bg-slate-100 p-1.5 rounded-lg"><X size={18}/></button>
            </div>
            {historyList.length === 0 ? (
              <p className="text-center text-slate-500 py-6 text-sm">No saved invoices found.</p>
            ) : (
              <div className="space-y-3">
                {historyList.map((inv) => (
                  <div key={inv._id} className="flex flex-col md:flex-row justify-between md:items-center bg-slate-50 p-4 rounded-xl border border-slate-200 gap-4">
                    <div className="flex-1">
                      <p className="font-bold text-blue-900 text-sm">
                         {inv.invoiceNo} - {inv.customer?.name} 
                         {inv.isProforma && <span className="ml-2 bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded uppercase">Proforma</span>}
                      </p>
                      <p className="text-xs font-semibold text-slate-500 mt-1">{inv.companyDetails?.name || 'Taxbucket'} | Total: <span className="text-slate-800 font-bold">₹{inv.totalAmountAfterTax?.toLocaleString('en-IN')}</span></p>
                      
                      {inv.sendLogs && inv.sendLogs.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {inv.sendLogs.map((log, idx) => (
                            <p key={idx} className="text-[10px] font-bold text-slate-600 flex flex-wrap items-center gap-1.5 w-fit">
                              Sent via <span className="uppercase text-slate-900">{log.method}</span> 
                              to <span className="text-slate-900">{log.contact}</span> 
                              on {new Date(log.sentAt).toLocaleDateString('en-IN')}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {/* PAYMENT STATUS TOGGLE */}
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] font-bold uppercase text-slate-400 mb-1">Payment Status</span>
                        {inv.paymentStatus === 'Paid' ? (
                          <button onClick={() => togglePaymentStatus(inv._id, inv.paymentStatus)} className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-200 flex items-center gap-1 transition-colors">
                            <CheckCircle2 size={14}/> Paid
                          </button>
                        ) : (
                          <button onClick={() => togglePaymentStatus(inv._id, inv.paymentStatus)} className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-1.5 rounded-lg text-xs font-bold border border-rose-200 flex items-center gap-1 transition-colors relative group">
                            <AlertTriangle size={14}/> Pending Due
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 text-white text-[10px] px-2 py-1 rounded w-max">Click to Mark as Paid</div>
                          </button>
                        )}
                      </div>

                      <button onClick={() => loadInvoiceForEdit(inv)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm h-max">
                        Load Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PRINTABLE INVOICE TEMPLATE */}
      {/* ========================================================= */}
      <div id="invoice-printable" className="bg-white p-8 border-2 border-blue-900 rounded-none shadow-xl max-w-[800px] mx-auto text-slate-900 font-sans relative">
        <div className="flex justify-between items-start border-b-2 border-blue-900 pb-4 mb-4">
          <div className="w-48">
            {logoImage ? (
              <img src={logoImage} alt="Logo" className="h-12 object-contain mb-1" />
            ) : isTaxbucket ? (
              <img src={defaultLogo} alt="TaxBucket Logo" className="h-30 object-contain mb-1" onError={(e) => {
                 e.target.onerror = null;
                 e.target.outerHTML = `<div class="bg-blue-900 text-white font-black text-xl px-3 py-2 rounded tracking-wider flex items-center justify-between"><span>TaxBucket</span><span class="text-[10px] text-yellow-400 font-normal">.in</span></div><p class="text-[9px] font-bold tracking-widest text-blue-900 uppercase mt-1 text-center">Bridging The Gap</p>`;
              }}/>
            ) : (
              <div className="bg-slate-100 text-slate-800 font-black text-xl px-3 py-2 rounded tracking-wider flex items-center justify-center text-center border border-slate-300">
                <span className="truncate">{companyDetails.name ? companyDetails.name.split(" ")[0].toUpperCase() : "COMPANY"}</span>
              </div>
            )}
          </div>
          
          <div className="text-right text-[11px] leading-tight space-y-0.5">
            <p className="font-bold text-slate-800">Name: <span className="font-normal">{companyDetails.name}</span></p>
            {companyDetails.phone && <p><strong className="text-slate-700">Phone:</strong> {companyDetails.phone}</p>}
            {companyDetails.email && <p><strong className="text-slate-700">Email:</strong> {companyDetails.email}</p>}
            {companyDetails.website && <p><strong className="text-slate-700">Website:</strong> <span className="text-blue-600 underline">{companyDetails.website}</span></p>}
            {companyDetails.cin && <p><strong className="text-slate-700">CIN:</strong> {companyDetails.cin}</p>}
            {companyDetails.udyam && <p><strong className="text-slate-700">UDYAM NO.:</strong> {companyDetails.udyam}</p>}
          </div>
        </div>

        <div className="grid grid-cols-3 border border-blue-900 text-xs mb-4">
          <div className="p-2 border-r border-blue-900 font-bold bg-slate-50 flex items-center">
            GSTIN : <span className="text-blue-900 font-mono ml-1">{companyDetails.gstin || '---'}</span>
          </div>
          <div className={`p-2 text-center font-black ${isProforma ? 'text-purple-900 bg-purple-50' : 'text-blue-900 bg-slate-100'} text-sm tracking-wide flex items-center justify-center`}>
            {isProforma ? 'PROFORMA INVOICE' : (isGstEnabled ? 'TAX INVOICE' : 'BILL OF SUPPLY / INVOICE')}
          </div>
          <div className="p-2 text-right font-bold text-slate-600 text-[11px] bg-slate-50 flex items-center justify-end">
            {isProforma ? 'ESTIMATE / QUOTATION' : 'ORIGINAL FOR RECIPIENT'}
          </div>
        </div>

        <div className="grid grid-cols-12 border border-blue-900 text-xs mb-4">
          <div className="col-span-7 p-3 border-r border-blue-900 space-y-1">
            <p className="font-bold text-blue-900 border-b border-blue-100 pb-1 mb-1">Customer Detail</p>
            <p><strong>M/S</strong> : <span className="font-bold">{customer.name || '---'}</span></p>
            <p><strong>Address</strong> : {customer.address || '---'}</p>
            <p><strong>Phone</strong> : {customer.phone ? `-${customer.phone}` : '---'}</p>
            <p><strong>Email</strong> : {customer.email || '---'}</p>
            <p><strong>GSTIN</strong> : {customer.gstin || '---'}</p>
            <p><strong>PAN</strong> : {customer.pan || '---'}</p>
            <p><strong>Place of Supply</strong> : {customer.placeOfSupply || '---'}</p>
          </div>

          <div className="col-span-5 p-3 flex flex-col justify-between space-y-2">
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-medium">{isProforma ? 'Proforma No.' : 'Invoice No.'}</span>
              <span className="font-bold text-blue-900 font-mono">{invoiceNo || '---'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500 font-medium">Date</span>
              <span className="font-bold text-slate-800">{invoiceDate ? new Date(invoiceDate).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'}).replace(/ /g, '-') : '---'}</span>
            </div>
          </div>
        </div>

        <table className="w-full border-collapse border border-blue-900 text-xs mb-4">
          <thead>
            <tr className="bg-blue-900 text-white text-center font-bold">
              <th className="border border-blue-900 p-2 w-10">Sr. No.</th>
              <th className="border border-blue-900 p-2 text-left">Name of Product/ Service</th>
              <th className="border border-blue-900 p-2 w-20">HSN / SAC</th>
              <th className="border border-blue-900 p-2 w-12">Qty.</th>
              <th className="border border-blue-900 p-2 w-20">Rate</th>
              {isGstEnabled ? (
                <>
                  <th className="border border-blue-900 p-2 w-24">Taxable Value</th>
                  <th className="border border-blue-900 p-2 w-28" colSpan="2">GST</th>
                  <th className="border border-blue-900 p-2 w-24">Total</th>
                </>
              ) : (
                <th className="border border-blue-900 p-2 w-32">Amount</th>
              )}
            </tr>
            {isGstEnabled && (
              <tr className="bg-slate-100 text-center text-[10px] font-bold text-slate-700">
                <th colSpan="6"></th>
                <th className="border border-blue-900 p-1">%</th>
                <th className="border border-blue-900 p-1">Amount</th>
                <th></th>
              </tr>
            )}
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const taxable = Number(item.qty || 0) * Number(item.rate || 0);
              const gstAmt = (taxable * Number(item.gstRate || 0)) / 100;
              const total = taxable + (isGstEnabled ? gstAmt : 0);
              return (
                <tr key={idx} className="text-center align-top">
                  <td className="border border-blue-900 p-2">{idx + 1}</td>
                  <td className="border border-blue-900 p-2 text-left whitespace-pre-wrap">{item.description || '---'}</td>
                  <td className="border border-blue-900 p-2 font-mono">{item.hsn || '---'}</td>
                  <td className="border border-blue-900 p-2">{item.qty}</td>
                  <td className="border border-blue-900 p-2 text-right">{Number(item.rate || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                  {isGstEnabled ? (
                    <>
                      <td className="border border-blue-900 p-2 text-right">{taxable.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      <td className="border border-blue-900 p-2">{item.gstRate}.00</td>
                      <td className="border border-blue-900 p-2 text-right">{gstAmt.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                      <td className="border border-blue-900 p-2 text-right font-bold">{total.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                    </>
                  ) : (
                    <td className="border border-blue-900 p-2 text-right font-bold">{taxable.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 font-bold border-t border-blue-900">
              <td colSpan="3" className="border border-blue-900 p-2 text-right">Total</td>
              <td className="border border-blue-900 p-2 text-center">{items.reduce((acc, i) => acc + Number(i.qty || 0), 0)}</td>
              <td className="border border-blue-900 p-2"></td>
              {isGstEnabled ? (
                <>
                  <td className="border border-blue-900 p-2 text-right">{taxableAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                  <td className="border border-blue-900 p-2"></td>
                  <td className="border border-blue-900 p-2 text-right">{totalGstAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                  <td className="border border-blue-900 p-2 text-right">{totalAmountAfterTax.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                </>
              ) : (
                <td className="border border-blue-900 p-2 text-right">{totalAmountAfterTax.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
              )}
            </tr>
          </tfoot>
        </table>

        <div className="border border-blue-900 text-xs mb-4 flex flex-col">
          <div className="grid grid-cols-12 border-b border-blue-900 bg-slate-50 font-bold p-1.5 text-center">
            <div className="col-span-7 border-r border-blue-900 text-left px-2">Total in words:</div>
            <div className="col-span-5">Taxable Amount: <span className="float-right font-mono">{taxableAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></div>
          </div>
          
          <div className="grid grid-cols-12 items-stretch">
            <div className="col-span-7 text-left font-bold text-blue-900 text-xs border-r border-blue-900 flex items-center justify-start p-3 uppercase leading-relaxed bg-white">
              {numberToWords(totalAmountAfterTax)}
            </div>
            <div className="col-span-5 space-y-1 text-slate-700 pl-2 p-2">
              {isGstEnabled ? (
                <>
                  <div className="flex justify-between"><span>Add : IGST @ 18%</span> <span className="font-mono">{totalGstAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></div>
                  <div className="flex justify-between"><span>Add : CGST @ 9%</span> <span className="font-mono">0.00</span></div>
                  <div className="flex justify-between"><span>Add : SGST @ 9%</span> <span className="font-mono">0.00</span></div>
                </>
              ) : (
                <div className="flex justify-between font-bold"><span>Total Amount</span> <span className="font-mono">{taxableAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-12 border-t border-blue-900 bg-blue-50 font-black p-2">
            <div className="col-span-7 text-slate-500 text-[10px] uppercase flex items-center">(E & O.E.)</div>
            <div className="col-span-5 flex justify-between text-blue-900 text-sm">
              <span>Total Amount After Tax:</span>
              <span className="font-mono">₹{totalAmountAfterTax.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 border border-blue-900 text-xs">
          <div className="col-span-6 border-r border-blue-900 p-3 flex flex-col justify-between">
            <div>
              <p className="font-bold text-blue-900 border-b border-blue-100 pb-1 mb-2">Bank Details:</p>
              <div className="space-y-1 text-[11px]">
                <p><strong>Name</strong> : {bank.bankName}</p>
                <p><strong>Branch</strong> : {bank.branch}</p>
                <p><strong>Acc. Number</strong> : {bank.accNo}</p>
                <p><strong>IFSC</strong> : {bank.ifsc}</p>
                <p><strong>UPI ID</strong> : {bank.upiId}</p>
              </div>
            </div>
            
            {showQr && (
              <div className="mt-4 flex items-center gap-3 bg-slate-50 p-2 rounded border">
                {customQrImage ? (
                  <img src={customQrImage} alt="QR" className="w-16 h-16 object-contain" />
                ) : isTaxbucket ? (
                  <img src={defaultQr} alt="UPI QR" className="w-16 h-16 object-contain" onError={(e) => {
                     e.target.onerror = null;
                     e.target.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=${bank.upiId}&am=${totalAmountAfterTax}&cu=INR`;
                  }}/>
                ) : (
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=${bank.upiId}&am=${totalAmountAfterTax}&cu=INR`} alt="UPI QR" className="w-16 h-16 object-contain"/>
                )}
                <p className="text-[10px] font-bold text-slate-600">Pay using UPI</p>
              </div>
            )}
          </div>

          <div className="col-span-6 p-3 flex flex-col justify-between text-right">
            <div className="text-[10px] text-slate-500 italic text-center">
              Certified that the particulars given above are true and correct.
            </div>
            <div className="my-2">
              <p className="font-bold text-slate-800">For <span className={isTaxbucket ? "text-blue-900" : "text-slate-800"}>{companyDetails.name || "Company Name"}</span></p>
            </div>
            <div className="mt-4 flex flex-col items-end">
              {stampImage ? (
                <img src={stampImage} alt="Stamp & Signature" className="w-28 h-28 object-contain mb-1" />
              ) : isTaxbucket ? (
                <img src={defaultStamp} alt="TaxBucket Stamp" className="w-28 h-28 object-contain mb-1" onError={(e) => {
                  e.target.onerror = null;
                  e.target.outerHTML = `<div class="w-24 h-24 rounded-full border-2 border-blue-600/40 flex items-center justify-center p-1 transform -rotate-12 mb-2 select-none opacity-80"><div class="text-[8px] font-bold text-blue-800 text-center leading-tight border border-blue-600/40 rounded-full w-full h-full flex flex-col items-center justify-center p-1"><span>TAXBUCKET</span><span class="text-[6px]">NEW DELHI</span><span>★</span></div></div>`;
                }}/>
              ) : (
                <div className="w-24 h-24 rounded-full border-2 border-slate-300 flex items-center justify-center p-1 transform -rotate-12 mb-2 select-none text-slate-300 font-bold text-xs text-center">
                  NO STAMP UPLOADED
                </div>
              )}
              <div className="w-36 border-t border-slate-400 pt-1 text-[10px] font-bold text-slate-600 text-center">
                Authorized Signatory
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 text-[9px] text-slate-500 space-y-0.5">
          <p>1. Subject to Local Jurisdiction.</p>
          <p>2. This {isProforma ? 'estimate' : 'invoice'} is generated by {companyDetails.name || "us"}.</p>
          <p>3. Payment made to us within 15/45 days as per MSME Act.</p>
        </div>

      </div>
    </div>
  );
};

export default InvoiceGenerator;