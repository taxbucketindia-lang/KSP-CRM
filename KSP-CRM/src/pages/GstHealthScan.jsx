import React, { useState, useContext } from 'react';
import { ArrowRight, Printer, ShieldCheck, Search, CheckCircle2, AlertTriangle, RefreshCw, FileText, Save } from 'lucide-react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';

// TODO: replace with TaxBucket's actual WhatsApp Business number
const WHATSAPP_NUMBER = '91XXXXXXXXXX';

const healthColor = {
  Green: 'text-emerald-600 bg-emerald-50 border-emerald-300',
  Yellow: 'text-amber-600 bg-amber-50 border-amber-300',
  Red: 'text-red-600 bg-red-50 border-red-300',
};

const healthLabel = {
  Green: 'No major observation',
  Yellow: 'Review recommended',
  Red: 'Important review required',
};

const GstHealthScan = () => {
  const { user } = useContext(AuthContext); 
  const [formData, setFormData] = useState({ gstin: '', mobile: '', email: '', businessName: '' });
  
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  
  // 🔴 NAYE STATES FOR SAVING LOGIC
  const [isSaved, setIsSaved] = useState(false);
  const [savingCRM, setSavingCRM] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.gstin || formData.gstin.length !== 15) {
      return toast.error("Please enter a valid 15-digit GSTIN!");
    }

    setLoading(true);
    setIsSaved(false); // Naya scan hai toh saved status false kardo
    try {
      const headers = user?.token ? { Authorization: `Bearer ${user.token}` } : {};
      
      // 🔴 Action: 'preview' bhej rahe hain taaki auto-save na ho
      const payload = { ...formData, action: 'preview' };
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/gst-scan`, payload, { headers });
      
      setReportData(res.data.data);
      toast.success('GST Health Scan Preview Generated!');
    } catch (error) {
      console.error("Backend error during GST scan:", error);
      const errorMsg = error.response?.data?.message || 'Failed to fetch live GST records. Please try again.';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // 🔴 NAYA FUNCTION: Manually Save to Leads
  const handleSaveToCRM = async () => {
    if (!reportData) return;
    
    setSavingCRM(true);
    try {
      const headers = user?.token ? { Authorization: `Bearer ${user.token}` } : {};
      const payload = { action: 'save', reportData };
      
      await axios.post(`${import.meta.env.VITE_API_URL}/gst-scan`, payload, { headers });
      
      setIsSaved(true);
      toast.success('Report Saved to Leads & CRM Successfully!');
    } catch (error) {
      console.error("Error saving to CRM:", error);
      toast.error(error.response?.data?.message || 'Failed to save to CRM.');
    } finally {
      setSavingCRM(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleUpgradeClick = async () => {
    const message = `Hi TaxBucket, I'd like to know more about the GST Pro Health Check (₹199) for GSTIN ${reportData.gstin} (Report ID: ${reportData.reportId}).`;
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 print:p-0 print:max-w-none">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #gst-report-printable, #gst-report-printable * { visibility: visible; }
          #gst-report-printable {
            position: absolute; top: 0; left: 0; width: 100%; max-width: 100%;
            box-shadow: none !important; border: none !important; margin: 0; padding: 15px;
          }
          .print\\:hidden { display: none !important; }
        }
      `}</style>

      <div className="print:hidden">
        <Toaster position="top-right" />
      </div>

      {!reportData ? (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6 print:hidden">
          <div className="text-center space-y-2">
            <img src="/taxbucket-logo.webp" alt="TaxBucket" className='w-32 mx-auto pb-2'/>
            <h1 className="text-2xl font-black text-slate-800 flex justify-center items-center gap-2">
               <ShieldCheck className="text-emerald-600"/> FREE GST Health Scan
            </h1>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Get a preliminary GST health report instantly using publicly available GST information.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mx-auto">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">GSTIN Number *</label>
              <input
                type="text"
                required
                maxLength="15"
                placeholder="07XXXXXXXXXXXXXX"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold uppercase focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">
                Business Name (Optional)
              </label>
              <input
                type="text"
                placeholder="ABC Enterprises"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="9876543210"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="client@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 mt-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="animate-spin" size={18} /> : <Search size={18}/>} 
              {loading ? 'Fetching Live GST Records...' : 'Preview Free GST Scan'}
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Action Bar (Not printed) */}
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border shadow-sm print:hidden flex-wrap gap-4">
            <div className="flex items-center gap-3">
               <button onClick={() => setReportData(null)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition-colors">← Back</button>
               <span className="text-sm font-bold text-slate-700 hidden sm:inline">Report ID: <span className="font-mono">{reportData.reportId}</span></span>
            </div>
            
            <div className="flex items-center gap-3">
              {/* 🔴 NAYA BUTTON: Save to Leads */}
              <button
                onClick={handleSaveToCRM}
                disabled={isSaved || savingCRM}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all ${
                  isSaved ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {savingCRM ? <RefreshCw size={16} className="animate-spin"/> : (isSaved ? <CheckCircle2 size={16}/> : <Save size={16} />)} 
                {isSaved ? 'Saved in Leads' : 'Save to Leads'}
              </button>

              <button
                onClick={handlePrint}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-colors"
              >
                <Printer size={16} /> Save / Print PDF
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* PRINTABLE PDF TEMPLATE */}
          {/* ========================================================= */}
          <div
            id="gst-report-printable"
            className="bg-white p-8 border-2 border-slate-900 shadow-2xl max-w-[800px] mx-auto text-slate-900 font-sans space-y-6"
          >
            {/* PDF Header */}
            <div className="flex justify-between items-center border-b-2 border-slate-900 pb-4">
              <div>
                <img src="/taxbucket-logo.webp" alt="TaxBucket" className='w-28 pb-2' onError={(e) => e.target.outerHTML = '<h2 class="text-xl font-black text-blue-900">TaxBucket</h2>'}/>
                <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                  FREE GST HEALTH SCAN
                </p>
              </div>
              <div className="text-right text-xs">
                <p><strong>Report ID:</strong> {reportData.reportId}</p>
                <p><strong>Report Version:</strong> {reportData.reportVersion || 'v1.0'}</p>
                <p><strong>Scan Date:</strong> {new Date(reportData.scanDateTime || Date.now()).toLocaleDateString('en-IN')}</p>
              </div>
            </div>

            {/* Section 1: Client Information & Jurisdictions */}
            <div>
              <h3 className="text-xs font-bold bg-slate-100 p-2 border border-slate-300 uppercase text-slate-700">
                Client Information & Jurisdictions
              </h3>
              <div className="grid grid-cols-2 text-xs border-x border-b border-slate-300">
                <div className="p-2 border-r border-slate-300 break-words"><strong>Legal Name:</strong> {reportData.businessName}</div>
                <div className="p-2 border-b border-slate-300"><strong>GSTIN:</strong> {reportData.gstin}</div>
                <div className="p-2 border-t border-r border-slate-300"><strong>Trade Name:</strong> {reportData.tradeName || 'N/A'}</div>
                <div className="p-2 border-t border-slate-300">
                  <strong>Registration Status:</strong>{' '}
                  <span className={`font-bold ${healthColor[reportData.registrationHealth]?.split(' ')[0] || 'text-slate-800'}`}>{reportData.registrationStatus}</span>
                </div>
                <div className="p-2 border-t border-r border-slate-300"><strong>Constitution:</strong> {reportData.constitution}</div>
                <div className="p-2 border-t border-slate-300"><strong>Taxpayer Type:</strong> {reportData.taxpayerType || 'N/A'}</div>
                <div className="p-2 border-t border-r border-slate-300"><strong>Reg. Date:</strong> {reportData.registrationDate}</div>
                <div className="p-2 border-t border-slate-300"><strong>State Jurisdiction:</strong> {reportData.stateJurisdiction || 'N/A'}</div>
                <div className="col-span-2 p-2 border-t border-slate-300"><strong>Central Jurisdiction:</strong> {reportData.centralJurisdiction || 'N/A'}</div>
                <div className="col-span-2 p-2 border-t border-slate-300"><strong>Principal Address:</strong> {reportData.address}</div>
                <div className="col-span-2 p-2 border-t border-slate-300"><strong>Additional Places:</strong> {reportData.additionalPlaces || 'N/A'}</div>
              </div>
            </div>

            {/* Section 2: GST Health Snapshot */}
            <div>
              <h3 className="text-xs font-bold bg-slate-100 p-2 border border-slate-300 uppercase text-slate-700">
                GST Health Snapshot
              </h3>
              <table className="w-full text-xs border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-50 text-left">
                    <th className="border border-slate-300 p-2 w-1/4">Area</th>
                    <th className="border border-slate-300 p-2 w-1/4">Status</th>
                    <th className="border border-slate-300 p-2">Observation</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 p-2 font-bold">GST Registration</td>
                    <td className={`border border-slate-300 p-2 font-bold ${healthColor[reportData.registrationHealth]?.split(' ')[0]}`}>
                      {reportData.registrationHealth}
                    </td>
                    <td className="border border-slate-300 p-2">GSTIN status verified via live public registry.</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 font-bold">Return Filing</td>
                    <td className={`border border-slate-300 p-2 font-bold ${healthColor[reportData.returnFilingHealth]?.split(' ')[0]}`}>
                      {reportData.returnFilingHealth}
                    </td>
                    <td className="border border-slate-300 p-2">
                      Filing pattern: {reportData.filingPattern}
                      {reportData.recentFilingGapMonths != null && ` (~${reportData.recentFilingGapMonths} mo. since latest period)`}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 font-bold">Data Availability</td>
                    <td className={`border border-slate-300 p-2 font-bold ${healthColor[reportData.dataAvailabilityHealth]?.split(' ')[0]}`}>
                      {reportData.dataAvailabilityHealth}
                    </td>
                    <td className="border border-slate-300 p-2">Based on completeness of publicly captured fields.</td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-300 p-2 font-black text-slate-800">Overall Scan</td>
                    <td className={`border border-slate-300 p-2 font-black uppercase ${healthColor[reportData.overallScanStatus]?.split(' ')[0]}`}>
                      {reportData.overallScanStatus}
                    </td>
                    <td className="border border-slate-300 p-2 font-bold text-slate-800">{healthLabel[reportData.overallScanStatus]}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Section 3: Key Observations */}
            <div>
              <h3 className="text-xs font-bold bg-slate-100 p-2 border border-slate-300 uppercase text-slate-700">
                Key Observations
              </h3>
              <div className="border border-slate-300 divide-y text-xs">
                {reportData.dataObservations.map((obs, idx) => (
                  <div key={idx} className="p-2.5 flex items-start gap-3">
                    <span className="font-bold bg-slate-200 px-1.5 py-0.5 rounded text-[10px] shrink-0">{idx + 1}</span>
                    <span className="font-medium">{obs.observation}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 4: Return Filing Snapshot Table */}
            <div>
              <h3 className="text-xs font-bold bg-slate-100 p-2 border border-slate-300 uppercase text-slate-700 flex justify-between">
                <span>Return Filing Snapshot (Recent Activity)</span>
                <span className="font-normal text-[10px] text-slate-500 lowercase pr-1">showing latest available</span>
              </h3>
              <table className="w-full text-xs border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-50 text-left">
                    <th className="border border-slate-300 p-2">Return Type</th>
                    <th className="border border-slate-300 p-2">Period</th>
                    <th className="border border-slate-300 p-2">Filing Status</th>
                    <th className="border border-slate-300 p-2">Filing Date</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.filingReturns && reportData.filingReturns.length > 0 ? (
                    reportData.filingReturns.map((ret, idx) => (
                      <tr key={idx}>
                        <td className="border border-slate-300 p-2 font-bold">{ret.rtntype || ret.ret_type || 'GSTR'}</td>
                        <td className="border border-slate-300 p-2">{ret.taxp || ret.ret_period || ret.fp || 'N/A'}</td>
                        <td className="border border-slate-300 p-2 font-bold text-slate-700">{ret.status || 'Filed'}</td>
                        <td className="border border-slate-300 p-2">{ret.dof || 'N/A'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="border border-slate-300 p-3 text-center text-slate-500 font-medium">
                        No recent filing history found in public records.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* CTA Box */}
            <div className="bg-blue-50 border-2 border-blue-600 p-4 rounded-xl flex justify-between items-center print:bg-white print:border-slate-800">
              <div>
                <p className="text-xs font-bold text-blue-900 uppercase print:text-slate-800">Want a deeper GST review?</p>
                <h4 className="text-lg font-black text-blue-950 print:text-slate-900">GST PRO HEALTH CHECK - ₹199</h4>
                <p className="text-[10px] text-slate-600 print:text-slate-500 mt-1 max-w-[80%]">
                  Authorised portal information and available records can be reviewed in greater detail to check ITC mismatches and exact tax liabilities.
                </p>
              </div>
              <button
                onClick={handleUpgradeClick}
                className="bg-blue-600 text-white px-5 py-3 rounded-xl text-xs font-bold shadow-md print:hidden hover:bg-blue-700 transition-colors"
              >
                Upgrade Now
              </button>
            </div>

            {/* Disclaimer Footer */}
            <div className="text-[9px] text-slate-500 border-t border-slate-300 pt-3 leading-relaxed text-justify">
              <strong>Disclaimer:</strong> This FREE GST Health Scan is a preliminary informational report
              prepared using publicly available GST information available at the time of the scan. It is not a
              statutory audit, GST compliance certificate, legal opinion, tax audit or guarantee of compliance.
              Data availability may vary and public information may not contain complete taxpayer records. Any
              observation marked for review should be verified using authorised GST Portal information, books of
              account, returns and relevant supporting documents.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GstHealthScan;