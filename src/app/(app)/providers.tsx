"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";

// ReactQueryDevtools accesses localStorage at module load time, which breaks
// in Next.js 15 SSR (the --localstorage-file polyfill has a null path).
const ReactQueryDevtools = dynamic(
  () => import("@tanstack/react-query-devtools").then(m => m.ReactQueryDevtools),
  { ssr: false },
);

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 60 * 1000 } },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster richColors position="top-right" />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
