import React, { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { db } from "../firebase";
import imageCompression from "browser-image-compression";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
  updateDoc,
  increment,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

function AddPost({ isGroupPhoto = false, groupId = null, onSuccess = null }) {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [location, setLocation] = useState("");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (currentUser) {
        try {
          const docSnap = await getDoc(doc(db, "users", currentUser.uid));
          if (docSnap.exists()) {
            setProfileData(docSnap.data());
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        }
      }
      setLoading(false);
    };

    fetchProfileData();
  }, [currentUser]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const options = {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1080,
          useWebWorker: true,
          fileType: "image/jpeg",
        };

        console.log(`Original size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);

        const compressedFile = await imageCompression(file, options);
        setSelectedImage(compressedFile);

        console.log(
          `Compressed size: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`
        );

        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result);
        };
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        console.error("Error compressing image:", error);
        setSelectedImage(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedImage || !currentUser) return;

    setUploading(true);

    try {
      const storage = getStorage();
      const fileRef = ref(
        storage,
        isGroupPhoto
          ? `groupPhotos/${groupId}/${new Date().toISOString().split("T")[0]}/${
              currentUser.uid
            }_${Date.now()}.jpg`
          : `posts/${currentUser.uid}_${Date.now()}.jpg`
      );
      await uploadBytes(fileRef, selectedImage);
      const imageUrl = await getDownloadURL(fileRef);

      if (isGroupPhoto) {
        await addDoc(collection(db, "groupPhotos"), {
          groupId: groupId,
          userId: currentUser.uid,
          username: profileData.username,
          userPhotoURL: profileData.photoURL || "",
          imageUrl: imageUrl,
          location: location,
          caption: caption,
          date: new Date().toISOString().split("T")[0],
          uploadedAt: serverTimestamp(),
        });

        alert("Group photo posted successfully!");
        if (onSuccess) onSuccess();
      } else {
        await addDoc(collection(db, "posts"), {
          userId: currentUser.uid,
          username: profileData.username,
          userPhotoURL: profileData.photoURL || "",
          imageUrl: imageUrl,
          caption: caption,
          location: location,
          likes: 0,
          comments: [],
          createdAt: serverTimestamp(),
        });

        await updateDoc(doc(db, "users", currentUser.uid), {
          postsCount: increment(1),
        });

        alert("Post uploaded successfully!");
      }

      setSelectedImage(null);
      setPreviewUrl(null);
      setLocation("");
      setCaption("");
    } catch (error) {
      console.error("Error uploading post:", error);
      alert("Error uploading post");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="add-post-container">
      <div className="add-post-form">
        <form onSubmit={handleSubmit}>
          <div className="post-style-header">
            <div className="user-section">
              {profileData?.photoURL && (
                <img
                  src={profileData.photoURL}
                  alt="Profile"
                  className="post-avatar"
                />
              )}
              <div className="user-info">
                <h4 className="username">{profileData?.username}</h4>
                <input
                  className="location-input"
                  type="text"
                  placeholder="Add location..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="form-content">
            <div
              className={`image-upload-area ${previewUrl ? "has-image" : ""}`}
              onClick={() => document.getElementById("file-input").click()}
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="preview-image" />
              ) : (
                <div className="upload-placeholder">
                  <svg
                    viewBox="0 0 24 24"
                    width="48"
                    height="48"
                    fill="currentColor"
                    style={{ marginBottom: "1rem", color: "var(--text-muted)" }}
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
                  </svg>
                  <p>Click to add photo</p>
                </div>
              )}
            </div>

            <input
              id="file-input"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="file-input"
              capture="environment"
              required
            />

            {!isGroupPhoto && (
              <div>
                <div className="action-btn-addpost like-addpost">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                  {0}
                </div>

                <div className="action-btn-addpost">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21.99 4c0-1.1-.89-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.89 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
                  </svg>
                  {0}
                </div>
              </div>
            )}

            <div className="post-style-caption">
              <span className="caption-username">{profileData?.username}</span>
              <textarea
                name="caption"
                className="caption-input"
                placeholder="Write a caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows="1"
                required
              />
            </div>

            {!isGroupPhoto && (
              <div className="post-timestamp">
                {new Date().toLocaleString()}
              </div>
            )}

            <br />

            <button
              type="submit"
              className="btn-primary"
              disabled={uploading || !selectedImage || !caption}
            >
              {uploading
                ? "Uploading..."
                : isGroupPhoto
                ? "Post to Group"
                : "Share Post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddPost;
