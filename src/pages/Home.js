import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  orderBy,
  query,
  doc,
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove,
  getDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

function Home() {
  const [posts, setPosts] = useState([]);
  const [userData, setUserData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showComments, setShowComments] = useState({});
  const [newComment, setNewComment] = useState({});
  const [showAllGroups, setShowAllGroups] = useState(false);
  const [topLikedPosts, setTopLikedPosts] = useState([]);

  const user = getAuth().currentUser;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = getAuth().currentUser;

        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        let currentUserData = null;
        if (userSnap.exists()) {
          currentUserData = userSnap.data();
          setUserData(currentUserData);
        } else {
          console.log("No such document!");
        }

        const leaderboardRef = collection(db, "groups");
        const leaderboardSnapshot = await getDocs(leaderboardRef);
        const leaderboardData = leaderboardSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        const filteredLeaderboardData = leaderboardData.filter(
          (group) => group.currentStreak > 0
        );

        filteredLeaderboardData.sort((a, b) => {
          if (b.currentStreak !== a.currentStreak) {
            return b.currentStreak - a.currentStreak;
          }

          const aDate = a.createdAt?.toDate() || new Date(0);
          const bDate = b.createdAt?.toDate() || new Date(0);
          return bDate - aDate;
        });
        setLeaderboard(filteredLeaderboardData);

        const friendsList = currentUserData?.friends || [];

        const allowedUsers = [...friendsList, user.uid];

        const postsRef = collection(db, "posts");
        const q = query(postsRef, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        const postsData = [];
        const allPostsData = [];

        querySnapshot.forEach((doc) => {
          const postData = { id: doc.id, ...doc.data() };
          allPostsData.push(postData);

          if (allowedUsers.includes(postData.userId)) {
            postsData.push(postData);
          }
        });

        setPosts(postsData);

        const topLikedData = allPostsData
          .sort((a, b) => (b.likes || 0) - (a.likes || 0))
          .slice(0, 3);

        setTopLikedPosts(topLikedData);
      } catch (err) {
        setError("Error loading posts");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="loading">Loading feed...</div>;
  if (error) return <div className="error">{error}</div>;

  const handleLike = async (postId) => {
    const user = getAuth().currentUser;
    if (!user) return;

    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    if (post.likedBy && post.likedBy.includes(user.uid)) {
      setPosts((posts) =>
        posts.map((p) =>
          p.id === postId
            ? {
                ...p,
                likes: (p.likes || 1) - 1,
                likedBy: (p.likedBy || []).filter((uid) => uid !== user.uid),
              }
            : p
        )
      );

      try {
        await updateDoc(doc(db, "posts", postId), {
          likes: increment(-1),
          likedBy: arrayRemove(user.uid),
        });
      } catch (error) {
        setPosts((posts) =>
          posts.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  likes: p.likes + 1,
                  likedBy: [...p.likedBy, user.uid],
                }
              : p
          )
        );
        console.error("Error updating likes:", error);
      }
    } else {
      setPosts((posts) =>
        posts.map((p) =>
          p.id === postId
            ? {
                ...p,
                likes: p.likes + 1,
                likedBy: [...(p.likedBy || []), user.uid],
              }
            : p
        )
      );

      try {
        await updateDoc(doc(db, "posts", postId), {
          likes: increment(1),
          likedBy: arrayUnion(user.uid),
        });
      } catch (error) {
        setPosts((posts) =>
          posts.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  likes: p.likes - 1,
                  likedBy: (p.likedBy || []).filter((uid) => uid !== user.uid),
                }
              : p
          )
        );
        console.error("Error updating likes:", error);
      }
    }
    const postsRef = collection(db, "posts");
    const q = query(postsRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    const allPostsData = [];

    querySnapshot.forEach((doc) => {
      const postData = { id: doc.id, ...doc.data() };
      allPostsData.push(postData);
    });

    const topLikedData = allPostsData
      .sort((a, b) => (b.likes || 0) - (a.likes || 0))
      .slice(0, 3);

    setTopLikedPosts(topLikedData);
  };

  const toggleComments = (postId) => {
    setShowComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const handleCommentSubmit = (postId) => async (e) => {
    e.preventDefault();

    const commentText = newComment[postId];
    if (!commentText?.trim()) return;

    setPosts((posts) =>
      posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              comments: [
                ...(p.comments || []),
                { username: userData.username, text: commentText },
              ],
            }
          : p
      )
    );

    setNewComment((prev) => ({
      ...prev,
      [postId]: "",
    }));

    try {
      await updateDoc(doc(db, "posts", postId), {
        comments: arrayUnion({
          username: userData.username,
          text: commentText,
        }),
      });
    } catch (error) {
      setPosts((posts) =>
        posts.map((p) =>
          p.id === postId
            ? {
                ...p,
                comments: (p.comments || []).filter(
                  (comment, idx) => idx !== p.comments.length - 1
                ),
              }
            : p
        )
      );

      setNewComment((prev) => ({
        ...prev,
        [postId]: commentText,
      }));
      console.error("Error adding comment:", error);
    }
  };

  return (
    <div className="feed-container">
      <div className="leaderboard-section">
        <div className="leaderboard-header">
          <div className="header-content">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              fill="#dd2c00"
              viewBox="0 0 256 256"
            >
              <path d="M112.41,102.53a8,8,0,0,1,5.06-10.12l12-4A8,8,0,0,1,140,96v40a8,8,0,0,1-16,0V107.1l-1.47.49A8,8,0,0,1,112.41,102.53ZM248,208a8,8,0,0,1-8,8H16a8,8,0,0,1,0-16h8V104A16,16,0,0,1,40,88H80V56A16,16,0,0,1,96,40h64a16,16,0,0,1,16,16v72h40a16,16,0,0,1,16,16v56h8A8,8,0,0,1,248,208Zm-72-64v56h40V144ZM96,200h64V56H96Zm-56,0H80V104H40Z"></path>
            </svg>
            <h2>Group Streak Leaderboard</h2>
          </div>
        </div>

        <div className="leaderboard-container">
          {leaderboard.length === 0 ? (
            <div className="leaderboard-empty">
              <div className="empty-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
              <h3>No Group Streaks Yet</h3>
              <p>Join or create groups to start building streaks!</p>
            </div>
          ) : (
            <>
              <div className="leaderboard-grid">
                {leaderboard
                  .slice(0, showAllGroups ? leaderboard.length : 3)
                  .map((group, index) => (
                    <div
                      key={group.id}
                      className={`leaderboard-item rank-${index + 1}`}
                    >
                      <div className="rank-badge">
                        <span className="rank-number">#{index + 1}</span>
                      </div>

                      <div className="group-avatar-leaderboard">
                        <img
                          src={group.groupPhotoURL}
                          alt={group.name}
                          className="leaderboard-photo"
                        />
                      </div>

                      <div className="group-details">
                        <h4 className="group-name-leaderboard">{group.name}</h4>
                        <div className="streak-display-leaderboard">
                          <span className="streak-number-leaderboard">
                            {group.currentStreak}
                          </span>
                          <span className="streak-label-leaderboard">
                            {group.currentStreak === 1 ? "day" : "days"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {leaderboard.length > 3 && (
                <div className="leaderboard-actions">
                  <button
                    className="view-more-btn"
                    onClick={() => setShowAllGroups(!showAllGroups)}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path
                        d={
                          showAllGroups
                            ? "M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"
                            : "M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"
                        }
                      />
                    </svg>
                    {showAllGroups
                      ? "Show Less"
                      : `View All ${leaderboard.length} Groups`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="latest-topliked">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          fill="#dd2c00"
          viewBox="0 0 256 256"
        >
          <path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Zm-68-76a12,12,0,1,1-12-12A12,12,0,0,1,140,132Zm44,0a12,12,0,1,1-12-12A12,12,0,0,1,184,132ZM96,172a12,12,0,1,1-12-12A12,12,0,0,1,96,172Zm44,0a12,12,0,1,1-12-12A12,12,0,0,1,140,172Zm44,0a12,12,0,1,1-12-12A12,12,0,0,1,184,172Z"></path>
        </svg>
        <h2 id="latest-posts">Latest Posts</h2>
        <a href="#top-liked-posts" className="btn-primary teleport">
          Top Liked
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill="#ffffff"
            viewBox="0 0 256 256"
          >
            <path d="M205.66,149.66l-72,72a8,8,0,0,1-11.32,0l-72-72a8,8,0,0,1,11.32-11.32L120,196.69V40a8,8,0,0,1,16,0V196.69l58.34-58.35a8,8,0,0,1,11.32,11.32Z"></path>
          </svg>
        </a>
      </div>

      {posts.length === 0 ? (
        <div className="no-posts">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="40"
            height="40"
            fill="#dd2c00"
            viewBox="0 0 256 256"
          >
            <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm61.66-93.66a8,8,0,0,1-11.32,11.32L168,123.31l-10.34,10.35a8,8,0,0,1-11.32-11.32L156.69,112l-10.35-10.34a8,8,0,0,1,11.32-11.32L168,100.69l10.34-10.35a8,8,0,0,1,11.32,11.32L179.31,112Zm-80-20.68L99.31,112l10.35,10.34a8,8,0,0,1-11.32,11.32L88,123.31,77.66,133.66a8,8,0,0,1-11.32-11.32L76.69,112,66.34,101.66A8,8,0,0,1,77.66,90.34L88,100.69,98.34,90.34a8,8,0,0,1,11.32,11.32ZM140,180a12,12,0,1,1-12-12A12,12,0,0,1,140,180Z"></path>
          </svg>
          <br></br>
          <h3>No posts available</h3>
          <p>Add friends and start sharing moments!</p>
        </div>
      ) : (
        posts.map((post) => (
          <div key={post.id} className="post-card">
            <div className="post-header">
              <img
                src={post.userPhotoURL}
                alt="Profile"
                className="post-avatar"
              />
              <div className="post-user-info">
                <h4>{post.username}</h4>
                <p className="post-location">{post.location}</p>
              </div>
            </div>

            <img src={post.imageUrl} alt="Post" className="post-image" />

            <div className="post-actions">
              <button
                className={`action-btn ${
                  post.likedBy && user && post.likedBy.includes(user.uid)
                    ? "liked"
                    : ""
                }`}
                onClick={() => handleLike(post.id)}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
                {post.likes}
              </button>

              <button
                className="action-btn"
                onClick={() => toggleComments(post.id)}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21.99 4c0-1.1-.89-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.89 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
                </svg>
                {post.comments?.length || 0}
              </button>
            </div>

            <div className="post-caption">
              <span className="caption-username">{post.username}</span>
              <span className="caption-text">{post.caption}</span>
              <div className="post-timestamp">
                {new Date(post.createdAt?.toDate()).toLocaleString()}
              </div>
            </div>

            {showComments[post.id] && (
              <div className="comments-section">
                {post.comments?.map((comment, idx) => (
                  <div key={idx} className="comment">
                    <span className="comment-username">
                      {comment.username}:
                    </span>
                    <span className="comment-text">{comment.text}</span>
                  </div>
                ))}
                <form
                  className="comment-form"
                  onSubmit={handleCommentSubmit(post.id)}
                >
                  <input
                    className="comment-input"
                    placeholder="Add a comment..."
                    value={newComment[post.id] || ""}
                    onChange={(e) =>
                      setNewComment((prev) => ({
                        ...prev,
                        [post.id]: e.target.value,
                      }))
                    }
                  />
                  <button type="submit" className="comment-submit">
                    Post
                  </button>
                </form>
              </div>
            )}
          </div>
        ))
      )}

      <div className="latest-topliked">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          fill="none"
          viewBox="0 0 32 32"
          id="heart"
        >
          <path
            fill="#dd2c00"
            d="M21.0084 5.16227C18.1675 5.67067 15.9969 9.06675 15.9969 9.06675C15.9969 9.06675 13.8162 5.67067 10.9854 5.16227C3.97328 3.91162 1.08242 10.1547 2.25277 14.8015C3.98329 21.6648 12.3058 27.8164 15.0866 29.7178C15.6367 30.0941 16.357 30.0941 16.9171 29.7178C19.708 27.8164 28.0304 21.6648 29.7509 14.8015C30.9113 10.1547 28.0204 3.91162 21.0084 5.16227Z"
          ></path>
        </svg>
        <h2 id="top-liked-posts">Top Liked Posts</h2>
        <a href="#latest-posts" className="btn-primary teleport">
          Latest
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill="#ffffff"
            viewBox="0 0 256 256"
          >
            <path d="M205.66,117.66a8,8,0,0,1-11.32,0L136,59.31V216a8,8,0,0,1-16,0V59.31L61.66,117.66a8,8,0,0,1-11.32-11.32l72-72a8,8,0,0,1,11.32,0l72,72A8,8,0,0,1,205.66,117.66Z"></path>
          </svg>
        </a>
      </div>

      {topLikedPosts.length > 0 && (
        <div>
          {topLikedPosts.map((post) => (
            <div key={post.id} className="post-card">
              <div className="post-header">
                <img
                  src={post.userPhotoURL}
                  alt="Profile"
                  className="post-avatar"
                />
                <div className="post-user-info">
                  <h4>{post.username}</h4>
                  <p className="post-location">{post.location}</p>
                </div>
              </div>

              <img src={post.imageUrl} alt="Post" className="post-image" />

              <div className="post-actions">
                <button
                  className={`action-btn-nohover ${
                    post.likedBy && user && post.likedBy.includes(user.uid)
                      ? "liked"
                      : ""
                  }`}
                  onClick={() => handleLike(post.id)}
                  disabled
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                  {post.likes}
                </button>

                <button
                  className={`action-btn${
                    post.comments?.length === 0 ? "-nohover" : ""
                  }`}
                  onClick={() => toggleComments(post.id)}
                  disabled={post.comments?.length === 0}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21.99 4c0-1.1-.89-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.89 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
                  </svg>
                  {post.comments?.length || 0}
                </button>
              </div>

              <div className="post-caption">
                <span className="caption-username">{post.username}</span>
                <span className="caption-text">{post.caption}</span>
                <div className="post-timestamp">
                  {new Date(post.createdAt?.toDate()).toLocaleString()}
                </div>
              </div>

              {showComments[post.id] && (
                <div className="comments-section">
                  {post.comments?.map((comment, idx) => (
                    <div key={idx} className="comment">
                      <span className="comment-username">
                        {comment.username}:
                      </span>
                      <span className="comment-text">{comment.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="text-center text-muted mt-4">
        <h4>You're All Caught Up! 🔥</h4>
      </div>
    </div>
  );
}

export default Home;
