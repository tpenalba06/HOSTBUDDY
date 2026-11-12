/** Read serialized React Flight data only. T records are UTF-8 byte-counted,
 * not line delimited; splitting on newlines silently loses later components. */
export function readFlightRecords(html: string): Map<string, unknown> {
  const pieces: string[] = [];
  for (const match of html.matchAll(/self\.__next_f\.push\((\[[\s\S]*?\])\)/g)) {
    try {
      const part: unknown = JSON.parse(match[1]!);
      if (Array.isArray(part) && typeof part[1] === "string") pieces.push(part[1]);
    } catch {
      /* Never evaluate scripts. */
    }
  }
  const bytes = new TextEncoder().encode(pieces.join(""));
  const decode = (start: number, end: number) =>
    new TextDecoder().decode(bytes.subarray(start, end));
  const records = new Map<string, unknown>();
  let pos = 0;
  let count = 0;
  while (pos < bytes.length && count++ < 5000) {
    if (bytes[pos] === 10) {
      pos++;
      continue;
    }
    const colon = bytes.indexOf(58, pos);
    if (colon < 0 || colon - pos > 20) break;
    const id = decode(pos, colon);
    if (!/^[\da-f]*$/i.test(id)) break;
    const start = colon + 1;
    if (id && bytes[start] === 84) {
      const comma = bytes.indexOf(44, start);
      if (comma < 0 || comma - start > 12 || !/^[\da-f]+$/i.test(decode(start + 1, comma))) break;
      const length = parseInt(decode(start + 1, comma), 16);
      if (length > 1_500_000 || comma + 1 + length > bytes.length) break;
      records.set(id, decode(comma + 1, comma + 1 + length));
      pos = comma + 1 + length;
    } else {
      const newline = bytes.indexOf(10, start);
      const end = newline < 0 ? bytes.length : newline;
      try {
        if (id) records.set(id, JSON.parse(decode(start, end)));
      } catch {
        /* Module imports/hints are not content. */
      }
      pos = end + 1;
    }
  }
  return records;
}
