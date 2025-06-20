import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { RoleGuard } from "./RoleGuard";
import {
  Truck,
  Users,
  Clock,
  BarChart3,
  Package,
  MapPin,
  QrCode,
  DollarSign,
  History,
  Menu,
  Bell,
  ChevronDown,
  LogOut,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: BarChart3,
    roles: ["superadmin", "admin", "pic", "kurir"],
  },
  {
    name: "Pengiriman Management",
    href: "/pengiriman",
    icon: Package,
    roles: ["superadmin", "admin", "pic"],
  },
  {
    name: "User Management",
    href: "/users",
    icon: Users,
    roles: ["superadmin", "admin"],
  },
  {
    name: "Attendance Tracking",
    href: "/attendance",
    icon: Clock,
    roles: ["superadmin", "admin", "pic"],
  },
  {
    name: "My Attendance",
    href: "/my-attendance",
    icon: Clock,
    roles: ["kurir"],
  },
  {
    name: "My Packages",
    href: "/my-packages",
    icon: Package,
    roles: ["kurir"],
  },
  {
    name: "Geofencing Setup",
    href: "/geofencing",
    icon: MapPin,
    roles: ["superadmin", "admin"],
  },
  {
    name: "Salary Management",
    href: "/salary",
    icon: DollarSign,
    roles: ["superadmin", "admin"],
  },
  {
    name: "Reports",
    href: "/reports",
    icon: History,
    roles: ["superadmin", "admin", "pic"],
  },
];

export const Layout = ({ children }: LayoutProps) => {
  const [location] = useLocation();
  const { user, logout, hasRole } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) {
    return <>{children}</>;
  }

  const getInitials = (name: string | undefined) => {
    if (!name || typeof name !== 'string') {
      return 'U'; // Default fallback for undefined/invalid names
    }
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const visibleNavigation = navigation.filter((item) =>
    hasRole(item.roles as any)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Truck className="w-4 h-4 text-white" />
                </div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Pengiriman System
                </h1>
              </div>
              
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <Menu className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="w-5 h-5" />
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 w-5 h-5 text-xs p-0 flex items-center justify-center"
                >
                  3
                </Badge>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-3 p-2">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-blue-600 text-white text-sm">
                        {getInitials(user.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-medium text-gray-900">
                        {user.fullName || 'User'}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {user.role || 'user'}
                      </p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`w-64 bg-white shadow-sm border-r border-gray-200 ${
            sidebarOpen ? "block" : "hidden"
          } lg:block fixed lg:relative h-full lg:h-auto z-40`}
        >
          <nav className="p-4 space-y-2">
            {visibleNavigation.map((item) => {
              const isActive = location === item.href;
              return (
                <Link 
                  key={item.name} 
                  href={item.href}
                  className={`nav-link ${
                    isActive ? "nav-link-active" : "nav-link-inactive"
                  }`}
                >
                  <item.icon className="w-4 h-4 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
};
