import { lexer } from './lexer';

describe('test lexing keywords', () => {
  describe('lexing a list of keywords', () => {
    it('should produce the keyword tokens in order', () => {
      lexer.reset('define define-struct');

      let token = lexer.next();
      expect(token.type).toBe('keyword');
      expect(token.text).toBe('define');

      lexer.next();  // whitespace

      token = lexer.next();
      expect(token.type).toBe('keyword');
      expect(token.text).toBe('define-struct');
    });
  });
});

describe('test lexing names', () => {
  describe('lexing a name with a keyword as a substring', () => {
    it('should produce a name token (NOT a keyword token)', () => {
      lexer.reset('define-struct-more');

      const token = lexer.next();
      expect(token.type).toBe('name');
      expect(token.text).toBe('define-struct-more');
    });
  });

  describe('lexing the characters `-.`', () => {
    it('should produce a name token', () => {
      lexer.reset('-.');

      const token = lexer.next();
      expect(token.type).toBe('name');
      expect(token.text).toBe('-.');
    });
  });

  describe('lexing two numbers back-to-back', () => {
    it('should produce a name token', () => {
      lexer.reset('-232342-232.3');

      const token = lexer.next();
      expect(token.type).toBe('name');
      expect(token.text).toBe('-232342-232.3');
    });
  });

  describe('lexing a fraction with decimal components', () => {
    it('should produce a name token', () => {
      lexer.reset('-2/4.5');

      const token = lexer.next();
      expect(token.type).toBe('name');
      expect(token.text).toBe('-2/4.5');
    });
  });
});

describe('test lexing strings', () => {
  describe('lexing a string with escaped characters', () => {
    it('should produce the string with escaped characters', () => {
      lexer.reset('"hello\tworld\n"');
      
      const token = lexer.next();
      expect(token.type).toBe('string');
      expect(token.text).toBe('"hello\tworld\n"');
    });
  });
});

describe('test lexing numbers', () => {
  describe('lexing an integer', () => {
    it('should produce the integer', () => {
      lexer.reset('4');
      
      let token = lexer.next();
      expect(token.type).toBe('integer');
      expect(token.text).toBe('4');

      lexer.reset('-924');

      token = lexer.next();
      expect(token.type).toBe('integer');
      expect(token.text).toBe('-924');
    });
  });

  describe('lexing a decimal', () => {
    it('should produce the decimal', () => {
      lexer.reset('4.3');
      
      let token = lexer.next();
      expect(token.type).toBe('decimal');
      expect(token.text).toBe('4.3');

      lexer.reset('5.');
      
      token = lexer.next();
      expect(token.type).toBe('decimal');
      expect(token.text).toBe('5.');

      lexer.reset('-.4');

      token = lexer.next();
      expect(token.type).toBe('decimal');
      expect(token.text).toBe('-.4');
    });
  });

  describe('lexing a fraction', () => {
    it('should produce the fraction', () => {
      lexer.reset('1/2');
      
      let token = lexer.next();
      expect(token.type).toBe('fraction');
      expect(token.text).toBe('1/2');

      lexer.reset('-4/3');
      
      token = lexer.next();
      expect(token.type).toBe('fraction');
      expect(token.text).toBe('-4/3');
    });
  });
});

describe('test lexing booleans', () => {
  describe('lexing a true value', () => {
    it('should produce a true token', () => {
      lexer.reset('#true');
      
      let token = lexer.next();
      expect(token.type).toBe('true');
      expect(token.text).toBe('#true');

      lexer.reset('#t');

      token = lexer.next();
      expect(token.type).toBe('true');
      expect(token.text).toBe('#t');

      lexer.reset('#T');

      token = lexer.next();
      expect(token.type).toBe('true');
      expect(token.text).toBe('#T');
    });
  });

  describe('lexing a false value', () => {
    it('should produce a false token', () => {
      lexer.reset('#false');
      
      let token = lexer.next();
      expect(token.type).toBe('false');
      expect(token.text).toBe('#false');

      lexer.reset('#f');

      token = lexer.next();
      expect(token.type).toBe('false');
      expect(token.text).toBe('#f');

      lexer.reset('#F');

      token = lexer.next();
      expect(token.type).toBe('false');
      expect(token.text).toBe('#F');
    });
  });
});
