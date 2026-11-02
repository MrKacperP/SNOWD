"use client";
import { useSyncExternalStore } from "react";
import { isNativeApp } from "@/lib/native";
const subscribe = () => () => {};
export function useNativeApp() { return useSyncExternalStore(subscribe, isNativeApp, () => false); }
