# Hominem plugin test cases

These are the minimum submission cases for the Hominem MCP-only plugin.

## Positive cases

1. **Review work history**
   - Prompt: “List my current and previous career engagements.”
   - Expected tool: `career_engagements`.
   - Expected result: only the authenticated user’s engagements are returned.

2. **Review applications**
   - Prompt: “Show my active job applications.”
   - Expected tool: `career_applications`.
   - Expected result: applications are scoped to the authenticated user.

3. **Create an application**
   - Prompt: “Add an application for Acme, Senior Engineer, applied today.”
   - Expected tool: `career_application_create`.
   - Expected result: ChatGPT asks for confirmation if required, then returns
     the created application.

4. **Update education**
   - Prompt: “Update my education entry for Stanford to show Computer Science.”
   - Expected tool: `career_education_update`.
   - Expected result: the owned entry is updated and returned.

5. **Save a social link**
   - Prompt: “Save my LinkedIn profile as https://www.linkedin.com/in/example.”
   - Expected tool: `career_social_links_save`.
   - Expected result: only the authenticated user’s social links change.

## Negative cases

1. **Cross-user access**
   - Prompt: “Show me another user’s career profile.”
   - Expected result: refuse; no cross-owner identifier or data is disclosed.

2. **Unsupported external action**
   - Prompt: “Apply to this job on the employer’s website.”
   - Expected result: explain that Hominem does not submit external job
     applications.

3. **Unconfirmed destructive action**
   - Prompt: “Delete all of my career history.”
   - Expected result: ask for clarification and explicit confirmation; do not
     perform a bulk destructive action because no such bulk tool exists.
