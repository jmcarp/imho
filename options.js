import storage from './storage';
import * as listeners from './listeners';
import 'purecss/build/pure-min.css';
import './content.css';

const EDITORIAL_BOARD = 'The Editorial Board';
const KNOWN_AUTHORS = [
  'Bari Weiss',
  'Bret Stephens',
  'Charles M. Blow',
  'David Brooks',
  'David Leonhardt',
  'Frank Bruni',
  'Gail Collins',
  'Lindy West',
  'Maureen Dowd',
  'Michelle Goldberg',
  'Nicholas Kristof',
  'Paul Krugman',
  'Roger Cohen',
  'Ross Douthat',
  'Thomas L. Friedman'
];

const TWITTER_MAP = {
  'Bari Weiss': 'bariweiss',
  'Bret Stephens': 'bretstephensnyt',
  'Charles M. Blow': 'CharlesMBlow',
  'Gail Collins': 'gailcollins',
  'David Brooks': 'nytdavidbrooks',
  'David Leonhardt': 'DLeonhardt',
  'Frank Bruni': 'FrankBruni',
  'Maureen Dowd': 'maureendowd',
  'Michelle Goldberg': 'michelleinbklyn',
  'Nicholas Kristof': 'NickKristof',
  'Paul Krugman': 'paulkrugman',
  'Roger Cohen': 'NYTimesCohen',
  'Ross Douthat': 'DouthatNYT',
  'Thomas L. Friedman': 'tomfriedman'
};

const TWEET_URL = 'https://twitter.com/intent/tweet';

const union = (a, b) => {
  return new Set(Array.from(a).concat(Array.from(b)));
};

const toSentence = (items) => {
  if (items.length <= 2) {
    return items.join(' and ');
  }
  const last = items.length > 3 ? `${items.length - 2} more` : items.slice(2);
  return items.slice(0, 2).concat(`and ${last}`).join(', ');
};

const saveOptions = async (e) => {
  e.preventDefault();

  const blacklist = Array.from(
    document.querySelectorAll('#blacklist option:checked')
  ).map(option => {
    return option.value;
  });
  await storage.set({blacklist: blacklist});

  updateTweet(blacklist);
};

const updateTweet = (blacklist) => {
  const tweetNode = document.querySelector('#tweet');
  if (blacklist.length === 0) {
    tweetNode.style['display'] = 'none';
  } else {
    tweetNode.style['display'] = 'block';
    const handles = blacklist.map(item => (TWITTER_MAP[item] ? `@${TWITTER_MAP[item]}` : item));
    const tweetMessage = `I'm blocking ${toSentence(handles)} on @nytopinion with @imhoext`;
    tweetNode.querySelector('a').setAttribute('href', `${TWEET_URL}?text=${tweetMessage}`)
    tweetNode.querySelector('.tweet-message').textContent = tweetMessage;
  }
};

const loadOptions = async () => {
  const items = await storage.get(null);
  const blacklist = new Set(items.blacklist || []);
  const authors = union(KNOWN_AUTHORS, blacklist);
  Object.keys(items).filter(item => {
    return item.startsWith('https://');
  }).forEach(url => {
    for (const author of items[url]) {
      authors.add(author);
    }
  });
  authors.delete(EDITORIAL_BOARD);

  const options = Array.from(authors).sort();
  options.push(EDITORIAL_BOARD);

  const select = document.querySelector('#blacklist');
  select.size = Math.min(options.length, 20);
  options.forEach(author => {
    const option = document.createElement('option', {value: author})
    option.selected = blacklist.has(author);
    option.appendChild(document.createTextNode(author));
    select.appendChild(option);
  });

  updateTweet(Array.from(blacklist));

  document.querySelector('#save').addEventListener('click', saveOptions);
};

document.addEventListener('DOMContentLoaded', loadOptions);
document.addEventListener('dblclick', listeners.toggleBlacklist);
document.addEventListener('mousedown', listeners.suppressDoubleClickHighlight);
