import { useApplications } from "@/hooks/useApplications";
import { useAuth } from "@clerk/nextjs";
import { type JobApplication } from "@ponti/utils/career";
import { JobApplicationStatus } from "@ponti/utils/types";
import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";

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

export function EditApplicationDialog({
  application,
  handleUpdate,
  onOpenChange,
}: {
  application: JobApplication;
  handleUpdate: (id: string, data: Partial<JobApplication>) => void;
  onOpenChange: () => void;
}) {
  return (
    <Dialog open={!!application} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Application</DialogTitle>
        </DialogHeader>
        <ApplicationForm
          onSubmit={(data) =>
            application?.id && handleUpdate(application.id.toString(), data)
          }
          initialValues={application}
        />
      </DialogContent>
    </Dialog>
  );
}

export function CreateApplicationDialog() {
  const { userId } = useAuth();
  const { createApplication } = useApplications(userId);
  const handleCreate = (data: Partial<JobApplication>) => {
    if (userId) {
      createApplication({ ...data, userId });
    }
  };
  return (
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
  );
}

export function JobApplicationForm() {
  const { userId } = useAuth();

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
    if (!userId) return;
    e.preventDefault();
    if (position && company) {
      createApplication({
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
        userId,
        location,
        jobPosting,
        salaryQuoted,
        coverLetter: null,
        salaryAccepted: null,
        resume: null,
        jobId: null,
        link: null,
        phoneScreen: null,
      });

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
  );
}
