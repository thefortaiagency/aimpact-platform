import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Check if accessing admin routes
    if (path.startsWith("/admin")) {
      // Allow access if user is admin or if it's you (thefortob)
      const userEmail = token?.email as string;
      const userRole = (token as any)?.role;
      
      // You are always admin
      if (userEmail === "aoberlin@thefortaiagency.com" || 
          userEmail === "thefortob@gmail.com" ||
          userRole === "admin") {
        return NextResponse.next();
      }
      
      // Redirect non-admins to home
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        
        // Allow access to login/register pages without token
        if (path === "/login" || path === "/register") {
          return true;
        }
        
        // Require token for protected routes
        return !!token;
      },
    },
  }
);

// Configure which routes to protect
export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/aimpact/:path*",
    "/api/aimpact/:path*",
    "/todos/:path*",
    "/api/todos/:path*",
    "/meetings/:path*",
    "/api/meetings/:path*",
    "/contacts/:path*",
    "/api/contacts/:path*",
    // Add other specific protected routes here
  ],
};