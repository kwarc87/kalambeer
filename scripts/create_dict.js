(function() {
    const fs = require('fs');
    const pako = require('pako');

    function load(path) {
        const dictFile = fs.readFileSync(path);
        return JSON.parse(dictFile);
    }

    function prepareFullDict() {
        const dictFull = [];
        var matchPattern = /^[a-zA-ZżźćńółęąśŻŹĆĄŚĘŁÓŃ]+$/i;
        dictFullSrc.forEach(word => {
            if(matchPattern.test(word) && word.length >= 3 && word.length <= 16) {
                dictFull.push(word.toLowerCase());
            }
        });
        const dictFullStr = JSON.stringify(dictFull);
        fs.writeFile('dictfull_full.json', dictFullStr, 'utf8');
    }

    function prepareDict(dictFull) {
        const tree = {};
        let letter, node, nextNode;
        dictFull.forEach(word => {
            node = tree;
            for (letter of word) {
                nextNode = node[letter];
                node = nextNode ? nextNode : node[letter] = {};
            }
            node._ = 1;
        });
        return tree;
    }

    function prepareDictWithWages(dictFull) {
        const tree = {};
        let letter, node, nextNode;
        dictFull.forEach(word => {
            node = tree;
            for (letter of word) {
                nextNode = node[letter];
                node = nextNode ? nextNode : node[letter] = {$: 0};
                node.$++;
            }
            node._ = 1;
        });
        return tree;
    }

    function saveDictToFile() {
        const dictOpt = prepareDictWithWages(dict);
        const dictOptStr = JSON.stringify(dictOpt);
        fs.writeFile('dictopt_full.json', dictOptStr, 'utf8');
    }

    function prepareLettersProbability(dictFull) {
        let letterProbability = {};
        dictFull.forEach(word => {
            for (letter of word) {
                letterProbability[letter] ? letterProbability[letter] += 1 : letterProbability[letter] = 1;
            }
        });
        return letterProbability;
    }

    function saveProbabilityToFile() {
        const lettersProbability = prepareLettersProbability(dict);
        const lettersProbabilityStr = JSON.stringify(lettersProbability);
        fs.writeFile('probability_full.json', lettersProbabilityStr, 'utf8');
    }

    function saveDictToFileCompressed() {
        const dictOpt = prepareDictWithWages(dict);
        const dictStr = JSON.stringify(dictOpt);
        const binaryString = pako.deflate(dictStr);
        fs.writeFile('dict_tree_full_compressed', binaryString, 'utf8');
    }

    const dict = load('../data/dict_array_full.json');
    const dictFullSrc = load('../data/src/dict-full-src.json');

    prepareFullDict();
    //saveDictToFileCompressed();
    //saveDictToFile();
    //saveProbabilityToFile();

}());