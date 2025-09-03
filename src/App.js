import React, { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

import Sidebar from "./components/Sidebar";
import AuthForm from "./components/authForm";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import Search from "./pages/Search";
import ProfileSetup from "./components/ProfileSetup";
import AddPost from "./pages/AddPost";
import Messages from "./pages/Messages";
import GroupPage from "./pages/GroupPage";
import "./App.css";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  return null;
}

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  return (
    <BrowserRouter>
      <ScrollToTop />
      {!user ? (
        <AuthForm />
      ) : (
        <div className="app-layout">
          <Sidebar />

          <div className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<Search />} />
              <Route path="/profile" element={<Profile user={user} />} />
              <Route path="/profile/:userId" element={<Profile />} />
              <Route path="/profile-setup" element={<ProfileSetup />} />
              <Route path="/add-post" element={<AddPost />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/groups/:groupId" element={<GroupPage />} />
            </Routes>
          </div>
        </div>
      )}
    </BrowserRouter>
  );
}

export default App;
