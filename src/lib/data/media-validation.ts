export function validateMediaFile(file: Pick<File, "type" | "size">) {
  const image = file.type.startsWith("image/");
  const allowed = image
    ? ["image/jpeg", "image/png", "image/webp", "image/avif"]
    : ["video/mp4", "video/webm"];
  if (!allowed.includes(file.type) || file.size <= 0 || file.size > (image ? 10 : 50) * 1024 * 1024)
    throw new Error(
      image
        ? "Choisissez une image JPG, PNG, WebP ou AVIF de moins de 10 Mo."
        : "Choisissez une vidéo MP4 ou WebM de moins de 50 Mo.",
    );
}
export async function validateMediaUpload(file: File) {
  validateMediaFile(file);
  if (!file.type.startsWith("video/")) return;
  await new Promise<void>((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    let finished = false;
    const finish = (error?: string) => {
      if (finished) return;
      finished = true;
      video.onloadedmetadata = null;
      video.onerror = null;
      clearTimeout(timer);
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
      if (error) reject(new Error(error));
      else resolve();
    };
    const timer = setTimeout(
      () => finish("La vidéo ne peut pas être lue. Choisissez un autre fichier."),
      10000,
    );
    video.preload = "metadata";
    video.onloadedmetadata = () =>
      finish(
        !Number.isFinite(video.duration) || video.duration > 90
          ? "La vidéo de présentation doit durer au maximum 90 secondes."
          : undefined,
      );
    video.onerror = () => finish("Cette vidéo ne peut pas être lue par le navigateur.");
    video.src = url;
  });
}
