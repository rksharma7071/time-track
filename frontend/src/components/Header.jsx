
import { NavLink, useNavigate } from "react-router-dom";
import "../styles/Header.css";
import { useAuth } from "../context/AuthContext.jsx";

const Header = () => {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const response = await fetch(
        "http://localhost:3000/api/auth/logout",
        {
          method: "POST",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Logout failed.");
      }

      // Clear auth state and redirect via React Router
      setUser(null);
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout error:", error.message);
    }
  };

  return (
    <header className="app-header">
      <div className="header-container">
        <NavLink to="/" className="header-logo">
          <span className="logo-icon">T</span>
          <span>TimeTrack</span>
        </NavLink>

        <nav className="header-nav">
          <NavLink to="/" end className="nav-link">Home</NavLink>
          {/* <NavLink to="/reports" className="nav-link">Reports</NavLink> */}
          <NavLink to="/projects" className="nav-link">Projects</NavLink>
          <NavLink to="/users" className="nav-link">Users</NavLink>
          <NavLink onClick={handleLogout} className="nav-link nav-link-logout">Logout</NavLink>
        </nav>
      </div>
    </header>
  );
};

export default Header;
