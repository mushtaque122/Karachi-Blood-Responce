import React from "react";
import { View, ActivityIndicator } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";

import { useAuth } from "../context/AuthContext";
import { SplashScreen } from "../screens/splash/SplashScreen";
import { OnboardingScreen } from "../screens/onboarding/OnboardingScreen";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { RegisterScreen } from "../screens/auth/RegisterScreen";
import { MainTabNavigator } from "./MainTabNavigator";
import { RequestDetailScreen } from "../screens/request/RequestDetailScreen";
import { DonorProfileScreen } from "../screens/donor/DonorProfileScreen";
import { CreateRequestScreen } from "../screens/request/CreateRequestScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#E63946" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      {!token ? (
        // Unauthenticated Stack (Logout hone par automatic ye active hoga)
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        </>
      ) : (
        // Authenticated Stack
        <>
          <Stack.Screen name="MainTabs" component={MainTabNavigator} />
          <Stack.Screen name="RequestDetail" component={RequestDetailScreen} />
          <Stack.Screen name="DonorProfile" component={DonorProfileScreen} />
          <Stack.Screen name="CreateRequest" component={CreateRequestScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};