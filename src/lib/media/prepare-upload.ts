import { validateMediaFile } from "@/lib/data/media-validation";
import type { UploadPreparation, VideoMetadata } from "./video-policy";
const metadata = new WeakMap<File, VideoMetadata>();
let encoding = false;
export const preparedVideoMetadata = (file: File) => metadata.get(file);
export async function prepareMediaUpload(file: File, options: UploadPreparation = {}) {
  validateMediaFile(file);
  if (file.type.startsWith("image/") || metadata.has(file)) return file;
  if (encoding) throw new Error("Une vidéo est déjà en préparation. Attendez sa fin.");
  encoding = true;
  try {
    const { transcodeVideo } = await import("./video-transcode");
    const result = await transcodeVideo(file, options);
    metadata.set(result.file, result.metadata);
    return result.file;
  } finally {
    encoding = false;
  }
}
