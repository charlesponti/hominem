# Monitoring stack (Grafana + Prometheus)

This folder hosts the Grafana/Prometheus stack and the SQLite exporter for tasks metrics.
The stack reads from the canonical tasks DB at `~/.config/kuma
containers at `/var/lib/grafana/data/tasks.sqlite`).

## Start the stack

From `kuma/`:

```sh
docker compose up -d grafana prometheus alertmanager sqlite-exporter
```

## Verify

- Grafana: http://localhost:3000 (admin / admin)
- Prometheus: http://localhost:9090
- Alertmanager: http://localhost:9093
- SQLite exporter: http://localhost:9100/metrics

Prometheus should show the `sqlite_exporter` target as `UP`.

## Layout

- `grafana/`: dashboards and provisioning
- `prometheus/`: Prometheus + alertmanager config and rules
- `scripts/`: `sqlite_prom_exporter.py`
- `sql/`: overview SQL and views

## Notes

- The SQLite datasource provisioning expects the DB at `/var/lib/grafana/data/tasks.sqlite`.
- To change the DB path, update the bind mount in `docker-compose.yml`.
