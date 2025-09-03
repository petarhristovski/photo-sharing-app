import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  query,
  orderBy,
  where,
  getDocs,
  collection,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { getAuth, signOut } from "firebase/auth";
import { getStorage, ref, deleteObject } from "firebase/storage";

function Profile() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const auth = getAuth();
  const currentUser = auth.currentUser;

  const [profileData, setProfileData] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFriend, setIsFriend] = useState(false);
  const [friendRequests, setFriendRequests] = useState([]);
  const [friendsProfiles, setFriendsProfiles] = useState([]);
  const [requestSent, setRequestSent] = useState(false);
  const [showAllFriends, setShowAllFriends] = useState(false);

  const [userPosts, setUserPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);

  const fetchFriendsProfiles = async (friendUids) => {
    if (!friendUids || friendUids.length === 0) {
      setFriendsProfiles([]);
      return;
    }
    try {
      const profiles = await Promise.all(
        friendUids.map(async (uid) => {
          const docSnap = await getDoc(doc(db, "users", uid));
          if (docSnap.exists()) {
            return { id: uid, ...docSnap.data() };
          } else {
            return null;
          }
        })
      );
      setFriendsProfiles(profiles.filter(Boolean));
    } catch (err) {
      console.error("Error fetching friends' profiles:", err);
    }
  };

  const fetchUserPosts = async (targetUserId) => {
    try {
      setPostsLoading(true);
      const postsRef = collection(db, "posts");
      const q = query(postsRef, where("userId", "==", targetUserId));
      const querySnapshot = await getDocs(q);

      const posts = [];
      querySnapshot.forEach((doc) => {
        posts.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      posts.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return b.createdAt.toDate() - a.createdAt.toDate();
      });

      setUserPosts(posts);
      setPostsLoading(false);
    } catch (err) {
      console.error("Error fetching user posts:", err);
    } finally {
      setPostsLoading(false);
    }
  };

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const targetUserId = userId || currentUser.uid;
        const userDocRef = doc(db, "users", targetUserId);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          setProfileData({
            ...userDocSnap.data(),
            id: targetUserId,
          });

          const friends = userDocSnap.data().friends || [];

          const currentUserDoc = await getDoc(
            doc(db, "users", currentUser.uid)
          );
          if (currentUserDoc.exists()) {
            setCurrentUserData(currentUserDoc.data());

            if (userId) {
              const friends = currentUserDoc.data()?.friends || [];
              setIsFriend(friends.includes(userId));

              const targetUserRequests =
                userDocSnap.data().friendRequests || [];
              const alreadySent = targetUserRequests.some(
                (req) => req.userId === currentUser.uid
              );
              setRequestSent(alreadySent);
            }
          }

          await fetchFriendsProfiles(friends);

          await fetchUserPosts(targetUserId);

          if (!userId) {
            setFriendRequests(userDocSnap.data().friendRequests || []);
          }
        }
      } catch (err) {
        setError("Error loading profile");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [userId, currentUser]);

  const handleAcceptFriend = async (requesterId) => {
    try {
      const currentUserRef = doc(db, "users", currentUser.uid);
      await updateDoc(currentUserRef, {
        friends: arrayUnion(requesterId),
        friendRequests: friendRequests.filter(
          (req) => req.userId !== requesterId
        ),
      });

      const requesterRef = doc(db, "users", requesterId);
      await updateDoc(requesterRef, {
        friends: arrayUnion(currentUser.uid),
      });

      setFriendRequests((prev) =>
        prev.filter((req) => req.userId !== requesterId)
      );

      const updatedFriends = [...(currentUserData.friends || []), requesterId];
      setCurrentUserData((prev) => ({
        ...prev,
        friends: updatedFriends,
      }));

      await fetchFriendsProfiles(updatedFriends);

      setIsFriend(true);
    } catch (err) {
      setError("Error accepting friend request");
      console.error(err);
    }
  };

  const handleSendFriendRequest = async () => {
    try {
      const targetUserRef = doc(db, "users", profileData.id);
      await updateDoc(targetUserRef, {
        friendRequests: arrayUnion({
          userId: currentUser.uid,
          username: currentUserData.username,
          timestamp: new Date().toISOString(),
        }),
      });

      setRequestSent(true);
      alert("Friend request sent!");
    } catch (err) {
      setError("Error sending friend request");
      console.error(err);
    }
  };

  const handleRemovePost = async (postId) => {
    try {
      if (!window.confirm("Are you sure you want to delete this post?")) {
        return;
      }

      const post = userPosts.find((p) => p.id === postId);
      if (!post) {
        alert("Post not found");
        return;
      }

      if (post.imageUrl) {
        try {
          const storage = getStorage();
          const imageRef = ref(storage, post.imageUrl);
          await deleteObject(imageRef);
          console.log("Image deleted from storage");
        } catch (storageError) {
          console.error("Error deleting image from storage:", storageError);
        }
      }

      await deleteDoc(doc(db, "posts", postId));

      setUserPosts((prev) => prev.filter((p) => p.id !== postId));

      alert("Post deleted successfully!");
    } catch (error) {
      console.error("Error deleting post:", error);
      alert("Error deleting post. Please try again.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!profileData) return <div>Profile not found</div>;

  const isOwnProfile = !userId || userId === currentUser.uid;

  return (
    <div className="profile-layout">
      <div className="profile-container">
        <div className="profile-header-section">
          <div className="profile-info-card">
            {isOwnProfile && (
              <button
                className="logout-btn"
                onClick={handleLogout}
                title="Logout"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
                </svg>
              </button>
            )}
            <div className="profile-avatar-section">
              <div className="profile-avatar-container">
                <img
                  src={
                    profileData.photoURL || "https://via.placeholder.com/120"
                  }
                  alt="Profile"
                  className="profile-avatar"
                />
              </div>

              <div className="profile-details">
                <h2 className="profile-username">{profileData.username}</h2>
                <p className="profile-displayname">{profileData.displayName}</p>

                <div className="profile-actions">
                  {isOwnProfile ? (
                    <button
                      className="btn-secondary edit-profile-btn"
                      onClick={() => navigate("/profile-setup")}
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                      </svg>
                      Edit Profile
                    </button>
                  ) : (
                    <div className="friend-status-actions">
                      {isFriend ? (
                        <button className="btn-secondary friends-btn" disabled>
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                          </svg>
                          Friends
                        </button>
                      ) : requestSent ? (
                        <button
                          className="btn-secondary request-sent-btn"
                          disabled
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-5-5 1.41-1.41L9 14.17l7.59-7.59L18 8l-8 8z" />
                          </svg>
                          Request Sent
                        </button>
                      ) : (
                        <button
                          className="btn-primary add-friend-btn"
                          onClick={handleSendFriendRequest}
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                          </svg>
                          Add Friend
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="profile-bio-section">
              <h4 className="bio-title">About</h4>
              <p className="profile-bio">
                {profileData.bio ||
                  (isOwnProfile
                    ? "Add a bio to tell people about yourself..."
                    : "No bio available")}
              </p>
            </div>
          </div>

          <div
            className={`friends-card ${
              !isOwnProfile && !isFriend ? "blurred-content" : ""
            }`}
          >
            <div className="friends-header">
              <h3 className="friends-title">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  fill="currentColor"
                  viewBox="0 0 256 256"
                >
                  <path d="M83.19,174.4a8,8,0,0,0,11.21-1.6,52,52,0,0,1,83.2,0,8,8,0,1,0,12.8-9.6A67.88,67.88,0,0,0,163,141.51a40,40,0,1,0-53.94,0A67.88,67.88,0,0,0,81.6,163.2,8,8,0,0,0,83.19,174.4ZM112,112a24,24,0,1,1,24,24A24,24,0,0,1,112,112Zm96-88H64A16,16,0,0,0,48,40V64H32a8,8,0,0,0,0,16H48v40H32a8,8,0,0,0,0,16H48v40H32a8,8,0,0,0,0,16H48v24a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V40A16,16,0,0,0,208,24Zm0,192H64V40H208Z"></path>
                </svg>
                Friends ({friendsProfiles.length})
              </h3>
            </div>

            {(isOwnProfile || isFriend) && friendsProfiles.length > 0 ? (
              <div className="friends-preview">
                <div className="friends-list-preview">
                  {friendsProfiles
                    .slice(0, showAllFriends ? friendsProfiles.length : 3)
                    .map((friend) => (
                      <div
                        key={friend.id}
                        className="friend-preview-item"
                        onClick={() => navigate(`/profile/${friend.id}`)}
                      >
                        <img
                          src={
                            friend.photoURL || "https://via.placeholder.com/48"
                          }
                          alt={friend.username}
                          className="friend-preview-avatar"
                        />
                        <div className="friend-preview-info">
                          <h5 className="friend-preview-username">
                            {friend.username}
                          </h5>
                          <p className="friend-preview-displayname">
                            {friend.displayName}
                          </p>
                        </div>
                        <svg
                          className="friend-preview-arrow"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                        </svg>
                      </div>
                    ))}
                </div>

                {friendsProfiles.length > 3 && (
                  <button
                    className="view-more-friends-btn"
                    onClick={() => setShowAllFriends(!showAllFriends)}
                  >
                    View All {friendsProfiles.length} Friends
                  </button>
                )}
              </div>
            ) : (
              <div className="friends-empty-state">
                <div className="friends-empty-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A1.5 1.5 0 0 0 18.54 8H16c-.8 0-1.54.37-2 1l-3 4v6h2v7h3v-7h4z" />
                  </svg>
                </div>
                <h4>No Friends Yet</h4>
                <p>
                  {isOwnProfile
                    ? "Start connecting with other users!"
                    : !isFriend
                    ? "Add them as a friend to see their connections"
                    : "This user hasn't added any friends yet"}
                </p>
              </div>
            )}
          </div>
        </div>

        {isOwnProfile && friendRequests.length > 0 && (
          <div className="friend-requests-section">
            <div className="friend-requests-header">
              <h3 className="requests-title">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                </svg>
                Friend Requests ({friendRequests.length})
              </h3>
            </div>

            <div className="friend-requests-grid">
              {friendRequests.map((request) => (
                <div key={request.userId} className="friend-request-card">
                  <div className="request-user-info">
                    <div className="request-avatar-placeholder">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                      </svg>
                    </div>
                    <span className="request-username">{request.username}</span>
                  </div>

                  <button
                    className="btn-primary accept-request-btn"
                    onClick={() => handleAcceptFriend(request.userId)}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                    Accept
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div
          className={`user-posts-section ${
            !isOwnProfile && !isFriend ? "blurred-content" : ""
          }`}
        >
          <div className="posts-header">
            <h3 className="posts-title">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
              </svg>
              {isOwnProfile ? "Your Posts" : `${profileData.username}'s Posts`}{" "}
              ({userPosts.length})
            </h3>
          </div>

          {isOwnProfile || isFriend ? (
            postsLoading ? (
              <div className="posts-loading">
                <div className="loading-spinner"></div>
                <p>Loading posts...</p>
              </div>
            ) : userPosts.length === 0 ? (
              <div className="posts-empty-state">
                <div className="posts-empty-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                  </svg>
                </div>
                <h4>No Posts Yet</h4>
                <p>
                  {isOwnProfile
                    ? "Start sharing your moments with the world!"
                    : `${profileData.username} hasn't shared any posts yet.`}
                </p>
              </div>
            ) : (
              <div className="posts-feed">
                {userPosts.map((post) => (
                  <div key={post.id} className="profile-post-card">
                    <div className="post-header">
                      <div className="post-user-section">
                        <img
                          src={
                            profileData.photoURL ||
                            "https://via.placeholder.com/40"
                          }
                          alt={profileData.username}
                          className="post-avatar"
                        />
                        <div className="post-user-info">
                          <h4>{profileData.username}</h4>
                          <p className="post-location">{post.location}</p>
                        </div>
                      </div>

                      {isOwnProfile && (
                        <div className="post-actions-menu">
                          <button
                            className="delete-post-btn"
                            onClick={() => handleRemovePost(post.id)}
                            title="Delete Post"
                          >
                            <svg viewBox="0 0 24 24" fill="currentColor">
                              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>

                    <img
                      src={post.imageUrl}
                      alt="Post"
                      className="post-image"
                    />

                    <div className="post-stats">
                      <div className="stats-left">
                        <span className="stat-item">
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                          </svg>
                          {post.likes || 0} likes
                        </span>
                        <span className="stat-item">
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M21.99 4c0-1.1-.89-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z" />
                          </svg>
                          {post.comments?.length || 0} comments
                        </span>
                      </div>
                    </div>

                    {post.caption && (
                      <div className="profile-post-caption">
                        <span className="caption-username">
                          {profileData.username}
                        </span>
                        <span className="caption-text">{post.caption}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="posts-restricted">
              <div className="restricted-icon">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z" />
                </svg>
              </div>
              <h4>Posts are Private</h4>
              <p>Add {profileData.username} as a friend to see their posts</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;
