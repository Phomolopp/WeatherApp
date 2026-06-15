const apiKey = "c92c4bb4c0437b17c98c932f959dcceb";

const els = {
  body: document.body,
  searchForm: document.getElementById("search-form"),
  searchInput: document.getElementById("search-input"),
  locationBtn: document.getElementById("location-btn"),
  unitBtns: document.querySelectorAll(".unit-btn"),
  cityName: document.getElementById("city-name"),
  localTime: document.getElementById("local-time"),
  lastUpdated: document.getElementById("last-updated"),
  weatherAlert: document.getElementById("weather-alert"),
  weatherIcon: document.getElementById("weather-icon"),
  temperature: document.getElementById("temperature"),
  unitSymbol: document.getElementById("unit-symbol"),
  description: document.getElementById("weather-description"),
  weatherInsight: document.getElementById("weather-insight"),
  feelsLike: document.getElementById("feels-like"),
  highLow: document.getElementById("high-low"),
  summaryLine: document.getElementById("summary-line"),
  detailGrid: document.getElementById("detail-grid"),
  hourlyContainer: document.getElementById("hourly-container"),
  forecastContainer: document.getElementById("forecast-container"),
  trendChart: document.getElementById("trend-chart"),
  recentCities: document.getElementById("recent-cities"),
  toast: document.getElementById("toast"),
  weatherBg: document.getElementById("weather-bg"),
  canvas: document.getElementById("weather-canvas")
};

const ctx = els.canvas.getContext("2d");

const icons = {
  Clouds: "images/clouds.png",
  Rain: "images/rain.png",
  Clear: "images/clear.png",
  Drizzle: "images/drizzle.png",
  Mist: "images/mist.png",
  Fog: "images/mist.png",
  Haze: "images/mist.png",
  Snow: "images/snow.png",
  Thunderstorm: "images/rain.png"
};

const state = {
  data: null,
  unit: localStorage.getItem("weather-unit") || "metric",
  recent: JSON.parse(localStorage.getItem("weather-recent") || "[]"),
  reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches
};

let particles = [];
let particleType = null;
let animationId = null;
let toastTimer = null;

function resizeCanvas() {
  const scale = window.devicePixelRatio || 1;
  els.canvas.width = window.innerWidth * scale;
  els.canvas.height = window.innerHeight * scale;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}

function showToast(message, type = "info") {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.className = `toast show ${type === "error" ? "error" : ""}`;
  toastTimer = setTimeout(() => {
    els.toast.className = "toast";
  }, 3600);
}

function setLoading(isLoading) {
  els.body.classList.toggle("is-loading", isLoading);
}

function convertTemp(value) {
  return state.unit === "metric" ? value : (value * 9) / 5 + 32;
}

function temp(value) {
  return `${Math.round(convertTemp(value))}°`;
}

function wind(value) {
  if (state.unit === "metric") return `${Math.round(value * 3.6)} km/h`;
  return `${Math.round(value * 2.237)} mph`;
}

function visibility(value) {
  if (!value && value !== 0) return "--";
  if (state.unit === "metric") return `${(value / 1000).toFixed(1)} km`;
  return `${(value / 1609.34).toFixed(1)} mi`;
}

function timeFromUnix(seconds, timezoneOffset, options = {}) {
  const date = new Date((seconds + timezoneOffset) * 1000);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
    ...options
  }).format(date);
}

function dayFromUnix(seconds, timezoneOffset, options = {}) {
  const date = new Date((seconds + timezoneOffset) * 1000);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    ...options
  }).format(date);
}

function prettyDescription(text) {
  return text
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function forecastInsight(current, nextItems) {
  const maxRainChance = Math.max(...nextItems.map((item) => item.pop || 0));
  const maxWind = Math.max(...nextItems.map((item) => item.wind.speed));
  const weather = current.weather[0].main;

  if (weather === "Thunderstorm") return "Storms are likely. Keep travel flexible and stay aware of changing conditions.";
  if (maxRainChance >= 0.65 || weather === "Rain") return "Rain is likely soon. Keep an umbrella close and expect slower travel.";
  if (weather === "Snow") return "Snow is in the forecast. Dress warmly and leave extra time for travel.";
  if (maxWind >= 8) return "Breezy conditions are building. Secure loose items before heading out.";
  if (current.main.temp >= 30) return "It is running hot. Hydrate often and avoid long stretches in direct sun.";
  if (current.main.temp <= 8) return "It is chilly. A warm layer will make the day much more comfortable.";
  if (weather === "Clear") return "Clear conditions ahead. A good window for outdoor plans.";
  return "Conditions look manageable, with no major weather interruptions in the next few hours.";
}

function forecastAlert(list) {
  const nextEight = list.slice(0, 8);
  const maxRainChance = Math.round(Math.max(...nextEight.map((item) => item.pop || 0)) * 100);
  const highTemp = Math.max(...nextEight.map((item) => item.main.temp));
  const strongWeather = nextEight.find((item) => ["Thunderstorm", "Snow", "Rain"].includes(item.weather[0].main));

  if (strongWeather) return `${strongWeather.weather[0].main} watch in the next 24 hours`;
  if (maxRainChance >= 40) return `${maxRainChance}% peak rain chance today`;
  if (highTemp >= 30) return "Heat-aware day";
  return "Calm outlook";
}

function setBackground(weather, icon) {
  const isNight = icon.includes("n");
  const backgrounds = {
    Clear: isNight
      ? "radial-gradient(circle at 70% 12%, rgba(255,255,255,0.2), transparent 9rem), linear-gradient(135deg,#08111f,#203047 58%,#060a12)"
      : "radial-gradient(circle at 16% 16%, rgba(255,207,90,0.4), transparent 18rem), linear-gradient(135deg,#2e9fd1,#75e6da 54%,#f7c85f)",
    Clouds: "radial-gradient(circle at 16% 18%, rgba(255,255,255,0.22), transparent 20rem), linear-gradient(135deg,#5e7485,#273747 56%,#13202d)",
    Rain: "linear-gradient(135deg,#142331,#1d596b 56%,#0e1823)",
    Drizzle: "linear-gradient(135deg,#18364a,#5c8fa4 54%,#1b2834)",
    Snow: "linear-gradient(135deg,#d5eef7,#7eaabd 54%,#385a68)",
    Thunderstorm: "linear-gradient(135deg,#10131d,#373b5a 55%,#071018)",
    Mist: "linear-gradient(135deg,#607d86,#455a64 58%,#1a252d)"
  };
  els.weatherBg.style.background = backgrounds[weather] || backgrounds.Mist;
}

function stopAnimation() {
  if (animationId) cancelAnimationFrame(animationId);
  animationId = null;
  particleType = null;
  particles = [];
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
}

function createParticles(type) {
  if (state.reducedMotion) return;
  stopAnimation();
  particleType = type;
  const count = type === "Snow" ? 48 : 80;
  particles = Array.from({ length: count }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    length: type === "Snow" ? Math.random() * 4 + 2 : Math.random() * 12 + 8,
    speed: type === "Snow" ? Math.random() * 1.2 + 0.4 : Math.random() * 5 + 4,
    drift: Math.random() * 1.8 - 0.9
  }));
  animateParticles();
}

function animateParticles() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  particles.forEach((particle) => {
    if (particleType === "Snow") {
      ctx.beginPath();
      ctx.fillStyle = "rgba(255,255,255,0.82)";
      ctx.arc(particle.x, particle.y, particle.length / 2, 0, Math.PI * 2);
      ctx.fill();
      particle.x += particle.drift;
    } else {
      ctx.strokeStyle = "rgba(180,230,255,0.5)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(particle.x, particle.y);
      ctx.lineTo(particle.x + particle.drift * 2, particle.y + particle.length);
      ctx.stroke();
    }

    particle.y += particle.speed;
    if (particle.y > window.innerHeight + 20) {
      particle.y = -20;
      particle.x = Math.random() * window.innerWidth;
    }
  });
  animationId = requestAnimationFrame(animateParticles);
}

function updateEffects(weather, icon) {
  setBackground(weather, icon);
  stopAnimation();
  if (weather === "Rain" || weather === "Drizzle" || weather === "Thunderstorm") createParticles("Rain");
  if (weather === "Snow") createParticles("Snow");
}

function groupDailyForecast(list, timezoneOffset) {
  const days = new Map();
  list.forEach((item) => {
    const key = new Date((item.dt + timezoneOffset) * 1000).toISOString().slice(0, 10);
    const day = days.get(key) || {
      dt: item.dt,
      temps: [],
      icons: [],
      descriptions: []
    };
    day.temps.push(item.main.temp);
    day.icons.push(item.weather[0].main);
    day.descriptions.push(item.weather[0].description);
    days.set(key, day);
  });

  return Array.from(days.values()).slice(0, 5).map((day) => {
    const weather = day.icons.sort((a, b) =>
      day.icons.filter((icon) => icon === b).length - day.icons.filter((icon) => icon === a).length
    )[0];
    return {
      dt: day.dt,
      weather,
      description: day.descriptions[0],
      min: Math.min(...day.temps),
      max: Math.max(...day.temps)
    };
  });
}

function renderDetails(current, city) {
  const details = [
    ["Humidity", `${current.main.humidity}%`],
    ["Wind", wind(current.wind.speed)],
    ["Pressure", `${current.main.pressure} hPa`],
    ["Visibility", visibility(current.visibility)],
    ["Sunrise", timeFromUnix(city.sunrise, city.timezone)],
    ["Sunset", timeFromUnix(city.sunset, city.timezone)]
  ];

  els.detailGrid.innerHTML = details
    .map(([label, value]) => `
      <div class="detail-card">
        <span>${label}</span>
        <strong>${value}</strong>
      </div>
    `)
    .join("");
}

function renderHourly(list, timezoneOffset) {
  els.hourlyContainer.innerHTML = list.slice(0, 8).map((item, index) => {
    const weather = item.weather[0].main;
    const rainChance = Math.round((item.pop || 0) * 100);
    return `
      <div class="hour-card">
        <span>${index === 0 ? "Now" : timeFromUnix(item.dt, timezoneOffset)}</span>
        <img src="${icons[weather] || icons.Mist}" alt="">
        <strong>${temp(item.main.temp)}</strong>
        <div class="rain-meter" aria-label="${rainChance}% chance of rain">
          <span style="width: ${rainChance}%"></span>
        </div>
        <span class="rain-chance">${rainChance}% rain</span>
      </div>
    `;
  }).join("");
}

function renderDaily(list, timezoneOffset) {
  els.forecastContainer.innerHTML = groupDailyForecast(list, timezoneOffset)
    .map((day, index) => `
      <div class="forecast-day">
        <div>
          <strong>${index === 0 ? "Today" : dayFromUnix(day.dt, timezoneOffset)}</strong>
          <span>${prettyDescription(day.description)}</span>
        </div>
        <img src="${icons[day.weather] || icons.Mist}" alt="">
        <div class="forecast-temp">${temp(day.max)} / ${temp(day.min)}</div>
      </div>
    `)
    .join("");
}

function renderTrend(list, timezoneOffset) {
  const points = list.slice(0, 8);
  const temps = points.map((item) => convertTemp(item.main.temp));
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const range = Math.max(max - min, 1);

  els.trendChart.innerHTML = points.map((item, index) => {
    const value = convertTemp(item.main.temp);
    const height = 22 + ((value - min) / range) * 78;
    return `
      <div class="trend-bar">
        <strong>${Math.round(value)}°</strong>
        <div class="trend-track">
          <div class="trend-fill" style="height: ${height}%"></div>
        </div>
        <span>${index === 0 ? "Now" : timeFromUnix(item.dt, timezoneOffset)}</span>
      </div>
    `;
  }).join("");
}

function renderRecentCities() {
  els.recentCities.innerHTML = state.recent
    .map((city) => `<button class="recent-chip" type="button" data-city="${city}">${city}</button>`)
    .join("");
}

function saveRecentCity(city) {
  state.recent = [city, ...state.recent.filter((item) => item.toLowerCase() !== city.toLowerCase())].slice(0, 5);
  localStorage.setItem("weather-recent", JSON.stringify(state.recent));
  renderRecentCities();
}

function renderUnitButtons() {
  els.unitBtns.forEach((button) => {
    button.classList.toggle("active", button.dataset.unit === state.unit);
  });
  els.unitSymbol.textContent = state.unit === "metric" ? "C" : "F";
}

function renderWeather(data) {
  state.data = data;
  const current = data.list[0];
  const weather = current.weather[0].main;
  const daily = groupDailyForecast(data.list, data.city.timezone);
  const today = daily[0];

  renderUnitButtons();
  els.cityName.textContent = `${data.city.name}, ${data.city.country}`;
  els.localTime.textContent = `Local time ${timeFromUnix(current.dt, data.city.timezone, { weekday: "long" })}`;
  els.weatherIcon.src = icons[weather] || icons.Mist;
  els.weatherIcon.alt = prettyDescription(current.weather[0].description);
  els.temperature.textContent = Math.round(convertTemp(current.main.temp));
  els.description.textContent = prettyDescription(current.weather[0].description);
  els.lastUpdated.textContent = `Updated ${timeFromUnix(current.dt, data.city.timezone)}`;
  els.weatherAlert.textContent = forecastAlert(data.list);
  els.weatherInsight.textContent = forecastInsight(current, data.list.slice(0, 8));
  els.feelsLike.textContent = temp(current.main.feels_like);
  els.highLow.textContent = `${temp(today.max)} / ${temp(today.min)}`;
  els.summaryLine.textContent = `${prettyDescription(current.weather[0].description)} in ${data.city.name}, with winds at ${wind(current.wind.speed)}.`;

  renderDetails(current, data.city);
  renderHourly(data.list, data.city.timezone);
  renderDaily(data.list, data.city.timezone);
  renderTrend(data.list, data.city.timezone);
  updateEffects(weather, current.weather[0].icon);
  saveRecentCity(data.city.name);
}

async function fetchWeatherByCity(city) {
  const query = city.trim();
  if (!query) {
    showToast("Enter a city name to search.", "error");
    return;
  }

  await fetchWeather(`https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(query)}&units=metric&appid=${apiKey}`);
}

async function fetchWeatherByCoords(latitude, longitude) {
  await fetchWeather(`https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=metric&appid=${apiKey}`);
}

async function fetchWeather(url) {
  setLoading(true);
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Unable to load weather.");
    renderWeather(data);
  } catch (error) {
    showToast(error.message === "city not found" ? "City not found. Try another search." : error.message, "error");
  } finally {
    setLoading(false);
  }
}

function useCurrentLocation() {
  if (!navigator.geolocation) {
    showToast("Geolocation is not available in this browser.", "error");
    return;
  }

  setLoading(true);
  navigator.geolocation.getCurrentPosition(
    (position) => fetchWeatherByCoords(position.coords.latitude, position.coords.longitude),
    () => {
      setLoading(false);
      showToast("Location access was blocked, so Johannesburg is shown instead.", "error");
      fetchWeatherByCity("Johannesburg");
    },
    { timeout: 9000 }
  );
}

els.searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  fetchWeatherByCity(els.searchInput.value);
});

els.locationBtn.addEventListener("click", useCurrentLocation);

els.unitBtns.forEach((button) => {
  button.addEventListener("click", () => {
    state.unit = button.dataset.unit;
    localStorage.setItem("weather-unit", state.unit);
    if (state.data) renderWeather(state.data);
    renderUnitButtons();
  });
});

els.recentCities.addEventListener("click", (event) => {
  const button = event.target.closest("[data-city]");
  if (button) fetchWeatherByCity(button.dataset.city);
});

window.addEventListener("resize", () => {
  resizeCanvas();
  if (particleType) createParticles(particleType);
});

resizeCanvas();
renderRecentCities();
renderUnitButtons();
useCurrentLocation();
