import { auth } from "./app/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { nextUrl } = req;

  // Not logged in -> only "/" (login) is allowed
  if (!isLoggedIn && nextUrl.pathname !== "/") {
    return Response.redirect(new URL("/", nextUrl));
  }

  // Logged in and hitting login page -> send to branch or dashboard
  if (isLoggedIn && nextUrl.pathname === "/") {
    if (!req.auth?.user?.branch) {
      return Response.redirect(new URL("/branch", nextUrl));
    }
    return Response.redirect(new URL("/dashboard", nextUrl));
  }

  // Logged in but branch not chosen yet -> force branch selection
  if (
    isLoggedIn &&
    !req.auth?.user?.branch &&
    nextUrl.pathname !== "/branch"
  ) {
    return Response.redirect(new URL("/branch", nextUrl));
  }
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|.*\\.png$|favicon\\.ico).*)",
  ],
};
