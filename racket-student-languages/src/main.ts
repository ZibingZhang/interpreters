import interpreter from './interpreter.js';

const text: string = document.getElementById('code')?.innerText || '';

interpreter.run(text);
