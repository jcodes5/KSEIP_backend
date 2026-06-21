import test from "node:test";
import assert from "node:assert/strict";
import { getKogiLga, getKogiLgas } from "../data/kogiLgas.js";
import {
  buildWeatherIntelligence,
  calculateWeatherScore,
  riskLevelFromScore,
  weatherCodeToCondition
} from "./weatherRiskEngine.js";
import { weatherServiceTestUtils } from "./weatherService.js";

const samplePayload = {
  current: {
    time: "2026-06-21T12:00",
    temperature_2m: 33.4,
    relative_humidity_2m: 81,
    apparent_temperature: 39.2,
    precipitation_probability: 78,
    precipitation: 5.5,
    rain: 5.5,
    weather_code: 95,
    cloud_cover: 92,
    wind_speed_10m: 31,
    wind_direction_10m: 215,
    wind_gusts_10m: 48,
    visibility: 6200,
    uv_index: 8.1
  },
  hourly: {
    time: ["2026-06-21T12:00", "2026-06-21T13:00"],
    temperature_2m: [33.4, 34.1],
    relative_humidity_2m: [81, 79],
    apparent_temperature: [39.2, 40.1],
    precipitation_probability: [78, 83],
    precipitation: [5.5, 7],
    rain: [5.5, 7],
    weather_code: [95, 65],
    cloud_cover: [92, 88],
    wind_speed_10m: [31, 34],
    wind_direction_10m: [215, 220],
    wind_gusts_10m: [48, 52],
    visibility: [6200, 5800],
    uv_index: [8.1, 7.6]
  },
  daily: {
    time: ["2026-06-21"],
    weather_code: [95],
    temperature_2m_max: [35],
    temperature_2m_min: [24],
    apparent_temperature_max: [41],
    apparent_temperature_min: [25],
    precipitation_sum: [42],
    rain_sum: [42],
    precipitation_probability_max: [88],
    wind_speed_10m_max: [36],
    wind_gusts_10m_max: [54],
    wind_direction_10m_dominant: [220],
    uv_index_max: [9]
  }
};

test("weather LGA registry includes all Kogi LGAs with coordinates", () => {
  const lgas = getKogiLgas();
  assert.equal(lgas.length, 21);
  assert.ok(lgas.every((lga) => Number.isFinite(lga.latitude) && Number.isFinite(lga.longitude)));
  assert.equal(getKogiLga("Kabba/Bunu").id, "kabba-bunu");
  assert.equal(getKogiLga("igalamela odolu").id, "igalamela-odolu");
});

test("Open-Meteo weather URL uses latitude and longitude, not LGA name lookup", () => {
  const lga = getKogiLga("lokoja");
  const url = weatherServiceTestUtils.buildOpenMeteoUrl(lga, 7);

  assert.match(url, /latitude=7\.8/);
  assert.match(url, /longitude=6\.74/);
  assert.doesNotMatch(url, /name=/);
  assert.match(url, /forecast_days=7/);
});

test("weather risk score returns expected bands", () => {
  assert.equal(riskLevelFromScore(39), "LOW");
  assert.equal(riskLevelFromScore(40), "MODERATE");
  assert.equal(riskLevelFromScore(70), "HIGH");

  const low = calculateWeatherScore({ rainProbability: 5, windSpeed: 4, temperature: 25, humidity: 45 });
  const high = calculateWeatherScore({ rainProbability: 95, windSpeed: 60, temperature: 41, humidity: 93 });

  assert.equal(low.level, "LOW");
  assert.equal(high.level, "HIGH");
  assert.ok(high.score > low.score);
});

test("weather code labels operational conditions", () => {
  assert.equal(weatherCodeToCondition(0), "Clear");
  assert.equal(weatherCodeToCondition(65), "Rain");
  assert.equal(weatherCodeToCondition(95), "Thunderstorm");
});

test("weather normalization produces KSEIP response shape", () => {
  const lga = getKogiLga("lokoja");
  const current = weatherServiceTestUtils.normalizeCurrent(samplePayload, lga);
  const hourly = weatherServiceTestUtils.normalizeHourly(samplePayload, 2);
  const daily = weatherServiceTestUtils.normalizeDaily(samplePayload, 1);
  const intelligence = buildWeatherIntelligence({ lga, current, dailyForecast: daily });

  assert.equal(current.lga_id, "lokoja");
  assert.equal(current.weatherCondition, "Thunderstorm");
  assert.equal(hourly.length, 2);
  assert.equal(daily[0].rainVolume, 42);
  assert.equal(intelligence.riskLevel, "MODERATE");
  assert.equal(intelligence.stormRisk.level, "HIGH");
  assert.match(intelligence.recommendationText, /Lokoja/);
});
