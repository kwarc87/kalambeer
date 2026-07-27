# Kalambeer

Kalambeer is a Polish word game built with JavaScript, HTML Canvas and a compressed dictionary trie.

> ⚠️ **Refactor in progress** — the codebase is being modernised. Expect breaking changes on `main`.

## How to play

A random letter grid is generated on an HTML Canvas board. Click and drag across adjacent letters to form Polish words (minimum 3 letters). Each letter can only be used once per word.

**Scoring:** $(n - 2)^2$ points per word, where $n$ is the number of letters.

## Tech stack

HTML5, Bootstrap 3, jQuery
Canvas API
Touch support | jquery.mobile-events |

## Dictionary

Two dictionary modes are available:

- **Basic** — common Polish words only
- **Full** — extended dictionary including inflected forms (sourced from [sjp.pl](https://sjp.pl))

The dictionary is stored as a serialised prefix tree (`dict_tree_*`) and compressed with pako to minimise load time. A flat array variant (`dict_array_*`) is also kept for reference and tooling.

## Project structure

```
index.html           # entry point
css/                 # styles (source + minified)
js/
  kalambeer.js       # jQuery plugin — core game logic
  main.js            # page initialisation
  pako.min.js        # decompression library
  jquery.mobile-events.min.js
data/
  dict_tree_*        # compressed trie dictionaries (used at runtime)
  dict_array_*       # flat array dictionaries
  probabilities/     # letter frequency tables used for board generation
scripts/
  create_dict.js     # Node.js script to rebuild dictionaries from source
```

## License

© Jakub Kwarciński. All rights reserved.
