import { useState, useEffect } from 'react';
import { User, Role } from './types';
import Auth from './components/Auth';
import EmployerDashboard from './components/EmployerDashboard';
import EmployeeDashboard from './components/EmployeeDashboard';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('payroll_user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('payroll_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('payroll_user');
    }
  }, [user]);

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-neutral-50 font-sans text-neutral-900">
      <AnimatePresence mode="wait">
        {!user ? (
          <motion.div
            key="auth"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex min-h-screen items-center justify-center p-4"
          >
            <Auth onLogin={setUser} />
          </motion.div>
        ) : user.role === 'employer' ? (
          <motion.div
            key="employer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <EmployerDashboard user={user} onLogout={handleLogout} />
          </motion.div>
        ) : (
          <motion.div
            key="employee"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <EmployeeDashboard user={user} onLogout={handleLogout} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
