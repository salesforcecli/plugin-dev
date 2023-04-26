# summary

Ensures a GitHub repo has correct access to secrets based on its workflows.

# description

Inspects a repo's yaml files and verifies that secrets required are available for the repo (either set at the repo level or shared via organization-level secrets).

This command requires scope:admin permissions to inspect the org secrets and admin access to the repo to inspect the repo secrets.

# flags.repository.summary

Github owner/repo.

# flags.dryRun.summary

Make no changes.

# examples

- Ensure secrets access for the repo "testPackageRelease", with owner "salesforcecli":

- <%= config.bin %> <%= command.id %> --repository salesforcecli/testPackageRelease
