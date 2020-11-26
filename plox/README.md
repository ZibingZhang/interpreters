# Lox

This is a Python implementation of the interpreter described in the beginning
of the book [Crafting Interpreters](https://craftinginterpreters.com/) for the
Lox programming language.

Changes to the original specifications include...
- `print` keyword replaced by builtin function `println`
- In local scopes, you can use a variables name in its own initializer
- You can shadow the name of arguments in a function body

Additions to the original specifications include...
- Custom error messages for binary operators that are lacking a left operand
- Comma expressions
- The `?:` (ternary) operator
- If one of the operands is a string, the `+` operator automatically casts the
  other one to a string
- A runtime error is thrown for division by zero
- `break` and `continue` statements inside loops
