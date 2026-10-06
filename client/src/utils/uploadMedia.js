const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_OTHER_SIZE = 10 * 1024 * 1024;  // 10MB

export async function uploadMedia(file) {
  const isVideo = file.type.startsWith("video");
  const limit = isVideo ? MAX_VIDEO_SIZE : MAX_OTHER_SIZE;

  if (file.size > limit) {
    const limitMB = isVideo ? "100MB" : "10MB";
    throw new Error(`File exceeds the ${limitMB} limit`);
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "Amrin_chat");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/wwebz56i/auto/upload`,
    { method: "POST", body: formData }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || "Failed to upload file to Cloudinary");
  }
  const data = await res.json();
  if (!data.secure_url) {
    throw new Error(data.error?.message || "Upload failed: no secure URL returned");
  }
  return { url: data.secure_url, publicId: data.public_id };
}