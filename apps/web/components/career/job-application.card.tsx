import { useApplications } from "@/hooks/useApplications";
import { JobApplicationStatus } from "@/lib/career";
import type { JobApplication } from "@ponti/utils/schema";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";

export const JobApplicationCard = ({
	application: app,
	setSelectedApp,
}: {
	setSelectedApp: (app: JobApplication) => void;
	application: JobApplication & { company?: string };
}) => {
	const { deleteApplication, updateApplication } = useApplications();

	async function handleUpdate(id: string, data: Partial<JobApplication>) {
		updateApplication({ data, id });
	}

	return (
		<Card key={app.id}>
			<CardHeader>
				<CardTitle className="flex flex-col gap-2">
					<span>{app.position}</span>
					<span className="text-sm italic rounded-2xl border border-gray-500 px-2 max-w-fit text-gray-500">
						{app.company}
					</span>
				</CardTitle>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost">{app.status}</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent>
						{Object.values(JobApplicationStatus).map(
							(status: JobApplication["status"]) => (
								<DropdownMenuItem
									key={status}
									onClick={() =>
										handleUpdate(app.id.toString(), {
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
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-2 gap-4">
					<div>
						<p className="font-medium">Current Stage: {app.status}</p>
						<p>Applied: {new Date(app.startDate).toLocaleDateString()}</p>
						<p>Location: {app.location}</p>
					</div>
					<div>
						<p className="font-medium">Stage History:</p>
						{app.stages.map((history) => (
							<p key={crypto.getRandomValues(new Uint32Array(1))[0]}>
								{history.stage} - {new Date(history.date).toLocaleDateString()}
							</p>
						))}
					</div>
				</div>
				<div>
					<Button variant="ghost" size="sm" onClick={() => setSelectedApp(app)}>
						Edit
					</Button>
					<Button
						variant="destructive"
						size="sm"
						onClick={() => deleteApplication(app.id.toString())}
					>
						Delete
					</Button>
				</div>
			</CardContent>
		</Card>
	);
};
