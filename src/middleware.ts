import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Content Security Policy - Prevents XSS and injection attacks
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com https://www.gstatic.com", // Allow Google Auth scripts
      "style-src 'self' 'unsafe-inline'", // Needed for Tailwind
      "img-src 'self' data: https://lh3.googleusercontent.com", // Google profile images
      "font-src 'self'",
      "connect-src 'self' https://*.firebaseapp.com https://*.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com",
      "frame-src https://accounts.google.com https://*.firebaseapp.com", // Allow Google OAuth and Firebase iframes
      "object-src 'none'", // Prevent object/embed
      "base-uri 'self'", // Prevent base tag injection
      "form-action 'self'", // Restrict form submissions
    ].join('; ')
  );

  // Additional security headers
  // Note: X-Frame-Options conflicts with CSP frame-src, so we rely on CSP instead
  response.headers.set('X-Content-Type-Options', 'nosniff'); // Prevent MIME sniffing
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Remove server information
  response.headers.delete('Server');
  response.headers.delete('X-Powered-By');

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};