import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();
    const allowedDomain = process.env.AUTH_DOMAIN || 'incisiv.com';
    const correctPassword = process.env.AUTH_PASSWORD || '';

    // Check email domain
    if (!emailLower.endsWith(`@${allowedDomain}`)) {
      return NextResponse.json(
        { error: `Only @${allowedDomain} email addresses are allowed` },
        { status: 401 }
      );
    }

    // Check password
    if (password !== correctPassword) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
    }

    // Sign JWT — expires in 7 days
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);
    const token = await new SignJWT({ email: emailLower })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(secret);

    const res = NextResponse.json({ ok: true });

    res.cookies.set('gd-session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return res;
  } catch (err) {
    console.error('[auth/login]', err);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
