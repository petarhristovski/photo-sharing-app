import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { getAuth } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  serverTimestamp,
  updateDoc,
  increment,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import AddPost from "./AddPost";

function GroupPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [groupData, setGroupData] = useState(null);
  const [members, setMembers] = useState([]);
  const [todayPhotos, setTodayPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasPostedToday, setHasPostedToday] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [memberPosted, setMemberPosted] = useState({});

  const [showEditGroup, setShowEditGroup] = useState(false);
  const [profilePic, setProfilePic] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [groupName, setGroupName] = useState("");
  const [creating, setCreating] = useState(false);

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

  const handleEditGroup = async (e) => {
    e.preventDefault();

    if (!groupName.trim()) {
      alert("Please enter a group name");
      return;
    }

    setCreating(true);
    try {
      const user = getAuth().currentUser;

      let photoURL = groupData.groupPhotoURL;

      if (profilePic) {
        const storage = getStorage();
        const fileRef = ref(storage, `groupProfilePics/${groupId}.jpg`);
        await uploadBytes(fileRef, profilePic);
        photoURL = await getDownloadURL(fileRef);
        console.log("Group rofile picture updated:", photoURL);
      }

      await updateDoc(doc(db, "groups", groupId), {
        name: groupName,
        groupPhotoURL: photoURL,
      });

      setGroupData((prev) => ({
        ...prev,
        name: groupName,
        groupPhotoURL: photoURL,
      }));

      setGroupName("");
      setProfilePic(null);
      setShowEditGroup(false);

      alert("Group updated successfully!");
    } catch (error) {
      console.error("Error editing group:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleEditGroupCancel = () => {
    setGroupName(groupData.name);
    setPreviewUrl(groupData.groupPhotoURL);
    setProfilePic(null);
    setShowEditGroup(false);
  };

  const handlePhotoPostSuccess = async () => {
    setShowPhotoUpload(false);
    setHasPostedToday(true);

    const currentUserId = getAuth().currentUser.uid;
    const updatedMemberPosted = {
      ...memberPosted,
      [currentUserId]: true,
    };
    setMemberPosted(updatedMemberPosted);

    const allMembersPosted = members.every(
      (member) => updatedMemberPosted[member.id] === true
    );

    console.log("All members posted?", allMembersPosted);
    console.log("Updated member status:", updatedMemberPosted);

    if (allMembersPosted && members.length > 0) {
      try {
        const newStreak = (groupData.currentStreak || 0) + 1;

        const groupRef = doc(db, "groups", groupId);
        await updateDoc(groupRef, {
          currentStreak: newStreak,
          todayStreak: true,
        });

        setGroupData((prev) => ({
          ...prev,
          currentStreak: newStreak,
        }));

        alert(
          `Amazing! Everyone posted today! Streak is now ${newStreak} days!`
        );
        console.log(`Streak updated to ${newStreak} days!`);
      } catch (error) {
        console.error("Error updating streak:", error);
      }
    }
    await fetchGroupData();
  };

  const fetchGroupData = async () => {
    try {
      const user = getAuth().currentUser;
      if (!user) return;

      const groupRef = doc(db, "groups", groupId);
      const groupSnap = await getDoc(groupRef);
      if (groupSnap.exists()) {
        const group = groupSnap.data();

        setPreviewUrl(group.groupPhotoURL || null);

        setGroupName(group.name || "");

        setGroupData(group);
        const memberPromises = group.members.map(async (memberId) => {
          const memberDoc = await getDoc(doc(db, "users", memberId));
          return {
            id: memberId,
            ...memberDoc.data(),
          };
        });
        const memberData = await Promise.all(memberPromises);
        setMembers(memberData);

        const today = new Date().toISOString().split("T")[0];
        const photosRef = collection(db, "groupPhotos");
        const q = query(
          photosRef,
          where("groupId", "==", groupId),
          where("date", "==", today)
        );

        const photoSnap = await getDocs(q);
        const photos = [];
        let userPostedToday = false;
        photoSnap.forEach((doc) => {
          const photoData = { id: doc.id, ...doc.data() };
          photos.push(photoData);
          if (photoData.userId === user.uid) {
            userPostedToday = true;
          }
        });

        photos.sort((a, b) => {
          if (!a.uploadedAt || !b.uploadedAt) return 0;
          return b.uploadedAt.toDate() - a.uploadedAt.toDate();
        });

        setTodayPhotos(photos);
        setHasPostedToday(userPostedToday);

        const memberPostingStatus = {};
        memberData.forEach((member) => {
          memberPostingStatus[member.id] = photos.some(
            (photo) => photo.userId === member.id
          );
        });
        setMemberPosted(memberPostingStatus);

        console.log("Member posting status:", memberPostingStatus);
      } else {
        console.error("No such group!");
      }
    } catch (error) {
      console.error("Error fetching group data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupData();
  }, [groupId]);

  const getUsersWhoHaventPosted = () => {
    return members.filter((member) => !memberPosted[member.id]);
  };

  const handleLeaveGroup = async () => {
    const confirmLeave = window.confirm(
      `Are you sure you want to leave "${groupData.name}"? This action cannot be undone.`
    );

    if (!confirmLeave) return;

    try {
      const user = getAuth().currentUser;

      const updatedMembers = groupData.members.filter(
        (memberId) => memberId !== user.uid
      );

      if (updatedMembers.length === 1) {
        await deleteDoc(doc(db, "groups", groupId));
        alert(`Group "${groupData.name}" has been deleted.`);
        navigate("/messages");
      } else {
        await updateDoc(doc(db, "groups", groupId), {
          members: updatedMembers,
        });

        const allMembersPosted = updatedMembers.every(
          (memberId) => memberPosted[memberId] === true
        );

        if (allMembersPosted && !groupData.todayStreak) {
          await updateDoc(doc(db, "groups", groupId), {
            currentStreak: increment(1),
            todayStreak: true,
          });
        }

        navigate("/messages");
      }
    } catch (error) {
      console.error("Error leaving group:", error);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="group-page-layout">
      <div className="members-sidebar">
        <div className="group-header">
          <button className="back-btn" onClick={() => navigate("/messages")}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
          </button>

          <button
            className="edit-btn"
            onClick={() => setShowEditGroup(!showEditGroup)}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
            </svg>
          </button>

          <div className="group-info-header">
            <img
              src={groupData.groupPhotoURL}
              alt="Group"
              className="group-avatar"
            />
            <h2 className="group-title">{groupData.name}</h2>
            <p className="group-subtitle">{members.length} members</p>
          </div>
        </div>

        <div className="streak-display-card">
          {groupData.currentStreak > 0 ? (
            <div className="streak-active-display">
              <div className="streak-number">{groupData.currentStreak}</div>
              <div className="streak-label">
                <span className="fire-emoji">🔥</span>
                Day Streak
              </div>
            </div>
          ) : (
            <div className="streak-inactive-display">
              <div className="streak-icon">📸</div>
              <div className="streak-message">
                <h4>Start Your Streak!</h4>
                <p>Everyone needs to post daily</p>
              </div>
            </div>
          )}
        </div>

        <div className="members-section">
          <h3 className="members-title">Members Post Status</h3>

          <div className="members-list">
            {members.map((member) => (
              <div
                key={member.id}
                className={`member-card ${
                  memberPosted[member.id] ? "posted" : "pending"
                }`}
              >
                <div className="member-avatar-container">
                  <img
                    src={member.photoURL || "https://via.placeholder.com/40"}
                    alt={member.username}
                    className="member-avatar"
                  />
                </div>

                <div className="member-info">
                  <h4 className="member-name">
                    {member.username}
                    {memberPosted[member.id] ? " ✅" : " ⏳"}
                  </h4>
                  <p className="member-display-name">{member.displayName}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="status-summary">
            {Object.values(memberPosted).every(Boolean) &&
            members.length > 0 ? (
              <div className="status-complete">
                <span className="status-icon">✅</span>
                <span>Everyone posted today!</span>
              </div>
            ) : (
              <div className="status-waiting">
                <span className="status-icon">⏳</span>
                {(() => {
                  const usersWhoHaventPosted = getUsersWhoHaventPosted();
                  const count = usersWhoHaventPosted.length;

                  if (count === 0) return null;

                  const usernames = usersWhoHaventPosted.map(
                    (user) => user.username
                  );

                  if (count <= 3)
                    return (
                      <span>
                        We're waiting on you{" "}
                        <strong>
                          {count === 1
                            ? usernames[0]
                            : count === 2
                            ? usernames.join(" and ")
                            : `${usernames.slice(0, -1).join(", ")} and ${
                                usernames[usernames.length - 1]
                              }`}
                        </strong>
                        !
                      </span>
                    );
                  else {
                    return (
                      <span>
                        Waiting on {getUsersWhoHaventPosted().length} member
                        {getUsersWhoHaventPosted().length !== 1 ? "s" : ""}
                      </span>
                    );
                  }
                })()}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="group-feed">
        {!hasPostedToday && (
          <div className="post-prompt-card">
            <div className="prompt-icon">📸</div>
            <div className="prompt-content">
              <h3>You haven't posted your daily photo!</h3>
              <p>Share your moment to keep the streak alive</p>
              {!showPhotoUpload ? (
                <button
                  className="btn-primary prompt-btn"
                  onClick={() => setShowPhotoUpload(true)}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
                  </svg>
                  Post Photo
                </button>
              ) : (
                <button
                  className="btn-secondary prompt-btn"
                  onClick={() => setShowPhotoUpload(false)}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                  </svg>
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}

        {showPhotoUpload && (
          <div className="add-post-section">
            <AddPost
              isGroupPhoto={true}
              groupId={groupId}
              onSuccess={handlePhotoPostSuccess}
            />
          </div>
        )}

        <div className="photos-feed">
          <div className="feed-header">
            <h3>Today's Photos</h3>
            <span className="photo-count">
              {todayPhotos.length} photo{todayPhotos.length !== 1 ? "s" : ""}
            </span>
          </div>

          {todayPhotos && todayPhotos.length > 0 ? (
            <div className="photos-grid">
              {todayPhotos.map((photo) => (
                <div key={photo.id} className="photo-card">
                  <div className="photo-header">
                    <img
                      src={photo.userPhotoURL}
                      alt="User"
                      className="photo-user-avatar"
                    />
                    <div className="photo-user-info">
                      <h4>{photo.username}</h4>
                      <p>{photo.location}</p>
                    </div>
                  </div>

                  <img
                    src={photo.imageUrl}
                    alt={photo.caption}
                    className="photo-image"
                  />

                  {photo.caption && (
                    <div className="photo-caption">
                      <span className="caption-username">{photo.username}</span>
                      <span className="caption-text">{photo.caption}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-feed">
              <div className="empty-feed-icon">📷</div>
              <h4>No photos yet today</h4>
              <p>Be the first to share your daily moment!</p>
            </div>
          )}
        </div>
      </div>

      <div className={`new-group-sidebar ${showEditGroup ? "active" : ""}`}>
        <div className="sidebar-content">
          <div className="sidebar-header">
            <h3>Edit Group</h3>
            <button className="close-btn" onClick={handleEditGroupCancel}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleEditGroup} className="new-group-form">
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
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
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

            <button
              type="submit"
              className="btn-primary submit-btn"
              disabled={
                creating ||
                !groupName.trim() ||
                (groupName === groupData.name && !profilePic)
              }
            >
              {creating ? <>Updating...</> : <>Save Changes</>}
            </button>

            <button
              type="button"
              className="leave-group-btn"
              onClick={handleLeaveGroup}
              disabled={creating}
            >
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.59L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
              </svg>
              Leave Group
            </button>
          </form>
        </div>
      </div>

      {showEditGroup && (
        <div
          className="sidebar-overlay mobile-only"
          onClick={() => setShowEditGroup(false)}
        ></div>
      )}
    </div>
  );
}

export default GroupPage;
