import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import "../styles/Header.css";

const NAV_ITEMS = [
  { to: "/", label: "My Tasks", end: true },
  { to: "/projects", label: "Projects", roles: ["admin", "manager"] },
  { to: "/users", label: "Users", roles: ["admin"] },
  { to: "/permission", label: "Permissions", roles: ["admin"] },
  { to: "/account", label: "Account" },
];

const Header = () => {
  const { user, handleLogout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const role = user?.role ?? "";
  const firstName = user?.name?.trim().split(/\s+/)[0] || user?.email?.split("@")[0] || "there";
  const items = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));

  const closeMenu = () => setMenuOpen(false);

  const onLogout = () => {
    closeMenu();
    handleLogout();
  };

  const renderLinks = (onClick) =>
    items.map((item) => (
      <NavLink key={item.to} to={item.to} end={item.end} className="nav-link" onClick={onClick}>
        {item.label}
      </NavLink>
    ));

  return (
    <header className="app-header">
      <div className="header-container">
        <NavLink to="/" className="header-logo" onClick={closeMenu}>
          <span className="logo-icon">T</span>
          <span>TimeTrack</span>
        </NavLink>

        <nav className="header-nav">{renderLinks()}</nav>

        <div className="header-user">
          <div className="header-welcome">
            <span className="header-welcome-label">Welcome back,</span>
            <span className="header-welcome-name">
              {firstName}
              {role && <span className="header-welcome-role">{role}</span>}
            </span>
          </div>

          <button type="button" onClick={onLogout} className="header-logout-btn">
            Logout
          </button>
        </div>

        <button
          type="button"
          className={`header-toggle ${menuOpen ? "is-open" : ""}`}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span /><span /><span />
        </button>
      </div>

      <div className={`header-mobile-panel ${menuOpen ? "is-open" : ""}`} onClick={closeMenu}>
        <div className="header-mobile-inner" onClick={(e) => e.stopPropagation()}>
          <div className="header-mobile-welcome">
            <span className="header-welcome-label">Welcome back,</span>
            <span className="header-welcome-name">
              {firstName}
              {role && <span className="header-welcome-role">{role}</span>}
            </span>
          </div>

          <nav className="header-mobile-nav">{renderLinks(closeMenu)}</nav>

          <button type="button" onClick={onLogout} className="header-logout-btn header-logout-btn--full">
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
