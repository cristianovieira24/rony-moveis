import { del } from "@vercel/blob";

export function isManagedBlobUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && /(^|\.)blob\.vercel-storage\.com$/i.test(url.hostname);
  } catch {
    return false;
  }
}

export function managedBlobKey(value: string) {
  return isManagedBlobUrl(value) ? value : null;
}

export async function deleteManagedBlobs(values: Array<string | null | undefined>) {
  const urls = [...new Set(values.filter((value): value is string => Boolean(value && isManagedBlobUrl(value))))];
  if (urls.length) await del(urls);
}
