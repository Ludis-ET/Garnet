/**
 * Every request that changes something carries this header from the app. A web page can't add a
 * custom header to a cross-site request without CORS, which the API never grants, so a hostile
 * page can't make a browser act with someone's session (CSRF), whatever the cookie settings.
 * Checked by SessionGuard on the API's routes and by the bridge on Better Auth's.
 */
export const CLIENT_HEADER = { name: "x-garnet-client", value: "app" } as const;
