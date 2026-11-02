import { File, Paths } from "expo-file-system";

/**
 * Android build (P-73): the demo state lives in a file in the app's private documents folder,
 * so the prototype remembers the account and everything typed between launches. Same contract
 * as the web version: never throws.
 */
function fileFor(key: string): File {
  return new File(Paths.document, `${key}.json`);
}

export function readStored(key: string): string | null {
  try {
    const file = fileFor(key);
    return file.exists ? file.textSync() : null;
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string): void {
  try {
    const file = fileFor(key);
    if (!file.exists) file.create();
    file.write(value);
  } catch {
    // Ignore a full disk or access errors
  }
}

export function clearStored(key: string): void {
  try {
    const file = fileFor(key);
    if (file.exists) file.delete();
  } catch {
    // Ignore storage access errors
  }
}
