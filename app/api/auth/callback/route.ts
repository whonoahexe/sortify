import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  exchangeCodeForToken,
  setTokenCookies,
  STATE_COOKIE,
  CODE_VERIFIER_COOKIE,
} from '@/lib/auth';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error || !code || !state) {
    console.error('Spotify Auth Error:', error || 'Missing params');
    return NextResponse.redirect(new URL('/?error=auth_failed', request.url));
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get(STATE_COOKIE)?.value;
  const verifier = cookieStore.get(CODE_VERIFIER_COOKIE)?.value;

  if (!storedState || state !== storedState || !verifier) {
    console.error('State mismatch or missing verifier');
    return NextResponse.redirect(new URL('/?error=csrf_failed', request.url));
  }

  try {
    const tokenData = await exchangeCodeForToken(code, verifier);
    await setTokenCookies(tokenData);

    // Clear the PKCE cookie
    cookieStore.delete(CODE_VERIFIER_COOKIE);
    // State is also done
    cookieStore.delete(STATE_COOKIE);

    return NextResponse.redirect(new URL('/', request.url));
  } catch (err) {
    console.error('Callback error:', err);
    return NextResponse.redirect(
      new URL('/?error=exchange_failed', request.url)
    );
  }
}
