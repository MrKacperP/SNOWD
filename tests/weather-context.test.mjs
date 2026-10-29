import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const source = ts.transpileModule(fs.readFileSync("src/context/WeatherContext.tsx", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
async function render(profile) {
  const exports = {}, states = [], calls = [];
  let index = 0;
  vm.runInNewContext(source, {
    exports, console,
    requestAnimationFrame: callback => { callback(); return 1; }, cancelAnimationFrame() {},
    navigator: { geolocation: { getCurrentPosition() { throw new Error("Unexpected location request"); } } },
    fetch: async url => {
      calls.push(url);
      return { json: async () => url.includes("open-meteo") ? { current: { temperature_2m: 0, apparent_temperature: -2, relative_humidity_2m: 80, wind_speed_10m: 12, weather_code: 71 }, daily: { snowfall_sum: [3.5] }, daily_units: { snowfall_sum: "cm" } } : { address: { city: "Toronto" } } };
    },
    require: id => id === "react" ? {
      createContext: () => ({ Provider: "provider" }), useContext() {},
      useState: initial => { const i = index++; states[i] = initial; return [initial, value => { states[i] = value; }]; },
      useEffect: effect => effect(),
    } : id === "react/jsx-runtime" ? require(id) : { useAuth: () => ({ profile }) },
  });
  exports.WeatherProvider({ children: null });
  await new Promise(resolve => setImmediate(resolve));
  return { states, calls };
}
test("weather never prompts for device location or shows another city's weather without a saved address", async () => {
  const result = await render(null);
  assert.equal(result.calls.length, 0);
  assert.equal(result.states[0], null);
  assert.equal(result.states[1], false);
});
test("saved property weather reports the supplied snowfall amount and unit", async () => {
  const result = await render({ lat: 43.65, lng: -79.38 });
  assert.match(result.calls[0], /latitude=43.65&longitude=-79.38/);
  assert.equal(result.states[0].snowfallAmount, 3.5);
  assert.equal(result.states[0].snowfallUnit, "cm");
  assert.equal(result.states[1], false);
});
