/* eslint-disable prettier/prettier */
/* eslint-disable quotes */
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Clipboard,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { WebView } from "react-native-webview";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { launchImageLibrary } from "react-native-image-picker";
import AppHeader from "../../widgets/AppHeader";
import { API_BASE, getActiveServerHost } from "../../resources/data/Constants";

const { width } = Dimensions.get("window");

const API_CANDIDATES = [
  API_BASE,
  ...(__DEV__ ? [
    "http://localhost:5000/api",
    "http://192.168.1.9:5000/api",
    "http://10.0.2.2:5000/api",
  ] : []),
];

const resolveImage = (img) => {
  if (!img) return "https://images.unsplash.com/photo-1527281400683-1aae777175f8?auto=format&fit=crop&q=80&w=1000";
  if (img.startsWith("http")) return img;
  return `${getActiveServerHost()}/${img.replace(/^\//, "")}`;
};

export default function AuctionCheckout({ route, navigation }) {
  const { lotId, lot: initialLot } = route.params || {};

  const [lot, setLot] = useState(initialLot || null);
  const [loading, setLoading] = useState(!initialLot);
  const [processing, setProcessing] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  // Stepper: 1 = Delivery Address, 2 = Payment Method, 3 = Bank Transfer Submitted
  const [step, setStep] = useState(1);
  const [dynamicShipping, setDynamicShipping] = useState(250);

  // Address Form
  const [addressForm, setAddressForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    city: "Cape Town",
    postalCode: "8001",
    country: "South Africa",
  });

  // Payment Selection: 'payfast' | 'bank_transfer'
  const [paymentMethod, setPaymentMethod] = useState("payfast");
  const [proofUrl, setProofUrl] = useState("");
  const [proofFileName, setProofFileName] = useState("");
  const [uploadingProof, setUploadingProof] = useState(false);

  // PayFast In-App WebView Modal State
  const [payfastModalVisible, setPayfastModalVisible] = useState(false);
  const [payfastHtml, setPayfastHtml] = useState(null);

  // Dynamic Grand Store Escrow Bank Details (from /settings/public)
  const [storeBankDetails, setStoreBankDetails] = useState({
    bankName: "Standard Bank",
    accountName: "The Grand Store PTY LTD",
    accountNumber: "0123456789",
    branchCode: "051001",
    accountType: "Business Cheque",
    swiftCode: "SBZAJJ",
  });

  const safeFetch = async (endpoint, options = {}) => {
    for (const base of API_CANDIDATES) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 7000);
        const url = `${base.replace(/\/$/, "")}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
        const res = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timer);
        if (res) return res;
      } catch (err) {
        // try next
      }
    }
    return null;
  };

  const loadUser = async () => {
    try {
      const stored = await AsyncStorage.getItem("userInfo");
      const storedToken = await AsyncStorage.getItem("userToken");
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        const resolvedToken = parsed.token || storedToken || null;
        setToken(resolvedToken);
        const names = (parsed.name || "").split(" ");
        setAddressForm((prev) => ({
          ...prev,
          firstName: names[0] || "",
          lastName: names.slice(1).join(" ") || "",
          phone: parsed.phone || parsed.phoneNumber || "",
        }));
      } else if (storedToken) {
        setToken(storedToken);
      }
    } catch (e) {
      // ignore
    }
  };

  const fetchLot = async () => {
    const targetId = lotId || lot?._id;
    if (!targetId) return;
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await safeFetch(`/auction/${targetId}`, { headers });
      if (res && res.ok) {
        const data = await res.json();
        setLot(data.lot);
      }
    } catch (e) {
      console.log("Error loading lot:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await safeFetch("/settings/public");
        if (res && res.ok) {
          const data = await res.json();
          if (data?.bankDetails) {
            setStoreBankDetails(data.bankDetails);
          }
        }
      } catch (e) {}
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    fetchLot();
  }, [lotId, token]);

  // Financial calculations
  const hammerPrice = lot?.winningBid || lot?.currentBid || 0;
  const buyerPremium = lot?.buyerPremiumAmount || Math.round(hammerPrice * 0.05);
  const barCharge = lot?.barChargeAmount || Math.round(hammerPrice * 0.02);
  const vatAmount = lot?.vatAmount || Math.round(hammerPrice * 0.15);
  const total = hammerPrice + buyerPremium + barCharge + vatAmount + dynamicShipping;
  const paymentReference = `AUC-${lot?.lotNumber || lot?._id?.slice(-6)?.toUpperCase() || "LOT"}`;

  const handleContinueToPayment = () => {
    if (!addressForm.firstName || !addressForm.phone || !addressForm.address) {
      Alert.alert("Required Details", "Please fill in your recipient name, phone, and delivery address.");
      return;
    }
    if (addressForm.country.toLowerCase().includes("south africa")) {
      setDynamicShipping(250);
    } else {
      setDynamicShipping(1500);
    }
    setStep(2);
  };

  const handlePickReceipt = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: "photo",
        quality: 0.8,
      });

      if (result.didCancel || !result.assets || result.assets.length === 0) return;

      const asset = result.assets[0];
      setProofFileName(asset.fileName || "receipt_screenshot.jpg");
      setUploadingProof(true);

      const formData = new FormData();
      const fileData = {
        uri: Platform.OS === "android" ? asset.uri : asset.uri.replace("file://", ""),
        type: asset.type || "image/jpeg",
        name: asset.fileName || "receipt.jpg",
      };
      formData.append("file", fileData);
      formData.append("document", fileData);

      const res = await safeFetch("/vendor/upload-public", {
        method: "POST",
        body: formData,
      });

      if (res && res.ok) {
        const data = await res.json();
        const fullUrl = data.url?.startsWith("http") ? data.url : `${getActiveServerHost()}/${(data.url || "").replace(/^\//, "")}`;
        setProofUrl(fullUrl);
        Alert.alert("Uploaded", "Payment receipt screenshot attached successfully.");
      } else {
        Alert.alert("Upload Issue", "Could not upload image to server. You can also paste an online receipt link below.");
      }
    } catch (e) {
      Alert.alert("Upload Error", "Could not process image upload. You can enter an online receipt link below.");
    } finally {
      setUploadingProof(false);
    }
  };

  const handleCopyReference = () => {
    try {
      if (Clipboard && typeof Clipboard.setString === "function") {
        Clipboard.setString(paymentReference);
      }
    } catch (e) {}
    Alert.alert("Copied", `Reference ${paymentReference} copied to clipboard.`);
  };

  const handleProcessOrder = async () => {
    setProcessing(true);

    if (paymentMethod === "bank_transfer" && !proofUrl) {
      Alert.alert(
        "Proof of Payment Required",
        "Please attach your bank transfer screenshot or provide a document URL before completing settlement."
      );
      setProcessing(false);
      return;
    }

    try {
      // 1. If PayFast selected: generate signature & launch in-app WebView
      if (paymentMethod === "payfast") {
        const pfRes = await safeFetch("/payfast/generate-auction", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            auctionId: lot._id,
            shippingCost: dynamicShipping,
            shippingAddress: addressForm,
            isMobile: true,
          }),
        });

        if (pfRes && pfRes.ok) {
          const pfData = await pfRes.json();
          const targetUrl = pfData.url || "https://sandbox.payfast.co.za/eng/process";
          const fields = pfData.data || {};

          // Generate self-submitting HTML form
          const inputsHtml = Object.keys(fields)
            .map((k) => `<input type="hidden" name="${k}" value="${fields[k]}" />`)
            .join("\n");

          const htmlString = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>PayFast Secure Gateway</title>
                <style>
                  body { background-color: #050505; color: #f5d77f; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                  .spinner { width: 40px; height: 40px; border: 3px solid rgba(245,215,127,0.2); border-top-color: #f5d77f; border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 20px; }
                  @keyframes spin { to { transform: rotate(360deg); } }
                </style>
              </head>
              <body>
                <div class="spinner"></div>
                <p>Transferring securely to PayFast...</p>
                <form id="pfForm" action="${targetUrl}" method="post">
                  ${inputsHtml}
                </form>
                <script>
                  document.getElementById("pfForm").submit();
                </script>
              </body>
            </html>
          `;

          setPayfastHtml(htmlString);
          setPayfastModalVisible(true);
          setProcessing(false);
          return;
        }
      }

      // 2. If Bank Transfer selected: save payment details & proof
      const res = await safeFetch(`/auction/${lot._id}/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          shippingAddress: {
            ...addressForm,
            phoneNumber: addressForm.phone,
          },
          calculatedShipping: dynamicShipping,
          paymentMethod: "Bank Transfer",
          proofUrl: proofUrl || "",
        }),
      });

      if (res && res.ok) {
        setStep(3);
      } else {
        const err = res ? await res.json() : {};
        Alert.alert("Submission Failed", err.message || "Could not record payment.");
      }
    } catch (e) {
      Alert.alert("Error", "Network error completing settlement. Please retry.");
    } finally {
      setProcessing(false);
    }
  };

  const finalizePaidAuction = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      // 1. Ensure master order is recorded for this lot with shipping address
      try {
        await safeFetch(`/auction/${lot._id}/pay`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            shippingAddress: {
              ...addressForm,
              phoneNumber: addressForm.phone,
            },
            calculatedShipping: dynamicShipping,
            paymentMethod: "PayFast",
          }),
        });
      } catch (e) {}

      // 2. Confirm auction payment directly via PayFast confirmation controller
      try {
        await safeFetch("/payfast/confirm-order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ auctionId: lot._id }),
        });
      } catch (e) {
        console.log("Error confirming auction payment on backend:", e);
      }
    } catch (err) {
      console.log("Finalize auction payment error:", err);
    }
  };

  const handleClosePayfastModal = () => {
    Alert.alert(
      "PayFast Gateway",
      "Have you completed your payment on PayFast?",
      [
        {
          text: "Yes, I Have Paid",
          onPress: async () => {
            setPayfastModalVisible(false);
            await finalizePaidAuction();
            Alert.alert(
              "Settlement Completed! 🏆",
              "Your payment has been successfully cleared with the Grand Store Vault. White-glove courier dispatch will begin shortly.",
              [{ text: "View Receipt", onPress: () => navigation.navigate("MyBids") }]
            );
          },
        },
        {
          text: "Leave as Pending",
          style: "destructive",
          onPress: () => {
            setPayfastModalVisible(false);
          },
        },
        { text: "Stay in Gateway", style: "cancel" },
      ]
    );
  };

  const handleWebViewNavChange = async (navState) => {
    const { url } = navState;
    if (
      url.includes("payment=success") ||
      url.includes("status=complete") ||
      url.includes("status=COMPLETE") ||
      url.includes("status=success") ||
      url.includes("paid=true") ||
      url.includes("/finish") ||
      url.includes("/complete") ||
      url.includes("/checkout/success") ||
      (url.includes("mobile-return") && url.includes("status=success"))
    ) {
      setPayfastModalVisible(false);
      await finalizePaidAuction();
      Alert.alert(
        "Settlement Completed! 🏆",
        "Your payment has been successfully cleared with the Grand Store Vault. White-glove courier dispatch will begin shortly.",
        [{ text: "View Receipt", onPress: () => navigation.navigate("MyBids") }]
      );
      return;
    }

    if (
      url.includes("payment=cancel") ||
      url.includes("status=cancelled") ||
      (url.includes("mobile-return") && url.includes("status=cancel"))
    ) {
      setPayfastModalVisible(false);
      Alert.alert("Payment Cancelled", "Your PayFast checkout session was cancelled. You can retry anytime.");
    }
  };

  if (loading && !lot) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader title="CHECKOUT" backgroundColor="#0a0805" isBack={true} navigation={navigation} />
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color="#c99742" />
          <Text style={styles.loadingText}>Opening Vault Escrow Settlement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const lotImage = resolveImage(lot?.images?.[0]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080705" />

      <AppHeader
        title={step === 3 ? "ORDER CONFIRMED" : "AUCTION CHECKOUT"}
        backgroundColor="#0a0805"
        isBack={true}
        navigation={navigation}
      />

      {/* Stepper Progress Bar */}
      <View style={styles.stepperContainer}>
        <View style={styles.stepItem}>
          <View style={[styles.stepCircle, step >= 1 && styles.stepCircleActive]}>
            <Text style={[styles.stepNumber, step >= 1 && styles.stepNumberActive]}>1</Text>
          </View>
          <Text style={[styles.stepLabel, step >= 1 && styles.stepLabelActive]}>Delivery</Text>
        </View>
        <View style={[styles.stepDivider, step >= 2 && styles.stepDividerActive]} />
        <View style={styles.stepItem}>
          <View style={[styles.stepCircle, step >= 2 && styles.stepCircleActive]}>
            <Text style={[styles.stepNumber, step >= 2 && styles.stepNumberActive]}>2</Text>
          </View>
          <Text style={[styles.stepLabel, step >= 2 && styles.stepLabelActive]}>Payment</Text>
        </View>
        <View style={[styles.stepDivider, step >= 3 && styles.stepDividerActive]} />
        <View style={styles.stepItem}>
          <View style={[styles.stepCircle, step >= 3 && styles.stepCircleActive]}>
            <Text style={[styles.stepNumber, step >= 3 && styles.stepNumberActive]}>3</Text>
          </View>
          <Text style={[styles.stepLabel, step >= 3 && styles.stepLabelActive]}>Verification</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Lot Summary Card (Always Visible) */}
        <View style={styles.lotSummaryCard}>
          <Image source={{ uri: lotImage }} style={styles.lotSummaryThumb} resizeMode="contain" />
          <View style={styles.lotSummaryTextCol}>
            <Text style={styles.lotSummaryTag}>LOT #{lot?.lotNumber || lot?._id?.slice(-6)?.toUpperCase()}</Text>
            <Text style={styles.lotSummaryTitle} numberOfLines={2}>
              {lot?.title}
            </Text>
            <Text style={styles.lotSummaryHammer}>
              Winning Hammer Bid:{" "}
              <Text style={styles.goldVal}>R{Number(hammerPrice).toLocaleString("en-ZA")}</Text>
            </Text>
          </View>
        </View>

        {/* STEP 1: DELIVERY ADDRESS */}
        {step === 1 && (
          <View style={styles.formSectionCard}>
            <Text style={styles.sectionTitle}>DELIVERY ADDRESS & LOGISTICS</Text>
            <Text style={styles.sectionSub}>
              White-glove climate-controlled courier directly from our bonded vault.
            </Text>

            <View style={styles.rowInputs}>
              <View style={styles.halfCol}>
                <Text style={styles.inputLabel}>FIRST NAME</Text>
                <TextInput
                  style={styles.textInput}
                  value={addressForm.firstName}
                  onChangeText={(text) => setAddressForm((prev) => ({ ...prev, firstName: text }))}
                  placeholder="First name"
                  placeholderTextColor="#666"
                />
              </View>
              <View style={styles.halfCol}>
                <Text style={styles.inputLabel}>LAST NAME</Text>
                <TextInput
                  style={styles.textInput}
                  value={addressForm.lastName}
                  onChangeText={(text) => setAddressForm((prev) => ({ ...prev, lastName: text }))}
                  placeholder="Last name"
                  placeholderTextColor="#666"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CONTACT PHONE (FOR COURIER TRACKING)</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="phone-pad"
                value={addressForm.phone}
                onChangeText={(text) => setAddressForm((prev) => ({ ...prev, phone: text }))}
                placeholder="e.g. +27 82 123 4567"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>STREET ADDRESS</Text>
              <TextInput
                style={styles.textInput}
                value={addressForm.address}
                onChangeText={(text) => setAddressForm((prev) => ({ ...prev, address: text }))}
                placeholder="Street address & suite/apartment"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.rowInputs}>
              <View style={styles.halfCol}>
                <Text style={styles.inputLabel}>CITY</Text>
                <TextInput
                  style={styles.textInput}
                  value={addressForm.city}
                  onChangeText={(text) => setAddressForm((prev) => ({ ...prev, city: text }))}
                  placeholder="City"
                  placeholderTextColor="#666"
                />
              </View>
              <View style={styles.halfCol}>
                <Text style={styles.inputLabel}>POSTAL CODE</Text>
                <TextInput
                  style={styles.textInput}
                  value={addressForm.postalCode}
                  onChangeText={(text) => setAddressForm((prev) => ({ ...prev, postalCode: text }))}
                  placeholder="Postal Code"
                  placeholderTextColor="#666"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>COUNTRY</Text>
              <TextInput
                style={styles.textInput}
                value={addressForm.country}
                onChangeText={(text) => setAddressForm((prev) => ({ ...prev, country: text }))}
                placeholder="South Africa"
                placeholderTextColor="#666"
              />
            </View>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleContinueToPayment}
              activeOpacity={0.88}
            >
              <LinearGradient colors={["#ffd700", "#d4af37", "#9e7428"]} style={styles.actionGradient}>
                <Text style={styles.actionBtnText}>CONTINUE TO PAYMENT METHOD →</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2: PAYMENT METHOD SELECTION */}
        {step === 2 && (
          <View style={styles.formSectionCard}>
            <View style={styles.addressSummaryRow}>
              <View style={styles.addressSummaryTextCol}>
                <Text style={styles.addressSummaryHeader}>Delivery to:</Text>
                <Text style={styles.addressSummaryDetail}>
                  {addressForm.address}, {addressForm.city}, {addressForm.country}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setStep(1)}>
                <Text style={styles.changeAddressText}>Change</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>SELECT SETTLEMENT METHOD</Text>

            {/* Option 1: PayFast */}
            <TouchableOpacity
              style={[styles.paymentOptionCard, paymentMethod === "payfast" && styles.paymentOptionActive]}
              onPress={() => setPaymentMethod("payfast")}
              activeOpacity={0.85}
            >
              <View style={styles.paymentRadioRow}>
                <View style={[styles.radioCircle, paymentMethod === "payfast" && styles.radioActive]}>
                  {paymentMethod === "payfast" && <View style={styles.radioDot} />}
                </View>
                <View style={styles.paymentOptionTextCol}>
                  <Text style={styles.paymentOptionTitle}>PayFast (Instant Clearance)</Text>
                  <Text style={styles.paymentOptionDesc}>
                    Instant card checkout via Visa, Mastercard, Instant EFT, or Masterpass.
                  </Text>
                </View>
              </View>

              <View style={styles.payfastBadgeRow}>
                <View style={styles.payfastLogoBox}>
                  <Text style={styles.payfastLogoText}>PayFast</Text>
                </View>
                <Text style={styles.encryptedText}>🔒 256-Bit SSL PCI-DSS Level 1</Text>
              </View>
            </TouchableOpacity>

            {/* Option 2: Manual Bank Transfer (EFT) */}
            <TouchableOpacity
              style={[styles.paymentOptionCard, paymentMethod === "bank_transfer" && styles.paymentOptionActive]}
              onPress={() => setPaymentMethod("bank_transfer")}
              activeOpacity={0.85}
            >
              <View style={styles.paymentRadioRow}>
                <View style={[styles.radioCircle, paymentMethod === "bank_transfer" && styles.radioActive]}>
                  {paymentMethod === "bank_transfer" && <View style={styles.radioDot} />}
                </View>
                <View style={styles.paymentOptionTextCol}>
                  <Text style={styles.paymentOptionTitle}>Manual Bank Transfer (EFT)</Text>
                  <Text style={styles.paymentOptionDesc}>
                    Direct electronic transfer to Grand Store Bonded Escrow with proof upload.
                  </Text>
                </View>
              </View>
              <Text style={styles.escrowProtectedTag}>🛡️ Admin Verified Escrow Account</Text>
            </TouchableOpacity>

            {/* Bank Details & Proof Upload if EFT selected */}
            {paymentMethod === "bank_transfer" && (
              <View style={styles.bankTransferSection}>
                <View style={styles.bankDetailsBox}>
                  <Text style={styles.bankDetailsTitle}>🏛️ Grand Store Escrow Banking Details</Text>

                  <View style={styles.bankGrid}>
                    <View style={styles.bankGridItem}>
                      <Text style={styles.bankItemLabel}>BANK NAME</Text>
                      <Text style={styles.bankItemVal}>
                        {storeBankDetails.bankName || "Standard Bank"}
                      </Text>
                    </View>
                    <View style={styles.bankGridItem}>
                      <Text style={styles.bankItemLabel}>ACCOUNT NAME</Text>
                      <Text style={styles.bankItemVal}>
                        {storeBankDetails.accountName || "The Grand Store PTY LTD"}
                      </Text>
                    </View>
                    <View style={styles.bankGridItem}>
                      <Text style={styles.bankItemLabel}>ACCOUNT NUMBER</Text>
                      <Text style={styles.bankItemValMono}>
                        {storeBankDetails.accountNumber || "0123456789"}
                      </Text>
                    </View>
                    <View style={styles.bankGridItem}>
                      <Text style={styles.bankItemLabel}>BRANCH CODE</Text>
                      <Text style={styles.bankItemValMono}>
                        {storeBankDetails.branchCode || "051001"}
                      </Text>
                    </View>
                    {storeBankDetails.accountType ? (
                      <View style={styles.bankGridItem}>
                        <Text style={styles.bankItemLabel}>ACCOUNT TYPE</Text>
                        <Text style={styles.bankItemVal}>{storeBankDetails.accountType}</Text>
                      </View>
                    ) : null}
                    {storeBankDetails.swiftCode ? (
                      <View style={styles.bankGridItem}>
                        <Text style={styles.bankItemLabel}>SWIFT / BIC</Text>
                        <Text style={styles.bankItemValMono}>{storeBankDetails.swiftCode}</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.referenceCopyRow}>
                    <View>
                      <Text style={styles.referenceLabel}>REQUIRED REFERENCE</Text>
                      <Text style={styles.referenceVal}>{paymentReference}</Text>
                    </View>
                    <TouchableOpacity style={styles.copyBtn} onPress={handleCopyReference}>
                      <Text style={styles.copyBtnText}>📋 Copy Ref</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Proof Upload Card */}
                <View style={styles.proofUploadBox}>
                  <Text style={styles.proofTitle}>📤 Attach Proof of Payment (Screenshot / Receipt)</Text>
                  <Text style={styles.proofSub}>
                    Select receipt photo from your gallery or paste direct image link.
                  </Text>

                  {proofUrl ? (
                    <View style={styles.proofAttachedBox}>
                      <Text style={styles.proofAttachedSuccess}>✓ Receipt Screenshot Attached</Text>
                      <Text style={styles.proofAttachedFileName} numberOfLines={1}>
                        {proofFileName || "Payment_Screenshot.jpg"}
                      </Text>
                      <TouchableOpacity onPress={() => setProofUrl("")} style={styles.removeProofBtn}>
                        <Text style={styles.removeProofText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.pickFileBtn}
                      onPress={handlePickReceipt}
                      disabled={uploadingProof}
                    >
                      {uploadingProof ? (
                        <ActivityIndicator color="#c99742" size="small" />
                      ) : (
                        <>
                          <Text style={styles.pickFileIcon}>📷</Text>
                          <Text style={styles.pickFileText}>Upload Transfer Screenshot</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  <TextInput
                    style={styles.urlInput}
                    value={proofUrl}
                    onChangeText={setProofUrl}
                    placeholder="or enter receipt URL: https://..."
                    placeholderTextColor="#666"
                  />
                </View>
              </View>
            )}

            {/* Submit Payment CTA */}
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleProcessOrder}
              disabled={processing}
              activeOpacity={0.88}
            >
              <LinearGradient colors={["#ffd700", "#d4af37", "#9e7428"]} style={styles.actionGradient}>
                {processing ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={styles.actionBtnText}>
                    {paymentMethod === "bank_transfer"
                      ? `SUBMIT EFT PROOF • R${total.toLocaleString("en-ZA")} →`
                      : `PAY VIA PAYFAST • R${total.toLocaleString("en-ZA")} →`}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 3: ORDER CONFIRMED / AWAITING APPROVAL */}
        {step === 3 && (
          <View style={styles.confirmationCard}>
            <View style={styles.confirmIconCircle}>
              <Text style={styles.confirmCheckEmoji}>✓</Text>
            </View>

            <Text style={styles.confirmTitle}>Bank Transfer Proof Received</Text>
            <Text style={styles.confirmDesc}>
              Your proof of payment for <Text style={styles.boldWhite}>{lot?.title}</Text> has been routed to our administrative and compliance desk for validation.
            </Text>

            <View style={styles.confirmDetailsCard}>
              <View style={styles.confirmDetailRow}>
                <Text style={styles.confirmDetailLabel}>REFERENCE NUMBER</Text>
                <Text style={styles.confirmDetailValGold}>{paymentReference}</Text>
              </View>
              <View style={styles.confirmDetailRow}>
                <Text style={styles.confirmDetailLabel}>TOTAL TRANSFERRED</Text>
                <Text style={styles.confirmDetailVal}>R{total.toLocaleString("en-ZA")}</Text>
              </View>
              <View style={styles.confirmDetailRow}>
                <Text style={styles.confirmDetailLabel}>STATUS</Text>
                <View style={styles.awaitingBadge}>
                  <Text style={styles.awaitingText}>⏳ Awaiting Admin Approval</Text>
                </View>
              </View>
            </View>

            <View style={styles.nextStepsBox}>
              <Text style={styles.nextStepsTitle}>🛡️ What Happens Next:</Text>
              <Text style={styles.nextStepsItem}>
                1. Our compliance team verifies your bank deposit against the auction escrow account.
              </Text>
              <Text style={styles.nextStepsItem}>
                2. Once verified, lot status transitions to <Text style={styles.boldWhite}>Paid</Text> and bonded vault white-glove dispatch begins.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate("MyBids")}
              activeOpacity={0.88}
            >
              <LinearGradient colors={["#ffd700", "#d4af37", "#9e7428"]} style={styles.actionGradient}>
                <Text style={styles.actionBtnText}>VIEW MY BIDS & ORDERS →</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* FINANCIAL SUMMARY RECAP (STEPS 1 & 2) */}
        {step < 3 && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryHeader}>FINANCIAL SETTLEMENT LEDGER</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Winning Hammer Bid</Text>
              <Text style={styles.summaryVal}>R{hammerPrice.toLocaleString("en-ZA")}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Buyer's Premium (5%)</Text>
              <Text style={styles.summaryVal}>R{buyerPremium.toLocaleString("en-ZA")}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>B.A.R. Vault Surcharge (2%)</Text>
              <Text style={styles.summaryVal}>R{barCharge.toLocaleString("en-ZA")}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>VAT (15%)</Text>
              <Text style={styles.summaryVal}>R{vatAmount.toLocaleString("en-ZA")}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Courier Shipping ({addressForm.country})</Text>
              <Text style={styles.summaryValHighlight}>R{dynamicShipping.toLocaleString("en-ZA")}</Text>
            </View>

            <View style={styles.summaryDivider} />
            <View style={styles.summaryTotalRow}>
              <View>
                <Text style={styles.totalLabel}>NET SETTLEMENT TOTAL</Text>
                <Text style={styles.totalSub}>All fees & insured transit included</Text>
              </View>
              <Text style={styles.totalValue}>R{total.toLocaleString("en-ZA")}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* PAYFAST EMBEDDED WEBVIEW MODAL */}
      <Modal
        visible={payfastModalVisible}
        animationType="slide"
        onRequestClose={handleClosePayfastModal}
      >
        <SafeAreaView style={styles.webViewModalContainer}>
          <View style={styles.webViewHeader}>
            <Text style={styles.webViewTitle}>PayFast Encrypted Gateway</Text>
            <TouchableOpacity
              onPress={handleClosePayfastModal}
              style={styles.webViewCloseBtn}
            >
              <Text style={styles.webViewCloseText}>✕ Close</Text>
            </TouchableOpacity>
          </View>
          {payfastHtml && (
            <WebView
              source={{ html: payfastHtml }}
              onNavigationStateChange={handleWebViewNavChange}
              onMessage={async (event) => {
                try {
                  const msg = JSON.parse(event.nativeEvent.data);
                  if (msg.type === "PAYFAST_SUCCESS" || msg.status === "success") {
                    setPayfastModalVisible(false);
                    await finalizePaidAuction();
                    Alert.alert(
                      "Settlement Completed! 🏆",
                      "Your payment has been successfully cleared with the Grand Store Vault. White-glove courier dispatch will begin shortly.",
                      [{ text: "View Receipt", onPress: () => navigation.navigate("MyBids") }]
                    );
                  } else if (msg.type === "PAYFAST_CANCEL" || msg.status === "cancel") {
                    setPayfastModalVisible(false);
                    Alert.alert("Payment Cancelled", "Your PayFast checkout session was cancelled.");
                  }
                } catch (e) {}
              }}
              onShouldStartLoadWithRequest={(request) => {
                const reqUrl = request.url || "";
                if (reqUrl.includes("mobile-return") && reqUrl.includes("status=success")) {
                  setPayfastModalVisible(false);
                  finalizePaidAuction();
                  Alert.alert(
                    "Settlement Completed! 🏆",
                    "Your payment has been successfully cleared with the Grand Store Vault. White-glove courier dispatch will begin shortly.",
                    [{ text: "View Receipt", onPress: () => navigation.navigate("MyBids") }]
                  );
                  return false;
                }
                return true;
              }}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.webViewLoading}>
                  <ActivityIndicator size="large" color="#c99742" />
                </View>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#080705",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#c99742",
    marginTop: 12,
    fontSize: 13,
  },

  // Stepper
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0d0b07",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  stepItem: {
    alignItems: "center",
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  stepCircleActive: {
    backgroundColor: "#c99742",
  },
  stepNumber: {
    color: "#888",
    fontSize: 12,
    fontWeight: "bold",
  },
  stepNumberActive: {
    color: "#000",
  },
  stepLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 0.8,
  },
  stepLabelActive: {
    color: "#f5d77f",
  },
  stepDivider: {
    width: 36,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginHorizontal: 8,
    marginBottom: 14,
  },
  stepDividerActive: {
    backgroundColor: "#c99742",
  },

  // Lot Summary Card
  lotSummaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#110e09",
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.25)",
  },
  lotSummaryThumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#000",
    marginRight: 12,
  },
  lotSummaryTextCol: {
    flex: 1,
  },
  lotSummaryTag: {
    color: "#c99742",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 2,
  },
  lotSummaryTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 4,
  },
  lotSummaryHammer: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
  },
  goldVal: {
    color: "#ffd700",
    fontWeight: "bold",
  },

  // Form Section Card
  formSectionCard: {
    backgroundColor: "#110e09",
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  sectionTitle: {
    color: "#f5d77f",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  sectionSub: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    marginBottom: 16,
    lineHeight: 16,
  },
  rowInputs: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  halfCol: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: "#070604",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#fff",
    fontSize: 13,
  },
  actionBtn: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 14,
  },
  actionGradient: {
    paddingVertical: 14,
    alignItems: "center",
  },
  actionBtnText: {
    color: "#000",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },

  // Step 2 Summary Row
  addressSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  addressSummaryTextCol: {
    flex: 1,
  },
  addressSummaryHeader: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 9,
    fontWeight: "bold",
  },
  addressSummaryDetail: {
    color: "#fff",
    fontSize: 11,
    marginTop: 1,
  },
  changeAddressText: {
    color: "#c99742",
    fontSize: 11,
    fontWeight: "bold",
  },

  // Payment Options
  paymentOptionCard: {
    backgroundColor: "#0a0805",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 12,
  },
  paymentOptionActive: {
    borderColor: "#c99742",
    backgroundColor: "rgba(201, 151, 66, 0.06)",
    borderWidth: 1.5,
  },
  paymentRadioRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    marginTop: 2,
  },
  radioActive: {
    borderColor: "#c99742",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#c99742",
  },
  paymentOptionTextCol: {
    flex: 1,
  },
  paymentOptionTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "bold",
  },
  paymentOptionDesc: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    marginTop: 2,
    lineHeight: 14,
  },
  payfastBadgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  payfastLogoBox: {
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  payfastLogoText: {
    color: "#e61c24",
    fontWeight: "900",
    fontSize: 10,
  },
  encryptedText: {
    color: "#34d399",
    fontSize: 10,
  },
  escrowProtectedTag: {
    color: "#f5d77f",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 8,
  },

  // Bank Transfer EFT Details
  bankTransferSection: {
    marginTop: 6,
    marginBottom: 10,
  },
  bankDetailsBox: {
    backgroundColor: "#080603",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.3)",
    marginBottom: 12,
  },
  bankDetailsTitle: {
    color: "#f5d77f",
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 10,
  },
  bankGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  bankGridItem: {
    width: "48%",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 8,
    padding: 8,
  },
  bankItemLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 8,
    fontWeight: "bold",
    marginBottom: 2,
  },
  bankItemVal: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  bankItemValMono: {
    color: "#f5d77f",
    fontSize: 12,
    fontWeight: "bold",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  referenceCopyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(201, 151, 66, 0.1)",
    borderRadius: 8,
    padding: 8,
  },
  referenceLabel: {
    color: "#c99742",
    fontSize: 8,
    fontWeight: "900",
  },
  referenceVal: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "bold",
  },
  copyBtn: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  copyBtnText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },

  // Proof Upload
  proofUploadBox: {
    backgroundColor: "#080603",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  proofTitle: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 2,
  },
  proofSub: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 10,
    marginBottom: 10,
  },
  pickFileBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderStyle: "dashed",
    borderRadius: 10,
    paddingVertical: 14,
    marginBottom: 8,
  },
  pickFileIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  pickFileText: {
    color: "#f5d77f",
    fontSize: 11,
    fontWeight: "bold",
  },
  proofAttachedBox: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    marginBottom: 8,
  },
  proofAttachedSuccess: {
    color: "#34d399",
    fontSize: 11,
    fontWeight: "bold",
  },
  proofAttachedFileName: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 10,
    marginTop: 2,
  },
  removeProofBtn: {
    alignSelf: "flex-end",
    marginTop: 4,
  },
  removeProofText: {
    color: "#f87171",
    fontSize: 10,
  },
  urlInput: {
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "#fff",
    fontSize: 11,
  },

  // Confirmation Screen (Step 3)
  confirmationCard: {
    backgroundColor: "#110e09",
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: "rgba(16, 185, 129, 0.5)",
    alignItems: "center",
  },
  confirmIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderWidth: 2,
    borderColor: "#34d399",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  confirmCheckEmoji: {
    color: "#34d399",
    fontSize: 28,
    fontWeight: "bold",
  },
  confirmTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 6,
  },
  confirmDesc: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  boldWhite: {
    color: "#fff",
    fontWeight: "bold",
  },
  confirmDetailsCard: {
    width: "100%",
    backgroundColor: "#070604",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 14,
  },
  confirmDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },
  confirmDetailLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 9,
    fontWeight: "bold",
  },
  confirmDetailVal: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  confirmDetailValGold: {
    color: "#ffd700",
    fontSize: 13,
    fontWeight: "bold",
  },
  awaitingBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  awaitingText: {
    color: "#fbbf24",
    fontSize: 10,
    fontWeight: "bold",
  },
  nextStepsBox: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginBottom: 16,
  },
  nextStepsTitle: {
    color: "#f5d77f",
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 6,
  },
  nextStepsItem: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 4,
  },

  // Financial Summary
  summaryCard: {
    backgroundColor: "#110e09",
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  summaryHeader: {
    color: "#c99742",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  summaryLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
  },
  summaryVal: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  summaryValHighlight: {
    color: "#f5d77f",
    fontSize: 11,
    fontWeight: "bold",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "rgba(212, 175, 55, 0.25)",
    marginVertical: 10,
  },
  summaryTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    color: "#f5d77f",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  totalSub: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 9,
  },
  totalValue: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
  },

  // WebView Modal
  webViewModalContainer: {
    flex: 1,
    backgroundColor: "#050505",
  },
  webViewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#0d0b07",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  webViewTitle: {
    color: "#f5d77f",
    fontSize: 13,
    fontWeight: "bold",
  },
  webViewCloseBtn: {
    padding: 4,
  },
  webViewCloseText: {
    color: "#ff6b6b",
    fontSize: 13,
    fontWeight: "bold",
  },
  webViewLoading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#050505",
  },
});
