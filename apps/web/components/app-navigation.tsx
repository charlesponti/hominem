"use client";

import { SignInButton, SignOutButton, useUser } from "@clerk/nextjs";
import { DollarSign, User, FilePen, CheckCircle } from "lucide-react";
import Link from "next/link";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarHeader,
} from "@/components/ui/sidebar";

export function SiteNavigation() {
	const { user } = useUser();

	return (
		<Sidebar>
			<SidebarHeader>
				{user ? (
					<div className="flex gap-4 items-center border-input border rounded-md px-3 py-2">
						<User size={24} />
						<Link href="/dashboard/profile" className="text-sm font-medium">
							{user.fullName}
						</Link>
					</div>
				) : (
					<SignInButton />
				)}
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarContent className="flex flex-col gap-4 mt-8">
						<SidebarLink href="/dashboard/career/applications">
							<FilePen size={16} />
							Applications
						</SidebarLink>
						<SidebarLink href="/dashboard/finance">
							<DollarSign size={16} />
							Finance
						</SidebarLink>
						<SidebarLink href="/dashboard/activities/task-tracker">
							<CheckCircle size={16} />
							Task Tracker
						</SidebarLink>
					</SidebarContent>
				</SidebarGroup>
				<SidebarGroup />
			</SidebarContent>
			<SidebarFooter>
				<SignOutButton>
					<span className="btn bg-black text-white max-h-fit">Sign Out</span>
				</SignOutButton>
			</SidebarFooter>
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
			className="flex items-center gap-3 hover:bg-gray-100 p-2 rounded-md"
		>
			{children}
		</Link>
	);
}
