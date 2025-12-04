// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from './lib/auth/authentication';
import { hasPermission } from './lib/auth/authorization';

// Define which routes are protected and what permission is required to view them.
const protectedRoutes: Record<string, string> = {
  '/': 'dashboard:view',
  '/users': 'users:view',
  '/roles': 'roles:view',
  '/permissions': 'permissions:view',
  '/user-roles': 'user-roles:view',
  '/menus': 'menus:view',
  '/vendors': 'vendors:view',
  '/brands': 'brands:view',
  '/vendor-stats': 'vendor-stats:view',
  '/balances': 'balances:view',
  '/depositor-retention': 'depositor-retention:view',
  '/brand-stats': 'brand-stats:view',
  '/vendor-score': 'vendor-score:view',
  '/roi': 'roi:view',
};

/**
 * Checks if the user has permission to access the requested route.
 * Redirects to /unauthorized if permission is denied.
 */
async function handleAuthorization(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const user = await getCurrentUser();
  
  // Find a matching protected route
  const matchedRoute = Object.keys(protectedRoutes).find(route => 
    route === '/' ? pathname === route : pathname.startsWith(route)
  );

  if (matchedRoute) {
    // If a route is protected, a user must be logged in.
    if (!user) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Check if the user has the required permission for the matched route.
    const requiredPermission = protectedRoutes[matchedRoute];
    const canView = await hasPermission(user, requiredPermission);

    if (!canView) {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }
  }

  // If the route is not in protectedRoutes or if the user has permission, allow access.
  return NextResponse.next();
}

export async function middleware(req: NextRequest) {
  const user = await getCurrentUser();

  // This primary authentication check can be simplified or removed if
  // all routes are covered by the handleAuthorization logic.
  // For now, it serves as a good catch-all for any routes not explicitly public.
  if (!user) {
    const response = NextResponse.redirect(new URL('/login', req.url));
    // If there's an invalid session token cookie, clear it.
    if (req.cookies.has('session')) {
      response.cookies.delete('session');
    }
    return response;
  }

  // The authorization logic is now more self-contained.
  // We could even just call handleAuthorization(req) here directly.
  const { pathname } = req.nextUrl;
  for (const route in protectedRoutes) {
    const isMatch = route === '/' ? pathname === route : pathname.startsWith(route);
    if (isMatch) {
      const requiredPermission = protectedRoutes[route];
      const canView = await hasPermission(user, requiredPermission);
      if (!canView) {
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }
      return NextResponse.next();
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|login|register|verify-email|unauthorized).*)',
  ],
};
