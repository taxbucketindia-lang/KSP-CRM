import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { useContext } from 'react';
import { ShieldAlert } from 'lucide-react';
import { can, permissionLabel } from './utils/permissions';
import { isAdminRole, isCeoRole } from './utils/roles';

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
import TdsWorkspace from './pages/TdsWorkspace';
import AuditWorkspace from './pages/AuditWorkspace';
import Holidays from './pages/Holidays';
import FssaiWorkspace from './pages/FssaiWorkspace';
import OfficeExpense from './pages/OfficeExpense';
import TodoReminder from './pages/TodoReminder';
import FeeAndDocuments from './pages/FeeAndDocuments';
import BirthdayWishes from './pages/BirthdayWishes';
import DevTask from './pages/DevTask';
import TaskHandoverWorkspace from './pages/TaskHandoverWorkspace';
import BusinessHealth from './pages/BusinessHealth';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div className="h-screen flex items-center justify-center">Loading CRM...</div>;
  return user ? children : <Navigate to="/login" />;
};

// 🔴 Har page ek right (perm) se juda hai. Jiske paas right nahi, use page nahi khulta
// (sirf sidebar se tab chhupana kaafi nahi, koi seedha address type kar sakta hai).
// adminOnly = sirf CEO / Admin (Access Control).
const Guard = ({ perm, adminOnly, children }) => {
  const { user, accessReady } = useContext(AuthContext);
  if (!accessReady) return <div className="h-[60vh] flex items-center justify-center text-slate-400 text-sm font-semibold">Checking access...</div>;

  const ok = adminOnly ? isAdminRole(user?.role) : can(user, perm);
  if (ok) return children;

  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
      <ShieldAlert size={48} className="text-rose-500 mb-4" />
      <h2 className="text-xl font-bold text-slate-800">You do not have access to this page</h2>
      <p className="text-sm text-slate-500 mt-2">
        {adminOnly ? 'Only the CEO and Admins can open this page.' : `Ask your Admin for the "${permissionLabel(perm)}" right.`}
      </p>
      <Link to="/" className="mt-5 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl">Go to Home</Link>
    </div>
  );
};

// 🔴 HOME PAGE role ke hisaab se:
// CEO -> CEO Dashboard, Admin -> Dashboard, baaki sab employee -> My Portal
const Home = () => {
  const { user } = useContext(AuthContext);
  if (isCeoRole(user?.role)) return <Navigate to="/ceo-panel" replace />;
  if (isAdminRole(user?.role)) return <Dashboard />;
  return <Navigate to="/my-portal" replace />;
};

// Purana Success List page: employee ke liye ab My Portal ke andar hai (purane link / reminder wahin pahunchte hain)
const TodoHome = () => {
  const { user } = useContext(AuthContext);
  return isAdminRole(user?.role) ? <TodoReminder /> : <Navigate to="/my-portal#success-list" replace />;
};

const guarded = (perm, element) => <Guard perm={perm}>{element}</Guard>;

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Protected Routes Wrapped in Layout */}
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            {/* Sabke liye */}
            <Route index element={<Home />} />
            <Route path="/my-portal" element={<MyPortal />} />
            <Route path="/todo" element={<TodoHome />} />

            {/* Sirf CEO / Admin */}
            <Route path="settings" element={<Guard adminOnly><Settings /></Guard>} />

            {/* Main */}
            <Route path="/work-management" element={guarded('WORK_MANAGEMENT', <WorkManagement />)} />
            <Route path="/taskhandover" element={guarded('TASK_HANDOVER', <TaskHandoverWorkspace />)} />

            {/* Marketing & Sales */}
            <Route path="leads" element={guarded('LEADS', <Leads />)} />
            <Route path="/gst-health" element={guarded('GST_HEALTH', <GstHealthScan />)} />
            <Route path="/feeanddocuments" element={guarded('FEE_DOCS', <FeeAndDocuments />)} />

            {/* Service Team */}
            <Route path="clients" element={guarded('REGISTRATIONS', <Clients />)} />
            <Route path="/client-master" element={guarded('CLIENT_MASTER', <ClientMaster />)} />
            <Route path="/itr-returns" element={guarded('ITR', <ItrReturns />)} />
            <Route path="/gst-returns" element={guarded('GST', <GstReturns />)} />
            <Route path="/roc-returns" element={guarded('ROC', <RocWorkspace />)} />
            <Route path="/tds-returns" element={guarded('TDS', <TdsWorkspace />)} />
            <Route path="/audit" element={guarded('AUDIT', <AuditWorkspace />)} />
            <Route path="/fssai-returns" element={guarded('FSSAI', <FssaiWorkspace />)} />
            <Route path="bas" element={guarded('BAS', <BAs />)} />
            <Route path="/birthday-wishes" element={guarded('BIRTHDAY', <BirthdayWishes />)} />

            {/* HR & Ops */}
            <Route path="/hr/employees" element={guarded('EMPLOYEE_MASTER', <EmployeeMaster />)} />
            <Route path="/hr/attendance" element={guarded('ATTENDANCE', <Attendance />)} />
            <Route path="/hr/salary" element={guarded('SALARY', <SalaryCalculation />)} />
            <Route path="/hr/holiday" element={guarded('HOLIDAY', <Holidays />)} />
            <Route path="/officexpense" element={guarded('OFFICE_EXPENSE', <OfficeExpense />)} />

            {/* Finance / IT / Executive */}
            <Route path="/invoice-generator" element={guarded('INVOICES', <InvoiceGenerator />)} />
            <Route path="/it/dev-task" element={guarded('DEV_TASKS', <DevTask />)} />
            <Route path="/ceo-panel" element={guarded('CEO_DASHBOARD', <CeoDashboard />)} />
            <Route path="/business-health" element={guarded('BUSINESS_HEALTH', <BusinessHealth />)} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
