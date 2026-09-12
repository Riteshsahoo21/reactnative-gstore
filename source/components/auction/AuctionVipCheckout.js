/* eslint-disable prettier/prettier */
/* eslint-disable quotes */
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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
  Image,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { WebView } from "react-native-webview";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { launchImageLibrary } from "react-native-image-picker";
import AppHeader from "../../widgets/AppHeader";
import {
  API_BASE,
  getActiveServerHost,
  getActiveApiBase,
  getCandidateBases,
} from "../../resources/data/Constants";

const { width } = Dimensions.get("window");

const getVipApiCandidates = () => {
  const active = typeof getActiveApiBase === "function" ? getActiveApiBase() : API_BASE;
  const list = [API_BASE, active];
  if (typeof getCandidateBases === "function") {
    list.push(...getCandidateBases());
  }
  if (__DEV__) {
    list.push(
      "http://127.0.0.1:5000/api",
      "http://localhost:5000/api",
      "http://10.0.2.2:5000/api",
      "http://192.168.1.9:5000/api"
    );
  }
  return [...new Set(list.filter(Boolean))];
};

export default function AuctionVipCheckout({ route, navigation }) {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [profile, setProfile] = useState(null);

  // VIP Deposit Economics
  const [depositAmount, setDepositAmount] = useState(5000);
  const [standardLimit, setStandardLimit] = useState(25000);
  const [premiumLimit, setPremiumLimit] = useState(250000);

  // Payment Selection: 'payfast' | 'eft'
  const [paymentMethod, setPaymentMethod] = useState("payfast");
  const [proofUrl, setProofUrl] = useState("");
  const [proofFileName, setProofFileName] = useState("");
  const [uploadingProof, setUploadingProof] = useState(false);

  // PayFast In-App WebView Modal State
  const [payfastModalVisible, setPayfastModalVisible] = useState(false);
  const [payfastHtml, setPayfastHtml] = useState(null);

  // Live Deposit Status
  const [depositStatus, setDepositStatus] = useState("none"); // 'none' | 'pending' | 'paid'
  const [submittedDeposit, setSubmittedDeposit] = useState(null);

  // Refund Bank Details (100% Refundable Guarantee)
  const [bankDetails, setBankDetails] = useState({
    bankName: "",
    accountHolder: "",
    accountNumber: "",
    branchCode: "",
  });

  // Grand Store Escrow Bank Details for EFT
  const [storeEscrowBank, setStoreEscrowBank] = useState({
    bankName: "Standard Bank",
    accountName: "The Grand Store PTY LTD (Escrow Trust)",
    accountNumber: "0123456789",
    branchCode: "051001",
    accountType: "Trust / Escrow Account",
    swiftCode: "SBZAJJ",
  });

  const safeFetch = async (endpoint, options = {}) => {
    const candidates = getVipApiCandidates();
    for (const base of candidates) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 7000);
        const url = `${base.replace(/\/$/, "")}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
        const res = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timer);
        if (res) return res;
      } catch (err) {
        // try next candidate
      }
    }
    return null;
  };

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const stored = await AsyncStorage.getItem("userInfo");
      const parsed = stored ? JSON.parse(stored) : null;
      setUser(parsed);
      const userToken = parsed?.token || "";
      setToken(userToken);

      // 1. Fetch platform settings for dynamic deposit and limits
      try {
        const setRes = await safeFetch("/settings/public");
        if (setRes && setRes.ok) {
          const s = await setRes.json();
          if (s.auctionPremiumDepositAmount !== undefined) {
            setDepositAmount(s.auctionPremiumDepositAmount);
          }
          if (s.auctionStandardBiddingLimit !== undefined) {
            setStandardLimit(s.auctionStandardBiddingLimit);
          }
          if (s.auctionPremiumBiddingLimit !== undefined) {
            setPremiumLimit(s.auctionPremiumBiddingLimit);
          }
          if (s.storeBankDetails) {
            setStoreEscrowBank(prev => ({ ...prev, ...s.storeBankDetails }));
          }
        }
      } catch (e) {
        console.warn("Could not fetch settings:", e.message);
      }

      // 2. Fetch Bidder status & banking info
      if (userToken) {
        try {
          const statusRes = await safeFetch("/auction/bidder/status", {
            headers: { Authorization: `Bearer ${userToken}` },
          });
          if (statusRes && statusRes.ok) {
            const bData = await statusRes.json();
            setProfile(bData);
            if (bData.bidderDepositStatus) {
              setDepositStatus(bData.bidderDepositStatus);
            }
            if (bData.bankAccountDetails) {
              const b = bData.bankAccountDetails;
              setBankDetails(prev => ({
                bankName: b.bankName || prev.bankName,
                accountHolder: b.accountHolder || prev.accountHolder,
                accountNumber: b.accountNumber || prev.accountNumber,
                branchCode: b.branchCode || prev.branchCode,
              }));
            }
          }
        } catch (bErr) {
          console.warn("Bidder status fetch error:", bErr.message);
        }

        // Fetch User banking details fallback
        try {
          const bankRes = await safeFetch("/auth/banking", {
            headers: { Authorization: `Bearer ${userToken}` },
          });
          if (bankRes && bankRes.ok) {
            const bJson = await bankRes.json();
            if (bJson?.bankAccountDetails) {
              const b = bJson.bankAccountDetails;
              setBankDetails(prev => ({
                bankName: prev.bankName || b.bankName || "",
                accountHolder: prev.accountHolder || b.accountHolder || parsed?.name || "",
                accountNumber: prev.accountNumber || b.accountNumber || "",
                branchCode: prev.branchCode || b.branchCode || "",
              }));
            }
          }
        } catch (bkErr) {
          console.warn("Auth banking fetch error:", bkErr.message);
        }
      }

      if (parsed?.name && !bankDetails.accountHolder) {
        setBankDetails(prev => ({ ...prev, accountHolder: parsed.name }));
      }
    } catch (err) {
      console.error("Error loading VIP checkout data:", err);
    } finally {
      setLoading(false);
    }
  };

  const depositRef = profile?.bidderNumber
    ? `DEP-VIP-${profile.bidderNumber}`
    : `DEP-VIP-${(user?._id || "PATRON").slice(-6).toUpperCase()}`;

  const copyToClipboard = (text, label) => {
    Clipboard.setString(text);
    Alert.alert("Copied!", `${label} copied to clipboard: ${text}`);
  };

  const handlePickDocument = () => {
    launchImageLibrary(
      {
        mediaType: "photo",
        includeBase64: false,
        maxHeight: 1600,
        maxWidth: 1600,
        quality: 0.85,
      },
      async (response) => {
        if (response.didCancel || response.errorCode) return;
        const asset = response.assets?.[0];
        if (!asset) return;

        setUploadingProof(true);
        setProofFileName(asset.fileName || "deposit_receipt.jpg");

        try {
          const formData = new FormData();
          formData.append("file", {
            uri: Platform.OS === "android" ? asset.uri : asset.uri.replace("file://", ""),
            name: asset.fileName || "deposit_receipt.jpg",
            type: asset.type || "image/jpeg",
          });
          formData.append("document", {
            uri: Platform.OS === "android" ? asset.uri : asset.uri.replace("file://", ""),
            name: asset.fileName || "deposit_receipt.jpg",
            type: asset.type || "image/jpeg",
          });

          const uploadRes = await safeFetch("/vendor/upload-public", {
            method: "POST",
            headers: {
              "Content-Type": "multipart/form-data",
            },
            body: formData,
          });

          if (uploadRes && uploadRes.ok) {
            const uData = await uploadRes.json();
            setProofUrl(uData.url);
            Alert.alert("Success", "Proof of deposit uploaded successfully.");
          } else {
            Alert.alert("Upload Note", "Document selected. It will be recorded with your deposit.");
            setProofUrl(asset.uri);
          }
        } catch (upErr) {
          console.warn("Upload fallback:", upErr.message);
          setProofUrl(asset.uri);
        } finally {
          setUploadingProof(false);
        }
      }
    );
  };

  const handleSubmitVipDeposit = async () => {
    if (!bankDetails.bankName.trim() || !bankDetails.accountHolder.trim() || !bankDetails.accountNumber.trim()) {
      Alert.alert(
        "Refund Details Required",
        "Please provide your Bank Name, Account Holder Name, and Account Number. This guarantees your 100% deposit refund within 24h if you do not win the lot."
      );
      return;
    }

    if (paymentMethod === "eft" && !proofUrl) {
      Alert.alert(
        "Proof of Payment Required",
        "Please attach your bank transfer screenshot or payment receipt to complete your EFT audit submission."
      );
      return;
    }

    setProcessing(true);
    try {
      // 1. Submit deposit record to backend
      const res = await safeFetch("/auction/bidder/deposit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: depositAmount,
          tier: "premium",
          paymentMethod,
          proofOfPayment: proofUrl,
          bankAccountDetails: bankDetails,
        }),
      });

      if (!res || !res.ok) {
        const errJson = res ? await res.json() : {};
        throw new Error(errJson.message || "Failed to initiate VIP deposit authorization.");
      }

      const resData = await res.json();
      const depositObj = resData.deposit || {
        _id: resData._id,
        amount: depositAmount,
        paymentReference: resData.depositReference || depositRef,
      };

      setSubmittedDeposit(depositObj);

      // 2. If PayFast: generate gateway payload and launch WebView
      if (paymentMethod === "payfast") {
        const pfRes = await safeFetch("/payfast/generate-deposit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            depositId: depositObj._id,
            isMobile: true,
          }),
        });

        if (pfRes && pfRes.ok) {
          const pfJson = await pfRes.json();
          const targetUrl = pfJson.url || "https://www.payfast.co.za/eng/process";
          const fields = pfJson.data || {};

          const inputsHtml = Object.keys(fields)
            .map((k) => `<input type="hidden" name="${k}" value="${fields[k]}" />`)
            .join("\n");

          const htmlString = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>PayFast VIP Escrow Gateway</title>
                <style>
                  body { background-color: #050505; color: #f5d77f; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                  .spinner { width: 44px; height: 44px; border: 3px solid rgba(245,215,127,0.2); border-top-color: #f5d77f; border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 20px; }
                  @keyframes spin { to { transform: rotate(360deg); } }
                </style>
              </head>
              <body>
                <div class="spinner"></div>
                <h3 style="font-weight: 300; letter-spacing: 1px;">The Grand Store Escrow</h3>
                <p style="font-size: 13px; color: #ccc;">Connecting securely to PayFast...</p>
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

      // If Bank Transfer EFT
      setDepositStatus("pending");
      Alert.alert(
        "EFT Deposit Queued for Audit",
        `Your refundable deposit of R${depositAmount.toLocaleString()} has been logged under reference ${depositObj.paymentReference || depositRef}. Our finance compliance officer will confirm your R${premiumLimit.toLocaleString()}+ VIP ceiling shortly.`,
        [{ text: "View Auctions", onPress: () => navigation.navigate("AuctionsHub") }]
      );
    } catch (err) {
      console.error("VIP Deposit submission error:", err);
      Alert.alert("Submission Error", err.message || "Failed to submit VIP deposit. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handlePayFastNavigationStateChange = async (navState) => {
    const { url } = navState;
    if (!url) return;

    if (
      url.includes("payment=success") ||
      url.includes("return_url") ||
      url.includes("/auction/vip-checkout?payment=success") ||
      (url.includes("mobile-return") && url.includes("status=success"))
    ) {
      setPayfastModalVisible(false);
      setDepositStatus("paid");
      try {
        await safeFetch("/payfast/confirm-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ depositId: submittedDeposit?._id }),
        });
      } catch (e) {}

      Alert.alert(
        "👑 VIP Privileges Activated!",
        `Your refundable security deposit of R${depositAmount.toLocaleString()} has been confirmed. Your bidding ceiling is elevated up to R${premiumLimit.toLocaleString()}+ with full escrow protection.`,
        [
          { text: "Explore Catalogue", onPress: () => navigation.navigate("AuctionsHub") },
          { text: "Done" },
        ]
      );
    } else if (
      url.includes("payment=cancel") ||
      url.includes("cancel_url") ||
      (url.includes("mobile-return") && url.includes("status=cancel"))
    ) {
      setPayfastModalVisible(false);
      try {
        await safeFetch("/payfast/cancel-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            depositId: submittedDeposit?._id,
            reason: "Customer cancelled VIP deposit in mobile gateway",
          }),
        });
      } catch (e) {}
      Alert.alert(
        "VIP Deposit Cancelled",
        "Your PayFast VIP deposit checkout was cancelled. No funds were debited, and no receipt was issued.",
        [
          { text: "Retry VIP Upgrade", onPress: () => handleSubmit() },
          { text: "Dismiss", style: "cancel" },
        ]
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#050505" />
        <ActivityIndicator size="large" color="#f5d77f" />
        <Text style={styles.loadingText}>Loading VIP Reserve Bidding Access...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#050505" />
      <AppHeader
        title="VIP Bidding Escrow"
        showBack={true}
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* VIP Crest & Banner */}
        <LinearGradient
          colors={["#1c170d", "#100d08", "#070604"]}
          style={styles.heroCard}
        >
          <View style={styles.crownBadge}>
            <Text style={styles.crownText}>👑</Text>
          </View>
          <Text style={styles.vipTag}>PREMIUM RESERVE ACCESS</Text>
          <Text style={styles.heroTitle}>VIP Bidding Privileges</Text>
          <Text style={styles.heroSubtitle}>
            Elevate your bidding ceiling to R{premiumLimit.toLocaleString()}+ on rare cellar reserves, curated auctions, and sommelier vintage lots.
          </Text>

          {/* Metric Comparison Box */}
          <View style={styles.metricsBox}>
            <View style={styles.metricCol}>
              <Text style={styles.metricLabel}>STANDARD LIMIT</Text>
              <Text style={styles.metricValueMuted}>R{standardLimit.toLocaleString()}</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricCol}>
              <Text style={styles.metricLabelGold}>VIP CEILING</Text>
              <Text style={styles.metricValueGold}>R{premiumLimit.toLocaleString()}+</Text>
            </View>
          </View>
        </LinearGradient>

        {/* 100% Refundable Guarantee Escrow Guarantee Card */}
        <View style={styles.guaranteeCard}>
          <View style={styles.guaranteeHeader}>
            <Text style={styles.guaranteeShield}>🛡️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.guaranteeTitle}>100% Refundable Escrow Guarantee</Text>
              <Text style={styles.guaranteeText}>
                Your security deposit of <Text style={{ color: "#f5d77f", fontWeight: "bold" }}>R{depositAmount.toLocaleString()}</Text> is held in the Grand Store Escrow Trust. Should you not win your designated lot, the full amount is refunded to your designated bank account within 24 hours of auction settlement.
              </Text>
            </View>
          </View>
        </View>

        {/* Live Status If Paid or Pending */}
        {depositStatus === "paid" && (
          <View style={styles.statusActiveCard}>
            <Text style={styles.statusActiveIcon}>✓</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.statusActiveTitle}>VIP Bidding Active</Text>
              <Text style={styles.statusActiveDesc}>
                Your R{depositAmount.toLocaleString()} security deposit is confirmed. You hold unrestricted R{premiumLimit.toLocaleString()}+ bidding clearance.
              </Text>
            </View>
          </View>
        )}

        {depositStatus === "pending" && (
          <View style={styles.statusPendingCard}>
            <Text style={styles.statusPendingIcon}>⏳</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.statusPendingTitle}>EFT Deposit Under Compliance Audit</Text>
              <Text style={styles.statusPendingDesc}>
                Your proof of deposit is undergoing finance clearance (Ref: {depositRef}). Your R{premiumLimit.toLocaleString()}+ limit will activate upon approval.
              </Text>
            </View>
          </View>
        )}

        {/* Payment Channel Selection */}
        <Text style={styles.sectionHeading}>SELECT PAYMENT METHOD</Text>

        <View style={styles.methodSelector}>
          {/* PayFast */}
          <TouchableOpacity
            style={[styles.methodCard, paymentMethod === "payfast" && styles.methodCardSelected]}
            onPress={() => setPaymentMethod("payfast")}
          >
            <View style={styles.methodRadio}>
              {paymentMethod === "payfast" && <View style={styles.methodRadioInner} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.methodTitle}>PayFast Instant Gateway</Text>
              <Text style={styles.methodDesc}>Credit/Debit Card, Instant EFT, Capitec Pay</Text>
            </View>
            <Text style={styles.methodBadge}>INSTANT</Text>
          </TouchableOpacity>

          {/* Bank Transfer */}
          <TouchableOpacity
            style={[styles.methodCard, paymentMethod === "eft" && styles.methodCardSelected]}
            onPress={() => setPaymentMethod("eft")}
          >
            <View style={styles.methodRadio}>
              {paymentMethod === "eft" && <View style={styles.methodRadioInner} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.methodTitle}>Direct Escrow Bank Transfer</Text>
              <Text style={styles.methodDesc}>Standard Bank trust deposit with receipt upload</Text>
            </View>
            <Text style={styles.methodBadgeEft}>EFT</Text>
          </TouchableOpacity>
        </View>

        {/* Escrow Bank Details & Proof Upload (If EFT Selected) */}
        {paymentMethod === "eft" && (
          <View style={styles.eftContainer}>
            <Text style={styles.sectionHeading}>GRAND STORE ESCROW ACCOUNT</Text>
            <View style={styles.bankCard}>
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>Bank</Text>
                <Text style={styles.bankValue}>{storeEscrowBank.bankName}</Text>
              </View>
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>Account Name</Text>
                <Text style={styles.bankValue}>{storeEscrowBank.accountName}</Text>
              </View>
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>Account Number</Text>
                <TouchableOpacity
                  style={styles.copyRow}
                  onPress={() => copyToClipboard(storeEscrowBank.accountNumber, "Account Number")}
                >
                  <Text style={styles.bankValueHighlight}>{storeEscrowBank.accountNumber}</Text>
                  <Text style={styles.copyBadge}>COPY</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>Branch Code</Text>
                <Text style={styles.bankValue}>{storeEscrowBank.branchCode}</Text>
              </View>
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>Payment Reference</Text>
                <TouchableOpacity
                  style={styles.copyRow}
                  onPress={() => copyToClipboard(depositRef, "Reference")}
                >
                  <Text style={styles.bankValueHighlight}>{depositRef}</Text>
                  <Text style={styles.copyBadge}>COPY</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Proof of Payment Upload */}
            <Text style={[styles.sectionHeading, { marginTop: 16 }]}>ATTACH TRANSFER RECEIPT</Text>
            <TouchableOpacity
              style={styles.uploadBtn}
              onPress={handlePickDocument}
              disabled={uploadingProof}
            >
              {uploadingProof ? (
                <ActivityIndicator size="small" color="#f5d77f" />
              ) : (
                <>
                  <Text style={styles.uploadIcon}>📎</Text>
                  <Text style={styles.uploadBtnText}>
                    {proofUrl ? "Change Proof of Payment" : "Upload Bank Statement / Receipt"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            {proofFileName ? (
              <Text style={styles.proofFileText}>Selected: {proofFileName}</Text>
            ) : null}
          </View>
        )}

        {/* Refund Bank Details Capture Form */}
        <Text style={[styles.sectionHeading, { marginTop: 24 }]}>YOUR REFUND BANKING DETAILS</Text>
        <Text style={styles.refundSubtext}>
          Please specify where Grand Store should return your R{depositAmount.toLocaleString()} security deposit should you not acquire a lot.
        </Text>

        <View style={styles.formCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>BANK NAME *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., FNB, Standard Bank, ABSA, Nedbank"
              placeholderTextColor="#666"
              value={bankDetails.bankName}
              onChangeText={(val) => setBankDetails(prev => ({ ...prev, bankName: val }))}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>ACCOUNT HOLDER NAME *</Text>
            <TextInput
              style={styles.input}
              placeholder="Full legal name on account"
              placeholderTextColor="#666"
              value={bankDetails.accountHolder}
              onChangeText={(val) => setBankDetails(prev => ({ ...prev, accountHolder: val }))}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>ACCOUNT NUMBER *</Text>
            <TextInput
              style={styles.input}
              placeholder="Bank account number"
              placeholderTextColor="#666"
              keyboardType="number-pad"
              value={bankDetails.accountNumber}
              onChangeText={(val) => setBankDetails(prev => ({ ...prev, accountNumber: val }))}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>BRANCH CODE</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 250655"
              placeholderTextColor="#666"
              keyboardType="number-pad"
              value={bankDetails.branchCode}
              onChangeText={(val) => setBankDetails(prev => ({ ...prev, branchCode: val }))}
            />
          </View>
        </View>

        {/* Final Payment Button */}
        <TouchableOpacity
          style={[styles.submitBtn, processing && styles.submitBtnDisabled]}
          onPress={handleSubmitVipDeposit}
          disabled={processing}
        >
          <LinearGradient
            colors={["#f5d77f", "#d4af37", "#aa8010"]}
            style={styles.submitGradient}
          >
            {processing ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.submitBtnText}>
                {paymentMethod === "payfast"
                  ? `PAY REFUNDABLE R${depositAmount.toLocaleString()} VIA PAYFAST`
                  : `SUBMIT EFT FOR AUDIT (R${depositAmount.toLocaleString()})`}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.termsFootnote}>
          By placing this guarantee deposit, you accept the Grand Store VIP Bidding Terms. All deposits are protected under South African escrow compliance law.
        </Text>
      </ScrollView>

      {/* PayFast In-App WebView Modal */}
      <Modal
        visible={payfastModalVisible}
        animationType="slide"
        onRequestClose={async () => {
          setPayfastModalVisible(false);
          try {
            await safeFetch("/payfast/cancel-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                depositId: submittedDeposit?._id,
                reason: "Customer closed VIP deposit modal",
              }),
            });
          } catch (e) {}
          Alert.alert(
            "VIP Deposit Cancelled",
            "You closed the VIP deposit checkout. No funds were debited, and no receipt was issued.",
            [
              { text: "Retry VIP Upgrade", onPress: () => handleSubmit() },
              { text: "Dismiss", style: "cancel" },
            ]
          );
        }}
      >
        <SafeAreaView style={styles.modalSafeContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>PayFast VIP Escrow Gateway</Text>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={async () => {
                setPayfastModalVisible(false);
                try {
                  await safeFetch("/payfast/cancel-payment", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      depositId: submittedDeposit?._id,
                      reason: "Customer closed VIP deposit modal",
                    }),
                  });
                } catch (e) {}
                Alert.alert(
                  "VIP Deposit Cancelled",
                  "You closed the VIP deposit checkout. No funds were debited, and no receipt was issued.",
                  [
                    { text: "Retry VIP Upgrade", onPress: () => handleSubmit() },
                    { text: "Dismiss", style: "cancel" },
                  ]
                );
              }}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {payfastHtml ? (
            <WebView
              source={{ html: payfastHtml }}
              onNavigationStateChange={handlePayFastNavigationStateChange}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.webViewLoader}>
                  <ActivityIndicator size="large" color="#f5d77f" />
                </View>
              )}
              style={{ flex: 1, backgroundColor: "#050505" }}
            />
          ) : null}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#050505",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#f5d77f",
    marginTop: 12,
    fontSize: 13,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
  },
  heroCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(245, 215, 127, 0.3)",
    marginBottom: 16,
  },
  crownBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(245, 215, 127, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(245, 215, 127, 0.3)",
  },
  crownText: {
    fontSize: 26,
  },
  vipTag: {
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 2,
    color: "#f5d77f",
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 12,
    color: "#a8a29e",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  metricsBox: {
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: "100%",
  },
  metricCol: {
    flex: 1,
    alignItems: "center",
  },
  metricDivider: {
    width: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  metricLabel: {
    fontSize: 9,
    color: "#78716c",
    letterSpacing: 1,
    marginBottom: 4,
  },
  metricValueMuted: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#a8a29e",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  metricLabelGold: {
    fontSize: 9,
    color: "#f5d77f",
    letterSpacing: 1,
    marginBottom: 4,
  },
  metricValueGold: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#f5d77f",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  guaranteeCard: {
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.25)",
    padding: 16,
    marginBottom: 16,
  },
  guaranteeHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  guaranteeShield: {
    fontSize: 22,
    marginRight: 12,
    marginTop: 2,
  },
  guaranteeTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#34d399",
    marginBottom: 4,
  },
  guaranteeText: {
    fontSize: 11,
    color: "#d1d5db",
    lineHeight: 16,
  },
  statusActiveCard: {
    flexDirection: "row",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "#10b981",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
  },
  statusActiveIcon: {
    fontSize: 22,
    color: "#34d399",
    fontWeight: "bold",
    marginRight: 12,
  },
  statusActiveTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#34d399",
    marginBottom: 2,
  },
  statusActiveDesc: {
    fontSize: 11,
    color: "#e5e7eb",
  },
  statusPendingCard: {
    flexDirection: "row",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: "#f59e0b",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
  },
  statusPendingIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  statusPendingTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#fbbf24",
    marginBottom: 2,
  },
  statusPendingDesc: {
    fontSize: 11,
    color: "#fef3c7",
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 1.5,
    color: "#a8a29e",
    marginBottom: 10,
    marginTop: 4,
  },
  methodSelector: {
    gap: 10,
    marginBottom: 16,
  },
  methodCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 16,
  },
  methodCardSelected: {
    borderColor: "#f5d77f",
    backgroundColor: "rgba(245, 215, 127, 0.08)",
  },
  methodRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#f5d77f",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  methodRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#f5d77f",
  },
  methodTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 2,
  },
  methodDesc: {
    fontSize: 10,
    color: "#78716c",
  },
  methodBadge: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#34d399",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: "hidden",
  },
  methodBadgeEft: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#f5d77f",
    backgroundColor: "rgba(245, 215, 127, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: "hidden",
  },
  eftContainer: {
    marginBottom: 16,
  },
  bankCard: {
    backgroundColor: "#111111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 16,
  },
  bankRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.04)",
  },
  bankLabel: {
    fontSize: 11,
    color: "#78716c",
  },
  bankValue: {
    fontSize: 12,
    color: "#ffffff",
    fontWeight: "500",
  },
  copyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bankValueHighlight: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#f5d77f",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  copyBadge: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#000",
    backgroundColor: "#f5d77f",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(245, 215, 127, 0.1)",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(245, 215, 127, 0.4)",
    borderRadius: 14,
    padding: 14,
  },
  uploadIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  uploadBtnText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#f5d77f",
  },
  proofFileText: {
    fontSize: 11,
    color: "#34d399",
    marginTop: 6,
    textAlign: "center",
  },
  refundSubtext: {
    fontSize: 11,
    color: "#78716c",
    lineHeight: 16,
    marginBottom: 12,
  },
  formCard: {
    backgroundColor: "#111111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 16,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#a8a29e",
    letterSpacing: 1,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#181818",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: "#ffffff",
  },
  submitBtn: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#f5d77f",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#050505",
    letterSpacing: 1.5,
  },
  termsFootnote: {
    fontSize: 10,
    color: "#78716c",
    textAlign: "center",
    lineHeight: 15,
  },
  modalSafeContainer: {
    flex: 1,
    backgroundColor: "#050505",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#f5d77f",
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalCloseText: {
    fontSize: 13,
    color: "#e11d48",
    fontWeight: "bold",
  },
  webViewLoader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#050505",
    justifyContent: "center",
    alignItems: "center",
  },
});
