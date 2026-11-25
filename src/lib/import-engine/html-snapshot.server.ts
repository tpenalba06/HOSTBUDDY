import { lodgingDom } from "./lodging-dom";
import { HTML_SNAPSHOT_LIMIT } from "./html-snapshot";
import { extractAccessibleHtml } from "./url-source.server";
import { otaListing } from "./ota-listing";
import { htmlDocumentText } from "./html-document";

const unknownSource = "https://snapshot.invalid/";

/** Parse a submitted document as data. This route never retrieves HTML or media. */
export async function readHtmlSnapshot(html: string) {
  if (new TextEncoder().encode(html).length > HTML_SNAPSHOT_LIMIT || html.includes("\0"))
    throw new Error("invalid_html_snapshot");
  const page = lodgingDom(html);
  const visible = htmlDocumentText(page.document);
  if (
    /verify (?:that )?you(?:['’]re| are) not a robot|access denied|javascript is disabled|vérifiez que vous n['’]êtes pas un robot|captcha challenge/i.test(
      `${page.title}\n${visible.slice(0, 1000)}`,
    )
  )
    throw new Error("blocked_html_snapshot");
  const reportedUrl = page.metadata.get("canonical") ?? page.metadata.get("og:url") ?? "";
  const listing = otaListing(reportedUrl);
  const result = await extractAccessibleHtml(html, listing?.url ?? unknownSource, false, page);
  const photos = (result.photoCandidates ?? []).filter(
    (photo) => new URL(photo.url).hostname !== "snapshot.invalid",
  );
  return {
    ...result,
    photos: photos.map((photo) => photo.url),
    photoCandidates: photos,
    photoRightsConfirmed: false,
  };
}
