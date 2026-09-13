import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../../types/navigation";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { RequestStatus, Role } from "../../constants/enums";
import {
  getRequest,
  getMatches,
  submitRequest,
  verifyRequest,
  runMatching,
  startFulfillment,
  fulfillRequest,
  cancelRequest,
  BloodRequestOut,
  DonorMatchOut,
} from "../../api/requests";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";
import { getApiErrorMessage } from "../../api/client";

type Props = NativeStackScreenProps<RootStackParamList, "RequestDetail">;

const LIFECYCLE_STEPS: { key: RequestStatus; label: string; desc: string }[] = [
  {
    key: RequestStatus.DRAFT,
    label: "Draft Created",
    desc: "Requisition drafted by requester",
  },
  {
    key: RequestStatus.PENDING_VERIFICATION,
    label: "Pending Verification",
    desc: "Awaiting medical staff verification",
  },
  {
    key: RequestStatus.VERIFIED,
    label: "Verified",
    desc: "Hospital confirmed patient need",
  },
  {
    key: RequestStatus.MATCHING,
    label: "Matching Engine",
    desc: "Searching compatible blood donors",
  },
  {
    key: RequestStatus.DONORS_FOUND,
    label: "Donors Found",
    desc: "Notifications dispatched to candidates",
  },
  {
    key: RequestStatus.IN_PROGRESS,
    label: "In Progress",
    desc: "Donor in transit or donation ongoing",
  },
  {
    key: RequestStatus.FULFILLED,
    label: "Fulfilled",
    desc: "Blood unit received and transfused",
  },
];

export const RequestDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { requestId } = route.params;
  const { colors, isDark } = useTheme();
  const { user } = useAuth();

  const [request, setRequest] = useState<BloodRequestOut | null>(null);
  const [matches, setMatches] = useState<DonorMatchOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const isStaffOrAdmin =
    user?.role === Role.ADMIN ||
    user?.role === Role.SUPER_ADMIN ||
    user?.role === Role.HOSPITAL_STAFF ||
    user?.role === Role.BLOOD_BANK_STAFF ||
    user?.role === Role.EMERGENCY_COORDINATOR ||
    user?.role === Role.DOCTOR;

  const loadDetails = useCallback(async () => {
    try {
      const data = await getRequest(requestId);
      setRequest(data);

      const statusEnum = data.status;
      if (
        statusEnum === RequestStatus.DONORS_FOUND ||
        statusEnum === RequestStatus.IN_PROGRESS ||
        statusEnum === RequestStatus.FULFILLED
      ) {
        try {
          const matchData = await getMatches(requestId);
          setMatches(matchData);
        } catch {
          // matches load silent fail
        }
      }
    } catch (err) {
      const msg = getApiErrorMessage(err);
      Alert.alert("Error loading request", msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [requestId]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDetails();
  };

  const handleAction = async (actionName: string, actionFn: () => Promise<any>) => {
    setActionLoading(true);
    try {
      await actionFn();
      Alert.alert("Success", `Request status updated: ${actionName}`);
      await loadDetails();
    } catch (err) {
      const msg = getApiErrorMessage(err);
      Alert.alert("Action Failed", msg);
    } finally {
      setActionLoading(false);
    }
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

  if (!request) {
    return (
      <View
        style={[
          styles.centerContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <Text style={[styles.notFoundText, { color: colors.textPrimary }]}>
          Blood Request Not Found
        </Text>
        <Button
          title="Back"
          onPress={() => navigation.goBack()}
          style={{ marginTop: 16 }}
        />
      </View>
    );
  }

  const currentStepIndex = LIFECYCLE_STEPS.findIndex(
    (s) => s.key === request.status
  );
  const isCancelled = request.status === RequestStatus.CANCELLED;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Top Bar Header */}
      <View style={styles.topRow}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[
            styles.backBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.reqHeaderId, { color: colors.textMuted }]}>
          ID: {request.id.slice(-8)}
        </Text>
        <Badge label={request.status} status={request.status} />
      </View>

      {/* Main Request Summary Card */}
      <Card variant="blush" style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <View
            style={[
              styles.bloodPill,
              { backgroundColor: colors.primary, borderColor: colors.border },
            ]}
          >
            <Text style={styles.bloodPillText}>{request.blood_group}</Text>
          </View>
          <View style={styles.summaryInfo}>
            <Text style={[styles.hospitalTitle, { color: colors.textPrimary }]}>
              {request.hospital_name}
            </Text>
            <Text style={[styles.unitsText, { color: colors.textSecondary }]}>
              {request.units_required} unit(s) required • {request.city}
            </Text>
          </View>
        </View>

        <View style={styles.badgeRow}>
          <Badge label={`Urgency: ${request.urgency}`} urgency={request.urgency} />
          {request.patient_reference && (
            <Text style={[styles.patientRef, { color: colors.textSecondary }]}>
              Ref: {request.patient_reference}
            </Text>
          )}
        </View>

        {request.medical_notes ? (
          <View
            style={[
              styles.notesBox,
              {
                backgroundColor: colors.card,
                borderColor: colors.borderLight,
              },
            ]}
          >
            <Text style={[styles.notesLabel, { color: colors.textMuted }]}>
              MEDICAL NOTES
            </Text>
            <Text style={[styles.notesContent, { color: colors.textPrimary }]}>
              {request.medical_notes}
            </Text>
          </View>
        ) : null}
      </Card>

      {/* Staff Actions Box */}
      {isStaffOrAdmin && !isCancelled && request.status !== RequestStatus.FULFILLED && (
        <Card style={styles.staffActionCard}>
          <Text style={[styles.staffCardTitle, { color: colors.textPrimary }]}>
            Staff & Clinical Controls
          </Text>
          <Text style={[styles.staffCardSubtitle, { color: colors.textSecondary }]}>
            Authorized transition actions for request ID #{request.id.slice(-6)}
          </Text>

          <View style={styles.actionGrid}>
            {request.status === RequestStatus.DRAFT && (
              <Button
                title="Submit for Verification"
                onPress={() =>
                  handleAction("Submitted", () => submitRequest(request.id))
                }
                loading={actionLoading}
                size="sm"
                style={styles.actionBtn}
              />
            )}

            {request.status === RequestStatus.PENDING_VERIFICATION && (
              <Button
                title="Verify Request"
                onPress={() =>
                  handleAction("Verified", () => verifyRequest(request.id))
                }
                loading={actionLoading}
                size="sm"
                style={styles.actionBtn}
              />
            )}

            {(request.status === RequestStatus.VERIFIED ||
              request.status === RequestStatus.MATCHING ||
              request.status === RequestStatus.DONORS_FOUND) && (
              <Button
                title="Run Matching Engine"
                onPress={() =>
                  handleAction("Matching Completed", () => runMatching(request.id))
                }
                loading={actionLoading}
                size="sm"
                style={styles.actionBtn}
              />
            )}

            {request.status === RequestStatus.DONORS_FOUND && (
              <Button
                title="Start Fulfillment"
                onPress={() =>
                  handleAction("Fulfillment Started", () =>
                    startFulfillment(request.id)
                  )
                }
                loading={actionLoading}
                size="sm"
                style={styles.actionBtn}
              />
            )}

            {request.status === RequestStatus.IN_PROGRESS && (
              <Button
                title="Mark Fulfilled"
                onPress={() =>
                  handleAction("Fulfilled", () => fulfillRequest(request.id))
                }
                loading={actionLoading}
                size="sm"
                style={styles.actionBtn}
              />
            )}

            <Button
              title="Cancel Request"
              variant="outline"
              onPress={() =>
                Alert.alert(
                  "Cancel Request",
                  "Are you sure you want to cancel this blood request?",
                  [
                    { text: "No" },
                    {
                      text: "Yes, Cancel",
                      style: "destructive",
                      onPress: () =>
                        handleAction("Cancelled", () => cancelRequest(request.id)),
                    },
                  ]
                )
              }
              loading={actionLoading}
              size="sm"
              style={styles.actionBtn}
            />
          </View>
        </Card>
      )}

      {/* Matched Donors Candidate List (if available) */}
      {matches.length > 0 && (
        <View style={styles.matchesSection}>
          <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
            Matched Donor Candidates ({matches.length})
          </Text>
          <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
            Privacy-safe ranking: no personal contact details or exact locations are exposed.
          </Text>

          {matches.map((match, idx) => (
            <Card key={idx} style={styles.matchCard}>
              <View style={styles.matchRow}>
                <View
                  style={[
                    styles.matchBadge,
                    { backgroundColor: colors.primaryLight },
                  ]}
                >
                  <Text style={[styles.matchBlood, { color: colors.primary }]}>
                    {match.blood_group}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.matchCity, { color: colors.textPrimary }]}>
                    Donor #{match.donor_id.slice(-6)} • {match.city}
                  </Text>
                  <Text style={[styles.matchScore, { color: colors.textSecondary }]}>
                    Compatibility Score: {match.score} pts
                  </Text>
                  {match.distance_km !== null && match.distance_km !== undefined && (
                    <Text style={[styles.matchDistance, { color: colors.primary }]}>
                      📍 {match.distance_km} km away
                      {match.eta_minutes ? ` • ~${match.eta_minutes} mins ETA` : ""}
                    </Text>
                  )}
                </View>

                <Badge
                  label={match.status}
                  status={match.status}
                  size="sm"
                />
              </View>
            </Card>
          ))}
        </View>
      )}

      {/* Vertical Lifecycle Stepper */}
      <View style={styles.timelineSection}>
        <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
          Request Lifecycle Tracker
        </Text>

        {isCancelled ? (
          <Card style={[styles.cancelledCard, { borderColor: colors.statusCancelled.border }]}>
            <Ionicons name="close-circle" size={32} color={colors.statusCancelled.text} />
            <Text style={[styles.cancelledTitle, { color: colors.statusCancelled.text }]}>
              Request Cancelled
            </Text>
            <Text style={[styles.cancelledDesc, { color: colors.textSecondary }]}>
              This request was closed and is no longer dispatching donor alerts.
            </Text>
          </Card>
        ) : (
          <View style={styles.stepsContainer}>
            {LIFECYCLE_STEPS.map((step, idx) => {
              const isPast = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              const isFuture = idx > currentStepIndex;

              const circleBg = isPast || isCurrent ? colors.primary : colors.border;
              const circleText = isPast || isCurrent ? "#FFFFFF" : colors.textMuted;
              const titleColor = isFuture ? colors.textMuted : colors.textPrimary;
              const descColor = isFuture ? colors.textMuted : colors.textSecondary;

              return (
                <View key={step.key} style={styles.timelineRow}>
                  {/* Step Icon Column */}
                  <View style={styles.lineCol}>
                    <View
                      style={[
                        styles.stepCircle,
                        {
                          backgroundColor: circleBg,
                          borderColor: isCurrent ? colors.primaryLight : "transparent",
                          borderWidth: isCurrent ? 4 : 0,
                        },
                      ]}
                    >
                      {isPast ? (
                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                      ) : (
                        <Text style={[styles.stepNumber, { color: circleText }]}>
                          {idx + 1}
                        </Text>
                      )}
                    </View>
                    {idx < LIFECYCLE_STEPS.length - 1 && (
                      <View
                        style={[
                          styles.verticalLine,
                          {
                            backgroundColor: isPast ? colors.primary : colors.border,
                          },
                        ]}
                      />
                    )}
                  </View>

                  {/* Step Description Column */}
                  <View style={styles.stepInfoCol}>
                    <View style={styles.stepHeaderRow}>
                      <Text style={[styles.stepTitle, { color: titleColor }]}>
                        {step.label}
                      </Text>
                      {isCurrent && (
                        <Badge label="CURRENT" status="in_progress" size="sm" />
                      )}
                    </View>
                    <Text style={[styles.stepDesc, { color: descColor }]}>
                      {step.desc}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
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
    padding: 24,
  },
  notFoundText: {
    fontSize: 18,
    fontWeight: "700",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  reqHeaderId: {
    fontSize: 14,
    fontWeight: "600",
  },
  summaryCard: {
    marginBottom: 20,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  bloodPill: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginRight: 14,
  },
  bloodPillText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  summaryInfo: {
    flex: 1,
  },
  hospitalTitle: {
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 2,
  },
  unitsText: {
    fontSize: 13,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  patientRef: {
    fontSize: 12,
    fontWeight: "600",
  },
  notesBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  notesLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  notesContent: {
    fontSize: 13,
    lineHeight: 18,
  },
  staffActionCard: {
    marginBottom: 20,
  },
  staffCardTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 2,
  },
  staffCardSubtitle: {
    fontSize: 12,
    marginBottom: 14,
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionBtn: {
    marginBottom: 6,
  },
  matchesSection: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 16,
  },
  matchCard: {
    marginBottom: 10,
    padding: 14,
  },
  matchRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  matchBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  matchBlood: {
    fontSize: 16,
    fontWeight: "800",
  },
  matchCity: {
    fontSize: 14,
    fontWeight: "700",
  },
  matchScore: {
    fontSize: 12,
    marginTop: 2,
  },
  matchDistance: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  timelineSection: {
    marginTop: 4,
  },
  cancelledCard: {
    alignItems: "center",
    padding: 24,
    borderWidth: 1.5,
    marginTop: 10,
  },
  cancelledTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 8,
    marginBottom: 4,
  },
  cancelledDesc: {
    fontSize: 13,
    textAlign: "center",
  },
  stepsContainer: {
    marginTop: 14,
  },
  timelineRow: {
    flexDirection: "row",
    minHeight: 64,
  },
  lineCol: {
    alignItems: "center",
    width: 32,
    marginRight: 14,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumber: {
    fontSize: 11,
    fontWeight: "700",
  },
  verticalLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  stepInfoCol: {
    flex: 1,
    paddingBottom: 16,
  },
  stepHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  stepDesc: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
});
