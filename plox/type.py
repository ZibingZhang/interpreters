from typing import Optional, Union
from callable import LoxCallable
from classes import LoxInstance

Literal = Optional[Union[float, str]]
LoxValue = Optional[Union[bool, float, str, LoxCallable, LoxInstance]]
