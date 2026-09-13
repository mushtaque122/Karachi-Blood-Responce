import React from "react";
import {
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
}) => {
  const { colors, isDark } = useTheme();

  const getBackgroundColor = () => {
    if (disabled) return isDark ? "#2D2D2D" : "#E2E8F0";
    switch (variant) {
      case "primary":
        return colors.primary;
      case "secondary":
        return colors.cardSecondary;
      case "outline":
        return "transparent";
      case "danger":
        return isDark ? "#7F1D1D" : "#EF4444";
      case "ghost":
        return "transparent";
    }
  };

  const getTextColor = () => {
    if (disabled) return colors.textMuted;
    switch (variant) {
      case "primary":
        return colors.primaryText;
      case "secondary":
        return colors.primary;
      case "outline":
        return colors.primary;
      case "danger":
        return "#FFFFFF";
      case "ghost":
        return colors.textPrimary;
    }
  };

  const getBorderColor = () => {
    if (variant === "outline") {
      return disabled ? colors.border : colors.primary;
    }
    return "transparent";
  };

  const paddingVertical = size === "sm" ? 8 : size === "lg" ? 16 : 12;
  const paddingHorizontal = size === "sm" ? 16 : size === "lg" ? 28 : 20;
  const fontSize = size === "sm" ? 13 : size === "lg" ? 16 : 15;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: variant === "outline" ? 1.5 : 0,
          paddingVertical,
          paddingHorizontal,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          {icon ? <>{icon}</> : null}
          <Text
            style={[
              styles.text,
              {
                color: getTextColor(),
                fontSize,
                marginLeft: icon ? 8 : 0,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 9999, // pill shaped
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  text: {
    fontWeight: "600",
    textAlign: "center",
  },
});
