import Providers from "@/components/providers";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { SiteNavigation } from "../components/app-navigation";
import "./globals.css";

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<body>
				<Providers>
					<div className="bg-background text-foreground min-h-screen min-w-full flex">
						<SiteNavigation />
						<div className="flex-1 flex flex-col">
							<header className="w-full flex justify-between items-center bg-white shadow-xs p-4">
								<p> Hominem </p>
								<SidebarTrigger />
							</header>
							{children}
						</div>
					</div>
				</Providers>
			</body>
		</html>
	);
}
