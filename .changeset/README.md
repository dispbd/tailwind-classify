# Changesets

This folder holds [changesets](https://github.com/changesets/changesets) —
small files describing the version bump and changelog entry for pending changes.

- Add one with `npm run changeset` and commit it with your PR.
- `npm run version-packages` applies pending changesets (bumps the version,
  writes the changelog).
- `npm run release` builds and publishes to npm.

The release workflow (`.github/workflows/release.yml`) automates the version PR
and publish on pushes to the base branch.
