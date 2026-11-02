"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useNativeApp } from "@/hooks/useNativeApp";
import { NativeApp, NativeBrowser, NativeNetwork, NativeStripe, nativePlatform } from "@/lib/native";
import { nativeBackDestination, nativeCallback } from "@/lib/nativeNavigation";
import type { PluginListenerHandle } from "@capacitor/core";
import "./native.css";

export default function NativeShell() {
  const native = useNativeApp(), pathname = usePathname(), router = useRouter();
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");
  const handledLaunchUrl = useRef(false);
  useEffect(() => {
    if (!native) return;
    document.documentElement.dataset.nativeApp = "true";
    let disposed = false;
    const listeners: PluginListenerHandle[] = [];
    const listen = (promise: Promise<PluginListenerHandle>) => void promise.then(handle => {
      if (disposed) void handle.remove(); else listeners.push(handle);
    }).catch(() => { /* Browser online/offline events remain available. */ });
    void NativeNetwork.getStatus().then(s => { if (!disposed) setOffline(!s.connected); }).catch(() => {});
    listen(NativeNetwork.addListener("networkStatusChange", s => setOffline(!s.connected)));
    const handleReturn = ({ url }: { url?: string }) => {
      if (!url) return;
      if (nativeCallback(url) === "connect") {
        void NativeBrowser.close().catch(() => {});
        router.push("/dashboard/settings/payment?stripe=success");
        return;
      }
      if (nativeCallback(url) === "payment" && nativePlatform() === "ios") {
        void NativeStripe.handleURLCallback({ url }).catch(() => setError("Return to your work order to check the payment status."));
      }
    };
    listen(NativeApp.addListener("appUrlOpen", handleReturn));
    if (!handledLaunchUrl.current) {
      void NativeApp.getLaunchUrl().then(result => {
        if (disposed || handledLaunchUrl.current) return;
        handledLaunchUrl.current = true;
        if (result) handleReturn(result);
      }).catch(() => {});
    }
    listen(NativeApp.addListener("backButton", () => {
      // A modal consumes Back first. It may deliberately ignore Escape during payment.
      if (document.querySelector('[role="dialog"], [aria-modal="true"]')) {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        return;
      }
      const destination = nativeBackDestination(pathname);
      if (destination) router.push(destination);
      else void NativeApp.exitApp();
    }));
    const external = (event: MouseEvent) => {
      const anchor = (event.target as Element)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || event.defaultPrevented) return;
      const url = new URL(anchor.href, location.href);
      if (url.origin === location.origin || !["https:", "http:"].includes(url.protocol)) return;
      event.preventDefault();
      if (url.protocol !== "https:") { setError("This link does not use a secure connection."); return; }
      void NativeBrowser.open({ url: url.href }).catch(() => setError("We couldn’t open that link. Please try again."));
    };
    document.addEventListener("click", external);
    return () => { disposed = true; listeners.forEach(handle => void handle.remove()); document.removeEventListener("click", external); };
  }, [native, pathname, router]);
  if (!native || (!offline && !error)) return null;
  return <aside className="native-connection" role="status">{offline ? "You’re offline. Reconnect to update jobs, messages, or payments." : error}
    {error && !offline && <button type="button" onClick={() => setError("")}>Dismiss</button>}
  </aside>;
}
