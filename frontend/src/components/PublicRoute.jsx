import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const PublicRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="auth-loading">Checking authentication...</div>;
  }

  return user ? <Navigate to="/" replace /> : <Outlet />;
};

export default PublicRoute;