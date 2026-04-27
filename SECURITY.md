# Security policy

Thank you for taking the time to look at the security of this project. This is a solo, volunteer-maintained repository, so please read the scope notes below before reporting — they should save us both time.

## Reporting a vulnerability

Please report vulnerabilities **privately** via GitHub's built-in advisory system:

1. Go to the [Security tab](../../security) of this repository.
2. Click **Report a vulnerability**.
3. Fill in the form. Your report is visible only to the maintainer.

Please **do not** open a public issue or pull request that describes the vulnerability before it has been fixed.

## What to expect

- **Acknowledgement:** I aim to acknowledge reports within 14 days.
- **Triage:** for in-scope reports I will give an initial assessment within 21 days.
- **Fix:** timing depends on severity and complexity. I'll keep you updated through the advisory thread.
- **Disclosure:** once a fix is in place I will publish a GitHub security advisory. Reporters are credited by name (or handle) unless they ask not to be.

This is a personal project maintained in spare time, so please be patient if a response takes longer than the windows above.

## Scope

The following parts of the repository are in scope:

- The bundled `index.html` and the source files in `src/` that produce it.
- The Python build and fetch scripts in `scripts/`.
- The GitHub Actions workflows in `.github/workflows/`.
- The Python dependencies declared in `requirements.txt` and `requirements-dev.txt`.
- Any secrets configured for this repository's GitHub Actions.

Examples of in-scope reports:

- A way for the build pipeline to inject attacker-controlled content into the rendered `index.html`.
- A vulnerable Python dependency that `pip-audit` did not flag.
- A misconfigured GitHub Actions workflow that could be abused (for example, an excessive `permissions:` block, or a step that runs untrusted input).
- An exposed credential, token, or API key.

## Out of scope

The following are **not** vulnerabilities in this repository, and should be reported to the relevant upstream project instead:

- **Accuracy or content of the upstream data.** The data is published by the UK Home Office on gov.uk and by the IOM Missing Migrants Project. Please report data issues to those publishers.
- **React, ReactDOM, Babel standalone, and Google Fonts** — these load from CDNs at runtime. Vulnerabilities in those projects belong to their maintainers.
- **Third-party hosting** (e.g. GitHub Pages itself, GitHub Actions infrastructure). Report those to GitHub.
- **Issues that require physical access to a maintainer's machine, or a fully compromised maintainer account.** These are taken seriously but are out of scope of a public reporting process.
- **Best-practice or hardening suggestions** that do not describe an exploitable issue. These are welcome as ordinary issues or pull requests, not as security advisories.

## Supported versions

Only the current `main` branch is supported. There are no tagged releases, and older commits do not receive security fixes — they are superseded as soon as `main` advances.

## Existing automated checks

For context on what the project already does to manage security automatically:

- **Dependabot** (`.github/dependabot.yml`) opens pull requests for security advisories on Python and GitHub Actions dependencies, and weekly version-bump pull requests for both.
- **`pip-audit`** runs on every push, every pull request, and weekly via `.github/workflows/security.yml`. A failing audit blocks merge.

These automated checks are not a substitute for responsible reporting — they catch known advisories, not novel issues.
