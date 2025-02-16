"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { JobApplication } from "@ponti/utils/career";

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
				<Dialog>
					<DialogTrigger asChild>
						<Button className="space-x-2">
							<Plus className="h-4 w-4" />
							New Application
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Create Application</DialogTitle>
						</DialogHeader>
						<ApplicationForm onSubmit={handleCreate} />
					</DialogContent>
				</Dialog>
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
			<Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Application</DialogTitle>
					</DialogHeader>
					<ApplicationForm
						onSubmit={(data) =>
							selectedApp?.id && handleUpdate(selectedApp.id.toString(), data)
						}
						initialValues={selectedApp}
					/>
				</DialogContent>
			</Dialog>
		</div>
	);
}

function ApplicationForm({
	onSubmit,
	initialValues,
}: {
	onSubmit: (data: Partial<JobApplication>) => void;
	initialValues?: Partial<JobApplication> | null;
}) {
	const [data, setData] = useState<Partial<JobApplication>>(
		initialValues || {},
	);

	function handleChange(key: keyof JobApplication, value: string) {
		setData((prev) => ({ ...prev, [key]: value }));
	}

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				onSubmit(data);
			}}
		>
			<Input
				name="jobId"
				value={data.jobId?.toString() || ""}
				onChange={(e) => handleChange("jobId", e.target.value)}
			/>
			<Input
				name="company"
				value={data.companyId?.toString() || ""}
				onChange={(e) => handleChange("companyId", e.target.value)}
			/>
			<Input
				name="position"
				value={data.position || ""}
				onChange={(e) => handleChange("position", e.target.value)}
			/>
			<Input
				name="status"
				value={data.status || ""}
				onChange={(e) => handleChange("status", e.target.value)}
			/>
			<Button type="submit">Submit</Button>
		</form>
	);
}
