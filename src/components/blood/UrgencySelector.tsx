import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Urgency } from "../../constants/enums";
import { useTheme } from "../../context/ThemeContext";

interface UrgencySelectorProps {
  value: Urgency;
  onChange: (val: Urgency) => void;
  disabled?: boolean;
}

const URGENCY_OPTIONS = [
  { key: Urgency.NORMAL, label: "Normal" },
  { key: Urgency.URGENT, label: "Urgent" },
  { key: Urgency.CRITICAL, label: "Critical" },
];

export const UrgencySelector: React.FC<UrgencySelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? "#242424" : "#F1F5F9",
          borderColor: colors.border,
        },
      ]}
    >
      {URGENCY_OPTIONS.map((opt) => {
        const isSelected = value === opt.key;

        let activeBg = colors.urgencyNormal.bg;
        let activeText = colors.urgencyNormal.text;
        let activeBorder = colors.urgencyNormal.border;

        if (opt.key === Urgency.URGENT) {
          activeBg = colors.urgencyUrgent.bg;
          activeText = colors.urgencyUrgent.text;
          activeBorder = colors.urgencyUrgent.border;
        } else if (opt.key === Urgency.CRITICAL) {
          activeBg = colors.urgencyCritical.bg;
          activeText = colors.urgencyCritical.text;
          activeBorder = colors.urgencyCritical.border;
        }

        const bg = isSelected ? activeBg : "transparent";
        const text = isSelected ? activeText : colors.textSecondary;
        const border = isSelected ? activeBorder : "transparent";

        return (
          <TouchableOpacity
            key={opt.key}
            activeOpacity={0.8}
            disabled={disabled}
            onPress={() => onChange(opt.key)}
            style={[
              styles.segment,
              {
                backgroundColor: bg,
                borderColor: border,
                borderWidth: isSelected ? 1 : 0,
              },
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color: text,
                  fontWeight: isSelected ? "700" : "500",
                },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginVertical: 6,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  segmentText: {
    fontSize: 14,
  },
});
