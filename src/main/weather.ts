import https from 'https'
import { app } from 'electron'
import { join } from 'path'
import fs from 'fs'

let memoryLocation: { lat: number; lon: number; name: string } | null = null
let memoryUnit: 'celsius' | 'fahrenheit' = 'celsius'
let loaded = false

function getSettingsPath(): string {
  const path = join(app.getPath('userData'), 'settings.json')
  console.log('[ClipMaster] Weather settings path:', path)
  return path
}

function readSettings(): Record<string, unknown> {
  try {
    const filePath = getSettingsPath()
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8')
      console.log('[ClipMaster] Weather settings file content:', content)
      return JSON.parse(content)
    } else {
      console.log('[ClipMaster] Weather settings file does not exist')
    }
  } catch (err) {
    console.error('[ClipMaster] Error reading weather settings:', err)
  }
  return {}
}

function writeSettings(patch: Record<string, unknown>): void {
  try {
    const filePath = getSettingsPath()
    const existing = readSettings()
    const newSettings = { ...existing, ...patch }
    console.log('[ClipMaster] Writing weather settings:', JSON.stringify(newSettings, null, 2))
    fs.writeFileSync(filePath, JSON.stringify(newSettings, null, 2), 'utf-8')
    console.log('[ClipMaster] Weather settings saved successfully')
  } catch (err) {
    console.error('[ClipMaster] Failed to save weather settings:', err)
  }
}

function ensureLoaded(): void {
  if (loaded) return
  loaded = true
  try {
    const settings = readSettings()
    if (settings.weatherLocation) {
      memoryLocation = settings.weatherLocation as { lat: number; lon: number; name: string }
    }
    if (settings.temperatureUnit) {
      memoryUnit = settings.temperatureUnit as 'celsius' | 'fahrenheit'
    }
  } catch {
    // Ignore errors when loading weather settings
  }
}

export interface WeatherData {
  temperature: number
  weatherCode: number
  humidity: number
  windSpeed: number
  location: string
  updatedAt: number
}

export interface GeocodingResult {
  id: number
  name: string
  latitude: number
  longitude: number
  country: string
  admin1?: string
}

function fetchJSON<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    console.log('[ClipMaster] fetchJSON requesting:', url)

    const options = new URL(url)
    const req = https.request(
      {
        hostname: options.hostname,
        path: options.pathname + options.search,
        method: 'GET',
        headers: {
          'User-Agent': 'ClipMaster/1.0'
        }
      },
      (res) => {
        let data = ''
        console.log('[ClipMaster] Response status:', res.statusCode)

        res.on('data', (chunk) => {
          data += chunk.toString()
        })

        res.on('end', () => {
          console.log('[ClipMaster] Response data length:', data.length)
          if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
            console.error('[ClipMaster] HTTP error:', res.statusCode, data)
            reject(new Error(`HTTP ${res.statusCode}: ${data}`))
            return
          }
          try {
            const json = JSON.parse(data) as T
            resolve(json)
          } catch (err) {
            console.error('[ClipMaster] JSON parse error:', err, 'data:', data.substring(0, 200))
            reject(err)
          }
        })
      }
    )

    req.on('error', (err) => {
      console.error('[ClipMaster] Request error:', err)
      reject(err)
    })

    req.setTimeout(10000, () => {
      console.error('[ClipMaster] Request timeout')
      req.destroy()
      reject(new Error('Request timeout'))
    })

    req.end()
  })
}

const WEATHER_CODE_MAP: Record<number, { icon: string; description: string }> = {
  0: { icon: '☀️', description: '晴' },
  1: { icon: '🌤️', description: '晴' },
  2: { icon: '⛅', description: '多云' },
  3: { icon: '☁️', description: '阴' },
  45: { icon: '🌫️', description: '雾' },
  48: { icon: '🌫️', description: '雾' },
  51: { icon: '🌧️', description: '小雨' },
  53: { icon: '🌧️', description: '小雨' },
  55: { icon: '🌧️', description: '小雨' },
  61: { icon: '🌧️', description: '雨' },
  63: { icon: '🌧️', description: '大雨' },
  65: { icon: '🌧️', description: '大雨' },
  71: { icon: '🌨️', description: '小雪' },
  73: { icon: '🌨️', description: '中雪' },
  75: { icon: '🌨️', description: '大雪' },
  77: { icon: '🌨️', description: '雪粒' },
  80: { icon: '🌦️', description: '阵雨' },
  81: { icon: '🌦️', description: '阵雨' },
  82: { icon: '🌦️', description: '暴雨' },
  85: { icon: '🌨️', description: '阵雪' },
  86: { icon: '🌨️', description: '阵雪' },
  95: { icon: '⛈️', description: '雷暴' },
  96: { icon: '⛈️', description: '雷暴冰雹' },
  99: { icon: '⛈️', description: '强雷暴' }
}

export function getWeatherInfo(code: number): { icon: string; description: string } {
  return WEATHER_CODE_MAP[code] || { icon: '🌡️', description: '未知' }
}

export async function searchLocation(query: string): Promise<GeocodingResult[]> {
  try {
    console.log('[ClipMaster] Searching location:', query)
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=zh&format=json`
    const data = await fetchJSON<{ results?: GeocodingResult[] }>(url)
    console.log('[ClipMaster] Search results:', data.results?.length || 0)
    return data.results || []
  } catch (error) {
    console.error('[ClipMaster] Geocoding error:', error)
    return []
  }
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData | null> {
  try {
    console.log('[ClipMaster] Fetching weather for:', lat, lon)
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`
    const data = await fetchJSON<{
      current?: {
        temperature_2m: number
        relative_humidity_2m: number
        weather_code: number
        wind_speed_10m: number
      }
    }>(url)

    console.log('[ClipMaster] Weather response:', data)

    if (!data.current) return null

    return {
      temperature: data.current.temperature_2m,
      weatherCode: data.current.weather_code,
      humidity: data.current.relative_humidity_2m,
      windSpeed: data.current.wind_speed_10m,
      location: '',
      updatedAt: Date.now()
    }
  } catch (error) {
    console.error('[ClipMaster] Weather fetch error:', error)
    return null
  }
}

export function getSavedLocation(): { lat: number; lon: number; name: string } | null {
  ensureLoaded()
  return memoryLocation
}

export function saveLocation(lat: number, lon: number, name: string): void {
  memoryLocation = { lat, lon, name }
  writeSettings({ weatherLocation: memoryLocation })
}

export function getTemperatureUnit(): 'celsius' | 'fahrenheit' {
  ensureLoaded()
  return memoryUnit
}

export function setTemperatureUnit(unit: 'celsius' | 'fahrenheit'): void {
  memoryUnit = unit
  writeSettings({ temperatureUnit: unit })
}
