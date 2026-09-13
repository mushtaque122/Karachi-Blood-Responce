import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { useTheme } from "../../context/ThemeContext";

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: "default" | "blush" | "outlined";
}

export const Card: React.FC<CardProps> = ({ children, style, variant = "default" }) => {
  const { colors, isDark } = useTheme();

  const backgroundColor =
    variant === "blush" ? colors.cardSecondary : colors.card;

  const borderColor =
    variant === "outlined" ? colors.border : colors.borderLight;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor,
          borderColor,
          shadowColor: colors.shadowColor,
          shadowOpacity: isDark ? 0.25 : 0.06,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
});
