import type { JobApplication } from "@ponti/utils/schema";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export const JobApplicationCard = ({
	application: app,
}: {
	application: JobApplication;
}) => {
	return (
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
								{history.stage} - {new Date(history.date).toLocaleDateString()}
							</p>
						))}
					</div>
				</div>
			</CardContent>
		</Card>
	);
};
