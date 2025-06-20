import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import { RoleGuard } from "@/components/RoleGuard";

// Pages
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import PengirimanManagement from "@/pages/PengirimanManagement";
import UserManagement from "@/pages/UserManagement";
import AttendanceTracking from "@/pages/AttendanceTracking";
import KurirDashboard from "@/pages/KurirDashboard";
import KurirAttendance from "@/pages/KurirAttendance";
import KurirPackages from "@/pages/KurirPackages";
import PICDashboard from "@/pages/PICDashboard";
import GeofencingSetup from "@/pages/GeofencingSetup";
import Reports from "@/pages/Reports";
import NotFound from "@/pages/not-found";

// Update query client to include auth token
const updateQueryClient = () => {
  queryClient.setDefaultOptions({
    queries: {
      queryFn: async ({ queryKey }) => {
        const token = localStorage.getItem("auth_token");
        const res = await fetch(queryKey[0] as string, {
          credentials: "include",
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });

        if (res.status === 401) {
          // Redirect to login on 401
          localStorage.removeItem("auth_token");
          window.location.href = "/login";
          return null;
        }

        if (!res.ok) {
          const text = (await res.text()) || res.statusText;
          throw new Error(`${res.status}: ${text}`);
        }
        
        return await res.json();
      },
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: false,
    },
    mutations: {
      retry: false,
    },
  });
};

updateQueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <Layout>{children}</Layout>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    // Redirect based on user role
    if (user.role === "kurir") {
      return <Redirect to="/kurir-dashboard" />;
    } else if (user.role === "pic") {
      return <Redirect to="/pic-dashboard" />;
    } else {
      return <Redirect to="/dashboard" />;
    }
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login">
        <PublicRoute>
          <Login />
        </PublicRoute>
      </Route>

      {/* Protected routes - Role-based dashboards */}
      <Route path="/kurir-dashboard">
        <ProtectedRoute>
          <RoleGuard roles={["kurir"]} fallback={<Redirect to="/dashboard" />}>
            <KurirDashboard />
          </RoleGuard>
        </ProtectedRoute>
      </Route>

      <Route path="/pic-dashboard">
        <ProtectedRoute>
          <RoleGuard roles={["pic"]} fallback={<Redirect to="/dashboard" />}>
            <PICDashboard />
          </RoleGuard>
        </ProtectedRoute>
      </Route>

      {/* Protected routes - General */}
      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>

      <Route path="/pengiriman">
        <ProtectedRoute>
          <RoleGuard roles={["superadmin", "admin", "pic"]} fallback={<NotFound />}>
            <PengirimanManagement />
          </RoleGuard>
        </ProtectedRoute>
      </Route>

      <Route path="/users">
        <ProtectedRoute>
          <RoleGuard roles={["superadmin", "admin"]} fallback={<NotFound />}>
            <UserManagement />
          </RoleGuard>
        </ProtectedRoute>
      </Route>

      <Route path="/attendance">
        <ProtectedRoute>
          <RoleGuard roles={["superadmin", "admin", "pic"]} fallback={<NotFound />}>
            <AttendanceTracking />
          </RoleGuard>
        </ProtectedRoute>
      </Route>

      <Route path="/my-attendance">
        <ProtectedRoute>
          <RoleGuard roles={["kurir"]} fallback={<NotFound />}>
            <KurirAttendance />
          </RoleGuard>
        </ProtectedRoute>
      </Route>

      <Route path="/my-packages">
        <ProtectedRoute>
          <RoleGuard roles={["kurir"]} fallback={<NotFound />}>
            <KurirPackages />
          </RoleGuard>
        </ProtectedRoute>
      </Route>

      <Route path="/geofencing">
        <ProtectedRoute>
          <RoleGuard roles={["superadmin", "admin"]} fallback={<NotFound />}>
            <GeofencingSetup />
          </RoleGuard>
        </ProtectedRoute>
      </Route>

      <Route path="/salary">
        <ProtectedRoute>
          <RoleGuard roles={["superadmin", "admin"]} fallback={<NotFound />}>
            <div className="p-6">
              <h1 className="text-2xl font-bold mb-4">Salary Management</h1>
              <p>Salary management functionality will be implemented here.</p>
            </div>
          </RoleGuard>
        </ProtectedRoute>
      </Route>

      <Route path="/reports">
        <ProtectedRoute>
          <RoleGuard roles={["superadmin", "admin"]} fallback={<NotFound />}>
            <Reports />
          </RoleGuard>
        </ProtectedRoute>
      </Route>

      {/* Root redirect */}
      <Route path="/">
        <ProtectedRoute>
          <Redirect to="/dashboard" />
        </ProtectedRoute>
      </Route>

      {/* 404 fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
