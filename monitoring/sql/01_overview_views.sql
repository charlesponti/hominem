-- 01_overview_views.sql
-- Create convenience views used by Grafana dashboards and other tooling.
-- These views are idempotent (DROP + CREATE) so they can be re-applied safely.

DROP VIEW IF EXISTS tasks_overview_summary;
CREATE VIEW tasks_overview_summary AS
SELECT
  COUNT(*) AS total_tasks,
  SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done_count,
  SUM(CASE WHEN status != 'done' THEN 1 ELSE 0 END) AS open_count,
  ROUND(100.0 * SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) / NULLIF(COUNT(*),0), 1) AS pct_complete,
  SUM(CASE WHEN due_date IS NOT NULL THEN 1 ELSE 0 END) AS tasks_with_due,
  SUM(CASE WHEN recurrence IS NOT NULL THEN 1 ELSE 0 END) AS recurring_tasks
FROM tasks;

DROP VIEW IF EXISTS tasks_overview_by_project;
CREATE VIEW tasks_overview_by_project AS
SELECT
  COALESCE(project, '(none)') AS project,
  COUNT(*) AS task_count,
  SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done_count,
  ROUND(100.0 * SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) / NULLIF(COUNT(*),0), 1) AS pct_done
FROM tasks
GROUP BY project;

DROP VIEW IF EXISTS tasks_overview_by_priority;
CREATE VIEW tasks_overview_by_priority AS
SELECT priority, COUNT(*) AS cnt
FROM tasks
GROUP BY priority;
