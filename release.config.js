export default {
  branches: [
    "main",
    { name: "alpha", prerelease: true },
    { name: "beta", prerelease: true },
    { name: "canary-*", prerelease: true, channel: "canary" },
  ],
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/npm",
    [
      "@semantic-release/changelog",
      {
        changelogTitle:
          "# Changelog\n\nAll notable changes to this project will be documented in this file. See\n[Conventional Commits](https://conventionalcommits.org) for commit guidelines.",
      },
    ],
    [
      "@semantic-release/github",
      // Workaround for rate limit issue on github
      // https://github.com/semantic-release/semantic-release/issues/2204#issuecomment-2154938064
      {
        successComment: false,
        failTitle: false,
      },
    ],
  ],
}
