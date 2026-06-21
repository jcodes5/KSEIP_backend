import { getHealthGuidance } from "./healthGuidanceService.js";

export const EPA_AQI_BANDS = [
  {
    level: 0,
    min: 0,
    max: 50,
    category: "Good",
    color_hex: "#00E400",
    advisory_text: "Air quality is satisfactory. Outdoor activities are safe for most people.",
    sensitive_groups_text: "People with asthma or heart disease can continue normal activity.",
    activities: {
      exercise: "safe",
      school_sport: "safe",
      farming: "safe",
      construction: "safe"
    }
  },
  {
    level: 1,
    min: 51,
    max: 100,
    category: "Moderate",
    color_hex: "#FFFF00",
    advisory_text: "Air quality is acceptable, but very sensitive people should reduce long outdoor exertion.",
    sensitive_groups_text: "Children, elderly people, and people with asthma should watch for coughing or breathing discomfort.",
    activities: {
      exercise: "limit if sensitive",
      school_sport: "safe with monitoring",
      farming: "safe with breaks",
      construction: "safe with breaks"
    }
  },
  {
    level: 2,
    min: 101,
    max: 150,
    category: "Unhealthy for Sensitive Groups",
    color_hex: "#FF7E00",
    advisory_text: "Children, elderly people, and people with breathing problems should reduce outdoor activity.",
    sensitive_groups_text: "Sensitive groups should avoid long or heavy outdoor work and keep medication nearby.",
    activities: {
      exercise: "reduce",
      school_sport: "reduce",
      farming: "take frequent breaks",
      construction: "use protection"
    }
  },
  {
    level: 3,
    min: 151,
    max: 200,
    category: "Unhealthy",
    color_hex: "#FF0000",
    advisory_text: "Everyone may begin to feel health effects. Reduce outdoor activity, especially near industrial corridors.",
    sensitive_groups_text: "Sensitive groups should stay indoors as much as possible and avoid heavy exertion.",
    activities: {
      exercise: "avoid outdoors",
      school_sport: "move indoors",
      farming: "limit exposure",
      construction: "limit exposure"
    }
  },
  {
    level: 4,
    min: 201,
    max: 300,
    category: "Very Unhealthy",
    color_hex: "#8F3F97",
    advisory_text: "Health alert. Serious effects are possible for everyone. Limit outdoor movement.",
    sensitive_groups_text: "Children, elderly people, pregnant people, and respiratory patients should remain indoors.",
    activities: {
      exercise: "avoid",
      school_sport: "cancel outdoors",
      farming: "essential only",
      construction: "essential only"
    }
  },
  {
    level: 5,
    min: 301,
    max: Number.POSITIVE_INFINITY,
    category: "Hazardous",
    color_hex: "#7E0023",
    advisory_text: "Emergency conditions. Everyone is likely to be affected. Avoid outdoor exposure.",
    sensitive_groups_text: "Vulnerable groups should remain indoors with windows closed and seek medical help if symptoms worsen.",
    activities: {
      exercise: "do not do outdoors",
      school_sport: "cancel",
      farming: "stop if possible",
      construction: "stop if possible"
    }
  }
];

export function getAqiBand(aqi) {
  const value = Number(aqi);
  if (!Number.isFinite(value) || value < 0) {
    return EPA_AQI_BANDS[0];
  }

  return EPA_AQI_BANDS.find((band) => value >= band.min && value <= band.max) ?? EPA_AQI_BANDS[5];
}

function normalizePollutant(value) {
  const key = String(value ?? "aqi").toLowerCase().replace(/[^a-z0-9]/g, "");
  return {
    pm25: "PM2.5",
    pm10: "PM10",
    no2: "NO2",
    so2: "SO2",
    co: "CO",
    o3: "O3",
    usaqi: "AQI",
    aqi: "AQI"
  }[key] ?? String(value ?? "AQI").toUpperCase();
}

function pollutantGuidance(pollutant) {
  const label = normalizePollutant(pollutant);
  const guidance = {
    "PM2.5": "Fine particles can enter deep into the lungs. Prioritize indoor air filtration and reduce outdoor exertion.",
    PM10: "Coarse dust can irritate the eyes, nose, throat, and airways. Reduce dusty outdoor work and use fitted masks where exposure is unavoidable.",
    NO2: "Nitrogen dioxide can worsen asthma and airway inflammation, especially near traffic and combustion sources.",
    SO2: "Sulphur dioxide can trigger bronchospasm in sensitive people. People with asthma should keep rescue medication nearby.",
    CO: "Carbon monoxide affects oxygen delivery. People with heart disease, pregnant people, and infants need extra caution.",
    O3: "Ozone can reduce lung function during outdoor exertion. Move exercise and school sports indoors when levels rise."
  };

  return {
    pollutant: label,
    guidance: guidance[label] ?? "Use the advisory AQI level for protective action and watch for respiratory symptoms."
  };
}

function dataQualityContext(context = {}) {
  if (context.stale) {
    return {
      confidence: "limited",
      note: "This advisory is based on the most recent cached AQI reading. Confirm conditions before public emergency communication."
    };
  }

  if (Number.isFinite(Number(context.advisory_aqi)) && Number.isFinite(Number(context.aqi)) && Number(context.advisory_aqi) > Number(context.aqi)) {
    return {
      confidence: "conservative",
      note: "Validation data reported a higher AQI than the primary source, so KSEIP selected the more protective advisory level."
    };
  }

  return {
    confidence: "standard",
    note: "Advisory is based on the latest available AQI reading for the selected Kogi monitoring node."
  };
}

function buildActionPriority(level, pollutant) {
  const pollutantLabel = normalizePollutant(pollutant);
  if (level >= 4) return `Emergency-level air quality response. Keep vulnerable groups indoors and minimize all outdoor exposure. Dominant driver: ${pollutantLabel}.`;
  if (level === 3) return `Reduce outdoor exposure for everyone and move strenuous activities indoors. Dominant driver: ${pollutantLabel}.`;
  if (level === 2) return `Protect sensitive groups first. Children, elderly people, pregnant people, and respiratory patients should reduce outdoor exertion. Dominant driver: ${pollutantLabel}.`;
  if (level === 1) return `Most people can continue normal activity, but very sensitive people should reduce prolonged exertion. Dominant driver: ${pollutantLabel}.`;
  return `Air quality is acceptable for normal outdoor activity. Continue routine monitoring. Dominant driver: ${pollutantLabel}.`;
}

export function buildHealthAdvisory(currentAqi, forecastAqi = currentAqi, context = {}) {
  const currentBand = getAqiBand(currentAqi);
  const forecastBand = getAqiBand(forecastAqi);
  const healthGuidance = getHealthGuidance(currentBand.level);
  const pollutant = pollutantGuidance(context.dominant_pollutant);
  const quality = dataQualityContext(context);

  return {
    // Basic info
    level: currentBand.level,
    category: currentBand.category,
    color_hex: currentBand.color_hex,
    aqi_range: healthGuidance.aqi_range,
    
    // Health statements
    health_statement: healthGuidance.health_statement,
    advisory_text: currentBand.advisory_text,
    sensitive_groups_text: currentBand.sensitive_groups_text,
    action_priority: buildActionPriority(currentBand.level, pollutant.pollutant),
    pollutant_guidance: pollutant,
    data_quality: quality,
    advisory_basis: {
      location: context.location,
      location_id: context.location_id,
      measured_aqi: Number(context.aqi ?? currentAqi),
      advisory_aqi: Number(currentAqi),
      dominant_pollutant: pollutant.pollutant,
      primary_source: context.primary_source,
      stale: Boolean(context.stale)
    },
    
    // Health impacts
    health_impacts: healthGuidance.health_impacts,
    symptoms_to_watch: healthGuidance.symptoms_to_watch,
    
    // Risk groups and protective measures
    risk_groups: healthGuidance.risk_groups,
    protective_measures: healthGuidance.protective_measures,
    
    // Exposure and activity guidance
    exposure_guidance: healthGuidance.exposure_guidance,
    activities_detailed: healthGuidance.activities_detailed,
    
    // Indoor air and health tips
    indoor_air_measures: healthGuidance.indoor_air_measures,
    health_tips: healthGuidance.health_tips,
    
    // Legacy fields for backward compatibility
    forecast_level: forecastBand.level,
    activities: currentBand.activities,
    
    timestamp: new Date().toISOString()
  };
}
