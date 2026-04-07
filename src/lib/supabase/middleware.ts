import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const isSupabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http") ?? false;

export async function updateSession(request: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.next({ request });
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
          // IMPORTANT: NextRequest cookies are read-only; only set cookies on the response.
          // This follows Supabase SSR guidance for Next.js middleware.
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const response = NextResponse.next({ request });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/forgot-password");

  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Important: don't redirect authenticated users away from auth pages here.
  // If the app's dashboard layout later determines the user has no profile / lacks access,
  // it may redirect them back to /login. Redirecting /login -> / in middleware would create
  // an infinite redirect loop in that situation (observed on Vercel).

  return response;
}
