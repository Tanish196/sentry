#!/usr/bin/env python3
"""Test script to verify WAQI API integration."""

import asyncio
import sys
import logging

# Add the FastAPI app to the path
sys.path.append(".")

from app.services.waqi_service import fetch_aqi_from_waqi, get_all_station_names

logging.basicConfig(level=logging.INFO)

async def test_waqi_service():
    """Test the WAQI service with a small subset of stations."""
    print("Testing WAQI API integration...")
    print(f"Total available stations: {len(get_all_station_names())}")
    
    try:
        # Test with a small batch to avoid overwhelming the API
        result = await fetch_aqi_from_waqi(
            waqi_token="fc06969e9f076c24793423ed7d231e038c3767d9",
            max_concurrent=5,  # Small number for testing
            retry_delay=0.5,
            max_retries=1
        )
        
        print(f"\n✅ Successfully fetched data for {len(result)} stations")
        
        # Show sample results
        success_count = 0
        error_count = 0
        sample_stations = list(result.items())[:5]  # First 5 stations
        
        for station_name, station_data in sample_stations:
            if "error" in station_data:
                print(f"❌ {station_name}: {station_data['error']} (AQI: {station_data['aqi']})")
                error_count += 1
            else:
                print(f"✅ {station_name}: AQI {station_data['aqi']} ({station_data['status']})")
                success_count += 1
        
        print(f"\n📊 Summary: {success_count} successful, {error_count} errors from sample")
        print(f"🌍 API Coverage: {len(result)} total stations processed")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_waqi_service())
    if success:
        print("\n🎉 WAQI API integration test completed successfully!")
        print("\n📋 Available API endpoints:")
        print("  GET /aqi - Get AQI data for all police stations")
        print("  GET /aqi/legacy - Get AQI data using Gemini (backup)")
        print("  GET /aqi/station/{name} - Get AQI data for specific station")
        print("  GET /aqi/stations - List all available stations with coordinates")
    else:
        print("\n💥 WAQI API integration test failed!")
        sys.exit(1)