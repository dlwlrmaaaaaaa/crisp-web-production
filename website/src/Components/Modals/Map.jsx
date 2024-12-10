import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";
import { useAuth } from "../../AuthContext/AuthContext";

const Map = ({ lat, lon }) => {
  const { reports } = useAuth();
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const user_id = localStorage.getItem("user_id");
  const accountType = localStorage.getItem("accountType");
  // console.log("reports", reports);

  const API_KEY = "b29aa0efcb4db33afa698232bfb7b3a2"; // Replace with your OpenWeatherMap API key
  const WEATHER_API_URL = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}`;
  // const WEATHER_API_URL = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&appid=${API_KEY}`;

  useEffect(() => {
    // Fetch weather data
    const fetchWeatherData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(WEATHER_API_URL);
        // console.log(response.data); // Log the response to see the structure of the data
        setWeatherData(response.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching weather data:", err); // Log the error message
        setError("Error fetching weather data");
        setLoading(false);
      }
    };

    fetchWeatherData();
  }, [lat, lon]);

  // Handle loading and error states
  if (loading) return <div>Loading weather data...</div>;
  if (error) return <div>{error}</div>;

  const filteredReports =
    accountType == "department_admin"
      ? reports.filter((report) => report.assigned_to_id == user_id) // Only show reports assigned to this user
      : reports;

  // console.log("filteredReports", filteredReports);

  return (
    <div className="w-full h-full flex flex-col items-center">
      <MapContainer
        id="map"
        center={[lat, lon]}
        zoom={15}
        className="w-full h-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
        />
        <TileLayer
          url={`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${API_KEY}`}
          attribution="&copy; <a href='https://openweathermap.org'>OpenWeatherMap</a>"
        />
        {/* Add a marker for the weather location */}
        <Marker position={[lat, lon]}>
          <Popup>
            <div>
              <h4>Current Location</h4>
              <h4>Weather Data</h4>
              <p>
                Temperature: {(weatherData.main.temp - 273.15).toFixed(2)}°C
              </p>
              <p>Weather: {weatherData.weather[0].description}</p>
              <p>Humidity: {weatherData.main.humidity}%</p>
              <p>Wind Speed: {weatherData.wind.speed} m/s</p>
            </div>
          </Popup>
        </Marker>

        {/* Loop through reports and add a marker for each */}
        {filteredReports.map((report) => {
          const {
            latitude,
            longitude,
            id,
            status,
            location,
            report_description,
            username,
            type_of_report,
          } = report;

          return (
            <Marker key={id} position={[latitude, longitude]}>
              <Popup>
                <div>
                  <h4>Report: {type_of_report}</h4>
                  <p>Reported by: {username}</p>
                  <p>Location: {location}</p>
                  <p>Description: {report_description}</p>
                  <p>Status: {status}</p>
                  {/* You can display other report details here */}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default Map;
