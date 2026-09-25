"""
Weather Fetcher Node — OpenWeather API Integration.

Fetches real-time weather data for the user's city using the
OpenWeather Current Weather + Forecast APIs.

API: https://api.openweathermap.org/data/2.5/weather
"""
import requests
from datetime import datetime
from src.config import Config


_OW_BASE = "https://api.openweathermap.org/data/2.5"
_OW_ICON_BASE = "https://openweathermap.org/img/wn"

# Severe condition triggers for alerts
_SEVERE_CONDITIONS = {
    "Thunderstorm", "Drizzle", "Rain", "Snow", "Mist", "Smoke",
    "Haze", "Dust", "Fog", "Sand", "Ash", "Squall", "Tornado"
}

_CONDITION_EMOJIS = {
    "Clear": "☀️", "Clouds": "☁️", "Rain": "🌧️", "Drizzle": "🌦️",
    "Thunderstorm": "⛈️", "Snow": "❄️", "Mist": "🌫️", "Fog": "🌫️",
    "Haze": "🌁", "Tornado": "🌪️", "Smoke": "💨", "Dust": "🌬️",
}


def _get_current_weather(city: str, api_key: str) -> dict:
    """Fetch current weather from OpenWeatherMap."""
    resp = requests.get(
        f"{_OW_BASE}/weather",
        params={"q": city, "appid": api_key, "units": "metric"},
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()


def _get_forecast(city: str, api_key: str) -> dict:
    """Fetch 24-hour forecast (5-day/3-hour forecast, take first 8 = 24h)."""
    resp = requests.get(
        f"{_OW_BASE}/forecast",
        params={"q": city, "appid": api_key, "units": "metric", "cnt": 8},
        timeout=10,
    )
    if resp.status_code == 200:
        return resp.json()
    return {}


def _build_alerts(data: dict) -> list[str]:
    """Build weather alert messages based on conditions."""
    alerts = []
    condition = data.get("weather", [{}])[0].get("main", "")
    wind = data.get("wind", {}).get("speed", 0)
    temp = data.get("main", {}).get("temp", 25)
    humidity = data.get("main", {}).get("humidity", 50)

    if condition in _SEVERE_CONDITIONS and condition not in ("Mist", "Haze"):
        alerts.append(f"⚠️ Severe weather: {condition} conditions reported")
    if wind > 10:
        alerts.append(f"🌬️ High winds: {wind:.1f} m/s — avoid outdoor events")
    if temp > 40:
        alerts.append(f"🥵 Extreme heat: {temp:.0f}°C — stay hydrated, limit outdoor exposure")
    if temp < 5:
        alerts.append(f"🥶 Very cold: {temp:.0f}°C — bundle up, frost possible")
    if humidity > 85:
        alerts.append(f"💧 Very humid: {humidity}% — feels significantly hotter outdoors")

    return alerts


def _build_forecast_summary(forecast_data: dict) -> str:
    """Summarize the 24-hour forecast."""
    if not forecast_data or "list" not in forecast_data:
        return "Forecast data unavailable."

    items = forecast_data["list"][:8]  # 24 hours
    conditions = set()
    temps = []
    for item in items:
        cond = item.get("weather", [{}])[0].get("main", "")
        if cond:
            conditions.add(cond)
        temp = item.get("main", {}).get("temp")
        if temp is not None:
            temps.append(temp)

    if not temps:
        return "Forecast data unavailable."

    temp_range = f"{min(temps):.0f}°C – {max(temps):.0f}°C"
    conds = ", ".join(sorted(conditions))
    return f"24h forecast: {conds} | Temps: {temp_range}"


def run(state: dict) -> dict:
    """
    Fetch real-time weather for the user's city.

    Swytchcode tools used: openweather.current.get
    Fallback: Direct OpenWeather REST API
    """
    log = list(state.get("execution_log", []))
    city = state.get("city", Config.DEFAULT_CITY) or Config.DEFAULT_CITY
    api_key = Config.OPENWEATHER_API_KEY

    log.append(f"🌦️ [OpenWeather] Fetching weather for {city}...")

    if not api_key:
        log.append("⚠️ [OpenWeather] API key not configured — using mock data")
        # Return mock data for demo
        return {
            **state,
            "weather_data": {},
            "weather_summary": f"Demo weather for {city}: 28°C, Partly Cloudy",
            "temperature_c": 28.0,
            "feels_like_c": 30.0,
            "humidity": 72,
            "wind_speed": 4.2,
            "weather_condition": "Clouds",
            "weather_icon": "04d",
            "weather_alerts": [],
            "forecast_summary": "24h forecast: Partly cloudy | Temps: 26°C – 32°C",
            "execution_log": log,
        }

    try:
        # ── Fetch current weather ────────────────────────────────────
        data = _get_current_weather(city, api_key)

        main = data.get("main", {})
        weather = data.get("weather", [{}])[0]
        wind = data.get("wind", {})

        temp = main.get("temp", 0)
        feels_like = main.get("feels_like", temp)
        humidity = main.get("humidity", 0)
        wind_speed = wind.get("speed", 0)
        condition = weather.get("main", "Clear")
        description = weather.get("description", "").capitalize()
        icon = weather.get("icon", "01d")
        emoji = _CONDITION_EMOJIS.get(condition, "🌡️")

        # ── Fetch forecast ────────────────────────────────────────────
        forecast_data = _get_forecast(city, api_key)
        forecast_summary = _build_forecast_summary(forecast_data)

        # ── Build alerts ──────────────────────────────────────────────
        alerts = _build_alerts(data)

        # ── Human-readable summary ────────────────────────────────────
        summary = (
            f"{emoji} {city}: {description} | "
            f"{temp:.1f}°C (feels {feels_like:.1f}°C) | "
            f"Humidity: {humidity}% | Wind: {wind_speed:.1f} m/s"
        )

        log.append(f"✅ [OpenWeather] {summary}")
        if alerts:
            log.append(f"⚠️ [OpenWeather] {len(alerts)} weather alert(s) raised")

        return {
            **state,
            "weather_data": data,
            "weather_summary": summary,
            "temperature_c": round(temp, 1),
            "feels_like_c": round(feels_like, 1),
            "humidity": int(humidity),
            "wind_speed": round(wind_speed, 1),
            "weather_condition": condition,
            "weather_icon": icon,
            "weather_alerts": alerts,
            "forecast_summary": forecast_summary,
            "city": city,
            "execution_log": log,
        }

    except requests.HTTPError as e:
        if e.response is not None and e.response.status_code == 404:
            log.append(f"❌ [OpenWeather] City '{city}' not found")
        else:
            log.append(f"❌ [OpenWeather] HTTP error: {e}")
        return {**state, "weather_alerts": [], "weather_summary": f"Could not fetch weather for {city}", "execution_log": log}
    except Exception as e:
        log.append(f"❌ [OpenWeather] Error: {e}")
        return {**state, "weather_alerts": [], "weather_summary": "Weather fetch failed", "execution_log": log}
