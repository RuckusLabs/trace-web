#!/usr/bin/env python3
"""Check the static site's local SEO contract; no network or dependencies required."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit
import json
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://ruckuslabs.co'
BASE = ORIGIN + '/trace/'
VOID = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}

class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.path = path
        self.h1 = 0
        self.title = ''
        self.in_title = False
        self.in_schema = False
        self.schema_text = ''
        self.schemas = []
        self.meta = {}
        self.canonicals = []
        self.links = []
        self.ids = set()
        self.stack = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'h1':
            self.h1 += 1
        if tag == 'title':
            self.in_title = True
        if tag == 'meta':
            key = a.get('name', a.get('property'))
            if key:
                assert key not in self.meta, (self.path, 'duplicate metadata', key)
                self.meta[key] = a.get('content', '')
        if tag == 'link' and a.get('rel') == 'canonical':
            self.canonicals.append(a['href'])
        if 'id' in a:
            assert a['id'] not in self.ids, (self.path, 'duplicate id', a['id'])
            self.ids.add(a['id'])
        if tag == 'script' and a.get('type') == 'application/ld+json':
            self.in_schema = True
            self.schema_text = ''
        if tag in ('a', 'link', 'script', 'img', 'source'):
            for key in ('href', 'src'):
                if a.get(key):
                    self.links.append(a[key])
            if a.get('srcset'):
                self.links.extend(item.strip().split()[0] for item in a['srcset'].split(','))
        if tag == 'img':
            assert 'alt' in a and 'width' in a and 'height' in a, (self.path, 'image attributes', a.get('src'))
        if tag not in VOID:
            self.stack.append(tag)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        assert self.stack and self.stack.pop() == tag, (self.path, 'HTML nesting', tag)
        if tag == 'title':
            self.in_title = False
        if tag == 'script' and self.in_schema:
            self.schemas.append(json.loads(self.schema_text))
            self.in_schema = False

    def handle_data(self, data):
        if self.in_title:
            self.title += data
        if self.in_schema:
            self.schema_text += data


def local_target(page, href):
    parsed = urlsplit(href)
    if parsed.scheme and (parsed.scheme != 'https' or parsed.netloc != 'ruckuslabs.co'):
        return None
    if parsed.netloc and parsed.netloc != 'ruckuslabs.co':
        return None
    resolved = urlsplit(urljoin(page.canonicals[0], href))
    if not resolved.path.startswith('/trace/'):
        return None
    path = ROOT / unquote(resolved.path[len('/trace/'):])
    if path.is_dir():
        path /= 'index.html'
    return path, resolved.fragment


def main():
    pages = {}
    for path in ROOT.rglob('*.html'):
        page = Page(path)
        page.feed(path.read_text())
        assert not page.stack and page.h1 == 1 and page.title.strip(), (path, 'page structure')
        assert len(page.canonicals) == 1, (path, 'canonical count')
        url = page.canonicals[0]
        assert url.startswith(BASE) and not urlsplit(url).query and not urlsplit(url).fragment, (path, 'canonical URL')
        for key in ('description','og:title','og:description','og:url','og:image','og:image:alt','twitter:title','twitter:description','twitter:image','twitter:image:alt'):
            assert page.meta.get(key), (path, 'missing metadata', key)
        assert page.meta['og:url'] == url
        assert page.meta['og:title'] == page.meta['twitter:title'] == page.title
        assert page.meta['description'] == page.meta['og:description'] == page.meta['twitter:description']
        assert page.meta.get('og:image:type') == 'image/png'
        assert 'noindex' not in page.meta.get('robots', '').lower(), (path, 'indexing disabled')
        assert page.schemas, (path, 'missing structured data')
        pages[path] = page
    for attr in ('title',):
        values = [getattr(p, attr) for p in pages.values()]
        assert len(values) == len(set(values)), 'Duplicate page titles'
    descriptions = [p.meta['description'] for p in pages.values()]
    assert len(descriptions) == len(set(descriptions)), 'Duplicate descriptions'
    canonicals = [p.canonicals[0] for p in pages.values()]
    assert len(canonicals) == len(set(canonicals)), 'Duplicate canonicals'
    graph_nodes = {}
    warnings = []
    for path, page in pages.items():
        for href in page.links:
            target = local_target(page, href)
            if target is None:
                continue
            file, fragment = target
            assert file.exists(), (path, 'broken local link', href)
            if fragment and file in pages:
                assert unquote(fragment) in pages[file].ids, (path, 'broken anchor', href)
        for schema in page.schemas:
            assert schema.get('@context') == 'https://schema.org'
            for node in schema.get('@graph', [schema]):
                kind = node.get('@type')
                assert kind != 'FAQPage', 'Do not duplicate the visible FAQ as rich-result markup'
                if '@id' in node:
                    graph_nodes[node['@id']] = node
                if kind == 'WebPage':
                    assert node['url'] == page.canonicals[0]
                if kind == 'BreadcrumbList':
                    items = node['itemListElement']
                    assert len(items) >= 2
                    assert [i['position'] for i in items] == list(range(1, len(items) + 1))
                    assert items[-1]['item'] == page.canonicals[0]
                if kind == 'Article':
                    assert node.get('headline') and node['mainEntityOfPage']['@id'] == page.canonicals[0] + '#webpage'
                if kind == 'SoftwareApplication':
                    assert node.get('name') == 'Trace' and node.get('offers', {}).get('price') == '0'
                    if not (node.get('aggregateRating') or node.get('review')):
                        warnings.append('App schema is descriptive only: Google software-app rich results require a genuine rating or review.')
    def check_references(value):
        if isinstance(value, dict):
            if set(value) == {'@id'}:
                assert value['@id'] in graph_nodes, ('Unresolved structured-data reference', value['@id'])
            for child in value.values():
                check_references(child)
        elif isinstance(value, list):
            for child in value:
                check_references(child)
    for page in pages.values():
        for schema in page.schemas:
            check_references(schema)
    sitemap = ET.parse(ROOT / 'sitemap.xml')
    urls = [e.text for e in sitemap.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
    assert len(urls) == len(set(urls)) and set(urls) == set(canonicals), 'Sitemap/canonical coverage mismatch'
    # Every page must be reachable through HTML links from the homepage, not just the sitemap.
    seen = set()
    todo = [ROOT / 'index.html']
    while todo:
        path = todo.pop()
        if path in seen:
            continue
        seen.add(path)
        for href in pages[path].links:
            target = local_target(pages[path], href)
            if target and target[0] in pages and target[0] not in seen:
                todo.append(target[0])
    assert seen == set(pages), ('Orphan pages', set(pages) - seen)
    print(f'PASS: {len(pages)} pages — HTML, metadata, links, image attributes, JSON-LD references, breadcrumbs, sitemap, and homepage reachability.')
    for warning in warnings:
        print('NOTE:', warning)
    print('NOT CHECKED: production headers/robots, Google indexing, rich-result test, App Store release compatibility, and field Core Web Vitals.')

if __name__ == '__main__':
    main()
