"""WAQI API service for reliable AQI data fetching."""

import asyncio
import json
import logging
from typing import Dict, List, Tuple, Optional

import httpx
from fastapi import HTTPException

LOGGER = logging.getLogger(__name__)

# Police station coordinates from GeoJSON mapped to names from constants.py
POLICE_STATION_COORDINATES = {
    "adarsh nagar": (77.1752284, 28.709987),
    "alipur": (77.1386959, 28.7989271),
    "amar colony": (77.2406462, 28.5593152),
    'aman vihar':(77.0645148, 28.7181969),
    "anand vihar":(77.2935156, 28.6540846),
    "baba haridas nagar":(76.9611726, 28.6389792),
    "bhalswa dairy":(77.1655833, 28.7427183),
    "anand parbat": (77.1745147, 28.6595491),
    "ashok vihar": (77.1737643, 28.6925229),
    "badarpur": (77.3038557, 28.4938049),
    "bara hindu rao": (77.2081428, 28.6656794),
    "barakhamba road": (77.2257544, 28.6306772),
    "bawana": (77.0416937, 28.7965475),
    "begumpur": (77.0726142, 28.7223213),
    "bhajanpura": (77.264855, 28.7011244),
    "bharat nagar":(77.1781408, 28.6804957),
    "bindapur": (77.0767921, 28.6116861),
    "burari": (77.1970976, 28.7366215),
    "chanakyapuri": (77.1959079, 28.6030509),
    "chandni mahal": (77.2362049, 28.6436547),
    "chhawla": (76.9950081, 28.5868774),
    "chitranjan park (cr park)": (77.2492756, 28.5367953),
    "civil lines": (77.2217181, 28.6890036),
    "connaught place": (77.2141392, 28.6299111),
    "dabri": (77.085569, 28.613091),
    "daryaganj": (77.2408336, 28.6419774),
    "db gupta road": (77.1932999, 28.6528663),
    "defence colony": (77.2330768, 28.5648616),
    "delhi cantt": (77.1239359, 28.59897),
    "dwarka sector-23": (77.0581247, 28.5646858),
    "dwarka north":(77.0283106, 28.5910626),
    "dwarka south":(77.066624, 28.5779942),
    "farsh bazar": (77.2863966, 28.6650097),
    "fatehpur beri": (77.1507723, 28.4654124),
    "gandhi nagar": (77.2676243, 28.6599666),
    "geeta colony": (77.2760615, 28.6553387),
    "ghazipur":(77.3324677, 28.6246442),
    "gtb enclave":(77.3158649, 28.6856021),
    "gokalpuri": (77.2864660, 28.7024409),
    "govindpuri": (77.2656643, 28.5307476),
    "greater kailash": (77.2432857, 28.5462728),
    "gulabi bagh": (77.1923634, 28.6697732),
    "h. n. din": (77.2437789, 28.5922404),
    'hari nagar':(77.1093561, 28.6228272),
    "harsh vihar": (77.3186284, 28.7058868),
    "hauz khas": (77.20824, 28.5491609),
    "hauz qazi": (77.2257729, 28.6498882),
    "i.p. estate": (77.24742, 28.6271868),
    "inderpuri": (77.1451802, 28.6310983),
    "jafrabad":(77.2728727, 28.6790474),
    "jaffarpur kalan": (76.914548, 28.5958773),
    "jagatpuri": (77.2838032, 28.6438298),
    "jahangirpuri": (77.1752291, 28.7335973),
    "jama masjid": (77.2340546, 28.6528612),
    "jamia nagar": (77.2921969, 28.5619285),
    "jaitpur": (77.3196082, 28.5037251),
    "jyoti nagar":(77.2909364, 28.696443),
    "kalkaji": (77.2559679, 28.5470259),
    "kalyanpuri": (77.3175012, 28.6132579),
    "kamla market": (77.2262106, 28.6422216),
    "kanjhawala": (77.0033061, 28.7255557),
    "kapashera": (77.087363, 28.5295042),
    "karawal nagar": (77.2751812, 28.7328459),
    "karol bagh": (77.1928591, 28.6522586),
    "kashmere gate": (77.231063, 28.6627971),
    "keshav puram": (77.1596387, 28.6838831),
    "khajuri khas": (77.2547673, 28.7133419),
    "khyala":(77.0964194, 28.651773),
    "kirti nagar":(77.1353084, 28.6402339),
    "kn katju marg":(77.1209558, 28.7309856),
    "madhu vihar":(77.306125, 28.6251642),
    "mahendra park":(77.1640754, 28.7256535),
    "kotla mubarakpur": (77.2251092, 28.5760123),
    "krishna nagar": (77.2802221, 28.6672157),
    "lahori gate": (77.2189639, 28.6556548),
    "lajpat nagar": (77.2403994, 28.5683858),
    "lodhi colony": (77.2263869, 28.5879818),
    "malviya nagar": (77.2045739, 28.5307629),
    "mandawali": (77.3063738, 28.6252562),
    "mandir marg": (77.2032679, 28.6390665),
    "mangolpuri": (77.0914815, 28.6963453),
    "mansarovar park":(77.2984914, 28.6829761),
    "mianwali nagar":(77.1009645, 28.670992),
    "mehrauli":(77.1799951, 28.5217342),
    "mayapuri":(77.121477, 28.6266733),
    "maurice nagar": (77.2069901, 28.6925384),
    "maurya enclave": (77.1461137, 28.700265),
    "mayur vihar": (77.3040968, 28.6071228),
    "model town": (77.1937399, 28.7023621),
    "moti nagar":(77.1467479, 28.6604639),
    "mundka":(76.9605492, 28.6707033),
    'nangloi':(77.064288, 28.6833475),
    "mukherjee nagar": (77.2088329, 28.7000271),
    "nabi karim": (77.2173521, 28.6497358),
    "najafgarh": (76.9829968, 28.609964),
    "nand nagri": (77.3076845, 28.6973773),
    "naraina": (77.1375874, 28.6331459),
    "narela": (77.0880464, 28.8532894),
    "neb sarai": (77.2138967, 28.4989433),
    "new ashok nagar": (77.3234365, 28.6037645),
    "new friends colony": (77.2674027, 28.562371),
    "new usmanpur": (77.2619612, 28.6726032),
    "nihal vihar":(77.0712738, 28.6649193),
    "okhla industrial area": (77.2744829, 28.5271264),
    "pahar ganj": (77.2089105, 28.6456026),
    "palam village": (77.0829131, 28.5882737),
    "pandav nagar": (77.3028118, 28.6201584),
    "parliament street": (77.2130074, 28.6249243),
    "paschim vihar":(77.0876514, 28.6682652),
    "patel nagar": (77.1578745, 28.6523319),
    "prasad nagar": (77.1807387, 28.6479689),
    "prashant vihar": (77.1273085, 28.7178918),
    'preet vihar':(77.2952597, 28.63876),
    "pul prahladpur": (77.2907133, 28.5019406),
    'punjabi bagh':(77.1321312, 28.6741777),
    "rajinder nagar": (77.182831, 28.6347463),
    'rajouri garden':(77.1199405, 28.651498), 
    'ranhola':(77.0356073, 28.6539228), 
    'rani bagh':(77.1192169, 28.6976142), 
    'ranjeet nagar':(77.1578745, 28.6523319),   
    'rohini north':(77.1179044, 28.7088597), 
    'rohini south':(77.1155834, 28.7023636),
    "roop nagar": (77.2025435, 28.6848582),
    "sadar bazar": (77.2108743, 28.6540994),
    'safdarjung enclave':(77.1994672, 28.574319), 
    'sagarpur':(77.0998385, 28.6094773),
    "saket": (77.2169771, 28.5262496),
    "samaypur badli": (77.1413764, 28.7250883),
    "sangam vihar": (77.2434007, 28.509647),
    "sarai rohilla": (77.1834338, 28.6688069),
    "sarita vihar": (77.2814924, 28.5402597),
    "sarojini nagar": (77.1994586, 28.5745554),
    "seelampur": (77.2676466, 28.6744562),
    "seemapuri": (77.3162599, 28.6779134),
    "shahbad dairy": (77.0788387, 28.7476203),
    "shahdara": (77.2851504, 28.6745019),
    "shakarpur": (77.2706621, 28.6373766),
    "shalimar bagh": (77.1571577, 28.7171097),
    'sonia vihar':(77.2458753, 28.7459619),
    "south campus": (77.1785889, 28.570619),
    "subhash place": (77.1441492, 28.6892882),
    "subzi mandi": (77.2074478, 28.6693855),
    'sunlight colony':(77.2600383, 28.5781562),
    "sultanpuri": (77.0789438, 28.7028222),
    "swaroop nagar": (77.1561302, 28.7585547),
    "tilak marg": (77.2354392, 28.6179586),
    'tilak nagar':(77.1353084, 28.6402339),
    "timarpur": (77.2241975, 28.7065559),
    "tughlak road": (77.210571, 28.5979859),
    "vasant kunj north": (77.1518159, 28.5352237),
    "vasant kunj south": (77.1516235, 28.5353347),
    'uttam nagar':(77.0648647, 28.6253591),
    "vasant vihar": (77.1691535, 28.5581465),
    "vivek vihar": (77.3064175, 28.6669815),
    "r.k.puram": (77.1785559, 28.5705215),
    "kotwali": (77.2311665, 28.6585669),
    'vijay vihar':(77.0968496, 28.702782), 
    'vikaspuri':(77.0681776, 28.6302022),
    'welcome':(77.2784057, 28.6818112),
    "ambedkar nagar": (77.2407504, 28.5235428),
    "budh vihar": (77.1080145, 28.7174459),
}


async def fetch_aqi_from_waqi(
    waqi_token: str,
    stations: Optional[List[str]] = None,
    max_concurrent: int = 50,
    retry_delay: float = 0.5,
    max_retries: int = 2
) -> Dict[str, Dict]:
    """Fetch AQI data for all Delhi police stations from WAQI API.
    
    Args:
        waqi_token: WAQI API token
        stations: Subset of stations to query (defaults to all configured stations)
        max_concurrent: Maximum concurrent requests; WAQI quota allows up to 1000 rps
        retry_delay: Delay between retries in seconds
        max_retries: Maximum number of retries per request
        
    Returns:
        Dictionary mapping station names to AQI data including:
        - aqi: Air Quality Index value
        - status: "Good", "Moderate", etc.
        - location: Station location info
        - error: Error message if fetch failed
    """
    if not waqi_token:
        raise HTTPException(status_code=500, detail="WAQI API token not configured")
    
    if stations is None:
        station_coords = POLICE_STATION_COORDINATES
    else:
        station_coords = {}
        for station in stations:
            key = station.lower()
            coords = POLICE_STATION_COORDINATES.get(key)
            if not coords:
                LOGGER.warning("No WAQI coordinates configured for station '%s'", station)
                continue
            station_coords[key] = coords

        if not station_coords:
            raise HTTPException(status_code=400, detail="No valid stations supplied for WAQI AQI fetch")

    semaphore = asyncio.Semaphore(max(1, min(max_concurrent, len(station_coords))))
    results = {}
    
    async def fetch_station_aqi(station_name: str, lat: float, lng: float) -> Tuple[str, Dict]:
        """Fetch AQI for a single station with retries."""
        async with semaphore:
            for attempt in range(max_retries + 1):
                try:
                    url = f"http://api.waqi.info/feed/geo:{lat};{lng}/"
                    params = {"token": waqi_token}
                    
                    async with httpx.AsyncClient(timeout=10.0) as client:
                        response = await client.get(url, params=params)
                        
                    if response.status_code != 200:
                        if attempt < max_retries:
                            await asyncio.sleep(retry_delay * (2 ** attempt))
                            continue
                        return station_name, {
                            "error": f"HTTP {response.status_code}",
                            "aqi": 150.0,  # fallback value
                            "status": "Moderate"
                        }
                    
                    data = response.json()
                    
                    if data.get("status") != "ok":
                        if attempt < max_retries:
                            await asyncio.sleep(retry_delay * (2 ** attempt))
                            continue
                        return station_name, {
                            "error": data.get("data", "Unknown API error"),
                            "aqi": 150.0,
                            "status": "Moderate"
                        }
                    
                    aqi_data = data.get("data", {})
                    aqi_value = aqi_data.get("aqi")
                    
                    if aqi_value is None or aqi_value == "-":
                        # Some stations might not have AQI data
                        aqi_value = 150.0
                    else:
                        try:
                            aqi_value = float(aqi_value)
                        except (ValueError, TypeError):
                            aqi_value = 150.0
                    
                    return station_name, {
                        "aqi": aqi_value,
                        "status": categorize_aqi(aqi_value),
                        "location": aqi_data.get("city", {}).get("name", station_name),
                        "coordinates": [lng, lat],
                        "time": aqi_data.get("time", {}).get("s", ""),
                        "attributions": aqi_data.get("attributions", [])
                    }
                    
                except Exception as exc:
                    LOGGER.warning(f"Attempt {attempt + 1} failed for {station_name}: {exc}")
                    if attempt < max_retries:
                        await asyncio.sleep(retry_delay * (2 ** attempt))
                        continue
                    
                    return station_name, {
                        "error": str(exc),
                        "aqi": 150.0,
                        "status": "Moderate"
                    }
            
            # This shouldn't be reached, but just in case
            return station_name, {
                "error": "Max retries exceeded",
                "aqi": 150.0,
                "status": "Moderate"
            }
    
    # Create tasks for all stations
    tasks = []
    for station_name, (lng, lat) in station_coords.items():
        task = fetch_station_aqi(station_name, lat, lng)
        tasks.append(task)
    
    LOGGER.info(f"Fetching AQI data for {len(tasks)} police stations from WAQI API")
    
    # Execute all requests concurrently with semaphore limiting
    completed_tasks = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Process results
    success_count = 0
    error_count = 0
    
    for result in completed_tasks:
        if isinstance(result, Exception):
            LOGGER.error(f"Task failed with exception: {result}")
            error_count += 1
            continue
            
        station_name, station_data = result
        results[station_name] = station_data
        
        if "error" in station_data:
            error_count += 1
        else:
            success_count += 1
    
    LOGGER.info(f"AQI fetch completed: {success_count} successful, {error_count} errors")
    
    return results


def categorize_aqi(aqi_value: float) -> str:
    """Return a descriptive AQI category for a numeric AQI value."""
    try:
        aqi = float(aqi_value)
    except (ValueError, TypeError):
        return "Unknown"
    
    if aqi <= 50:
        return "Good"
    elif aqi <= 100:
        return "Moderate"
    elif aqi <= 150:
        return "Unhealthy for Sensitive Groups"
    elif aqi <= 200:
        return "Unhealthy"
    elif aqi <= 300:
        return "Very Unhealthy"
    else:
        return "Hazardous"


def get_station_coordinates(station_name: str) -> Optional[Tuple[float, float]]:
    """Get coordinates for a police station by name."""
    return POLICE_STATION_COORDINATES.get(station_name.lower())


def get_all_station_names() -> List[str]:
    """Get list of all available police station names."""
    return list(POLICE_STATION_COORDINATES.keys())