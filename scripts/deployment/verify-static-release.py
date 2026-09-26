"""Read-only release gate for actual Next build output; no network or events.

Usage: python3 scripts/deployment/verify-static-release.py --dist .next-miloosh-qa
Checks all prerendered public HTML, including sitemap membership, canonical and
metadata uniqueness, JSON-LD/FAQ visibility, links, fragments and the five-page
buyer flow. HTMLParser deliberately excludes scripts from visible-content checks.
"""
import argparse
import json
import os
import sys
import xml.etree.ElementTree as ET
from collections import defaultdict
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit

ORIGIN = "https://miloosh.com"
PRIMARY_SUPPORT = {
    "airtable": "best-no-code-database-for-operations",
    "todoist": "best-task-management-for-individuals",
    "close": "best-crm-for-startups",
    "setmore": "best-scheduling-software-for-small-business",
    "elevenlabs": "best-voice-ai-for-creators",
}


def normalized(text):
    return " ".join(text.split())


class Page(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.canonicals, self.descriptions, self.robots = [], [], []
        self.links, self.schemas, self.schema_errors, self.scripts = [], [], [], []
        self.ids = defaultdict(int)
        self.text, self.title = [], []
        self.h1_count = 0
        self.hidden = 0
        self.in_title = False
        self.script_type = None
        self.script_text = []
        self.inline_script_bytes = 0
        self.bytes = len(html.encode())
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in ("script", "style", "template"):
            self.hidden += 1
        if tag == "script":
            self.script_type = attrs.get("type", "")
            self.script_text = []
            if attrs.get("src"):
                self.scripts.append(attrs["src"])
        if attrs.get("id"):
            self.ids[attrs["id"]] += 1
        if tag == "h1":
            self.h1_count += 1
        if tag == "title":
            self.in_title = True
        if tag == "a" and attrs.get("href"):
            self.links.append(attrs["href"])
        if tag == "link" and "canonical" in attrs.get("rel", "").split():
            self.canonicals.append(attrs.get("href", ""))
        if tag == "meta":
            name = attrs.get("name", "").lower()
            if name == "description":
                self.descriptions.append(attrs.get("content", ""))
            if name in ("robots", "googlebot"):
                self.robots.append(attrs.get("content", "").lower())

    def handle_endtag(self, tag):
        if tag == "script":
            content = "".join(self.script_text)
            self.inline_script_bytes += len(content.encode())
            if self.script_type == "application/ld+json":
                try:
                    self.schemas.append(json.loads(content))
                except ValueError:
                    self.schema_errors.append("invalid JSON-LD")
            self.script_type = None
        if tag in ("script", "style", "template"):
            self.hidden = max(0, self.hidden - 1)
        if tag == "title":
            self.in_title = False

    def handle_data(self, data):
        if self.script_type is not None:
            self.script_text.append(data)
        if self.in_title:
            self.title.append(data)
        elif not self.hidden:
            self.text.append(data)

    @property
    def noindex(self):
        return any("noindex" in value or "none" in value.split(",") for value in self.robots)


def schema_failures(page):
    failures = list(page.schema_errors)
    visible = normalized(" ".join(page.text))

    def walk(node):
        if isinstance(node, list):
            for child in node:
                walk(child)
        elif isinstance(node, dict):
            if any(key in node for key in ("aggregateRating", "review")):
                failures.append("unsupported rating/review claim")
            if node.get("@type") == "FAQPage":
                entities = node.get("mainEntity", [])
                if not entities:
                    failures.append("empty FAQPage")
                for entity in entities:
                    for text in (entity.get("name", ""), entity.get("acceptedAnswer", {}).get("text", "")):
                        if not text or normalized(text) not in visible:
                            failures.append("FAQ text missing from initial HTML")
            if node.get("@type") in ("BreadcrumbList", "ItemList"):
                items = node.get("itemListElement", [])
                if [item.get("position") for item in items] != list(range(1, len(items) + 1)):
                    failures.append("non-contiguous list positions")
            for child in node.values():
                walk(child)

    walk(page.schemas)
    return sorted(set(failures))


def page_failures(route, page):
    failures = []
    expected = ORIGIN + (route if route != "/" else "")
    # Next serializes the root canonical with a slash; both describe the origin.
    if len(page.canonicals) != 1 or page.canonicals[0].rstrip("/") != expected:
        failures.append("missing, duplicate or non-self canonical")
    if page.canonicals and route != "/" and page.canonicals[0].endswith("/"):
        failures.append("trailing-slash canonical")
    if page.noindex:
        failures.append("submitted page is noindex")
    if not normalized(" ".join(page.title)):
        failures.append("missing title")
    if len(page.descriptions) != 1 or not page.descriptions[0].strip():
        failures.append("missing or duplicate description")
    if page.h1_count != 1:
        failures.append("expected one initial-HTML h1")
    if any(count > 1 for count in page.ids.values()):
        failures.append("duplicate HTML ids")
    failures.extend(schema_failures(page))
    return failures


def verify(dist, public):
    if not (dist / "BUILD_ID").is_file():
        raise ValueError("No production artifacts (BUILD_ID missing)")
    manifest = json.loads((dist / "prerender-manifest.json").read_text())
    routing = json.loads((dist / "routes-manifest.json").read_text())
    # staticRoutes means fixed pathname, not necessarily prerendered HTML.
    # /recommend deliberately reads searchParams and is served on request.
    fixed_routes = {item["page"] for item in routing["staticRoutes"]}
    redirects = {item["source"]: item["destination"] for item in routing["redirects"] if ":" not in item["source"]}
    app = dist / "server" / "app"
    sitemap = ET.fromstring((app / "sitemap.xml.body").read_text())
    urls = [node.text for node in sitemap.findall("{*}url/{*}loc")]
    failures, pages = [], {}
    if not urls or len(urls) != len(set(urls)):
        failures.append("sitemap is empty or has duplicate URLs")
    for route in manifest["routes"]:
        if route.startswith(("/internal", "/api/")):
            continue
        file = app / ("index.html" if route == "/" else route.lstrip("/") + ".html")
        if file.is_file():
            pages[route] = Page(file.read_text())
    submitted = set()
    for url in urls:
        parsed = urlsplit(url)
        route = parsed.path or "/"
        submitted.add(route)
        if parsed.scheme + "://" + parsed.netloc != ORIGIN or parsed.query or parsed.fragment:
            failures.append(f"sitemap noncanonical URL: {url}")
        if route in redirects:
            failures.append(f"sitemap contains redirect: {route}")
        if route not in pages and route not in fixed_routes:
            failures.append(f"sitemap route missing from build: {route}")
        elif route in pages and pages[route].noindex:
            failures.append(f"sitemap contains noindex: {route}")

    indexed = {route: page for route, page in pages.items() if not page.noindex and not route.startswith("/_")}
    for field in ("title", "descriptions", "canonicals"):
        values = defaultdict(list)
        for route, page in indexed.items():
            values[normalized(" ".join(getattr(page, field)))].append(route)
        for value, routes in values.items():
            if value and len(routes) > 1:
                failures.append(f"duplicate {field}: {', '.join(routes)}")
    for route, page in indexed.items():
        failures.extend(f"{route}: {failure}" for failure in page_failures(route, page))
        expected_types = ["Organization"]
        if route.startswith("/software/") or route in {f"/{guide}" for guide in PRIMARY_SUPPORT.values()}:
            expected_types += ["BreadcrumbList", "ItemList", "FAQPage"]
        elif route.startswith("/compare/"):
            expected_types += ["BreadcrumbList", "ItemList"]
        elif route.startswith("/category/"):
            expected_types += ["BreadcrumbList", "CollectionPage"]
        types = [schema.get("@type") for schema in page.schemas if isinstance(schema, dict)]
        for expected in expected_types:
            if types.count(expected) != 1:
                failures.append(f"{route}: missing or repeated {expected} schema")

    broken, redirected, fragments = defaultdict(set), defaultdict(set), defaultdict(set)
    link_count = 0
    for route, page in indexed.items():
        for href in page.links:
            url = urlsplit(urljoin(ORIGIN + route, href))
            if url.netloc != "miloosh.com" or url.scheme not in ("https", "http"):
                continue
            link_count += 1
            target = unquote(url.path) or "/"
            if target in redirects or (target != "/" and target.endswith("/") and target.rstrip("/") in pages):
                redirected[href].add(route)
            elif target not in pages and target not in fixed_routes and not (public / target.lstrip("/")).is_file():
                broken[href].add(route)
            elif url.fragment and target in pages and unquote(url.fragment) not in pages[target].ids:
                fragments[href].add(route)
    for label, issues in (("broken link", broken), ("redirect link", redirected), ("missing fragment", fragments)):
        for href, sources in sorted(issues.items()):
            failures.append(f"{label}: {href} from {', '.join(sorted(sources)[:5])} ({len(sources)} source pages)")

    for slug, guide in PRIMARY_SUPPORT.items():
        route = f"/software/{slug}"
        for path in (route, f"/{guide}"):
            if path not in submitted or path not in indexed:
                failures.append(f"primary/support page missing: {path}")
        page = pages.get(route)
        if page:
            for anchor in ("buying-decision", "buyer-price-check", "buyer-alternatives"):
                if page.ids.get(anchor) != 1:
                    failures.append(f"{route}: missing or repeated buyer section {anchor}")
        support = pages.get(f"/{guide}")
        if support and f"{route}#buying-decision" not in support.links:
            failures.append(f"/{guide}: missing direct primary buyer link")
        if "/" not in pages or route not in pages["/"].links:
            failures.append(f"home lacks direct primary link: {route}")

    representative = ["/", "/guides", "/compare"] + [path for slug, guide in PRIMARY_SUPPORT.items() for path in (f"/software/{slug}", f"/{guide}")]
    metrics = {route: {"htmlBytes": pages[route].bytes, "inlineScriptBytes": pages[route].inline_script_bytes,
                       "scriptFiles": len(set(pages[route].scripts))} for route in representative if route in pages}
    return {"scope": "Artifact audit only; a successful full build, tests and dependency audit are separate required gates.",
            "buildId": (dist / "BUILD_ID").read_text().strip(), "sitemapUrls": len(urls),
            "dynamicSitemapRoutesRequiringHttpQA": sorted(submitted - pages.keys()),
            "publicHtmlPages": len(indexed), "internalLinksChecked": link_count,
            "representativeArtifacts": metrics, "failures": failures}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    qa = os.environ.get("MILOOSH_QA_BUILD") == "1" and os.environ.get("VERCEL") != "1"
    parser.add_argument("--dist", default=".next-miloosh-qa" if qa else ".next")
    parser.add_argument("--output")
    args = parser.parse_args()
    try:
        result = verify(Path(args.dist), Path("public"))
    except (OSError, ValueError, KeyError, ET.ParseError) as error:
        result = {"failures": [str(error)]}
    output = json.dumps(result, indent=2) + "\n"
    if args.output:
        Path(args.output).write_text(output)
    print(output, end="")
    return 1 if result["failures"] else 0


if __name__ == "__main__":
    sys.exit(main())
