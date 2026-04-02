import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { origin } = new URL(request.url);

  const response = NextResponse.redirect(`${origin}/login`, { status: 303 });
  response.cookies.set('sf_local_session', '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
