import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  useWindowDimensions,
  TouchableOpacity,
} from "react-native";
import LottieView from "lottie-react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../../types/navigation";
import { useTheme } from "../../context/ThemeContext";
import { Button } from "../../components/common/Button";
import { setItem } from "../../utils/storage";

type Props = NativeStackScreenProps<RootStackParamList, "Onboarding">;

interface SlideItem {
  id: string;
  title: string;
  description: string;
  animation: any;
  iconName: keyof typeof Ionicons.glyphMap;
}

export const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const { colors, isDark } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const slides: SlideItem[] = [
    {
      id: "1",
      title: "Find Compatible Donors Fast",
      description:
        "Connect with verified blood donors across Karachi in minutes with intelligent medical cross-matching.",
      animation: require("../../../assets/animations/blood-drop.json"),
      iconName: "heart-circle-outline",
    },
    {
      id: "2",
      title: "Request Blood in Emergency",
      description:
        "Immediate dispatch and verification pipeline directly tied into major Karachi hospitals and blood banks.",
      animation: require("../../../assets/animations/heartbeat.json"),
      iconName: "flash-outline",
    },
    {
      id: "3",
      title: "Track Your Donation History",
      description:
        "Know exactly when you are eligible to donate again, receive urgent alerts, and help save lives.",
      animation: require("../../../assets/animations/success.json"),
      iconName: "shield-checkmark-outline",
    },
  ];

  const handleFinish = async () => {
    await setItem("kbr_has_seen_onboarding", "true");
    navigation.replace("Login");
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
      setCurrentIndex(currentIndex + 1);
    } else {
      handleFinish();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with Skip Button */}
      <View style={styles.header}>
        <View />
        <TouchableOpacity activeOpacity={0.7} onPress={handleFinish} style={styles.skipButton}>
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Slide Carousel */}
      <FlatList
        ref={flatListRef}
        data={slides}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View
              style={[
                styles.illustrationCard,
                {
                  backgroundColor: colors.cardSecondary,
                  borderColor: colors.borderLight,
                },
              ]}
            >
              <LottieView
                source={item.animation}
                autoPlay
                loop
                style={styles.lottie}
              />
              <View
                style={[
                  styles.iconFloating,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Ionicons name={item.iconName} size={28} color={colors.primary} />
              </View>
            </View>

            <Text style={[styles.slideTitle, { color: colors.textPrimary }]}>
              {item.title}
            </Text>
            <Text style={[styles.slideDesc, { color: colors.textSecondary }]}>
              {item.description}
            </Text>
          </View>
        )}
      />

      {/* Pagination & Next Button */}
      <View style={styles.footer}>
        <View style={styles.dotsRow}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === currentIndex ? colors.primary : colors.border,
                  width: i === currentIndex ? 26 : 8,
                },
              ]}
            />
          ))}
        </View>

        <Button
          title={currentIndex === slides.length - 1 ? "Get Started" : "Continue"}
          onPress={handleNext}
          size="lg"
          style={styles.actionButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
  },
  header: {
    paddingTop: 54,
    paddingHorizontal: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    fontSize: 15,
    fontWeight: "600",
  },
  slide: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  illustrationCard: {
    width: 240,
    height: 240,
    borderRadius: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
    borderWidth: 2,
    position: "relative",
  },
  lottie: {
    width: 160,
    height: 160,
  },
  iconFloating: {
    position: "absolute",
    bottom: 12,
    right: 12,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  slideTitle: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 14,
  },
  slideDesc: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 44,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  actionButton: {
    width: "100%",
  },
});
