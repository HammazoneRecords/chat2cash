import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import StaffInvite from './components/StaffInvite';
import './index.css';

const pathname = window.location.pathname;
const page = pathname === '/admin'
  ? <AdminLogin />
  : pathname === '/admin-dashboard'
    ? <AdminDashboard />
    : pathname === '/staff-invite'
      ? <StaffInvite />
    : <App />;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {page}
  </StrictMode>,
);
