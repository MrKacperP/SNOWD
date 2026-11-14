import { requireOptionalNativeModule } from "expo";

type Module = {
  attach(): void;
  addListener(event: "onTabLongPress", listener: (e: { index: number; count: number }) => void): { remove(): void };
};

/** Missing on Android and on app builds made before this module existed. */
const native = requireOptionalNativeModule<Module>("TabLongPress");

/** Calls `listener` with the visible tab's position when someone presses and holds it. */
export function onTabLongPress(listener: (index: number) => void) {
  if (!native) return () => {};
  const sub = native.addListener("onTabLongPress", (e) => listener(e.index));
  native.attach();
  return () => sub.remove();
}
