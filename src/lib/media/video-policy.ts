export const VIDEO_POLICY = {
  sourceBytes: 50 * 1024 * 1024,
  outputBytes: 20 * 1024 * 1024,
  durationSeconds: 90,
  timeoutMs: 240_000,
} as const;
export interface VideoMetadata {
  version: 1;
  durationSeconds: number;
  sizeBytes: number;
  width: number;
  height: number;
  codec: "h264";
  processingStatus: "ready";
}
export interface UploadPreparation {
  signal?: AbortSignal;
  onProgress?: (progress: { phase: "loading" | "encoding" | "uploading"; percent: number }) => void;
}
export function parseVideoProbe(value: string) {
  const result = JSON.parse(value) as {
    format?: { duration?: string };
    streams?: { codec_type?: string; width?: number; height?: number }[];
  };
  const stream = result.streams?.find((item) => item.codec_type === "video");
  const durationSeconds = Number(result.format?.duration);
  if (
    !stream ||
    !stream.width ||
    !stream.height ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0
  )
    throw new Error("Cette vidéo ne peut pas être lue. Choisissez un autre fichier.");
  if (durationSeconds > VIDEO_POLICY.durationSeconds)
    throw new Error("La vidéo de présentation doit durer au maximum 90 secondes.");
  return { durationSeconds, width: stream.width, height: stream.height };
}

export async function readVideoProbeResult(code: number, readOutput: () => Promise<string>) {
  // core 0.12.10 can return -1 after successfully writing ffprobe output.
  // Accept it only when a fresh result exists and passes all metadata limits.
  if (code !== 0 && code !== -1) throw new Error("Cette vidéo ne peut pas être lue.");
  let result: string;
  try {
    result = await readOutput();
  } catch {
    throw new Error("Cette vidéo ne peut pas être lue.");
  }
  return parseVideoProbe(result);
}
export function videoEncodingArgs(input: string) {
  return [
    "-i",
    input,
    "-map",
    "0:v:0",
    "-map",
    "0:a:0?",
    "-vf",
    "scale=w='min(1280,iw)':h='min(720,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
    "-r",
    "24",
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    "-crf",
    "27",
    "-maxrate",
    "1200k",
    "-bufsize",
    "2400k",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "96k",
    "-ac",
    "2",
    "-movflags",
    "+faststart",
    "-map_metadata",
    "-1",
    "-map_chapters",
    "-1",
    "-threads",
    "1",
    "output.mp4",
  ];
}
