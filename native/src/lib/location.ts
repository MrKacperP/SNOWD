import * as Location from "expo-location";

/**
 * Where the phone is now, as reliably as iOS allows. A fresh fix can fail for a moment
 * (kCLErrorDomain 0: "location unknown", common indoors or right after waking), so this falls back
 * to a recent last-known position and retries with lower accuracy before giving up with a clear message.
 */
export async function currentLocation(): Promise<Location.LocationObject> {
  let { status } = await Location.getForegroundPermissionsAsync();
  if (status !== "granted") ({ status } = await Location.requestForegroundPermissionsAsync());
  if (status !== "granted") throw new Error("Allow location access for SNOWD in Settings to share your arrival time.");
  if (!(await Location.hasServicesEnabledAsync().catch(() => true))) throw new Error("Turn on Location Services in Settings to share your arrival time.");

  const withTimeout = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);
  const attempts = [
    () => withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }), 8000),
    async () => {
      const last = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60_000, requiredAccuracy: 2000 });
      if (!last) throw new Error("no last position");
      return last;
    },
    () => withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), 10000),
  ];
  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch {
      // try the next way
    }
  }
  throw new Error("We couldn’t find your location just now. Step outside or check Location Services, then try again.");
}
