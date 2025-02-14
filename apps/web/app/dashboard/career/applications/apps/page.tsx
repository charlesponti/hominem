"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@clerk/nextjs";
import {
	JobApplicationStage,
	JobApplicationStatus,
	type JobApplication,
	type JobApplicationInsert,
} from "@ponti/utils/career";
import { PlusCircle } from "lucide-react";
import { useState, type FormEvent } from "react";

const JobApplicationTracker = () => {
	const auth = useAuth();

	if (!auth?.userId) return;

	const [applications, setApplications] = useState<JobApplication[]>([]);
	const [position, setPosition] = useState("");
	const [company, setCompany] = useState("");
	const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
	const [status, setStatus] = useState(JobApplicationStatus.APPLIED);
	const [location, setLocation] = useState("");
	const [jobPosting, setJobPosting] = useState("");
	const [companyUrl, setCompanyUrl] = useState("");
	const [salaryQuoted, setSalaryQuoted] = useState("");

	const stages = [
		"Application",
		"Phone Screen",
		"Technical Interview",
		"Onsite Interview",
		"Offer",
		"Accepted",
		"Rejected",
	];

	const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (position && company) {
			setApplications((prev) => [
				...prev,
				{
					id: crypto.randomUUID(),
					position,
					companyId: company,
					status,
					startDate: new Date(date),
					reference: false,
					endDate: null,
					stages: [
						{
							stage: JobApplicationStage.APPLICATION,
							date: new Date(),
						},
					],
					createdAt: new Date(),
					updatedAt: new Date(),
					userId: auth.userId,
					location,
					jobPosting,
					salaryQuoted,
					coverLetter: null,
					salaryAccepted: null,
					resume: null,
					jobId: null,
					link: null,
					phoneScreen: null,
				},
			]);

			// Reset form
			setPosition("");
			setCompany("");
			setDate(new Date().toISOString().split("T")[0]);
			setStatus(JobApplicationStatus.APPLIED);
			setLocation("");
			setJobPosting("");
			setCompanyUrl("");
			setSalaryQuoted("");
		}
	};

	return (
		<div className="p-4 max-w-4xl mx-auto">
			<Card className="mb-6">
				<CardHeader>
					<CardTitle>New Job Application</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<Input
								placeholder="Job Title"
								name="position"
								value={position}
								onChange={(e) => setPosition(e.target.value)}
							/>
							<Input
								placeholder="Company"
								name="company"
								value={company}
								onChange={(e) => setCompany(e.target.value)}
							/>
							<Input
								type="date"
								name="date"
								value={date}
								onChange={(e) => setDate(e.target.value)}
							/>
							<select
								className="w-full p-2 border rounded"
								value={status}
								onChange={(e) =>
									setStatus(e.target.value as JobApplicationStatus)
								}
							>
								{stages.map((stage) => (
									<option key={stage} value={stage}>
										{stage}
									</option>
								))}
							</select>
							<Input
								placeholder="Location"
								name="location"
								value={location}
								onChange={(e) => setLocation(e.target.value)}
							/>
							<Input
								placeholder="Job Posting URL"
								name="job_posting"
								value={jobPosting}
								onChange={(e) => setJobPosting(e.target.value)}
							/>
							<Input
								placeholder="Company URL"
								name="company_url"
								value={companyUrl}
								onChange={(e) => setCompanyUrl(e.target.value)}
							/>
							<Input
								placeholder="Salary Quoted"
								name="salary_quoted"
								value={salaryQuoted}
								onChange={(e) => setSalaryQuoted(e.target.value)}
							/>
						</div>
						<Button type="submit" className="w-full">
							<PlusCircle className="mr-2 h-4 w-4" />
							Add Application
						</Button>
					</form>
				</CardContent>
			</Card>

			<div className="space-y-4">
				{applications.map((app) => (
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
