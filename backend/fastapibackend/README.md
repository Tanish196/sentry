# Sentry FastAPI Backend - API Documentation

## Overview
FastAPI service for tourist safety prediction in Delhi using ML models and real-time environmental data.

## Setup

### Prerequisites
- Python 3.9+
- Virtual environment (recommended)

### Installation
```bash
cd sentry/backend/fastapibackend
python -m venv my_env
# Windows
my_env\Scripts\activate
# Linux/Mac
source my_env/bin/activate

pip install -r requirements.txt
```

### Environment Variables
Copy `.env.example` to `.env` and add your API keys:

```bash
cp .env.example .env
```

Required keys:
- `OPENWEATHER_API_KEY`: Get from [OpenWeatherMap](https://openweathermap.org/api)
- `GEMINI_API_KEY`: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)

### Running the Server
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

### 1. Health Check
**GET** `/health`

Check if the service is running.

**Response:**
```json
{
  "status": "ok"
}
```

---

### 2. Get AQI for All Police Stations
**GET** `/aqi`

Returns current AQI (Air Quality Index) values for all 50 Delhi police stations using Gemini AI.

**Response:**
```json
{
  "timestamp": "2025-11-25T10:30:00Z",
  "data": [
    {
      "police_station": "connaught place",
      "aqi": 187.5,
      "aqi_category": "Unhealthy"
    },
    {
      "police_station": "hauz khas",
      "aqi": 165.2,
      "aqi_category": "Unhealthy for Sensitive Groups"
    }
    // ... 48 more stations
  ]
}
```

**AQI Categories:**
- 0-50: Good
- 51-100: Moderate
- 101-150: Unhealthy for Sensitive Groups
- 151-200: Unhealthy
- 201-300: Very Unhealthy
- 301+: Hazardous

---

### 3. Single Location Safety Prediction
**POST** `/predict-single`

Predict safety label for a single location with specific demographic and temporal parameters.

**Request Body:**
```json
{
  "police_station": "connaught place",
  "gender": "female",
  "family": "alone",
  "month": 7,
  "day": 15
}
```

**Parameters:**
- `police_station` (string): One of the 50 Delhi police stations (lowercase)
- `gender` (string): `"male"`, `"female"`, or `"other"`
- `family` (string): `"with_family"` or `"alone"`
- `month` (integer): 1-12
- `day` (integer): 1-31

**Response:**
```json
{
  "police_station": "connaught place",
  "predicted_label": "RISKY",
  "probabilities": {
    "DANGER": 0.1234,
    "RISKY": 0.6543,
    "SAFE": 0.2223
  },
  "weather_snapshot": {
    "temp": 35.2,
    "humidity": 68.5,
    "wind_speed": 12.4,
    "aqi": 187.5
  }
}
```

---

### 4. Batch Location Prediction
**POST** `/predict`

Predict safety labels for multiple locations simultaneously.

**Request Body:**
```json
{
  "locations": [
    {
      "city": "Delhi",
      "police_station": "connaught place",
      "gender": "female",
      "family": "with_family",
      "month": 7,
      "day": 15,
      "year": 2024
    },
    {
      "city": "Mumbai",
      "police_station": "colaba",
      "gender": "male",
      "family": "alone",
      "month": 8,
      "day": 20,
      "year": 2024
    }
  ]
}
```

**Response:**
```json
{
  "predictions": [
    {
      "city": "Delhi",
      "police_station": "connaught place",
      "predicted_label": "RISKY",
      "probabilities": {
        "DANGER": 0.12,
        "RISKY": 0.65,
        "SAFE": 0.23
      },
      "weather_snapshot": {
        "temp": 35.2,
        "humidity": 68.5,
        "wind_speed": 12.4,
        "aqi": 187.5
      }
    }
    // ... more predictions
  ]
}
```

---

## Delhi Police Stations

The service supports the following 50 police station areas:

```
adarsh nagar, alipur, aman vihar, amar colony, anand parbat, anand vihar,
ashok vihar, baba haridas nagar, badarpur, bara hindu rao, barakhamba road,
bawana, begumpur, bhajanpura, bhalswa dairy, bharat nagar, bindapur, burari,
chanakyapuri, chandni mahal, chhawla, chitranjan park cr park, civil lines,
connaught place, dabri, daryaganj, db gupta road, defence colony, delhi cantt,
dwarka north, dwarka sector 23, dwarka south, farsh bazar, fatehpur beri,
gandhi nagar, geeta colony, ghazipur, gokalpuri, govindpuri, greater kailash,
gtb enclave, gulabi bagh, h n din, hari nagar, harsh vihar, hauz khas,
hauz qazi, i p estate, inderpuri, jaffarpur kalan
```

## Testing

### Using cURL

**Get AQI data:**
```bash
curl -X GET "http://localhost:8000/aqi"
```

**Single prediction:**
```bash
curl -X POST "http://localhost:8000/predict-single" \
  -H "Content-Type: application/json" \
  -d '{
    "police_station": "connaught place",
    "gender": "female",
    "family": "alone",
    "month": 7,
    "day": 15
  }'
```

### Using Python

```python
import requests

# Get AQI data
response = requests.get("http://localhost:8000/aqi")
print(response.json())

# Single prediction
payload = {
    "police_station": "connaught place",
    "gender": "female",
    "family": "alone",
    "month": 7,
    "day": 15
}
response = requests.post("http://localhost:8000/predict-single", json=payload)
print(response.json())
```

## Model Information

The ML model uses the following features:
- Temporal: month, day
- Location: police_station
- Demographics: gender, family
- Weather: temperature (max/avg/min), humidity (max/avg/min), wind speed (max/avg/min), precipitation
- Air Quality: AQI, AQI median

**Safety Labels:**
- `SAFE`: Low risk environment
- `RISKY`: Moderate risk, caution advised
- `DANGER`: High risk, avoid if possible

## Error Handling

All endpoints return standard HTTP status codes:
- 200: Success
- 400: Bad request (invalid parameters)
- 500: Internal server error
- 502: External API failure (OpenWeather or Gemini)

Error responses include a `detail` field with the error message.