const apiKey = "c92c4bb4c0437b17c98c932f959dcceb";

const searchBtn = document.getElementById('search-btn');
const searchInput = document.getElementById('search-input');
const cityName = document.getElementById('city-name');
const weatherIcon = document.getElementById('weather-icon');
const temperature = document.getElementById('temperature');
const weatherDescription = document.getElementById('weather-description');
const forecastContainer = document.getElementById('forecast-container');
const weatherBg = document.getElementById('weather-bg');
const canvas = document.getElementById('weather-canvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ICONS
const icons = {
  Clouds: 'images/clouds.png',
  Rain: 'images/rain.png',
  Clear: 'images/clear.png',
  Drizzle: 'images/drizzle.png',
  Mist: 'images/mist.png',
  Snow: 'images/snow.png',
  Thunderstorm: 'images/thunder.png'
};

// PARTICLES
let particles = [];
let particleType = null;
let particleAnimationId = null;

// SUN/MOON
let sunPos = 0;
let sunAnimationId = null;

// Create particles based on weather type
function createParticles(type) {
  particles = [];
  particleType = type;
  const count = type === 'Rain' || type === 'Drizzle' ? 150 : 80;
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: type === 'Rain' || type === 'Drizzle' ? 2 : Math.random()*3+1,
      speed: Math.random()*1.5 + 0.5 // slower speed
    });
  }
}

// Animate particles
function animateParticles() {
  if (!particleType) return; // no animation if type is null
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => {
    ctx.fillStyle = particleType === 'Rain' || particleType === 'Drizzle' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.8)';
    if (particleType === 'Rain' || particleType === 'Drizzle') ctx.fillRect(p.x, p.y, p.r, 10);
    else ctx.beginPath(), ctx.arc(p.x, p.y, p.r, 0, Math.PI*2), ctx.fill();
    p.y += p.speed;
    if (p.y > canvas.height) p.y = -10;
  });
  particleAnimationId = requestAnimationFrame(animateParticles);
}

// Animate sun or moon
function animateSunMoon(isDay) {
  if (!isDay) return; // don't show sun at night
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.beginPath();
  ctx.fillStyle = 'yellow';
  const y = canvas.height/2 - Math.sin(sunPos) * canvas.height/4;
  const x = (sunPos / (Math.PI*2)) * canvas.width;
  ctx.arc(x, y, 50, 0, Math.PI*2);
  ctx.fill();
  sunPos += 0.001; // slow movement
  if(sunPos > Math.PI*2) sunPos = 0;
  sunAnimationId = requestAnimationFrame(()=>animateSunMoon(isDay));
}

// Stop all animations
function stopAnimations() {
  if(particleAnimationId) cancelAnimationFrame(particleAnimationId);
  if(sunAnimationId) cancelAnimationFrame(sunAnimationId);
  particleAnimationId = null;
  sunAnimationId = null;
  particleType = null;
  particles = [];
  ctx.clearRect(0,0,canvas.width,canvas.height);
}

// FETCH WEATHER
async function fetchWeather(city) {
  stopAnimations(); // stop any existing animations
  forecastContainer.innerHTML = '';
  try {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${apiKey}`);
    if (!res.ok) throw new Error('City not found');
    const data = await res.json();
    displayWeather(data);
  } catch (e) {
    alert(e.message);
  }
}

// DISPLAY WEATHER
function displayWeather(data) {
  const today = data.list[0];
  cityName.textContent = data.city.name;
  temperature.textContent = `${Math.round(today.main.temp)}°C`;
  weatherDescription.textContent = today.weather[0].main;
  weatherIcon.src = icons[today.weather[0].main] || icons['Mist'];

  // Determine day/night
  const dt = new Date(today.dt * 1000);
  const hour = dt.getHours();
  const isDay = hour >=6 && hour <18;

  // Background gradient
  const w = today.weather[0].main;
  if(w==='Clear') {
    weatherBg.style.background = isDay ? 'linear-gradient(to top,#87CEEB,#FFD700)' : 'linear-gradient(to top,#0f2027,#203A43)';
    animateSunMoon(isDay);
  }
  else if(w==='Clouds') {
    weatherBg.style.background = isDay ? 'linear-gradient(to top,#d7d2cc,#304352)' : 'linear-gradient(to top,#2c3e50,#4ca1af)';
  }
  else if(w==='Rain'||w==='Drizzle') {
    weatherBg.style.background='linear-gradient(to top,#4facfe,#00f2fe)';
    createParticles(w);
    animateParticles();
  }
  else if(w==='Snow') {
    weatherBg.style.background='linear-gradient(to top,#b3e5fc,#e1f5fe)';
    createParticles('Snow');
    animateParticles();
  }
  else if(w==='Thunderstorm') {
    weatherBg.style.background='linear-gradient(to top,#373b44,#4286f4)';
    createParticles('Rain');
    animateParticles();
  }

  // Forecast next 3 days
  for (let i=0;i<3;i++){
    const item=data.list[i*8];
    const card=document.createElement('div');
    card.classList.add('forecast-card');
    card.innerHTML=`
      <h3>${new Date(item.dt*1000).toLocaleDateString('en-US',{weekday:'short'})}</h3>
      <img src="${icons[item.weather[0].main]||icons['Mist']}" alt="">
      <p>${Math.round(item.main.temp)}°C</p>
    `;
    forecastContainer.appendChild(card);
  }
}

// EVENTS
searchBtn.addEventListener('click',()=>fetchWeather(searchInput.value));
searchInput.addEventListener('keyup', e=>{ if(e.key==='Enter') fetchWeather(searchInput.value); });

// AUTO LOCATION
navigator.geolocation.getCurrentPosition(pos=>{
  fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&units=metric&appid=${apiKey}`)
    .then(res=>res.json())
    .then(data=>displayWeather(data))
    .catch(()=> alert('Unable to fetch location weather'));
});
