"use client";

import {
	CreateApplicationDialog,
	EditApplicationDialog,
} from "@/components/career/job-application.form";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { JobApplication } from "@ponti/utils/career";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ApplicationsPage() {
	const router = useRouter();
	const [search, setSearch] = useState("");
	const [applications, setApplications] = useState<JobApplication[]>([]);
	const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);

	const filteredApplications = applications.filter(
		(app) =>
			app.jobId?.toString().includes(search) ||
			app.status.toLowerCase().includes(search.toLowerCase()),
	);

	async function handleCreate(data: Partial<JobApplication>) {
		const res = await fetch("/api/career/application", {
			method: "POST",
			body: JSON.stringify(data),
		});
		if (res.ok) {
			router.refresh();
		}
	}

	async function handleUpdate(id: string, data: Partial<JobApplication>) {
		const res = await fetch("/api/career/application", {
			method: "PUT",
			body: JSON.stringify({ id, ...data }),
		});
		if (res.ok) {
			router.refresh();
		}
		const response = (await res.json()) as JobApplication;
		setApplications((prev) => [...prev, response]);
	}

	async function handleDelete(id: string) {
		const res = await fetch(`/api/career/application?id=${id}`, {
			method: "DELETE",
		});
		if (res.ok) {
			router.refresh();
		}
	}

	return (
		<div className="container mx-auto py-10">
			<div className="flex justify-between items-center gap-2 mb-6 px-2 md:px-0">
				<div className="flex-1 flex items-center gap-4">
					<Input
						placeholder="Search applications..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="w-full"
					/>
				</div>
				<CreateApplicationDialog handleCreate={handleCreate} />
			</div>

			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Job ID</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>Created</TableHead>
						<TableHead>Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{filteredApplications.map((application) => (
						<TableRow key={application.id?.toString()}>
							<TableCell>{application.jobId?.toString()}</TableCell>
							<TableCell>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="ghost">{application.status}</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent>
										{["pending", "reviewing", "accepted", "rejected"].map(
											(status: JobApplication["status"]) => (
												<DropdownMenuItem
													key={status}
													onClick={() =>
														handleUpdate(application.id.toString(), {
															status,
														})
													}
												>
													{status}
												</DropdownMenuItem>
											),
										)}
									</DropdownMenuContent>
								</DropdownMenu>
							</TableCell>
							<TableCell>
								{new Date(application.createdAt).toLocaleDateString()}
							</TableCell>
							<TableCell>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setSelectedApp(application)}
								>
									Edit
								</Button>
								<Button
									variant="destructive"
									size="sm"
									onClick={() => handleDelete(application.id.toString())}
								>
									Delete
								</Button>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>

			{/* Edit Dialog */}
			{selectedApp ? (
				<EditApplicationDialog
					application={selectedApp}
					handleUpdate={handleUpdate}
					onOpenChange={() => setSelectedApp(null)}
				/>
			) : null}
		</div>
	);
}
