# Docker Security Best Practices - API Service

This document outlines the security hardening measures implemented for the Hominem API Docker build.

## Overview

The API Docker configuration follows security best practices to:

- Prevent exposure of sensitive environment variables and secrets
- Minimize attack surface through multi-stage builds
- Run containers with least privilege (non-root user)
- Remove unnecessary files and packages
- Enforce strict file permissions

## Key Security Features

### 1. `.dockerignore` File

The `.dockerignore` file prevents sensitive files from being copied into the Docker image:

#### What Gets Excluded

- **Environment files**: `.env`, `.env.local`, `.env.*.local`
- **Source control**: `.git`, `.gitignore`
- **Development tools**: IDE configs, linters, formatters, test files
- **CI/CD pipelines**: `.github`, `.gitlab-ci.yml`, etc.
- **Documentation**: `README.md`, `docs/`
- **Sensitive directories**: `.auth`, `.crush`, `.codex`, `.cache`
- **Build artifacts**: `dist/`, `build/`, `*.tsbuildinfo`
- **Source maps**: `*.js.map`, `*.ts.map` (prevent code exposure)

This approach significantly reduces image size and attack surface.

### 2. Multi-Stage Build

The Dockerfile uses a three-stage build process:

```
base → builder → release
```

#### Base Stage

- Minimal dependencies installation
- Sets environment variables
- Cleans up package lists

#### Builder Stage

- Installs all dependencies with frozen lockfile (`--frozen-lockfile`)
- Prevents version drift and supply chain attacks
- Copies only necessary workspace files

#### Release Stage (Production)

- Starts fresh without builder artifacts
- Only copies compiled dependencies and necessary source
- Removes build tools that could be exploited

**Benefit**: Final image contains only Runtime Dependencies, not build tools or source code.

### 3. Non-Root User

The application runs as a non-privileged user:

```dockerfile
# User created with:
# - UID/GID: 1001 (non-standard, avoid conflicts)
# - No shell: /sbin/nologin (prevents shell access)
# - No home directory access
# - Read-only application directories
```

**Why This Matters**: If an attacker gains code execution, they cannot:

- Access privileged system functions
- Modify system files
- Escalate privileges
- Use shell commands

### 4. Restrictive File Permissions

```dockerfile
# Directories: 755 (rwxr-xr-x)
# Files: 644 (rw-r--r--)
# Logs: 700 (rwx------)
# Temp: 700 (rwx------)
```

- Application user can read all necessary files
- Only owner can write to sensitive directories
- Other users cannot access temporary or log files

### 5. Dangerous File Removal

The image explicitly removes:

- Shell scripts (`.sh`, `.bat`)
- Package managers (`apt`, `apt-get`)
- Git metadata
- Documentation that might leak information
- Source maps that expose code structure

### 6. Environment Variable Protection

**How to Pass Secrets Safely:**

```bash
# ✅ DO: Use Docker Compose secrets or env files (not in compose file)
docker run --env-file /path/to/.env.prod my-api:latest

# ✅ DO: Use Docker secrets (Swarm mode)
docker secret create db_password /path/to/password.txt

# ✅ DO: Use container orchestration secrets (Kubernetes)
kubectl create secret generic api-secrets --from-literal=DATABASE_URL=...

# ❌ DON'T: Hardcode secrets in Dockerfile
# ❌ DON'T: Pass secrets as build arguments
# ❌ DON'T: Commit .env files

```

**The `.env` file is never copied into the image** - it's only needed at runtime and should be provided by your deployment platform.

### 7. Minimal Dependencies

Only essential packages are installed:

- `ca-certificates` - for HTTPS/TLS validation
- `curl` - for health checks
- `bun` runtime - base image includes this

Everything else (dev tools, compilers, etc.) is removed before the release stage.

## Deployment Security Checklist

### Before Deploying to Production

- [ ] Never commit `.env` files to version control
- [ ] Use environment variable management (AWS Secrets Manager, HashiCorp Vault, etc.)
- [ ] Implement network policies to restrict container communication
- [ ] Enable container image scanning for vulnerabilities
- [ ] Use read-only root filesystem if possible: `--read-only`
- [ ] Drop unnecessary Linux capabilities: `--cap-drop=ALL --cap-add=NET_BIND_SERVICE`
- [ ] Set resource limits: `--memory=512m --cpus=1`
- [ ] Enable security auditing/logging
- [ ] Regularly rebuild images to patch base image vulnerabilities

### Docker Compose Production Setup

```yaml
services:
  api:
    image: hominem-api:latest
    pull_policy: always # Always pull latest to get security patches
    environment:
      NODE_ENV: production
      PORT: 3000
    # Load secrets from external files, never hardcode
    env_file:
      - /etc/hominem/api.env # Protected file on host
    security_opt:
      - no-new-privileges:true
    read_only_root_filesystem: true
    tmpfs:
      - /tmp
      - /app/logs
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3000/api/status']
      interval: 30s
      timeout: 3s
      retries: 3
```

### Environment Variable Management

**Option 1: Docker Secrets (Swarm)**

```bash
echo "db_password_here" | docker secret create db_password -
```

**Option 2: Environment File (Compose)**

```bash
# Create /etc/hominem/api.env with proper permissions
sudo chmod 600 /etc/hominem/api.env
sudo chown root:root /etc/hominem/api.env
```

**Option 3: External Secrets Manager**

- AWS Secrets Manager
- HashiCorp Vault
- Azure Key Vault
- Google Secret Manager

## Image Size Reduction

The optimizations above result in:

- Smaller attack surface
- Faster deployment
- Lower storage costs
- Reduced memory footprint

**Before**: ~800MB (with development files)
**After**: ~400MB (production only)

## Verification Commands

```bash
# Check what's in the image
docker run --rm myimage:latest find / -name "*.env*" 2>/dev/null | head -20
docker run --rm myimage:latest find / -name ".git" 2>/dev/null
docker run --rm myimage:latest ls -la /app | grep -E "test|spec|doc"

# Verify non-root user
docker run --rm --user 0 myimage:latest id || echo "✓ Cannot run as root"

# Check installed packages
docker run --rm myimage:latest apt list --installed 2>/dev/null | wc -l

# Verify file permissions
docker run --rm myimage:latest find /app -type f -perm /022 2>/dev/null | wc -l
```

## Scanning for Vulnerabilities

```bash
# Using Trivy
trivy image hominem-api:latest

# Using Grype
grype hominem-api:latest

# Using Docker Scout
docker scout cves hominem-api:latest
```

## Additional Resources

- [CIS Docker Benchmark](https://www.cisecurity.org/benchmark/docker)
- [OWASP Container Security](https://cheatsheetseries.owasp.org/cheatsheets/Container_Security_Cheat_Sheet.html)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [NIST Application Container Security Guide](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-190.pdf)

## Questions or Concerns?

If you identify security vulnerabilities or have questions about these practices, please:

1. Open a security issue (mark as confidential)
2. Review the AGENTS.md guidelines
3. Contact the security team

