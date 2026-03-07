# API Service Deployment Checklist

Use this checklist to ensure your Hominem API deployment is secure and properly configured.

## Phase 1: Pre-Deployment Security Review

### Code & Dependencies

- [ ] All code changes reviewed and approved
- [ ] No sensitive data (secrets, API keys) committed to git
- [ ] `.env` file added to `.gitignore`
- [ ] Dependencies up-to-date: `bun update`
- [ ] Run security audit: `npm audit` / `bun audit`
- [ ] No test files or development-only dependencies in bundle

### Docker Image

- [ ] Review latest `Dockerfile` changes
- [ ] Verify `.dockerignore` excludes all sensitive files
- [ ] Build image locally: `docker build -t hominem-api:test .`
- [ ] Verify image size is reasonable (~400MB or less)
- [ ] No `.env` files in image: `docker run --rm image:test find / -name "*.env" 2>/dev/null`

### Documentation

- [ ] Update README with deployment instructions
- [ ] Review DOCKER_SECURITY.md for deployment approach
- [ ] Document any custom security configurations
- [ ] Brief team on security changes and why they matter

## Phase 2: Environment Preparation

### Secret Management Setup

Choose ONE approach (not multiple):

#### Option A: Environment File (Docker Compose)

- [ ] Create secure file: `/etc/hominem/api.env`
- [ ] Set restrictive permissions: `chmod 600 /etc/hominem/api.env`
- [ ] Set ownership: `chown root:root /etc/hominem/api.env`
- [ ] Add all required environment variables:
  - [ ] `DATABASE_URL`
  - [ ] `OPENAI_API_KEY`
  - [ ] `COOKIE_SECRET`
  - [ ] `BETTER_AUTH_SECRET`
  - [ ] `AUTH_CAPTCHA_SECRET_KEY`
  - [ ] `TWITTER_CLIENT_SECRET`
  - [ ] `R2_SECRET_ACCESS_KEY`
  - [ ] `RESEND_API_KEY`
  - [ ] `APPLE_CLIENT_SECRET`
  - [ ] `GOOGLE_CLIENT_SECRET`
  - [ ] `PLAID_API_KEY`
  - [ ] `PLAID_WEBHOOK_SECRET`
  - [ ] All other sensitive variables
- [ ] Test file is readable only by owner: `ls -la /etc/hominem/api.env`
- [ ] File is NOT readable by group or others

#### Option B: Docker Secrets (Swarm)

- [ ] Initialize Docker Swarm: `docker swarm init`
- [ ] Create secrets for each sensitive variable:
  - [ ] `docker secret create database_password -`
  - [ ] `docker secret create openai_api_key -`
  - [ ] (Repeat for all secrets)
- [ ] Store secret reference file in secure location with backup

#### Option C: Kubernetes Secrets

- [ ] Create namespace: `kubectl create namespace hominem`
- [ ] Create secret: `kubectl create secret generic api-secrets -n hominem --from-literal=...`
- [ ] Verify secret created: `kubectl get secrets -n hominem`
- [ ] Set RBAC policies to restrict access

#### Option D: External Secrets Manager

- [ ] Configure access to secrets manager (AWS/Vault/Azure/GCP)
- [ ] Test connectivity to secrets manager
- [ ] Verify service account/IAM permissions
- [ ] Document secret rotation procedure

### Database Setup

- [ ] Database server running and accessible
- [ ] Database created: `hominem`
- [ ] Database user created with limited permissions
- [ ] Connection string tested: `psql $DATABASE_URL`
- [ ] Backups configured and tested
- [ ] Point-in-time recovery tested

### Redis Setup (if used)

- [ ] Redis server running
- [ ] Connection tested: `redis-cli ping`
- [ ] Password/auth configured (if required)
- [ ] Memory limits set appropriately
- [ ] AOF (append-only file) enabled for persistence

### External Services

- [ ] Plaid credentials verified
- [ ] OpenAI API key tested
- [ ] Resend email service configured
- [ ] S3/R2 storage credentials verified
- [ ] OAuth providers configured (Twitter, Google, Apple)
- [ ] Webhooks configured (if applicable)

## Phase 3: Docker Image Preparation

### Image Build & Validation

- [ ] Build production image: `docker build -t hominem-api:1.0.0 .`
- [ ] Tag with registry: `docker tag hominem-api:1.0.0 registry.example.com/hominem-api:1.0.0`
- [ ] Push to registry: `docker push registry.example.com/hominem-api:1.0.0`

### Security Verification

Run these commands to verify security:

```bash
# Verify no .env files
docker run --rm image:tag find / -name "*.env*" 2>/dev/null | wc -l
# Expected: 0

# Verify non-root user (should fail)
docker run --rm --user 0 image:tag id
# Expected: error/permission denied

# Verify minimal packages
docker run --rm image:tag apt list --installed 2>/dev/null | wc -l
# Expected: < 50

# Verify no git metadata
docker run --rm image:tag find / -name ".git" 2>/dev/null | wc -l
# Expected: 0

# Verify no dangerous files
docker run --rm image:tag find / -name "*.sh" -o -name "apt*" 2>/dev/null
# Expected: minimal/none outside node_modules
```

Verification Results:

- [ ] No .env files found
- [ ] Cannot run as root user
- [ ] Fewer than 50 packages installed
- [ ] No .git metadata present
- [ ] No dangerous files present

### Vulnerability Scanning

- [ ] Run Trivy scan: `trivy image registry.example.com/hominem-api:1.0.0`
- [ ] Run Grype scan: `grype registry.example.com/hominem-api:1.0.0`
- [ ] Address HIGH/CRITICAL vulnerabilities
- [ ] Document any accepted LOW/MEDIUM vulnerabilities with justification
- [ ] Save scan reports for audit trail

### Image Testing

- [ ] Start container: `docker run -d -p 3000:3000 --env-file test.env image:tag`
- [ ] Health check passes: `curl http://localhost:3000/api/status`
- [ ] API responds: `curl http://localhost:3000/docs`
- [ ] Test authentication endpoint
- [ ] Test at least one main API endpoint
- [ ] Verify logs are being written correctly
- [ ] Stop test container: `docker stop <container>`

## Phase 4: Deployment Infrastructure

### Docker Compose (If Using)

- [ ] `docker-compose.yml` uses environment file (not hardcoded secrets)
- [ ] Resource limits configured (memory, CPU)
- [ ] Health checks configured
- [ ] Logging driver configured
- [ ] Restart policy set to `unless-stopped`
- [ ] Networks properly isolated
- [ ] Volumes (if any) properly configured

```yaml
# Example secure docker-compose.yml
services:
  api:
    image: registry.example.com/hominem-api:1.0.0
    pull_policy: always
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3000
    env_file:
      - /etc/hominem/api.env
    ports:
      - '3000:3000'
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
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3000/api/status']
      interval: 30s
      timeout: 3s
      retries: 3
```

### Orchestration (If Using Kubernetes)

- [ ] Namespace created: `kubectl create namespace hominem`
- [ ] Service account created with minimal RBAC
- [ ] Secrets created: `kubectl create secret generic api-secrets -n hominem...`
- [ ] ConfigMap created for non-secret configuration
- [ ] Deployment manifest written and reviewed
- [ ] Resource limits configured
- [ ] Health probes configured (liveness, readiness)
- [ ] Service/Ingress configured
- [ ] Network policies configured (if applicable)

### Network & Security

- [ ] Firewall rules allow only necessary traffic
- [ ] API port (3000) only accessible from authorized sources
- [ ] Database port (5432) only accessible from API container
- [ ] Redis port (6379) only accessible from API container
- [ ] Rate limiting configured (if applicable)
- [ ] DDoS protection enabled (if applicable)
- [ ] WAF rules configured (if applicable)

### Monitoring & Logging

- [ ] Log aggregation setup (ELK, Datadog, etc.)
- [ ] Error tracking setup (Sentry, etc.)
- [ ] Performance monitoring setup (New Relic, etc.)
- [ ] Metrics collection configured
- [ ] Alerts configured for critical events:
  - [ ] Container crashes
  - [ ] High error rates
  - [ ] High memory/CPU usage
  - [ ] Database connection failures
  - [ ] Authentication errors

### SSL/TLS

- [ ] SSL certificate valid and not expired
- [ ] Certificate properly configured in reverse proxy/load balancer
- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] TLS 1.2+ only (TLS 1.0/1.1 disabled)
- [ ] Strong cipher suites configured
- [ ] Certificate renewal automated

## Phase 5: Pre-Deployment Testing

### Staging Environment

Deploy to staging first and verify:

- [ ] Pull image from registry successfully
- [ ] Container starts and stays running
- [ ] Health checks pass
- [ ] API endpoints respond correctly
- [ ] Database connectivity works
- [ ] External services accessible
- [ ] Authentication flow works
- [ ] Load under typical usage
- [ ] Error handling works correctly
- [ ] Logging captures important events

### Load Testing (if applicable)

- [ ] Load test with expected peak traffic
- [ ] Monitor resource usage during load
- [ ] Verify no memory leaks
- [ ] Verify no connection pool exhaustion
- [ ] Response times acceptable
- [ ] Error rates acceptable

### Penetration Testing Checklist (if applicable)

- [ ] OWASP Top 10 vulnerabilities tested
- [ ] SQL injection tested
- [ ] Authentication bypass tested
- [ ] Authorization bypass tested
- [ ] Sensitive data exposure tested
- [ ] Results documented and addressed

## Phase 6: Deployment Day

### Pre-Deployment

- [ ] Maintenance window scheduled and communicated
- [ ] Rollback plan documented and tested
- [ ] Team members on standby
- [ ] Communication channels open (Slack, etc.)
- [ ] Monitoring dashboards open and watched

### Deployment Steps

- [ ] Stop old API containers (if applicable)
- [ ] Pull latest image: `docker pull registry/hominem-api:1.0.0`
- [ ] Start new containers: `docker-compose up -d`
- [ ] Verify containers are running: `docker-compose ps`
- [ ] Check logs for errors: `docker-compose logs -f api`
- [ ] Health checks passing: `curl http://localhost:3000/api/status`
- [ ] API responding correctly: `curl http://localhost:3000/docs`

### Post-Deployment Verification

- [ ] All containers running and healthy
- [ ] No error logs in application logs
- [ ] Database migrations completed (if applicable)
- [ ] API responding to requests
- [ ] Authentication working
- [ ] Key endpoints tested
- [ ] Monitoring showing normal metrics
- [ ] No spike in error rate
- [ ] No spike in response time

## Phase 7: Post-Deployment

### Monitoring First 24 Hours

- [ ] Monitor error rates (should be minimal)
- [ ] Monitor response times (should be normal)
- [ ] Monitor resource usage (should be stable)
- [ ] Monitor external service connectivity
- [ ] Check for any unexpected restart/crashes
- [ ] Review security logs
- [ ] Review authentication logs

### 72-Hour Stability Check

- [ ] No unplanned restarts
- [ ] Error rates remain low
- [ ] Performance stable
- [ ] All features working correctly
- [ ] No data integrity issues
- [ ] Backups completed successfully
- [ ] Final approval from team lead

### Documentation & Communication

- [ ] Update deployment runbook with actual results
- [ ] Document any issues encountered and resolution
- [ ] Communicate successful deployment to stakeholders
- [ ] Create post-deployment report
- [ ] Schedule retrospective (if applicable)

## Phase 8: Security Verification (Post-Deployment)

### Container Security

- [ ] Verify container running as non-root: `docker exec <container> id`
- [ ] Verify read-only filesystem: `docker exec <container> touch /test` (should fail)
- [ ] Verify no sensitive files exposed: `docker exec <container> find / -name "*.env" 2>/dev/null`
- [ ] Verify process isolation working

### Network Security

- [ ] Verify API only accessible from intended sources
- [ ] Verify database only accessible from API container
- [ ] Verify Redis only accessible from API container
- [ ] Run network security scan

### Data Security

- [ ] Database access logs review
- [ ] Verify encryption in transit (HTTPS)
- [ ] Verify encryption at rest (if configured)
- [ ] Verify no sensitive data in logs
- [ ] Verify backups encrypted and secured

### Compliance

- [ ] GDPR compliance verified (if applicable)
- [ ] SOC 2 requirements met (if applicable)
- [ ] Industry standards met (if applicable)
- [ ] Security audit scheduled (if required)

## Phase 9: Ongoing Maintenance

### Daily

- [ ] Review error logs
- [ ] Monitor performance metrics
- [ ] Check for any security alerts

### Weekly

- [ ] Review container/host security patches
- [ ] Check backup completion
- [ ] Verify monitoring and alerting working

### Monthly

- [ ] Security audit of container/image
- [ ] Review access logs
- [ ] Test disaster recovery procedure
- [ ] Update dependencies (controlled manner)

### Quarterly

- [ ] Full security assessment
- [ ] Penetration testing (if applicable)
- [ ] Review and update security policies
- [ ] Audit all external service integrations

## Rollback Procedure

If deployment fails and rollback is needed:

1. [ ] Stop new containers: `docker-compose down`
2. [ ] Pull previous version: `docker pull registry/hominem-api:previous-version`
3. [ ] Start previous containers: `docker-compose up -d`
4. [ ] Verify health: `curl http://localhost:3000/api/status`
5. [ ] Monitor logs and metrics
6. [ ] Communicate rollback to stakeholders
7. [ ] Schedule post-mortem to determine root cause

## Emergency Contacts

- **DevOps Lead**: ********\_\_\_********
- **Security Lead**: ********\_\_\_********
- **Database Admin**: ********\_\_\_********
- **API Owner**: ********\_\_\_********

## Sign-Off

Deployed by: ********\_******** Date: ****\_****

Verified by: ********\_******** Date: ****\_****

Approved by: ********\_******** Date: ****\_****

---

**Notes/Issues Encountered:**

```
[Add any issues found during deployment here]
```

**Rollback Required?** Yes / No

If yes:

- Reason: **************************\_\_\_**************************
- Rolled back to version: ******************\_\_\_******************
- Time to rollback: **********************\_\_**********************
