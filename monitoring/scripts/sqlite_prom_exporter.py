#!/usr/bin/env python3
"""Simple Prometheus exporter that reads metrics from a SQLite tasks DB.

Exposes metrics on :9100/metrics. Intended for local Grafana+Prometheus demos.
"""

from __future__ import annotations
import argparse
import sqlite3
import time
import threading
from prometheus_client import start_http_server, Gauge
from pathlib import Path

# metrics
M_TOTAL = Gauge("tasks_total", "Total number of tasks")
M_OPEN = Gauge("tasks_open", "Number of open (not done) tasks")
M_WITH_DUE = Gauge("tasks_with_due", "Number of tasks with a due_date")
M_RECURRING = Gauge("tasks_recurring", "Number of recurring tasks")
M_DUE_NEXT_7D = Gauge("tasks_due_next_7d", "Tasks due in next 7 days")
M_OVERDUE = Gauge("tasks_overdue", "Open tasks past due")


def collect_once(db_path: Path):
    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM tasks")
    M_TOTAL.set(cur.fetchone()[0])

    cur.execute("SELECT COUNT(*) FROM tasks WHERE status != 'done'")
    M_OPEN.set(cur.fetchone()[0])

    cur.execute("SELECT COUNT(*) FROM tasks WHERE due_date IS NOT NULL")
    M_WITH_DUE.set(cur.fetchone()[0])

    cur.execute("SELECT COUNT(*) FROM tasks WHERE recurrence IS NOT NULL")
    M_RECURRING.set(cur.fetchone()[0])

    cur.execute(
        "SELECT COUNT(*) FROM tasks WHERE status != 'done' AND date(due_date) BETWEEN date('now') AND date('now','+7 days')"
    )
    M_DUE_NEXT_7D.set(cur.fetchone()[0])

    cur.execute(
        "SELECT COUNT(*) FROM tasks WHERE status != 'done' AND due_date IS NOT NULL AND datetime(due_date) < datetime('now')"
    )
    M_OVERDUE.set(cur.fetchone()[0])

    conn.close()


def updater(db_path: Path, interval: int):
    while True:
        try:
            collect_once(db_path)
        except Exception as e:
            print("exporter error:", e)
        time.sleep(interval)


def main(argv=None):
    p = argparse.ArgumentParser()
    p.add_argument("--db", default="/var/lib/grafana/data/tasks.sqlite")
    p.add_argument("--port", type=int, default=9100)
    p.add_argument("--interval", type=int, default=15)
    args = p.parse_args(argv)

    db_path = Path(args.db)
    if not db_path.exists():
        raise SystemExit(f"DB not found: {db_path}")

    start_http_server(args.port)
    thread = threading.Thread(
        target=updater, args=(db_path, args.interval), daemon=True
    )
    thread.start()
    print(
        f"sqlite_exporter: serving metrics on :{args.port}, polling DB {db_path} every {args.interval}s"
    )
    try:
        while True:
            time.sleep(3600)
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    raise SystemExit(main())
