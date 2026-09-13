import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme as useRNColorScheme } from "react-native";
import { ThemeColors, lightColors, darkColors } from "../constants/theme";
import { getItem, setItem } from "../utils/storage";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  themeMode: "system",
  isDark: false,
  colors: lightColors,
  setThemeMode: async () => {},
  toggleTheme: async () => {},
});

const THEME_STORAGE_KEY = "kbr_theme_preference";

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useRNColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    (async () => {
      const stored = await getItem(THEME_STORAGE_KEY);
      if (stored === "light" || stored === "dark" || stored === "system") {
        setThemeModeState(stored as ThemeMode);
      }
    })();
  }, []);

  const isDark =
    themeMode === "dark" || (themeMode === "system" && systemScheme === "dark");

  const colors = isDark ? darkColors : lightColors;

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await setItem(THEME_STORAGE_KEY, mode);
  };

  const toggleTheme = async () => {
    const nextMode: ThemeMode = isDark ? "light" : "dark";
    await setThemeMode(nextMode);
  };

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        isDark,
        colors,
        setThemeMode,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
