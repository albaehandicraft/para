import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { type UserRole } from "@shared/schema";

interface RoleGuardProps {
  roles: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

export const RoleGuard = ({ roles, children, fallback = null }: RoleGuardProps) => {
  const { hasRole } = useAuth();

  if (!hasRole(roles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
