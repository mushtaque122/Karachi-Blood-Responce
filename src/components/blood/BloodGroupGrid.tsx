import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { BloodGroup, ALL_BLOOD_GROUPS } from "../../constants/enums";
import { useTheme } from "../../context/ThemeContext";

interface BloodGroupGridProps {
  selected?: BloodGroup | null;
  onSelect: (group: BloodGroup) => void;
  disabled?: boolean;
}

export const BloodGroupGrid: React.FC<BloodGroupGridProps> = ({
  selected,
  onSelect,
  disabled = false,
}) => {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.grid}>
      {ALL_BLOOD_GROUPS.map((group) => {
        const isSelected = selected === group;

        const bg = isSelected
          ? colors.primary
          : isDark
          ? "#242424"
          : "#FFFFFF";

        const border = isSelected
          ? colors.primary
          : isDark
          ? "#383838"
          : "#E2E8F0";

        const textColor = isSelected
          ? colors.primaryText
          : colors.textPrimary;

        return (
          <TouchableOpacity
            key={group}
            activeOpacity={0.7}
            disabled={disabled}
            onPress={() => onSelect(group)}
            style={[
              styles.chip,
              {
                backgroundColor: bg,
                borderColor: border,
                shadowColor: isSelected ? colors.primary : "#000",
                shadowOpacity: isSelected ? 0.3 : isDark ? 0.2 : 0.04,
              },
            ]}
          >
            <Text style={[styles.chipText, { color: textColor }]}>{group}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginVertical: 8,
  },
  chip: {
    width: "22%",
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  chipText: {
    fontSize: 18,
    fontWeight: "700",
  },
});
