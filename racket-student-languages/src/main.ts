import racket from './racket.js';

// @ts-ignore
var editor = ace.edit('editor');
editor.setTheme('ace/theme/racket');
editor.setOptions({
  fontSize: '11pt'
});
editor.session.setMode('ace/mode/racket');

function run() {
  console.clear();
  const text: string = editor.getValue();
  racket.run(text);
}

// @ts-ignore
ace.run = run;

document.addEventListener('keydown', e => {
  if (!e.altKey) return;

  switch (e.key) {
    case 'c': {
      editor.setValue('');
      break;
    }
    case 'r': {
      run();
      break;
    }
  }
});

editor.focus();
editor.navigateFileEnd();
run();
