import { Navigate, Outlet, useLocation, Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button, PageLoader } from '@/components/ui';
export function RequireAuth() {
    const { user, loading } = useAuth();
    const loc = useLocation();
    if (loading)
        return <PageLoader />;
    if (!user)
        return <Navigate to="/login" state={{ from: loc.pathname + loc.search }} replace/>;
    return <Outlet />;
}
export function RequireAdmin({ children }) {
    const { user, isAdmin, loading } = useAuth();
    const loc = useLocation();
    if (loading)
        return <PageLoader />;
    if (!user)
        return <Navigate to="/login" state={{ from: loc.pathname }} replace/>;
    if (!isAdmin) {
        return (<div className="grid min-h-dvh place-items-center p-6 text-center">
        <div className="max-w-sm">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-3xl bg-danger/10 text-danger"><ShieldAlert className="size-8"/></div>
          <h1 className="text-2xl font-bold">Admin access only</h1>
          <p className="mt-2 text-sm text-muted">Your account does not have permission to open the dashboard. If you should have access, ask the store owner to grant it.</p>
          <Link to="/"><Button className="mt-6">Back to the store</Button></Link>
        </div>
      </div>);
    }
    return <>{children}</>;
}
