import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { WeatherData, GeocodingResult } from '../../../shared/types'

function WeatherWidget(): React.ReactElement {
  const [time, setTime] = useState(new Date())
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [weatherInfo, setWeatherInfo] = useState<{ icon: string; description: string } | null>(null)
  const [location, setLocation] = useState<{ name: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showLocationSearch, setShowLocationSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([])
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const loadWeather = useCallback(async (): Promise<void> => {
    const savedLocation = await window.clipboardAPI.getWeatherLocation()
    if (savedLocation) {
      setLocation({ name: savedLocation.name })
      setIsLoading(true)
      const data = await window.clipboardAPI.fetchWeather()
      if (data) {
        setWeather(data)
        const info = await window.clipboardAPI.getWeatherInfo(data.weatherCode)
        setWeatherInfo(info)
      }
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadWeather()
    }, 2000)
    const refreshTimer = setInterval(() => void loadWeather(), 30 * 60 * 1000)
    return () => {
      clearTimeout(timer)
      clearInterval(refreshTimer)
    }
  }, [loadWeather])

  const handleWeatherClick = (): void => {
    if (location) {
      void loadWeather()
    } else {
      setShowLocationSearch(true)
    }
  }

  const handleSearchLocation = async (): Promise<void> => {
    if (!searchQuery.trim()) return
    const results = await window.clipboardAPI.searchLocation(searchQuery)
    setSearchResults(results)
  }

  const handleSelectLocation = async (result: GeocodingResult): Promise<void> => {
    await window.clipboardAPI.setWeatherLocation(result.latitude, result.longitude, result.name)
    setLocation({ name: result.name })
    setShowLocationSearch(false)
    setSearchQuery('')
    setSearchResults([])

    await new Promise((resolve) => setTimeout(resolve, 100))

    await loadWeather()
  }

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (location) {
        setContextMenu({ x: e.clientX, y: e.clientY })
      }
    },
    [location]
  )

  const handleRefresh = useCallback(() => {
    setContextMenu(null)
    void loadWeather()
  }, [loadWeather])

  const handleResetLocation = useCallback(() => {
    setContextMenu(null)
    setShowLocationSearch(true)
  }, [])

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('zh-CN', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <div className="weather-widget" style={{ position: 'relative' }}>
      <div className="weather-widget__time">
        <span className="weather-widget__time-display">{formatTime(time)}</span>
        <span className="weather-widget__date">{formatDate(time)}</span>
      </div>
      {weather && weatherInfo ? (
        <div
          className="weather-widget__weather"
          onClick={handleWeatherClick}
          onContextMenu={handleContextMenu}
        >
          <span className="weather-widget__icon">{weatherInfo.icon}</span>
          <span className="weather-widget__temp">{Math.round(weather.temperature)}°</span>
          <span className="weather-widget__location">{location?.name}</span>
        </div>
      ) : location ? (
        <div
          className="weather-widget__weather weather-widget__weather--loading"
          onClick={handleWeatherClick}
          onContextMenu={handleContextMenu}
        >
          <span className="weather-widget__icon">{isLoading ? '⏳' : '🌡️'}</span>
          <span className="weather-widget__temp">--°</span>
        </div>
      ) : (
        <div
          className="weather-widget__weather weather-widget__weather--setup"
          onClick={() => setShowLocationSearch(true)}
        >
          <span className="weather-widget__icon">📍</span>
          <span className="weather-widget__setup-text">设置位置</span>
        </div>
      )}
      {contextMenu &&
        createPortal(
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 9999 }}
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault()
              setContextMenu(null)
            }}
          >
            <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
              <div className="context-menu-item" onClick={handleRefresh}>
                🔄 刷新天气
              </div>
              <div className="context-menu-item" onClick={handleResetLocation}>
                📍 重新设置位置
              </div>
            </div>
          </div>,
          document.body
        )}
      {showLocationSearch && (
        <div className="weather-widget__search">
          <div className="weather-widget__search-input">
            <input
              type="text"
              placeholder="搜索城市..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  void handleSearchLocation()
                }
              }}
              autoFocus
            />
            <button onClick={() => void handleSearchLocation()}>搜索</button>
            <button onClick={() => setShowLocationSearch(false)}>取消</button>
          </div>
          {searchResults.length > 0 && (
            <div className="weather-widget__search-results">
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  className="weather-widget__search-result"
                  onClick={() => void handleSelectLocation(result)}
                >
                  <span className="weather-widget__search-result-name">{result.name}</span>
                  <span className="weather-widget__search-result-country">
                    {result.admin1 ? `${result.admin1}, ` : ''}
                    {result.country}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default WeatherWidget
