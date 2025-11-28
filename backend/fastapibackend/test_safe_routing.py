"""
Test script to verify the safe routing endpoints are working.
"""
import asyncio
import httpx


async def test_safety_areas():
    """Test GET /api/safety-areas endpoint."""
    print("\n=== Testing GET /api/safety-areas ===")
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get("http://localhost:8000/api/safety-areas")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Success! Retrieved {len(data.get('features', []))} safety areas")
                print(f"   Metadata: {data.get('metadata')}")
                
                # Show sample feature
                if data.get('features'):
                    sample = data['features'][0]['properties']
                    print(f"   Sample area: {sample.get('station_name')} - {sample.get('risk_level')}")
            else:
                print(f"❌ Failed with status {response.status_code}")
                print(f"   Response: {response.text}")
        except Exception as e:
            print(f"❌ Error: {e}")


async def test_safe_route():
    """Test POST /api/safe-route endpoint."""
    print("\n=== Testing POST /api/safe-route ===")
    
    # Example coordinates in Delhi
    payload = {
        "start": [28.6139, 77.2090],  # Connaught Place
        "end": [28.7041, 77.1025],    # New Delhi Station
        "profile": "foot-walking",
        "avoid_risk_levels": ["forbidden"],
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                "http://localhost:8000/api/safe-route",
                json=payload
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Success! Route calculated")
                
                if data.get('routes'):
                    route = data['routes'][0]
                    print(f"   Distance: {route.get('summary', {}).get('distance', 0) / 1000:.2f} km")
                    print(f"   Duration: {route.get('summary', {}).get('duration', 0) / 60:.1f} min")
                    print(f"   Metadata: {data.get('metadata')}")
            else:
                print(f"❌ Failed with status {response.status_code}")
                print(f"   Response: {response.text}")
        except Exception as e:
            print(f"❌ Error: {e}")


async def test_log_endpoints():
    """Test logging endpoints."""
    print("\n=== Testing POST /api/log-entry ===")
    
    payload = {
        "geofence_id": "test_station",
        "station_name": "Test Station",
        "risk_level": "caution",
        "safety_score": 0.65,
        "lat": 28.7041,
        "lng": 77.1025,
        "timestamp": "2024-01-01T00:00:00Z"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "http://localhost:8000/api/log-entry",
                json=payload
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Success! Entry logged: {data.get('alert_id')}")
            else:
                print(f"❌ Failed with status {response.status_code}")
        except Exception as e:
            print(f"❌ Error: {e}")


async def main():
    print("\n" + "="*60)
    print("  Safe Routing Backend Test Suite")
    print("="*60)
    print("\nMake sure the backend is running on http://localhost:8000")
    print("And that you have configured ORS_API_KEY in your environment\n")
    
    await test_safety_areas()
    await test_safe_route()
    await test_log_endpoints()
    
    print("\n" + "="*60)
    print("  Tests Complete")
    print("="*60 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
