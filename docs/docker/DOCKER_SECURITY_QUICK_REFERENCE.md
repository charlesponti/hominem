# Docker Security Quick Reference

## Files Modified/Created

| File                  | Purpose                                    |
| --------------------- | ------------------------------------------ |
| `.dockerignore`       | Prevents sensitive files from Docker build |
| `Dockerfile`          | Hardened multi-stage production build      |
| `DOCKER_SECURITY.md`  | Comprehensive security documentation       |
| `SECURITY_CHANGES.md` | Summary of improvements made               |

## Key Security Improvements

### ✅ Environment Variables Protected

- `.env` files are NOT copied into image
- Pass secrets at runtime via orchestration platform
- Never hardcode secrets in Dockerfile/Compose

### ✅ Non-Root User

- App runs as `hominem` user (UID 1001)
- No shell access (`/sbin/nologin`)
- Cannot escalate privileges

### ✅ Multi-Stage Build

- Builder stage: Has all build tools
- Release stage: Only runtime dependencies
- Final image ~50% smaller, much more secure

### ✅ Minimal Dependencies

- Only 2 security packages: `ca-certificates`, `curl`
- No package managers in final image
- No development tools or source maps

### ✅ Restrictive Permissions

- Directories: `755`
- Files: `644`
- Logs/Temp: `700` (owner only)

## How to Deploy Safely

### Option 1: Environment File (Recommended for Docker Compose)

```bash
# 1. Create secure env file on host
sudo nano /etc/hominem/api.env
sudo chmod 600 /etc/hominem/api.env
sudo chown root:root /etc/hominem/api.env

# 2. Reference in docker-compose.yml
services:
  api:
    image: hominem-api:latest
    env_file:
      - /etc/hominem/api.env
```

### Option 2: Docker Secrets (Docker Swarm)

```bash
# 1. Create secrets
echo "db_password" | docker secret create database_password -
echo "api_key" | docker secret create openai_api_key -

# 2. Reference in compose
services:
  api:
    secrets:
      - database_password
      - openai_api_key
```

### Option 3: Kubernetes Secrets

```bash
# 1. Create secrets
kubectl create secret generic api-secrets \
  --from-literal=DATABASE_URL=postgresql://... \
  --from-literal=OPENAI_API_KEY=...

# 2. Reference in deployment spec
env:
  - name: DATABASE_URL
    valueFrom:
      secretKeyRef:
        name: api-secrets
        key: DATABASE_URL
```

## Verification Checklist

Before deploying to production, verify:

```bash
# ✅ No .env files in image
docker run --rm myimage:latest find / -name "*.env*" 2>/dev/null | wc -l
# Expected output: 0

# ✅ Running as non-root (should fail)
docker run --rm --user 0 myimage:latest id
# Expected: fails with "permission denied"

# ✅ Minimal packages installed
docker run --rm myimage:latest apt list --installed 2>/dev/null | wc -l
# Expected output: < 50

# ✅ No world-readable sensitive files
docker run --rm myimage:latest find /app -type f -perm /022 2>/dev/null
# Expected output: empty

# ✅ No .git or docs in image
docker run --rm myimage:latest find / -name ".git" -o -name "docs" 2>/dev/null
# Expected output: empty
```

## Vulnerability Scanning

```bash
# Scan image for known vulnerabilities
trivy image hominem-api:latest
grype hominem-api:latest
docker scout cves hominem-api:latest
```

## Common Mistakes to Avoid

❌ **DON'T**: Hardcode secrets in Dockerfile or docker-compose.yml
❌ **DON'T**: Commit `.env` files to git
❌ **DON'T**: Use `docker build --build-arg SECRET=value`
❌ **DON'T**: Run container as root (`USER root`)
❌ **DON'T**: Copy entire repository into image
❌ **DON'T**: Include test/docs/dev files in production image
❌ **DON'T**: Use `:latest` tag without image scanning

✅ **DO**: Use secret management platform (Vault, AWS Secrets, etc.)
✅ **DO**: Add secrets to `.gitignore`
✅ **DO**: Use environment files or orchestration secrets
✅ **DO**: Run as non-root user
✅ **DO**: Use multi-stage builds
✅ **DO**: Exclude development files with `.dockerignore`
✅ **DO**: Scan images before deploying
✅ **DO**: Use specific version tags

## Production Docker Compose Template

```yaml
version: '3.8'

services:
  api:
    image: hominem-api:latest
    pull_policy: always
    restart: unless-stopped

    environment:
      NODE_ENV: production
      PORT: 3000

    # Load secrets from external file
    env_file:
      - /etc/hominem/api.env

    # Security options
    security_opt:
      - no-new-privileges:true

    # Read-only filesystem
    read_only_root_filesystem: true
    tmpfs:
      - /tmp
      - /app/logs

    # Drop unnecessary capabilities
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE

    # Resource limits
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M

    # Health check
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3000/api/status']
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s
```

## Troubleshooting

### App can't write to files

- Ensure non-root user has write permissions to necessary directories
- Use `tmpfs` for temporary logs/cache
- Check `.dockerignore` isn't excluding needed config files

### Image still contains test files

- Update `.dockerignore` and rebuild
- Check that `COPY` commands in Dockerfile are specific (not `COPY . .`)
- Verify `.dockerignore` uses correct glob patterns

### Secrets not accessible

- Verify `env_file` path is correct and readable by docker daemon
- Check file permissions: should be `600`
- Ensure secrets file is on host machine, not in compose file

### Container won't start

- Check logs: `docker logs <container>`
- Verify all required env vars are provided
- Test image locally: `docker run -e VAR=value myimage:latest`

## References

- [Full Documentation](./DOCKER_SECURITY.md)
- [Detailed Changes](./SECURITY_CHANGES.md)
- [CIS Docker Benchmark](https://www.cisecurity.org/benchmark/docker)
- [OWASP Container Security](https://cheatsheetseries.owasp.org/cheatsheets/Container_Security_Cheat_Sheet.html)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
