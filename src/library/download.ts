/**
 * Gets a file off the device.
 *
 * The share sheet first, because on an iPad that is the useful answer: it
 * reaches Files, iCloud, AirDrop and Mail, whereas a plain download lands
 * somewhere you then have to go looking for. Everywhere else — and on iOS
 * versions that will not share a file — an anchor download is the fallback.
 *
 * Must be called from a user gesture: iOS refuses `navigator.share` without one.
 */
export async function shareOrDownload(
  fileName: string,
  mimeType: string,
  text: string,
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([text], fileName, { type: mimeType });

  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName });
      return 'shared';
    } catch (error) {
      // Dismissing the sheet is a decision, not a failure.
      if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
      // Anything else — a share sheet that claimed support and then refused —
      // falls through to the download path rather than losing the file.
    }
  }

  const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}
