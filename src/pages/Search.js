import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

function Search() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    setError("");

    try {
      const usersRef = collection(db, "users");
      const q = query(
        usersRef,
        where("username", ">=", searchTerm.toLowerCase()),
        where("username", "<=", searchTerm.toLowerCase() + "\uf8ff")
      );

      const querySnapshot = await getDocs(q);
      const results = [];
      querySnapshot.forEach((doc) => {
        results.push({ id: doc.id, ...doc.data() });
      });

      setSearchResults(results);
    } catch (err) {
      setError("Error searching for users");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="feed-container">
      <div className="search-header">
        <h2 className="page-title">Search Users</h2>
        <p className="page-subtitle">Find and connect with other users</p>
      </div>

      <div className="search-form-container">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-wrapper">
            <svg
              className="search-icon"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            <input
              type="text"
              placeholder="Search by username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input-field"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !searchTerm.trim()}
            className="search-submit-btn"
          >
            {loading ? <>Searching...</> : "Search"}
          </button>
        </form>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="search-results">
        {loading ? (
          <div className="loading">Searching for users...</div>
        ) : searchResults.length > 0 ? (
          <div className="results-header">
            <h3>
              Found {searchResults.length} user
              {searchResults.length !== 1 ? "s" : ""}
            </h3>
          </div>
        ) : null}

        {searchResults.map((user) => (
          <div key={user.id} className="user-card">
            <div className="user-avatar-container">
              <img
                src={user.photoURL || "https://via.placeholder.com/60"}
                alt={user.username}
                className="user-search-avatar"
              />
              {user.isOnline && <div className="online-indicator"></div>}
            </div>

            <div className="user-search-info">
              <h4 className="user-search-username">{user.username}</h4>
              <p className="user-search-displayname">{user.displayName}</p>
              {user.bio && <p className="user-search-bio">{user.bio}</p>}
              <div className="user-stats">
                <span className="stat">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  {user.postsCount || 0} post
                  {user.postsCount !== 1 ? "s" : ""}
                </span>
                <span className="stat">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A1.5 1.5 0 0 0 18.54 8H16c-.8 0-1.54.37-2 1l-3 4v6h2v7h3v-7h4z" />
                  </svg>
                  {user.friends.length || 0} friend
                  {user.friends.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            <div className="user-actions">
              <button
                className="btn-secondary user-action-btn"
                onClick={() => navigate(`/profile/${user.id}`)}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                </svg>
                View Profile
              </button>
            </div>
          </div>
        ))}

        {searchTerm && !loading && searchResults.length === 0 && (
          <div className="no-results-card">
            <div className="no-results-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
            </div>
            <h3>No users found</h3>
            <p>Try searching with a different username</p>
          </div>
        )}

        {!searchTerm && !loading && (
          <div className="empty-search-state">
            <div className="empty-search-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
            </div>
            <h3>Discover New People</h3>
            <p>Search for users by their username to connect and follow</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Search;
