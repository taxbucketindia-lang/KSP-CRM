import React, { useState } from 'react';
import { 
  IndianRupee, FileText, Image as ImageIcon, CheckCircle2, 
  Building2, Calculator, BriefcaseBusiness, UploadCloud 
} from 'lucide-react';

const FeeAndDocuments = () => {
  const [activeTab, setActiveTab] = useState('fees'); // 'fees' or 'documents'

  // Data Extracted from your PDF
  const gstServices = [
    { service: 'GST Registration for Prop', fee: '999', package: '-' },
    { service: 'GST Registration for Partnership, LLP & Company', fee: '1999', package: '-' },
    { service: 'GST Amendment', fee: '599', package: '-' },
    { service: 'GST Cancellation', fee: '999', package: '-' },
    { service: 'GST Final Return GSTR10', fee: '999', package: '-' },
    { service: 'GST LUT', fee: '799', package: '-' },
    { service: 'Nil Return', fee: '500 / month', package: '4999 / year' },
    { service: 'Up to 20 Invoices', fee: '1000 / month', package: '9000 advance / year' },
    { service: '21-50 Invoices', fee: '1500 / month', package: '14000 / year' },
    { service: '51-100 Invoices', fee: '2000 / month', package: '18000 / year' },
    { service: 'GSTR-9', fee: '2999+', package: 'Case based' },
    { service: 'GST Notice Reply', fee: '1500', package: 'Case based' },
    { service: 'NIL GST Return Composition Dealer (Quarterly)', fee: '1500', package: '4999' },
    { service: 'If Not NIL Composition Dealer (Quarterly)', fee: '2500', package: '8000' }
  ];

  const itrServices = [
    { service: 'Salaried ITR', fee: '799' },
    { service: 'Business ITR', fee: '1199' },
    { service: 'Capital Gain', fee: 'Starting 1499' },
    { service: 'ITR + Books', fee: '1999' },
    { service: 'Foreign Income/Investment', fee: '2999' },
    { service: 'Notice Reply', fee: '1999' },
    { service: 'Tax Planning', fee: '999 / session' }
  ];

  const bizRegistrationServices = [
    { service: 'MSME Reg. For Prop', fee: '499' },
    { service: 'MSME Reg. For Firm/LLP/PVT', fee: '799' },
    { service: 'MSME Amendment', fee: '499' },
    { service: 'GST + MSME Reg. for Prop', fee: '1499' },
    { service: 'GST + MSME Reg. for Partnership, LLP & Company', fee: '2499' },
    { service: 'Partnership Incorporation + TAN + PAN', fee: '2999 + Govt Fee Extra' },
    { service: 'Partnership Incorporation + TAN + PAN + GST', fee: '3999 + Govt Fee Extra' },
    { service: 'LLP Registration + LLP Agreement + PAN + TAN', fee: '4999 + Govt fee' },
    { service: 'LLP Registration + LLP Agreement + PAN + TAN + DSC + GST + MSME', fee: '8999 + Govt Fee' },
    { service: 'PVT LTD Registration + MOA + AOA + PAN + TAN', fee: '6999 + Govt Fee' },
    { service: 'PVT LTD Registration + MOA + AOA + PAN + TAN + DSC + GST + MSME', fee: '13999 + Govt Fee' },
    { service: 'OPC Registration + PAN + TAN + MOA + AOA', fee: '5999 + Govt Fee' },
    { service: 'OPC Registration + PAN + TAN + MOA + AOA + GST + DSC + MSME', fee: '12999 + Govt Fee' },
    { service: 'Section 8 Company Registration + PAN + TAN + BY LAWS', fee: '6999 + Govt Fee' },
    { service: 'Section 8 Company Reg. + PAN + TAN + BY LAWS + DSC + GST + MSME', fee: '12999 + Govt Fee' },
    { service: 'FSSAI Basic Registration', fee: '499 + Govt Fee' },
    { service: 'FSSAI Registration State/Central', fee: '4999 + Govt Fee' },
    { service: 'IEC Registration', fee: '999 + Govt Fee' },
    { service: 'PAN Apply', fee: '299' },
    { service: 'TAN Apply', fee: '299' },
    { service: 'Shop & Establishment Reg. in Delhi', fee: '499' },
    { service: 'Trademark Filling Application', fee: '1999 + Govt Fee' },
    { service: 'Trademark Assistance / Reply of query / Hearing', fee: '1999 Per Query + Govt Fee' },
    { service: 'Startup Registration', fee: '3499' }
  ];

  // Document Categories for Images
  // Document Categories for Images (Updated exactly as per screenshot)
  const documentCategories = [
    { id: 1, title: 'CHECKLIST FOR INCORPORATION OF HUF', imgPath: '/docs-images/CHECKLIST FOR INCORPORATION OF HUF.jfif' },
    { id: 2, title: 'CHECKLIST FOR INCORPORATION OF LLP', imgPath: '/docs-images/CHECKLIST FOR INCORPORATION OF LLP.jfif' },
    { id: 3, title: 'CHECKLIST FOR OPC', imgPath: '/docs-images/CHECKLIST FOR OPC.jfif' },
    { id: 4, title: 'COMPANY INCORPORATION CHECKLIST', imgPath: '/docs-images/COMPANY INCORPORATION CHECKLIST.jfif' },
    { id: 5, title: 'ESIC REGISTRATION', imgPath: '/docs-images/ESIC REGISTRATION.jpeg' },
    { id: 6, title: 'FSSAI CHECKLIST', imgPath: '/docs-images/FSSAI CHECKLIST.jfif' },
    { id: 7, title: 'GEM REGISTRATION FOR PARTNERSHIP', imgPath: '/docs-images/GEM REGISTRATION FOR PARTNERSHIP.jfif' },
    { id: 8, title: 'GEM REGISTRATION FOR PROPRIETORSHIP', imgPath: '/docs-images/GEM REGISTRATION FOR PROPRIETORSHIP.jfif' },
    { id: 9, title: 'GST CHECKLIST FOR PARTNERSHIP', imgPath: '/docs-images/GST CHECKLIST FOR PARTNERSHIP.jfif' },
    { id: 10, title: 'GST CHECKLIST FOR PROPRIETOR', imgPath: '/docs-images/GST CHECKLIST FOR PROPRIETOR.jfif' },
    { id: 11, title: 'IMPORT & EXPORT LICENSE PARTNERSHIP', imgPath: '/docs-images/IMPORT & EXPORT LICENSE PARTNERSHIP.jfif' },
    { id: 12, title: 'IMPORT & EXPORT LICENSE PROPRIETOR', imgPath: '/docs-images/IMPORT & EXPORT LICENSE PROPRIETOR.jfif' },
    { id: 13, title: 'ISO CHECKLIST FOR PROPRIETOR CHECKLIST', imgPath: '/docs-images/ISO CHECKLIST FOR PROPRIETOR CHECKLIST.jfif' },
    { id: 14, title: 'MSME PARTNERSHIP', imgPath: '/docs-images/MSME PARTNERSHIP.jfif' },
    { id: 15, title: 'MSME PROPRIETOR', imgPath: '/docs-images/MSME PROPRIETOR.jfif' },
    { id: 16, title: 'PARTNERSHIP INCORPORATION CHECKLIST', imgPath: '/docs-images/PARTNERSHIP INCORPORATION CHECKLIST.jfif' },
    { id: 17, title: 'SEC 8 COMPANY NGO', imgPath: '/docs-images/SEC 8 COMPANY NGO.jfif' },
    { id: 18, title: 'STARTUP INDIA REGISTRATION', imgPath: '/docs-images/STARTUP INDIA REGISTRATION.jfif' },
    { id: 19, title: 'TRADE LICENSE FOR PROPRIETORSHIP', imgPath: '/docs-images/TRADE LICENSE FOR PROPRIETORSHIP.jfif' }
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 pb-12 space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <IndianRupee size={28} className="text-emerald-600" /> Fee Structure & Documents
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Standard professional pricing and required document checklists.</p>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex items-center gap-4 border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('fees')}
          className={`pb-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 px-2 ${activeTab === 'fees' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <IndianRupee size={16}/> Standard Fee Structure
        </button>
        <button 
          onClick={() => setActiveTab('documents')}
          className={`pb-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 px-2 ${activeTab === 'documents' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          <FileText size={16}/> Documents Checklist
        </button>
      </div>

      {/* TAB 1: FEE STRUCTURE */}
      {activeTab === 'fees' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
          
          {/* GST SERVICES TABLE */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-indigo-50/50 flex items-center gap-2">
              <Calculator size={18} className="text-indigo-600"/>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">GST Services</h2>
            </div>
            <div className="overflow-x-auto custom-scrollbar max-h-[400px]">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-3 px-5">Services</th>
                    <th className="py-3 px-5 text-right">Professional Fee (₹)</th>
                    <th className="py-3 px-5 text-right">Package (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                  {gstServices.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-5 font-bold text-slate-800">{item.service}</td>
                      <td className="py-3 px-5 text-right text-emerald-600 font-bold">{item.fee}</td>
                      <td className="py-3 px-5 text-right text-indigo-600">{item.package}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* INCOME TAX TABLE */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-blue-50/50 flex items-center gap-2">
              <FileText size={18} className="text-blue-600"/>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Income Tax (ITR)</h2>
            </div>
            <div className="overflow-x-auto custom-scrollbar max-h-[400px]">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-3 px-5 w-2/3">Services</th>
                    <th className="py-3 px-5 text-right w-1/3">Professional Fee (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                  {itrServices.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-5 font-bold text-slate-800">{item.service}</td>
                      <td className="py-3 px-5 text-right text-emerald-600 font-bold">{item.fee}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* BUSINESS REGISTRATION TABLE */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-purple-50/50 flex items-center gap-2">
              <Building2 size={18} className="text-purple-600"/>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Business Registration Services</h2>
            </div>
            <div className="overflow-x-auto custom-scrollbar max-h-[400px]">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-3 px-5 w-2/3">Services</th>
                    <th className="py-3 px-5 text-right w-1/3">Professional Fee + Govt Fee Extra (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                  {bizRegistrationServices.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-5 font-bold text-slate-800">{item.service}</td>
                      <td className="py-3 px-5 text-right text-emerald-600 font-bold">{item.fee}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: DOCUMENTS REQUIRED */}
      {activeTab === 'documents' && (
        <div className="animate-in fade-in slide-in-from-bottom-2">
          
          <div className="mb-6 bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
            <div className="mt-0.5"><ImageIcon size={20} className="text-blue-500"/></div>
            <div>
              <h4 className="text-sm font-bold text-blue-900">Document Checklist Images</h4>
              <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                Aapne jo images tayyar ki hain (e.g. Aadhaar, PAN, Bank Statement ki lists), wo yahan display hongi. <br/>
                <b>Developer Note:</b> Apni images ko project ke <code>public/docs-images/</code> folder mein save kijiye aur naam match kar dijiye.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documentCategories.map((doc) => (
              <div key={doc.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-all">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="font-bold text-slate-800 text-sm truncate pr-2">{doc.title}</h3>
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0"/>
                </div>
                
                {/* IMAGE BOX */}
                <div className="p-4 flex-1 flex flex-col items-center justify-center bg-slate-50/50 min-h-[250px] relative overflow-hidden group-hover:bg-slate-100/50 transition-colors">
                  
                  {/* Agar actual image src valid hogi toh wo dikhegi, warna placeholder dikhega */}
                  <img 
                    src={doc.imgPath} 
                    alt={doc.title} 
                    className="max-w-full max-h-full object-contain z-10"
                    onError={(e) => {
                      // Agar image load nahi hoti (kyunki abhi folder mein nahi hai), toh placeholder dikhao
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  
                  {/* Fallback Placeholder (Jo initially dikhega jab tak aap real images nahi daalte) */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-6 text-center" style={{ display: 'none' }}>
                    <UploadCloud size={40} className="mb-3 text-slate-300 group-hover:text-blue-400 transition-colors"/>
                    <p className="text-xs font-bold text-slate-500">Image Missing</p>
                    <p className="text-[10px] text-slate-400 mt-1">Please add <b>{doc.imgPath.split('/').pop()}</b> inside public folder</p>
                  </div>
                  
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

    </div>
  );
};

export default FeeAndDocuments;