"""Adversarial fixtures for the generated-HTML gate, using only stdlib."""
import unittest
import importlib.util
import json
import tempfile
from pathlib import Path

spec = importlib.util.spec_from_file_location("static_release", Path(__file__).with_name("verify-static-release.py"))
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)
Page, page_failures, schema_failures = gate.Page, gate.page_failures, gate.schema_failures


def html(extra="", canonical="https://miloosh.com/software/airtable"):
    return f'''<html><head><title>Airtable</title>
    <link rel="canonical" href="{canonical}"><meta name="description" content="A buyer guide.">
    </head><body><main><h1>Airtable</h1>{extra}</main></body></html>'''


class StaticReleaseTest(unittest.TestCase):
    def test_valid_initial_html(self):
        self.assertEqual(page_failures("/software/airtable", Page(html())), [])

    def test_canonical_variants_fail(self):
        for canonical in ("https://www.miloosh.com/software/airtable", "http://miloosh.com/software/airtable",
                          "https://miloosh.com/software/todoist", "https://miloosh.com/software/airtable?ref=qa",
                          "https://miloosh.com/software/airtable/"):
            with self.subTest(canonical=canonical):
                self.assertTrue(page_failures("/software/airtable", Page(html(canonical=canonical))))

    def test_duplicate_canonical_and_noindex_fail(self):
        page = Page(html('<link rel="canonical" href="https://miloosh.com/software/airtable"><meta name="robots" content="noindex,follow">'))
        self.assertIn("missing, duplicate or non-self canonical", page_failures("/software/airtable", page))
        self.assertIn("submitted page is noindex", page_failures("/software/airtable", page))

    def test_script_text_is_not_crawlable_copy(self):
        schema = '<script type="application/ld+json">{"@type":"FAQPage","mainEntity":[{"name":"Question?","acceptedAnswer":{"text":"Answer."}}]}</script>'
        self.assertIn("FAQ text missing from initial HTML", schema_failures(Page(html(schema))))
        visible = '<details><summary>Question?</summary><p>Answer.</p></details>'
        self.assertEqual(schema_failures(Page(html(schema + visible))), [])

    def test_invalid_json_and_fake_ratings_fail(self):
        self.assertIn("invalid JSON-LD", schema_failures(Page(html('<script type="application/ld+json">{</script>'))))
        self.assertIn("unsupported rating/review claim", schema_failures(Page(html('<script type="application/ld+json">{"aggregateRating":5}</script>'))))

    def test_entities_and_fragment_ids(self):
        page = Page(html('<a href="/software/todoist?x=1&amp;y=2#pricing">Todoist</a><h2 id="pricing">A &amp; B</h2>'))
        self.assertEqual(page.links, ["/software/todoist?x=1&y=2#pricing"])
        self.assertEqual(page.ids["pricing"], 1)
        self.assertIn("A & B", page.text)


class BuildInventoryTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.dist = Path(self.temp.name)
        self.app = self.dist / "server" / "app"
        self.app.mkdir(parents=True)
        self.routes = ["/"] + [path for slug, guide in gate.PRIMARY_SUPPORT.items()
                                for path in (f"/software/{slug}", f"/{guide}")]
        (self.dist / "BUILD_ID").write_text("fixture")
        (self.dist / "prerender-manifest.json").write_text(json.dumps({"routes": dict.fromkeys(self.routes, {})}))
        (self.dist / "routes-manifest.json").write_text(json.dumps({
            "staticRoutes": [{"page": "/recommend"}],
            "redirects": [{"source": "/compare/retired", "destination": "/software/airtable"}],
        }))
        (self.app / "sitemap.xml.body").write_text("<urlset>" + "".join(
            f"<url><loc>{gate.ORIGIN}{route}</loc></url>" for route in self.routes + ["/recommend"]
        ) + "</urlset>")
        for route in self.routes:
            content = ""
            if route == "/":
                content = "".join(f'<a href="/software/{slug}">{slug}</a>' for slug in gate.PRIMARY_SUPPORT)
            elif route.startswith("/software/"):
                content = '<section id="buying-decision"></section><h2 id="buyer-price-check">Price</h2><h2 id="buyer-alternatives">Alternatives</h2>'
            else:
                slug = next(slug for slug, guide in gate.PRIMARY_SUPPORT.items() if route == "/" + guide)
                content = f'<a href="/software/{slug}#buying-decision">Buyer page</a>'
            content += '<p>Question? Answer.</p>'
            schemas = [{"@type": kind} for kind in ("Organization", "BreadcrumbList", "ItemList")]
            schemas.append({"@type": "FAQPage", "mainEntity": [{"name": "Question?", "acceptedAnswer": {"text": "Answer."}}]})
            content += "".join('<script type="application/ld+json">' + json.dumps(schema) + '</script>' for schema in schemas)
            file = self.file(route)
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_text(html(content, gate.ORIGIN + route).replace("Airtable", route).replace("A buyer guide.", route))

    def file(self, route):
        return self.app / ("index.html" if route == "/" else route.lstrip("/") + ".html")

    def result(self):
        return gate.verify(self.dist, self.dist / "public")

    def test_literal_dynamic_route_is_reported_for_http_qa(self):
        result = self.result()
        self.assertEqual(result["failures"], [])
        self.assertEqual(result["dynamicSitemapRoutesRequiringHttpQA"], ["/recommend"])

    def test_broken_redirect_and_fragment_links_fail(self):
        file = self.file("/")
        file.write_text(file.read_text().replace("</main>", '<a href="/software/missing">Missing</a><a href="/compare/retired">Retired</a><a href="/software/airtable#missing">Fragment</a></main>'))
        failures = self.result()["failures"]
        for label in ("broken link:", "redirect link:", "missing fragment:"):
            self.assertTrue(any(label in failure for failure in failures), label)

    def test_missing_primary_html_is_not_hidden_by_dynamic_routes(self):
        self.file("/software/airtable").unlink()
        self.assertIn("primary/support page missing: /software/airtable", self.result()["failures"])

    def test_missing_buyer_content_and_discovery_links_fail(self):
        file = self.file("/software/airtable")
        file.write_text(file.read_text().replace('id="buying-decision"', 'id="removed"'))
        self.assertTrue(any("missing or repeated buyer section" in failure for failure in self.result()["failures"]))

    def test_removed_schema_cannot_silently_pass(self):
        file = self.file("/software/airtable")
        file.write_text(file.read_text().replace('"FAQPage"', '"Thing"'))
        self.assertIn("/software/airtable: missing or repeated FAQPage schema", self.result()["failures"])


if __name__ == "__main__":
    unittest.main()
