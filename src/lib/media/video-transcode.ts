import { FFmpeg } from "@ffmpeg/ffmpeg";
import workerURL from "@ffmpeg/ffmpeg/worker?worker&url";
import {
  readVideoProbeResult,
  videoEncodingArgs,
  VIDEO_POLICY,
  type UploadPreparation,
  type VideoMetadata,
} from "./video-policy";

/** Single-thread worker: no SharedArrayBuffer/COOP/COEP requirement, no third-party upload. */
export async function transcodeVideo(file: File, options: UploadPreparation = {}) {
  const encoder = new FFmpeg();
  const controller = new AbortController();
  const abort = () => {
    controller.abort();
    encoder.terminate();
  };
  const deadline = setTimeout(abort, VIDEO_POLICY.timeoutMs);
  options.signal?.addEventListener("abort", abort, { once: true });
  let wasmURL = "";
  let stage = "loading";
  try {
    options.signal?.throwIfAborted();
    options.onProgress?.({ phase: "loading", percent: 0 });
    // Split build assets stay below the hosting provider's per-file limit.
    const parts = await Promise.all(
      [0, 1].map(async (index) => {
        const response = await fetch(`/video-codec/0.12.10/core-${index}.wasm-part`, {
          signal: controller.signal,
          credentials: "same-origin",
        });
        if (!response.ok) throw new Error("Le moteur vidéo n’a pas pu être chargé. Réessayez.");
        return response.arrayBuffer();
      }),
    );
    controller.signal.throwIfAborted();
    wasmURL = URL.createObjectURL(new Blob(parts, { type: "application/wasm" }));
    await encoder.load({
      coreURL: new URL("/video-codec/0.12.10/ffmpeg-core.js", location.origin).href,
      wasmURL,
      classWorkerURL: workerURL,
    });
    stage = "encoding";
    await encoder.writeFile("input", new Uint8Array(await file.arrayBuffer()));
    const probe = async (input: string, output: string) => {
      const code = await encoder.ffprobe(
        [
          "-v",
          "error",
          "-show_entries",
          "format=duration:stream=codec_type,width,height",
          "-of",
          "json",
          input,
          "-o",
          output,
        ],
        10_000,
      );
      return readVideoProbeResult(
        code,
        async () => (await encoder.readFile(output, "utf8")) as string,
      );
    };
    await probe("input", "source.json");
    options.onProgress?.({ phase: "encoding", percent: 0 });
    encoder.on("progress", ({ progress }) =>
      options.onProgress?.({
        phase: "encoding",
        percent: Math.max(0, Math.min(99, Math.round(progress * 100))),
      }),
    );
    const code = await encoder.exec(videoEncodingArgs("input"), VIDEO_POLICY.timeoutMs - 30_000);
    if (code !== 0)
      throw new Error("La préparation vidéo a échoué. Essayez une vidéo plus courte.");
    const output = await encoder.readFile("output.mp4");
    if (
      !(output instanceof Uint8Array) ||
      !output.byteLength ||
      output.byteLength > VIDEO_POLICY.outputBytes
    )
      throw new Error("La vidéo reste trop volumineuse. Essayez une vidéo plus courte.");
    const metadata: VideoMetadata = {
      version: 1,
      ...(await probe("output.mp4", "result.json")),
      sizeBytes: output.byteLength,
      codec: "h264",
      processingStatus: "ready",
    };
    options.signal?.throwIfAborted();
    const prepared = new File([new Uint8Array(output).buffer], "presentation.mp4", {
      type: "video/mp4",
    });
    return { file: prepared, metadata };
  } catch (error) {
    if (options.signal?.aborted)
      throw new Error("Préparation annulée. Votre vidéo précédente est conservée.");
    if (controller.signal.aborted)
      throw new Error("La préparation a pris trop de temps. Essayez une vidéo plus courte.");
    if (error instanceof TypeError || !(error instanceof Error))
      throw new Error(
        stage === "loading"
          ? "Le moteur vidéo n’a pas pu être chargé. Vérifiez votre connexion puis réessayez."
          : "La préparation vidéo a échoué. Essayez une vidéo plus courte.",
      );
    throw error;
  } finally {
    clearTimeout(deadline);
    options.signal?.removeEventListener("abort", abort);
    encoder.terminate();
    if (wasmURL) URL.revokeObjectURL(wasmURL);
  }
}
