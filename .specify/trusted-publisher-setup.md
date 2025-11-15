# npm Trusted Publisher Setup Guide

This document walks through establishing OIDC-based trusted publishing for `@orb-zone/dotted-json` on npm. This eliminates the need for long-lived npm tokens and provides automatic provenance attestation.

## Overview

**Trusted Publishing** uses OpenID Connect (OIDC) to create short-lived, cryptographically-signed tokens that are generated on-demand during your GitHub Actions workflow. This is more secure than traditional npm tokens because:

- ✅ No long-lived tokens that can be compromised
- ✅ Automatic provenance attestation (cryptographic proof of origin)
- ✅ Workflow-specific credentials (can't be reused elsewhere)
- ✅ Automatic token management (no manual rotation needed)

## Requirements

- [x] GitHub repository: `orb-zone/dotted-json` (public)
- [x] npm CLI version: 11.5.1 or later (auto-installed in CI)
- [x] Workflow file: `.github/workflows/release.yml`
- [x] Workflow has `id-token: write` permission (already configured ✓)
- [ ] npm package published at least once
- [ ] npm organization access (verify you can access `@orb-zone` settings)

## Step 1: Create/Verify npm Package

If you haven't published `@orb-zone/dotted-json` to npm yet, you need to:

```bash
# Ensure you're authenticated
npm login

# Publish the package once (can be any version)
npm publish --access public
```

Once published, you can configure trusted publishers.

## Step 2: Add Trusted Publisher on npmjs.com

1. **Navigate to npm package settings**:
   - Visit: https://www.npmjs.com/package/@orb-zone/dotted-json
   - Click your profile → "Packages" → `@orb-zone/dotted-json`
   - Go to the "Settings" tab

2. **Find "Trusted Publisher" section**:
   - Look for "Publishing" or "Security" section
   - Click "Add a Trusted Publisher" or "Trusted Publisher"

3. **Configure GitHub Actions**:
   - Select **GitHub Actions** as the provider
   - Fill in the form:
     - **Organization or user**: `orb-zone`
     - **Repository**: `dotted-json`
     - **Workflow filename**: `release.yml` (include `.yml` extension)
     - **Environment name**: (leave blank - we don't use GitHub environments)

4. **Save configuration**:
   - npm doesn't validate the configuration until first use
   - The settings take effect immediately for future publishes

## Step 3: Verify Workflow Configuration

Your workflow at `.github/workflows/release.yml` already has the required configuration:

```yaml
permissions:
  contents: read
  id-token: write  # Required for npm OIDC trusted publishing
```

The npm publish step no longer needs the `NODE_AUTH_TOKEN`:

```yaml
- name: Publish to NPM
  run: npm publish --access public
  # NO environment variable needed - npm auto-detects OIDC
```

✅ This is already done in the updated workflow.

## Step 4: Test Trusted Publisher

1. **Create a test tag** (optional but recommended):
   ```bash
   git tag v1.4.2
   git push origin v1.4.2
   ```

2. **Watch the GitHub Actions workflow**:
   - Go to: https://github.com/orb-zone/dotted-json/actions
   - Click the "Release" workflow run
   - Monitor the `publish-npm` job

3. **Expected behavior**:
   - GitHub Actions generates an OIDC token
   - npm validates it and publishes
   - No npm tokens are used (you'll see no token in logs)

4. **If it fails**:
   - Check npm configuration matches exactly (case-sensitive filename!)
   - Verify package is published on npm
   - Check workflow has `id-token: write` permission
   - See troubleshooting section below

## Step 5: Verify Provenance (Optional but Recommended)

When publishing via trusted publishing from a public repository:

1. **Provenance is automatic** - npm generates it automatically, no extra flags needed
2. **View provenance**:
   - Go to package page: https://www.npmjs.com/package/@orb-zone/dotted-json/v/1.4.2
   - Look for "Provenance" badge/link on the right sidebar
   - View cryptographic proof of build origin

3. **Disable if needed** (not recommended):
   ```yaml
   # In workflow, set environment variable:
   - name: Publish to NPM
     run: npm publish --access public
     env:
       NPM_CONFIG_PROVENANCE: false
   ```

## Step 6: Restrict Token Access (Maximum Security)

Once trusted publishing is working, restrict traditional token-based publishing:

1. **Navigate to package settings** on npmjs.com
2. **Find "Publishing access"** section
3. **Select**: "Require two-factor authentication and disallow tokens"
4. **Save changes**

This ensures only GitHub Actions workflows can publish, completely eliminating token-based access.

## Troubleshooting

### "Unable to authenticate" Error

**Cause**: npm configuration doesn't match npmjs.com settings

**Check**:
1. Workflow filename must match exactly (case-sensitive):
   - Configured: `release.yml`
   - Actual file: `.github/workflows/release.yml`
   - File extension must be `.yml` or `.yaml`

2. Ensure the workflow file exists at correct path
3. Verify organization and repository names match
4. npm CLI must be 11.5.1 or later

**Solution**:
```yaml
# In workflow, verify setup-node step:
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20'
    registry-url: 'https://registry.npmjs.org'

# Ensure npm is up to date (setup-node should do this)
```

### `id-token: write` Permission Missing

**Error**: OIDC token generation fails

**Solution**: Ensure workflow has permissions configured:

```yaml
permissions:
  contents: read
  id-token: write  # REQUIRED
```

### Workflow Works Locally but Fails in GitHub Actions

**Cause**: Local npm token takes precedence over OIDC

**Solution**: GitHub Actions will only use OIDC if no token is present. Ensure:
1. No `NODE_AUTH_TOKEN` environment variable in publish step
2. No `.npmrc` file with auth tokens checked in
3. No npm login stored in workflow environment

## Security Best Practices

### ✅ Do This

- Use trusted publishing for all CI/CD publishes
- Restrict token access after setting up trusted publishers
- Use read-only tokens only for installing dependencies:
  ```yaml
  - name: Install dependencies
    run: npm ci
    env:
      NODE_AUTH_TOKEN: ${{ secrets.NPM_READ_TOKEN }}  # Read-only token
  ```

### ❌ Don't Do This

- Don't commit npm tokens to git (even in private repos)
- Don't use publish tokens for installation
- Don't leave legacy tokens active after setting up trusted publishing
- Don't publish from local machine if using trusted publishing for CI

## Additional Resources

- [npm Trusted Publishing Docs](https://docs.npmjs.com/trusted-publishers)
- [GitHub OIDC Documentation](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [npm Provenance Docs](https://docs.npmjs.com/generating-provenance-statements)
- [OpenSSF Trusted Publishers Spec](https://repos.openssf.org/trusted-publishers-for-all-package-repositories)

## Next Steps

1. Ensure your package is published on npm at least once
2. Follow Step 2 above to configure trusted publisher on npmjs.com
3. Test by creating a version tag and pushing it
4. Once verified, restrict token access for maximum security

---

**Status**: Implementation ready (2025-11-15)  
**Workflow File**: `.github/workflows/release.yml`  
**Package**: `@orb-zone/dotted-json` (npm)  
**Related**: JSR trusted publishing already configured via JSR's native OIDC support
