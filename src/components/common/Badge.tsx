import React from "react";
import { View, Text, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { RequestStatus, Urgency } from "../../constants/enums";

interface BadgeProps {
  label: string;
  status?: RequestStatus | string;
  urgency?: Urgency;
  variant?: "status" | "urgency" | "custom";
  customBg?: string;
  customText?: string;
  customBorder?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: "sm" | "md";
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  status,
  urgency,
  variant = "status",
  customBg,
  customText,
  customBorder,
  style,
  textStyle,
  size = "md",
}) => {
  const { colors } = useTheme();

  const getColors = () => {
    if (customBg && customText) {
      return {
        bg: customBg,
        text: customText,
        border: customBorder || "transparent",
      };
    }

    if (urgency) {
      switch (urgency) {
        case Urgency.CRITICAL:
          return colors.urgencyCritical;
        case Urgency.URGENT:
          return colors.urgencyUrgent;
        case Urgency.NORMAL:
        default:
          return colors.urgencyNormal;
      }
    }

    if (status) {
      switch (status) {
        case RequestStatus.PENDING_VERIFICATION:
          return colors.statusPending;
        case RequestStatus.VERIFIED:
          return colors.statusVerified;
        case RequestStatus.MATCHING:
          return colors.statusMatching;
        case RequestStatus.DONORS_FOUND:
          return colors.statusDonorsFound;
        case RequestStatus.IN_PROGRESS:
          return colors.statusInProgress;
        case RequestStatus.FULFILLED:
          return colors.statusFulfilled;
        case RequestStatus.CANCELLED:
        case RequestStatus.EXPIRED:
          return colors.statusCancelled;
        case RequestStatus.DRAFT:
        default:
          return colors.statusDraft;
      }
    }

    return colors.statusDraft;
  };

  const current = getColors();
  const paddingV = size === "sm" ? 2 : 4;
  const paddingH = size === "sm" ? 8 : 10;
  const fontSize = size === "sm" ? 11 : 12;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: current.bg,
          borderColor: current.border,
          paddingVertical: paddingV,
          paddingHorizontal: paddingH,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: current.text,
            fontSize,
          },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 9999,
    borderWidth: 1,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
