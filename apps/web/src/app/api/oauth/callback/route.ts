import { NextRequest, NextResponse } from 'next/server';

const TOKEN_URL = 'https://neo.dev.gokite.ai/oauth/token';

function getRedirectUri(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return `${process.env.NEXT_PUBLIC_SITE_URL}/api/oauth/callback`;
  if (process.env.URL) return `${process.env.URL}/api/oauth/callback`;
  return `http://localhost:${process.env.PORT || 3000}/api/oauth/callback`;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state'); // contains agentId
  const error = request.nextUrl.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL(`/dashboard?oauth_error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/dashboard?oauth_error=missing_code', request.url)
    );
  }

  try {
    // Exchange authorization code for access token
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: state, // agent's client_id was passed as OAuth state
        redirect_uri: getRedirectUri(),
      }).toString(),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || tokenData.error) {
      console.error('OAuth token exchange failed:', tokenData);
      return NextResponse.redirect(
        new URL(`/dashboard?oauth_error=${encodeURIComponent(tokenData.error_description || tokenData.error || 'token_exchange_failed')}`, request.url)
      );
    }

    const accessToken = tokenData.access_token;
    if (!accessToken) {
      return NextResponse.redirect(
        new URL('/dashboard?oauth_error=no_access_token', request.url)
      );
    }

    // Redirect back to dashboard with the token
    // The dashboard will store it with the agent in Firebase
    return NextResponse.redirect(
      new URL(`/dashboard?oauth_success=1&agent_id=${encodeURIComponent(state)}&access_token=${encodeURIComponent(accessToken)}`, request.url)
    );
  } catch (err) {
    console.error('OAuth callback error:', err);
    return NextResponse.redirect(
      new URL(`/dashboard?oauth_error=${encodeURIComponent(String(err))}`, request.url)
    );
  }
}
