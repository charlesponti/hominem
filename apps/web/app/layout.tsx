import Providers from "@/components/providers";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Menu } from "lucide-react";
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
					<div className="bg-background text-foreground min-h-screen min-w-full flex max-h-screen">
						<SiteNavigation />
						<div className="flex-1 flex flex-col">
							<SidebarTrigger className="md:hidden">
								<div className="border border-gray-500 rounded-full">
									<Menu size={24} />
								</div>
							</SidebarTrigger>
							<main className="px-2">{children}</main>
						</div>
					</div>
				</Providers>
			</body>
		</html>
	);
}
