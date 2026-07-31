-- +goose Up
-- +goose StatementBegin
ALTER TABLE app.portfolios
  ADD CONSTRAINT app_portfolios_owner_userId_key UNIQUE (owner_userId),
  ADD CONSTRAINT app_portfolios_slug_check CHECK (
    length(btrim(slug)) BETWEEN 3 AND 50
    AND slug ~ '^[a-z0-9-]+$'
  ),
  ADD CONSTRAINT app_portfolios_title_not_blank CHECK (length(btrim(title)) > 0),
  ADD CONSTRAINT app_portfolios_name_not_blank CHECK (length(btrim(name)) > 0),
  ADD CONSTRAINT app_portfolios_job_title_not_blank CHECK (length(btrim(job_title)) > 0),
  ADD CONSTRAINT app_portfolios_bio_not_blank CHECK (length(btrim(bio)) > 0),
  ADD CONSTRAINT app_portfolios_tagline_not_blank CHECK (length(btrim(tagline)) > 0),
  ADD CONSTRAINT app_portfolios_current_location_not_blank CHECK (length(btrim(current_location)) > 0),
  ADD CONSTRAINT app_portfolios_email_not_blank CHECK (length(btrim(email)) > 0);

ALTER TABLE app.work_experiences
  ADD CONSTRAINT app_work_experiences_role_not_blank CHECK (length(btrim(role)) > 0),
  ADD CONSTRAINT app_work_experiences_company_not_blank CHECK (length(btrim(company)) > 0),
  ADD CONSTRAINT app_work_experiences_description_not_blank CHECK (length(btrim(description)) > 0),
  ADD CONSTRAINT app_work_experiences_date_order_check CHECK (
    end_date IS NULL OR start_date IS NULL OR end_date >= start_date
  ),
  ADD CONSTRAINT app_work_experiences_base_salary_check CHECK (base_salary IS NULL OR base_salary >= 0),
  ADD CONSTRAINT app_work_experiences_total_compensation_check CHECK (
    total_compensation IS NULL OR total_compensation >= 0
  ),
  ADD CONSTRAINT app_work_experiences_equity_value_check CHECK (
    equity_value IS NULL OR equity_value >= 0
  ),
  ADD CONSTRAINT app_work_experiences_signing_bonus_check CHECK (
    signing_bonus IS NULL OR signing_bonus >= 0
  ),
  ADD CONSTRAINT app_work_experiences_annual_bonus_check CHECK (
    annual_bonus IS NULL OR annual_bonus >= 0
  ),
  ADD CONSTRAINT app_work_experiences_team_size_check CHECK (team_size IS NULL OR team_size >= 0),
  ADD CONSTRAINT app_work_experiences_direct_reports_check CHECK (direct_reports >= 0),
  ADD CONSTRAINT app_work_experiences_sort_order_check CHECK (sort_order >= 0),
  ADD CONSTRAINT app_work_experiences_employment_type_check CHECK (
    employment_type IN ('full-time', 'part-time', 'contract', 'freelance', 'internship', 'temporary')
  ),
  ADD CONSTRAINT app_work_experiences_work_arrangement_check CHECK (
    work_arrangement IN ('office', 'remote', 'hybrid', 'travel')
  ),
  ADD CONSTRAINT app_work_experiences_seniority_level_check CHECK (
    seniority_level IS NULL
    OR seniority_level IN (
      'intern',
      'entry-level',
      'mid-level',
      'senior',
      'lead',
      'principal',
      'staff',
      'director',
      'vp',
      'c-level'
    )
  ),
  ADD CONSTRAINT app_work_experiences_reason_for_leaving_check CHECK (
    reason_for_leaving IS NULL
    OR reason_for_leaving IN (
      'promotion',
      'better_opportunity',
      'relocation',
      'layoff',
      'termination',
      'contract_end',
      'career_change',
      'salary',
      'culture',
      'management',
      'growth',
      'personal'
    )
  );

ALTER TABLE app.projects
  ADD CONSTRAINT app_projects_title_not_blank CHECK (length(btrim(title)) > 0),
  ADD CONSTRAINT app_projects_description_not_blank CHECK (length(btrim(description)) > 0),
  ADD CONSTRAINT app_projects_date_order_check CHECK (
    end_date IS NULL OR start_date IS NULL OR end_date >= start_date
  ),
  ADD CONSTRAINT app_projects_sort_order_check CHECK (sort_order >= 0),
  ADD CONSTRAINT app_projects_status_check CHECK (status IN ('in-progress', 'completed', 'archived'));

ALTER TABLE app.skills
  ADD CONSTRAINT app_skills_name_not_blank CHECK (length(btrim(name)) > 0),
  ADD CONSTRAINT app_skills_level_check CHECK (level BETWEEN 1 AND 100),
  ADD CONSTRAINT app_skills_years_of_experience_check CHECK (
    years_of_experience IS NULL OR years_of_experience >= 0
  ),
  ADD CONSTRAINT app_skills_sort_order_check CHECK (sort_order >= 0);

ALTER TABLE app.social_links
  ADD CONSTRAINT app_social_links_portfolio_id_key UNIQUE (portfolio_id);

ALTER TABLE app.testimonials
  ADD CONSTRAINT app_testimonials_name_not_blank CHECK (length(btrim(name)) > 0),
  ADD CONSTRAINT app_testimonials_content_not_blank CHECK (length(btrim(content)) > 0),
  ADD CONSTRAINT app_testimonials_rating_check CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
  ADD CONSTRAINT app_testimonials_sort_order_check CHECK (sort_order >= 0);

ALTER TABLE app.portfolio_stats
  ADD CONSTRAINT app_portfolio_stats_label_not_blank CHECK (length(btrim(label)) > 0),
  ADD CONSTRAINT app_portfolio_stats_value_not_blank CHECK (length(btrim(value)) > 0),
  ADD CONSTRAINT app_portfolio_stats_sort_order_check CHECK (sort_order >= 0);

ALTER TABLE app.portfolio_analytics
  ADD CONSTRAINT app_portfolio_analytics_event_check CHECK (
    event IN (
      'view',
      'contact_click',
      'project_click',
      'skill_click',
      'social_click',
      'download_resume',
      'copy_email'
    )
  );

ALTER TABLE app.certifications
  ADD CONSTRAINT app_certifications_name_not_blank CHECK (length(btrim(name)) > 0),
  ADD CONSTRAINT app_certifications_issuing_organization_not_blank CHECK (
    length(btrim(issuing_organization)) > 0
  ),
  ADD CONSTRAINT app_certifications_date_order_check CHECK (
    expiration_date IS NULL OR expiration_date >= issue_date
  ),
  ADD CONSTRAINT app_certifications_next_renewal_check CHECK (
    next_renewal_date IS NULL OR next_renewal_date >= issue_date
  ),
  ADD CONSTRAINT app_certifications_cost_check CHECK (cost IS NULL OR cost >= 0),
  ADD CONSTRAINT app_certifications_sort_order_check CHECK (sort_order >= 0),
  ADD CONSTRAINT app_certifications_status_check CHECK (
    status IN ('active', 'expired', 'pending_renewal', 'archived')
  ),
  ADD CONSTRAINT app_certifications_category_check CHECK (
    category IS NULL
    OR category IN (
      'technical',
      'leadership',
      'compliance',
      'industry',
      'language',
      'project_management',
      'security',
      'cloud',
      'data',
      'design'
    )
  );

ALTER TABLE app.companies
  ADD CONSTRAINT app_companies_name_not_blank CHECK (length(btrim(name)) > 0),
  ADD CONSTRAINT app_companies_size_check CHECK (size IS NULL OR size >= 0);

ALTER TABLE app.job_applications
  ADD CONSTRAINT app_job_applications_position_not_blank CHECK (length(btrim(position)) > 0),
  ADD CONSTRAINT app_job_applications_date_order_check CHECK (
    end_date IS NULL OR end_date >= start_date
  ),
  ADD CONSTRAINT app_job_applications_job_posting_word_count_check CHECK (
    job_posting_word_count IS NULL OR job_posting_word_count >= 0
  ),
  ADD CONSTRAINT app_job_applications_time_to_response_check CHECK (
    time_to_response IS NULL OR time_to_response >= 0
  ),
  ADD CONSTRAINT app_job_applications_time_to_first_interview_check CHECK (
    time_to_first_interview IS NULL OR time_to_first_interview >= 0
  ),
  ADD CONSTRAINT app_job_applications_time_to_offer_check CHECK (
    time_to_offer IS NULL OR time_to_offer >= 0
  ),
  ADD CONSTRAINT app_job_applications_time_to_decision_check CHECK (
    time_to_decision IS NULL OR time_to_decision >= 0
  ),
  ADD CONSTRAINT app_job_applications_salary_expected_check CHECK (
    salary_expected IS NULL OR salary_expected >= 0
  ),
  ADD CONSTRAINT app_job_applications_salary_requested_check CHECK (
    salary_requested IS NULL OR salary_requested >= 0
  ),
  ADD CONSTRAINT app_job_applications_salary_offered_check CHECK (
    salary_offered IS NULL OR salary_offered >= 0
  ),
  ADD CONSTRAINT app_job_applications_salary_negotiated_check CHECK (
    salary_negotiated IS NULL OR salary_negotiated >= 0
  ),
  ADD CONSTRAINT app_job_applications_salary_final_check CHECK (
    salary_final IS NULL OR salary_final >= 0
  ),
  ADD CONSTRAINT app_job_applications_total_comp_offered_check CHECK (
    total_comp_offered IS NULL OR total_comp_offered >= 0
  ),
  ADD CONSTRAINT app_job_applications_total_comp_final_check CHECK (
    total_comp_final IS NULL OR total_comp_final >= 0
  ),
  ADD CONSTRAINT app_job_applications_bonus_offered_check CHECK (
    bonus_offered IS NULL OR bonus_offered >= 0
  ),
  ADD CONSTRAINT app_job_applications_bonus_final_check CHECK (
    bonus_final IS NULL OR bonus_final >= 0
  ),
  ADD CONSTRAINT app_job_applications_status_check CHECK (
    status IN (
      'APPLIED',
      'PHONE_SCREEN',
      'INTERVIEW',
      'FINAL_INTERVIEW',
      'OFFER',
      'ACCEPTED',
      'REJECTED',
      'WITHDRAWN'
    )
  );

ALTER TABLE app.application_notes
  ADD CONSTRAINT app_application_notes_content_not_blank CHECK (length(btrim(content)) > 0),
  ADD CONSTRAINT app_application_notes_type_check CHECK (
    type IN ('general', 'interview', 'feedback', 'research', 'follow_up')
  );

ALTER TABLE app.application_files
  ADD CONSTRAINT app_application_files_file_name_not_blank CHECK (length(btrim(file_name)) > 0),
  ADD CONSTRAINT app_application_files_file_size_check CHECK (file_size IS NULL OR file_size >= 0),
  ADD CONSTRAINT app_application_files_type_check CHECK (
    type IN ('resume', 'cover_letter', 'portfolio', 'offer_letter', 'other')
  );

ALTER TABLE app.career_events
  ADD CONSTRAINT app_career_events_date_not_future_check CHECK (event_date IS NOT NULL),
  ADD CONSTRAINT app_career_events_equity_granted_check CHECK (
    equity_granted IS NULL OR equity_granted >= 0
  ),
  ADD CONSTRAINT app_career_events_bonus_amount_check CHECK (
    bonus_amount IS NULL OR bonus_amount >= 0
  ),
  ADD CONSTRAINT app_career_events_event_type_check CHECK (
    event_type IN (
      'promotion',
      'raise',
      'bonus',
      'equity_grant',
      'role_change',
      'department_change',
      'location_change',
      'performance_review',
      'goal_achievement',
      'skill_milestone',
      'manager_change',
      'team_expansion'
    )
  ),
  ADD CONSTRAINT app_career_events_bonus_type_check CHECK (
    bonus_type IS NULL
    OR bonus_type IN ('annual', 'performance', 'retention', 'signing', 'spot', 'referral', 'project')
  );

CREATE UNIQUE INDEX app_portfolios_slug_key
  ON app.portfolios (lower(slug));

CREATE INDEX app_portfolios_owner_userId_idx
  ON app.portfolios (owner_userId);

CREATE INDEX app_portfolios_public_active_idx
  ON app.portfolios (is_public, is_active);

CREATE INDEX app_portfolios_email_idx
  ON app.portfolios (lower(email));

CREATE INDEX app_work_experiences_portfolio_id_idx
  ON app.work_experiences (portfolio_id);

CREATE INDEX app_work_experiences_sort_order_idx
  ON app.work_experiences (sort_order);

CREATE INDEX app_work_experiences_visible_idx
  ON app.work_experiences (is_visible);

CREATE INDEX app_work_experiences_start_date_idx
  ON app.work_experiences (start_date);

CREATE INDEX app_work_experiences_base_salary_idx
  ON app.work_experiences (base_salary);

CREATE INDEX app_work_experiences_employment_type_idx
  ON app.work_experiences (employment_type);

CREATE INDEX app_work_experiences_seniority_level_idx
  ON app.work_experiences (seniority_level);

CREATE INDEX app_work_experiences_portfolio_visible_idx
  ON app.work_experiences (portfolio_id, is_visible);

CREATE INDEX app_work_experiences_portfolio_sort_idx
  ON app.work_experiences (portfolio_id, sort_order);

CREATE INDEX app_work_experiences_portfolio_salary_idx
  ON app.work_experiences (portfolio_id, base_salary);

CREATE INDEX app_projects_portfolio_id_idx
  ON app.projects (portfolio_id);

CREATE INDEX app_projects_status_idx
  ON app.projects (status);

CREATE INDEX app_projects_featured_idx
  ON app.projects (is_featured);

CREATE INDEX app_projects_sort_order_idx
  ON app.projects (sort_order);

CREATE INDEX app_projects_work_experience_id_idx
  ON app.projects (work_experience_id);

CREATE INDEX app_projects_portfolio_featured_visible_idx
  ON app.projects (portfolio_id, is_featured, is_visible);

CREATE INDEX app_projects_portfolio_visible_idx
  ON app.projects (portfolio_id, is_visible);

CREATE INDEX app_projects_work_experience_visible_idx
  ON app.projects (work_experience_id, is_visible);

CREATE INDEX app_skills_portfolio_id_idx
  ON app.skills (portfolio_id);

CREATE INDEX app_skills_category_idx
  ON app.skills (category);

CREATE INDEX app_skills_sort_order_idx
  ON app.skills (sort_order);

CREATE INDEX app_skills_visible_idx
  ON app.skills (is_visible);

CREATE INDEX app_skills_level_idx
  ON app.skills (level);

CREATE INDEX app_skills_portfolio_visible_idx
  ON app.skills (portfolio_id, is_visible);

CREATE INDEX app_skills_portfolio_category_idx
  ON app.skills (portfolio_id, category);

CREATE INDEX app_skills_portfolio_sort_idx
  ON app.skills (portfolio_id, sort_order);

CREATE INDEX app_social_links_portfolio_id_idx
  ON app.social_links (portfolio_id);

CREATE INDEX app_testimonials_portfolio_id_idx
  ON app.testimonials (portfolio_id);

CREATE INDEX app_testimonials_rating_idx
  ON app.testimonials (rating);

CREATE INDEX app_testimonials_sort_order_idx
  ON app.testimonials (sort_order);

CREATE INDEX app_testimonials_portfolio_verified_idx
  ON app.testimonials (portfolio_id, is_verified, is_visible);

CREATE INDEX app_testimonials_portfolio_visible_idx
  ON app.testimonials (portfolio_id, is_visible);

CREATE INDEX app_portfolio_stats_portfolio_id_idx
  ON app.portfolio_stats (portfolio_id);

CREATE INDEX app_portfolio_stats_sort_order_idx
  ON app.portfolio_stats (sort_order);

CREATE INDEX app_portfolio_stats_portfolio_sort_idx
  ON app.portfolio_stats (portfolio_id, sort_order);

CREATE INDEX app_portfolio_analytics_portfolio_id_idx
  ON app.portfolio_analytics (portfolio_id);

CREATE INDEX app_portfolio_analytics_event_idx
  ON app.portfolio_analytics (event);

CREATE INDEX app_portfolio_analytics_visitor_id_idx
  ON app.portfolio_analytics (visitor_id);

CREATE INDEX app_portfolio_analytics_portfolio_event_date_idx
  ON app.portfolio_analytics (portfolio_id, event, createdAt);

CREATE INDEX app_portfolio_analytics_portfolio_date_idx
  ON app.portfolio_analytics (portfolio_id, createdAt);

CREATE INDEX app_certifications_owner_userId_idx
  ON app.certifications (owner_userId);

CREATE INDEX app_certifications_status_idx
  ON app.certifications (status);

CREATE INDEX app_certifications_category_idx
  ON app.certifications (category);

CREATE INDEX app_certifications_issue_date_idx
  ON app.certifications (issue_date);

CREATE INDEX app_certifications_expiration_date_idx
  ON app.certifications (expiration_date);

CREATE INDEX app_certifications_work_experience_id_idx
  ON app.certifications (work_experience_id);

CREATE INDEX app_certifications_owner_status_idx
  ON app.certifications (owner_userId, status);

CREATE INDEX app_certifications_owner_visible_idx
  ON app.certifications (owner_userId, is_visible);

CREATE INDEX app_certifications_owner_sort_idx
  ON app.certifications (owner_userId, sort_order, is_visible);

CREATE UNIQUE INDEX app_companies_owner_name_key
  ON app.companies (owner_userId, lower(name));

CREATE INDEX app_companies_industry_idx
  ON app.companies (industry);

CREATE INDEX app_companies_size_idx
  ON app.companies (size);

CREATE INDEX app_job_applications_owner_userId_idx
  ON app.job_applications (owner_userId);

CREATE INDEX app_job_applications_company_id_idx
  ON app.job_applications (company_id);

CREATE INDEX app_job_applications_status_idx
  ON app.job_applications (status);

CREATE INDEX app_job_applications_start_date_idx
  ON app.job_applications (start_date);

CREATE INDEX app_job_applications_application_date_idx
  ON app.job_applications (application_date);

CREATE INDEX app_job_applications_salary_final_idx
  ON app.job_applications (salary_final);

CREATE INDEX app_job_applications_source_idx
  ON app.job_applications (source);

CREATE INDEX app_job_applications_offer_date_idx
  ON app.job_applications (offer_date);

CREATE INDEX app_job_applications_owner_status_idx
  ON app.job_applications (owner_userId, status);

CREATE INDEX app_job_applications_owner_date_idx
  ON app.job_applications (owner_userId, start_date);

CREATE INDEX app_job_applications_owner_application_date_idx
  ON app.job_applications (owner_userId, application_date);

CREATE INDEX app_job_applications_owner_salary_idx
  ON app.job_applications (owner_userId, salary_final);

CREATE INDEX app_job_applications_status_salary_idx
  ON app.job_applications (status, salary_final);

CREATE INDEX app_job_applications_job_posting_url_idx
  ON app.job_applications (job_posting_url);

CREATE INDEX app_application_notes_application_id_idx
  ON app.application_notes (application_id);

CREATE INDEX app_application_notes_type_idx
  ON app.application_notes (type);

CREATE INDEX app_application_notes_createdAt_idx
  ON app.application_notes (createdAt);

CREATE INDEX app_application_files_application_id_idx
  ON app.application_files (application_id);

CREATE INDEX app_application_files_type_idx
  ON app.application_files (type);

CREATE INDEX app_application_files_createdAt_idx
  ON app.application_files (createdAt);

CREATE INDEX app_career_events_owner_userId_idx
  ON app.career_events (owner_userId);

CREATE INDEX app_career_events_work_experience_id_idx
  ON app.career_events (work_experience_id);

CREATE INDEX app_career_events_event_type_idx
  ON app.career_events (event_type);

CREATE INDEX app_career_events_event_date_idx
  ON app.career_events (event_date);

CREATE INDEX app_career_events_salary_increase_idx
  ON app.career_events (salary_increase);

CREATE INDEX app_career_events_owner_date_idx
  ON app.career_events (owner_userId, event_date);

CREATE INDEX app_career_events_owner_type_idx
  ON app.career_events (owner_userId, event_type);

CREATE INDEX app_career_events_timeline_idx
  ON app.career_events (owner_userId, event_date, event_type);

CREATE TRIGGER app_portfolios_set_updated_at
  BEFORE UPDATE ON app.portfolios
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_work_experiences_set_updated_at
  BEFORE UPDATE ON app.work_experiences
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_projects_set_updated_at
  BEFORE UPDATE ON app.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_skills_set_updated_at
  BEFORE UPDATE ON app.skills
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_social_links_set_updated_at
  BEFORE UPDATE ON app.social_links
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_testimonials_set_updated_at
  BEFORE UPDATE ON app.testimonials
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_portfolio_stats_set_updated_at
  BEFORE UPDATE ON app.portfolio_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_certifications_set_updated_at
  BEFORE UPDATE ON app.certifications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_companies_set_updated_at
  BEFORE UPDATE ON app.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_job_applications_set_updated_at
  BEFORE UPDATE ON app.job_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_application_notes_set_updated_at
  BEFORE UPDATE ON app.application_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_application_files_set_updated_at
  BEFORE UPDATE ON app.application_files
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_career_events_set_updated_at
  BEFORE UPDATE ON app.career_events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TRIGGER IF EXISTS app_career_events_set_updated_at ON app.career_events;
DROP TRIGGER IF EXISTS app_application_files_set_updated_at ON app.application_files;
DROP TRIGGER IF EXISTS app_application_notes_set_updated_at ON app.application_notes;
DROP TRIGGER IF EXISTS app_job_applications_set_updated_at ON app.job_applications;
DROP TRIGGER IF EXISTS app_companies_set_updated_at ON app.companies;
DROP TRIGGER IF EXISTS app_certifications_set_updated_at ON app.certifications;
DROP TRIGGER IF EXISTS app_portfolio_stats_set_updated_at ON app.portfolio_stats;
DROP TRIGGER IF EXISTS app_testimonials_set_updated_at ON app.testimonials;
DROP TRIGGER IF EXISTS app_social_links_set_updated_at ON app.social_links;
DROP TRIGGER IF EXISTS app_skills_set_updated_at ON app.skills;
DROP TRIGGER IF EXISTS app_projects_set_updated_at ON app.projects;
DROP TRIGGER IF EXISTS app_work_experiences_set_updated_at ON app.work_experiences;
DROP TRIGGER IF EXISTS app_portfolios_set_updated_at ON app.portfolios;

DROP INDEX IF EXISTS app.app_career_events_timeline_idx;
DROP INDEX IF EXISTS app.app_career_events_owner_type_idx;
DROP INDEX IF EXISTS app.app_career_events_owner_date_idx;
DROP INDEX IF EXISTS app.app_career_events_salary_increase_idx;
DROP INDEX IF EXISTS app.app_career_events_event_date_idx;
DROP INDEX IF EXISTS app.app_career_events_event_type_idx;
DROP INDEX IF EXISTS app.app_career_events_work_experience_id_idx;
DROP INDEX IF EXISTS app.app_career_events_owner_userId_idx;
DROP INDEX IF EXISTS app.app_application_files_createdAt_idx;
DROP INDEX IF EXISTS app.app_application_files_type_idx;
DROP INDEX IF EXISTS app.app_application_files_application_id_idx;
DROP INDEX IF EXISTS app.app_application_notes_createdAt_idx;
DROP INDEX IF EXISTS app.app_application_notes_type_idx;
DROP INDEX IF EXISTS app.app_application_notes_application_id_idx;
DROP INDEX IF EXISTS app.app_job_applications_job_posting_url_idx;
DROP INDEX IF EXISTS app.app_job_applications_status_salary_idx;
DROP INDEX IF EXISTS app.app_job_applications_owner_salary_idx;
DROP INDEX IF EXISTS app.app_job_applications_owner_application_date_idx;
DROP INDEX IF EXISTS app.app_job_applications_owner_date_idx;
DROP INDEX IF EXISTS app.app_job_applications_owner_status_idx;
DROP INDEX IF EXISTS app.app_job_applications_offer_date_idx;
DROP INDEX IF EXISTS app.app_job_applications_source_idx;
DROP INDEX IF EXISTS app.app_job_applications_salary_final_idx;
DROP INDEX IF EXISTS app.app_job_applications_application_date_idx;
DROP INDEX IF EXISTS app.app_job_applications_start_date_idx;
DROP INDEX IF EXISTS app.app_job_applications_status_idx;
DROP INDEX IF EXISTS app.app_job_applications_company_id_idx;
DROP INDEX IF EXISTS app.app_job_applications_owner_userId_idx;
DROP INDEX IF EXISTS app.app_companies_size_idx;
DROP INDEX IF EXISTS app.app_companies_industry_idx;
DROP INDEX IF EXISTS app.app_companies_owner_name_key;
DROP INDEX IF EXISTS app.app_certifications_owner_sort_idx;
DROP INDEX IF EXISTS app.app_certifications_owner_visible_idx;
DROP INDEX IF EXISTS app.app_certifications_owner_status_idx;
DROP INDEX IF EXISTS app.app_certifications_work_experience_id_idx;
DROP INDEX IF EXISTS app.app_certifications_expiration_date_idx;
DROP INDEX IF EXISTS app.app_certifications_issue_date_idx;
DROP INDEX IF EXISTS app.app_certifications_category_idx;
DROP INDEX IF EXISTS app.app_certifications_status_idx;
DROP INDEX IF EXISTS app.app_certifications_owner_userId_idx;
DROP INDEX IF EXISTS app.app_portfolio_analytics_portfolio_date_idx;
DROP INDEX IF EXISTS app.app_portfolio_analytics_portfolio_event_date_idx;
DROP INDEX IF EXISTS app.app_portfolio_analytics_visitor_id_idx;
DROP INDEX IF EXISTS app.app_portfolio_analytics_event_idx;
DROP INDEX IF EXISTS app.app_portfolio_analytics_portfolio_id_idx;
DROP INDEX IF EXISTS app.app_portfolio_stats_portfolio_sort_idx;
DROP INDEX IF EXISTS app.app_portfolio_stats_sort_order_idx;
DROP INDEX IF EXISTS app.app_portfolio_stats_portfolio_id_idx;
DROP INDEX IF EXISTS app.app_testimonials_portfolio_visible_idx;
DROP INDEX IF EXISTS app.app_testimonials_portfolio_verified_idx;
DROP INDEX IF EXISTS app.app_testimonials_sort_order_idx;
DROP INDEX IF EXISTS app.app_testimonials_rating_idx;
DROP INDEX IF EXISTS app.app_testimonials_portfolio_id_idx;
DROP INDEX IF EXISTS app.app_social_links_portfolio_id_idx;
DROP INDEX IF EXISTS app.app_skills_portfolio_sort_idx;
DROP INDEX IF EXISTS app.app_skills_portfolio_category_idx;
DROP INDEX IF EXISTS app.app_skills_portfolio_visible_idx;
DROP INDEX IF EXISTS app.app_skills_level_idx;
DROP INDEX IF EXISTS app.app_skills_visible_idx;
DROP INDEX IF EXISTS app.app_skills_sort_order_idx;
DROP INDEX IF EXISTS app.app_skills_category_idx;
DROP INDEX IF EXISTS app.app_skills_portfolio_id_idx;
DROP INDEX IF EXISTS app.app_projects_work_experience_visible_idx;
DROP INDEX IF EXISTS app.app_projects_portfolio_visible_idx;
DROP INDEX IF EXISTS app.app_projects_portfolio_featured_visible_idx;
DROP INDEX IF EXISTS app.app_projects_work_experience_id_idx;
DROP INDEX IF EXISTS app.app_projects_sort_order_idx;
DROP INDEX IF EXISTS app.app_projects_featured_idx;
DROP INDEX IF EXISTS app.app_projects_status_idx;
DROP INDEX IF EXISTS app.app_projects_portfolio_id_idx;
DROP INDEX IF EXISTS app.app_work_experiences_portfolio_salary_idx;
DROP INDEX IF EXISTS app.app_work_experiences_portfolio_sort_idx;
DROP INDEX IF EXISTS app.app_work_experiences_portfolio_visible_idx;
DROP INDEX IF EXISTS app.app_work_experiences_seniority_level_idx;
DROP INDEX IF EXISTS app.app_work_experiences_employment_type_idx;
DROP INDEX IF EXISTS app.app_work_experiences_base_salary_idx;
DROP INDEX IF EXISTS app.app_work_experiences_start_date_idx;
DROP INDEX IF EXISTS app.app_work_experiences_visible_idx;
DROP INDEX IF EXISTS app.app_work_experiences_sort_order_idx;
DROP INDEX IF EXISTS app.app_work_experiences_portfolio_id_idx;
DROP INDEX IF EXISTS app.app_portfolios_email_idx;
DROP INDEX IF EXISTS app.app_portfolios_public_active_idx;
DROP INDEX IF EXISTS app.app_portfolios_owner_userId_idx;
DROP INDEX IF EXISTS app.app_portfolios_slug_key;

ALTER TABLE app.career_events
  DROP CONSTRAINT IF EXISTS app_career_events_bonus_type_check,
  DROP CONSTRAINT IF EXISTS app_career_events_event_type_check,
  DROP CONSTRAINT IF EXISTS app_career_events_bonus_amount_check,
  DROP CONSTRAINT IF EXISTS app_career_events_equity_granted_check,
  DROP CONSTRAINT IF EXISTS app_career_events_date_not_future_check;

ALTER TABLE app.application_files
  DROP CONSTRAINT IF EXISTS app_application_files_type_check,
  DROP CONSTRAINT IF EXISTS app_application_files_file_size_check,
  DROP CONSTRAINT IF EXISTS app_application_files_file_name_not_blank;

ALTER TABLE app.application_notes
  DROP CONSTRAINT IF EXISTS app_application_notes_type_check,
  DROP CONSTRAINT IF EXISTS app_application_notes_content_not_blank;

ALTER TABLE app.job_applications
  DROP CONSTRAINT IF EXISTS app_job_applications_status_check,
  DROP CONSTRAINT IF EXISTS app_job_applications_bonus_final_check,
  DROP CONSTRAINT IF EXISTS app_job_applications_bonus_offered_check,
  DROP CONSTRAINT IF EXISTS app_job_applications_total_comp_final_check,
  DROP CONSTRAINT IF EXISTS app_job_applications_total_comp_offered_check,
  DROP CONSTRAINT IF EXISTS app_job_applications_salary_final_check,
  DROP CONSTRAINT IF EXISTS app_job_applications_salary_negotiated_check,
  DROP CONSTRAINT IF EXISTS app_job_applications_salary_offered_check,
  DROP CONSTRAINT IF EXISTS app_job_applications_salary_requested_check,
  DROP CONSTRAINT IF EXISTS app_job_applications_salary_expected_check,
  DROP CONSTRAINT IF EXISTS app_job_applications_time_to_decision_check,
  DROP CONSTRAINT IF EXISTS app_job_applications_time_to_offer_check,
  DROP CONSTRAINT IF EXISTS app_job_applications_time_to_first_interview_check,
  DROP CONSTRAINT IF EXISTS app_job_applications_time_to_response_check,
  DROP CONSTRAINT IF EXISTS app_job_applications_job_posting_word_count_check,
  DROP CONSTRAINT IF EXISTS app_job_applications_date_order_check,
  DROP CONSTRAINT IF EXISTS app_job_applications_position_not_blank;

ALTER TABLE app.companies
  DROP CONSTRAINT IF EXISTS app_companies_size_check,
  DROP CONSTRAINT IF EXISTS app_companies_name_not_blank;

ALTER TABLE app.certifications
  DROP CONSTRAINT IF EXISTS app_certifications_category_check,
  DROP CONSTRAINT IF EXISTS app_certifications_status_check,
  DROP CONSTRAINT IF EXISTS app_certifications_sort_order_check,
  DROP CONSTRAINT IF EXISTS app_certifications_cost_check,
  DROP CONSTRAINT IF EXISTS app_certifications_next_renewal_check,
  DROP CONSTRAINT IF EXISTS app_certifications_date_order_check,
  DROP CONSTRAINT IF EXISTS app_certifications_issuing_organization_not_blank,
  DROP CONSTRAINT IF EXISTS app_certifications_name_not_blank;

ALTER TABLE app.portfolio_analytics
  DROP CONSTRAINT IF EXISTS app_portfolio_analytics_event_check;

ALTER TABLE app.portfolio_stats
  DROP CONSTRAINT IF EXISTS app_portfolio_stats_sort_order_check,
  DROP CONSTRAINT IF EXISTS app_portfolio_stats_value_not_blank,
  DROP CONSTRAINT IF EXISTS app_portfolio_stats_label_not_blank;

ALTER TABLE app.testimonials
  DROP CONSTRAINT IF EXISTS app_testimonials_sort_order_check,
  DROP CONSTRAINT IF EXISTS app_testimonials_rating_check,
  DROP CONSTRAINT IF EXISTS app_testimonials_content_not_blank,
  DROP CONSTRAINT IF EXISTS app_testimonials_name_not_blank;

ALTER TABLE app.social_links
  DROP CONSTRAINT IF EXISTS app_social_links_portfolio_id_key;

ALTER TABLE app.skills
  DROP CONSTRAINT IF EXISTS app_skills_sort_order_check,
  DROP CONSTRAINT IF EXISTS app_skills_years_of_experience_check,
  DROP CONSTRAINT IF EXISTS app_skills_level_check,
  DROP CONSTRAINT IF EXISTS app_skills_name_not_blank;

ALTER TABLE app.projects
  DROP CONSTRAINT IF EXISTS app_projects_status_check,
  DROP CONSTRAINT IF EXISTS app_projects_sort_order_check,
  DROP CONSTRAINT IF EXISTS app_projects_date_order_check,
  DROP CONSTRAINT IF EXISTS app_projects_description_not_blank,
  DROP CONSTRAINT IF EXISTS app_projects_title_not_blank;

ALTER TABLE app.work_experiences
  DROP CONSTRAINT IF EXISTS app_work_experiences_reason_for_leaving_check,
  DROP CONSTRAINT IF EXISTS app_work_experiences_seniority_level_check,
  DROP CONSTRAINT IF EXISTS app_work_experiences_work_arrangement_check,
  DROP CONSTRAINT IF EXISTS app_work_experiences_employment_type_check,
  DROP CONSTRAINT IF EXISTS app_work_experiences_sort_order_check,
  DROP CONSTRAINT IF EXISTS app_work_experiences_direct_reports_check,
  DROP CONSTRAINT IF EXISTS app_work_experiences_team_size_check,
  DROP CONSTRAINT IF EXISTS app_work_experiences_annual_bonus_check,
  DROP CONSTRAINT IF EXISTS app_work_experiences_signing_bonus_check,
  DROP CONSTRAINT IF EXISTS app_work_experiences_equity_value_check,
  DROP CONSTRAINT IF EXISTS app_work_experiences_total_compensation_check,
  DROP CONSTRAINT IF EXISTS app_work_experiences_base_salary_check,
  DROP CONSTRAINT IF EXISTS app_work_experiences_date_order_check,
  DROP CONSTRAINT IF EXISTS app_work_experiences_description_not_blank,
  DROP CONSTRAINT IF EXISTS app_work_experiences_company_not_blank,
  DROP CONSTRAINT IF EXISTS app_work_experiences_role_not_blank;

ALTER TABLE app.portfolios
  DROP CONSTRAINT IF EXISTS app_portfolios_email_not_blank,
  DROP CONSTRAINT IF EXISTS app_portfolios_current_location_not_blank,
  DROP CONSTRAINT IF EXISTS app_portfolios_tagline_not_blank,
  DROP CONSTRAINT IF EXISTS app_portfolios_bio_not_blank,
  DROP CONSTRAINT IF EXISTS app_portfolios_job_title_not_blank,
  DROP CONSTRAINT IF EXISTS app_portfolios_name_not_blank,
  DROP CONSTRAINT IF EXISTS app_portfolios_title_not_blank,
  DROP CONSTRAINT IF EXISTS app_portfolios_slug_check,
  DROP CONSTRAINT IF EXISTS app_portfolios_owner_userId_key;
-- +goose StatementEnd
