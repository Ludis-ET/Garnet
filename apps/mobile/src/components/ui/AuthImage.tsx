import { Image, type ImageStyle } from "expo-image";
import { useEffect, useState } from "react";
import type { StyleProp } from "react-native";
import { getGarnetAuthClient } from "@/data/http/authClient";
import { CLIENT_HEADER } from "@/data/http/client";
import { API_URL } from "@/data/http/config";

/**
 * The session headers an image from the API needs (P-98): pictures are only given to their
 * owner and partner, so the request carries this phone's session like any other. Null while
 * they are being read.
 */
export function useSessionHeaders(): Record<string, string> | null {
  const [headers, setHeaders] = useState<Record<string, string> | null>(
    API_URL === null ? {} : null,
  );
  useEffect(() => {
    if (API_URL === null) return;
    let live = true;
    void Promise.resolve(getGarnetAuthClient(API_URL).getCookie())
      .then((cookie) => {
        if (live)
          setHeaders({
            [CLIENT_HEADER.name]: CLIENT_HEADER.value,
            ...(cookie === "" ? {} : { cookie }),
          });
      })
      .catch(() => {
        if (live) setHeaders({});
      });
    return () => {
      live = false;
    };
  }, []);
  return headers;
}

/**
 * An image that may come from the API (a profile picture) or from the phone itself (a file or
 * data address). The API's are loaded with the session and kept on the phone by their versioned
 * address; anything that can't load reports it, so the caller can show initials instead.
 */
export function AuthImage({
  uri,
  style,
  onFailed,
}: {
  uri: string;
  style: StyleProp<ImageStyle>;
  onFailed?: () => void;
}) {
  const headers = useSessionHeaders();
  const fromApi = API_URL !== null && uri.startsWith(API_URL);
  if (fromApi && headers === null) return null;
  return (
    <Image
      source={fromApi && headers !== null ? { uri, headers } : { uri }}
      style={style}
      contentFit="cover"
      cachePolicy="disk"
      transition={150}
      accessible={false}
      {...(onFailed === undefined ? {} : { onError: onFailed })}
    />
  );
}
