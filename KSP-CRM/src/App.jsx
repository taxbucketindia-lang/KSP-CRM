import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { useContext } from 'react';

// Components
import Login from './pages/Login';
import Layout from './components/Layout';
import Leads from './pages/Leads';
import Clients from './pages/Clients';
import BAs from './pages/BAs';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import ItrReturns from './pages/ItrReturns';
import GstReturns from './pages/GstReturns';
import WorkManagement from './pages/WorkManagement';
import InvoiceGenerator from './pages/InvoiceGenerator';
import EmployeeMaster from './pages/EmployeeMaster';
import Attendance from './pages/Attendance';
import SalaryCalculation from './pages/SalaryCalculation';
import MyPortal from './pages/MyPortal';
import CeoDashboard from './pages/CeoDashboard';
import GstHealthScan from './pages/GstHealthScan';
import ClientMaster from './pages/ClientMaster';
import RocWorkspace from './pages/RocWorkspace';

// Placeholder Pages (Inko next step mein banayenge)
// const Dashboard = () => <div><h1 className="text-2xl font-bold">Dashboard</h1><p>KPIs will appear here.</p></div>;
// const Leads = () => <div><h1 className="text-2xl font-bold">Leads Management</h1></div>;
// const Clients = () => <div><h1 className="text-2xl font-bold">Client Master</h1></div>;
// const BAs = () => <div><h1 className="text-2xl font-bold">Business Associates</h1></div>;

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div className="h-screen flex items-center justify-center">Loading CRM...</div>;
  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Protected Routes Wrapped in Layout */}
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="leads" element={<Leads />} />
            <Route path="clients" element={<Clients />} />
            <Route path="bas" element={<BAs />} />
            <Route path="settings" element={<Settings />} />
            <Route path="/itr-returns" element={<ItrReturns />} />
            <Route path="/gst-returns" element={<GstReturns />} />
            <Route path="/work-management" element={<WorkManagement />} />
            <Route path="/invoice-generator" element={<InvoiceGenerator />} />
            <Route path="/hr/employees" element={<EmployeeMaster />} />
            <Route path="/hr/attendance" element={<Attendance />} />
            <Route path="/hr/salary" element={<SalaryCalculation />} />
            <Route path="/my-portal" element={<MyPortal />} />
            <Route path="/ceo-panel" element={<CeoDashboard />} />
            <Route path="/gst-health" element={<GstHealthScan />} />
            <Route path="/client-master" element={<ClientMaster />} />
            <Route path="/roc-returns" element={<RocWorkspace />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;