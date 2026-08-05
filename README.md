# Kalambeer

**Demo:** https://kwarc87.github.io/kalambeer/

Kalambeer is a Polish word game built with JavaScript, HTML Canvas and a compressed dictionary trie.

## How to play

A random letter grid is generated on an HTML Canvas board. Click and drag across adjacent letters to form Polish words (minimum 3 letters). Each letter can only be used once per word.

**Scoring:** $(n - 2)^2$ points per word, where $n$ is the number of letters.

## Tech stack

HTML5, Bootstrap 3, jQuery, Canvas API, Touch support (jquery.mobile-events)

## Dictionary

Two dictionary modes are available:

- **Full** — extended dictionary including inflected forms (sourced from [sjp.pl](https://sjp.pl))
- **Basic** — common Polish words only

The dictionary is stored as a serialised prefix tree (`dict_tree_*`) and compressed with pako to minimise load time. A flat array variant (`dict_array_*`) is also kept for reference and tooling.

## Project structure

The repository is split into two distinct layers:

- **`plugin/`** — reusable, dictionary-agnostic jQuery plugin. Can be dropped into any project with a compatible dictionary.
- **`example/`** — concrete implementation for this site (leaderboard, reCAPTCHA, UI wiring).

```
index.html             # entry point for the example app
css/                   # styles (source + minified)
plugin/
  kalambeer.js         # jQuery plugin — core game logic (reusable)
  kalambeer.min.js
example/
  main.js              # example implementation — page wiring, leaderboard, score saving
  main.min.js
js/
  pako.min.js          # decompression library (plugin dependency)
  jquery.mobile-events.min.js
data/
  dict_tree_*          # compressed trie dictionaries (used at runtime)
  dict_array_*         # flat array dictionaries
  probabilities/       # letter frequency tables used for board generation
scripts/
  create_dict.js       # Node.js script to rebuild dictionaries from source
backend/
  scores.php           # leaderboard API (example-specific)
config/
  config.example.php   # template — copy to config.php and fill in real credentials
  config.php           # real credentials, gitignored, kept outside backend/ on purpose
```

## Plugin usage

`kalambeer.js` is a self-contained jQuery plugin. `main.js` is **one concrete example** of how to wire it up — you can replace it entirely with your own implementation, pointing the plugin at any compatible dictionary.

### Initialisation

```js
$('#canvas-element').kalambeer({
    mode: 'basic',                                        // 'basic' | 'full'
    dictionaryFullPath: 'data/dict_tree_basic_compressed',
    time: 60,                                             // game duration in seconds
    loadCallback:  function() { /* dictionary ready  */ },
    errorCallback: function(e) { /* load/parse error */ },
    initCallback:  function() { /* new round started */ },
    endCallback:   function(allWords, foundWords) { /* game over */ }
});
```

After `loadCallback` fires, start the game with:

```js
$('#canvas-element').kalambeer('init');
```

### Callbacks

| Callback | Signature | When it fires |
|---|---|---|
| `loadCallback` | `function()` | Dictionary successfully loaded and parsed |
| `errorCallback` | `function(error)` | Dictionary failed to load or parse |
| `initCallback` | `function()` | A new game round has been initialised |
| `endCallback` | `function(allWords, foundWords)` | Timer ran out; `allWords` = full list of valid words in the board, `foundWords` = words found by the player |

### Options

| Option | Default | Description |
|---|---|---|
| `mode` | `'basic'` | Dictionary mode, affects letter probability weighting |
| `dictionaryFullPath` | `'data/dict_tree_basic_compressed'` | Path to the compressed trie file |
| `time` | `120` | Game duration in seconds |
| `scoreSelector` | `'#score'` | Element updated with the current score |
| `maxScoreSelector` | `'#max-score'` | Element updated with the maximum achievable score |
| `timerSelector` | `'#timer'` | Element updated with the remaining time |
| `foundWordsSelector` | `'#found-words'` | Element updated with the count of found words |
| `currentWordSelector` | `'#current-word'` | Element updated with the word currently being drawn |
| `allWordsSelector` | `'#all-words-list'` | Element populated with all valid words at game end |

### Minimal example

```html
<canvas id="map" width="400" height="400"></canvas>
<span id="score"></span> / <span id="max-score"></span>
<span id="timer"></span>
<ul id="found-words"></ul>
<span id="current-word"></span>
<ul id="all-words-list"></ul>

<script>
$('#map').kalambeer({
    mode: 'basic',
    dictionaryFullPath: 'data/dict_tree_basic_compressed',
    time: 60,
    loadCallback: function() {
        $('#map').kalambeer('init');
    },
    endCallback: function(allWords, foundWords) {
        console.log('Found', foundWords.length, 'out of', allWords.length, 'words');
    }
});
</script>
```

## Known limitations

- **Word search is synchronous.** `findWordInMatrix` runs a DFS over the entire board on the main thread immediately after `init()`. For the default 4 × 4 grid this completes in milliseconds, but larger grids or very slow devices may cause a brief UI freeze. Consider increasing `baseWordLengthMin`/`baseWordLengthMax` to keep grids compact, or moving the call to a Web Worker for larger configurations.

## License

© Jakub Kwarciński. All rights reserved.
