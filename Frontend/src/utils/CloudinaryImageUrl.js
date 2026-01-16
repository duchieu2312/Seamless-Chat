export function getCloudinaryImageUrl(imageUrl, size = 200) {
  if (!imageUrl) return null;

  try {
    const url = new URL(imageUrl);

    if (!url.hostname.includes("res.cloudinary.com")) {
      return imageUrl;
    }

    const uploadIndex = url.pathname.indexOf("/image/upload/");

    if (uploadIndex === -1) {
      return imageUrl;
    }

    const transformation = `w_${size},h_${size},c_fill,g_face,q_auto,f_auto,dpr_auto`;

    url.pathname = url.pathname.replace(
      "/image/upload/",
      `/image/upload/${transformation}/`,
    );

    return url.toString();
  } catch {
    return imageUrl;
  }
}
