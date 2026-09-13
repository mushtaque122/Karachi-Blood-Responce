export interface StatusColorSet {
  bg: string;
  text: string;
  border: string;
  badgeBg: string;
}

export interface ThemeColors {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primaryText: string;

  background: string;
  surface: string;
  card: string;
  cardSecondary: string;
  border: string;
  borderLight: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  inputBackground: string;
  inputBorder: string;
  inputBorderFocus: string;
  inputPlaceholder: string;
  inputText: string;

  icon: string;
  iconMuted: string;
  iconActive: string;

  tabBar: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;

  // Status tokens
  statusDraft: StatusColorSet;
  statusPending: StatusColorSet;
  statusVerified: StatusColorSet;
  statusMatching: StatusColorSet;
  statusDonorsFound: StatusColorSet;
  statusInProgress: StatusColorSet;
  statusFulfilled: StatusColorSet;
  statusCancelled: StatusColorSet;

  // Urgency tokens
  urgencyNormal: StatusColorSet;
  urgencyUrgent: StatusColorSet;
  urgencyCritical: StatusColorSet;

  // Accents & shadows
  shadowColor: string;
  shadowOpacity: number;
  divider: string;
  switchTrackOff: string;
  switchTrackOn: string;
  switchThumb: string;
}

export const lightColors: ThemeColors = {
  primary: "#E63950",
  primaryDark: "#D32F3F",
  primaryLight: "#FFE4E8",
  primaryText: "#FFFFFF",

  background: "#F8FAFC",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  cardSecondary: "#FFF5F6",
  border: "#E2E8F0",
  borderLight: "#F1F5F9",

  textPrimary: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#94A3B8",
  textInverse: "#FFFFFF",

  inputBackground: "#FFFFFF",
  inputBorder: "#CBD5E1",
  inputBorderFocus: "#E63950",
  inputPlaceholder: "#94A3B8",
  inputText: "#0F172A",

  icon: "#475569",
  iconMuted: "#94A3B8",
  iconActive: "#E63950",

  tabBar: "#FFFFFF",
  tabBarBorder: "#E2E8F0",
  tabBarActive: "#E63950",
  tabBarInactive: "#94A3B8",

  statusDraft: {
    bg: "#F1F5F9",
    text: "#475569",
    border: "#CBD5E1",
    badgeBg: "#E2E8F0",
  },
  statusPending: {
    bg: "#FEF3C7",
    text: "#B45309",
    border: "#FCD34D",
    badgeBg: "#FDE68A",
  },
  statusVerified: {
    bg: "#DCFCE7",
    text: "#15803D",
    border: "#86EFAC",
    badgeBg: "#BBF7D0",
  },
  statusMatching: {
    bg: "#DBEAFE",
    text: "#1D4ED8",
    border: "#93C5FD",
    badgeBg: "#BFDBFE",
  },
  statusDonorsFound: {
    bg: "#EDE9FE",
    text: "#6D28D9",
    border: "#C4B5FD",
    badgeBg: "#DDD6FE",
  },
  statusInProgress: {
    bg: "#E0F2FE",
    text: "#0369A1",
    border: "#7DD3FC",
    badgeBg: "#BAE6FD",
  },
  statusFulfilled: {
    bg: "#D1FAE5",
    text: "#047857",
    border: "#6EE7B7",
    badgeBg: "#A7F3D0",
  },
  statusCancelled: {
    bg: "#FEE2E2",
    text: "#B91C1C",
    border: "#FCA5A5",
    badgeBg: "#FECACA",
  },

  urgencyNormal: {
    bg: "#DCFCE7",
    text: "#15803D",
    border: "#86EFAC",
    badgeBg: "#BBF7D0",
  },
  urgencyUrgent: {
    bg: "#FEF3C7",
    text: "#B45309",
    border: "#FCD34D",
    badgeBg: "#FDE68A",
  },
  urgencyCritical: {
    bg: "#FFE4E6",
    text: "#BE123C",
    border: "#FDA4AF",
    badgeBg: "#FECDD3",
  },

  shadowColor: "#000000",
  shadowOpacity: 0.08,
  divider: "#E2E8F0",
  switchTrackOff: "#CBD5E1",
  switchTrackOn: "#E63950",
  switchThumb: "#FFFFFF",
};

export const darkColors: ThemeColors = {
  primary: "#E63950",
  primaryDark: "#C0263B",
  primaryLight: "#3E1B22",
  primaryText: "#FFFFFF",

  background: "#121212",
  surface: "#1E1E1E",
  card: "#1E1E1E",
  cardSecondary: "#261A1D",
  border: "#333333",
  borderLight: "#282828",

  textPrimary: "#F8FAFC",
  textSecondary: "#CBD5E1",
  textMuted: "#64748B",
  textInverse: "#0F172A",

  inputBackground: "#242424",
  inputBorder: "#404040",
  inputBorderFocus: "#E63950",
  inputPlaceholder: "#64748B",
  inputText: "#F8FAFC",

  icon: "#CBD5E1",
  iconMuted: "#64748B",
  iconActive: "#FF6B81",

  tabBar: "#181818",
  tabBarBorder: "#282828",
  tabBarActive: "#FF6B81",
  tabBarInactive: "#64748B",

  statusDraft: {
    bg: "#27272A",
    text: "#E4E4E7",
    border: "#3F3F46",
    badgeBg: "#3F3F46",
  },
  statusPending: {
    bg: "#362B16",
    text: "#FDE68A",
    border: "#78350F",
    badgeBg: "#453210",
  },
  statusVerified: {
    bg: "#143322",
    text: "#86EFAC",
    border: "#166534",
    badgeBg: "#19452C",
  },
  statusMatching: {
    bg: "#172554",
    text: "#93C5FD",
    border: "#1E40AF",
    badgeBg: "#1E3A8A",
  },
  statusDonorsFound: {
    bg: "#2E1065",
    text: "#C4B5FD",
    border: "#5B21B6",
    badgeBg: "#3B1578",
  },
  statusInProgress: {
    bg: "#0C4A6E",
    text: "#7DD3FC",
    border: "#0369A1",
    badgeBg: "#075985",
  },
  statusFulfilled: {
    bg: "#064E3B",
    text: "#6EE7B7",
    border: "#047857",
    badgeBg: "#065F46",
  },
  statusCancelled: {
    bg: "#3B181E",
    text: "#FCA5A5",
    border: "#881337",
    badgeBg: "#4C1D24",
  },

  urgencyNormal: {
    bg: "#143322",
    text: "#86EFAC",
    border: "#166534",
    badgeBg: "#19452C",
  },
  urgencyUrgent: {
    bg: "#362B16",
    text: "#FDE68A",
    border: "#78350F",
    badgeBg: "#453210",
  },
  urgencyCritical: {
    bg: "#3B181E",
    text: "#FDA4AF",
    border: "#881337",
    badgeBg: "#4C1D24",
  },

  shadowColor: "#000000",
  shadowOpacity: 0.4,
  divider: "#2D2D2D",
  switchTrackOff: "#3F3F46",
  switchTrackOn: "#E63950",
  switchThumb: "#FFFFFF",
};

export const theme = {
  light: lightColors,
  dark: darkColors,
};
