# npm Trusted Publisher Setup Checklist

## Manual Steps (Must Do on npmjs.com)

Before running the next release, complete these npm.com steps:

### ☐ Step 1: Verify npm Package Access
- [ ] Log in to https://npmjs.com
- [ ] Navigate to your organization `@orb-zone`
- [ ] Verify you can access package settings for `@orb-zone/dotted-json`
- [ ] Confirm the package is already published

### ☐ Step 2: Add GitHub Actions as Trusted Publisher
- [ ] Go to package page: https://www.npmjs.com/package/@orb-zone/dotted-json
- [ ] Click "Settings" tab
- [ ] Find "Trusted Publisher" section
- [ ] Click "Add a Trusted Publisher" or similar button
- [ ] Select **GitHub Actions** as provider
- [ ] Enter:
  - Organization: `orb-zone`
  - Repository: `dotted-json`
  - Workflow filename: `release.yml`
  - Environment name: (leave blank)
- [ ] Save/Confirm the configuration

### ☐ Step 3: Test the Setup
- [ ] Create a test release tag (e.g., `git tag v1.4.2`)
- [ ] Push the tag: `git push origin v1.4.2`
- [ ] Monitor GitHub Actions: https://github.com/orb-zone/dotted-json/actions
- [ ] Watch the `publish-npm` job in the Release workflow
- [ ] Verify it succeeds without any `NODE_AUTH_TOKEN` errors

### ☐ Step 4: Verify Provenance
- [ ] Visit the published package version on npm
- [ ] Look for a "Provenance" badge or link
- [ ] Click to view the cryptographic proof of build origin
- [ ] Confirm it shows your GitHub repository and commit

### ☐ Step 5: (Optional) Restrict Token Access for Maximum Security
- [ ] Return to package Settings on npmjs.com
- [ ] Find "Publishing access" section
- [ ] Select: "Require two-factor authentication and disallow tokens"
- [ ] Save changes
- [ ] This locks publishing to GitHub Actions only

## Automated Changes (Already Done ✓)

These have been implemented in the workflow:

- [x] Updated `.github/workflows/release.yml`
  - [x] Added `id-token: write` permission to `publish-npm` job
  - [x] Removed `NODE_AUTH_TOKEN` environment variable
  - [x] Workflow now auto-detects OIDC tokens from GitHub Actions

## Verification Commands (Run Locally)

```bash
# Verify you can see your organization
npm org ls orb-zone

# Verify you can see the package
npm view @orb-zone/dotted-json

# Verify you have access to make changes (optional)
npm access ls-packages @orb-zone
```

## Troubleshooting During First Publish

If `npm publish` fails with "Unable to authenticate":

1. **Check configuration** - Workflow filename must match exactly (case-sensitive)
2. **Verify permissions** - Ensure `id-token: write` is set
3. **Check npm version** - Must be 11.5.1+
4. **Review npm.com settings** - Ensure trusted publisher is saved

See `.specify/trusted-publisher-setup.md` for detailed troubleshooting.

## Timeline

- **Now**: Complete manual steps 1-2 above
- **When ready**: Push test tag to trigger workflow
- **After test**: Verify provenance on npm
- **Final**: Optionally restrict token access

---

**Last Updated**: 2025-11-15  
**Next Action**: Complete Step 1 of manual steps above
