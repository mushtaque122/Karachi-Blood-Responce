import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../context/ThemeContext";
import { BloodGroup } from "../../constants/enums";
import {
  getMyDonorProfile,
  createMyDonorProfile,
  updateMyDonorProfile,
  DonorProfileOut,
} from "../../api/donors";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { Card } from "../../components/common/Card";
import { BloodGroupGrid } from "../../components/blood/BloodGroupGrid";
import { getApiErrorMessage } from "../../api/client";

export const DonorProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();

  const [existingProfile, setExistingProfile] = useState<DonorProfileOut | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>(BloodGroup.O_POS);
  const [city, setCity] = useState("Karachi");
  const [phone, setPhone] = useState("");
  const [lastDonationDate, setLastDonationDate] = useState("");
  const [emergencyAvailability, setEmergencyAvailability] = useState(true);
  const [preferredHospitals, setPreferredHospitals] = useState("Aga Khan, Indus Hospital");

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const profile = await getMyDonorProfile();
        setExistingProfile(profile);
        setBloodGroup(profile.blood_group);
        setCity(profile.city);
        setPhone(profile.phone);
        if (profile.last_donation_date) {
          setLastDonationDate(profile.last_donation_date);
        }
        setEmergencyAvailability(profile.emergency_availability);
        if (profile.preferred_hospitals?.length) {
          setPreferredHospitals(profile.preferred_hospitals.join(", "));
        }
      } catch (err: any) {
        // 404 means no profile yet
      } finally {
        setLoadingInitial(false);
      }
    })();
  }, []);

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!city.trim() || city.trim().length < 2) {
      nextErrors.city = "City must be at least 2 characters";
    }
    if (!phone.trim() || phone.trim().length < 7) {
      nextErrors.phone = "Phone must be at least 7 characters (e.g. 03001234567)";
    }
    if (lastDonationDate.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(lastDonationDate.trim())) {
      nextErrors.lastDonationDate = "Format must be YYYY-MM-DD (e.g. 2026-06-15)";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSubmitting(true);
    try {
      const hospitalList = preferredHospitals
        .split(",")
        .map((h) => h.trim())
        .filter(Boolean);

      if (existingProfile) {
        // Update
        const updated = await updateMyDonorProfile({
          city: city.trim(),
          phone: phone.trim(),
          emergency_availability: emergencyAvailability,
          last_donation_date: lastDonationDate.trim() || undefined,
          preferred_hospitals: hospitalList,
        });
        setExistingProfile(updated);
        Alert.alert("Profile Updated", "Your donor profile details have been saved.");
      } else {
        // Create
        const created = await createMyDonorProfile({
          blood_group: bloodGroup,
          city: city.trim(),
          phone: phone.trim(),
          emergency_availability: emergencyAvailability,
          last_donation_date: lastDonationDate.trim() || undefined,
          preferred_hospitals: hospitalList,
        });
        setExistingProfile(created);
        Alert.alert("Profile Created", "You are now registered as an active donor!");
      }
      navigation.goBack();
    } catch (err) {
      const msg = getApiErrorMessage(err);
      Alert.alert("Failed to save profile", msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar Placeholder */}
      <View style={styles.avatarSection}>
        <View
          style={[
            styles.avatarCircle,
            {
              backgroundColor: colors.cardSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="person" size={50} color={colors.primary} />
          <View
            style={[
              styles.avatarCameraBadge,
              { backgroundColor: colors.primary },
            ]}
          >
            <Ionicons name="camera" size={14} color="#FFFFFF" />
          </View>
        </View>
        <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>
          {existingProfile ? "Edit Donor Profile" : "Register as Donor"}
        </Text>
        <Text style={[styles.screenSubtitle, { color: colors.textSecondary }]}>
          Help hospitals and patients identify compatible matches fast
        </Text>
      </View>

      {/* Blood Group Grid Selector */}
      <View style={styles.fieldSection}>
        <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
          Select Your Blood Group
        </Text>
        <Text style={[styles.sectionHelper, { color: colors.textSecondary }]}>
          Transfusion safety requires exact grouping
        </Text>
        <BloodGroupGrid
          selected={bloodGroup}
          onSelect={setBloodGroup}
          disabled={!!existingProfile} // Blood group is immutable after creation
        />
        {existingProfile && (
          <Text style={[styles.immutableNotice, { color: colors.textMuted }]}>
            Blood group cannot be modified once set. Contact support for re-verification.
          </Text>
        )}
      </View>

      {/* Form Inputs */}
      <Input
        label="City"
        placeholder="Karachi"
        value={city}
        onChangeText={setCity}
        error={errors.city}
        leftIcon={<Ionicons name="location-outline" size={18} color={colors.iconMuted} />}
      />

      <Input
        label="Contact Phone"
        placeholder="03001234567"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        error={errors.phone}
        helperText="Kept strictly confidential; never exposed in public searches."
        leftIcon={<Ionicons name="call-outline" size={18} color={colors.iconMuted} />}
      />

      <Input
        label="Last Donation Date (Optional)"
        placeholder="YYYY-MM-DD (e.g. 2026-05-10)"
        value={lastDonationDate}
        onChangeText={setLastDonationDate}
        error={errors.lastDonationDate}
        helperText="Used to compute medical eligibility (56-day donation interval)."
        leftIcon={<Ionicons name="calendar-outline" size={18} color={colors.iconMuted} />}
      />

      <Input
        label="Preferred Hospitals / Areas"
        placeholder="e.g. Aga Khan, Indus Hospital, Civil Hospital"
        value={preferredHospitals}
        onChangeText={setPreferredHospitals}
        helperText="Comma-separated list of nearby institutions you can reach easily."
        leftIcon={<Ionicons name="business-outline" size={18} color={colors.iconMuted} />}
      />

      {/* Emergency Availability Toggle Card */}
      <Card style={styles.toggleCard}>
        <View style={styles.toggleRow}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={[styles.toggleTitle, { color: colors.textPrimary }]}>
              Emergency / Critical Availability
            </Text>
            <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>
              Accept high-priority notifications for emergency surgeries & trauma alerts.
            </Text>
          </View>
          <Switch
            value={emergencyAvailability}
            onValueChange={setEmergencyAvailability}
            trackColor={{
              false: colors.switchTrackOff,
              true: colors.switchTrackOn,
            }}
            thumbColor={colors.switchThumb}
          />
        </View>
      </Card>

      {/* Action Button */}
      <Button
        title={existingProfile ? "Save Profile Changes" : "Create Donor Profile"}
        onPress={handleSave}
        loading={submitting}
        size="lg"
        style={styles.saveButton}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 54,
    paddingBottom: 48,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 28,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    marginBottom: 14,
    position: "relative",
  },
  avatarCameraBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 13,
    textAlign: "center",
  },
  fieldSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  sectionHelper: {
    fontSize: 12,
    marginBottom: 8,
  },
  immutableNotice: {
    fontSize: 11,
    fontStyle: "italic",
    marginTop: 4,
  },
  toggleCard: {
    marginVertical: 12,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  toggleDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  saveButton: {
    marginTop: 16,
  },
});
