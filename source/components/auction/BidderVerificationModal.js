/* eslint-disable prettier/prettier */
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  ToastAndroid,
  DeviceEventEmitter,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { launchImageLibrary } from "react-native-image-picker";
import {
  API_BASE,
  getActiveApiBase,
  getCandidateBases,
} from "../../resources/data/Constants";

const showMessage = (msg) => {
  if (Platform.OS === "android") ToastAndroid.show(msg, ToastAndroid.SHORT);
  else Alert.alert("", msg);
};

export default function BidderVerificationModal({
  visible,
  onClose,
  onSuccess,
  user,
  token,
  bidderProfile,
}) {
  const [settings, setSettings] = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [formValues, setFormValues] = useState({});
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [docFileName, setDocFileName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [acceptRules, setAcceptRules] = useState(false);
  const [activeToken, setActiveToken] = useState(token || null);

  const getCandidates = useCallback(() => {
    const active = getActiveApiBase();
    const candidateList = getCandidateBases();
    return [
      active,
      ...candidateList,
      API_BASE,
      "http://localhost:5000/api",
      "http://127.0.0.1:5000/api",
      "http://10.0.2.2:5000/api",
      "http://192.168.1.9:5000/api",
    ].filter(Boolean);
  }, []);

  const safeFetch = useCallback(async (endpoint, options = {}, timeoutMs = 6000) => {
    const candidates = [...new Set(getCandidates())];
    let lastRes = null;
    for (const base of candidates) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        const cleanBase = base.replace(/\/$/, "");
        const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
        const res = await fetch(`${cleanBase}${cleanEndpoint}`, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (res && res.ok) return res;
        if (res && res.status < 500) {
          lastRes = res;
          if (res.status === 404) continue;
          return res;
        }
      } catch (e) {
        // next candidate
      }
    }
    return lastRes;
  }, [getCandidates]);

  // Load active token & settings when opened
  useEffect(() => {
    if (!visible) return;

    const init = async () => {
      let t = token;
      if (!t) {
        t = await AsyncStorage.getItem("userToken");
        if (!t) {
          try {
            const rawUser = await AsyncStorage.getItem("userInfo");
            if (rawUser) {
              const parsed = JSON.parse(rawUser);
              t = parsed?.token || null;
            }
          } catch (e) {}
        }
      }
      setActiveToken(t);

      // Fetch dynamic admin settings from /settings/public
      setLoadingSettings(true);
      try {
        const res = await safeFetch("/settings/public", {}, 5000);
        if (res && res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch (err) {
        console.log("Error loading public settings in verification modal:", err);
      } finally {
        setLoadingSettings(false);
      }
    };

    init();
  }, [visible, token, safeFetch]);

  // Initialize form values from user, bidderProfile, and admin settings
  useEffect(() => {
    if (!visible) return;

    let dobVal = "";
    if (bidderProfile?.dateOfBirth) {
      try {
        dobVal = new Date(bidderProfile.dateOfBirth).toISOString().split("T")[0];
      } catch (e) {}
    } else if (user?.dateOfBirth) {
      try {
        dobVal = new Date(user.dateOfBirth).toISOString().split("T")[0];
      } catch (e) {}
    }

    const defaultIdTypes = settings?.bidderKycIdTypes || ["National ID", "Passport", "Driver License"];
    const initialValues = {
      legalFullName: bidderProfile?.legalFullName || user?.name || "",
      dateOfBirth: dobVal,
      idType: bidderProfile?.idType || defaultIdTypes[0] || "National ID",
      idNumber: bidderProfile?.idNumber || user?.idNumber || "",
      idDocumentUrl: bidderProfile?.idDocumentUrl || user?.idDocumentUrl || "",
      proofOfResidenceUrl: bidderProfile?.proofOfResidenceUrl || "",
      phone: user?.phone || user?.phoneNumber || "",
      ...(bidderProfile?.customKycValues || {}),
    };

    setFormValues((prev) => ({
      ...initialValues,
      ...prev,
    }));

    if (bidderProfile?.idDocumentUrl || user?.idDocumentUrl) {
      setDocFileName("Official_ID_Document.jpg");
    }
  }, [visible, user, bidderProfile, settings]);

  const minAge = settings?.bidderKycMinAge !== undefined ? settings.bidderKycMinAge : 18;
  const requireDoc = settings?.bidderKycRequireDocumentUpload !== false;
  const availableIdTypes = useMemo(() => {
    if (Array.isArray(settings?.bidderKycIdTypes) && settings.bidderKycIdTypes.length > 0) {
      return settings.bidderKycIdTypes;
    }
    return ["National ID", "Passport", "Driver License"];
  }, [settings]);

  // Dynamic admin-configured fields
  const activeFields = useMemo(() => {
    if (Array.isArray(settings?.bidderKycFields) && settings.bidderKycFields.length > 0) {
      return settings.bidderKycFields.filter((f) => f.enabled !== false);
    }
    return [
      {
        id: "legalFullName",
        key: "legalFullName",
        label: "Full Legal Name",
        type: "text",
        placeholder: "As printed on your official document",
        required: true,
        helpText: "Official name for CPA compliance & bidding certificate",
      },
      {
        id: "idType",
        key: "idType",
        label: "Identification Document Type",
        type: "select",
        options: availableIdTypes,
        required: true,
      },
      {
        id: "idNumber",
        key: "idNumber",
        label: "ID / Passport Number",
        type: "text",
        placeholder: "e.g. 9205125089087 or A12345678",
        required: true,
      },
      {
        id: "dateOfBirth",
        key: "dateOfBirth",
        label: "Date of Birth (YYYY-MM-DD)",
        type: "date",
        placeholder: "YYYY-MM-DD",
        required: true,
      },
      {
        id: "idDocumentUrl",
        key: "idDocumentUrl",
        label: "Passport or ID Document Photo",
        type: "file",
        required: requireDoc,
      },
    ];
  }, [settings, availableIdTypes, requireDoc]);

  // Real-time Age Calculation
  const calculatedAge = useMemo(() => {
    const dob = formValues.dateOfBirth || formValues.dob || "";
    if (!dob) return null;
    const b = new Date(dob);
    if (isNaN(b.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - b.getFullYear();
    const m = today.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < b.getDate())) {
      age--;
    }
    return age;
  }, [formValues.dateOfBirth, formValues.dob]);

  const handleFieldChange = (key, val) => {
    setFormValues((prev) => {
      const next = { ...prev, [key]: val };
      // Auto-extract DOB if South African 13-digit National ID
      if (key === "idNumber" && (next.idType === "National ID" || next.idType === "national_id")) {
        const clean = String(val).replace(/\D/g, "");
        if (clean.length >= 6) {
          const yy = parseInt(clean.substring(0, 2), 10);
          const mm = clean.substring(2, 4);
          const dd = clean.substring(4, 6);
          const monthNum = parseInt(mm, 10);
          const dayNum = parseInt(dd, 10);
          if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
            const currentYear = new Date().getFullYear();
            const currentYY = currentYear % 100;
            const fullYear = yy <= currentYY ? 2000 + yy : 1900 + yy;
            const computedAge = currentYear - fullYear;
            if (computedAge >= 18 && computedAge <= 110) {
              next.dateOfBirth = `${fullYear}-${mm}-${dd}`;
            }
          }
        }
      }
      return next;
    });
  };

  // Pick and upload official ID document via react-native-image-picker
  const handlePickDocument = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: "photo",
        quality: 0.8,
        includeBase64: true,
      });

      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const fileName = asset.fileName || "official_id_document.jpg";
      setDocFileName(fileName);
      setIsUploadingDoc(true);

      // 1. Attempt multipart upload
      try {
        const formData = new FormData();
        formData.append("document", {
          uri: asset.uri,
          type: asset.type || "image/jpeg",
          name: fileName,
        });

        const uploadRes = await safeFetch(
          "/checkout/upload-guest-document",
          {
            method: "POST",
            body: formData,
          },
          10000
        );

        if (uploadRes && uploadRes.ok) {
          const upData = await uploadRes.json();
          if (upData && upData.url) {
            handleFieldChange("idDocumentUrl", upData.url);
            showMessage("✓ Document attached and encrypted successfully.");
            setIsUploadingDoc(false);
            return;
          }
        }
      } catch (mpErr) {
        console.log("Multipart upload fallback:", mpErr?.message || mpErr);
      }

      // 2. Base64 fallback upload
      if (asset.base64) {
        try {
          const base64Data = `data:${asset.type || "image/jpeg"};base64,${asset.base64}`;
          const b64Res = await safeFetch(
            "/checkout/upload-guest-document",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ documentBase64: base64Data }),
            },
            12000
          );

          if (b64Res && b64Res.ok) {
            const b64Data = await b64Res.json();
            if (b64Data && b64Data.url) {
              handleFieldChange("idDocumentUrl", b64Data.url);
              showMessage("✓ Document attached and encrypted successfully.");
              setIsUploadingDoc(false);
              return;
            }
          }
        } catch (b64Err) {
          console.log("Base64 upload error:", b64Err?.message || b64Err);
        }
      }

      showMessage("Failed to upload document. Please retry with a clear photo.");
    } catch (err) {
      console.log("Image picker error:", err);
      showMessage("Error picking document.");
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleSubmit = async () => {
    const legalName = formValues.legalFullName || formValues.fullName || "";
    const idNum = (formValues.idNumber || "").trim();
    const dob = (formValues.dateOfBirth || "").trim();
    const docUrl = formValues.idDocumentUrl || "";

    if (!legalName.trim()) {
      Alert.alert("Missing Information", "Please enter your full legal name.");
      return;
    }

    if (!idNum) {
      Alert.alert("Missing Information", "Please enter your official ID or Passport number.");
      return;
    }

    if (!dob) {
      Alert.alert("Missing Information", "Please enter your date of birth (YYYY-MM-DD).");
      return;
    }

    if (calculatedAge !== null && calculatedAge < minAge) {
      Alert.alert(
        "Age Qualification Restricted",
        `Under South African liquor and auction regulations, you must be at least ${minAge} years of age.`
      );
      return;
    }

    if (requireDoc && !docUrl) {
      Alert.alert(
        "Document Attachment Required",
        "Please attach a clear photo of your official ID or passport for legal compliance verification."
      );
      return;
    }

    if (!acceptRules) {
      Alert.alert(
        "Legal Acceptance Required",
        "Please confirm that you are at least 18+ and accept the compliance terms."
      );
      return;
    }

    setSubmitting(true);
    try {
      const tokenToUse = activeToken || (await AsyncStorage.getItem("userToken"));
      const headers = { "Content-Type": "application/json" };
      if (tokenToUse) headers.Authorization = `Bearer ${tokenToUse}`;

      // Separate core vs custom dynamic fields
      const coreKeys = [
        "legalFullName",
        "fullName",
        "dateOfBirth",
        "dob",
        "idType",
        "idNumber",
        "idDocumentUrl",
        "proofOfResidenceUrl",
        "phone",
      ];
      const customKycValues = {};
      Object.keys(formValues).forEach((k) => {
        if (!coreKeys.includes(k)) {
          customKycValues[k] = formValues[k];
        }
      });

      const payload = {
        legalFullName: legalName.trim(),
        dateOfBirth: dob,
        idType: formValues.idType || "National ID",
        idNumber: idNum,
        idDocumentUrl: docUrl,
        proofOfResidenceUrl: formValues.proofOfResidenceUrl || "",
        customKycValues,
        acceptRulesVersion: "v1.0",
        phone: formValues.phone || user?.phone || "",
      };

      const res = await safeFetch("/auction/bidder/verify", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (res && res.ok) {
        const data = await res.json().catch(() => ({}));

        // Synchronize local session so all screens immediately recognize verification
        await AsyncStorage.setItem("isAgeVerified", "true");
        await AsyncStorage.setItem("grand-store-age-verified", "true");

        try {
          const storedUserRaw = await AsyncStorage.getItem("userInfo");
          if (storedUserRaw) {
            const parsedUser = JSON.parse(storedUserRaw);
            const updatedUser = {
              ...parsedUser,
              isAgeVerified: true,
              dateOfBirth: dob,
              idType: formValues.idType,
              idNumber: idNum,
              idDocumentUrl: docUrl,
              bidderApprovalStatus: data?.bidderApprovalStatus || "pending_approval",
              bidderNumber: data?.bidderNumber || parsedUser?.bidderNumber,
            };
            await AsyncStorage.setItem("userInfo", JSON.stringify(updatedUser));
          }
        } catch (e) {}

        // Emit global event across app
        DeviceEventEmitter.emit("userAgeVerified", {
          isAgeVerified: true,
          bidderApprovalStatus: data?.bidderApprovalStatus || "pending_approval",
        });

        Alert.alert(
          "18+ Verification Submitted",
          "Your legal identification has been submitted for compliance approval. Store purchases are pre-cleared and auction bidding will activate upon clearance.",
          [{ text: "Continue", onPress: () => onClose() }]
        );

        if (onSuccess) {
          onSuccess(data);
        }
        onClose();
      } else {
        const err = res ? await res.json().catch(() => ({})) : {};
        Alert.alert("Verification Failed", err.message || "Could not submit verification at this time.");
      }
    } catch (err) {
      console.log("Verification submit error:", err);
      Alert.alert("Network Error", "Could not connect to verification server. Please retry.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.goldShieldBadge}>
                <Text style={styles.goldShieldText}>18+</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.modalTitle}>
                  {minAge}+ Legal Age & Identity Verification
                </Text>
                <Text style={styles.modalSubtitle}>
                  Dual compliance for Store Wine/Spirits and Live Auctions
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Legal Notice */}
            <View style={styles.complianceNotice}>
              <Text style={styles.complianceNoticeIcon}>⚖️</Text>
              <Text style={styles.complianceNoticeText}>
                Under the South African National Liquor Act & Consumer Protection Act, all spirit purchases and live auction participation require verified adult identification ({minAge}+). Verify once to unlock permanent pre-cleared checkout.
              </Text>
            </View>

            {loadingSettings && (
              <View style={styles.loadingSettingsWrap}>
                <ActivityIndicator size="small" color="#c99742" />
                <Text style={styles.loadingSettingsText}>Loading admin compliance fields...</Text>
              </View>
            )}

            {/* Document Type Selector (Admin dynamic options) */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>OFFICIAL ID DOCUMENT TYPE *</Text>
              <View style={styles.typeOptionRow}>
                {availableIdTypes.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.typeOptionBtn,
                      formValues.idType === t && styles.typeOptionBtnActive,
                    ]}
                    onPress={() => handleFieldChange("idType", t)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.typeOptionText,
                        formValues.idType === t && styles.typeOptionTextActive,
                      ]}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Full Legal Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>FULL LEGAL NAME *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="As printed on official identification"
                placeholderTextColor="#555"
                value={formValues.legalFullName || formValues.fullName || ""}
                onChangeText={(v) => handleFieldChange("legalFullName", v)}
              />
            </View>

            {/* ID / Passport Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>
                {formValues.idType === "Passport"
                  ? "PASSPORT NUMBER *"
                  : formValues.idType === "National ID"
                  ? "SA 13-DIGIT NATIONAL ID NUMBER *"
                  : "OFFICIAL DOCUMENT NUMBER *"}
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder={
                  formValues.idType === "National ID"
                    ? "e.g. 9205125089087"
                    : "e.g. A12345678"
                }
                placeholderTextColor="#555"
                value={formValues.idNumber || ""}
                onChangeText={(v) => handleFieldChange("idNumber", v)}
                autoCapitalize="characters"
              />
              {formValues.idType === "National ID" && (
                <Text style={styles.helperText}>
                  💡 South African ID number automatically validates your Date of Birth.
                </Text>
              )}
            </View>

            {/* Date of Birth & Live Age Feedback */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.fieldLabel}>DATE OF BIRTH (YYYY-MM-DD) *</Text>
                {calculatedAge !== null && (
                  <Text
                    style={[
                      styles.ageFeedback,
                      calculatedAge >= minAge ? styles.ageFeedbackValid : styles.ageFeedbackInvalid,
                    ]}
                  >
                    {calculatedAge >= minAge
                      ? `✓ ${calculatedAge} yrs (Verified)`
                      : `✕ ${calculatedAge} yrs (Under ${minAge})`}
                  </Text>
                )}
              </View>
              <TextInput
                style={[
                  styles.textInput,
                  calculatedAge !== null && calculatedAge < minAge && styles.textInputError,
                ]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#555"
                value={formValues.dateOfBirth || ""}
                onChangeText={(v) => handleFieldChange("dateOfBirth", v)}
                keyboardType="numeric"
              />
            </View>

            {/* ID Document Photo Attachment */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>
                OFFICIAL ID DOCUMENT / PASSPORT PHOTO {requireDoc ? "*" : "(OPTIONAL)"}
              </Text>
              {isUploadingDoc ? (
                <View style={styles.uploadingBox}>
                  <ActivityIndicator size="small" color="#c99742" />
                  <Text style={styles.uploadingText}>Encrypting & uploading document securely...</Text>
                </View>
              ) : formValues.idDocumentUrl ? (
                <View style={styles.docAttachedBox}>
                  <View style={styles.docAttachedLeft}>
                    <Text style={styles.docAttachedCheck}>✓</Text>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.docAttachedTitle}>Official Document Attached</Text>
                      <Text style={styles.docAttachedName} numberOfLines={1}>
                        {docFileName || "Official_ID_Document.jpg"}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.reuploadBtn}
                    onPress={handlePickDocument}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.reuploadBtnText}>Change</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.uploadBtn}
                  onPress={handlePickDocument}
                  activeOpacity={0.8}
                >
                  <Text style={styles.uploadBtnIcon}>📷</Text>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.uploadBtnTitle}>Attach Official ID Photo</Text>
                    <Text style={styles.uploadBtnSub}>
                      Select clear photo or scan from gallery (JPG, PNG)
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>

            {/* Custom fields configured by admin in bidderKycFields */}
            {activeFields
              .filter(
                (f) =>
                  !["legalFullName", "fullName", "idType", "idNumber", "dateOfBirth", "idDocumentUrl"].includes(
                    f.key
                  )
              )
              .map((field) => (
                <View key={field.key} style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>
                    {field.label.toUpperCase()} {field.required ? "*" : "(OPTIONAL)"}
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder={field.placeholder || `Enter ${field.label}`}
                    placeholderTextColor="#555"
                    value={formValues[field.key] || ""}
                    onChangeText={(v) => handleFieldChange(field.key, v)}
                  />
                  {field.helpText ? (
                    <Text style={styles.helperText}>{field.helpText}</Text>
                  ) : null}
                </View>
              ))}

            {/* 18+ Certification & Legal Rules Acceptance */}
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setAcceptRules(!acceptRules)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, acceptRules && styles.checkboxChecked]}>
                {acceptRules && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>
                I certify under the South African National Liquor Act that I am at least {minAge} years of age, legally authorized to purchase fine spirits and bid on private reserve lots, and that the attached credentials belong to me.
              </Text>
            </TouchableOpacity>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <View style={styles.submittingWrap}>
                  <ActivityIndicator size="small" color="#000" />
                  <Text style={styles.submitBtnText}>Verifying Credentials...</Text>
                </View>
              ) : (
                <Text style={styles.submitBtnText}>
                  Submit {minAge}+ Verification Credentials →
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#110f0c",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.35)",
    maxHeight: "92%",
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  goldShieldBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(201, 151, 66, 0.15)",
    borderWidth: 1,
    borderColor: "#c99742",
    alignItems: "center",
    justifyContent: "center",
  },
  goldShieldText: {
    color: "#c99742",
    fontSize: 13,
    fontWeight: "900",
  },
  modalTitle: {
    color: "#f5edd8",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  modalSubtitle: {
    color: "rgba(245, 237, 216, 0.55)",
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
    marginLeft: 8,
  },
  closeBtnText: {
    color: "#aaa",
    fontSize: 18,
    fontWeight: "bold",
  },
  modalScroll: {
    paddingHorizontal: 20,
  },
  modalScrollContent: {
    paddingVertical: 16,
  },
  complianceNotice: {
    flexDirection: "row",
    backgroundColor: "rgba(201, 151, 66, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.25)",
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    alignItems: "flex-start",
  },
  complianceNoticeIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  complianceNoticeText: {
    flex: 1,
    color: "rgba(245, 237, 216, 0.8)",
    fontSize: 11.5,
    lineHeight: 16,
  },
  loadingSettingsWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  loadingSettingsText: {
    color: "#c99742",
    fontSize: 11,
    marginLeft: 8,
  },
  inputGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    color: "#d4af37",
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 6,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  ageFeedback: {
    fontSize: 11,
    fontWeight: "700",
  },
  ageFeedbackValid: {
    color: "#34d399",
  },
  ageFeedbackInvalid: {
    color: "#f87171",
  },
  textInput: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    color: "#fff",
    fontSize: 13,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textInputError: {
    borderColor: "#f87171",
  },
  helperText: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 10.5,
    marginTop: 4,
  },
  typeOptionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typeOptionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  typeOptionBtnActive: {
    borderColor: "#c99742",
    backgroundColor: "rgba(201, 151, 66, 0.2)",
  },
  typeOptionText: {
    color: "#888",
    fontSize: 11.5,
    fontWeight: "600",
  },
  typeOptionTextActive: {
    color: "#f5c242",
    fontWeight: "800",
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(201, 151, 66, 0.4)",
    borderRadius: 14,
    padding: 14,
  },
  uploadBtnIcon: {
    fontSize: 22,
  },
  uploadBtnTitle: {
    color: "#f5c242",
    fontSize: 12.5,
    fontWeight: "700",
  },
  uploadBtnSub: {
    color: "#888",
    fontSize: 10.5,
    marginTop: 2,
  },
  uploadingBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.3)",
    borderRadius: 12,
    padding: 14,
  },
  uploadingText: {
    color: "#c99742",
    fontSize: 11.5,
    marginLeft: 10,
  },
  docAttachedBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    borderRadius: 12,
    padding: 12,
  },
  docAttachedLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  docAttachedCheck: {
    color: "#34d399",
    fontSize: 16,
    fontWeight: "bold",
  },
  docAttachedTitle: {
    color: "#34d399",
    fontSize: 12,
    fontWeight: "700",
  },
  docAttachedName: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 10.5,
    marginTop: 1,
  },
  reuploadBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 8,
    marginLeft: 8,
  },
  reuploadBtnText: {
    color: "#34d399",
    fontSize: 11,
    fontWeight: "700",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 6,
    marginBottom: 20,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "rgba(201, 151, 66, 0.5)",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: "#c99742",
    borderColor: "#c99742",
  },
  checkmark: {
    color: "#000",
    fontSize: 12,
    fontWeight: "bold",
  },
  checkboxLabel: {
    flex: 1,
    color: "rgba(245, 237, 216, 0.75)",
    fontSize: 11,
    lineHeight: 16,
  },
  submitBtn: {
    backgroundColor: "#c99742",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#c99742",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submittingWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  submitBtnText: {
    color: "#000",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});
