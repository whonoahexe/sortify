import { NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/auth';

export async function POST() {
  await clearAuthCookies();
  return NextResponse.json({ success: true });
}

export async function GET() {
  await clearAuthCookies();
  return NextResponse.redirect(
    new URL('/', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000')
  );
}
