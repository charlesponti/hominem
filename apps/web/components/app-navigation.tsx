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
import { SignInButton, SignOutButton, useUser } from "@clerk/nextjs";
import { CheckCircle, DollarSign, FilePen, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
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
				{
					title: "Applications v1",
					icon: User,
					url: "/career/applications-v2",
					isActive: false,
				},
				{
					title: "Resume Builder",
					icon: FilePen,
					url: "/career/resume-builder",
					isActive: false,
				},
				{
					title: "Interview Prep",
					icon: FilePen,
					url: "/career/interview-prep",
					isActive: false,
				},
			],
		},
	],
};

export function SiteNavigation() {
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
					{isLoaded && isLoggedIn ? (
						<div className="flex gap-4 items-center border-input border rounded-md px-3 py-2">
							<User size={24} />
							<Link href="/dashboard/profile" className="text-sm font-medium">
								{user.fullName}
							</Link>
						</div>
					) : null}
					{isLoaded && !isLoggedIn ? (
						<SignInButton>
							<Button size="lg">Sign in</Button>
						</SignInButton>
					) : null}
				</div>
			</SidebarHeader>
			<SidebarContent className="w-[100vw] md:max-w-[260px]">
				{/* We create a SidebarGroup for each parent. */}
				{data.navMain.map((item) => (
					<SidebarGroup key={item.title}>
						<SidebarGroupLabel>{item.title}</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								{item.items?.map((item) => (
									<SidebarMenuItem key={item.title}>
										<SidebarMenuButton asChild isActive={item.isActive}>
											<a href={item.url}>{item.title}</a>
										</SidebarMenuButton>
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				))}
				<SidebarGroup>
					<SidebarContent className="flex flex-col gap-4">
						<SidebarLink href="/dashboard/career/applications">
							<FilePen size={14} />
							Applications
						</SidebarLink>
						<SidebarLink href="/dashboard/finance">
							<DollarSign size={14} />
							Finance
						</SidebarLink>
						<SidebarLink href="/dashboard/activities/task-tracker">
							<CheckCircle size={14} />
							Task Tracker
						</SidebarLink>
					</SidebarContent>
				</SidebarGroup>
				<SidebarGroup />
			</SidebarContent>
			{isLoggedIn ? (
				<SidebarFooter>
					<SignOutButton>
						<span className="btn bg-black text-white max-h-fit">Sign Out</span>
					</SignOutButton>
				</SidebarFooter>
			) : null}
		</Sidebar>
	);
}

function SidebarLink({
	href,
	children,
}: { href: string; children: React.ReactNode }) {
	return (
		<Link
			href={href}
			className="flex items-center gap-2 hover:bg-gray-100 p-2 rounded-md text-sm"
		>
			{children}
		</Link>
	);
}
