import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
  </svg>
);

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
  </svg>
);

const AddIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
  </svg>
);

const MessagesIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="32"
    height="32"
    fill="currentColor"
    viewBox="0 0 256 256"
  >
    <path d="M183.89,153.34a57.6,57.6,0,0,1-46.56,46.55A8.75,8.75,0,0,1,136,200a8,8,0,0,1-1.32-15.89c16.57-2.79,30.63-16.85,33.44-33.45a8,8,0,0,1,15.78,2.68ZM216,144a88,88,0,0,1-176,0c0-27.92,11-56.47,32.66-84.85a8,8,0,0,1,11.93-.89l24.12,23.41,22-60.41a8,8,0,0,1,12.63-3.41C165.21,36,216,84.55,216,144Zm-16,0c0-46.09-35.79-85.92-58.21-106.33L119.52,98.74a8,8,0,0,1-13.09,3L80.06,76.16C64.09,99.21,56,122,56,144a72,72,0,0,0,144,0Z"></path>
  </svg>
);

const ProfileIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
  </svg>
);

const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
  </svg>
);

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const navItems = [
    { path: "/", icon: HomeIcon, label: "Home" },
    { path: "/search", icon: SearchIcon, label: "Search" },
    { path: "/add-post", icon: AddIcon, label: "Add" },
    { path: "/messages", icon: MessagesIcon, label: "Groups" },
    { path: "/profile", icon: ProfileIcon, label: "Profile" },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-nav">
        {navItems.map(({ path, icon: Icon, label }) => (
          <div
            key={path}
            className={`nav-item ${
              location.pathname === path ||
              (location.pathname.startsWith("/groups") &&
                path === "/messages") ||
              (location.pathname.startsWith("/profile") && path === "/profile")
                ? "active"
                : ""
            }`}
            onClick={() => navigate(path)}
            title={label}
            data-label={label}
          >
            <Icon />
          </div>
        ))}
      </div>

      <div className="logout-section">
        <button className="logout-btn" onClick={handleLogout} title="Logout">
          <LogoutIcon />
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
