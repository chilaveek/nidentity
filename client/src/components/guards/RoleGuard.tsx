import { Navigate } from "react-router";
import { useAuth, type Role } from "../../context/AuthContext";

interface RoleGuardProps {
  allowedRoles: Role[];
  children: React.ReactNode;
  redirectTo?: string;
}

export function RoleGuard({ allowedRoles, children, redirectTo = "/" }: RoleGuardProps) {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    if (allowedRoles.includes(null)) {
      return <>{children}</>;
    }
    return <Navigate to="/" replace />;
  }

  if (!allowedRoles.includes(role)) {
    if (role === "Admin") return <Navigate to="/admin" replace />;
    if (role === "Author" && allowedRoles.includes("User")) return <Navigate to="/author" replace />;
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
