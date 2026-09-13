export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: { prefillEmail?: string } | undefined;
  Register: undefined;
  MainTabs: undefined;
  RequestDetail: { requestId: string };
  DonorProfile: undefined;
  CreateRequest: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  FindDonors: undefined;
  MyRequests: undefined;
  CreateRequest: undefined;
  DonorProfile: undefined;
  Notifications: undefined;
  Profile: undefined;
  Admin: undefined;
};
