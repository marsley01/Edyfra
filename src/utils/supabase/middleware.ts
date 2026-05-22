import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with cross-site tracking piercing.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/signup');
  const isStudentRoute = request.nextUrl.pathname.startsWith('/dashboard');
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');
  const isTutorRoute = request.nextUrl.pathname.startsWith('/tutor');
  const isProtectedRoute = isStudentRoute || isTutorRoute || isAdminRoute || request.nextUrl.pathname.startsWith('/study-room') || request.nextUrl.pathname.startsWith('/onboarding');

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user) {
    const role = user.user_metadata?.role;

    // Redirect already logged in users away from auth pages
    if (isAuthRoute) {
      const url = request.nextUrl.clone();
      if (role?.toUpperCase() === 'TUTOR') url.pathname = '/tutor';
      else if (role?.toUpperCase() === 'ADMIN') url.pathname = '/admin';
      else url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }

    // Additional role-based redirects for security
    // Only redirect if user is trying to access wrong role-based route
    if (isStudentRoute && role?.toUpperCase() === 'TUTOR') {
      const url = request.nextUrl.clone();
      url.pathname = '/tutor';
      return NextResponse.redirect(url);
    }

    if (isStudentRoute && role?.toUpperCase() === 'ADMIN') {
      const url = request.nextUrl.clone();
      url.pathname = '/admin';
      return NextResponse.redirect(url);
    }

    if (isTutorRoute && role?.toUpperCase() === 'STUDENT') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }

    if (isTutorRoute && role?.toUpperCase() === 'ADMIN') {
      const url = request.nextUrl.clone();
      url.pathname = '/admin';
      return NextResponse.redirect(url);
    }

    if (isAdminRoute && role?.toUpperCase() === 'STUDENT') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }

    if (isAdminRoute && role?.toUpperCase() === 'TUTOR') {
      const url = request.nextUrl.clone();
      url.pathname = '/tutor';
      return NextResponse.redirect(url);
    }

    // Role-based access is handled in Prisma-backed layouts/pages.
    // Middleware only protects authenticated routes because Supabase user_metadata can be stale.
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
