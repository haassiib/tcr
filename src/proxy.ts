import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const protectedRoutes: string[] = [
  '/',
  '/dashboard',
  '/users',
  '/roles',
  '/permissions',
  '/user-roles',
  '/menus',
  '/vendors',
  '/brands',
  '/vendor-stats',
  '/balances',
  '/depositor-retention',
  '/reports/brand-stats',
  '/reports/vendor-score',
  '/reports/roi'
];
const authRoutes: string[] = ['/login', '/register', '/reset'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cookieStore = await cookies();
  const token = cookieStore.get('uuid')?.value;

  const isAuthenticated = !!token;

  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));
  // Check for an exact match for protected routes, especially for '/'
  const isProtectedRoute = protectedRoutes.includes(pathname) || protectedRoutes.filter(r => r !== '/').some(route => pathname.startsWith(route));

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && isAuthRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Protect routes
  if (!isAuthenticated && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};