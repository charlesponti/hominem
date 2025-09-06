import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { useState } from "react";
import { createClient } from "../supabase/client";
import { trpc } from "./client";

export function TRPCProvider({ children }: { children: React.ReactNode }) {
	const [queryClient] = useState(() => new QueryClient());
	const supabase = createClient();

	const [trpcClient] = useState(() =>
		trpc.createClient({
			links: [
				httpBatchLink({
					url: "/api/trpc",
					async headers() {
						// First verify the user is authenticated
						const {
							data: { user },
						} = await supabase.auth.getUser();

						if (!user) {
							return { authorization: "" };
						}

						// Then get the session for the access token
						const {
							data: { session },
						} = await supabase.auth.getSession();

						return {
							authorization: session?.access_token
								? `Bearer ${session.access_token}`
								: "",
						};
					},
				}),
			],
		}),
	);

	return (
		<trpc.Provider client={trpcClient} queryClient={queryClient}>
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		</trpc.Provider>
	);
}
