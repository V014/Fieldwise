(function () {
  "use strict";

  const forecastUrl = "https://api.open-meteo.com/v1/forecast";
  const geocodingUrl = "https://geocoding-api.open-meteo.com/v1/search";
  const savedLocationKey = "fieldwise.location";
  const elements = {
    form: document.getElementById("location-form"),
    search: document.getElementById("place-search"),
    locate: document.getElementById("locate-button"),
    message: document.getElementById("app-message"),
    location: document.getElementById("location-name"),
    updated: document.getElementById("updated-at"),
    symbol: document.getElementById("current-symbol"),
    temperature: document.getElementById("current-temperature"),
    condition: document.getElementById("current-condition"),
    feelsLike: document.getElementById("feels-like"),
    humidity: document.getElementById("humidity"),
    wind: document.getElementById("wind"),
    rain: document.getElementById("rain-today"),
    sunrise: document.getElementById("sunrise"),
    forecast: document.getElementById("forecast-list"),
    alerts: document.getElementById("alerts-list"),
    today: document.getElementById("today-label"),
    season: document.getElementById("season-label"),
    cropTitle: document.getElementById("crop-title"),
    cropAdvice: document.getElementById("crop-advice"),
    livestockTitle: document.getElementById("livestock-title"),
    livestockAdvice: document.getElementById("livestock-advice")
  };
  let requestNumber = 0;

  const weatherDescriptions = {
    0: ["Clear sky", "☀"], 1: ["Mostly clear", "🌤"], 2: ["Partly cloudy", "⛅"],
    3: ["Overcast", "☁"], 45: ["Fog", "🌫"], 48: ["Freezing fog", "🌫"],
    51: ["Light drizzle", "🌦"], 53: ["Drizzle", "🌦"], 55: ["Heavy drizzle", "🌧"],
    56: ["Freezing drizzle", "🌧"], 57: ["Heavy freezing drizzle", "🌧"],
    61: ["Light rain", "🌧"], 63: ["Rain", "🌧"], 65: ["Heavy rain", "🌧"],
    66: ["Freezing rain", "🌧"], 67: ["Heavy freezing rain", "🌧"],
    71: ["Light snow", "🌨"], 73: ["Snow", "🌨"], 75: ["Heavy snow", "❄"],
    77: ["Snow grains", "🌨"], 80: ["Rain showers", "🌦"], 81: ["Rain showers", "🌧"],
    82: ["Heavy rain showers", "⛈"], 85: ["Snow showers", "🌨"], 86: ["Heavy snow showers", "❄"],
    95: ["Thunderstorm", "⛈"], 96: ["Thunderstorm with hail", "⛈"], 99: ["Thunderstorm with hail", "⛈"]
  };

  function weatherFor(code) {
    return weatherDescriptions[code] || ["Unknown conditions", "◌"];
  }

  function message(text, isError) {
    elements.message.textContent = text || "";
    elements.message.classList.toggle("error", Boolean(isError));
  }

  async function getJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Weather service returned an error (" + response.status + "). Please try again.");
    }
    return response.json();
  }

  function degreesToCompass(degrees) {
    return ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(degrees / 45) % 8];
  }

  function localDay(dateString, index) {
    if (index === 0) return "Today";
    if (index === 1) return "Tomorrow";
    return new Intl.DateTimeFormat(undefined, { weekday: "short", timeZone: "UTC" })
      .format(new Date(dateString + "T12:00:00Z"));
  }

  function localTime(dateTimeString) {
    if (!dateTimeString) return "--";
    const time = dateTimeString.split("T")[1];
    return time ? time.slice(0, 5) : "--";
  }

  function renderForecast(daily) {
    elements.forecast.replaceChildren();
    daily.time.forEach(function (date, index) {
      const description = weatherFor(daily.weather_code[index]);
      const row = document.createElement("div");
      row.className = "forecast-row";

      const day = document.createElement("span");
      day.className = "forecast-day";
      day.textContent = localDay(date, index);

      const condition = document.createElement("span");
      condition.className = "forecast-condition";
      const icon = document.createElement("span");
      icon.className = "forecast-symbol";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = description[1];
      condition.append(icon, document.createTextNode(description[0]));

      const temperature = document.createElement("span");
      temperature.className = "forecast-temp";
      temperature.textContent = Math.round(daily.temperature_2m_max[index]) + "° / " +
        Math.round(daily.temperature_2m_min[index]) + "°";

      const rain = document.createElement("span");
      rain.className = "forecast-rain";
      rain.textContent = Math.round(daily.precipitation_probability_max[index] || 0) + "% rain";

      row.append(day, condition, temperature, rain);
      elements.forecast.appendChild(row);
    });
  }

  function createAlert(level, title, detail) {
    const card = document.createElement("article");
    card.className = "alert-card alert-" + level;
    const icon = document.createElement("span");
    icon.className = "alert-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = level === "danger" ? "!" : level === "warning" ? "!" : "i";
    const content = document.createElement("div");
    const heading = document.createElement("h3");
    heading.textContent = title;
    const description = document.createElement("p");
    description.textContent = detail;
    content.append(heading, description);
    card.append(icon, content);
    return card;
  }

  function renderAlerts(daily) {
    const alerts = [];
    for (let index = 0; index < daily.time.length; index += 1) {
      const code = daily.weather_code[index];
      const day = localDay(daily.time[index], index);
      const rain = daily.precipitation_sum[index] || 0;
      const gust = daily.wind_gusts_10m_max[index] || 0;
      const high = daily.temperature_2m_max[index];
      const low = daily.temperature_2m_min[index];

      if (code === 96 || code === 99) {
        alerts.push({ level: "danger", key: "hail", day: day, detail: "Hail is possible. Protect vulnerable crops, equipment, and animals under cover where safe." });
      } else if (code === 95) {
        alerts.push({ level: "danger", key: "storm", day: day, detail: "Thunderstorms are forecast. Move people and livestock to safe shelter and avoid exposed areas." });
      }
      if (rain >= 60) {
        alerts.push({ level: "danger", key: "rain", day: day, detail: Math.round(rain) + " mm of rain is forecast. Check drainage and keep livestock away from flood-prone ground." });
      } else if (rain >= 30) {
        alerts.push({ level: "warning", key: "rain", day: day, detail: Math.round(rain) + " mm of rain is forecast. Check drainage and postpone field work on wet ground." });
      }
      if (gust >= 80) {
        alerts.push({ level: "danger", key: "wind", day: day, detail: "Wind gusts near " + Math.round(gust) + " km/h are forecast. Secure loose equipment and shelter animals." });
      } else if (gust >= 60) {
        alerts.push({ level: "warning", key: "wind", day: day, detail: "Wind gusts near " + Math.round(gust) + " km/h are forecast. Secure covers and postpone spraying." });
      }
      if (high >= 40) {
        alerts.push({ level: "danger", key: "heat", day: day, detail: "Temperatures near " + Math.round(high) + "°C may cause heat stress. Provide shade and reliable drinking water." });
      } else if (high >= 35) {
        alerts.push({ level: "warning", key: "heat", day: day, detail: "Highs near " + Math.round(high) + "°C. Check water supplies and limit strenuous livestock handling." });
      }
      if (low <= -5) {
        alerts.push({ level: "danger", key: "frost", day: day, detail: "A hard frost near " + Math.round(low) + "°C is possible. Protect sensitive plants and vulnerable young animals." });
      } else if (low <= 0) {
        alerts.push({ level: "warning", key: "frost", day: day, detail: "Frost is possible near " + Math.round(low) + "°C. Protect tender seedlings and check animal shelter." });
      }
    }

    const priority = { warning: 1, danger: 2 };
    alerts.sort(function (left, right) {
      return priority[right.level] - priority[left.level];
    });
    const seen = new Set();
    const uniqueAlerts = alerts.filter(function (alert) {
      if (seen.has(alert.key)) return false;
      seen.add(alert.key);
      return true;
    });
    elements.alerts.replaceChildren();
    if (uniqueAlerts.length === 0) {
      elements.alerts.appendChild(createAlert("neutral", "No significant weather hazards detected", "No heavy rain, damaging wind, severe heat, frost, or thunderstorms were detected in this 7-day forecast."));
      return;
    }
    uniqueAlerts.forEach(function (alert) {
      elements.alerts.appendChild(createAlert(alert.level, alert.day + " · " + alert.key.charAt(0).toUpperCase() + alert.key.slice(1), alert.detail));
    });
  }

  function seasonFor(date, latitude) {
    const month = date.getMonth();
    const northernSeasons = ["Winter", "Winter", "Spring", "Spring", "Spring", "Summer", "Summer", "Summer", "Autumn", "Autumn", "Autumn", "Winter"];
    const southernSeasons = ["Summer", "Summer", "Autumn", "Autumn", "Autumn", "Winter", "Winter", "Winter", "Spring", "Spring", "Spring", "Summer"];
    return (latitude >= 0 ? northernSeasons : southernSeasons)[month];
  }

  function renderAdvice(latitude, daily) {
    const season = seasonFor(new Date(), latitude);
    const frostExpected = daily.temperature_2m_min.some(function (temperature) { return temperature <= 0; });
    const hotWeather = daily.temperature_2m_max.some(function (temperature) { return temperature >= 35; });
    const heavyRain = daily.precipitation_sum.some(function (rain) { return rain >= 30; });
    elements.season.textContent = season + " · general guidance";

    const cropAdvice = {
      Spring: ["Start with cool-season crops", "Peas, leafy greens, and root vegetables can suit spring sowing. Check local soil temperature and frost dates; hold tender crops until frost risk has passed."],
      Summer: ["Choose warm-season crops", "Beans, squash, and maize can suit warm conditions where your soil and water supply support them. Mulch and plan irrigation during dry spells."],
      Autumn: ["Plan cool-season sowing", "Leafy greens, peas, and root vegetables can suit cooler weather. Consider a locally suitable cover crop and allow time for establishment before cold weather."],
      Winter: ["Protect crops and soil", "Use locally adapted protected or overwintering crops where suitable. Avoid sowing tender plants outdoors during cold spells; check seed guidance for your area."]
    }[season];
    elements.cropTitle.textContent = cropAdvice[0];
    elements.cropAdvice.textContent = cropAdvice[1] +
      (frostExpected ? " Frost is in the forecast, so protect seedlings." : "");

    if (hotWeather) {
      elements.livestockTitle.textContent = "Prepare for heat";
      elements.livestockAdvice.textContent = "Forecast heat can stress animals. Provide shade, ventilation, and clean water; avoid moving or handling stock in the hottest part of the day.";
    } else if (heavyRain) {
      elements.livestockTitle.textContent = "Prepare for wet weather";
      elements.livestockAdvice.textContent = "Heavy rain is forecast. Check dry shelter and drainage, keep feed dry, and move animals away from waterlogged or flood-prone areas.";
    } else if (frostExpected) {
      elements.livestockTitle.textContent = "Prepare for cold nights";
      elements.livestockAdvice.textContent = "Frost is forecast. Check wind-protected shelter, dry bedding, and access to unfrozen drinking water, especially for young or vulnerable animals.";
    } else {
      elements.livestockTitle.textContent = "Daily livestock checks";
      elements.livestockAdvice.textContent = "Keep clean water available, provide weather-appropriate shade or shelter, and check animals and pasture daily for changing conditions.";
    }
  }

  function renderWeather(location, data) {
    const current = data.current;
    const today = data.daily;
    const description = weatherFor(current.weather_code);
    elements.location.textContent = location.name;
    elements.updated.textContent = "Updated " + new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" })
      .format(new Date(current.time));
    elements.symbol.textContent = description[1];
    elements.temperature.innerHTML = Math.round(current.temperature_2m) + "<span>°</span>C";
    elements.condition.textContent = description[0];
    elements.feelsLike.textContent = "Feels like " + Math.round(current.apparent_temperature) + "°C";
    elements.humidity.textContent = Math.round(current.relative_humidity_2m) + "%";
    elements.wind.textContent = Math.round(current.wind_speed_10m) + " km/h " + degreesToCompass(current.wind_direction_10m);
    elements.rain.textContent = (today.precipitation_sum[0] || 0).toFixed(1) + " mm";
    elements.sunrise.textContent = localTime(today.sunrise[0]);
    elements.today.textContent = new Intl.DateTimeFormat(undefined, { dateStyle: "full" }).format(new Date(current.time));
    renderForecast(today);
    renderAlerts(today);
    renderAdvice(location.latitude, today);
  }

  async function loadWeather(location, currentRequest) {
    const params = new URLSearchParams({
      latitude: String(location.latitude),
      longitude: String(location.longitude),
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m",
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_gusts_10m_max,sunrise",
      forecast_days: "7",
      timezone: "auto"
    });
    message("Loading the forecast for " + location.name + "…", false);
    try {
      const data = await getJson(forecastUrl + "?" + params.toString());
      if (currentRequest !== requestNumber) return;
      if (!data.current || !data.daily || !data.daily.time || data.daily.time.length === 0) {
        throw new Error("The weather service returned incomplete forecast data. Please try again.");
      }
      renderWeather(location, data);
      message("", false);
      try {
        localStorage.setItem(savedLocationKey, JSON.stringify(location));
      } catch (storageError) {
        console.warn("Could not save the selected location.", storageError);
      }
    } catch (error) {
      if (currentRequest !== requestNumber) return;
      message(error.message || "Could not load local weather. Check your connection and try again.", true);
    }
  }

  async function searchLocation(query) {
    const currentRequest = ++requestNumber;
    elements.locate.disabled = false;
    message("Finding " + query + "…", false);
    const params = new URLSearchParams({ name: query, count: "1", language: "en", format: "json" });
    try {
      const result = await getJson(geocodingUrl + "?" + params.toString());
      if (currentRequest !== requestNumber) return;
      const place = result.results && result.results[0];
      if (!place) {
        message("No matching place found. Try a nearby town or city.", true);
        return;
      }
      const location = {
        latitude: place.latitude,
        longitude: place.longitude,
        name: [place.name, place.admin1, place.country].filter(Boolean).filter(function (part, index, parts) {
          return parts.indexOf(part) === index;
        }).join(", ")
      };
      await loadWeather(location, currentRequest);
    } catch (error) {
      if (currentRequest === requestNumber) {
        message(error.message || "Could not find that place. Check your connection and try again.", true);
      }
    }
  }

  function locateUser() {
    if (!navigator.geolocation) {
      message("Location is not available in this browser. Search for a town or city instead.", true);
      return;
    }
    const currentRequest = ++requestNumber;
    elements.locate.disabled = true;
    message("Requesting your location…", false);
    navigator.geolocation.getCurrentPosition(function (position) {
      elements.locate.disabled = false;
      if (currentRequest !== requestNumber) return;
      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        name: "Your location"
      };
      loadWeather(location, currentRequest);
    }, function (error) {
      elements.locate.disabled = false;
      if (currentRequest !== requestNumber) return;
      const detail = error.code === error.PERMISSION_DENIED
        ? "Location access was declined. Search for a town or city instead."
        : error.code === error.TIMEOUT
          ? "Your location request timed out. Try again or search for a place."
          : "Could not determine your location. Search for a town or city instead.";
      message(detail, true);
    }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 });
  }

  elements.form.addEventListener("submit", function (event) {
    event.preventDefault();
    const query = elements.search.value.trim();
    if (query) searchLocation(query);
  });
  elements.locate.addEventListener("click", locateUser);

  let savedLocation = null;
  try {
    savedLocation = JSON.parse(localStorage.getItem(savedLocationKey) || "null");
  } catch (storageError) {
    console.warn("Could not read the saved location.", storageError);
  }
  if (savedLocation && Number.isFinite(savedLocation.latitude) && Number.isFinite(savedLocation.longitude) && savedLocation.name) {
    loadWeather(savedLocation, ++requestNumber);
  } else {
    message("Use your location or search for a place to see local weather.", false);
  }
}());
