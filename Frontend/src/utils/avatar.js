export function getAvatarUrl(avatarUrl, size = 200) {
  if (!avatarUrl) return null;

  try {
    const url = new URL(avatarUrl);

    if (!url.hostname.includes("res.cloudinary.com")) {
      return avatarUrl;
    }

    const uploadIndex = url.pathname.indexOf("/image/upload/");

    if (uploadIndex === -1) {
      return avatarUrl;
    }

    const transformation = `w_${size},h_${size},c_fill,g_face,q_auto,f_auto,dpr_auto`;

    url.pathname = url.pathname.replace(
      "/image/upload/",
      `/image/upload/${transformation}/`,
    );

    return url.toString();
  } catch {
    return avatarUrl;
  }
}
