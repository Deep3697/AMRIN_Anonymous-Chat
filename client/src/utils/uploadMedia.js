export async function uploadMedia(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "Amrin_chat");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/wwebz56i/auto/upload`,
    { method: "POST", body: formData }
  );
  const data = await res.json();
  return { url: data.secure_url, publicId: data.public_id };
}