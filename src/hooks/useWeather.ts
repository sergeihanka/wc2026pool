import { useEffect, useState } from 'react'

export interface WeatherData {
  tempC: number
  tempF: number
  conditionCode: number  // WMO weather code
  condition: string
  humidity: number
  windKph: number
  isDay: boolean
}

// WMO weather interpretation codes → label
function describeCode(code: number): string {
  if (code === 0)            return 'Clear sky'
  if (code <= 2)             return 'Partly cloudy'
  if (code === 3)            return 'Overcast'
  if (code <= 49)            return 'Fog'
  if (code <= 59)            return 'Drizzle'
  if (code <= 69)            return 'Rain'
  if (code <= 79)            return 'Snow'
  if (code <= 82)            return 'Rain showers'
  if (code <= 84)            return 'Snow showers'
  if (code <= 94)            return 'Thunderstorm'
  return 'Thunderstorm'
}

function weatherEmoji(code: number, isDay: boolean): string {
  if (code === 0)  return isDay ? '☀️' : '🌙'
  if (code <= 2)   return isDay ? '⛅' : '🌤️'
  if (code === 3)  return '☁️'
  if (code <= 49)  return '🌫️'
  if (code <= 67)  return '🌧️'
  if (code <= 77)  return '❄️'
  if (code <= 82)  return '🌦️'
  if (code <= 94)  return '⛈️'
  return '🌩️'
}

export function useWeather(lat: number | null, lon: number | null, utcDate: string) {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (lat === null || lon === null) return
    let cancelled = false
    setLoading(true)

    // Use hourly data so we can look up the match's specific local hour
    const matchDate = utcDate.slice(0, 10)
    const url = `https://api.open-meteo.com/v1/forecast?` +
      `latitude=${lat}&longitude=${lon}` +
      `&hourly=temperature_2m,relative_humidity_2m,weathercode,windspeed_10m,is_day` +
      `&temperature_unit=celsius` +
      `&wind_speed_unit=kmh` +
      `&timeformat=iso8601` +
      `&timezone=auto` +
      `&start_date=${matchDate}&end_date=${matchDate}`

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        const matchHour = new Date(utcDate).getHours()
        const hourly = data.hourly
        const idx = hourly.time.findIndex((t: string) => new Date(t).getHours() === matchHour)
        const i = idx >= 0 ? idx : 12

        const tempC = Math.round(hourly.temperature_2m[i])
        const code = hourly.weathercode[i] as number
        const isDay = hourly.is_day[i] === 1
        setWeather({
          tempC,
          tempF: Math.round(tempC * 9 / 5 + 32),
          conditionCode: code,
          condition: `${weatherEmoji(code, isDay)} ${describeCode(code)}`,
          humidity: Math.round(hourly.relative_humidity_2m[i]),
          windKph: Math.round(hourly.windspeed_10m[i]),
          isDay,
        })
        setLoading(false)
      })
      .catch(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [lat, lon, utcDate])

  return { weather, loading }
}
