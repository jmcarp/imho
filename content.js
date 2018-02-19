import storage from './storage';

const IS_DATE = /\/(\d{4})\/(\d{2})\/(\d{2})/;
const CLEANUP_THRESHOLD = 14 * 24 * 60 * 60 * 1000;

const cleanup = async () => {
  const now = new Date();
  const items = await storage.get(null);
  const toRemove = Object.keys(items).filter(item => {
    return item.startsWith('https://');
  }).filter(item => {
    const [_, year, month, day] = IS_DATE.exec(item);
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return (now - date) > CLEANUP_THRESHOLD;
  });
  await storage.remove(toRemove);
}

const cached = async (key, getter) => {
  const items = await storage.get(key);
  if (items.hasOwnProperty(key)) {
    return items[key];
  }
  const result = await getter();
  await storage.set({[key]: result});
  return result;
};

const parser = new DOMParser();
const fetchAuthors = async (url) => {
  const resp = await fetch(url);
  const body = await resp.text();
  const doc = parser.parseFromString(body, 'text/html');
  const author = doc.querySelector('meta[name="author"]').getAttribute('content');
  // Articles from op-ed columnists that include a `p.has-single-author` don't include
  // byline data in `span.byline-author`; use `meta[name="author"]` directly.
  if (doc.querySelector('p.has-single-author')) {
    return [author];
  }
  // Author names in `span.byline-author` use all-caps; align with mixed-case names
  // in `meta[name="author"]` for correct casing.
  let position = 0;
  return Array.from(
    doc.querySelectorAll('span.byline-author')
  ).map(byline => {
    const name = byline.getAttribute('data-byline-name');
    position = author.toLowerCase().indexOf(name.toLowerCase(), position);
    return author.slice(position, position + name.length);
  });
};

const mask = async(node, blacklist) => {
  const links = Array.from(
    document.querySelectorAll('a[href*="/opinion/"]')
  ).filter(function(elm) {
    return IS_DATE.test(elm.getAttribute('href'));
  });

  const urls = {};
  links.forEach(function(link) {
    const url = link.getAttribute('href');
    urls[url] = urls[url] || [];
    urls[url].push(link);
  });

  await Promise.all(Object.keys(urls).map(async (url) => {
    const authors = await cached(url, async () => fetchAuthors(url));
    let isBlacklisted = false;
    for (const author of authors) {
      if (blacklist.has(author)) {
        isBlacklisted = true;
        break;
      }
    }
    if (isBlacklisted) {
      urls[url].forEach(link => {
        const parent = link.closest('.story:not(.theme-main)') || link;
        parent.classList.add('imho-blacklist');
      });
    }
  }));
};

const DYNAMIC_SELECTORS = [
  'div.tab-content', // Most emailed / viewed / recommended on homepage
  'aside.trending-module', // Trending articles on article view
  '#ribbon', // Top ribbon on article view
  'div.stream' // Latest stream on section view
];
const watch = (selectors, blacklist) => {
  const observer = new MutationObserver(async (mutations) => {
    await Promise.all(mutations.map(async (mutation) => {
      await mask(mutation.target, blacklist);
    }));
  });
  document.querySelectorAll(selectors.join(',')).forEach(tab => {
    observer.observe(tab, {childList: true, subtree: true});
  });
};

const main = async () => {
  await cleanup();

  const items = await storage.get('blacklist');
  const blacklist = new Set(items.blacklist);

  watch(DYNAMIC_SELECTORS, blacklist);
  await mask(document, blacklist);
};

main();
