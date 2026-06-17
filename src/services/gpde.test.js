import test from "node:test";
import assert from "node:assert/strict";
import {
  buoyancyFlux,
  gaussianConcentration,
  groundLevelCenterline,
  runPlumeModel,
  sigmaY,
  sigmaZ,
  validatePlumeInput
} from "./gpde.js";

const referenceInput = {
  stack_height: 80,
  emission_rate: 1,
  exit_velocity: 15,
  stack_diameter: 4,
  stack_temp_k: 423,
  ambient_temp_k: 300,
  wind_speed: 5,
  wind_dir: 45,
  stability_class: "D",
  terrain: "flat",
  source_lat: 7.5,
  source_lon: 6.32
};

test("validates and normalizes plume input", () => {
  const input = validatePlumeInput(referenceInput);
  assert.equal(input.stability_class, "D");
  assert.equal(input.terrain, "flat");
  assert.equal(input.stack_height, 80);
});

test("rejects invalid plume inputs with KSEIP error shape metadata", () => {
  assert.throws(
    () => validatePlumeInput({ ...referenceInput, wind_speed: 0 }),
    (error) => error.code === "GPDE_INPUT_INVALID" && error.status === 400
  );
});

test("computes Briggs open-country sigma values for Class D", () => {
  assert.equal(Number(sigmaY(1_000, "D").toFixed(3)), 2.53);
  assert.equal(Number(sigmaZ(1_000, "D").toFixed(3)), 37.947);
});

test("computes positive Briggs buoyancy flux for hot Obajana stack gas", () => {
  const fb = buoyancyFlux(15, 4, 423, 300);
  assert.ok(fb > 0);
  assert.equal(Number(fb.toFixed(3)), 171.153);
});

test("ground-level centerline equals full Gaussian equation at y=0,z=0", () => {
  const input = validatePlumeInput(referenceInput);
  const full = gaussianConcentration({ x: 1_000, y: 0, z: 0, input });
  const centerline = groundLevelCenterline(1_000, input);
  assert.ok(Math.abs(full - centerline) < 1e-9);
});

test("effective height override participates in concentration calculations", () => {
  const base = validatePlumeInput({
    ...referenceInput,
    stack_height: 20,
    emission_rate: 100,
    wind_speed: 3
  });
  const overridden = validatePlumeInput({
    ...referenceInput,
    stack_height: 20,
    emission_rate: 100,
    wind_speed: 3,
    effective_height_override: 500
  });

  const baseConcentration = groundLevelCenterline(500, base);
  const overriddenConcentration = groundLevelCenterline(500, overridden);

  assert.notEqual(baseConcentration, overriddenConcentration);
  assert.ok(overriddenConcentration < baseConcentration);
});

test("deposition velocity attenuates downwind concentration", () => {
  const base = validatePlumeInput({
    ...referenceInput,
    stack_height: 20,
    emission_rate: 100,
    wind_speed: 3
  });
  const deposited = validatePlumeInput({
    ...referenceInput,
    stack_height: 20,
    emission_rate: 100,
    wind_speed: 3,
    deposition_velocity: 0.05,
    mixing_height_override: 100
  });

  assert.ok(groundLevelCenterline(1_500, deposited) < groundLevelCenterline(1_500, base));
});

test("runs GPDE and returns required response fields", async () => {
  const result = await runPlumeModel(referenceInput);

  assert.ok(Array.isArray(result.grid_json.points));
  assert.equal(result.grid_json.resolution_m, 100);
  assert.deepEqual(result.grid_json.columns, ["x_m", "y_m", "concentration_ug_m3"]);
  assert.equal(result.isopleths_geojson.type, "FeatureCollection");
  assert.equal(typeof result.cmax, "number");
  assert.equal(typeof result.xmax, "number");
  assert.equal(result.beyond_range, false);
  assert.ok(result.exposure_summary.zone1);
  assert.equal(result.metadata.stability_class, "D");
});

test("generates isopleth polygons for a threshold-exceeding screening case", async () => {
  const result = await runPlumeModel({
    stack_height: 10,
    emission_rate: 1_000,
    exit_velocity: 1,
    stack_diameter: 1,
    stack_temp_k: 300,
    ambient_temp_k: 300,
    wind_speed: 2,
    wind_dir: 45,
    stability_class: "D",
    terrain: "flat",
    source_lat: 7.5,
    source_lon: 6.32
  });

  assert.equal(result.isopleths_geojson.type, "FeatureCollection");
  assert.ok(result.isopleths_geojson.features.length >= 1);
  assert.equal(result.isopleths_geojson.features[0].geometry.type, "Polygon");
});
