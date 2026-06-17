import test from "node:test";
import assert from "node:assert/strict";
import { calculateAnnualSpi } from "./climateService.js";
import { getFloodLocations, resolveTodayIndex } from "./floodService.js";
import { getAqiHistoryExport, getAqiLocations, getCurrentAqi, intervalForLocation } from "./aqiService.js";

test("AQI monitored nodes include Kabba and Idah", () => {
  const ids = getAqiLocations().map((location) => location.id);
  assert.ok(ids.includes("kabba"));
  assert.ok(ids.includes("idah"));
});

test("current AQI resolves requested Kabba and Idah locations", async () => {
  const originalFetch = globalThis.fetch;
  const previousWaqiKey = process.env.WAQI_API_KEY;
  const previousOpenAqKey = process.env.OPENAQ_API_KEY;
  delete process.env.WAQI_API_KEY;
  delete process.env.OPENAQ_API_KEY;

  globalThis.fetch = async (url) => new Response(JSON.stringify({
    current: {
      time: "2026-06-16T03:00",
      us_aqi: url.includes("latitude=7.83") ? 10 : url.includes("latitude=7.11") ? 20 : 30,
      us_aqi_pm2_5: 1,
      us_aqi_pm10: 2,
      us_aqi_nitrogen_dioxide: 3,
      us_aqi_ozone: 4,
      us_aqi_sulphur_dioxide: 5,
      us_aqi_carbon_monoxide: 6,
      pm2_5: 1,
      pm10: 2,
      nitrogen_dioxide: 3,
      sulphur_dioxide: 4,
      carbon_monoxide: 5,
      ozone: 6
    },
    hourly: {
      time: ["2026-06-16T03:00"],
      us_aqi: [1],
      pm2_5: [1],
      pm10: [2],
      nitrogen_dioxide: [3],
      sulphur_dioxide: [4],
      carbon_monoxide: [5],
      ozone: [6]
    }
  }), { status: 200, headers: { "content-type": "application/json" } });

  try {
    const kabba = await getCurrentAqi("Kabba", { forceRefresh: true });
    const idah = await getCurrentAqi("idah", { forceRefresh: true });

    assert.equal(kabba.location_id, "kabba");
    assert.equal(kabba.location, "Kabba");
    assert.equal(kabba.latitude, 7.83);
    assert.equal(kabba.longitude, 6.07);
    assert.equal(kabba.aqi, 10);
    assert.equal(idah.location_id, "idah");
    assert.equal(idah.location, "Idah");
    assert.equal(idah.latitude, 7.11);
    assert.equal(idah.longitude, 6.73);
    assert.equal(idah.aqi, 20);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousWaqiKey === undefined) delete process.env.WAQI_API_KEY;
    else process.env.WAQI_API_KEY = previousWaqiKey;
    if (previousOpenAqKey === undefined) delete process.env.OPENAQ_API_KEY;
    else process.env.OPENAQ_API_KEY = previousOpenAqKey;
  }
});

test("AQI polling intervals support per-location overrides", () => {
  const previous = process.env.AQI_POLL_INTERVALS_MINUTES;
  const previousDefault = process.env.WAQI_POLL_MINUTES;

  process.env.AQI_POLL_INTERVALS_MINUTES = "lokoja:15, kabba:30, idah:90";
  process.env.WAQI_POLL_MINUTES = "60";

  assert.equal(intervalForLocation("lokoja"), 15);
  assert.equal(intervalForLocation("KABBA"), 30);
  assert.equal(intervalForLocation("idah"), 90);
  assert.equal(intervalForLocation("okene"), 60);

  if (previous === undefined) delete process.env.AQI_POLL_INTERVALS_MINUTES;
  else process.env.AQI_POLL_INTERVALS_MINUTES = previous;
  if (previousDefault === undefined) delete process.env.WAQI_POLL_MINUTES;
  else process.env.WAQI_POLL_MINUTES = previousDefault;
});

test("AQI history export uses exact Kabba coordinates in CSV", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    current: {
      time: "2026-06-16T03:00",
      us_aqi: 42,
      us_aqi_pm2_5: 42,
      us_aqi_pm10: 20,
      pm2_5: 8,
      pm10: 16,
      nitrogen_dioxide: 4,
      sulphur_dioxide: 2,
      carbon_monoxide: 120,
      ozone: 21
    },
    hourly: {
      time: ["2026-06-16T02:00", "2026-06-16T03:00"],
      us_aqi: [41, 42],
      pm2_5: [7, 8],
      pm10: [15, 16],
      nitrogen_dioxide: [3, 4],
      sulphur_dioxide: [1, 2],
      carbon_monoxide: [110, 120],
      ozone: [20, 21]
    }
  }), { status: 200, headers: { "content-type": "application/json" } });

  try {
    const payload = await getAqiHistoryExport("Kabba", 2, "csv");
    assert.equal(payload.contentType, "text/csv; charset=utf-8");
    assert.match(payload.filename, /aqi-history-kabba-2h\.csv/);
    assert.match(payload.body, /kabba,Kabba,41,7,15,3,1,110,20,7\.83,6\.07/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("AQI history export emits GeoJSON at requested Idah location", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    current: {
      time: "2026-06-16T03:00",
      us_aqi: 51,
      us_aqi_pm2_5: 51,
      pm2_5: 12,
      pm10: 18
    },
    hourly: {
      time: ["2026-06-16T03:00"],
      us_aqi: [51],
      pm2_5: [12],
      pm10: [18],
      nitrogen_dioxide: [0],
      sulphur_dioxide: [0],
      carbon_monoxide: [0],
      ozone: [0]
    }
  }), { status: 200, headers: { "content-type": "application/json" } });

  try {
    const payload = await getAqiHistoryExport("idah", 1, "geojson");
    const geojson = JSON.parse(payload.body);
    assert.equal(payload.contentType, "application/geo+json");
    assert.equal(payload.filename, "aqi-history-idah-1h.geojson");
    assert.deepEqual(geojson.features[0].geometry.coordinates, [6.73, 7.11]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("flood monitored nodes include Lokoja, Kabba, and Idah", () => {
  const ids = getFloodLocations().map((location) => location.id).sort();
  assert.deepEqual(ids, ["idah", "kabba", "lokoja"]);
});

test("flood forecast anchoring falls forward when today's date is absent", () => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setUTCDate(today.getUTCDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(today.getUTCDate() + 1);

  const dates = [
    yesterday.toISOString().slice(0, 10),
    tomorrow.toISOString().slice(0, 10)
  ];

  assert.equal(resolveTodayIndex(dates), 1);
});

test("annual SPI flags dry, normal, and wet years from rainfall z-scores", () => {
  const spi = calculateAnnualSpi(
    [2020, 2021, 2022, 2023, 2024],
    [900, 950, 1000, 1050, 1300]
  );

  assert.equal(spi.length, 5);
  assert.ok(spi[0].spi < 0);
  assert.equal(spi[2].category, "near normal");
  assert.equal(spi[4].category, "wet");
});
