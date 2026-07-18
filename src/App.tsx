import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from 'react';
import Settings from "@/pages/Settings";
import Inbox from "@/pages/Inbox";
import Compose from "@/pages/Compose";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useEmailStore } from "@/store/emailStore";
import { fetchProviders } from "@/api/emailApi";

function HomeRedirect() {
  const { configs, getActiveConfig } = useEmailStore();
  const navigate = useNavigate();
  const hasNavigated = useRef(false);

  useEffect(() => {
    if (configs.length > 0 && !hasNavigated.current) {
      hasNavigated.current = true;
      navigate('/inbox', { replace: true });
    }
  }, [configs, navigate]);

  if (configs.length === 0) {
    return <Settings />;
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-blue-400">加载中...</div>
    </div>
  );
}

function AppRoutes() {
  const { setProviders } = useEmailStore();
  const [providersLoaded, setProvidersLoaded] = useState(false);
  const hasLoadedProviders = useRef(false);

  useEffect(() => {
    if (hasLoadedProviders.current) return;
    hasLoadedProviders.current = true;
    
    const load = async () => {
      try {
        const providers = await fetchProviders();
        setProviders(providers);
      } catch {
        // ignore
      } finally {
        setProvidersLoaded(true);
      }
    };
    load();
  }, [setProviders]);

  if (!providersLoaded) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-blue-400">加载中...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/inbox" element={<Inbox />} />
      <Route path="/compose" element={<Compose />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AppRoutes />
      </Router>
    </ErrorBoundary>
  );
}
