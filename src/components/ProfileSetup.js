import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const ProfileSetup = () => {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [profilePic, setProfilePic] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = getAuth().currentUser;
        if (user) {
          const userRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(userRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUsername(data.username || "");
            setDisplayName(data.displayName || "");
            setBio(data.bio || "");
            setPreviewUrl(data.photoURL || "");
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setUploading(true);

    const user = getAuth().currentUser;

    if (!user) {
      setError("No authenticated user.");
      setUploading(false);
      return;
    }
    const userId = getAuth().currentUser.uid;

    try {
      let photoURL = previewUrl;

      if (profilePic) {
        const storage = getStorage();
        const fileRef = ref(storage, `profilePics/${userId}.jpg`);
        await uploadBytes(fileRef, profilePic);
        photoURL = await getDownloadURL(fileRef);
        console.log("Profile picture uploaded:", photoURL);
      }

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        username: username,
        displayName: displayName,
        bio: bio || "",
        photoURL: photoURL || "No Photo URL",
      });

      alert("Profile updated successfully!");
      setProfilePic(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading profile data...</div>;
  }

  return (
    <div className="profile-setup-layout">
      <div className="profile-setup-container">
        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit} className="profile-setup-form">
          <div className="profile-form-layout">
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

            <div className="profile-inputs">
              <div className="form-group-profilesetup">
                <label className="form-label">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
                  </svg>
                  Username
                </label>
                <input
                  type="text"
                  className="form-input"
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username (lowercase only)"
                  pattern="[a-z0-9_]*"
                  title="Username must be lowercase letters, numbers, or underscores"
                  value={username}
                  autocapitalize="none"
                  autocorrect="off"
                  spellcheck="false"
                  required
                />
                <span className="input-hint">
                  Only lowercase letters, numbers, and underscores
                </span>
              </div>

              <div className="form-group-profilesetup">
                <label className="form-label">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20,19V7H4V19H20M20,3A2,2 0 0,1 22,5V19A2,2 0 0,1 20,21H4A2,2 0 0,1 2,19V5C2,3.89 2.9,3 4,3H20Z" />
                  </svg>
                  Display Name
                </label>
                <input
                  type="text"
                  className="form-input"
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Display Name"
                  value={displayName}
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-group-profilesetup">
            <label className="form-label">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
              </svg>
              Bio
            </label>
            <textarea
              className="form-textarea"
              onChange={(e) => setBio(e.target.value)}
              placeholder="Bio"
              value={bio}
              rows={4}
              maxLength={200}
            />
            <span className="input-hint">{bio.length}/200 characters</span>
          </div>

          <button
            type="submit"
            className="btn-primary save-btn"
            disabled={uploading}
          >
            {uploading ? <>Saving...</> : <>Save Profile</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileSetup;
