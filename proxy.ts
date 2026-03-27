import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow static assets through
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname === '/robots.txt'
  ) {
    return NextResponse.next();
  }

  // Allow auth API routes through
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const token = req.cookies.get('gd-session')?.value;
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);

  const isValidToken = async (t: string) => {
    try {
      await jwtVerify(t, secret);
      return true;
    } catch {
      return false;
    }
  };

  // On login page: redirect home if already authenticated
  if (pathname === '/login') {
    if (token && (await isValidToken(token))) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  // All other routes: require valid session
  if (!token || !(await isValidToken(token))) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
