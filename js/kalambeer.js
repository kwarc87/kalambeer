(function (document) { 'use strict';

    //constructor
    const kalambeerObj =  function(element, options) {
        const plugin = this;
        plugin.settings = $.extend({}, settings.defaults, options);
        plugin.$element = $(element);
        plugin.lettersProbabilityBasic = {'a':140384,'b':19836,'d':32851,'n':79844,'k':65446,'ń':2878,'c':47989,'z':66067,'y':66514,'s':56890,'i':97224,'u':27813,'o':121547,'t':59571,'j':16249,'ż':5878,'r':78699,'e':77080,'v':340,'h':11187,'g':19078,'m':31063,'l':40192,'p':41201,'w':61279,'ć':26476,'ł':14197,'f':9660,'x':136,'ś':8801,'ą':4746,'ó':5925,'ę':5623,'ź':923,'q':62};
        plugin.lettersProbabilityFull = {'a':2873103,'b':588721,'c':1254805,'e':2343069,'i':2738752,'d':672064,'ń':86159,'s':990592,'y':1519557,'k':971756,'ą':393392,'h':353903,'g':404528,'o':2439605,'j':598458,'m':1186617,'u':830348,'n':2090630,'ę':197553,'w':1389167,'ó':108701,'z':1429225,'l':731994,'t':837991,'ż':198292,'r':1348771,'p':911566,'ć':36480,'ś':296240,'ł':644352,'f':135795,'v':220,'x':566,'ź':21914,'q':9}
        plugin.baseWord;
        plugin.dictArray = [];
        plugin.dictTree = {};
        plugin.map = [];
        plugin.cells = new Array(plugin.settings.width*plugin.settings.height);
        plugin.cellsMatrix;
        plugin.existingWords = [];
        plugin.possibleCoordinates = [{x:  1, y:  1}, {x: -1, y:  0}, {x: -1, y:  1}, {x:  0, y: -1}, {x: -1, y: -1}, {x:  0, y:  1}, {x:  1, y: -1}, {x:  1, y:  0}];
        plugin.userCurrentWord = '';
        plugin.userCurrentWordPosition = [];
        plugin.userWords = [];
        plugin.score = 0;
        plugin.maxScore = 0;
        plugin.canvasMap = plugin.$element[0].getContext('2d');
        plugin.cellsAccessMatrix;
        plugin.wordsPaths = {};
        plugin.time = plugin.settings.time;
        plugin.counter = false;
        plugin.wordPathLastTime = 0;
        plugin.wordPathAccumulatedTime = 0;
        plugin.wordPathIsDrawing = false;
        plugin.wordPathGlobalCounter = 0;
        plugin.checkWordTimeout;
    };

    //helper functions
    const randomIntFromInterval = function(min,max) {
        return Math.floor(Math.random()*(max-min+1)+min);
    };

    const formatTime = function(string, pad, length) {
        return (new Array(length+1).join(pad)+string).slice(-length);
    };

    const roundRect = function(ctx, x, y, width, height, radius, fill, stroke) {
        if (typeof stroke == 'undefined') {
            stroke = true;
        }
        if (typeof radius === 'undefined') {
            radius = 5;
        }
        if (typeof radius === 'number') {
            radius = {tl: radius, tr: radius, br: radius, bl: radius};
        } else {
            const defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0};
            for (let side in defaultRadius) {
                radius[side] = radius[side] || defaultRadius[side];
            }
        }
        ctx.beginPath();
        if (fill) {
            ctx.fillStyle = fill;
        }
        if (stroke) {
            ctx.strokeStyle = stroke;
        }
        ctx.moveTo(x + radius.tl, y);
        ctx.lineTo(x + width - radius.tr, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
        ctx.lineTo(x + width, y + height - radius.br);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
        ctx.lineTo(x + radius.bl, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
        ctx.lineTo(x, y + radius.tl);
        ctx.quadraticCurveTo(x, y, x + radius.tl, y);
        ctx.closePath();
        if (fill) {
            ctx.fill();
        }
        if (stroke) {
            ctx.stroke();
        }
        ctx.closePath();
    };

    //methods
    kalambeerObj.prototype = {
        load: function() {
            const plugin = this;
            const xhr = new XMLHttpRequest();
            xhr.open('get', plugin.settings.dictionaryFullPath, true);
            xhr.responseType = 'arraybuffer';
            xhr.onload = () => plugin.prepareData(xhr.response);
            xhr.send();
        },
        prepareData: function(data) {
            const plugin = this;
            const decoder = new TextDecoder();
            const uncompressedData = pako.inflate(data);
            const jsonString = decoder.decode(uncompressedData);
            plugin.dictTree = JSON.parse(jsonString);
            plugin.settings.loadCallback();
        },
        init: function() {
            const plugin = this;
            plugin.settings.initCallback();
            plugin.clearFields();
            plugin.baseWord = plugin.randomBaseWordFromDictionaryTree();
            plugin.createMap();
            plugin.fillMapWithBaseWord();
            plugin.fillMapWithRandomLetters();
            plugin.createMapCanvas();
            plugin.drawNewMap();
            plugin.fillCells();
            plugin.setProximity();
            plugin.findWordInMatrix();
            plugin.bindMouseEvents();
            plugin.calculateMaxScore();
            plugin.startCounter();
        },
        // make dictionary tree from dictionary array
        prepareDictTree: function(dictArray) {
            const tree = {};
            let letter, node, nextNode;
            dictArray.forEach(word => {
                node = tree;
                for (letter of word) {
                    nextNode = node[letter];
                    node = nextNode ? nextNode : node[letter] = {};
                }
                node._ = 1;
            });
            return tree;
        },
        // make dictionary tree with letter's wages from dictionary array
        prepareDictTreeWithWages: function(dictArray) {
            const tree = {};
            let letter, node, nextNode;
            dictArray.forEach(word => {
                node = tree;
                for (letter of word) {
                    nextNode = node[letter];
                    node = nextNode ? nextNode : node[letter] = {$: 0};
                    node.$++;
                }
                node._ = 1;
            });
            return tree;
        },
        randomBaseWordFromDictionaryArray: function() {
            const plugin = this;
            let word;
            do {
                let index = randomIntFromInterval(0, plugin.dictArray.length - 1);
                word = plugin.dictArray[index];
            } while (word.length < plugin.settings.baseWordLengthMin);
            return word;
        },
        randomBaseWordFromDictionaryTree: function() {
            const plugin = this;
            const wordMinLength = plugin.settings.baseWordLengthMin;
            const wordMaxLength = plugin.settings.baseWordLengthMax;
            let wordCompleted = false;
            while (!wordCompleted) {
                let node = plugin.dictTree;
                let word = '';
                let wordLength = randomIntFromInterval(wordMinLength, wordMaxLength);
                for (let i = 0; i < wordMaxLength; i++) {
                    const letter = plugin.randomLetterForBaseWordFromDictionaryTree(node);
                    if(letter) {
                        word += letter;
                        node = node[letter];
                        if(word.length >= wordLength && node._ === 1) {
                            wordCompleted = true;
                            return word;
                            break;
                        }
                    } else {
                        break;
                    }
                }
            }
        },
        //this method get random letter for base word respecting wages from optimized dictionary
        randomLetterForBaseWordFromDictionaryTree: function(node) {
            const plugin = this;
            const lettersArray = Object.keys(node).filter(item => item !== '_' && item !== '$');
            if(!lettersArray.length) {
                return false;
            }
            let probabilityArray = Object.values(node).map(item => item['$']).filter(item => item !== undefined);
            return plugin.rouletteRandom(lettersArray, probabilityArray);
        },
        randomLetter: function() {
            const plugin = this;
            const lettersProbabilityData = (plugin.settings.mode === 'basic') ? plugin.lettersProbabilityBasic : plugin.lettersProbabilityFull;
            let probabilityArray = Object.values(lettersProbabilityData);
            const lettersArray = Object.keys(lettersProbabilityData);
            return plugin.rouletteRandom(lettersArray, probabilityArray);
        },
        rouletteRandom: function(lettersArray, probabilityArray) {
            if(lettersArray.length === 1) {
                return lettersArray[0];
            }
            const sum = probabilityArray.reduce((acc, item) => acc + item);
            const reducer = (acc, curr, i) => {
                const value = i > 0 ? curr + acc[i-1] : curr;
                acc.push(value);
                return acc;
            };
            probabilityArray = probabilityArray.reduce(reducer, []);
            const randValue = Math.random() * sum;
            let randIndex;
            for(let i = 0; i < probabilityArray.length; i++) {
                if(probabilityArray[i] > randValue) {
                    randIndex = i;
                    break;
                }
            }
            return lettersArray[randIndex];
        },
        createMap : function() {
            const plugin = this;
            plugin.map = new Array(plugin.settings.height);
            plugin.cellsMatrix = new Array(plugin.settings.height);
            plugin.cellsAccessMatrix = new Array(plugin.settings.height);
            for (let y = 0; y < plugin.settings.height; y++) {
                plugin.map[y] = new Array(plugin.settings.width);
                plugin.cellsMatrix[y] = new Array(plugin.settings.width);
                plugin.cellsAccessMatrix[y] = new Array(plugin.settings.width);
                for (let x = 0; x < plugin.settings.width; x++) {
                    plugin.map[y][x] = 0;
                    plugin.cellsMatrix[y][x] = 0;
                    plugin.cellsAccessMatrix[y][x] = {
                        'active': false,
                        'allow': true
                    };
                }
            }
        },
        checkBorder: function(x, y) {
            const plugin = this;
            return (x >= 0 && x < plugin.settings.width) && (y >= 0 && y < plugin.settings.height);
        },
        randomCoordinates: function(availableCoord) {
            return availableCoord[Math.floor(Math.random() * availableCoord.length)];
        },
        getAvailableCloseForBaseWordLetter: function(x, y) {
            const plugin = this;
            const availableClose = [];
            plugin.possibleCoordinates.forEach(coord => {
                if(plugin.checkBorder(x + coord.x, y + coord.y) && !plugin.map[x + coord.x][y + coord.y]) {
                    availableClose.push({x: coord.x, y: coord.y});
                }
            });
            return availableClose;
        },
        fillMapWithBaseWord: function() {
            const plugin = this;
            let newX, newY;
            let x = parseInt(Math.random() * plugin.settings.width);
            let y = parseInt(Math.random() * plugin.settings.height);
            plugin.map[x][y] = plugin.baseWord.charAt(0);
            for (let i = 1; i < plugin.baseWord.length; i++) {
                const availableCoords = plugin.getAvailableCloseForBaseWordLetter(x,y);
                if(!availableCoords.length) {
                    plugin.restartFillMapWithBaseWord();
                    return false;
                }
                do {
                    let coord = plugin.randomCoordinates(availableCoords);
                    newX = parseInt(x + coord.x);
                    newY = parseInt(y + coord.y);
                } while(!plugin.checkBorder(newX, newY) || plugin.map[newX][newY]);
                x = newX;
                y = newY;
                plugin.map[x][y] = plugin.baseWord.charAt(i);
            }
        },
        restartFillMapWithBaseWord: function() {
            const plugin = this;
            plugin.createMap();
            plugin.fillMapWithBaseWord();
        },
        fillMapWithRandomLetters: function() {
            const plugin = this;
            for (let i = 0; i < plugin.settings.width; i++) {
                for (let j = 0; j < plugin.settings.height; j++) {
                    if (plugin.map[i][j] == 0) {
                        plugin.map[i][j] = plugin.randomLetter();
                    }
                }
            }
        },
        fillCells: function() {
            const plugin = this;
            let index = 0;
            for (let x = 0; x < plugin.settings.width; x++) {
                for (let y = 0; y < plugin.settings.height; y++) {
                    let letter = plugin.map[x][y];
                    let row = x;
                    let col = y;
                    let cell = {
                        row: row,
                        col: col,
                        letter: letter,
                        close: []
                    };
                    plugin.cells[index] = cell;
                    plugin.cellsMatrix[row][col] = cell;
                    index++;
                }
            }
        },
        setCloseForCell: function(close, row, col) {
            const plugin = this;
            if(plugin.checkBorder(row,col)) { close.push(plugin.cellsMatrix[row][col]) }
        },
        setProximity: function() {
            const plugin = this;
            plugin.cells.forEach(cell=> {
                let row = cell.row;
                let col = cell.col;
                let close = cell.close;
                plugin.possibleCoordinates.forEach(coord => {
                    plugin.setCloseForCell(close, row + coord.x, col + coord.y);
                });
            });
        },
        findWordInMatrix: function() {
            const plugin = this;
            const path = [];
            const prefix = '';
            plugin.cells.forEach(cell=> {
                plugin.findWordInMatrixStep(cell, path, prefix, plugin.dictTree);
            });
            plugin.sortAllWordsInOrder();
        },
        findWordInMatrixStep: function(cell, path, prefix, dict) {
            const plugin = this;
            if (path.includes(cell)) return;
            const letter = cell.letter;
            dict = dict[letter];
            if (!dict) return;
            prefix = prefix + letter;
            path = path.concat(cell);
            if (dict._) {
                if(!plugin.existingWords.includes(prefix.toUpperCase())) {
                    plugin.existingWords.push(prefix.toUpperCase());
                }
                const wordPosition = plugin.wordsPaths[prefix.toUpperCase()] = [];
                for (let i = 0; i < path.length; i += 1) {
                    wordPosition.push([path[i]['row'], path[i]['col']]);
                }
            }
            const close = cell.close;
            for (let i = 0; i < close.length; i++) {
                cell = close[i];
                plugin.findWordInMatrixStep(cell, path, prefix, dict);
            }
        },
        createMapCanvas: function() {
            const plugin = this;
            plugin.$element.html('');
            plugin.$element.attr('width', plugin.settings.width * plugin.settings.cellSize);
            plugin.$element.attr('height', plugin.settings.height * plugin.settings.cellSize);
        },
        drawNewMap: function() {
            const plugin = this;
            const cellSize = plugin.settings.cellSize;
            const marginBetweenCells = plugin.settings.marginBetweenCells;
            const width = plugin.settings.width;
            const height = plugin.settings.height;
            plugin.canvasMap.beginPath();
            plugin.canvasMap.fillStyle = '#ffffff';
            plugin.canvasMap.fillRect(0, 0, width*cellSize, height*cellSize);
            plugin.canvasMap.closePath();
            for (let i = 0; i < width; i++) {
                for (let j = 0; j < height; j++) {
                    const letter = plugin.map[i][j];
                    plugin.canvasMap.fillStyle = plugin.settings.cellColor;
                    plugin.canvasMap.lineWidth=1;
                    roundRect(
                        plugin.canvasMap,
                        i*cellSize+(Math.floor(marginBetweenCells/2)),
                        j*cellSize+(Math.floor(marginBetweenCells/2)),
                        cellSize-marginBetweenCells,
                        cellSize-marginBetweenCells,
                        plugin.settings.cellBorderRadius,
                        plugin.settings.cellColor,
                        false
                    );
                    plugin.canvasMap.beginPath();
                    plugin.canvasMap.font = `${plugin.settings.cellFontBold} ${plugin.settings.cellFontSize}px ${plugin.settings.cellFontFamily}`;
                    plugin.canvasMap.textAlign='center';
                    plugin.canvasMap.fillStyle = plugin.settings.cellLetterColor;
                    plugin.canvasMap.fillText(
                        letter.toUpperCase(),
                        i*cellSize+(cellSize/2),
                        j*cellSize+(cellSize/1.6)
                    );
                    plugin.canvasMap.closePath();
                }
            }
        },
        drawCell: function(x, y ,letter, color) {
            const plugin = this;
            roundRect(
                plugin.canvasMap,
                x*plugin.settings.cellSize+(Math.floor(plugin.settings.marginBetweenCells/2)),
                y*plugin.settings.cellSize+(Math.floor(plugin.settings.marginBetweenCells/2)),
                plugin.settings.cellSize-plugin.settings.marginBetweenCells,
                plugin.settings.cellSize-plugin.settings.marginBetweenCells,
                plugin.settings.cellBorderRadius,
                color,
                false
            );
            plugin.canvasMap.beginPath();
            plugin.canvasMap.font = `${plugin.settings.cellFontBold} ${plugin.settings.cellFontSize}px ${plugin.settings.cellFontFamily}`;
            plugin.canvasMap.textAlign='center';
            plugin.canvasMap.fillStyle = plugin.settings.cellLetterColor;
            plugin.canvasMap.fillText(
                letter.toUpperCase(),
                x*plugin.settings.cellSize+(plugin.settings.cellSize/2),
                y*plugin.settings.cellSize+(plugin.settings.cellSize/1.6)
            );
            plugin.canvasMap.closePath();
        },
        bindMouseEvents: function() {
            const plugin = this;
            let startEvents, moveEvents, endEvents;
            if($.isTouchCapable()) {
                startEvents = 'tapstart.kalambeer';
                moveEvents = 'tapmove.kalambeer';
                endEvents = 'tapend.kalambeer';
            } else {
                startEvents = 'mousedown.kalambeer';
                moveEvents = 'mousemove.kalambeer';
                endEvents = 'mouseup.kalambeer';
            }
            plugin.$element.on(startEvents, (event, touch) => {
                plugin.$element.on(moveEvents, plugin.drawingPath.bind(plugin));
                plugin.drawingPath(event, touch);
            });
            plugin.$element.on(endEvents, () => {
                plugin.$element.off(moveEvents);
                plugin.checkWord();
            });
            plugin.$element.on('mouseleave.kalambeer', () => {
                plugin.$element.off(moveEvents);
                plugin.checkWord();
            });
        },
        setCellsAccessMatrix: function(x,y) {
            const plugin = this;
            if(plugin.checkBorder(x,y) && !plugin.cellsAccessMatrix[x][y]['active']) { plugin.cellsAccessMatrix[x][y]['allow'] = true; }
        },
        drawingPath: function(event, touch) {
            event.preventDefault();
            const plugin = this;
            const offset = plugin.$element.offset();
            const cellSize = plugin.settings.cellSize;
            const cellTouchMargin = plugin.settings.cellTouchMargin;
            let tempX, tempY;
            if (touch) {
                tempX = touch.offset.x;
                tempY = touch.offset.y;
            } else {
                tempX = event.pageX - offset.left;
                tempY = event.pageY - offset.top;
            }
            let x = Math.floor(tempX/cellSize);
            let y = Math.floor(tempY/cellSize);
            const innerX = tempX - x*cellSize;
            const innerY = tempY - y*cellSize;
            const radius = (cellSize - cellTouchMargin*2)/2;
            const xSqrt = (innerX-(cellSize/2))*(innerX-(cellSize/2));
            const ySqrt = (innerY-(cellSize/2))*(innerY-(cellSize/2));
            if(xSqrt + ySqrt > radius*radius) {
                x = false;
                y = false;
            }
            if(
                x !== false &&
                y !== false &&
                x >= 0 &&
                x < plugin.settings.width &&
                y >= 0 &&
                y < plugin.settings.height
            ) {
                if (
                    plugin.cellsAccessMatrix[x][y]['allow'] &&
                    !plugin.cellsAccessMatrix[x][y]['active']
                ) {
                    plugin.userCurrentWord += plugin.map[x][y].toUpperCase();
                    plugin.userCurrentWordPosition.push({'x': x, 'y': y});
                    $(plugin.settings.currentWordSelector).text(plugin.userCurrentWord);
                    plugin.cellsAccessMatrix[x][y]['active'] = true;
                    plugin.drawCell(x,y,plugin.map[x][y], plugin.settings.cellActiveColor);
                    if(plugin.userCurrentWordPosition.length > 1) {
                        const userCurrentWordPosition = plugin.userCurrentWordPosition;
                        const x1 = userCurrentWordPosition[userCurrentWordPosition.length-2]['x'];
                        const y1 = userCurrentWordPosition[userCurrentWordPosition.length-2]['y'];
                        const x2 = userCurrentWordPosition[userCurrentWordPosition.length-1]['x'];
                        const y2 = userCurrentWordPosition[userCurrentWordPosition.length-1]['y'];
                        plugin.drawArrow(x1, y1, x2, y2);
                    }
                    for (let i = 0; i < plugin.settings.width; i++) {
                        for (let j = 0; j < plugin.settings.height; j++) {
                            plugin.cellsAccessMatrix[i][j]['allow'] = false;
                        }
                    }
                    plugin.possibleCoordinates.forEach(coord => {
                        plugin.setCellsAccessMatrix(x + coord.x,y + coord.y);
                    });
                }
            }
        },
        clearPath: function() {
            const plugin = this;
            for (let i = 0; i < plugin.settings.width; i++) {
                for (let j = 0; j < plugin.settings.height; j++) {
                    plugin.cellsAccessMatrix[i][j]['allow'] = true;
                    plugin.cellsAccessMatrix[i][j]['active'] = false;
                }
            }
            plugin.userCurrentWord = '';
            plugin.userCurrentWordPosition = [];
            plugin.drawNewMap();
            $(plugin.settings.currentWordSelector).text('');
        },
        blockPath: function() {
            const plugin = this;
            for (let i = 0; i < plugin.settings.width; i++) {
                for (let j = 0; j < plugin.settings.height; j++) {
                    plugin.cellsAccessMatrix[i][j]['allow'] = false;
                }
            }
        },
        drawArrow: function(x1, y1, x2, y2) {
            const plugin = this;
            const cellSize = plugin.settings.cellSize;
            const arrowLength = (cellSize / 2) - Math.floor(plugin.settings.arrowLength / 2);
            const lineWidth = Math.round((plugin.settings.arrowLength/4), 0)
            const sideOfTheTriangle1 = lineWidth;
            const sideOfTheTriangle2 = ((Math.sqrt(2) * sideOfTheTriangle1) / 2);
            const arrowEdgeMargin = lineWidth/Math.sqrt(2)/2;
            let triangleCord = new Array(4);
            let marginX1 = 0;
            let marginY1 = 0;
            let marginX2 = 0;
            let marginY2 = 0;
            if(x1 == x2) {
                triangleCord[0] = {'x': -sideOfTheTriangle1, 'y': 0};
                triangleCord[2] = {'x':  sideOfTheTriangle1, 'y': 0};
                triangleCord[3] = {'x': -sideOfTheTriangle1, 'y': 0};
                if(y1 > y2) {
                    marginY1 = - arrowLength + arrowEdgeMargin;
                    marginY2 = - arrowLength - sideOfTheTriangle1 + arrowEdgeMargin;
                    triangleCord[1] = {'x': 0, 'y': -sideOfTheTriangle1 };
                }
                if(y1 < y2) {
                    marginY1 = arrowLength - arrowEdgeMargin;
                    marginY2 = arrowLength + sideOfTheTriangle1 - arrowEdgeMargin;
                    triangleCord[1] = {'x': 0, 'y': sideOfTheTriangle1 };
                }
            }
            if(y1 == y2) {
                triangleCord[0] = {'x': 0, 'y': -sideOfTheTriangle1 };
                triangleCord[2] = {'x': 0, 'y':  sideOfTheTriangle1 };
                triangleCord[3] = {'x': 0, 'y': -sideOfTheTriangle1 };
                if(x1 > x2) {
                    marginX1 = - arrowLength + arrowEdgeMargin;
                    marginX2 = - arrowLength - sideOfTheTriangle1 + arrowEdgeMargin;
                    triangleCord[1] = {'x': -sideOfTheTriangle1, 'y': 0};
                }
                if(x1 < x2) {
                    marginX1 = arrowLength - arrowEdgeMargin;
                    marginX2 = arrowLength + sideOfTheTriangle1 - arrowEdgeMargin;
                    triangleCord[1] = {'x': sideOfTheTriangle1, 'y': 0};
                }
            }
            if(y1 > y2) {
                marginY1 = - arrowLength;
                marginY2 = - arrowLength - sideOfTheTriangle2 + arrowEdgeMargin;
                if(x1 > x2) {
                    marginX1 = -arrowLength;
                    marginX2 = - arrowLength - sideOfTheTriangle2 + arrowEdgeMargin;
                    triangleCord =[
                        {'x': -sideOfTheTriangle2, 'y':  sideOfTheTriangle2 },
                        {'x': -sideOfTheTriangle2, 'y': -sideOfTheTriangle2 },
                        {'x':  sideOfTheTriangle2, 'y': -sideOfTheTriangle2 },
                        {'x': -sideOfTheTriangle2, 'y':  sideOfTheTriangle2 }
                    ];
                }
                if(x1 < x2) {
                    marginX1 = arrowLength;
                    marginX2 = arrowLength + sideOfTheTriangle2 - arrowEdgeMargin;
                    triangleCord = [
                        {'x': -sideOfTheTriangle2, 'y': -sideOfTheTriangle2 },
                        {'x':  sideOfTheTriangle2, 'y': -sideOfTheTriangle2 },
                        {'x':  sideOfTheTriangle2, 'y':  sideOfTheTriangle2 },
                        {'x': -sideOfTheTriangle2, 'y': -sideOfTheTriangle2 }
                    ];
                }
            }
            if(y1 < y2) {
                marginY1 = arrowLength;
                marginY2 = arrowLength + sideOfTheTriangle2 - arrowEdgeMargin;
                if(x1 > x2) {
                    marginX1 = - arrowLength;
                    marginX2 = - arrowLength - sideOfTheTriangle2 + arrowEdgeMargin;
                    triangleCord = [
                        {'x': -sideOfTheTriangle2, 'y': -sideOfTheTriangle2 },
                        {'x': -sideOfTheTriangle2, 'y':  sideOfTheTriangle2 },
                        {'x':  sideOfTheTriangle2, 'y':  sideOfTheTriangle2 },
                        {'x': -sideOfTheTriangle2, 'y': -sideOfTheTriangle2 }
                    ];
                }
                if(x1 < x2) {
                    marginX1 = arrowLength;
                    marginX2 = arrowLength + sideOfTheTriangle2 - arrowEdgeMargin;
                    triangleCord = [
                        {'x': -sideOfTheTriangle2, 'y':  sideOfTheTriangle2 },
                        {'x':  sideOfTheTriangle2, 'y':  sideOfTheTriangle2 },
                        {'x':  sideOfTheTriangle2, 'y': -sideOfTheTriangle2 },
                        {'x': -sideOfTheTriangle2, 'y':  sideOfTheTriangle2 }
                    ];
                }
            }
            plugin.drawArrowInCanvas(x1, y1, x2, y2, marginX1, marginY1, marginX2, marginY2, triangleCord, lineWidth, cellSize);
        },
        drawArrowInCanvas: function(x1, y1, x2, y2, marginX1, marginY1, marginX2, marginY2, triangleCord, lineWidth, cellSize) {
            const plugin = this;
            plugin.canvasMap.beginPath();
            plugin.canvasMap.lineWidth = lineWidth;
            plugin.canvasMap.moveTo(
                x1*cellSize+(cellSize/2)+marginX1,
                y1*cellSize+(cellSize/2)+marginY1
            );
            plugin.canvasMap.lineTo(
                x2*cellSize+(cellSize/2)-marginX2,
                y2*cellSize+(cellSize/2)-marginY2
            );
            plugin.canvasMap.strokeStyle = plugin.settings.arrowColor;
            plugin.canvasMap.stroke();
            plugin.canvasMap.lineWidth = 1;
            plugin.canvasMap.moveTo(
                x2*cellSize+(cellSize/2)-marginX2,
                y2*cellSize+(cellSize/2)-marginY2
            );
            triangleCord.forEach(item => {
                plugin.canvasMap.lineTo(
                x2*cellSize+(cellSize/2)-marginX2+item['x'],
                y2*cellSize+(cellSize/2)-marginY2+item['y']
            );
        });
            plugin.canvasMap.fillStyle = plugin.settings.arrowColor;
            plugin.canvasMap.fill();
            plugin.canvasMap.strokeStyle = plugin.settings.arrowColor;
            plugin.canvasMap.stroke();
            plugin.canvasMap.closePath();
        },
        checkWord: function() {
            const plugin = this;
            clearTimeout(plugin.checkWordTimeout);
            if(plugin.existingWords.includes(plugin.userCurrentWord)) {
                plugin.blockPath();
                if(!plugin.userWords.includes(plugin.userCurrentWord)) {
                    plugin.drawEventPath(plugin.settings.cellCorrectColor);
                    plugin.userWords.push(plugin.userCurrentWord);
                    plugin.calculateScore(plugin.userCurrentWord);
                    $(plugin.settings.foundWordsSelector).append(`<span class='word'>${plugin.userCurrentWord}</span>`);
                } else {
                    plugin.drawEventPath(plugin.settings.cellRepetitionColor);
                }
                plugin.userCurrentWord = '';
                plugin.userCurrentWordPosition = [];
                plugin.checkWordTimeout = setTimeout(() => {
                    plugin.clearPath();
                }, plugin.settings.timeForShowingCorrectWord);
            } else {
                plugin.clearPath();
            }
        },
        drawEventPath: function(color) {
            const plugin = this;
            plugin.drawNewMap();
            for (let x = 0; x < plugin.settings.width; x++) {
                for (let y = 0; y < plugin.settings.height; y++) {
                    if(plugin.cellsAccessMatrix[x][y]['active']) {
                        plugin.drawCell(x, y, plugin.map[x][y].toUpperCase(), color);
                    }
                }
            }
            const userCurrentWordPosition = plugin.userCurrentWordPosition;
            for (let i = 0; i < userCurrentWordPosition.length; i++) {
                if(i > 0 ) {
                    plugin.drawArrow(
                        userCurrentWordPosition[i-1]['x'],
                        userCurrentWordPosition[i-1]['y'],
                        userCurrentWordPosition[i]['x'],
                        userCurrentWordPosition[i]['y']
                    )
                }
            }
        },
        calculateScore: function(userCurrentWord) {
            const plugin = this;
            const length = userCurrentWord.length;
            if(length >= 3) {
                plugin.score += (length-2)*(length-2);
            }
            $(plugin.settings.scoreSelector).text(plugin.score);
        },
        calculateMaxScore: function() {
            const plugin = this;
            for (let i = 0; i < plugin.existingWords.length; i ++) {
                let word = plugin.existingWords[i];
                let scoreForWord = (word.length-2)*(word.length-2);
                plugin.maxScore += scoreForWord;
            }
            $(plugin.settings.maxScoreSelector).text(plugin.maxScore);
        },
        updateCounter: function() {
            const plugin = this;
            let minutes = Math.floor(plugin.time / 60);
            let seconds = plugin.time - minutes * 60;
            $(plugin.settings.timerSelector).text(plugin.formattedTime(minutes, seconds));
        },
        startCounter: function() {
            const plugin = this;
            plugin.updateCounter();
            if(plugin.counter === false) {
                plugin.counter = setInterval(() => {
                    plugin.time--;
                    plugin.updateCounter();
                    if (plugin.time <= 0) {
                        if(plugin.counter !== false) {
                            clearInterval(plugin.counter);
                            plugin.counter = false;
                        }
                        plugin.clearPath();
                        plugin.unbindEvents();
                        plugin.showWordPath();
                        plugin.showAllWords();
                        plugin.showLongestWordPath();
                        plugin.settings.endCallback(plugin.existingWords, plugin.userWords);
                        return;
                    }
                }, 1000);
            }
        },
        sortAllWordsInOrder: function() {
            const plugin = this;
            plugin.existingWords.sort((a, b) => b.length - a.length || b.localeCompare(a));
        },
        formattedTime: function(minutes, seconds) {
            return formatTime(minutes,'0',2)+':'+formatTime(seconds,'0',2);
        },
        unbindEvents: function() {
            const plugin = this;
            plugin.$element.off('.kalambeer');
            $(plugin.settings.allWordsSelector).off('.kalambeer');
        },
        clearFields: function() {
            const plugin = this;
            plugin.cells = new Array(plugin.settings.width*plugin.settings.height);
            plugin.existingWords = [];
            plugin.userWords = [];
            plugin.userCurrentWord = '';
            plugin.userCurrentWordPosition = [];
            plugin.score = 0;
            $(plugin.settings.scoreSelector).text(plugin.score);
            plugin.maxScore = 0;
            $(plugin.settings.maxScoreSelector).text(plugin.maxScore);
            plugin.time = plugin.settings.time;
            if(plugin.counter !== false) {
                clearInterval(plugin.counter);
                plugin.counter = false;
            }
            clearTimeout(plugin.checkWordTimeout);
            $(plugin.settings.foundWordsSelector).text('');
            plugin.wordsPaths = {};
            plugin.clearDrawingPath();
        },
        showAllWords: function() {
            const plugin = this;
            for (let i = 0; i < plugin.existingWords.length; i++) {
                if (plugin.userWords.includes(plugin.existingWords[i])) {
                    $(plugin.settings.allWordsSelector).append(`<span class='word active'>${plugin.existingWords[i]}</span>`)
                } else {
                    $(plugin.settings.allWordsSelector).append(`<span class='word'>${plugin.existingWords[i]}</span>`)
                }
            }
        },
        clearDrawingPath: function() {
            const plugin = this;
            plugin.wordPathIsDrawing = false;
            plugin.wordPathAccumulatedTime = 0;
            plugin.wordPathGlobalCounter = 0;
            plugin.wordPathExtended = [];
        },
        drawWordPath: function() {
            const plugin = this;
            if (!plugin.wordPathIsDrawing) {
                return false;
            }
            const time = Date.now();
            plugin.wordPathAccumulatedTime += time - plugin.wordPathLastTime;
            plugin.wordPathLastTime = time;
            while (plugin.wordPathAccumulatedTime >= plugin.settings.timeForShowingCorrectWord) {
                plugin.wordPathAccumulatedTime -= plugin.settings.timeForShowingCorrectWord;
                if (!plugin.wordPathIsDrawing) {
                    return false;
                }
                if (plugin.wordPathGlobalCounter < plugin.wordPathExtended.length) {
                    const item = plugin.wordPathExtended[plugin.wordPathGlobalCounter];
                    plugin.wordPathGlobalCounter++;
                    plugin.drawCell(item.x,item.y,item.letter,item.color);
                    if(item.prevX !== false && item.prevY !== false) {
                        plugin.drawArrow(item.prevX,item.prevY,item.x,item.y)
                    }
                } else {
                    plugin.wordPathIsDrawing = false;
                    return false;
                }
            }
            requestAnimationFrame(plugin.drawWordPath.bind(plugin));
        },
        showWordPath: function() {
            const plugin = this;
            $(plugin.settings.allWordsSelector).on('click.kalambeer', '.word', function(e) {
                e.preventDefault();
                plugin.clearDrawingPath();
                plugin.clearPath();
                $(plugin.settings.allWordsSelector).find('.word').removeClass('checking');
                $(this).addClass('checking');
                const word = $(this).text();
                const wordPath = plugin.wordsPaths[word];
                for (let i = 0; i < wordPath.length; i++) {
                    const x = wordPath[i][0];
                    const y = wordPath[i][1];
                    let prevX = false;
                    let prevY = false;
                    if(i > 0) {
                        prevX = wordPath[i-1][0];
                        prevY = wordPath[i-1][1];
                    }
                    const letter = word.charAt(i);
                    const color = plugin.settings.cellCorrectColor;
                    plugin.wordPathExtended.push({x,y,prevX,prevY,letter,color});
                }
                plugin.wordPathIsDrawing = true;
                plugin.wordPathLastTime = new Date();
                requestAnimationFrame(plugin.drawWordPath.bind(plugin));
            });
        },
        showLongestWordPath: function() {
            const plugin = this;
            $(plugin.settings.allWordsSelector).find('.word:first-child').trigger('click');
        }
    };

    const settings = {
        constructor: kalambeerObj,
        methods: kalambeerObj.prototype,
        defaults: {
            'mode': 'basic', //basic for basic dictionary and full for full dictionary - different letters probability
            'width' : 4,
            'height' : 4,
            'cellSize' : 65,
            'arrowLength' : 24,
            'cellTouchMargin': 2,
            'marginBetweenCells': 2,
            'cellBorderRadius': 7,
            'cellColor' : '#D20107',
            'cellLetterColor' : '#FFFFFF',
            'cellActiveColor' : '#8C0005',
            'cellRepetitionColor' : '#DF780A',
            'cellCorrectColor' : '#2B8603',
            'cellFontFamily': 'Arial',
            'cellFontSize': 28,
            'cellFontBold': 600,
            'arrowColor' : '#f7a3a3',
            'baseWordLengthMin' : 12,
            'baseWordLengthMax' : 15, //max length = 15 due to the limitations of the available dictionary
            'scoreSelector' : '#score',
            'timerSelector' : '#timer',
            'maxScoreSelector' : '#max-score',
            'foundWordsSelector': '#found-words',
            'currentWordSelector': '#current-word',
            'allWordsSelector': '#all-words-list',
            'dictionaryFullPath' : 'data/dict_tree_basic_compressed',
            'time': 120, //in seconds
            'timeForShowingCorrectWord': 350, //in miliseconds
            initCallback: function() { },
            endCallback: function(allWords, foundWords) { }
        }
    };

    $.fn.kalambeer = function(methodOrOptions) {
        const methodsParameters = Array.prototype.slice.call(arguments, 1);
        return this.each(function() {
            if ( ! $.data( this, 'plugin_kalambeer' ) ) {
                const obj = new settings.constructor(this, methodOrOptions);
                obj.load();
                $.data(this, 'plugin_kalambeer', obj);
            } else if (typeof methodOrOptions === 'object') {
                $.error('Kalambeer already initialized');
            } else {
                const plugin = $(this).data('plugin_kalambeer');
                if ( plugin[methodOrOptions] ) {
                    plugin[methodOrOptions].apply(plugin, methodsParameters);
                } else {
                    $.error( 'Method ' +  methodOrOptions + ' does not exist on Kalambeer' );
                }
            }
        });
    };

})(document);