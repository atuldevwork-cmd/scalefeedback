import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { origin } = new URL(request.url);

  const response = NextResponse.redirect(`${origin}/projects`, { status: 303 });
  response.cookies.set('sf_local_session', '1', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return response;
}
