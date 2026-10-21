(() => {
  const current = document.getElementById('weather-current');
  const range = document.getElementById('weather-range');
  const icon = document.getElementById('weather-icon');
  const units = document.getElementById('weather-units');
  let data = null, celsius = false, busy = false, lastAttempt = 0;
  try { celsius = localStorage.getItem('lunarion-weather-unit') === 'C'; } catch {}
  function condition(code, day) {
    if (code === 0) return [day ? '☀' : '☾', day ? 'Clear skies' : 'Clear night'];
    if ([1, 2].includes(code)) return ['⛅', 'Partly cloudy'];
    if (code === 3) return ['☁', 'Overcast'];
    if ([45, 48].includes(code)) return ['≋', 'Foggy'];
    if ([51, 53, 55].includes(code)) return ['☂', 'Drizzle'];
    if ([56, 57, 66, 67].includes(code)) return ['☂', 'Freezing rain'];
    if ([61, 63, 65, 80, 81, 82].includes(code)) return ['☂', 'Rain'];
    if ([71, 73, 75, 77, 85, 86].includes(code)) return ['❄', 'Snow'];
    if ([95, 96, 99].includes(code)) return ['ϟ', 'Thunderstorms'];
    return ['☁', 'Conditions unavailable'];
  }
  const temp = value => `${Math.round(celsius ? value : value * 9 / 5 + 32)}°${celsius ? 'C' : 'F'}`;
  function render() {
    units.textContent = celsius ? '°F' : '°C';
    units.setAttribute('aria-label', `Show temperatures in ${celsius ? 'Fahrenheit' : 'Celsius'}`);
    if (!data) return;
    const [symbol, description] = condition(data.current.weather_code, data.current.is_day);
    icon.textContent = symbol;
    current.textContent = `${temp(data.current.temperature_2m)} · ${description}`;
    range.textContent = `Today: ${temp(data.daily.temperature_2m_min[0])}–${temp(data.daily.temperature_2m_max[0])} · ${data.daily.precipitation_probability_max[0]}% chance of precipitation`;
  }
  async function update() {
    if (busy) return;
    busy = true; lastAttempt = Date.now();
    try {
      const url = new URL('https://api.open-meteo.com/v1/forecast');
      url.search = new URLSearchParams({latitude:'40.7128', longitude:'-74.0060', current:'temperature_2m,weather_code,is_day', daily:'temperature_2m_max,temperature_2m_min,precipitation_probability_max', timezone:'America/New_York', forecast_days:'1'});
      const response = await fetch(url, {signal: AbortSignal.timeout(10000)});
      if (!response.ok) throw new Error('Weather unavailable');
      const result = await response.json();
      const values = [result.current?.temperature_2m, result.current?.weather_code, result.daily?.temperature_2m_min?.[0], result.daily?.temperature_2m_max?.[0], result.daily?.precipitation_probability_max?.[0]];
      if (!values.every(Number.isFinite)) throw new Error('Incomplete weather');
      data = result; render();
    } catch {
      data = null;
      current.textContent = 'Weather unavailable right now.';
      range.textContent = 'We’ll check again soon.';
      icon.textContent = '☁';
    } finally { busy = false; }
  }
  units.addEventListener('click', () => {
    celsius = !celsius;
    try { localStorage.setItem('lunarion-weather-unit', celsius ? 'C' : 'F'); } catch {}
    render();
  });
  render(); update();
  setInterval(() => { if (!document.hidden) update(); }, 15 * 60 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && Date.now() - lastAttempt > 15 * 60 * 1000) update();
  });
})();
