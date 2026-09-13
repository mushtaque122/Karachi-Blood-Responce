import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { BloodGroup, ALL_BLOOD_GROUPS } from "../../constants/enums";
import { searchDonors, DonorPublicOut } from "../../api/donors";
import { Input } from "../../components/common/Input";
import { Card } from "../../components/common/Card";
import { Badge } from "../../components/common/Badge";
import { Button } from "../../components/common/Button";

export const FindDonorsScreen: React.FC = () => {
  const { colors, isDark } = useTheme();

  const [selectedBloodGroup, setSelectedBloodGroup] = useState<BloodGroup | null>(null);
  const [searchCity, setSearchCity] = useState("");
  const [donors, setDonors] = useState<DonorPublicOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDonor, setSelectedDonor] = useState<DonorPublicOut | null>(null);

  const fetchDonors = useCallback(async () => {
    setLoading(true);
    try {
      const results = await searchDonors({
        blood_group: selectedBloodGroup || undefined,
        city: searchCity.trim() || undefined,
        // Karachi coordinates anchor for distance sorting: 24.8607, 67.0011
        near_lat: 24.8607,
        near_lng: 67.0011,
      });
      setDonors(results);
    } catch {
      // silent search fail
    } finally {
      setLoading(false);
    }
  }, [selectedBloodGroup, searchCity]);

  useEffect(() => {
    fetchDonors();
  }, [fetchDonors]);

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
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Find Donors Directory
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          Authorized clinical staff search engine (Karachi region)
        </Text>
      </View>

      {/* Search Input & Blood Filters */}
      <View style={styles.searchSection}>
        <Input
          placeholder="Filter by city (e.g. Karachi)..."
          value={searchCity}
          onChangeText={setSearchCity}
          onSubmitEditing={fetchDonors}
          leftIcon={<Ionicons name="search" size={18} color={colors.iconMuted} />}
          containerStyle={{ marginBottom: 10 }}
        />

        {/* Blood Group Chips Filter Row */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={ALL_BLOOD_GROUPS}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.filterChipsRow}
          renderItem={({ item }) => {
            const isSelected = selectedBloodGroup === item;
            return (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() =>
                  setSelectedBloodGroup(isSelected ? null : item)
                }
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected
                      ? colors.primary
                      : isDark
                      ? "#242424"
                      : "#FFFFFF",
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: isSelected ? "#FFFFFF" : colors.textPrimary,
                      fontWeight: isSelected ? "800" : "600",
                    },
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Donors List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={donors}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Card style={styles.emptyCard}>
              <Ionicons name="people-outline" size={40} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                No Donors Found
              </Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                No verified available donors matched your current filter criteria.
              </Text>
            </Card>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setSelectedDonor(item)}
            >
              <Card style={styles.donorCard}>
                <View style={styles.cardRow}>
                  <View
                    style={[
                      styles.bloodBadge,
                      { backgroundColor: colors.primaryLight },
                    ]}
                  >
                    <Text style={[styles.bloodText, { color: colors.primary }]}>
                      {item.blood_group}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.donorId, { color: colors.textPrimary }]}>
                      Donor #{item.id.slice(-6)}
                    </Text>
                    <Text style={[styles.donorCity, { color: colors.textSecondary }]}>
                      📍 {item.city}
                      {item.distance_km !== null && item.distance_km !== undefined
                        ? ` • ~${item.distance_km} km`
                        : ""}
                    </Text>
                  </View>

                  <Badge
                    label={item.emergency_availability ? "EMERGENCY READY" : "AVAILABLE"}
                    status={item.emergency_availability ? "in_progress" : "verified"}
                    size="sm"
                  />
                </View>
              </Card>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Donor Detail Privacy-Safe Bottom Sheet Modal */}
      <Modal visible={!!selectedDonor} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.sheetCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.sheetHeader}>
              <View
                style={[
                  styles.sheetBloodBadge,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Text style={styles.sheetBloodText}>
                  {selectedDonor?.blood_group}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
                  Donor #{selectedDonor?.id.slice(-6)}
                </Text>
                <Text style={[styles.sheetSub, { color: colors.textSecondary }]}>
                  Verified Donor Profile
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedDonor(null)}>
                <Ionicons name="close-circle" size={26} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.detailGrid}>
              <View style={styles.detailRow}>
                <Text style={[styles.detailKey, { color: colors.textMuted }]}>
                  LOCATION:
                </Text>
                <Text style={[styles.detailVal, { color: colors.textPrimary }]}>
                  {selectedDonor?.city}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={[styles.detailKey, { color: colors.textMuted }]}>
                  DISTANCE:
                </Text>
                <Text style={[styles.detailVal, { color: colors.textPrimary }]}>
                  {selectedDonor?.distance_km !== null &&
                  selectedDonor?.distance_km !== undefined
                    ? `${selectedDonor.distance_km} km (Approximate)`
                    : "Not computed"}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={[styles.detailKey, { color: colors.textMuted }]}>
                  STATUS:
                </Text>
                <Badge
                  label={selectedDonor?.verification_status || "PENDING"}
                  status={selectedDonor?.verification_status}
                  size="sm"
                />
              </View>

              <View style={styles.detailRow}>
                <Text style={[styles.detailKey, { color: colors.textMuted }]}>
                  EMERGENCY READY:
                </Text>
                <Text
                  style={[
                    styles.detailVal,
                    {
                      color: selectedDonor?.emergency_availability
                        ? colors.primary
                        : colors.textSecondary,
                    },
                  ]}
                >
                  {selectedDonor?.emergency_availability ? "Yes" : "No"}
                </Text>
              </View>

              <View
                style={[
                  styles.privacyNote,
                  {
                    backgroundColor: colors.cardSecondary,
                    borderColor: colors.borderLight,
                  },
                ]}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={16}
                  color={colors.primary}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.privacyNoteText, { color: colors.textSecondary }]}>
                  Donor privacy protected: contact numbers and GPS coordinates are
                  never disclosed. Dispatch requests directly via matching.
                </Text>
              </View>
            </View>

            <Button
              title="Close"
              onPress={() => setSelectedDonor(null)}
              size="md"
              style={{ width: "100%", marginTop: 14 }}
            />
          </View>
        </View>
      </Modal>
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
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  searchSection: {
    padding: 16,
    paddingBottom: 8,
  },
  filterChipsRow: {
    paddingVertical: 4,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  filterChipText: {
    fontSize: 14,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyCard: {
    alignItems: "center",
    padding: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 10,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    textAlign: "center",
  },
  donorCard: {
    marginBottom: 10,
    padding: 14,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  bloodBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  bloodText: {
    fontSize: 17,
    fontWeight: "900",
  },
  donorId: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  donorCity: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheetCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: 24,
    paddingBottom: 40,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  sheetBloodBadge: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetBloodText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  sheetSub: {
    fontSize: 12,
  },
  detailGrid: {
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  detailKey: {
    fontSize: 11,
    fontWeight: "700",
  },
  detailVal: {
    fontSize: 14,
    fontWeight: "600",
  },
  privacyNote: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    marginTop: 14,
  },
  privacyNoteText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
});
