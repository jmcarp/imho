import storage from './storage';
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

const union = (a, b) => {
  return new Set(Array.from(a).concat(Array.from(b)));
};

const saveOptions = async (e) => {
  e.preventDefault();

  const blacklist = Array.from(
    document.querySelectorAll('#blacklist option:checked')
  ).map(option => {
    return option.value;
  });
  await storage.set({blacklist: blacklist});
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

  document.querySelector('#save').addEventListener('click', saveOptions);
};

document.addEventListener('DOMContentLoaded', loadOptions);
