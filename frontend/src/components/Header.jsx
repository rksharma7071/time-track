import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import "../styles/Header.css";

const Header = () => {
  const { user, handleLogout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const onLogout = () => {
    closeMenu();
    handleLogout();
  };

  const firstName = user?.name?.trim().split(/\s+/)[0] || user?.email?.split("@")[0] || "there";
  const role = user?.role || "";

  return (
    <header className="app-header">
      <div className="header-container">
        <NavLink to="/" className="header-logo" onClick={closeMenu}>
          <span className="logo-icon">T</span>
          <span>TimeTrack</span>
        </NavLink>

        <nav className="header-nav">
          <NavLink to="/" end className="nav-link">Home</NavLink>
          {role === "admin" && (
            <NavLink to="/projects" className="nav-link">Projects</NavLink>
          )}
          <NavLink to="/users" className="nav-link">Users</NavLink>
        </nav>

        <div className="header-user">
          <div className="header-welcome">
            <span className="header-welcome-label">Welcome back,</span>
            <span className="header-welcome-name">
              {firstName}
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="header-logout-btn"
          >
            Logout
          </button>
        </div>

        <button
          type="button"
          className={`header-toggle ${menuOpen ? "is-open" : ""}`}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span /><span /><span />
        </button>
      </div>

      <div
        className={`header-mobile-panel ${menuOpen ? "is-open" : ""}`}
        onClick={closeMenu}
      >
        <div className="header-mobile-inner" onClick={(e) => e.stopPropagation()}>
          <div className="header-mobile-welcome">
            <span className="header-welcome-label">Welcome back,</span>
            <span className="header-welcome-name">
              {firstName}
              {role && <span className="header-welcome-role">{role}</span>}
            </span>
          </div>

          <nav className="header-mobile-nav">
            <NavLink to="/" end className="nav-link" onClick={closeMenu}>Home</NavLink>
            {role === "admin" && (
              <NavLink to="/projects" className="nav-link" onClick={closeMenu}>Projects {role === "admin" && "Hello"}</NavLink>
            )}
            <NavLink to="/users" className="nav-link" onClick={closeMenu}>Users</NavLink>
          </nav>

          <button
            type="button"
            onClick={onLogout}
            className="header-logout-btn header-logout-btn--full"
          >
            Logout
          </button>
        </div>
      </div>
    </header >
  );
};

export default Header;