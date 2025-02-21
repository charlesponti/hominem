"use client";

import { CreateApplicationDialog } from "@/components/career/job-application.form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApplications } from "@/hooks/useApplications";
import { useAuth } from "@clerk/nextjs";

const JobApplicationTracker = () => {
	const { userId } = useAuth();
	const { applications } = useApplications(userId || "");

	return (
		<div className="p-4 max-w-4xl mx-auto">
			<CreateApplicationDialog />
			<div className="space-y-4">
				{applications?.map((app) => (
					<Card key={app.id}>
						<CardHeader>
							<CardTitle>
								{app.position} at {app.companyId}
							</CardTitle>
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
											{history.stage} -{" "}
											{new Date(history.date).toLocaleDateString()}
										</p>
									))}
								</div>
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
};

export default JobApplicationTracker;
