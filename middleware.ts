import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default async function middleware(req: NextRequest) {
  const session = await auth();
  const path = req.nextUrl.pathname;

  // Allow access to login/register pages without session
  if (path === "/login" || path === "/register") {
    return NextResponse.next();
  }

  // Check if accessing admin routes
  if (path.startsWith("/admin")) {
    // Allow access if user is admin or if it's you (thefortob)
    const userEmail = session?.user?.email;
    
    // You are always admin
    if (userEmail === "aoberlin@thefortaiagency.com" || 
        userEmail === "thefortob@gmail.com") {
      return NextResponse.next();
    }
    
    // Redirect non-admins to home
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Check if user is authenticated for protected routes
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

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