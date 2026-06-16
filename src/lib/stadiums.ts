// WC 2026 host stadiums — keyed by the venue name returned by football-data.org
// Coordinates used to fetch weather from Open-Meteo (free, no API key).
export interface StadiumInfo {
  name: string
  city: string
  country: string
  lat: number
  lon: number
  capacity: number
}

const STADIUMS: Record<string, StadiumInfo> = {
  // USA
  'MetLife Stadium':              { name: 'MetLife Stadium',              city: 'East Rutherford, NJ', country: 'USA', lat: 40.8135,  lon: -74.0745, capacity: 82_500 },
  'AT&T Stadium':                 { name: 'AT&T Stadium',                 city: 'Arlington, TX',        country: 'USA', lat: 32.7480,  lon: -97.0930, capacity: 80_000 },
  'SoFi Stadium':                 { name: 'SoFi Stadium',                 city: 'Inglewood, CA',        country: 'USA', lat: 33.9535,  lon: -118.3392, capacity: 70_240 },
  "Levi's Stadium":               { name: "Levi's Stadium",               city: 'Santa Clara, CA',      country: 'USA', lat: 37.4033,  lon: -121.9694, capacity: 68_500 },
  'Hard Rock Stadium':            { name: 'Hard Rock Stadium',            city: 'Miami Gardens, FL',    country: 'USA', lat: 25.9580,  lon: -80.2389,  capacity: 65_326 },
  'Lincoln Financial Field':      { name: 'Lincoln Financial Field',      city: 'Philadelphia, PA',     country: 'USA', lat: 39.9008,  lon: -75.1675,  capacity: 69_796 },
  'Arrowhead Stadium':            { name: 'Arrowhead Stadium',            city: 'Kansas City, MO',      country: 'USA', lat: 39.0490,  lon: -94.4839,  capacity: 76_416 },
  'Gillette Stadium':             { name: 'Gillette Stadium',             city: 'Foxborough, MA',       country: 'USA', lat: 42.0909,  lon: -71.2643,  capacity: 65_878 },
  'Mercedes-Benz Stadium':        { name: 'Mercedes-Benz Stadium',        city: 'Atlanta, GA',          country: 'USA', lat: 33.7554,  lon: -84.4009,  capacity: 71_000 },
  'Lumen Field':                  { name: 'Lumen Field',                  city: 'Seattle, WA',          country: 'USA', lat: 47.5952,  lon: -122.3316, capacity: 69_000 },
  'Rose Bowl':                    { name: 'Rose Bowl',                    city: 'Pasadena, CA',         country: 'USA', lat: 34.1614,  lon: -118.1676, capacity: 88_565 },
  // Canada
  'BC Place':                     { name: 'BC Place',                     city: 'Vancouver, BC',        country: 'Canada', lat: 49.2768, lon: -123.1118, capacity: 54_500 },
  'BMO Field':                    { name: 'BMO Field',                    city: 'Toronto, ON',          country: 'Canada', lat: 43.6332, lon: -79.4183,  capacity: 45_000 },
  // Mexico
  'Estadio Azteca':               { name: 'Estadio Azteca',               city: 'Mexico City',          country: 'Mexico', lat: 19.3029, lon: -99.1505,  capacity: 87_523 },
  'Estadio Akron':                { name: 'Estadio Akron',                city: 'Guadalajara',          country: 'Mexico', lat: 20.6730, lon: -103.4670, capacity: 49_850 },
  'Estadio BBVA':                 { name: 'Estadio BBVA',                 city: 'Guadalupe, NL',        country: 'Mexico', lat: 25.6694, lon: -100.2438, capacity: 53_500 },
}

// Fuzzy lookup — handles partial matches from the API (e.g. "Estadio" prefix variants)
export function getStadiumInfo(venueName: string | undefined): StadiumInfo | null {
  if (!venueName) return null
  // Exact match first
  if (STADIUMS[venueName]) return STADIUMS[venueName]
  // Partial match
  const lower = venueName.toLowerCase()
  for (const [key, info] of Object.entries(STADIUMS)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) return info
  }
  return null
}
