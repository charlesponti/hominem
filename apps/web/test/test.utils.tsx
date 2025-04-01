import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type RenderOptions, render } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: false,
			staleTime: 0,
		},
	},
});

export const DESKTOP_RESOLUTION_WIDTH = 1280;
export const DESKTOP_RESOLUTION_HEIGHT = 800;

export const MOBILE_RESOLUTION_WIDTH = 414;
export const MOBILE_RESOLUTION_HEIGHT = 896;

const renderWithProviders = (
	ui: ReactElement,
	options?: Omit<RenderOptions, "wrapper">,
) =>
	render(ui, {
		wrapper: ({ children }: { children: ReactNode }) => {
			return (
				<QueryClientProvider client={queryClient}>
					{children}
				</QueryClientProvider>
			);
		},
		...options,
	});

export default renderWithProviders;
