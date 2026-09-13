import React, { useEffect, useState } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { MainTabParamList } from "../types/navigation";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { Role } from "../constants/enums";
import { getMyNotifications } from "../api/notifications";

import { HomeScreen } from "../screens/home/HomeScreen";
import { FindDonorsScreen } from "../screens/donor/FindDonorsScreen";
import { DonorProfileScreen } from "../screens/donor/DonorProfileScreen";
import { CreateRequestScreen } from "../screens/request/CreateRequestScreen";
import { NotificationsScreen } from "../screens/notifications/NotificationsScreen";
import { ProfileScreen } from "../screens/profile/ProfileScreen";
import { AdminDashboardScreen } from "../screens/admin/AdminDashboardScreen";

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabNavigator: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const notifs = await getMyNotifications(true);
        setUnreadCount(notifs.length);
      } catch {
        // silent
      }
    })();
  }, []);

  const role = user?.role || Role.PATIENT_REQUESTER;

  const isStaffOrAdmin =
    role === Role.ADMIN ||
    role === Role.SUPER_ADMIN ||
    role === Role.HOSPITAL_STAFF ||
    role === Role.BLOOD_BANK_STAFF ||
    role === Role.EMERGENCY_COORDINATOR ||
    role === Role.DOCTOR;

  const isAdmin = role === Role.ADMIN || role === Role.SUPER_ADMIN;
  const isDonor = role === Role.DONOR;
  const isPatient = role === Role.PATIENT_REQUESTER;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          elevation: 8,
          height: Platform.OS === "ios" ? 88 : 64,
          paddingBottom: Platform.OS === "ios" ? 28 : 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      {/* 1. Home Tab (All roles) */}
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* 2. Staff: Find Donors */}
      {isStaffOrAdmin && (
        <Tab.Screen
          name="FindDonors"
          component={FindDonorsScreen}
          options={{
            tabBarLabel: "Find Donors",
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "search" : "search-outline"}
                size={size}
                color={color}
              />
            ),
          }}
        />
      )}

      {/* 3. Role-specific Middle Action Tab */}
      {isDonor ? (
        <Tab.Screen
          name="DonorProfile"
          component={DonorProfileScreen}
          options={{
            tabBarLabel: "My Profile",
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "water" : "water-outline"}
                size={size}
                color={color}
              />
            ),
          }}
        />
      ) : (
        <Tab.Screen
          name="CreateRequest"
          component={CreateRequestScreen}
          options={{
            tabBarLabel: "Request Blood",
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "add-circle" : "add-circle-outline"}
                size={size}
                color={color}
              />
            ),
          }}
        />
      )}

      {/* 4. Notifications Tab (All roles) */}
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarLabel: "Alerts",
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.primary,
            color: "#FFFFFF",
            fontSize: 10,
            fontWeight: "700",
          },
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "notifications" : "notifications-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* 5. Admin Dashboard (Admin / Super Admin only) */}
      {isAdmin && (
        <Tab.Screen
          name="Admin"
          component={AdminDashboardScreen}
          options={{
            tabBarLabel: "Admin",
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "stats-chart" : "stats-chart-outline"}
                size={size}
                color={color}
              />
            ),
          }}
        />
      )}

      {/* 6. Settings / Profile Tab (All roles) */}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Settings",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "person-circle" : "person-circle-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};
