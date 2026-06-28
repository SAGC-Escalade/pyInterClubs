import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isAllowed } from "@/lib/auth/access";
import type { Role } from "@/lib/auth/session";

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> };

/**
 * Rafraîchit la session Supabase à chaque requête, résout le rôle terrain et
 * restreint l'accès aux espaces /admin, /leader, /judge (équivalent de
 * `pyInterClubsMiddleware` Django, cf. doc 03 §3, doc 10 §2).
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Indispensable : revalide le token et synchronise les cookies.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Résolution du rôle via fn_current_role (SECURITY DEFINER). Une erreur
  // (ex. migration non appliquée) laisse role = null : seuls les espaces
  // protégés sont alors fermés, le public reste accessible.
  let role: Role | null = null;
  if (user) {
    const { data } = await supabase.rpc("fn_current_role");
    role = (data as Role | null) ?? null;
  }

  if (!isAllowed(role, request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
