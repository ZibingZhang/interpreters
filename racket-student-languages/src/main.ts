import racket from './racket.js';

let run = document.getElementById('run');
if (run !== null) {
  run.onclick = e => {
    console.clear();
    const text: string = document.getElementById('code')?.innerText || '';
    racket.run(text);
  };
  run.onclick(new MouseEvent(''));
}
