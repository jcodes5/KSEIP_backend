const THUNDERSTORM_CODES = new Set([95, 96, 99]);
const HEAVY_RAIN_CODES = new Set([65, 66, 67, 80, 81, 82]);

function clamp(value, min = 0, max = 100) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return Math.max(min, Math.min(max, numeric));
}

function round(value, digits = 0) {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
}

export function weatherCodeToCondition(code) {
  const numeric = Number(code);
  if (numeric === 0) return "Clear";
  if ([1, 2, 3].includes(numeric)) return "Partly cloudy";
  if ([45, 48].includes(numeric)) return "Fog or haze";
  if ([51, 53, 55, 56, 57].includes(numeric)) return "Drizzle";
  if ([61, 63, 65, 66, 67].includes(numeric)) return "Rain";
  if ([71, 73, 75, 77].includes(numeric)) return "Ice or snow";
  if ([80, 81, 82].includes(numeric)) return "Rain showers";
  if ([85, 86].includes(numeric)) return "Snow showers";
  if (THUNDERSTORM_CODES.has(numeric)) return "Thunderstorm";
  return "Weather conditions unavailable";
}

export function riskLevelFromScore(score) {
  const numeric = clamp(score);
  if (numeric >= 70) return "HIGH";
  if (numeric >= 40) return "MODERATE";
  return "LOW";
}

export function normalizeRainProbability(value) {
  return clamp(value);
}

export function normalizeWindSpeed(value) {
  return clamp((Number(value) / 60) * 100);
}

export function normalizeTemperature(value) {
  const temp = Number(value);
  if (!Number.isFinite(temp)) return 0;
  if (temp <= 26) return 8;
  if (temp <= 32) return 20 + ((temp - 26) / 6) * 25;
  if (temp <= 38) return 45 + ((temp - 32) / 6) * 35;
  return clamp(80 + ((temp - 38) / 8) * 20);
}

export function normalizeHumidity(value) {
  const humidity = Number(value);
  if (!Number.isFinite(humidity)) return 0;
  if (humidity <= 45) return 15;
  if (humidity <= 75) return 15 + ((humidity - 45) / 30) * 45;
  return clamp(60 + ((humidity - 75) / 25) * 40);
}

function topDriver(scores) {
  return Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .map(([key]) => key)[0] ?? "weather";
}

function labelDriver(driver) {
  return {
    rain: "rainfall",
    wind: "wind",
    temperature: "temperature",
    humidity: "humidity"
  }[driver] ?? "weather";
}

export function calculateWeatherScore(current = {}) {
  const normalized = {
    rain: normalizeRainProbability(current.rainProbability),
    wind: normalizeWindSpeed(current.windSpeed),
    temperature: normalizeTemperature(current.temperature),
    humidity: normalizeHumidity(current.humidity)
  };

  const score = round(
    normalized.rain * 0.4 +
      normalized.wind * 0.2 +
      normalized.temperature * 0.2 +
      normalized.humidity * 0.2
  );

  const driver = topDriver(normalized);

  return {
    score,
    level: riskLevelFromScore(score),
    topDriver: driver,
    topDriverLabel: labelDriver(driver),
    normalized
  };
}

export function calculateFloodRisk(current = {}, dailyForecast = [], riskProfile = {}) {
  const today = dailyForecast[0] ?? {};
  const rainToday = Number(today.rainVolume ?? today.precipitationSum ?? current.rainVolume ?? 0);
  const probability = Number(today.rainProbability ?? current.rainProbability ?? 0);
  const exposure = Number(riskProfile.riverineExposure ?? 0.5);
  const score = clamp((probability * 0.42) + (Math.min(rainToday, 70) / 70 * 38) + (exposure * 20));
  return { score: round(score), level: riskLevelFromScore(score) };
}

export function calculateHeatRisk(current = {}) {
  const tempRisk = normalizeTemperature(current.feelsLike ?? current.temperature);
  const humidityRisk = normalizeHumidity(current.humidity);
  const uvRisk = clamp((Number(current.uvIndex ?? 0) / 11) * 100);
  const score = clamp((tempRisk * 0.5) + (humidityRisk * 0.25) + (uvRisk * 0.25));
  return { score: round(score), level: riskLevelFromScore(score) };
}

export function calculateStormRisk(current = {}) {
  const code = Number(current.weatherCode);
  const codeRisk = THUNDERSTORM_CODES.has(code) ? 95 : HEAVY_RAIN_CODES.has(code) ? 70 : 20;
  const gustRisk = normalizeWindSpeed(current.windGusts ?? current.windSpeed);
  const rainRisk = normalizeRainProbability(current.rainProbability);
  const cloudRisk = clamp(current.cloudCover);
  const score = clamp((codeRisk * 0.35) + (gustRisk * 0.25) + (rainRisk * 0.25) + (cloudRisk * 0.15));
  return { score: round(score), level: riskLevelFromScore(score) };
}

export function calculateRoadRisk(current = {}, riskProfile = {}) {
  const visibilityKm = Number(current.visibility ?? 10000) / 1000;
  const visibilityRisk = visibilityKm >= 10 ? 5 : clamp(((10 - visibilityKm) / 10) * 100);
  const roadExposure = Number(riskProfile.roadExposure ?? 0.5) * 20;
  const score = clamp(
    normalizeRainProbability(current.rainProbability) * 0.35 +
      normalizeWindSpeed(current.windSpeed) * 0.2 +
      visibilityRisk * 0.25 +
      roadExposure
  );
  return { score: round(score), level: riskLevelFromScore(score) };
}

export function calculateAgriculturalSuitability(current = {}, dailyForecast = [], riskProfile = {}) {
  const today = dailyForecast[0] ?? {};
  const rain = Number(today.rainVolume ?? current.rainVolume ?? 0);
  const probability = Number(today.rainProbability ?? current.rainProbability ?? 0);
  const heat = calculateHeatRisk(current).score;
  const exposure = Number(riskProfile.agriculturalExposure ?? 0.6);
  const stressScore = clamp((probability * 0.25) + (Math.min(rain, 60) / 60 * 30) + (heat * 0.3) + (exposure * 15));

  if (stressScore >= 70) {
    return {
      score: round(stressScore),
      category: "POOR",
      guidance: "Delay field work where possible and protect seedlings, harvested produce, and workers."
    };
  }

  if (stressScore >= 40) {
    return {
      score: round(stressScore),
      category: "CAUTION",
      guidance: "Plan field work around rainfall windows and avoid peak heat periods."
    };
  }

  return {
    score: round(stressScore),
    category: "GOOD",
    guidance: "Conditions are generally suitable for routine field activity."
  };
}

function recommendationFor(lgaName, score, intelligence) {
  const level = riskLevelFromScore(score);
  const risks = [
    ["flood", intelligence.floodRisk?.score ?? 0],
    ["heat", intelligence.heatRisk?.score ?? 0],
    ["storm", intelligence.stormRisk?.score ?? 0],
    ["road", intelligence.roadRisk?.score ?? 0]
  ].sort(([, a], [, b]) => b - a);
  const [mainRisk, riskScore] = risks[0];

  if (level === "HIGH") {
    if (mainRisk === "flood") return `Heavy rainfall is expected in ${lgaName}. Minimize outdoor activity and monitor flood-prone communities and routes.`;
    if (mainRisk === "heat") return `High heat stress is expected in ${lgaName}. Reduce afternoon field work and increase water breaks for outdoor teams.`;
    if (mainRisk === "storm") return `Storm conditions are possible in ${lgaName}. Secure loose materials and avoid exposed outdoor operations.`;
    return `Weather-related road disruption is possible in ${lgaName}. Use caution on vulnerable routes and delay non-essential trips.`;
  }

  if (level === "MODERATE" || riskScore >= 40) {
    if (mainRisk === "flood") return `Moderate rainfall risk is present in ${lgaName}. Keep drainage checks active and watch low-lying areas.`;
    if (mainRisk === "heat") return `Moderate heat risk is present in ${lgaName}. Schedule strenuous work for cooler hours.`;
    if (mainRisk === "storm") return `Unsettled weather is possible in ${lgaName}. Field teams should watch wind and rainfall updates.`;
    return `Road conditions may deteriorate in ${lgaName}. Drivers should watch for rain, poor visibility, and slippery surfaces.`;
  }

  return `Weather risk is low in ${lgaName}. Continue routine monitoring and normal outdoor activity.`;
}

export function buildWeatherIntelligence({ lga, current, dailyForecast = [] }) {
  const weatherScore = calculateWeatherScore(current);
  const floodRisk = calculateFloodRisk(current, dailyForecast, lga.riskProfile);
  const heatRisk = calculateHeatRisk(current);
  const stormRisk = calculateStormRisk(current);
  const roadRisk = calculateRoadRisk(current, lga.riskProfile);
  const agriculturalSuitability = calculateAgriculturalSuitability(current, dailyForecast, lga.riskProfile);

  const intelligence = {
    floodRisk,
    heatRisk,
    stormRisk,
    roadRisk,
    agriculturalSuitability,
    overallWeatherScore: weatherScore.score,
    riskLevel: weatherScore.level,
    topRiskDriver: weatherScore.topDriverLabel,
    normalizedDrivers: weatherScore.normalized
  };

  return {
    ...intelligence,
    recommendationText: recommendationFor(lga.name, weatherScore.score, intelligence)
  };
}

export const weatherRiskTestUtils = {
  clamp,
  labelDriver
};
