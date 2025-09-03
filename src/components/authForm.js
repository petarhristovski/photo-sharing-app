import React, { useEffect, useState } from "react";
import { auth, db, googleAuthProvider } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

const AuthForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        const uid = userCredential.user.uid;

        await setDoc(doc(db, "users", uid), {
          email,
          displayName: email.split("@")[0],
          username: email.split("@")[0],
          friends: [],
          bio: "",
          photoURL:
            "https://isobarscience.com/wp-content/uploads/2020/09/default-profile-picture1.jpg",
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const signInWithGoogle = async () => {
    setError("");
    try {
      const userCredential = await signInWithPopup(auth, googleAuthProvider);
      const uid = userCredential.user.uid;

      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        await setDoc(
          doc(db, "users", uid),
          {
            email: userCredential.user.email,
            displayName: userCredential.user.displayName,
            username: userCredential.user.email.split("@")[0],
            friends: [],
            bio: "",
            photoURL: null,
          },
          { merge: true }
        );
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-container">
        <div className="auth-header">
          <h2 className="auth-title">
            {isRegistering ? "Create Account" : "Welcome Back"}
          </h2>
          <p className="auth-subtitle">
            {isRegistering
              ? "Join our community and start sharing your moments"
              : "Sign in to continue to your account"}
          </p>
        </div>
        <div className="auth-form-card">
          {error && (
            <div className="auth-error">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                </svg>
                Email Address
              </label>
              <input
                type="email"
                className="form-input-authform"
                placeholder="Enter your email..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z" />
                </svg>
                Password
              </label>
              <input
                type="password"
                className="form-input-authform"
                placeholder="Enter your password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="btn-primary auth-submit-btn"
              disabled={loading || !email.trim() || !password.trim()}
            >
              {loading ? (
                <>{isRegistering ? "Creating Account..." : "Signing In..."}</>
              ) : (
                <>{isRegistering ? "Create Account" : "Sign In"}</>
              )}
            </button>
          </form>

          <div className="auth-divider">
            <span>or continue with</span>
          </div>

          <button
            className="google-signin-btn"
            onClick={signInWithGoogle}
            disabled={loading}
          >
            <div className="google-icon">
              <svg viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            </div>
            {loading ? "Please wait..." : "Sign in with Google"}
          </button>

          <div className="auth-toggle">
            <p>
              {isRegistering
                ? "Already have an account?"
                : "Don't have an account?"}
              <button
                type="button"
                className="toggle-btn"
                onClick={() => setIsRegistering(!isRegistering)}
                disabled={loading}
              >
                {isRegistering ? "Sign in here" : "Create one here"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;
