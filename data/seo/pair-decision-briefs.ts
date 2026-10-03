/**
 * Pair decision briefs - 2026-10-04.
 *
 * A brief replaces the generated comparison body (intro, side-by-side table,
 * Best for, Feature comparison, Pros and cons, Key differences, Choose-if
 * text) for one published comparison with source-backed decision content
 * written for that pair. Everything here is documentation-based: no hands-on
 * test was run, and anything a source does not state is left out.
 *
 * Rules enforced by tests/seo/pair-decision-briefs.test.ts:
 *  - a fact that carries a digit or a date must cite at least one source;
 *  - every cited source id exists, every source is cited, every source has an
 *    https URL and a ISO `checkedOn` date that is not later than `updatedAt`;
 *  - the text shares no sentence with the generated comparison copy;
 *  - the brief renders no internal links (existing links, including links to
 *    protected pages, stay exactly as the shared template renders them).
 *
 * `updatedAt` is the date the cited pages were last re-read; it feeds the
 * sitemap lastmod for this URL only. Re-read the sources and move both dates
 * together when the content is refreshed.
 */

export type BriefFact = {
  text: string;
  /** Source ids from the brief's `sources` list. */
  cite?: string[];
};

export type BriefSource = {
  id: string;
  label: string;
  url: string;
  /** ISO date (YYYY-MM-DD) the page or record was last read. */
  checkedOn: string;
  /** Scope or condition the reader needs to interpret the source. */
  note?: string;
};

export type BriefTableRow = {
  /** Row header; plain text (carries no figures). */
  label: string;
  cells: BriefFact[];
};

export type BriefBlock =
  | { kind: "prose"; heading: string; paragraphs: BriefFact[] }
  | {
      kind: "definitions";
      heading: string;
      intro?: BriefFact;
      items: { term: string; facts: BriefFact[] }[];
    }
  | {
      kind: "table";
      heading: string;
      intro?: BriefFact;
      columns: string[];
      rows: BriefTableRow[];
      footnote?: BriefFact;
    };

export type PairDecisionBrief = {
  /** Comparison slug, for example "mkdocs-vs-read-the-docs". */
  slug: string;
  updatedAt: string;
  metadata?: { title: string; description: string };
  /** First sentence(s) of the policy disclaimer card for this page. */
  disclaimerLead: string;
  blocks: BriefBlock[];
  sourcesHeading: string;
  sourcesIntro?: BriefFact;
  sources: BriefSource[];
};

const CHECKED = "2026-10-04";

const MKDOCS_VS_READ_THE_DOCS: PairDecisionBrief = {
  slug: "mkdocs-vs-read-the-docs",
  updatedAt: CHECKED,
  metadata: {
    title: "MkDocs vs Read the Docs (2026): Differences, Pricing, Status",
    description:
      "MkDocs builds docs sites; Read the Docs builds and hosts them. Compare plan prices ($0 to $250 a month), dated MkDocs status and which setup fits your team.",
  },
  disclaimerLead:
    "Facts on this page come from each project's or vendor's own documentation, release records and pricing pages, cited next to each claim, not from ratings or reviews. Products change; verify anything that matters to your decision directly with the vendor before switching.",
  blocks: [
    {
      kind: "prose",
      heading: "The short answer",
      paragraphs: [
        {
          text: "MkDocs and Read the Docs are not direct rivals. MkDocs is a static site generator: it turns Markdown files into a folder of plain HTML that you can host anywhere. Read the Docs is a service that builds documentation from a Git repository and hosts it, and its own guide covers building MkDocs projects.",
          cite: ["mkdocs-home", "rtd-mkdocs-guide"],
        },
        {
          text: "So the real choice is who runs the build and the hosting. With MkDocs alone you pick a host and arrange versioning, pull request previews and access control yourself; its built-in search runs in the browser. Read the Docs bundles builds, versioning, search, pull request previews and CDN hosting in every plan.",
          cite: ["mkdocs-getting-started", "rtd-pricing"],
        },
        {
          text: "Read the Docs is free only for open-source documentation: that service needs public repositories and public docs, and every site carries ads. Private or commercial documentation starts at $50 a month, and a custom domain starts at $150 a month.",
          cite: ["rtd-platforms", "rtd-pricing"],
        },
        {
          text: "One more fact belongs in the decision. MkDocs's latest stable release is 1.6.1, from 2024-08-30; a 2.0 rewrite exists only as pre-releases; and the Material for MkDocs theme that Read the Docs recommends is in maintenance mode, with security fixes scheduled through 2027-05-05. The dated details are below, with their sources.",
          cite: ["mkdocs-pypi", "material-releases", "material-security", "rtd-mkdocs-guide"],
        },
      ],
    },
    {
      kind: "definitions",
      heading: "Three things people mean by \"Read the Docs\"",
      intro: {
        text: "Three different things share the name, and they are easy to mix up.",
      },
      items: [
        {
          term: "The readthedocs theme",
          facts: [
            {
              text: "A built-in MkDocs theme named readthedocs, one of the two themes that ship with MkDocs (the other is mkdocs). It controls how a site looks. MkDocs builds static HTML that you can host on GitHub Pages, Amazon S3 or anywhere else, whichever theme you choose.",
              cite: ["mkdocs-home"],
            },
          ],
        },
        {
          term: "Read the Docs Community",
          facts: [
            {
              text: "The free service at readthedocs.org. It is exclusively for open-source documentation: only public Git repositories, all documentation public, and advertising from EthicalAds on every site.",
              cite: ["rtd-platforms"],
            },
            {
              text: "Build limits: 15 minutes of build time, 7 GB of memory and 2 concurrent builds.",
              cite: ["rtd-builds"],
            },
          ],
        },
        {
          term: "Read the Docs Business",
          facts: [
            {
              text: "The paid service at readthedocs.com, for commercial and non-free projects: private and public repositories, public and private documentation, with plans starting at $50 a month. Read the Docs describes Community and Business as two platforms.",
              cite: ["rtd-platforms"],
            },
          ],
        },
      ],
    },
    {
      kind: "table",
      heading: "What you assemble with MkDocs, and what Read the Docs bundles",
      columns: ["Need", "MkDocs plus a host you choose", "Read the Docs"],
      rows: [
        {
          label: "Building the site",
          cells: [
            {
              text: "You run mkdocs build, which writes a static folder named site, and upload its contents to wherever you host.",
              cite: ["mkdocs-getting-started"],
            },
            {
              text: "Builds run on Read the Docs' servers from your Git repository, configured by a .readthedocs.yaml file.",
              cite: ["rtd-mkdocs-guide", "rtd-config"],
            },
          ],
        },
        {
          label: "Versions of the docs",
          cells: [
            {
              text: "Material for MkDocs documents the third-party tool mike for versioning; each version is published to its own folder on a gh-pages branch.",
              cite: ["material-versioning"],
            },
            {
              text: "Versions come from your Git branches and tags. For a new project every version starts inactive until you activate it. The default URL layout puts versions under paths like /en/latest/.",
              cite: ["rtd-versions", "rtd-url-schemes"],
            },
          ],
        },
        {
          label: "Previewing a change",
          cells: [
            {
              text: "mkdocs serve starts a local preview server. MkDocs's deployment guide warns that mkdocs gh-deploy pushes the built site to GitHub without a chance to review it first.",
              cite: ["mkdocs-getting-started", "mkdocs-deploy"],
            },
            {
              text: "Pull request previews build the docs for each new pull request and are enabled by default on new projects.",
              cite: ["rtd-previews"],
            },
          ],
        },
        {
          label: "Search",
          cells: [
            {
              text: "The built-in search plugin runs in the browser using lunr.js.",
              cite: ["mkdocs-config"],
            },
            {
              text: "Read the Docs has its own search. For MkDocs sites that use the Material theme, its guide shows JavaScript that triggers Read the Docs search instead of the theme's default search.",
              cite: ["rtd-mkdocs-guide"],
            },
          ],
        },
        {
          label: "Hosting, domain and CDN",
          cells: [
            {
              text: "Static files can be hosted on GitHub Pages, Amazon S3 or anywhere else. The host's own price and limits apply; for example, GitHub Pages publishes limits of 1 GB per site, a soft 100 GB of bandwidth a month and a soft 10 builds an hour.",
              cite: ["mkdocs-home", "github-pages-limits"],
            },
            {
              text: "Hosting and CDN are included in every plan. A custom domain starts at the Advanced plan ($150 a month); Basic uses a shared domain.",
              cite: ["rtd-pricing"],
            },
          ],
        },
        {
          label: "Private docs and sign-in",
          cells: [
            {
              text: "Access control depends on where you host. For example, GitHub says publishing GitHub Pages privately requires an organization on GitHub Enterprise Cloud.",
              cite: ["github-pages-private"],
            },
            {
              text: "Private documentation is a Business feature. Basic and Advanced list sign-in with GitHub and GitLab, Pro adds Google, and Enterprise adds SAML, which Read the Docs documents as beta and Okta-only.",
              cite: ["rtd-platforms", "rtd-pricing", "rtd-sso"],
            },
          ],
        },
        {
          label: "Redirects and analytics",
          cells: [
            {
              text: "Not covered by the MkDocs pages cited here; they depend on your host and plugins.",
            },
            {
              text: "Redirect limits are 50, 250 and 500 on Basic, Advanced and Pro. Pageview and search analytics are kept 30 days on Advanced and 90 days on Pro.",
              cite: ["rtd-pricing"],
            },
          ],
        },
      ],
    },
    {
      kind: "table",
      heading: "What each Read the Docs plan unlocks, at list price",
      intro: {
        text: "US dollars as shown on Read the Docs' pricing page. Business plans are billed monthly; annual plans are available but their price is not published; a 30-day free trial is offered. Taxes are not stated.",
        cite: ["rtd-pricing"],
      },
      columns: ["Plan", "List price", "12 months at list", "What it adds or limits"],
      rows: [
        {
          label: "Community",
          cells: [
            { text: "$0", cite: ["rtd-pricing"] },
            { text: "$0", cite: ["rtd-pricing"] },
            {
              text: "Open-source documentation only: public repositories and public docs, with ads on every site. 15-minute builds, 7 GB of memory, 2 concurrent builds.",
              cite: ["rtd-platforms", "rtd-builds"],
            },
          ],
        },
        {
          label: "Business: Basic",
          cells: [
            { text: "$50 per month", cite: ["rtd-pricing"] },
            { text: "$600 (12 × $50)", cite: ["rtd-pricing"] },
            {
              text: "2 concurrent builds, a shared domain (no custom domain), sign-in with GitHub and GitLab, 50 redirects, 3-business-day email support.",
              cite: ["rtd-pricing"],
            },
          ],
        },
        {
          label: "Business: Advanced",
          cells: [
            { text: "$150 per month", cite: ["rtd-pricing"] },
            { text: "$1,800 (12 × $150)", cite: ["rtd-pricing"] },
            {
              text: "4 concurrent builds, 5 custom domains, GitHub and GitLab sign-in, 250 redirects, 2-business-day support, pageview and search analytics kept 30 days.",
              cite: ["rtd-pricing"],
            },
          ],
        },
        {
          label: "Business: Pro",
          cells: [
            { text: "$250 per month", cite: ["rtd-pricing"] },
            { text: "$3,000 (12 × $250)", cite: ["rtd-pricing"] },
            {
              text: "6 concurrent builds, 15 custom domains, GitHub, GitLab and Google sign-in, 500 redirects, 1-business-day support, analytics kept 90 days.",
              cite: ["rtd-pricing"],
            },
          ],
        },
        {
          label: "Enterprise",
          cells: [
            { text: "From $10,000 per year", cite: ["rtd-pricing"] },
            { text: "From $10,000", cite: ["rtd-pricing"] },
            {
              text: "SAML sign-in, dedicated builders, advanced audit tracking and a support SLA. Read the Docs documents SAML as beta and Okta-only.",
              cite: ["rtd-pricing", "rtd-sso"],
            },
          ],
        },
      ],
      footnote: {
        text: "The step from Basic to Advanced adds $100 a month ($1,200 a year) and is where a custom domain first appears. MkDocs itself is BSD-2-Clause licensed and costs nothing; what a static host costs depends on the host.",
        cite: ["rtd-pricing", "mkdocs-repo"],
      },
    },
    {
      kind: "table",
      heading: "MkDocs project status, dated",
      intro: {
        text: "Checked 2026-10-04 against PyPI and the project's repository. These are dates, not a verdict: neither MkDocs's home page nor its README carries a notice about the 1.x line's maintenance status or an end-of-life date.",
        cite: ["mkdocs-pypi", "mkdocs-repo", "mkdocs-home"],
      },
      columns: ["Item", "Date", "What the record shows"],
      rows: [
        {
          label: "Latest stable release",
          cells: [
            { text: "2024-08-30", cite: ["mkdocs-pypi"] },
            {
              text: "1.6.1. PyPI lists no later stable release, and the release notes list 1.6.1 as the newest version. That is just over 25 months without a stable release as of the check date.",
              cite: ["mkdocs-pypi", "mkdocs-release-notes"],
            },
          ],
        },
        {
          label: "2.0 pre-releases",
          cells: [
            { text: "2026-08-28 to 2026-09-15", cite: ["mkdocs-pypi"] },
            {
              text: "2.0.dev0 through 2.0.dev6 were uploaded to PyPI under the same package name. Installing 2.0 needs pip's --pre flag, its documentation is a separate site, and the 2.0 pre-release requires Python 3.10 or later.",
              cite: ["mkdocs-pypi", "mkdocs2-docs", "mkdocs2-install"],
            },
          ],
        },
        {
          label: "Latest commit on the default branch",
          cells: [
            { text: "2025-10-20", cite: ["mkdocs-commits"] },
            {
              text: "Two commits that day. The repository is not archived and is licensed BSD-2-Clause.",
              cite: ["mkdocs-commits", "mkdocs-repo"],
            },
          ],
        },
      ],
      footnote: {
        text: "A release or commit can land at any time, so re-check before relying on these dates. They describe activity, not the maintainers' plans.",
      },
    },
    {
      kind: "prose",
      heading: "The theme question: Material for MkDocs and its neighbours",
      paragraphs: [
        {
          text: "Many MkDocs sites use the Material for MkDocs theme, and Read the Docs' own MkDocs guide recommends it. Material's 9.7.6 release notice says it is in maintenance mode, and since 9.7.5 it limits the mkdocs versions it works with to below 2.",
          cite: ["rtd-mkdocs-guide", "material-releases"],
        },
        {
          text: "Its security policy says security fixes for the latest stable version continue until May 5, 2027, after which it no longer receives public security updates under standard maintenance. That policy was updated on 2026-09-15, while the 9.7.7 release notice from 2026-07-17 still says Material is scheduled to reach end of life on November 5, 2026. This page uses the policy, the later statement, and flags both dates for re-checking after 2026-11-05.",
          cite: ["material-security", "material-security-history", "material-releases"],
        },
        {
          text: "Two newer projects exist in the same space, and both are young. Zensical, from the Material team, is listed on PyPI as version 0.0.67 with an Alpha development status. ProperDocs describes itself as a continuation of MkDocs; its latest PyPI release is 1.6.7, from 2026-03-20. Neither is recommended or tested here.",
          cite: ["zensical-pypi", "properdocs-announcement", "properdocs-pypi"],
        },
        {
          text: "For a team starting today, the practical reading is to plan around dated facts: the generator's next major version is not yet a stable install, and the theme that Read the Docs' guide recommends has a published security window ending May 5, 2027.",
          cite: ["mkdocs-pypi", "material-security"],
        },
      ],
    },
    {
      kind: "table",
      heading: "Moving between the two setups",
      columns: [
        "What changes",
        "From MkDocs on your own host to Read the Docs",
        "From Read the Docs back to your own host",
      ],
      rows: [
        {
          label: "Where the build runs",
          cells: [
            {
              text: "Read the Docs' servers, configured by .readthedocs.yaml: a version, a build OS and Python version, and the path to your mkdocs.yml.",
              cite: ["rtd-mkdocs-guide", "rtd-config"],
            },
            {
              text: "Your machine or CI runs mkdocs build and uploads the site folder to your host.",
              cite: ["mkdocs-getting-started"],
            },
          ],
        },
        {
          label: "Theme and plugins",
          cells: [
            {
              text: "Install them in the build. The guide's example installs mkdocs-material in a pre-install job and recommends a requirements file for reproducible builds.",
              cite: ["rtd-mkdocs-guide"],
            },
            {
              text: "The same packages work. The Read the Docs search and version-menu additions described for Material no longer apply.",
              cite: ["rtd-mkdocs-guide"],
            },
          ],
        },
        {
          label: "URLs",
          cells: [
            {
              text: "The default layout puts versions under paths like /en/latest/, and a single-version layout exists. Moved pages need redirects; the limits are 50, 250 and 500 on Basic, Advanced and Pro.",
              cite: ["rtd-url-schemes", "rtd-pricing"],
            },
            {
              text: "Your host decides the layout. Plan redirects for the old Read the Docs paths if the address changes.",
            },
          ],
        },
        {
          label: "Canonical URL",
          cells: [
            {
              text: "Set site_url from the READTHEDOCS_CANONICAL_URL environment variable.",
              cite: ["rtd-mkdocs-guide"],
            },
            { text: "Set site_url to the new address.", cite: ["mkdocs-config"] },
          ],
        },
        {
          label: "Custom domain",
          cells: [
            {
              text: "Configured in Read the Docs; the first plan that offers one is Advanced.",
              cite: ["rtd-pricing"],
            },
            { text: "Configured at your host." },
          ],
        },
        {
          label: "Search and versions",
          cells: [
            {
              text: "The guide documents Read the Docs search and a version menu only for the Material theme.",
              cite: ["rtd-mkdocs-guide"],
            },
            {
              text: "MkDocs search is client-side again, and versions need a tool such as mike.",
              cite: ["mkdocs-config", "material-versioning"],
            },
          ],
        },
      ],
    },
    {
      kind: "table",
      heading: "Which setup fits which team",
      columns: ["If your situation is", "Better fit", "Why", "The catch"],
      rows: [
        {
          label: "Public open-source docs, and one small ad on each page is acceptable",
          cells: [
            { text: "Read the Docs Community, or MkDocs on a free static host" },
            {
              text: "Both cost $0 in plan fees. Community adds builds from Git, versions, pull request previews and search; your own host adds full control and no ads.",
              cite: ["rtd-pricing", "rtd-platforms"],
            },
            {
              text: "Community needs public repositories and public docs and has 15-minute builds. A free host's limits and terms apply.",
              cite: ["rtd-platforms", "rtd-builds", "github-pages-limits"],
            },
          ],
        },
        {
          label: "Private or commercial docs, and you want builds and hosting handled",
          cells: [
            { text: "Read the Docs Business" },
            {
              text: "Basic ($50 a month) is the entry point for private docs with GitHub or GitLab sign-in; Advanced ($150) adds a custom domain.",
              cite: ["rtd-pricing", "rtd-platforms"],
            },
            {
              text: "Seat and project limits are not published on the pricing page; billing is monthly and the annual price is not published.",
              cite: ["rtd-pricing"],
            },
          ],
        },
        {
          label: "Public docs on your own domain",
          cells: [
            { text: "Read the Docs Advanced, or MkDocs on a host you choose" },
            {
              text: "Advanced is the first Read the Docs plan with custom domains: $150 a month, $1,800 over 12 months at list. A self-hosted setup costs whatever your host charges.",
              cite: ["rtd-pricing"],
            },
            {
              text: "Community is for open-source documentation only. Check your host's terms: GitHub's Pages limits page excludes sites primarily for commercial transactions or commercial software as a service, and does not say whether product documentation counts.",
              cite: ["rtd-platforms", "github-pages-limits"],
            },
          ],
        },
        {
          label: "You need Google sign-in or SAML for readers",
          cells: [
            { text: "Read the Docs Pro for Google, Enterprise for SAML" },
            {
              text: "Pro ($250 a month) adds Google sign-in; Enterprise (from $10,000 a year) adds SAML.",
              cite: ["rtd-pricing"],
            },
            { text: "SAML is documented as beta and Okta-only.", cite: ["rtd-sso"] },
          ],
        },
        {
          label: "You already use Material for MkDocs",
          cells: [
            { text: "Either; plan around the dates" },
            {
              text: "Read the Docs builds MkDocs with Material and recommends it, but Material's security fixes are scheduled to end on May 5, 2027 and it works only with mkdocs below 2.",
              cite: ["rtd-mkdocs-guide", "material-security", "material-releases"],
            },
            {
              text: "Changing host does not change the theme's status; moving to another generator is a separate project.",
            },
          ],
        },
        {
          label: "You may change documentation tools later",
          cells: [
            { text: "Read the Docs" },
            {
              text: "It publishes deployment guides for ten documentation tools, including MkDocs, Sphinx, Docusaurus and Zensical, so changing tools does not by itself mean changing host.",
              cite: ["rtd-tools"],
            },
            { text: "A different tool needs its own build configuration.", cite: ["rtd-config"] },
          ],
        },
      ],
    },
  ],
  sourcesHeading: "Sources and re-check dates",
  sourcesIntro: {
    text: "Every source below was read on 2026-10-04. Re-check the Material dates after 2026-11-05, the MkDocs 2.0 pre-release status, and Read the Docs' prices before relying on them.",
  },
  sources: [
    { id: "mkdocs-home", label: "MkDocs: home page", url: "https://www.mkdocs.org/", checkedOn: CHECKED },
    {
      id: "rtd-mkdocs-guide",
      label: "Read the Docs: Deploying MkDocs on Read the Docs",
      url: "https://docs.readthedocs.com/platform/stable/intro/mkdocs.html",
      checkedOn: CHECKED,
    },
    {
      id: "mkdocs-getting-started",
      label: "MkDocs: Getting started",
      url: "https://www.mkdocs.org/getting-started/",
      checkedOn: CHECKED,
    },
    {
      id: "rtd-pricing",
      label: "Read the Docs: Plans and pricing",
      url: "https://about.readthedocs.com/pricing/",
      checkedOn: CHECKED,
      note: "US dollars; Business billed monthly, annual plans available (annual price not published).",
    },
    {
      id: "rtd-platforms",
      label: "Read the Docs: Choosing a platform (Community or Business)",
      url: "https://about.readthedocs.com/choosing-a-platform/",
      checkedOn: CHECKED,
    },
    {
      id: "mkdocs-pypi",
      label: "PyPI: mkdocs release history",
      url: "https://pypi.org/project/mkdocs/#history",
      checkedOn: CHECKED,
      note: "Upload dates from PyPI's JSON record for the package.",
    },
    {
      id: "material-releases",
      label: "Material for MkDocs: releases (9.7.5, 9.7.6, 9.7.7)",
      url: "https://github.com/squidfunk/mkdocs-material/releases",
      checkedOn: CHECKED,
    },
    {
      id: "material-security",
      label: "Material for MkDocs: security policy",
      url: "https://github.com/squidfunk/mkdocs-material/blob/master/SECURITY.md",
      checkedOn: CHECKED,
    },
    {
      id: "rtd-builds",
      label: "Read the Docs: Build process limits",
      url: "https://docs.readthedocs.com/platform/stable/builds.html",
      checkedOn: CHECKED,
    },
    {
      id: "rtd-config",
      label: "Read the Docs: Configuration file reference",
      url: "https://docs.readthedocs.com/platform/stable/config-file/v2.html",
      checkedOn: CHECKED,
    },
    {
      id: "material-versioning",
      label: "Material for MkDocs: Setting up versioning",
      url: "https://squidfunk.github.io/mkdocs-material/setup/setting-up-versioning/",
      checkedOn: CHECKED,
    },
    {
      id: "rtd-versions",
      label: "Read the Docs: Versions",
      url: "https://docs.readthedocs.com/platform/stable/versions.html",
      checkedOn: CHECKED,
    },
    {
      id: "rtd-url-schemes",
      label: "Read the Docs: URL versioning schemes",
      url: "https://docs.readthedocs.com/platform/stable/versioning-schemes.html",
      checkedOn: CHECKED,
    },
    {
      id: "mkdocs-deploy",
      label: "MkDocs: Deploying your docs",
      url: "https://www.mkdocs.org/user-guide/deploying-your-docs/",
      checkedOn: CHECKED,
    },
    {
      id: "rtd-previews",
      label: "Read the Docs: Pull request previews",
      url: "https://docs.readthedocs.com/platform/stable/pull-requests.html",
      checkedOn: CHECKED,
    },
    {
      id: "mkdocs-config",
      label: "MkDocs: Configuration (search plugin, site_url)",
      url: "https://www.mkdocs.org/user-guide/configuration/",
      checkedOn: CHECKED,
    },
    {
      id: "github-pages-limits",
      label: "GitHub Docs: GitHub Pages limits",
      url: "https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits",
      checkedOn: CHECKED,
    },
    {
      id: "github-pages-private",
      label: "GitHub Docs: Changing the visibility of your GitHub Pages site",
      url: "https://docs.github.com/en/enterprise-cloud@latest/pages/getting-started-with-github-pages/changing-the-visibility-of-your-github-pages-site",
      checkedOn: CHECKED,
    },
    {
      id: "rtd-sso",
      label: "Read the Docs: Single sign-on",
      url: "https://docs.readthedocs.com/platform/stable/commercial/single-sign-on.html",
      checkedOn: CHECKED,
    },
    {
      id: "mkdocs-repo",
      label: "GitHub: mkdocs/mkdocs repository",
      url: "https://github.com/mkdocs/mkdocs",
      checkedOn: CHECKED,
      note: "Archive state and license from GitHub's repository record.",
    },
    {
      id: "mkdocs-commits",
      label: "GitHub: mkdocs/mkdocs commit history (default branch)",
      url: "https://github.com/mkdocs/mkdocs/commits/master",
      checkedOn: CHECKED,
    },
    {
      id: "mkdocs-release-notes",
      label: "MkDocs: release notes",
      url: "https://www.mkdocs.org/about/release-notes/",
      checkedOn: CHECKED,
    },
    {
      id: "mkdocs2-docs",
      label: "MkDocs 2 documentation (separate site)",
      url: "https://www.encode.io/mkdocs/",
      checkedOn: CHECKED,
    },
    {
      id: "mkdocs2-install",
      label: "MkDocs 2 documentation: Installation",
      url: "https://www.encode.io/mkdocs/installation/",
      checkedOn: CHECKED,
    },
    {
      id: "material-security-history",
      label: "Material for MkDocs: security policy history",
      url: "https://github.com/squidfunk/mkdocs-material/commits/master/SECURITY.md",
      checkedOn: CHECKED,
    },
    {
      id: "zensical-pypi",
      label: "PyPI: zensical",
      url: "https://pypi.org/project/zensical/",
      checkedOn: CHECKED,
    },
    {
      id: "properdocs-announcement",
      label: "ProperDocs: announcement discussion",
      url: "https://github.com/orgs/ProperDocs/discussions/33",
      checkedOn: CHECKED,
    },
    {
      id: "properdocs-pypi",
      label: "PyPI: properdocs",
      url: "https://pypi.org/project/properdocs/",
      checkedOn: CHECKED,
    },
    {
      id: "rtd-tools",
      label: "Read the Docs: Popular documentation tools",
      url: "https://docs.readthedocs.com/platform/stable/intro/doctools.html",
      checkedOn: CHECKED,
    },
  ],
};

/** A Map, not an object: slugs come from the URL and must never resolve prototype keys. */
const BRIEFS: ReadonlyMap<string, PairDecisionBrief> = new Map([
  [MKDOCS_VS_READ_THE_DOCS.slug, MKDOCS_VS_READ_THE_DOCS],
]);

export function getPairDecisionBrief(slug: string): PairDecisionBrief | undefined {
  return BRIEFS.get(slug);
}

export function getAllPairDecisionBriefs(): PairDecisionBrief[] {
  return Array.from(BRIEFS.values());
}
