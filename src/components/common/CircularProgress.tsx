import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../../context/ThemeContext";

interface CircularProgressProps {
  size?: number;
  strokeWidth?: number;
  progress?: number; // 0 to 100
  title?: string;
  subtitle?: string;
  color?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  size = 120,
  strokeWidth = 10,
  progress = 0,
  title,
  subtitle,
  color,
}) => {
  const { colors, isDark } = useTheme();

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * Math.min(Math.max(progress, 0), 100)) / 100;
  const ringColor = color || colors.primary;
  const trackColor = isDark ? "#2D2D2D" : "#F1F5F9";

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress Ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      <View style={styles.content}>
        {title ? (
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        ) : null}
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  svg: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    marginTop: 2,
  },
});
