import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import LottieView from "lottie-react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../types/navigation";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { getItem } from "../../utils/storage";

type Props = NativeStackScreenProps<RootStackParamList, "Splash">;

export const SplashScreen: React.FC<Props> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { isAuthenticated, isLoading } = useAuth();
  const animationRef = useRef<LottieView>(null);

  useEffect(() => {
    if (isLoading) return;

    const timer = setTimeout(async () => {
      if (isAuthenticated) {
        navigation.replace("MainTabs");
      } else {
        const hasSeenOnboarding = await getItem("kbr_has_seen_onboarding");
        if (hasSeenOnboarding === "true") {
          navigation.replace("Login");
        } else {
          navigation.replace("Onboarding");
        }
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoading, navigation]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.centerBox}>
        <View
          style={[
            styles.iconWrapper,
            {
              backgroundColor: colors.cardSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <LottieView
            ref={animationRef}
            source={require("../../../assets/animations/blood-drop.json")}
            autoPlay
            loop
            style={styles.lottie}
          />
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Karachi Blood Response
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Rapid • Reliable • Life Saving
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          Sindh Emergency Healthcare Network
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 60,
  },
  centerBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  iconWrapper: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    marginBottom: 24,
    shadowColor: "#E63950",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 4,
  },
  lottie: {
    width: 100,
    height: 100,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "500",
    marginTop: 8,
    textAlign: "center",
  },
  footer: {
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
