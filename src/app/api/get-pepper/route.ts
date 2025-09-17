import { NextRequest, NextResponse } from 'next/server';
import { validateServerEnvironmentSecurity } from '@/lib/integrity';

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute per user

function isRateLimited(userEmail: string): boolean {
  const now = Date.now();
  const userLimits = rateLimitMap.get(userEmail);

  if (!userLimits || now > userLimits.resetTime) {
    rateLimitMap.set(userEmail, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }

  if (userLimits.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  userLimits.count++;
  return false;
}

function isAllowedDomain(origin: string | null): boolean {
  if (!origin) return false;

  const allowedDomains = [
    'http://localhost:3000',
    'https://localhost:3000',
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    process.env.NEXT_PUBLIC_APP_URL,
  ].filter(Boolean);

  return allowedDomains.some(domain => origin === domain || origin.startsWith(domain as string));
}

export async function POST(request: NextRequest) {
  try {
    // Validate server environment first
    if (!validateServerEnvironmentSecurity()) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');

    // Check domain restrictions
    if (!isAllowedDomain(origin) && !isAllowedDomain(referer)) {
      console.warn('Pepper request from unauthorized domain:', { origin, referer });
      return NextResponse.json({ error: 'Unauthorized domain' }, { status: 403 });
    }

    const { userEmail } = await request.json();

    if (!userEmail) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    // Check rate limiting
    if (isRateLimited(userEmail)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // Check allowlist
    const allowedEmails = process.env.ALLOWED_EMAILS?.split(',').map(email => email.trim()) || [];

    if (!allowedEmails.includes(userEmail)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Return pepper
    const pepper = process.env.PEPPER;
    if (!pepper) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    return NextResponse.json({ pepper });
  } catch (error) {
    console.error('Pepper endpoint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}