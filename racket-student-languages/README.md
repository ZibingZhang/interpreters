# Racket Student Languages
The end goal behind this project is to create an web based IDE that can run the Racket Student Languages.
Ideally it would support up to [Intermediate Student with `lambda`](https://docs.racket-lang.org/htdp-langs/intermediate-lam.html "ISL with lambda") along with [Big Bang](https://docs.racket-lang.org/teachpack/2htdpuniverse.html "Big Bang").

## The Interpreter Pipeline
```
text → token[] → sexp[] → ir1[] → ir2[] → output
```
The pipeline from input text to output is quite long with multiple [intermediate representations](https://en.wikipedia.org/wiki/Intermediate_representation "Intermediate Representation").
