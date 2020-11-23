from typing import Optional, Union
from callable import Callable

Literal = Optional[Union[float, str]]
LoxValue = Optional[Union[bool, float, str, Callable]]
