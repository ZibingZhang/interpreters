import racket from './racket.js';

let code = document.getElementById('code');
let run = document.getElementById('run');

if (run !== null) {
  run.onclick = () => {
    console.clear();
    const text: string = document.getElementById('code')?.innerText || '';
    racket.run(text);
  };
  run.onclick(new MouseEvent(''));
}

document.addEventListener('keydown', e => {
  if (e.key === 'Tab') {
    e.preventDefault();
    document.execCommand('insertHTML', false, '&#009');
  }

  if (!e.altKey) return;

  switch (e.key) {
    case 'c': {
      if (code) code.innerHTML = ''; 
      break;
    }
    case 'r': {
      run?.click(); 
      break;
    }
  }
});

code?.focus();
