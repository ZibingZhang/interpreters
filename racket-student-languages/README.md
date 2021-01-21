# Racket Student Languages
The end goal behind this project is to create an web based IDE that can run the Racket Student Languages.
Ideally it would support up to [Intermediate Student with `lambda`](https://docs.racket-lang.org/htdp-langs/intermediate-lam.html) along with [Images](https://docs.racket-lang.org/teachpack/2htdpimage.html) and [Worlds and the Universe](https://docs.racket-lang.org/teachpack/2htdpuniverse.html).
It currently only supports a subset of the [Beginning Student Language](https://docs.racket-lang.org/htdp-langs/beginner.html).

A hosted version of the code can be found [here](https://zibingzhang.com/racket/).

# Table of Contents
* [Racket Student Languages](#racket-student-languages)
* [Table of Contents](#table-of-contents)
* [Deploying](#deploying)
* [Third-Party Tools](#third-party-tools)
  * [Ace](#ace)
* [Design](#design)
  * [Error Reporting](#error-reporting)

# Deploying
The file from [here](https://github.com/ajaxorg/ace-builds/blob/master/src-min-noconflict/ace.js) (package 06.07.20) must be copied to ace/ace.js in order for the page to run.

# Third-Party Tools
## Ace
The editor used for editing and writing code is [Ace](https://github.com/ajaxorg/ace), a.k.a. Ajax.org Cloud9 Editor.

# Design
## Error Reporting
There are many errors that could potentially arise during the interpretation process.

The first errors that will be thrown are the ones during the process of reading the input and translating it to a list of S-expressions.
In this step, errors will be thrown for fractions with a zero denominator, mismatched braces, or missing closing quotes for strings.
The S-expression is then turned into an `IR1` for further analysis.
There are some errors that could be caught in this stage, but they are let through for the sake of better error messages later on.

The transformation of the `IR1`s into `IR2`s is where the bulk of pre-runtime errors are thrown.
The form of each `IR1` is checked over.
For instance, checks are made so that `if` expression have three parts and that each part is also transformed to a valid `IR2`.
The list of `IR1`s are traversed twice in this state.
The first pass will define all variables and functions so that the subsequent pass will not error out if `function1` calls `function2` defined later on.
The second pass makes sure all names are defined so that during execution, all names used will at some point be defined.
This is not to say all names will be defined when used, this is impossible to check until runtime.

There are some errors that are impossible to catch until runtime, such as whether all `cond` branches will be false, if the question of an `if` is a boolean, or if a variable is defined when it is used.

Tests are special, in that they are not _resolved_ until the end.
There may be variables that are undefined, but if they reside in tests this will not raise an error until the tests are run.

During the transformation of `IR1`s to `IR2`s, the errors are thrown in a peculiar order.

### Example A
```Beginning Student Language
f
(define (f x) x)
f
```
In this example, an error will originate from line 3 before line 1. Once line 3 is "fixed" to be `(f 1)`, only then will an error originate from line 1.
