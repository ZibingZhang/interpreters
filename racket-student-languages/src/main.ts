import racket from './racket.js';

const text: string = document.getElementById('code')?.innerText || '';

racket.run(text);
