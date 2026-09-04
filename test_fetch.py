import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
import re
import json

def fetch_rss_feed(feed_url_or_query):
    """
    Fetches an RSS/Atom feed from a Google Alert URL or a search query.
    """
    if feed_url_or_query.startswith("http://") or feed_url_or_query.startswith("https://"):
        url = feed_url_or_query
    else:
        # Generate Google News RSS for query
        encoded_query = urllib.parse.quote(feed_url_or_query)
        url = f"https://news.google.com/rss/search?q={encoded_query}&hl=en-US&gl=US&ceid=US:en"

    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    )
    
    with urllib.request.urlopen(req, timeout=10) as response:
        content = response.read()
    
    return content

def clean_html(raw_html):
    cleanr = re.compile('<.*?>')
    cleantext = re.sub(cleanr, '', raw_html)
    return cleantext.replace('&nbsp;', ' ').replace('&amp;', '&').replace('&quot;', '"').strip()

def parse_feed_items(xml_content):
    """
    Parses RSS 2.0 or Atom feeds from Google Alerts/News.
    """
    items = []
    root = ET.fromstring(xml_content)
    
    # Check if RSS 2.0
    channel = root.find("channel")
    if channel is not None:
        for item_elem in channel.findall("item"):
            title = item_elem.findtext("title") or ""
            link = item_elem.findtext("link") or ""
            pub_date = item_elem.findtext("pubDate") or ""
            desc = item_elem.findtext("description") or ""
            source = item_elem.findtext("source") or ""
            
            clean_desc = clean_html(desc)
            items.append({
                "title": clean_html(title),
                "link": link,
                "published": pub_date,
                "snippet": clean_desc,
                "source": source
            })
    else:
        # Atom feed (Google Alerts standard atom format)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        for entry in root.findall("atom:entry", ns) or root.findall("entry"):
            title = (entry.findtext("atom:title", namespaces=ns) or entry.findtext("title") or "")
            link_elem = entry.find("atom:link", namespaces=ns) or entry.find("link")
            link = link_elem.attrib.get("href", "") if link_elem is not None else ""
            content = (entry.findtext("atom:content", namespaces=ns) or entry.findtext("content") or "")
            published = (entry.findtext("atom:published", namespaces=ns) or entry.findtext("published") or "")
            
            items.append({
                "title": clean_html(title),
                "link": link,
                "published": published,
                "snippet": clean_html(content),
                "source": "Google Alert"
            })
            
    return items

if __name__ == "__main__":
    test_queries = [
        "AI in healthcare doctors patients",
        "AI in legal lawyers law firms",
        "AI in education teachers students"
    ]
    
    print("=== Testing Real Google Alert / News Feeds ===\n")
    for q in test_queries:
        print(f"Fetching feed for query: '{q}'...")
        xml_data = fetch_rss_feed(q)
        items = parse_feed_items(xml_data)
        print(f"Found {len(items)} articles.")
        for i, it in enumerate(items[:3], 1):
            print(f"  [{i}] {it['title']}")
            print(f"      Source: {it['source']} | Date: {it['published']}")
            print(f"      Snippet: {it['snippet'][:120]}...")
            print(f"      Link: {it['link']}\n")
