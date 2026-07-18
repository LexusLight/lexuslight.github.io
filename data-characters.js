/* LexusLight — character roster: order + visuals (color / initials / photo) live
   here. Name/role/source/bio text is NOT stored here — script.js fetches and parses
   it straight from Characters/<folder>/description.md on every page load, so editing
   a description.md and reloading the page is enough. The little corner badge on each
   card is pulled from that file's **Source:** line (e.g. "Golden Soul") — leave it out
   of a description.md to show no badge. To add/remove/reorder a character card or
   change its color/image, edit this list. */
const CHARACTERS = [
  { folder: 'Lexus-Luminera', picClass: 'char-picture--photo',  image: 'images/Avatar.jpg' },
  { folder: 'Candle-Cat',     picClass: 'char-picture--yellow', initials: 'CC' },
  { folder: 'Lucky-Weiss',    picClass: 'char-picture--orange', initials: 'LW' },
  { folder: 'Thin-Green-Duke',picClass: 'char-picture--green',  initials: 'GD' },
  { folder: 'Mint',           picClass: 'char-picture--teal',   initials: 'M'  },
  { folder: 'Caspian',        picClass: 'char-picture--purple', initials: 'C'  },
  { folder: 'Sylvia',         picClass: 'char-picture--magenta',initials: 'S'  },
  { folder: 'Vortex-Sparks',  picClass: 'char-picture--silver', initials: 'VS' },
  { folder: 'Elric-Rose',     picClass: 'char-picture--crimson',initials: 'ER' },
  { folder: 'Queen-Victoria', picClass: 'char-picture--indigo', initials: 'QV' }
];
