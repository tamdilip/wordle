const fs = require('fs');
const http = require('http');
const urlParser = require('url');
const crypto = require('crypto');

const SERVER_PORT = process.env.SERVER_PORT || 8000;
const WORDS_LIST = fs.readFileSync(__dirname + '/words/en.txt').toString('UTF8').split('\n');

const ALGORITHM = 'aes-256-ctr';
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY || 'FoCKvdLslUuBdd3EZlKate7XGottHski1LmyqJHvUhs=', 'base64'); //44len
const IV_LENGTH = 16;


const getWordStatus = async (guessedWord, code) => {
    const isValidWord = WORDS_LIST.includes(guessedWord.toLowerCase());
    if (!isValidWord) return;

    const finalWordLetters = getDecryptedWord(code).toUpperCase().split('');
    const guessedWordLetters = guessedWord.split('');
    console.log({ finalWordLetters, guessedWordLetters });

    return guessedWordLetters.map((v, i) => finalWordLetters[i] === v ? 1 : finalWordLetters.includes(v) ? 2 : 0);
};

const getEncryptedWord = (text) => {
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
};
const getDecryptedWord = (text) => {
    let textParts = text.split(':');
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
};

const requestListener = async (req, res) => {
    let urlParsed = urlParser.parse(req.url, true);
    let { query: { word, code }, pathname } = urlParsed;
    console.log(`Incoming request: ${req.url}`);

    if (pathname === '/validate' && word && code) {
        const wordStatus = await getWordStatus(word, code);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(wordStatus));
    } else if (pathname === '/create') {
        if (!word) {
            const wordsList = WORDS_LIST.filter(w => w.length == 5);
            word = wordsList[Math.floor(Math.random() * wordsList.length)]
        }
        const shareCode = getEncryptedWord(word);
        console.log({ word, shareCode });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ code: shareCode }));
    } else {
        fs.promises.readFile(__dirname + `/public${req.url === '/' ? '/index.html' : req.url}`)
            .then(html => {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(html);
            }).catch(() => {
                res.writeHead(400);
                res.end('Invalid request !!');
            });
    }
};

const server = http.createServer(requestListener);
server.listen(SERVER_PORT, () => {
    console.log(`Server running on port ${SERVER_PORT} : http://localhost:${SERVER_PORT}/`);
});
