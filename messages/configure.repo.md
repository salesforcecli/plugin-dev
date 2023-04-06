# summary

Configure a GitHub repo for the GitHub Actions pipeline.

# description

Sets up labels and exempts the CLI bot for branch protection and PR rules.

# flags.repository.summary

GitHub owner/repo for which you want to configure GitHub Actions.

# flags.dryRun.summary

Make no changes.

# examples

- Configure the repo "tesetPackageRelease", with owner "salesforcecli", for GitHub Actions.

  <%= config.bin %> <%= command.id %> --repository salesforcecli/testPackageRelease

# flags.bot.summary

GitHub login/username for the bot.
