import { NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/auth';

export async function POST(request: Request) {
  await clearAuthCookies();
  return NextResponse.json({ success: true });
}
