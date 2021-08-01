import { lexer } from './interpreter/lexer';

lexer.reset('#t } [ #asht # 3/00000 #|?|# ;; ashtasthhta');

for (const token of lexer) {
  console.log(token);
}
