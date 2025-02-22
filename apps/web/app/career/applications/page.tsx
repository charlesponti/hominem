"use client";

import { JobApplicationCard } from "@/components/career/job-application.card";
import {
	CreateApplicationDialog,
	EditApplicationDialog,
} from "@/components/career/job-application.form";
import { Input } from "@/components/ui/input";
import { useApplications } from "@/hooks/useApplications";
import { useAuth } from "@clerk/nextjs";
import type { JobApplication } from "@ponti/utils/career";
import { useState } from "react";

export default function ApplicationsPage() {
	const { userId } = useAuth();
	const [search, setSearch] = useState("");
	const { applications } = useApplications(userId);
	const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);

	return (
		<div className="container mx-auto py-10">
			<div className="flex justify-between">
				<h1 className="text-2xl font-bold mb-6">Applications</h1>
				<CreateApplicationDialog />
			</div>
			<div className="flex flex-col md:flex-row justify-between items-center gap-2 mb-6 md:px-0">
				<Input
					placeholder="Search applications..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="w-full"
				/>
			</div>

			<div className="space-y-4">
				{applications?.map((app) => (
					<JobApplicationCard
						key={app.id}
						application={app}
						setSelectedApp={setSelectedApp}
					/>
				))}
			</div>

			{/* Edit Dialog */}
			{selectedApp ? (
				<EditApplicationDialog
					application={selectedApp}
					onOpenChange={() => setSelectedApp(null)}
				/>
			) : null}
		</div>
	);
}
