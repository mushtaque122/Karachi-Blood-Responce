import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Rect, Text as SvgText } from "react-native-svg";
import { useTheme } from "../../context/ThemeContext";
import {
  getDashboardSummary,
  getRequestAnalytics,
  getDonorAnalytics,
  DashboardSummary,
  RequestAnalytics,
  DonorAnalytics,
} from "../../api/admin";
import { Card } from "../../components/common/Card";
import { CircularProgress } from "../../components/common/CircularProgress";

export const AdminDashboardScreen: React.FC = () => {
  const { colors, isDark } = useTheme();

  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [requestStats, setRequestStats] = useState<RequestAnalytics | null>(null);
  const [donorStats, setDonorStats] = useState<DonorAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [dash, reqA, donA] = await Promise.all([
        getDashboardSummary().catch(() => null),
        getRequestAnalytics().catch(() => null),
        getDonorAnalytics().catch(() => null),
      ]);
      setDashboard(dash);
      setRequestStats(reqA);
      setDonorStats(donA);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <View
        style={[
          styles.centerContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Bar chart computation for blood groups
  const bloodData = requestStats?.requests_by_blood_group || {};
  const bloodKeys = Object.keys(bloodData);
  const maxCount = Math.max(...Object.values(bloodData), 1);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Executive Dashboard
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Live Karachi Blood Response analytics & resource metrics
        </Text>
      </View>

      {/* Hero Circular Ring Card: Fulfillment Rate */}
      <Card variant="blush" style={styles.heroRingCard}>
        <View style={styles.ringCol}>
          <CircularProgress
            size={140}
            strokeWidth={12}
            progress={requestStats?.fulfillment_rate_pct || 0}
            title={`${requestStats?.fulfillment_rate_pct || 0}%`}
            subtitle="FULFILLED"
            color={colors.primary}
          />
        </View>

        <View style={styles.heroTextCol}>
          <Text style={[styles.heroRateLabel, { color: colors.textMuted }]}>
            TRANSFUSION RATE
          </Text>
          <Text style={[styles.heroRateNumber, { color: colors.textPrimary }]}>
            {requestStats?.fulfilled_requests || 0} /{" "}
            {requestStats?.total_requests || 0}
          </Text>
          <Text style={[styles.heroRateDesc, { color: colors.textSecondary }]}>
            {requestStats?.avg_fulfillment_minutes
              ? `Avg speed: ${requestStats.avg_fulfillment_minutes} mins`
              : "Calculated from confirmed hospital receptions"}
          </Text>
        </View>
      </Card>

      {/* 2x2 Metric Cards Grid */}
      <View style={styles.grid2x2}>
        <Card style={styles.gridCard}>
          <View style={styles.gridIconRow}>
            <Ionicons name="people" size={22} color={colors.primary} />
            <Text style={[styles.gridNumber, { color: colors.textPrimary }]}>
              {dashboard?.total_donors || 0}
            </Text>
          </View>
          <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>
            Registered Donors
          </Text>
          <Text style={[styles.gridSub, { color: colors.statusVerified.text }]}>
            {dashboard?.verified_donors || 0} Verified
          </Text>
        </Card>

        <Card style={styles.gridCard}>
          <View style={styles.gridIconRow}>
            <Ionicons name="git-pull-request" size={22} color={colors.primary} />
            <Text style={[styles.gridNumber, { color: colors.textPrimary }]}>
              {dashboard?.total_requests || 0}
            </Text>
          </View>
          <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>
            Total Requests
          </Text>
          <Text style={[styles.gridSub, { color: colors.textMuted }]}>
            {requestStats?.cancelled_requests || 0} Cancelled
          </Text>
        </Card>

        <Card style={styles.gridCard}>
          <View style={styles.gridIconRow}>
            <Ionicons name="business" size={22} color={colors.primary} />
            <Text style={[styles.gridNumber, { color: colors.textPrimary }]}>
              {dashboard?.total_hospitals || 0}
            </Text>
          </View>
          <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>
            Hospital Partners
          </Text>
          <Text style={[styles.gridSub, { color: colors.statusVerified.text }]}>
            {dashboard?.verified_hospitals || 0} Verified
          </Text>
        </Card>

        <Card style={styles.gridCard}>
          <View style={styles.gridIconRow}>
            <Ionicons name="water" size={22} color={colors.primary} />
            <Text style={[styles.gridNumber, { color: colors.textPrimary }]}>
              {dashboard?.total_blood_banks || 0}
            </Text>
          </View>
          <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>
            Blood Banks
          </Text>
          <Text style={[styles.gridSub, { color: colors.statusVerified.text }]}>
            {dashboard?.verified_blood_banks || 0} Verified
          </Text>
        </Card>
      </View>

      {/* Requests by Blood Group Chart */}
      <Card style={styles.chartCard}>
        <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>
          Requests By Blood Group
        </Text>
        <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>
          Distribution of units requested across patient requisitions
        </Text>

        {bloodKeys.length === 0 ? (
          <View style={styles.emptyChart}>
            <Text style={[styles.emptyChartText, { color: colors.textMuted }]}>
              No blood request distribution data recorded yet.
            </Text>
          </View>
        ) : (
          <View style={styles.chartWrapper}>
            <Svg width="100%" height={160} viewBox="0 0 320 160">
              {bloodKeys.map((key, i) => {
                const count = bloodData[key] || 0;
                const barHeight = Math.max(8, (count / maxCount) * 110);
                const x = 20 + i * 36;
                const y = 130 - barHeight;

                return (
                  <React.Fragment key={key}>
                    {/* Bar */}
                    <Rect
                      x={x}
                      y={y}
                      width={24}
                      height={barHeight}
                      rx={6}
                      fill={colors.primary}
                    />
                    {/* Count Text */}
                    <SvgText
                      x={x + 12}
                      y={y - 4}
                      fill={colors.textSecondary}
                      fontSize="10"
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      {count}
                    </SvgText>
                    {/* Label Text */}
                    <SvgText
                      x={x + 12}
                      y={148}
                      fill={colors.textPrimary}
                      fontSize="10"
                      fontWeight="800"
                      textAnchor="middle"
                    >
                      {key}
                    </SvgText>
                  </React.Fragment>
                );
              })}
            </Svg>
          </View>
        )}
      </Card>

      {/* Notification Engine Stats */}
      <Card style={styles.notifStatsCard}>
        <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>
          Notification Engine Health
        </Text>
        <View style={styles.notifRow}>
          <View style={styles.notifStatCol}>
            <Text style={[styles.notifNum, { color: colors.statusVerified.text }]}>
              {dashboard?.notifications_sent || 0}
            </Text>
            <Text style={[styles.notifLabel, { color: colors.textSecondary }]}>
              Dispatched Sent
            </Text>
          </View>
          <View style={styles.notifStatCol}>
            <Text style={[styles.notifNum, { color: colors.statusCancelled.text }]}>
              {dashboard?.notifications_failed || 0}
            </Text>
            <Text style={[styles.notifLabel, { color: colors.textSecondary }]}>
              Failed / Blocked
            </Text>
          </View>
          <View style={styles.notifStatCol}>
            <Text style={[styles.notifNum, { color: colors.primary }]}>
              {dashboard?.ai_sessions_total || 0}
            </Text>
            <Text style={[styles.notifLabel, { color: colors.textSecondary }]}>
              AI Guardrail Sessions
            </Text>
          </View>
        </View>
      </Card>
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
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
  },
  heroRingCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    marginBottom: 16,
  },
  ringCol: {
    marginRight: 16,
  },
  heroTextCol: {
    flex: 1,
  },
  heroRateLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  heroRateNumber: {
    fontSize: 22,
    fontWeight: "900",
  },
  heroRateDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  grid2x2: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  gridCard: {
    width: "48%",
    marginBottom: 12,
    padding: 14,
  },
  gridIconRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  gridNumber: {
    fontSize: 22,
    fontWeight: "900",
  },
  gridLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  gridSub: {
    fontSize: 11,
    fontWeight: "700",
  },
  chartCard: {
    padding: 18,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 2,
  },
  chartSubtitle: {
    fontSize: 12,
    marginBottom: 16,
  },
  chartWrapper: {
    alignItems: "center",
  },
  emptyChart: {
    paddingVertical: 30,
    alignItems: "center",
  },
  emptyChartText: {
    fontSize: 13,
  },
  notifStatsCard: {
    padding: 18,
    marginBottom: 20,
  },
  notifRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  notifStatCol: {
    alignItems: "center",
  },
  notifNum: {
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 2,
  },
  notifLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
});
