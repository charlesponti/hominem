"use client";

import { makeQueryClient, trpc } from "@/lib/trpc";
import { ClerkProvider } from "@clerk/nextjs";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { httpBatchLink } from "@trpc/client";
import type * as React from "react";
import { useState } from "react";
import SuperJSON from "superjson";
import { UserProvider } from "../context/user-context";
import { SidebarProvider } from "./ui/sidebar";

export default function Providers({ children }: { children: React.ReactNode }) {
	return (
		<ClerkProvider>
			<TRPCProvider>
				<UserProvider>
					<SidebarProvider>{children}</SidebarProvider>
					<ReactQueryDevtools />
				</UserProvider>
			</TRPCProvider>
		</ClerkProvider>
	);
}

let clientQueryClientSingleton: QueryClient;
function getQueryClient() {
	if (typeof window === "undefined") {
		// Server: always make a new query client
		return makeQueryClient();
	}
	// Browser: use singleton pattern to keep the same query client
	if (!clientQueryClientSingleton) {
		clientQueryClientSingleton = makeQueryClient();
	}
	return clientQueryClientSingleton;
}

function getUrl() {
	const base = (() => {
		if (typeof window !== "undefined") return "";
		if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
		return "http://localhost:3000";
	})();
	return `${base}/api/trpc`;
}
export function TRPCProvider(
	props: Readonly<{
		children: React.ReactNode;
	}>,
) {
	// NOTE: Avoid useState when initializing the query client if you don't
	//       have a suspense boundary between this and the code that may
	//       suspend because React will throw away the client on the initial
	//       render if it suspends and there is no boundary
	const queryClient = getQueryClient();
	const [trpcClient] = useState(() =>
		trpc.createClient({
			links: [
				httpBatchLink({
					transformer: SuperJSON,
					url: getUrl(),
				}),
			],
		}),
	);

	return (
		<trpc.Provider client={trpcClient} queryClient={queryClient}>
			<QueryClientProvider client={queryClient}>
				{props.children}
			</QueryClientProvider>
		</trpc.Provider>
	);
}
