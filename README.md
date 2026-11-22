# Fieldwise

Fieldwise is a small, static farm-weather dashboard built with plain HTML, CSS, and JavaScript. It shows local weather and general crop and livestock guidance based on the forecast. There is no build step, application framework, or project dependency installation.

## Features

- Current conditions and a seven-day forecast for a searched town or your current location.
- Forecast-based alerts for potential storms, heavy rain, strong wind, heat, and frost.
- General seasonal crop and livestock suggestions that respond to location and forecast conditions.
- Remembers your selected location in your browser.

Weather and place search data come from the [Open-Meteo forecast API](https://open-meteo.com/en/docs) and [geocoding API](https://open-meteo.com/en/docs/geocoding-api). An internet connection is required. When you select a location, its coordinates are sent to Open-Meteo to retrieve weather data and saved in your browser's local storage.

## Run locally

Serve the `public` directory from a local web server; opening the HTML files directly may prevent browser location access and API requests from working.

### VS Code Live Server

1. Open this project in VS Code and install the **Live Server** extension if needed.
2. Right-click [`public/index.html`](public/index.html) and choose **Open with Live Server**.
3. The homepage redirects to the dashboard. Search for a town or choose **Use my location** and grant permission.

### Node.js

From the project directory, run:

```powershell
npx --yes http-server public -p 8080
```

Then open <http://localhost:8080>. Stop the server with `Ctrl+C`.

No `npm install` or build command is required. The server command only serves the static files; it is not an application dependency.

## Weather guidance

Alerts are generated from forecast thresholds and are not official emergency warnings. Crop and animal-care suggestions are general guidance, not a substitute for local agricultural advice, soil conditions, or veterinary care. Check local authorities for active severe-weather alerts.

## Project structure

```text
public/
  index.html           Home entry point
  dashboard.html       Weather dashboard
  css/dashboard.css    Dashboard styles
  js/weather.js        Location, forecast, alert, and farm guidance logic
  404.html             Not-found page
```

## License

This project is distributed under the MIT License. See [LICENSE](LICENSE).
