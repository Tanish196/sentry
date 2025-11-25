from typing import List
from pydantic import BaseModel


class AQIData(BaseModel):
    police_station: str
    aqi: float
    aqi_category: str


class AQIResponse(BaseModel):
    timestamp: str
    data: List[AQIData]
