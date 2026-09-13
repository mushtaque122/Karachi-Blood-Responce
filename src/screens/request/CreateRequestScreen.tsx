import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../types/navigation";
import { useTheme } from "../../context/ThemeContext";
import { BloodGroup, Urgency } from "../../constants/enums";
import { createRequest, submitRequest } from "../../api/requests";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { BloodGroupGrid } from "../../components/blood/BloodGroupGrid";
import { UrgencySelector } from "../../components/blood/UrgencySelector";
import { Card } from "../../components/common/Card";
import { getApiErrorMessage } from "../../api/client";

export const CreateRequestScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors, isDark } = useTheme();

  // Form states
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>(BloodGroup.O_POS);
  const [unitsRequired, setUnitsRequired] = useState(2);
  const [urgency, setUrgency] = useState<Urgency>(Urgency.URGENT);
  const [hospitalName, setHospitalName] = useState("");
  const [patientReference, setPatientReference] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [city, setCity] = useState("Karachi");
  const [medicalNotes, setMedicalNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Success Modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!hospitalName.trim() || hospitalName.trim().length < 2) {
      nextErrors.hospitalName = "Hospital name is required";
    }
    if (!contactPhone.trim() || contactPhone.trim().length < 7) {
      nextErrors.contactPhone = "Valid contact phone is required (min 7 digits)";
    }
    if (!city.trim() || city.trim().length < 2) {
      nextErrors.city = "City is required";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const created = await createRequest({
        blood_group: bloodGroup,
        units_required: unitsRequired,
        urgency,
        hospital_name: hospitalName.trim(),
        patient_reference: patientReference.trim() || undefined,
        contact_phone: contactPhone.trim(),
        city: city.trim(),
        medical_notes: medicalNotes.trim() || undefined,
      });

      setCreatedRequestId(created.id);
      setShowSuccessModal(true);
    } catch (err) {
      const msg = getApiErrorMessage(err);
      Alert.alert("Submission Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForVerification = async () => {
    if (!createdRequestId) return;
    try {
      await submitRequest(createdRequestId);
      setShowSuccessModal(false);
      navigation.replace("RequestDetail", { requestId: createdRequestId });
    } catch (err) {
      setShowSuccessModal(false);
      const msg = getApiErrorMessage(err);
      Alert.alert("Verification Notice", msg);
      navigation.replace("RequestDetail", { requestId: createdRequestId });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Create Blood Request
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Submit a requisition to initiate donor matching across Karachi
          </Text>
        </View>

        {/* Blood Group Grid Picker */}
        <View style={styles.sectionBox}>
          <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
            Required Blood Group
          </Text>
          <BloodGroupGrid selected={bloodGroup} onSelect={setBloodGroup} />
        </View>

        {/* Units Stepper Card */}
        <Card style={styles.stepperCard}>
          <View style={styles.stepperRow}>
            <View>
              <Text style={[styles.stepperTitle, { color: colors.textPrimary }]}>
                Units Required
              </Text>
              <Text style={[styles.stepperSubtitle, { color: colors.textSecondary }]}>
                Bags of whole blood / PRBC (1 - 20)
              </Text>
            </View>

            <View style={styles.counterBox}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setUnitsRequired((u) => Math.max(1, u - 1))}
                style={[
                  styles.counterBtn,
                  {
                    backgroundColor: colors.cardSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons name="remove" size={20} color={colors.primary} />
              </TouchableOpacity>

              <Text style={[styles.counterValue, { color: colors.textPrimary }]}>
                {unitsRequired}
              </Text>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setUnitsRequired((u) => Math.min(20, u + 1))}
                style={[
                  styles.counterBtn,
                  {
                    backgroundColor: colors.cardSecondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons name="add" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        {/* Urgency Selector */}
        <View style={styles.sectionBox}>
          <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
            Urgency Level
          </Text>
          <UrgencySelector value={urgency} onChange={setUrgency} />
        </View>

        {/* Hospital & Contact Inputs */}
        <Input
          label="Hospital Name"
          placeholder="e.g. Aga Khan University Hospital, Liaquat National"
          value={hospitalName}
          onChangeText={setHospitalName}
          error={errors.hospitalName}
          leftIcon={
            <Ionicons name="business-outline" size={18} color={colors.iconMuted} />
          }
        />

        <Input
          label="City"
          placeholder="Karachi"
          value={city}
          onChangeText={setCity}
          error={errors.city}
          leftIcon={
            <Ionicons name="location-outline" size={18} color={colors.iconMuted} />
          }
        />

        <Input
          label="Contact Phone"
          placeholder="03001234567"
          keyboardType="phone-pad"
          value={contactPhone}
          onChangeText={setContactPhone}
          error={errors.contactPhone}
          leftIcon={
            <Ionicons name="call-outline" size={18} color={colors.iconMuted} />
          }
        />

        <Input
          label="Patient Reference / Bed / MR # (Optional)"
          placeholder="e.g. Ward 4, Bed 12"
          value={patientReference}
          onChangeText={setPatientReference}
          leftIcon={
            <Ionicons name="bed-outline" size={18} color={colors.iconMuted} />
          }
        />

        <Input
          label="Medical Notes / Reason (Optional)"
          placeholder="e.g. Scheduled coronary bypass surgery tomorrow morning"
          multiline
          numberOfLines={3}
          value={medicalNotes}
          onChangeText={setMedicalNotes}
          inputStyle={{ minHeight: 70, textAlignVertical: "top" }}
        />

        <Button
          title="Submit Blood Request"
          onPress={handleSubmit}
          loading={loading}
          size="lg"
          style={styles.submitButton}
        />
      </ScrollView>

      {/* Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <LottieView
              source={require("../../../assets/animations/success.json")}
              autoPlay
              loop={false}
              style={styles.successLottie}
            />

            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Request Created as Draft!
            </Text>
            <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
              Your blood request has been recorded. Would you like to submit it
              immediately for hospital/staff verification?
            </Text>

            <Button
              title="Submit for Verification Now"
              onPress={handleSubmitForVerification}
              size="lg"
              style={{ width: "100%", marginBottom: 10 }}
            />

            <Button
              title="Keep as Draft"
              variant="outline"
              onPress={() => {
                setShowSuccessModal(false);
                if (createdRequestId) {
                  navigation.replace("RequestDetail", { requestId: createdRequestId });
                }
              }}
              style={{ width: "100%" }}
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
  scrollContent: {
    padding: 24,
    paddingTop: 54,
    paddingBottom: 40,
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
    lineHeight: 18,
  },
  sectionBox: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  stepperCard: {
    marginBottom: 16,
    padding: 16,
  },
  stepperRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stepperTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  stepperSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  counterBox: {
    flexDirection: "row",
    alignItems: "center",
  },
  counterBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  counterValue: {
    fontSize: 18,
    fontWeight: "800",
    marginHorizontal: 14,
  },
  submitButton: {
    marginTop: 10,
    marginBottom: 24,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  successLottie: {
    width: 120,
    height: 120,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: 8,
    marginBottom: 8,
    textAlign: "center",
  },
  modalDesc: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 20,
  },
});
