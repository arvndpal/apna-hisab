/**
 * Copies a local file into the system's Downloads collection via MediaStore (Android 10+), so an
 * export is a real, persistent file visible in Files/Downloads apps — not just bytes handed to
 * whichever app the user happens to pick from a share sheet. No storage permission is needed:
 * scoped storage lets an app create its own entries in shared collections like Downloads for free.
 *
 * react-native-blob-util's own `filedescriptor` TS type claims a `path` field, but the native
 * Android side (ReactNativeBlobUtilImpl.java#copyToMediaStore) actually requires `name` /
 * `parentFolder` / `mimeType` and rejects anything else — the cast below works around that stale type.
 */
import type ReactNativeBlobUtilType from 'react-native-blob-util';

// Required lazily: its module import touches NativeModules, which doesn't exist under Jest.
function blobUtil(): typeof ReactNativeBlobUtilType {
  return require('react-native-blob-util').default as typeof ReactNativeBlobUtilType;
}

/** Writes base64 `data` to a private cache file MediaStore can copy from — not itself user-visible. */
export async function writeCacheFile(filename: string, base64Data: string): Promise<string> {
  const path = `${blobUtil().fs.dirs.CacheDir}/${filename}`;
  await blobUtil().fs.writeFile(path, base64Data, 'base64');
  return path;
}

export async function saveToDownloads(localPath: string, filename: string, mimeType: string): Promise<void> {
  const fileDescriptor = { name: filename, parentFolder: '', mimeType } as unknown as Parameters<
    ReturnType<typeof blobUtil>['MediaCollection']['copyToMediaStore']
  >[0];
  await blobUtil().MediaCollection.copyToMediaStore(fileDescriptor, 'Download', localPath);
}
