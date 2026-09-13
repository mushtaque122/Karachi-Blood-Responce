import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../../types/navigation";
import { Role } from "../../constants/enums";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { getApiErrorMessage } from "../../api/client";

type Props = NativeStackScreenProps<RootStackParamList, "Register">;

export const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { register } = useAuth();

  const [role, setRole] = useState<Role.PATIENT_REQUESTER | Role.DONOR>(
    Role.DONOR
  );
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!fullName.trim()) nextErrors.fullName = "Full name is required";
    if (!email.trim()) {
      nextErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      nextErrors.email = "Please enter a valid email address";
    }
    if (!password) {
      nextErrors.password = "Password is required";
    } else if (password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters";
    }
    if (password !== confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      await register({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      });

      Alert.alert(
        "Registration Successful",
        "Your account has been created. Please log in with your credentials.",
        [
          {
            text: "Continue to Login",
            onPress: () =>
              navigation.replace("Login", { prefillEmail: email.trim().toLowerCase() }),
          },
        ]
      );
    } catch (err) {
      const msg = getApiErrorMessage(err);
      Alert.alert("Registration Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.navigate("Login")}
            style={[
              styles.backButton,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Join Karachi Blood Response
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Select your account type and start saving lives
          </Text>
        </View>

        {/* Role Selector Tabs */}
        <View
          style={[
            styles.roleSelector,
            {
              backgroundColor: isDark ? "#1E1E1E" : "#F1F5F9",
              borderColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setRole(Role.DONOR)}
            style={[
              styles.roleTab,
              role === Role.DONOR && {
                backgroundColor: colors.primary,
              },
            ]}
          >
            <Ionicons
              name="water-outline"
              size={18}
              color={role === Role.DONOR ? "#FFFFFF" : colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.roleText,
                {
                  color: role === Role.DONOR ? "#FFFFFF" : colors.textSecondary,
                  fontWeight: role === Role.DONOR ? "700" : "500",
                },
              ]}
            >
              Blood Donor
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setRole(Role.PATIENT_REQUESTER)}
            style={[
              styles.roleTab,
              role === Role.PATIENT_REQUESTER && {
                backgroundColor: colors.primary,
              },
            ]}
          >
            <Ionicons
              name="medical-outline"
              size={18}
              color={
                role === Role.PATIENT_REQUESTER ? "#FFFFFF" : colors.textSecondary
              }
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.roleText,
                {
                  color:
                    role === Role.PATIENT_REQUESTER ? "#FFFFFF" : colors.textSecondary,
                  fontWeight: role === Role.PATIENT_REQUESTER ? "700" : "500",
                },
              ]}
            >
              Patient / Requester
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <Input
          label="Full Name"
          placeholder="e.g. Haseeb Khuhro"
          value={fullName}
          onChangeText={setFullName}
          error={errors.fullName}
          leftIcon={
            <Ionicons name="person-outline" size={18} color={colors.iconMuted} />
          }
        />

        <Input
          label="Email Address"
          placeholder="name@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          leftIcon={
            <Ionicons name="mail-outline" size={18} color={colors.iconMuted} />
          }
        />

        <Input
          label="Password (min. 8 characters)"
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          leftIcon={
            <Ionicons name="lock-closed-outline" size={18} color={colors.iconMuted} />
          }
        />

        <Input
          label="Confirm Password"
          placeholder="••••••••"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          error={errors.confirmPassword}
          leftIcon={
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.iconMuted} />
          }
        />

        <Button
          title="Create Account"
          onPress={handleRegister}
          loading={loading}
          size="lg"
          style={styles.submitButton}
        />

        <View style={styles.footerRow}>
          <Text style={[styles.footerPrompt, { color: colors.textSecondary }]}>
            Already have an account?{" "}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={[styles.footerLink, { color: colors.primary }]}>
              Log In
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 54,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  roleSelector: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    padding: 4,
    marginBottom: 24,
  },
  roleTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 14,
  },
  submitButton: {
    marginTop: 8,
    marginBottom: 20,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerPrompt: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: "700",
  },
});
