/* eslint-disable prettier/prettier */
/* eslint-disable quotes */
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Share,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
  Modal,
  Dimensions,
  Platform,
  StatusBar,
  Linking,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { WebView } from "react-native-webview";
import AsyncStorage from "@react-native-async-storage/async-storage";
import RNShare from "react-native-share";
import AppHeader from "../../widgets/AppHeader";
import {
  API_BASE,
  getActiveServerHost,
  getActiveApiBase,
  getCandidateBases,
} from "../../resources/data/Constants";

const { width } = Dimensions.get("window");

const getEventApiCandidates = () => {
  const active = typeof getActiveApiBase === "function" ? getActiveApiBase() : API_BASE;
  const list = [API_BASE, active];
  if (typeof getCandidateBases === "function") {
    list.push(...getCandidateBases());
  }
  if (__DEV__) {
    list.push(
      "http://127.0.0.1:5000/api",
      "http://192.168.1.102:5000/api",
      "http://localhost:5000/api",
      "http://10.0.2.2:5000/api",
      "http://192.168.1.9:5000/api"
    );
  }
  return [...new Set(list.filter(Boolean))];
};

const escapeHtml = (unsafe) => {
  return String(unsafe || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

export default function EventTicketPass({ route, navigation }) {
  const paramBooking = route?.params?.booking;
  const paramBookingId = route?.params?.bookingId;
  const justBooked = route?.params?.justBooked;

  const [bookings, setBookings] = useState(paramBooking ? [paramBooking] : []);
  const [loading, setLoading] = useState(!paramBooking);
  const [refreshing, setRefreshing] = useState(false);
  const [proofUrl, setProofUrl] = useState("");
  const [uploadingProofId, setUploadingProofId] = useState(null);

  // PayFast In-App Modal State (for pending tickets)
  const [showPayfastModal, setShowPayfastModal] = useState(false);
  const [payfastModalData, setPayfastModalData] = useState(null);
  const [isPayfastLoading, setIsPayfastLoading] = useState(true);
  const [enlargedQrTicket, setEnlargedQrTicket] = useState(null);
  const [isPreparingShare, setIsPreparingShare] = useState(false);

  const safeFetch = async (endpoint, options = {}) => {
    const candidates = getEventApiCandidates();
    let lastRes = null;
    for (const base of candidates) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);
        const url = `${base.replace(/\/$/, "")}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
        const res = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timer);
        if (res && res.ok) return res;
        if (res) lastRes = res;
      } catch (err) {
        // try next
      }
    }
    return lastRes;
  };

  const fetchMyTickets = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const res = await safeFetch("/events/bookings/my-tickets", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setBookings(data);
        }
      }
    } catch (e) {
      console.log("Error loading my tickets:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMyTickets();
  }, [fetchMyTickets]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyTickets();
  };

  // Submit Bank Transfer Proof
  const handleUploadProof = async (bookingId) => {
    if (!proofUrl.trim()) {
      Alert.alert("Input Required", "Please enter the URL or cloud link of your proof of payment.");
      return;
    }

    try {
      const token = await AsyncStorage.getItem("userToken");
      setUploadingProofId(bookingId);

      const res = await safeFetch(`/events/bookings/${bookingId}/bank-transfer/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ proofUrl: proofUrl.trim() }),
      });

      if (res && res.ok) {
        Alert.alert("Proof Submitted! 📄", "Thank you! Our concierge team will verify your bank transfer and activate your ticket shortly.");
        setProofUrl("");
        fetchMyTickets();
      } else {
        const err = await res?.json();
        Alert.alert("Notice", err?.message || "Failed to submit payment proof. Please verify the URL format.");
      }
    } catch (e) {
      Alert.alert("Submission Error", "Network error while submitting proof. Please retry.");
    } finally {
      setUploadingProofId(null);
    }
  };

  // Download PDF Ticket Pass
  const handleDownloadPdf = async (b) => {
    try {
      const targetId = b._id || b.ticketId;
      const candidates = typeof getCandidateBases === "function" ? getCandidateBases() : [];
      let workingHost = null;

      // Prioritize deployed domain, active server host, and LAN IP only if __DEV__
      const candidateHosts = [
        "https://api.grandstoreglobal.com",
        ...(typeof getActiveServerHost === "function" ? [getActiveServerHost()] : []),
        ...candidates.map((c) => (c ? c.replace(/\/api\/?$/, "") : null)),
        ...(__DEV__ ? [
          "http://127.0.0.1:5000",
          "http://localhost:5000",
          "http://192.168.1.102:5000",
          "http://10.0.2.2:5000",
        ] : []),
      ].filter(Boolean);

      const uniqueHosts = [...new Set(candidateHosts)];

      // Verify which candidate host actually serves the PDF endpoint
      for (const host of uniqueHosts) {
        try {
          const checkUrl = `${host}/api/events/bookings/${targetId}/ticket-pdf`;
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 1800);
          const res = await fetch(checkUrl, {
            method: "HEAD",
            signal: controller.signal,
          });
          clearTimeout(timer);
          if (res && res.status === 200) {
            workingHost = host;
            break;
          }
        } catch (e) {
          // Probe next candidate
        }
      }

      if (!workingHost) {
        workingHost = "https://api.grandstoreglobal.com";
      }

      const downloadUrl = `${workingHost}/api/events/bookings/${targetId}/ticket-pdf?download=1`;
      await Linking.openURL(downloadUrl);
    } catch (err) {
      console.log("Error opening PDF download link:", err);
      Alert.alert(
        "Notice",
        "Could not open download link directly. You can also view and download the PDF from your confirmation email."
      );
    }
  };

  // Resend Ticket Email with PDF Attachment
  const handleResendEmail = async (b) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const targetId = b._id || b.ticketId;
      Alert.alert(
        "Email VIP Pass (PDF)",
        `Send the printable VIP Pass PDF with scannable QR ticket directly to ${b.customerEmail || "your email address"}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Send Now ✉️",
            onPress: async () => {
              const res = await safeFetch(`/events/bookings/${targetId}/resend-ticket`, {
                method: "POST",
                headers: {
                  Authorization: token ? `Bearer ${token}` : undefined,
                },
              });
              if (res && res.ok) {
                Alert.alert(
                  "Pass Dispatched! ✉️",
                  `Your VIP Pass with scannable QR code and attached PDF has been sent to ${b.customerEmail || "your email address"}. Please check your Gmail Inbox.`
                );
              } else {
                const data = await res?.json().catch(() => ({}));
                Alert.alert("Notice", data?.message || "Could not resend email at this time.");
              }
            },
          },
        ]
      );
    } catch (e) {
      Alert.alert("Error", "Could not dispatch ticket email.");
    }
  };

  // Helper to fetch official base64 data for PDF and QR photo
  const fetchPassDataForSharing = async (booking) => {
    const targetId = booking._id || booking.ticketId;
    const candidates = typeof getEventApiCandidates === "function" ? getEventApiCandidates() : [];

    for (const base of candidates) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(
          `${base.replace(/\/$/, "")}/events/bookings/${targetId}/ticket-pdf?format=base64`,
          {
            method: "GET",
            signal: controller.signal,
          }
        );
        clearTimeout(timer);
        if (res && res.ok) {
          const json = await res.json();
          if (json && (json.pdfBase64 || json.qrBase64)) {
            return json;
          }
        }
      } catch (e) {}
    }
    return null;
  };

  // Execute native file sharing (PDF Document or QR Photo or Both)
  const executeFileShare = async (b, mode = "both") => {
    const targetId = b._id || b.ticketId;
    const eventObj = b.event || {};
    const eventTitle = eventObj.title || "Exclusive Tasting Experience";
    const dateStr = eventObj.date
      ? new Date(eventObj.date).toLocaleDateString("en-US", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "Confirmed Date";
    const timeStr = eventObj.startTime || "18:00";
    const venueStr = eventObj.location || "The Grand Store Private Vault";

    // Clean caption message with ZERO links - pass files are attached natively
    const captionMessage =
      `🏆 THE GRAND STORE • VIP CELLAR PASS\n\n` +
      `Event: ${eventTitle}\n` +
      `Date: ${dateStr} • ${timeStr}\n` +
      `Venue: ${venueStr}\n` +
      `Ticket ID: ${b.ticketId}\n` +
      `Tier: ${b.ticketType} (${b.quantity} ${b.quantity === 1 ? "Guest" : "Guests"})\n` +
      `Booking Ref: ${b.gsReference || "N/A"}\n\n` +
      `Present this pass at reception for VIP cellar admission.`;

    try {
      setIsPreparingShare(true);
      const passData = await fetchPassDataForSharing(b);

      const pdfDataUrl = passData?.pdfBase64;
      let finalQrBase64 =
        passData?.qrBase64 ||
        (typeof b.qrCodeData === "string" && b.qrCodeData.startsWith("data:image") ? b.qrCodeData : null);

      if (!finalQrBase64) {
        try {
          const qrFetchRes = await fetch(
            `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(b.ticketId)}`
          );
          const blob = await qrFetchRes.blob();
          finalQrBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          console.log("Could not convert QR to base64:", e);
        }
      }

      if (mode === "pdf") {
        if (!pdfDataUrl) {
          Alert.alert("Preparing Pass", "Could not retrieve the official PDF pass file. Please check your internet connection.");
          return;
        }
        // Share ONLY the original PDF document
        await RNShare.open({
          title: `VIP Pass - ${b.ticketId}`,
          subject: `VIP Event Pass • ${eventTitle}`,
          url: pdfDataUrl,
          filename: `TheGrandStore-VIP-Pass-${b.ticketId}`,
          type: "application/pdf",
          useInternalStorage: true,
          message: captionMessage,
          failOnCancel: false,
        });
      } else if (mode === "qr") {
        if (!finalQrBase64) {
          Alert.alert("Notice", "Could not generate QR image pass.");
          return;
        }
        // Share ONLY the original QR photo
        await RNShare.open({
          title: `VIP Pass QR - ${b.ticketId}`,
          subject: `VIP Cellar Access QR • ${eventTitle}`,
          url: finalQrBase64,
          filename: `VIP-Pass-QR-${b.ticketId}`,
          type: "image/png",
          useInternalStorage: true,
          message: captionMessage,
          failOnCancel: false,
        });
      } else {
        // Share BOTH files together
        if (pdfDataUrl && finalQrBase64 && Platform.OS === "android") {
          try {
            await RNShare.open({
              title: `VIP Pass & QR - ${b.ticketId}`,
              subject: `VIP Event Pass • ${eventTitle}`,
              urls: [pdfDataUrl, finalQrBase64],
              filenames: [
                `TheGrandStore-VIP-Pass-${b.ticketId}.pdf`,
                `VIP-Pass-QR-${b.ticketId}.png`,
              ],
              type: "*/*",
              useInternalStorage: true,
              message: captionMessage,
              failOnCancel: false,
            });
          } catch (multiErr) {
            // If multi-file sharing is not supported by target app, share the PDF pass
            await RNShare.open({
              title: `VIP Pass - ${b.ticketId}`,
              subject: `VIP Event Pass • ${eventTitle}`,
              url: pdfDataUrl,
              filename: `TheGrandStore-VIP-Pass-${b.ticketId}`,
              type: "application/pdf",
              useInternalStorage: true,
              message: captionMessage,
              failOnCancel: false,
            });
          }
        } else if (pdfDataUrl) {
          await RNShare.open({
            title: `VIP Pass - ${b.ticketId}`,
            subject: `VIP Event Pass • ${eventTitle}`,
            url: pdfDataUrl,
            filename: `TheGrandStore-VIP-Pass-${b.ticketId}`,
            type: "application/pdf",
            useInternalStorage: true,
            message: captionMessage,
            failOnCancel: false,
          });
        } else if (finalQrBase64) {
          await RNShare.open({
            title: `VIP Pass QR - ${b.ticketId}`,
            subject: `VIP Cellar Access QR • ${eventTitle}`,
            url: finalQrBase64,
            filename: `VIP-Pass-QR-${b.ticketId}`,
            type: "image/png",
            useInternalStorage: true,
            message: captionMessage,
            failOnCancel: false,
          });
        }
      }
    } catch (err) {
      if (
        err?.message &&
        !err.message.includes("User did not share") &&
        !err.message.includes("dismissed") &&
        !err.message.includes("cancelled")
      ) {
        console.log("Error sharing pass files:", err);
        Alert.alert("Notice", "Could not complete direct file sharing. Please try again.");
      }
    } finally {
      setIsPreparingShare(false);
    }
  };

  // Direct 1-tap sharing of ticket pass (QR photo + VIP cellar pass caption) without options prompt
  const handleSharePass = (b) => {
    executeFileShare(b, "qr");
  };

  const handleShareOrDownloadTicket = (b) => executeFileShare(b, "qr");

  // Relaunch PayFast for a pending ticket
  const handlePayPendingTicket = async (booking) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const pfRes = await safeFetch("/payfast/generate-event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bookingId: booking._id, isMobile: true }),
      });

      if (pfRes && pfRes.ok) {
        const pfData = await pfRes.json();
        if (pfData && pfData.url && pfData.data) {
          setPayfastModalData({
            url: pfData.url,
            fields: pfData.data,
            booking,
          });
          setShowPayfastModal(true);
          setIsPayfastLoading(true);
        }
      } else {
        const err = await pfRes?.json();
        Alert.alert("Payment Error", err?.message || "Could not launch PayFast gateway.");
      }
    } catch (e) {
      Alert.alert("Connection Error", "Could not connect to payment gateway.");
    }
  };

  // PayFast In-App Navigation Interceptor
  const handlePayfastNavStateChange = async (navState) => {
    const currentUrl = navState?.url || "";

    const isSuccess =
      currentUrl.includes("payment=success") ||
      currentUrl.includes("success=true") ||
      currentUrl.includes("status=COMPLETE") ||
      currentUrl.includes("status=complete") ||
      currentUrl.includes("status=success") ||
      currentUrl.includes("/finish") ||
      currentUrl.includes("/complete") ||
      currentUrl.includes("paid=true") ||
      (currentUrl.includes("mobile-return") && currentUrl.includes("status=success"));

    if (isSuccess) {
      setShowPayfastModal(false);
      setIsPayfastLoading(false);
      const booked = payfastModalData?.booking;
      const targetBookingId = booked?._id || booked?.ticketId;
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (targetBookingId) {
          await safeFetch("/payfast/confirm-order", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ bookingId: targetBookingId }),
          });
        }
      } catch (e) {
        console.log("Error confirming event ticket in EventTicketPass:", e);
      }
      Alert.alert("Payment Confirmed! 🥂", "Your ticket has been marked as PAID and your VIP pass is active.");
      fetchMyTickets();
      return;
    }

    if (
      currentUrl.includes("payment=cancel") ||
      currentUrl.includes("/cancel") ||
      currentUrl.includes("cancelled") ||
      currentUrl.includes("cancel=true") ||
      (currentUrl.includes("mobile-return") && currentUrl.includes("status=cancel"))
    ) {
      setShowPayfastModal(false);
      setIsPayfastLoading(false);
      Alert.alert("Cancelled", "PayFast payment was cancelled.");
    }
  };

  const handleClosePayfastModal = () => {
    const booked = payfastModalData?.booking;
    const targetBookingId = booked?._id || booked?.ticketId;
    Alert.alert(
      "PayFast Gateway",
      "Have you completed your payment on PayFast?",
      [
        {
          text: "Yes, I Have Paid",
          onPress: async () => {
            setShowPayfastModal(false);
            setIsPayfastLoading(false);
            try {
              const token = await AsyncStorage.getItem("userToken");
              if (targetBookingId) {
                await safeFetch("/payfast/confirm-order", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                  },
                  body: JSON.stringify({ bookingId: targetBookingId }),
                });
              }
            } catch (e) {}
            fetchMyTickets();
          },
        },
        {
          text: "Leave as Pending",
          style: "destructive",
          onPress: () => {
            setShowPayfastModal(false);
            setIsPayfastLoading(false);
          },
        },
        { text: "Stay in Gateway", style: "cancel" },
      ]
    );
  };

  // Render PayFast Modal
  const renderPayfastModal = () => {
    if (!showPayfastModal || !payfastModalData) return null;

    const { url, fields } = payfastModalData;
    const hiddenInputs = Object.entries(fields || {})
      .map(
        ([key, val]) =>
          `<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(String(val ?? ""))}" />`
      )
      .join("\n");

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <title>The Grand Store • PayFast</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              background-color: #0b0907;
              color: #f5c242;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 24px;
              text-align: center;
            }
            .loader {
              width: 48px;
              height: 48px;
              border: 3px solid rgba(245, 194, 66, 0.2);
              border-top: 3px solid #f5c242;
              border-radius: 50%;
              animation: spin 0.8s linear infinite;
              margin-bottom: 24px;
            }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            h2 {
              font-size: 19px;
              font-weight: 800;
              letter-spacing: 1.5px;
              color: #f5c242;
              text-transform: uppercase;
              margin-bottom: 8px;
            }
            p { font-size: 13px; color: #999; margin-bottom: 18px; }
          </style>
        </head>
        <body>
          <div class="loader"></div>
          <h2>THE GRAND STORE</h2>
          <p>Connecting to PayFast Secure Gateway...</p>
          <form id="payfastForm" action="${url}" method="POST">
            ${hiddenInputs}
          </form>
          <script>
            window.onload = function() {
              setTimeout(function() {
                var f = document.getElementById('payfastForm');
                if (f) f.submit();
              }, 400);
            };
          </script>
        </body>
      </html>
    `;

    return (
      <Modal
        visible={showPayfastModal}
        animationType="slide"
        transparent={false}
        onRequestClose={handleClosePayfastModal}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🔒 PayFast Secure Checkout</Text>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={handleClosePayfastModal}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          {isPayfastLoading && (
            <View style={styles.modalLoadingBar}>
              <ActivityIndicator size="small" color="#c99742" />
              <Text style={styles.modalLoadingText}>Connecting to Gateway...</Text>
            </View>
          )}
          <WebView
            source={{ html: htmlContent }}
            originWhitelist={["*"]}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            onNavigationStateChange={handlePayfastNavStateChange}
            onLoadEnd={() => setIsPayfastLoading(false)}
            onMessage={async (event) => {
              try {
                const msg = JSON.parse(event.nativeEvent.data);
                if (msg.type === "PAYFAST_SUCCESS" || msg.status === "success") {
                  setShowPayfastModal(false);
                  setIsPayfastLoading(false);
                  const booked = payfastModalData?.booking;
                  const targetBookingId = booked?._id || booked?.ticketId;
                  try {
                    const token = await AsyncStorage.getItem("userToken");
                    if (targetBookingId) {
                      await safeFetch("/payfast/confirm-order", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                        body: JSON.stringify({ bookingId: targetBookingId }),
                      });
                    }
                  } catch (e) {}
                  Alert.alert("Payment Confirmed! 🥂", "Your ticket has been marked as PAID and your VIP pass is active.");
                  fetchMyTickets();
                } else if (msg.type === "PAYFAST_CANCEL" || msg.status === "cancel") {
                  setShowPayfastModal(false);
                  setIsPayfastLoading(false);
                  Alert.alert("Cancelled", "PayFast payment was cancelled.");
                }
              } catch (e) {}
            }}
            onShouldStartLoadWithRequest={(request) => {
              const reqUrl = request.url || "";
              if (reqUrl.includes("mobile-return") && reqUrl.includes("status=success")) {
                setShowPayfastModal(false);
                setIsPayfastLoading(false);
                const booked = payfastModalData?.booking;
                const targetBookingId = booked?._id || booked?.ticketId;
                (async () => {
                  try {
                    const token = await AsyncStorage.getItem("userToken");
                    if (targetBookingId) {
                      await safeFetch("/payfast/confirm-order", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                        body: JSON.stringify({ bookingId: targetBookingId }),
                      });
                    }
                  } catch (e) {
                    console.log("Error confirming event order on intercept:", e);
                  }
                  Alert.alert("Payment Confirmed! 🥂", "Your ticket has been marked as PAID and your VIP pass is active.");
                  fetchMyTickets();
                })();
                return false;
              }
              return true;
            }}
            style={{ flex: 1, backgroundColor: "#0b0907" }}
          />
        </SafeAreaView>
      </Modal>
    );
  };

  const renderEnlargedQrModal = () => {
    if (!enlargedQrTicket) return null;
    const b = enlargedQrTicket;
    const eventObj = b.event || {};
    const eventTitle = eventObj.title || "Exclusive Tasting Experience";
    const eventDate = eventObj.date
      ? new Date(eventObj.date).toLocaleDateString("en-US", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "Confirmed Date";

    const qrPayload = JSON.stringify({
      ticketId: b.ticketId,
      gsReference: b.gsReference,
      event: eventTitle,
      date: eventObj.date,
      tier: b.ticketType,
      quantity: b.quantity,
    });

    const qrImageUri =
      b.qrCodeData ||
      `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(qrPayload)}`;

    return (
      <Modal
        visible={!!enlargedQrTicket}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEnlargedQrTicket(null)}
      >
        <SafeAreaView style={styles.enlargedModalOverlay}>
          <TouchableOpacity
            style={styles.enlargedModalBackdropTouch}
            activeOpacity={1}
            onPress={() => setEnlargedQrTicket(null)}
          >
            <View style={styles.enlargedCardContainer} onStartShouldSetResponder={() => true}>
              {/* HEADER */}
              <View style={styles.enlargedCardHeader}>
                <View>
                  <Text style={styles.enlargedBrandTitle}>THE GRAND STORE</Text>
                  <Text style={styles.enlargedBrandSubtitle}>OFFICIAL VIP CELLAR ACCESS PASS</Text>
                </View>
                <TouchableOpacity
                  style={styles.enlargedCloseBtn}
                  onPress={() => setEnlargedQrTicket(null)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Text style={styles.enlargedCloseBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* EVENT TITLE & META */}
              <Text style={styles.enlargedEventTitle} numberOfLines={2}>
                {eventTitle}
              </Text>

              <View style={styles.enlargedMetaRow}>
                <Text style={styles.enlargedMetaText}>{eventDate}</Text>
                {eventObj.startTime && (
                  <Text style={styles.enlargedMetaText}> • {eventObj.startTime}</Text>
                )}
              </View>

              {/* CRISP WHITE QR CODE CONTAINER */}
              <View style={styles.enlargedQrBox}>
                <Image
                  source={{ uri: qrImageUri }}
                  style={styles.enlargedQrImage}
                  resizeMode="contain"
                />
              </View>

              {/* TICKET ID & BADGE */}
              <Text style={styles.enlargedTicketId}>{b.ticketId || "TKT-VERIFIED"}</Text>
              <Text style={styles.enlargedTierBadge}>
                {b.ticketType || "General Reserve"} • {b.quantity} {b.quantity === 1 ? "Guest" : "Guests"}
              </Text>

              {/* BRIGHTNESS / SCANNER HINT */}
              <View style={styles.enlargedScannerHintRow}>
                <Text style={styles.enlargedScannerHintText}>
                  💡 Please maximize screen brightness for optimal scanner recognition at reception.
                </Text>
              </View>

              {/* QUICK ACTION BUTTONS */}
              <View style={styles.enlargedActionsRow}>
                <TouchableOpacity
                  style={styles.enlargedActionBtn}
                  onPress={() => handleDownloadPdf(b)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.enlargedActionBtnIcon}>⬇️</Text>
                  <Text style={styles.enlargedActionBtnText}>Download PDF</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.enlargedActionBtn, styles.enlargedShareBtn]}
                  onPress={() => executeFileShare(b, "qr")}
                  activeOpacity={0.8}
                >
                  <Text style={styles.enlargedActionBtnIcon}>📲</Text>
                  <Text style={[styles.enlargedActionBtnText, { color: "#110e08" }]}>Share Ticket</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.enlargedActionBtn}
                  onPress={() => setEnlargedQrTicket(null)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.enlargedActionBtnIcon}>✕</Text>
                  <Text style={styles.enlargedActionBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    );
  };

  const renderPreparingShareModal = () => {
    if (!isPreparingShare) return null;
    return (
      <Modal visible={isPreparingShare} transparent animationType="fade">
        <View style={styles.shareLoadingOverlay}>
          <View style={styles.shareLoadingCard}>
            <ActivityIndicator size="large" color="#c99742" />
            <Text style={styles.shareLoadingTitle}>PREPARING VIP PASS</Text>
            <Text style={styles.shareLoadingSub}>Attaching scannable QR ticket...</Text>
          </View>
        </View>
      </Modal>
    );
  };

  const renderTicketCard = (b) => {
    const isPaid = b.paymentStatus === "Paid" || b.paymentStatus === "Completed" || b.ticketStatus === "Valid";
    const isBankTransfer = b.paymentMethod === "Bank Transfer";
    const awaitingProof = isBankTransfer && b.bankTransferStatus === "Awaiting_Proof";
    const awaitingApproval = isBankTransfer && b.bankTransferStatus === "Awaiting_Approval";
    const isRejected = b.bankTransferStatus === "Rejected" || b.paymentStatus === "Failed";

    const eventObj = b.event || {};
    const eventDate = eventObj.date
      ? new Date(eventObj.date).toLocaleDateString("en-US", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "Date Confirmed";

    return (
      <View key={b._id || b.ticketId} style={styles.passCard}>
        {/* GOLD NOTCH PERFORATION ACCENT */}
        <View style={styles.passHeader}>
          <View style={styles.passHeaderTop}>
            <Text style={styles.brandSubtitle}>THE GRAND STORE</Text>
            <View
              style={[
                styles.statusPill,
                isPaid && styles.statusPillPaid,
                awaitingProof && styles.statusPillPending,
                awaitingApproval && styles.statusPillReview,
                isRejected && styles.statusPillRejected,
              ]}
            >
              <Text
                style={[
                  styles.statusPillText,
                  isPaid && styles.statusPillTextPaid,
                  awaitingProof && styles.statusPillTextPending,
                  awaitingApproval && styles.statusPillTextReview,
                  isRejected && styles.statusPillTextRejected,
                ]}
              >
                {isPaid
                  ? "✓ VALID ACCESS PASS"
                  : awaitingApproval
                  ? "🔍 PROOF UNDER REVIEW"
                  : awaitingProof
                  ? "⏳ AWAITING BANK PROOF"
                  : isRejected
                  ? "✕ CANCELLED"
                  : "⏳ PENDING PAYMENT"}
              </Text>
            </View>
          </View>
          <Text style={styles.passEventTitle}>{eventObj.title || "Exclusive Tasting Experience"}</Text>
        </View>

        {/* PERFORATION LINE */}
        <View style={styles.perforationLineContainer}>
          <View style={styles.notchLeft} />
          <View style={styles.dashedLine} />
          <View style={styles.notchRight} />
        </View>

        {/* PASS BODY */}
        <View style={styles.passBody}>
          {/* TICKET ID & REFERENCE */}
          <View style={styles.refRow}>
            <View>
              <Text style={styles.refLabel}>ACCESS TICKET ID</Text>
              <Text style={styles.refValue}>{b.ticketId || "TKT-PENDING"}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.refLabel}>BOOKING REF</Text>
              <Text style={styles.refValueSub}>{b.gsReference || b._id}</Text>
            </View>
          </View>

          {/* DETAILS GRID */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailCol}>
              <Text style={styles.gridLabel}>DATE & TIME</Text>
              <Text style={styles.gridVal}>{eventDate}</Text>
              {eventObj.startTime && (
                <Text style={styles.gridValSub}>
                  {eventObj.startTime} {eventObj.endTime ? `- ${eventObj.endTime}` : ""}
                </Text>
              )}
            </View>

            <View style={styles.detailCol}>
              <Text style={styles.gridLabel}>EXPERIENCE VENUE</Text>
              <Text style={styles.gridVal} numberOfLines={2}>
                {eventObj.location || "The Grand Estate"}
              </Text>
            </View>
          </View>

          <View style={[styles.detailsGrid, { marginTop: 12 }]}>
            <View style={styles.detailCol}>
              <Text style={styles.gridLabel}>PASS TIER</Text>
              <Text style={styles.gridValGold}>{b.ticketType || "General Reserve"}</Text>
            </View>

            <View style={styles.detailCol}>
              <Text style={styles.gridLabel}>GUEST CAPACITY</Text>
              <Text style={styles.gridVal}>{b.quantity} {b.quantity === 1 ? "Guest" : "Guests"}</Text>
            </View>

            <View style={styles.detailCol}>
              <Text style={styles.gridLabel}>TOTAL</Text>
              <Text style={styles.gridValGold}>R{Number(b.totalPrice || 0).toFixed(2)}</Text>
            </View>
          </View>

          {/* REAL VIP QR CODE & DOWNLOAD/SHARE */}
          <View style={styles.qrCodeSection}>
            <TouchableOpacity
              style={styles.qrWrapper}
              onPress={() => setEnlargedQrTicket(b)}
              activeOpacity={0.88}
            >
              <Image
                source={{
                  uri:
                    b.qrCodeData ||
                    `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                      JSON.stringify({
                        ticketId: b.ticketId,
                        gsReference: b.gsReference,
                        event: eventObj.title,
                        tier: b.ticketType,
                        quantity: b.quantity,
                      })
                    )}`,
                }}
                style={styles.qrImage}
                resizeMode="contain"
              />
              <View style={styles.tapToEnlargeBadge}>
                <Text style={styles.tapToEnlargeText}>🔍 Tap to enlarge</Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.barcodeText}>{b.ticketId || b._id}</Text>
            <Text style={styles.qrScanKicker}>OFFICIAL CELLAR VIP ADMISSION PASS</Text>

            {isPaid && (
              <View style={{ width: "100%", gap: 10, marginTop: 14 }}>
                {/* 1. DOWNLOAD VIP PASS (PDF) */}
                <TouchableOpacity
                  style={styles.downloadTicketBtn}
                  onPress={() => handleDownloadPdf(b)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={["#2e2416", "#17130b"]}
                    style={styles.downloadGradient}
                  >
                    <Text style={styles.downloadTicketIcon}>📄</Text>
                    <Text style={styles.downloadTicketText}>DOWNLOAD VIP PASS (PDF)</Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* 2. SHARE TICKET (DIRECT 1-TAP WITH GENERATED QR PHOTO & MESSAGE) */}
                <TouchableOpacity
                  style={[styles.downloadTicketBtn, { borderColor: "#c9a35b" }]}
                  onPress={() => handleSharePass(b)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={["#2b2214", "#15120c"]}
                    style={styles.downloadGradient}
                  >
                    <Text style={styles.downloadTicketIcon}>📲</Text>
                    <Text style={styles.downloadTicketText}>SHARE TICKET</Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* EMAIL BACKUP LINK */}
                <TouchableOpacity
                  style={styles.resendEmailLink}
                  onPress={() => handleResendEmail(b)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.resendEmailLinkText}>✉️ Need a copy in inbox? Email PDF Pass to Gmail</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <Text style={styles.entryInstructions}>
            Present this scannable VIP pass upon arrival. Your host sommelier will verify your digital credentials for cellar access. An official PDF ticket has also been sent to your email.
          </Text>

          {/* BANK TRANSFER PROOF SECTION */}
          {isBankTransfer && awaitingProof && (
            <View style={styles.bankSection}>
              <Text style={styles.bankSectionTitle}>🏛️ STANDARD BANK EFT DETAILS</Text>
              <Text style={styles.bankSectionSub}>
                Please complete an EFT transfer using your booking reference:
              </Text>

              <View style={styles.bankBox}>
                <View style={styles.bankRow}>
                  <Text style={styles.bankRowLabel}>Account Name:</Text>
                  <Text style={styles.bankRowVal}>The Grand Store (Pty) Ltd</Text>
                </View>
                <View style={styles.bankRow}>
                  <Text style={styles.bankRowLabel}>Bank:</Text>
                  <Text style={styles.bankRowVal}>Standard Bank</Text>
                </View>
                <View style={styles.bankRow}>
                  <Text style={styles.bankRowLabel}>Account Number:</Text>
                  <Text style={styles.bankRowVal}>0123456789</Text>
                </View>
                <View style={styles.bankRow}>
                  <Text style={styles.bankRowLabel}>Branch Code:</Text>
                  <Text style={styles.bankRowVal}>051001</Text>
                </View>
                <View style={styles.bankRow}>
                  <Text style={styles.bankRowLabel}>Payment Reference:</Text>
                  <Text style={styles.bankRowValGold}>{b.gsReference}</Text>
                </View>
              </View>

              <Text style={styles.uploadProofLabel}>SUBMIT PAYMENT PROOF URL</Text>
              <View style={styles.proofInputRow}>
                <TextInput
                  style={styles.proofInput}
                  placeholder="https://drive.google.com/... or image link"
                  placeholderTextColor="#666"
                  value={proofUrl}
                  onChangeText={setProofUrl}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.uploadProofBtn}
                  onPress={() => handleUploadProof(b._id)}
                  disabled={uploadingProofId === b._id}
                >
                  {uploadingProofId === b._id ? (
                    <ActivityIndicator size="small" color="#0a0907" />
                  ) : (
                    <Text style={styles.uploadProofBtnText}>Submit</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* PAYFAST PENDING RETRY BUTTON */}
          {!isBankTransfer && !isPaid && (
            <TouchableOpacity
              style={styles.payPendingBtn}
              onPress={() => handlePayPendingTicket(b)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#f5c242", "#c99742"]}
                style={styles.payPendingGradient}
              >
                <Text style={styles.payPendingText}>COMPLETE PAYMENT WITH PAYFAST →</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0907" />
      <AppHeader
        title="EXPERIENCE PASSES"
        isBack={true}
        navigation={navigation}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#c99742"
            colors={["#c99742"]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {justBooked && (
          <View style={styles.bookedBanner}>
            <Text style={styles.bookedBannerIcon}>🥂</Text>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.bookedBannerTitle}>Reservation Recorded!</Text>
              <Text style={styles.bookedBannerSub}>
                Your tasting pass is registered with The Grand Store concierge.
              </Text>
            </View>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color="#c99742" />
            <Text style={styles.loadingText}>Retrieving Access Passes...</Text>
          </View>
        ) : bookings.length > 0 ? (
          bookings.map(renderTicketCard)
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎟️</Text>
            <Text style={styles.emptyTitle}>No Passes Found</Text>
            <Text style={styles.emptySub}>
              You haven't reserved any tasting passes yet. Discover rare winemaker dinners, cellar tastings, and masterclasses.
            </Text>
            <TouchableOpacity
              style={styles.exploreBtn}
              onPress={() => navigation.navigate("EventsHub")}
              activeOpacity={0.8}
            >
              <Text style={styles.exploreBtnText}>Explore Experiences →</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {renderPayfastModal()}
      {renderEnlargedQrModal()}
      {renderPreparingShareModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0907",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  loadingCenter: {
    paddingVertical: 60,
    alignItems: "center",
  },
  loadingText: {
    color: "#c99742",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 14,
    letterSpacing: 0.8,
  },
  bookedBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(201, 151, 66, 0.14)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.35)",
    padding: 14,
    marginBottom: 16,
  },
  bookedBannerIcon: {
    fontSize: 26,
  },
  bookedBannerTitle: {
    color: "#f5c242",
    fontSize: 14,
    fontWeight: "800",
  },
  bookedBannerSub: {
    color: "#ccc",
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 16,
  },

  // PASS CARD (BOARDING PASS LOOK)
  passCard: {
    backgroundColor: "#13100c",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(201, 151, 66, 0.3)",
    overflow: "hidden",
    marginBottom: 22,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  passHeader: {
    backgroundColor: "#1a1611",
    padding: 18,
    paddingBottom: 14,
  },
  passHeaderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  brandSubtitle: {
    color: "#c99742",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  statusPillPaid: {
    backgroundColor: "rgba(76, 217, 100, 0.15)",
    borderColor: "rgba(76, 217, 100, 0.4)",
    borderWidth: 1,
  },
  statusPillPending: {
    backgroundColor: "rgba(245, 194, 66, 0.15)",
    borderColor: "rgba(245, 194, 66, 0.4)",
    borderWidth: 1,
  },
  statusPillReview: {
    backgroundColor: "rgba(90, 150, 255, 0.15)",
    borderColor: "rgba(90, 150, 255, 0.4)",
    borderWidth: 1,
  },
  statusPillRejected: {
    backgroundColor: "rgba(220, 53, 69, 0.15)",
    borderColor: "rgba(220, 53, 69, 0.4)",
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: "#bbb",
  },
  statusPillTextPaid: {
    color: "#4cd964",
  },
  statusPillTextPending: {
    color: "#f5c242",
  },
  statusPillTextReview: {
    color: "#70a6ff",
  },
  statusPillTextRejected: {
    color: "#ff6b6b",
  },
  passEventTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 23,
  },

  // PERFORATION
  perforationLineContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#13100c",
    height: 24,
    overflow: "hidden",
  },
  notchLeft: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#0a0907",
    marginLeft: -10,
    borderWidth: 1.5,
    borderColor: "rgba(201, 151, 66, 0.3)",
  },
  notchRight: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#0a0907",
    marginRight: -10,
    borderWidth: 1.5,
    borderColor: "rgba(201, 151, 66, 0.3)",
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.2)",
    borderStyle: "dashed",
    marginHorizontal: 8,
  },

  // PASS BODY
  passBody: {
    padding: 18,
    paddingTop: 8,
  },
  refRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  refLabel: {
    color: "#777",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  refValue: {
    color: "#f5c242",
    fontSize: 14,
    fontWeight: "900",
    fontFamily: Platform.OS === "android" ? "monospace" : "Menlo",
    marginTop: 2,
  },
  refValueSub: {
    color: "#bbb",
    fontSize: 11,
    fontWeight: "600",
    fontFamily: Platform.OS === "android" ? "monospace" : "Menlo",
    marginTop: 2,
  },
  detailsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  detailCol: {
    flex: 1,
    paddingRight: 6,
  },
  gridLabel: {
    color: "#888",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  gridVal: {
    color: "#fff",
    fontSize: 12.5,
    fontWeight: "700",
  },
  gridValSub: {
    color: "#aaa",
    fontSize: 11,
    marginTop: 2,
  },
  gridValGold: {
    color: "#f5c242",
    fontSize: 13,
    fontWeight: "800",
  },

  // QR CODE & PASS SECTION
  qrCodeSection: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
  },
  qrWrapper: {
    padding: 10,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#c99742",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  qrImage: {
    width: 170,
    height: 170,
    borderRadius: 6,
  },
  qrScanKicker: {
    color: "#c99742",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginTop: 8,
    marginBottom: 4,
  },
  downloadTicketBtn: {
    marginTop: 12,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.4)",
    width: "100%",
  },
  downloadGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    paddingHorizontal: 16,
    gap: 8,
  },
  downloadTicketIcon: {
    fontSize: 16,
  },
  downloadTicketText: {
    color: "#f5c242",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  barcodeSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
  },
  barcodeLines: {
    flexDirection: "row",
    height: 44,
    alignItems: "center",
    gap: 3,
  },
  barcodeBar: {
    height: "100%",
    borderRadius: 1,
  },
  barcodeText: {
    color: "#888",
    fontSize: 10,
    fontFamily: Platform.OS === "android" ? "monospace" : "Menlo",
    letterSpacing: 3,
    marginTop: 6,
  },
  entryInstructions: {
    color: "#777",
    fontSize: 10.5,
    textAlign: "center",
    lineHeight: 15,
    marginTop: 12,
    fontStyle: "italic",
  },

  // BANK TRANSFER SECTION
  bankSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  bankSectionTitle: {
    color: "#f5c242",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  bankSectionSub: {
    color: "#aaa",
    fontSize: 11,
    marginBottom: 10,
  },
  bankBox: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.2)",
    marginBottom: 14,
  },
  bankRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.04)",
  },
  bankRowLabel: {
    color: "#888",
    fontSize: 11,
  },
  bankRowVal: {
    color: "#fff",
    fontSize: 11.5,
    fontWeight: "700",
  },
  bankRowValGold: {
    color: "#f5c242",
    fontSize: 12,
    fontWeight: "900",
    fontFamily: Platform.OS === "android" ? "monospace" : "Menlo",
  },
  uploadProofLabel: {
    color: "#c99742",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  proofInputRow: {
    flexDirection: "row",
    gap: 8,
  },
  proofInput: {
    flex: 1,
    height: 42,
    backgroundColor: "#0a0907",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 8,
    paddingHorizontal: 12,
    color: "#fff",
    fontSize: 12,
  },
  uploadProofBtn: {
    backgroundColor: "#c99742",
    borderRadius: 8,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  uploadProofBtnText: {
    color: "#0a0907",
    fontSize: 12,
    fontWeight: "900",
  },

  // PAY PENDING
  payPendingBtn: {
    marginTop: 16,
    borderRadius: 10,
    overflow: "hidden",
  },
  payPendingGradient: {
    height: 46,
    justifyContent: "center",
    alignItems: "center",
  },
  payPendingText: {
    color: "#0a0907",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.6,
  },

  // EMPTY STATE
  emptyContainer: {
    paddingVertical: 80,
    alignItems: "center",
    paddingHorizontal: 30,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  emptySub: {
    color: "#888",
    fontSize: 12.5,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  exploreBtn: {
    backgroundColor: "rgba(201, 151, 66, 0.15)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#c99742",
  },
  exploreBtnText: {
    color: "#f5c242",
    fontSize: 13,
    fontWeight: "800",
  },

  // PAYFAST MODAL
  modalContainer: {
    flex: 1,
    backgroundColor: "#0b0907",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#13100c",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(201, 151, 66, 0.3)",
  },
  modalTitle: {
    color: "#f5c242",
    fontSize: 14,
    fontWeight: "800",
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  modalLoadingBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(201, 151, 66, 0.12)",
    paddingVertical: 6,
    gap: 8,
  },
  modalLoadingText: {
    color: "#f5c242",
    fontSize: 11,
    fontWeight: "700",
  },
  tapToEnlargeBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(201, 151, 66, 0.15)",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginTop: 6,
    borderWidth: 0.5,
    borderColor: "rgba(201, 151, 66, 0.3)",
  },
  tapToEnlargeText: {
    color: "#b88a38",
    fontSize: 9.5,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  resendEmailLink: {
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  resendEmailLinkText: {
    color: "#a39580",
    fontSize: 11,
    fontWeight: "600",
    textDecorationLine: "underline",
  },

  // ENLARGED QR MODAL STYLES
  enlargedModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(5, 4, 3, 0.94)",
    justifyContent: "center",
    alignItems: "center",
  },
  enlargedModalBackdropTouch: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  enlargedCardContainer: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#14110c",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(201, 151, 66, 0.6)",
    padding: 20,
    alignItems: "center",
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.7,
    shadowRadius: 16,
  },
  enlargedCardHeader: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  enlargedBrandTitle: {
    color: "#f5c242",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  enlargedBrandSubtitle: {
    color: "#aaa",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 1,
  },
  enlargedCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  enlargedCloseBtnText: {
    color: "#f5c242",
    fontSize: 16,
    fontWeight: "700",
  },
  enlargedEventTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 4,
  },
  enlargedMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  enlargedMetaText: {
    color: "#c99742",
    fontSize: 11.5,
    fontWeight: "600",
  },
  enlargedQrBox: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 2,
    borderColor: "#c99742",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  enlargedQrImage: {
    width: 240,
    height: 240,
    borderRadius: 8,
  },
  enlargedTicketId: {
    color: "#f5c242",
    fontSize: 14,
    fontWeight: "900",
    fontFamily: Platform.OS === "android" ? "monospace" : "Menlo",
    letterSpacing: 2,
    marginTop: 14,
  },
  enlargedTierBadge: {
    color: "#4cd964",
    fontSize: 11.5,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginTop: 3,
  },
  enlargedScannerHintRow: {
    backgroundColor: "rgba(201, 151, 66, 0.1)",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.25)",
    width: "100%",
  },
  enlargedScannerHintText: {
    color: "#ddd",
    fontSize: 10.5,
    textAlign: "center",
    lineHeight: 15,
  },
  enlargedActionsRow: {
    flexDirection: "row",
    width: "100%",
    gap: 10,
    marginTop: 16,
  },
  enlargedActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#201a11",
    borderWidth: 1,
    borderColor: "#c99742",
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
  },
  enlargedShareBtn: {
    backgroundColor: "#c99742",
    borderColor: "#e5b85c",
  },
  enlargedActionBtnIcon: {
    fontSize: 14,
  },
  enlargedActionBtnText: {
    color: "#f5c242",
    fontSize: 11.5,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  shareLoadingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  shareLoadingCard: {
    backgroundColor: "#19140e",
    borderWidth: 1.5,
    borderColor: "#c99742",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    width: "85%",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
  },
  shareLoadingTitle: {
    color: "#f5c242",
    fontSize: 13.5,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginTop: 16,
  },
  shareLoadingSub: {
    color: "#aaa",
    fontSize: 11.5,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 16,
  },
});
