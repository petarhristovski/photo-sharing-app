import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { getAuth } from "firebase/auth";
import {
  addDoc,
  doc,
  getDoc,
  updateDoc,
  collection,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

function Messages() {
  const navigate = useNavigate();

  const [showNewGroup, setShowNewGroup] = useState(false);
  const [userData, setUserData] = useState(null);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(true);

  const [userGroups, setUserGroups] = useState([]);

  const [profilePic, setProfilePic] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [groupName, setGroupName] = useState("");
  const [selectedFriends, setSelectedFriends] = useState([]);

  useEffect(() => {
    const fetchUserDataAndFriends = async () => {
      try {
        const user = getAuth().currentUser;
        if (user) {
          const userRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(userRef);

          if (docSnap.exists()) {
            const userData = docSnap.data();
            setUserData(userData);

            if (userData.friends && userData.friends.length > 0) {
              const friendsData = await Promise.all(
                userData.friends.map(async (friendUid) => {
                  const friendRef = doc(db, "users", friendUid);
                  const friendDoc = await getDoc(friendRef);
                  if (friendDoc.exists()) {
                    return {
                      uid: friendUid,
                      username: friendDoc.data().username,
                      photoURL: friendDoc.data().photoURL || "",
                    };
                  }
                  return null;
                })
              );

              setFriends(friendsData.filter((friend) => friend !== null));
            }
          } else {
            console.log("No such document!");
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDataAndFriends();
  }, []);

  useEffect(() => {
    const fetchUserGroups = async () => {
      try {
        const user = getAuth().currentUser;
        if (user) {
          const groupsRef = collection(db, "groups");
          const q = query(
            groupsRef,
            where("members", "array-contains", user.uid)
          );
          const querySnapshot = await getDocs(q);

          const groups = [];
          querySnapshot.forEach((doc) => {
            groups.push({
              id: doc.id,
              ...doc.data(),
            });
          });

          setUserGroups(groups);
        }
      } catch (error) {
        console.error("Error fetching groups:", error);
      } finally {
        setGroupsLoading(false);
      }
    };

    fetchUserGroups();
  }, []);

  const handleFriendToggle = (friendUid) => {
    setSelectedFriends((prev) =>
      prev.includes(friendUid)
        ? prev.filter((uid) => uid !== friendUid)
        : [...prev, friendUid]
    );
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxWidth = 300;
          const maxHeight = 300;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              setProfilePic(blob);

              setPreviewUrl(URL.createObjectURL(blob));
            },
            "image/jpeg",
            0.7
          );
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();

    if (!groupName.trim()) {
      alert("Please enter a group name");
      return;
    }

    if (selectedFriends.length === 0) {
      alert("Please select at least one friend");
      return;
    }

    setCreating(true);
    try {
      const user = getAuth().currentUser;

      let photoURL = null;

      const groupDocRef = await addDoc(collection(db, "groups"), {
        name: groupName,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        members: [user.uid, ...selectedFriends],
        groupPhotoURL: null,
        currentStreak: 0,
        todayStreak: false,
      });

      if (profilePic) {
        const storage = getStorage();
        const fileRef = ref(storage, `groupProfilePics/${groupDocRef.id}.jpg`);
        await uploadBytes(fileRef, profilePic);
        photoURL = await getDownloadURL(fileRef);

        await updateDoc(groupDocRef, {
          groupPhotoURL: photoURL,
        });

        console.log("Profile picture uploaded:", photoURL);
      }

      setGroupName("");
      setSelectedFriends([]);
      setShowNewGroup(false);

      const groupsRef = collection(db, "groups");
      const q = query(groupsRef, where("members", "array-contains", user.uid));
      const querySnapshot = await getDocs(q);
      const groups = [];
      querySnapshot.forEach((doc) => {
        groups.push({ id: doc.id, ...doc.data() });
      });
      setUserGroups(groups);

      alert("Group created successfully!");
    } catch (error) {
      console.error("Error creating group:", error);
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="messages-layout">
      <div className="groups-main">
        <div className="messages-header">
          <div className="header-content">
            <button
              className="btn-primary new-group-btn mobile-only mb-3"
              onClick={() => setShowNewGroup(!showNewGroup)}
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
            </button>
            <h2 className="page-title">Groups and Streaks</h2>
            <p className="page-subtitle">
              Share moments and build lasting streaks
            </p>
          </div>

          <button
            className="btn-primary new-group-btn desktop-only"
            onClick={() => setShowNewGroup(!showNewGroup)}
          >
            {showNewGroup ? "Cancel" : "New Group"}
          </button>
        </div>

        <div className="groups-content">
          {groupsLoading ? (
            <div className="loading">Loading groups...</div>
          ) : userGroups && userGroups.length > 0 ? (
            <div className="groups-grid">
              {userGroups.map((group) => (
                <div
                  key={group.id}
                  className="group-card"
                  onClick={() => navigate(`/groups/${group.id}`)}
                >
                  <div className="group-icon">
                    {group.groupPhotoURL ? (
                      <img src={group.groupPhotoURL} alt={group.name} />
                    ) : (
                      <img
                        src="https://png.pngtree.com/png-vector/20191024/ourlarge/pngtree-team-icon-isolated-on-abstract-background-png-image_1855162.jpg"
                        alt={group.name}
                      />
                    )}
                  </div>

                  <div className="group-info">
                    <h4 className="group-name">{group.name}</h4>
                    <p className="group-members">
                      {group.members.length} members
                    </p>

                    <div className="group-streak">
                      {group.currentStreak > 0 ? (
                        <span className="streak-active">
                          🔥 {group.currentStreak} day streak
                        </span>
                      ) : (
                        <span className="streak-inactive">
                          No active streak
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="group-arrow">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-groups-state">
              <div className="empty-groups-icon">
                <img
                  width={100}
                  height={100}
                  style={{ borderRadius: "50%" }}
                  src="https://png.pngtree.com/png-vector/20191024/ourlarge/pngtree-team-icon-isolated-on-abstract-background-png-image_1855162.jpg"
                  alt={" "}
                />
              </div>
              <h3>No Groups Yet</h3>
              <p>
                Create your first group to start sharing photos and building
                streaks with friends!
              </p>
            </div>
          )}
        </div>
      </div>

      <div className={`new-group-sidebar ${showNewGroup ? "active" : ""}`}>
        <div className="sidebar-content">
          <div className="sidebar-header">
            <h3>Create New Group</h3>
            <button
              className="close-btn"
              onClick={() => setShowNewGroup(false)}
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleCreateGroup} className="new-group-form">
            <div className="profile-pic-circle">
              <div
                className="circle-container"
                onClick={() =>
                  document.getElementById("profilePicInput").click()
                }
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Profile preview"
                    className="profile-pic-preview"
                  />
                ) : (
                  <div className="upload-placeholder">
                    <svg
                      viewBox="0 0 24 24"
                      width="48"
                      height="48"
                      fill="currentColor"
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
                    </svg>
                    <span>Add Photo</span>
                  </div>
                )}
              </div>
              <input
                id="profilePicInput"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="file-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Group Name</label>
              <input
                className="form-input"
                type="text"
                placeholder="Enter group name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Add Friends</label>
              <div className="friends-list">
                {friends && friends.length > 0 ? (
                  friends.map((friend) => (
                    <div
                      key={friend.uid}
                      className="friend-item"
                      onClick={() => handleFriendToggle(friend.uid)}
                    >
                      <div className="friend-info">
                        {friend.photoURL && (
                          <img
                            src={friend.photoURL}
                            alt={friend.username}
                            className="friend-avatar"
                          />
                        )}
                        <span className="friend-name">{friend.username}</span>
                      </div>

                      <div className="custom-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedFriends.includes(friend.uid)}
                          readOnly
                        />
                        <span className="checkmark"></span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-friends">
                    <p>No friends found. Add friends to create groups!</p>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary submit-btn"
              disabled={
                creating ||
                !groupName.trim() ||
                selectedFriends.length === 0 ||
                !previewUrl
              }
            >
              {creating ? (
                <>Creating...</>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                  </svg>
                  Create Group
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {showNewGroup && (
        <div
          className="sidebar-overlay mobile-only"
          onClick={() => setShowNewGroup(false)}
        ></div>
      )}
    </div>
  );
}

export default Messages;
