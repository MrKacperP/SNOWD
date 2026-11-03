import type { ComponentProps } from "react";
import type { Stack } from "expo-router";
import { colors } from "./theme";

/** Each tab has its own stack with an iOS large title that collapses as you scroll. */
export const tabStackOptions: ComponentProps<typeof Stack>["screenOptions"] = {
  headerLargeTitle: true,
  headerShadowVisible: false,
  headerLargeTitleShadowVisible: false,
  headerTintColor: colors.accent,
  headerTitleStyle: { color: colors.ink },
  headerLargeTitleStyle: { color: colors.ink },
  contentStyle: { backgroundColor: colors.bg },
};
