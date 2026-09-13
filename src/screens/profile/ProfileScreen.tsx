import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Role } from "../../constants/enums";
import { Card } from "../../components/common/Card";
import { Button } from "../../components/common/Button";
import { Badge } from "../../components/common/Badge";

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, isDark, themeMode, setThemeMode, toggleTheme } = useTheme();
  const { user, logout, updateUserRole } = useAuth();

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          // Reset navigation stack to Login screen
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: "Login" }],
            })
          );
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>
          Account & Settings
        </Text>
        <Text style={[styles.screenSubtitle, { color: colors.textSecondary }]}>
          Manage preferences, appearance, and role permissions
        </Text>
      </View>

      {/* User Info Card */}
      <Card variant="blush" style={styles.userCard}>
        <View style={styles.userRow}>
          <View
            style={[
              styles.userAvatar,
              { backgroundColor: colors.primary, borderColor: colors.border },
            ]}
          >
            <Ionicons name="person" size={28} color="#FFFFFF" />
          </View>

          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={[styles.userName, { color: colors.textPrimary }]}>
              {user?.fullName || user?.email?.split("@")[0]}
            </Text>
            <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
              {user?.email}
            </Text>
            <View style={{ marginTop: 6 }}>
              <Badge
                label={user?.role?.toUpperCase() || "USER"}
                status="verified"
                size="sm"
              />
            </View>
          </View>
        </View>
      </Card>

      {/* Theme Settings Card */}
      <Card style={styles.sectionCard}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Appearance & Theme
        </Text>
        <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
          Switch between crisp healthcare light aesthetic and dark mode
        </Text>

        {/* Quick Dark Mode Toggle */}
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <View style={styles.settingIconRow}>
              <Ionicons
                name={isDark ? "moon" : "sunny"}
                size={20}
                color={colors.primary}
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                Dark Theme
              </Text>
            </View>
            <Text style={[styles.settingSub, { color: colors.textSecondary }]}>
              {isDark ? "Deep slate black theme enabled" : "Clean blush-pink light theme"}
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{
              false: colors.switchTrackOff,
              true: colors.switchTrackOn,
            }}
            thumbColor={colors.switchThumb}
          />
        </View>

        {/* Theme Mode Selector (Light / Dark / System) */}
        <View style={styles.themeModeRow}>
          {(["light", "dark", "system"] as const).map((mode) => {
            const active = themeMode === mode;
            return (
              <TouchableOpacity
                key={mode}
                activeOpacity={0.8}
                onPress={() => setThemeMode(mode)}
                style={[
                  styles.modeButton,
                  {
                    backgroundColor: active
                      ? colors.primary
                      : isDark
                        ? "#2D2D2D"
                        : "#F1F5F9",
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    {
                      color: active ? "#FFFFFF" : colors.textPrimary,
                      fontWeight: active ? "700" : "500",
                    },
                  ]}
                >
                  {mode.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      {/* Role Switcher */}
      <Card style={styles.sectionCard}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Active Session Role
        </Text>
        <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
          Switch roles in this session to inspect role-tailored screens and tabs
        </Text>

        <View style={styles.roleGrid}>
          {[
            { role: Role.DONOR, label: "Donor" },
            { role: Role.PATIENT_REQUESTER, label: "Patient" },
            { role: Role.HOSPITAL_STAFF, label: "Hospital Staff" },
            { role: Role.ADMIN, label: "Admin" },
            { role: Role.SUPER_ADMIN, label: "Super Admin" },
          ].map((r) => {
            const isSelected = user?.role === r.role;
            return (
              <TouchableOpacity
                key={r.role}
                activeOpacity={0.8}
                onPress={() => updateUserRole(r.role)}
                style={[
                  styles.roleChip,
                  {
                    backgroundColor: isSelected
                      ? colors.primary
                      : isDark
                        ? "#242424"
                        : "#F8FAFC",
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.roleChipText,
                    {
                      color: isSelected ? "#FFFFFF" : colors.textPrimary,
                      fontWeight: isSelected ? "700" : "500",
                    },
                  ]}
                >
                  {r.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      {/* Network / Backend Server Info */}
      <Card style={styles.sectionCard}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Network Backend
        </Text>
        <View style={styles.serverRow}>
          <Ionicons name="server-outline" size={18} color={colors.primary} />
          <Text style={[styles.serverText, { color: colors.textSecondary }]}>
            http://192.168.0.110:8000
          </Text>
        </View>
        <Text style={[styles.serverSub, { color: colors.textMuted }]}>
          FastAPI backend running locally with MongoDB Atlas connection
        </Text>
      </Card>

      {/* Log Out Button */}
      <Button
        title="Sign Out of Account"
        variant="outline"
        onPress={handleLogout}
        icon={<Ionicons name="log-out-outline" size={18} color={colors.primary} />}
        size="lg"
        style={styles.logoutBtn}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 54,
    paddingBottom: 48,
  },
  header: {
    marginBottom: 20,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 13,
  },
  userCard: {
    marginBottom: 16,
    padding: 18,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  userName: {
    fontSize: 18,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  userEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  sectionCard: {
    marginBottom: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 14,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  settingInfo: {
    flex: 1,
    paddingRight: 10,
  },
  settingIconRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  settingSub: {
    fontSize: 12,
  },
  themeModeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  modeButtonText: {
    fontSize: 12,
  },
  roleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  roleChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  roleChipText: {
    fontSize: 12,
  },
  serverRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 4,
  },
  serverText: {
    fontSize: 13,
    fontWeight: "700",
  },
  serverSub: {
    fontSize: 11,
    marginTop: 2,
  },
  logoutBtn: {
    marginTop: 10,
    marginBottom: 24,
  },
});