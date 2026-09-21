import React, { useState, useContext } from 'react';
import { Printer, FileText, Plus, Trash2, History, Save, Building2, ToggleLeft, ToggleRight } from 'lucide-react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const InvoiceGenerator = () => {
  const { user } = useContext(AuthContext); 

  // 🔴 DEFAULT TAXBUCKET DETAILS
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
  
  // 🔴 STATES FOR COMPANY & TOGGLES
  const [isTaxbucket, setIsTaxbucket] = useState(true); 
  const [isProforma, setIsProforma] = useState(false); // 🔴 NAYA STATE: Proforma Toggle ke liye
  
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

  const taxableAmount = items.reduce((acc, item) => acc + (Number(item.qty || 0) * Number(item.rate || 0)), 0);
  const totalGstAmount = items.reduce((acc, item) => acc + ((Number(item.qty || 0) * Number(item.rate || 0) * Number(item.gstRate || 0)) / 100), 0);
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
      alert("History load karne mein error aayi!");
    }
  };

  const handleSaveInvoice = async () => {
    try {
      if (!invoiceNo || !customer.name || !companyDetails.name) {
        alert("Please enter Invoice Number, Customer Name, and Company Name!");
        return;
      }

      setLoading(true);
      const headers = { Authorization: `Bearer ${user.token}` };

      // 🔴 PAYLOAD me isProforma bhej rahe hain
      const payload = {
        invoiceNo, invoiceDate, companyDetails, isTaxbucket, isProforma, showQr, customer, items, bank,
        taxableAmount, totalGstAmount, totalAmountAfterTax,
        logoImage, stampImage, customQrImage 
      };

      if (invoiceId) {
        await axios.put(`${import.meta.env.VITE_API_URL}/invoices/${invoiceId}`, payload, { headers });
        alert("Invoice Updated Successfully!");
      } else {
        const res = await axios.post(`${import.meta.env.VITE_API_URL}/invoices`, payload, { headers });
        setInvoiceId(res.data.data._id);
        alert("Invoice Saved Successfully!");
      }
    } catch (error) {
      alert("Invoice save karne mein fail ho gaya.");
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
    setIsProforma(inv.isProforma || false); // Restore Proforma status
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
    setIsProforma(false); // Default Tax Invoice
    setCompanyDetails(defaultCompany);
    setShowQr(true);
    setCustomer({ name: "", address: "", phone: "", email: "", gstin: "", pan: "", placeOfSupply: "" });
    setItems([{ description: '', hsn: '', qty: 1, rate: 0, gstRate: 18 }]);
    setLogoImage(null);
    setStampImage(null);
    setCustomQrImage(null);
  };

  const defaultLogo = "/taxbucket-logo.webp";
  const defaultStamp = "/taxbucket-stamp.png";
  const defaultQr = "/taxbucket-qr.png";

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 pb-12">
      
      {/* PRINT STYLING */}
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
            <FileText className="text-blue-600"/> Tax Invoice Generator {invoiceId ? "(Editing)" : ""}
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={handleNewInvoice} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-all">
              + New Invoice
            </button>
            <button onClick={fetchHistory} className="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all">
              <History size={16}/> History
            </button>
            <button onClick={handleSaveInvoice} disabled={loading} className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all">
              <Save size={16}/> {invoiceId ? "Update" : "Save"}
            </button>
            <button onClick={handlePrint} className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all">
              <Printer size={16}/> Print / PDF
            </button>
          </div>
        </div>

        {/* 🔴 DOUBLE TOGGLES: COMPANY & PROFORMA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex justify-center items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
             <div className="flex items-center gap-3">
               <span className={`text-sm font-bold ${isTaxbucket ? 'text-blue-600' : 'text-slate-400'}`}>TaxBucket Info</span>
               <button type="button" onClick={handleCompanyToggle} className="focus:outline-none transition-transform hover:scale-105">
                 {isTaxbucket ? <ToggleLeft size={36} className="text-blue-600"/> : <ToggleRight size={36} className="text-emerald-600"/>}
               </button>
               <span className={`text-sm font-bold ${!isTaxbucket ? 'text-emerald-600' : 'text-slate-400'}`}>Other Company</span>
             </div>
          </div>
          
          <div className="flex justify-center items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
             <div className="flex items-center gap-3">
               <span className={`text-sm font-bold ${!isProforma ? 'text-blue-600' : 'text-slate-400'}`}>Tax Invoice</span>
               <button type="button" onClick={() => setIsProforma(!isProforma)} className="focus:outline-none transition-transform hover:scale-105">
                 {!isProforma ? <ToggleLeft size={36} className="text-blue-600"/> : <ToggleRight size={36} className="text-purple-600"/>}
               </button>
               <span className={`text-sm font-bold ${isProforma ? 'text-purple-600' : 'text-slate-400'}`}>Proforma Invoice</span>
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

        <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Customer PAN</label>
            <input type="text" placeholder="PAN number" value={customer.pan} onChange={(e) => setCustomer({...customer, pan: e.target.value})} className="w-full p-2.5 border rounded-lg text-sm font-semibold"/>
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
             <div className="md:col-span-5">Service / Product Description</div>
             <div className="md:col-span-2">HSN / SAC Code</div>
             <div className="md:col-span-1">Quantity</div>
             <div className="md:col-span-2">Rate (₹)</div>
             <div className="md:col-span-1 text-right">Action</div>
          </div>

          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 mb-2 items-center bg-slate-50 p-3 rounded-xl">
              <div className="md:col-span-5">
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

      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-slate-800">Saved Invoices History</h3>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-500 hover:text-slate-800 font-bold text-sm">Close</button>
            </div>
            {historyList.length === 0 ? (
              <p className="text-center text-slate-500 py-6 text-sm">No saved invoices found.</p>
            ) : (
              <div className="space-y-2">
                {historyList.map((inv) => (
                  <div key={inv._id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div>
                      <p className="font-bold text-blue-900 text-sm">
                         {inv.invoiceNo} - {inv.customer?.name} 
                         {inv.isProforma && <span className="ml-2 bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded uppercase">Proforma</span>}
                      </p>
                      <p className="text-xs text-slate-500">{inv.companyDetails?.name || 'Taxbucket'} | Total: ₹{inv.totalAmountAfterTax?.toLocaleString('en-IN')}</p>
                    </div>
                    <button onClick={() => loadInvoiceForEdit(inv)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold">
                      Load / Edit
                    </button>
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

        {/* 🔴 CONDITIONAL: PROFORMA VS TAX INVOICE TITLE */}
        <div className="grid grid-cols-3 border border-blue-900 text-xs mb-4">
          <div className="p-2 border-r border-blue-900 font-bold bg-slate-50 flex items-center">
            GSTIN : <span className="text-blue-900 font-mono ml-1">{companyDetails.gstin || '---'}</span>
          </div>
          <div className={`p-2 text-center font-black ${isProforma ? 'text-purple-900 bg-purple-50' : 'text-blue-900 bg-slate-100'} text-sm tracking-wide flex items-center justify-center`}>
            {isProforma ? 'PROFORMA INVOICE' : 'TAX INVOICE'}
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
              <th className="border border-blue-900 p-2 w-24">Taxable Value</th>
              <th className="border border-blue-900 p-2 w-28" colSpan="2">GST</th>
              <th className="border border-blue-900 p-2 w-24">Total</th>
            </tr>
            <tr className="bg-slate-100 text-center text-[10px] font-bold text-slate-700">
              <th colSpan="6"></th>
              <th className="border border-blue-900 p-1">%</th>
              <th className="border border-blue-900 p-1">Amount</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const taxable = Number(item.qty || 0) * Number(item.rate || 0);
              const gstAmt = (taxable * Number(item.gstRate || 0)) / 100;
              const total = taxable + gstAmt;
              return (
                <tr key={idx} className="text-center align-top">
                  <td className="border border-blue-900 p-2">{idx + 1}</td>
                  <td className="border border-blue-900 p-2 text-left whitespace-pre-wrap">{item.description || '---'}</td>
                  <td className="border border-blue-900 p-2 font-mono">{item.hsn || '---'}</td>
                  <td className="border border-blue-900 p-2">{item.qty}</td>
                  <td className="border border-blue-900 p-2 text-right">{Number(item.rate || 0).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                  <td className="border border-blue-900 p-2 text-right">{taxable.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                  <td className="border border-blue-900 p-2">{item.gstRate}.00</td>
                  <td className="border border-blue-900 p-2 text-right">{gstAmt.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                  <td className="border border-blue-900 p-2 text-right font-bold">{total.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 font-bold border-t border-blue-900">
              <td colSpan="3" className="border border-blue-900 p-2 text-right">Total</td>
              <td className="border border-blue-900 p-2 text-center">{items.reduce((acc, i) => acc + Number(i.qty || 0), 0)}</td>
              <td className="border border-blue-900 p-2"></td>
              <td className="border border-blue-900 p-2 text-right">{taxableAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
              <td className="border border-blue-900 p-2"></td>
              <td className="border border-blue-900 p-2 text-right">{totalGstAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
              <td className="border border-blue-900 p-2 text-right">{totalAmountAfterTax.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
            </tr>
          </tfoot>
        </table>

        <div className="border border-blue-900 text-xs mb-4">
          <div className="grid grid-cols-12 border-b border-blue-900 bg-slate-50 font-bold p-1.5 text-center">
            <div className="col-span-7 border-r border-blue-900">Total in words:</div>
            <div className="col-span-5">Taxable Amount: <span className="float-right font-mono">{taxableAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></div>
          </div>
          
          <div className="grid grid-cols-12 p-2 items-center">
            <div className="col-span-7 text-center font-black text-blue-900 tracking-wider text-sm border-r border-blue-900 h-full flex items-center justify-center">
              AUTOMATED CALCULATION
            </div>
            <div className="col-span-5 space-y-1 text-slate-700 pl-2">
              <div className="flex justify-between"><span>Add : IGST @ 18%</span> <span className="font-mono">{totalGstAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></div>
              <div className="flex justify-between"><span>Add : CGST @ 9%</span> <span className="font-mono">00</span></div>
              <div className="flex justify-between"><span>Add : SGST @ 9%</span> <span className="font-mono">00</span></div>
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