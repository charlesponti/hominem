"use client";

import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { SignInButton, SignOutButton, useUser } from "@clerk/nextjs";
import { CheckCircle, DollarSign, FilePen, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Button } from "./ui/button";

const data = {
	navMain: [
		{
			title: "Dashboard",
			icon: CheckCircle,
			url: "/dashboard",
		},
		{
			title: "Finance",
			icon: DollarSign,
			url: "/finance/billing",
		},
		{
			title: "Career",
			icon: FilePen,
			url: "/career",
			items: [
				{
					title: "Applications",
					icon: User,
					url: "/career/applications",
					isActive: false,
				},
			],
		},
	],
};

export function SiteNavigation() {
	const pathname = usePathname();
	const { user, isLoaded } = useUser();
	const { toggleSidebar } = useSidebar();
	const isLoggedIn = isLoaded && user;

	useEffect(() => {
		document.addEventListener("keydown", (event) => {
			if (event.key === "i" && event.metaKey) {
				event.preventDefault();
				toggleSidebar();
			}
		});
	}, [toggleSidebar]);

	return (
		<Sidebar>
			<SidebarHeader className="min-h-fit flex flex-col gap-4 justify-center my-2">
				<div className="flex items-center justify-center p-4 bg-[rgba(238,238,238,1)] rounded-xl">
					<Image
						src="/logo-hominem-transparent.png"
						alt="Hominem Logo"
						width={30}
						height={30}
					/>
					<h1 className="text-2xl font-bold">ominem</h1>
				</div>
				<div>
					<div className="flex gap-2 items-center border-input border rounded-md px-3 h-12">
						{isLoaded && isLoggedIn ? (
							<>
								<div className="rounded-full border border-gray-600">
									<User size={13} />
								</div>
								<Link href="/dashboard/profile" className="text-sm font-medium">
									{user.fullName}
								</Link>
							</>
						) : (
							<div className="w-full flex items-center justify-center">
								<span className="loading loading-dots text-gray-300" />
							</div>
						)}
					</div>
					{isLoaded && !isLoggedIn ? (
						<SignInButton>
							<Button size="lg">Sign in</Button>
						</SignInButton>
					) : null}
				</div>
			</SidebarHeader>
			<SidebarContent className="max-w-full">
				{data.navMain.map((item) => (
					<SidebarGroup
						key={item.title}
						className={cn("max-w-full", { "my-0 pb-0": !item.items })}
					>
						<SidebarGroupLabel>{item.title}</SidebarGroupLabel>
						{item.items ? (
							<SidebarGroupContent className="pl-6 w-full">
								<SidebarMenu>
									{item.items?.map((item) => (
										<SidebarMenuItem key={item.title}>
											<SidebarMenuButton
												asChild
												isActive={pathname.indexOf(item.url) > -1}
											>
												<div>
													<item.icon size={14} />
													<a href={item.url}>{item.title}</a>
												</div>
											</SidebarMenuButton>
										</SidebarMenuItem>
									))}
								</SidebarMenu>
							</SidebarGroupContent>
						) : null}
					</SidebarGroup>
				))}
			</SidebarContent>
			{isLoaded && isLoggedIn ? (
				<SidebarFooter>
					<SignOutButton>
						<span className="btn bg-black text-white max-h-fit">Sign Out</span>
					</SignOutButton>
				</SidebarFooter>
			) : null}
		</Sidebar>
	);
}
