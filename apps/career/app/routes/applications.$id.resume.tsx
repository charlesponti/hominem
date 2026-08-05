import type { CareerApplicationRecord } from '@hominem/db';
import type { ActionFunctionArgs } from 'react-router';
import { useOutletContext } from 'react-router';

import { ApplicationResumeTab } from '~/components/career';
import { userContext } from '~/lib/middleware';
import { JobApplicationsService } from '~/lib/services/job-applications.service';

export async function action({ context, request, params }: ActionFunctionArgs) {
  const user = context.get(userContext)!;
  const { id } = params;

  if (!id) {
    throw new Response('Application ID is required', { status: 400 });
  }

  const hasOwnership = await JobApplicationsService.verifyOwnership(id, user.id);
  if (!hasOwnership) {
    throw new Response('Application not found or access denied', { status: 403 });
  }

  const formData = await request.formData();
  const resume = formData.get('resume') as string;
  if (!resume) {
    throw new Response('Resume content is required', { status: 400 });
  }

  await JobApplicationsService.updateApplication(id, { resumeUrl: resume });
  return { message: 'Resume saved successfully' };
}

export default function ApplicationResumeRoute({ params }: { params: { id?: string } }) {
  const application = useOutletContext<CareerApplicationRecord>();
  return <ApplicationResumeTab application={application} applicationId={params.id || ''} />;
}
