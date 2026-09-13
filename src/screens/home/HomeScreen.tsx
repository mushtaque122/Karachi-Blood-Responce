import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Switch,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../types/navigation";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Role } from "../../constants/enums";
import { getMyDonorProfile, updateMyDonorProfile, DonorProfileOut } from "../../api/donors";
import { listMyRequests, BloodRequestOut } from "../../api/requests";
import { getMyNotifications } from "../../api/notifications";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { CircularProgress } from "../../components/common/CircularProgress";

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();

  const isDonor = user?.role === Role.DONOR;

  // Donor state
  const [donorProfile, setDonorProfile] = useState<DonorProfileOut | null>(null);
  const [hasNoDonorProfile, setHasNoDonorProfile] = useState(false);
  const [updatingAvailability, setUpdatingAvailability] = useState(false);

  // Patient / Requester state
  const [requests, setRequests] = useState<BloodRequestOut[]>([]);

  // General state
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      // Fetch unread notifications
      try {
        const notifs = await getMyNotifications(true);
        setUnreadNotifications(notifs.length);
      } catch {
        // notification fetch silent fail
      }

      if (isDonor) {
        try {
          const profile = await getMyDonorProfile();
          setDonorProfile(profile);
          setHasNoDonorProfile(false);
        } catch (err: any) {
          if (err.response?.status === 404) {
            setHasNoDonorProfile(true);
            setDonorProfile(null);
          }
        }
      } else {
        // Patient / Staff / Admin request view
        try {
          const myReqs = await listMyRequests();
          setRequests(myReqs);
        } catch {
          // request fetch silent fail
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isDonor]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleAvailability = async (value: boolean) => {
    if (!donorProfile) return;
    setUpdatingAvailability(true);
    try {
      const updated = await updateMyDonorProfile({ availability: value });
      setDonorProfile(updated);
    } catch {
      // rollback or alert
    } finally {
      setUpdatingAvailability(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const renderDonorView = () => {
    if (hasNoDonorProfile) {
      return (
        <Card variant="blush" style={styles.ctaCard}>
          <View style={styles.ctaIconBox}>
            <Ionicons name="water" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.ctaTitle, { color: colors.textPrimary }]}>
            Complete Your Donor Profile
          </Text>
          <Text style={[styles.ctaSubtitle, { color: colors.textSecondary }]}>
            Set your blood type, location, and emergency availability so patients
            and hospitals can reach you when every second counts.
          </Text>
          <Button
            title="Create Donor Profile"
            onPress={() => navigation.navigate("DonorProfile")}
            size="lg"
            style={{ width: "100%", marginTop: 16 }}
          />
        </Card>
      );
    }

    if (!donorProfile) {
      return null;
    }

    return (
      <View style={styles.contentSection}>
        {/* Availability Toggle Card */}
        <Card style={styles.cardSpacing}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Donation Availability
              </Text>
              <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
                {donorProfile.availability
                  ? "You are active and visible for matching requests"
                  : "You are currently paused from receiving donation requests"}
              </Text>
            </View>
            {updatingAvailability ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Switch
                value={donorProfile.availability}
                onValueChange={handleToggleAvailability}
                trackColor={{
                  false: colors.switchTrackOff,
                  true: colors.switchTrackOn,
                }}
                thumbColor={colors.switchThumb}
              />
            )}
          </View>
        </Card>

        {/* Glucose-meter style eligibility card */}
        <Card variant="blush" style={[styles.cardSpacing, styles.meterCard]}>
          <Text style={[styles.meterLabel, { color: colors.textMuted }]}>
            DONOR ELIGIBILITY STATUS
          </Text>

          <View style={styles.meterRow}>
            <View style={styles.meterNumberBox}>
              <Text
                style={[
                  styles.meterBigNumber,
                  {
                    color: donorProfile.is_eligible
                      ? colors.statusVerified.text
                      : colors.statusPending.text,
                  },
                ]}
              >
                {donorProfile.is_eligible ? "READY" : "WAITING"}
              </Text>
              <Text style={[styles.meterSubtext, { color: colors.textSecondary }]}>
                {donorProfile.is_eligible
                  ? "Eligible to donate today"
                  : "Minimum interval required between donations"}
              </Text>
            </View>

            <View
              style={[
                styles.bloodChipLarge,
                { backgroundColor: colors.primary, borderColor: colors.border },
              ]}
            >
              <Text style={styles.bloodChipLargeText}>
                {donorProfile.blood_group}
              </Text>
              <Text style={styles.bloodChipLargeSub}>TYPE</Text>
            </View>
          </View>

          <View style={styles.meterFooter}>
            <View style={styles.meterStatCol}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                LAST DONATED
              </Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {donorProfile.last_donation_date || "Never / First Time"}
              </Text>
            </View>
            <View style={styles.meterStatCol}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                VERIFICATION
              </Text>
              <Badge
                label={donorProfile.verification_status}
                status={
                  donorProfile.verification_status === "verified"
                    ? "verified"
                    : "pending_verification"
                }
                size="sm"
              />
            </View>
          </View>
        </Card>

        {/* Edit Profile CTA */}
        <Button
          title="Edit Donor Profile & Hospitals"
          variant="outline"
          onPress={() => navigation.navigate("DonorProfile")}
          icon={<Ionicons name="create-outline" size={18} color={colors.primary} />}
          style={{ width: "100%", marginVertical: 8 }}
        />
      </View>
    );
  };

  const renderPatientView = () => {
    return (
      <View style={styles.contentSection}>
        {/* Create Request CTA Banner */}
        <Card variant="blush" style={[styles.cardSpacing, styles.heroBanner]}>
          <View style={styles.heroTextCol}>
            <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
              Emergency Blood Request
            </Text>
            <Text style={[styles.heroDesc, { color: colors.textSecondary }]}>
              Need blood for a patient or surgery in Karachi? Start a verified dispatch now.
            </Text>
            <Button
              title="Create Blood Request"
              onPress={() => navigation.navigate("CreateRequest")}
              size="md"
              icon={<Ionicons name="add-circle" size={18} color="#FFFFFF" />}
              style={{ marginTop: 12, alignSelf: "flex-start" }}
            />
          </View>
          <View style={styles.heroIconBox}>
            <Ionicons name="pulse" size={48} color={colors.primary} />
          </View>
        </Card>

        {/* Recent Requests Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            My Requests
          </Text>
          <TouchableOpacity onPress={() => loadData()}>
            <Text style={[styles.sectionAction, { color: colors.primary }]}>
              Refresh
            </Text>
          </TouchableOpacity>
        </View>

        {requests.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={38} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              No requests placed yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              When you submit a blood request, it will appear here for live tracking.
            </Text>
          </Card>
        ) : (
          requests.map((req) => (
            <TouchableOpacity
              key={req.id}
              activeOpacity={0.8}
              onPress={() =>
                navigation.navigate("RequestDetail", { requestId: req.id })
              }
            >
              <Card style={[styles.requestCard, { marginBottom: 12 }]}>
                <View style={styles.rowBetween}>
                  <View style={styles.reqLeft}>
                    <View
                      style={[
                        styles.reqBloodBadge,
                        { backgroundColor: colors.primaryLight },
                      ]}
                    >
                      <Text style={[styles.reqBloodText, { color: colors.primary }]}>
                        {req.blood_group}
                      </Text>
                    </View>
                    <View style={styles.reqHospitalInfo}>
                      <Text
                        style={[styles.reqHospitalName, { color: colors.textPrimary }]}
                        numberOfLines={1}
                      >
                        {req.hospital_name}
                      </Text>
                      <Text
                        style={[styles.reqUnits, { color: colors.textSecondary }]}
                      >
                        {req.units_required} unit(s) • {req.city}
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Badge label={req.status} status={req.status} size="sm" />
                    <Text
                      style={[styles.reqDate, { color: colors.textMuted, marginTop: 4 }]}
                    >
                      {new Date(req.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.borderLight,
          },
        ]}
      >
        <View>
          <Text style={[styles.greeting, { color: colors.textMuted }]}>
            Assalam-o-Alaikum,
          </Text>
          <Text style={[styles.userName, { color: colors.textPrimary }]}>
            {user?.email.split("@")[0]}
          </Text>
        </View>

        {/* Notifications Icon Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate("MainTabs")}
          style={[
            styles.notifButton,
            { backgroundColor: colors.cardSecondary, borderColor: colors.border },
          ]}
        >
          <Ionicons name="notifications-outline" size={22} color={colors.primary} />
          {unreadNotifications > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.unreadText}>{unreadNotifications}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : isDonor ? (
          renderDonorView()
        ) : (
          renderPatientView()
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  greeting: {
    fontSize: 13,
    fontWeight: "600",
  },
  userName: {
    fontSize: 20,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  notifButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  unreadBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  unreadText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    paddingVertical: 80,
    alignItems: "center",
  },
  contentSection: {
    flex: 1,
  },
  cardSpacing: {
    marginBottom: 16,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  ctaCard: {
    alignItems: "center",
    padding: 24,
  },
  ctaIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFE4E8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  ctaSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  meterCard: {
    padding: 20,
  },
  meterLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 12,
  },
  meterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  meterNumberBox: {
    flex: 1,
  },
  meterBigNumber: {
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  meterSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  bloodChipLarge: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowColor: "#E63950",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  bloodChipLargeText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
  },
  bloodChipLargeSub: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
  },
  meterFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
    paddingTop: 12,
  },
  meterStatCol: {
    flexDirection: "column",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  heroBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },
  heroDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  heroIconBox: {
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: "700",
  },
  emptyCard: {
    alignItems: "center",
    padding: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  requestCard: {
    padding: 14,
  },
  reqLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  reqBloodBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  reqBloodText: {
    fontSize: 16,
    fontWeight: "800",
  },
  reqHospitalInfo: {
    flex: 1,
  },
  reqHospitalName: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  reqUnits: {
    fontSize: 12,
  },
  reqDate: {
    fontSize: 11,
  },
});
