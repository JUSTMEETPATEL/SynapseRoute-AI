"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { useAuthStore } from "@/store/auth-store";
import { usePathname, useRouter } from "next/navigation";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AuthGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, checkSession } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== "/login") {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  // Show nothing while checking session
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0A0A0A]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-zinc-700 border-t-cyber-green rounded-full animate-spin" />
          <span className="text-zinc-500 text-sm font-mono">INITIALIZING...</span>
        </div>
      </div>
    );
  }

  // On login page, always render
  if (pathname === "/login") return <>{children}</>;

  // Authenticated routes
  if (!isAuthenticated) return null;

  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  // Prevent SSR hydration mismatch for auth state
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate>{children}</AuthGate>
    </QueryClientProvider>
  );
}
