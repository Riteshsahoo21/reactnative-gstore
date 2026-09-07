/* eslint-disable prettier/prettier */
/* eslint-disable quotes */
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Alert,
  Dimensions,
  Platform,
  StatusBar,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { WebView } from "react-native-webview";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE, getActiveServerHost } from "../../resources/data/Constants";

const SOMMELIER_CREST = require("../../resources/images/sommelier_crest.jpg");

const { width } = Dimensions.get("window");

const API_CANDIDATES = [
  API_BASE,
  "http://localhost:5000/api",
  "http://192.168.1.9:5000/api",
  "http://10.0.2.2:5000/api",
];

const resolveEventImage = (img) => {
  if (!img) return "https://ik.imagekit.io/thegrandstore/bg.webp";
  if (img.startsWith("http")) return img;
  return `${getActiveServerHost()}/${img.replace(/^\//, "")}`;
};

const getTierAvailability = (tier) => {
  if (!tier) return 0;
  const qty = Number(tier.quantity) || 0;
  const sold = Number(tier.sold) || 0;
  const res = Number(tier.reserved) || 0;
  return Math.max(0, qty - sold - res);
};

const escapeHtml = (unsafe) => {
  return String(unsafe || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

export default function EventDetails({ route, navigation }) {
  const eventId = route?.params?.eventId || route?.params?.id;
  const initialEvent = route?.params?.event;

  const [event, setEvent] = useState(initialEvent || null);
  const [loading, setLoading] = useState(!initialEvent);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("payfast"); // 'payfast' or 'bank_transfer'
  const [bookingLoading, setBookingLoading] = useState(false);
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  // PayFast In-App Modal State
  const [showPayfastModal, setShowPayfastModal] = useState(false);
  const [payfastModalData, setPayfastModalData] = useState(null);
  const [isPayfastLoading, setIsPayfastLoading] = useState(true);
  const webViewRef = useRef(null);

  // Safe API helper
  const safeFetch = async (endpoint, options = {}) => {
    for (const base of API_CANDIDATES) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);
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

  const fetchEventDetails = useCallback(async () => {
    if (!eventId) return;
    try {
      const res = await safeFetch(`/events/${eventId}`);
      if (res && res.ok) {
        const data = await res.json();
        setEvent(data);
        if (data.ticketTiers && data.ticketTiers.length > 0) {
          const availableTier = data.ticketTiers.find((t) => getTierAvailability(t) > 0) || data.ticketTiers[0];
          setSelectedTicket(availableTier);
        }
      }
    } catch (err) {
      console.log("Error loading event:", err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchEventDetails();
  }, [fetchEventDetails]);

  // Handle Waitlist submission
  const handleJoinWaitlist = async () => {
    const token = await AsyncStorage.getItem("userToken");
    if (!token) {
      Alert.alert("Sign In Required", "Please sign in to your Grand Store account to join the waitlist.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => navigation.navigate("SignIn") },
      ]);
      return;
    }

    setWaitlistLoading(true);
    try {
      const res = await safeFetch(`/events/${event._id}/waitlist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res && res.ok) {
        const data = await res.json();
        Alert.alert("Waitlist Joined! 🎟️", data.message || "You have been added to the priority waitlist for this experience.");
      } else {
        const errData = await res?.json();
        Alert.alert("Notice", errData?.message || "Could not join waitlist at this moment.");
      }
    } catch (e) {
      Alert.alert("Connection Error", "Please verify your internet connection and try again.");
    } finally {
      setWaitlistLoading(false);
    }
  };

  // Handle Ticket Booking & Payment Launch
  const handleBookTickets = async () => {
    const token = await AsyncStorage.getItem("userToken");
    if (!token) {
      Alert.alert("Sign In Required", "Please sign in to your Grand Store account to reserve event tickets.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => navigation.navigate("SignIn") },
      ]);
      return;
    }

    if (!selectedTicket) {
      Alert.alert("Select Tier", "Please select a ticket tier to continue.");
      return;
    }

    const available = getTierAvailability(selectedTicket);
    if (available < quantity) {
      Alert.alert("Limited Availability", `Only ${available} tickets remain in the ${selectedTicket.name} tier.`);
      return;
    }

    setBookingLoading(true);

    try {
      // 1. Create Pending Booking
      const bookRes = await safeFetch(`/events/${event._id}/book`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ticketTierId: selectedTicket._id,
          ticketType: selectedTicket.name,
          quantity,
          paymentMethod: paymentMethod === "bank_transfer" ? "Bank Transfer" : "PayFast",
        }),
      });

      if (!bookRes || !bookRes.ok) {
        const errJson = await bookRes?.json();
        Alert.alert("Booking Error", errJson?.message || "Failed to create reservation. Please try again.");
        setBookingLoading(false);
        return;
      }

      const booking = await bookRes.json();

      // If Bank Transfer: navigate directly to Ticket Pass with instructions
      if (paymentMethod === "bank_transfer") {
        setBookingLoading(false);
        navigation.navigate("EventTicketPass", {
          bookingId: booking._id,
          booking,
          justBooked: true,
          mode: "bank_transfer",
        });
        return;
      }

      // If PayFast: generate payment payload and open in-app WebView
      const pfRes = await safeFetch("/payfast/generate-event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bookingId: booking._id, isMobile: true }),
      });

      if (!pfRes || !pfRes.ok) {
        const pfErr = await pfRes?.json();
        Alert.alert("Payment Gateway Error", pfErr?.message || "Failed to launch PayFast payment gateway.");
        setBookingLoading(false);
        return;
      }

      const pfData = await pfRes.json();
      if (pfData && pfData.url && pfData.data) {
        setPayfastModalData({
          url: pfData.url,
          fields: pfData.data,
          booking,
        });
        setShowPayfastModal(true);
        setIsPayfastLoading(true);
      } else {
        Alert.alert("Error", "Invalid response from PayFast gateway.");
      }
    } catch (err) {
      console.log("Error in handleBookTickets:", err);
      Alert.alert("Booking Failed", "Network error occurred while reserving tickets. Please retry.");
    } finally {
      setBookingLoading(false);
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
      const bookingTargetId = booked?._id || booked?.ticketId;

      // Confirm payment directly with backend to update MongoDB & Admin
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (bookingTargetId) {
          await safeFetch("/payfast/confirm-order", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ bookingId: bookingTargetId }),
          });
        }
      } catch (e) {
        console.log("Error confirming event payment on backend:", e);
      }

      Alert.alert(
        "Payment Confirmed! 🥂",
        "Your PayFast payment has been processed successfully. Your tasting pass is now confirmed.",
        [
          {
            text: "View My Pass",
            onPress: () => {
              navigation.navigate("EventTicketPass", {
                bookingId: booked?._id,
                booking: { ...booked, paymentStatus: "Paid", ticketStatus: "Valid" },
                justBooked: true,
              });
            },
          },
        ]
      );
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
      Alert.alert("Payment Cancelled", "The PayFast payment was cancelled. Your reservation remains pending.");
    }
  };

  const handleClosePayfastModal = () => {
    const booked = payfastModalData?.booking;
    const bookingTargetId = booked?._id || booked?.ticketId;
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
              if (bookingTargetId) {
                await safeFetch("/payfast/confirm-order", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                  },
                  body: JSON.stringify({ bookingId: bookingTargetId }),
                });
              }
            } catch (e) {}
            navigation.navigate("EventTicketPass", {
              bookingId: booked?._id,
              booking: { ...booked, paymentStatus: "Paid", ticketStatus: "Valid" },
              justBooked: true,
            });
          },
        },
        {
          text: "Leave as Pending",
          style: "destructive",
          onPress: () => {
            setShowPayfastModal(false);
            setIsPayfastLoading(false);
            navigation.navigate("EventTicketPass", {
              bookingId: booked?._id,
              booking: booked,
            });
          },
        },
        { text: "Stay in Gateway", style: "cancel" },
      ]
    );
  };

  // Render PayFast In-App Modal
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
            p {
              font-size: 13px;
              color: #999;
              line-height: 1.5;
              max-width: 280px;
              margin-bottom: 18px;
            }
            .badge {
              display: inline-block;
              padding: 6px 14px;
              background: rgba(245, 194, 66, 0.1);
              border: 1px solid rgba(245, 194, 66, 0.3);
              border-radius: 20px;
              font-size: 11px;
              font-weight: 700;
              color: #f5c242;
            }
          </style>
        </head>
        <body>
          <div class="loader"></div>
          <h2>THE GRAND STORE</h2>
          <p>Connecting to PayFast Secure Gateway for Event Experience Pass...</p>
          <div class="badge">🔒 256-Bit Encrypted Checkout</div>
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
            <View style={styles.modalHeaderLeft}>
              <Text style={styles.modalLockIcon}>🔒</Text>
              <View>
                <Text style={styles.modalTitle}>PayFast Secure Gateway</Text>
                <Text style={styles.modalSubtitle}>Event Pass Booking • Cards & Instant EFT</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={handleClosePayfastModal}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          {isPayfastLoading && (
            <View style={styles.modalLoadingBar}>
              <ActivityIndicator size="small" color="#c99742" />
              <Text style={styles.modalLoadingText}>Securing Connection...</Text>
            </View>
          )}

          <WebView
            ref={webViewRef}
            source={{ html: htmlContent }}
            originWhitelist={["*"]}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            scalesPageToFit={true}
            onNavigationStateChange={handlePayfastNavStateChange}
            onLoadEnd={() => setIsPayfastLoading(false)}
            onMessage={async (event) => {
              try {
                const msg = JSON.parse(event.nativeEvent.data);
                if (msg.type === "PAYFAST_SUCCESS" || msg.status === "success") {
                  setShowPayfastModal(false);
                  setIsPayfastLoading(false);
                  const booked = payfastModalData?.booking;
                  const bookingTargetId = booked?._id || booked?.ticketId;
                  try {
                    const token = await AsyncStorage.getItem("userToken");
                    if (bookingTargetId) {
                      await safeFetch("/payfast/confirm-order", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                        body: JSON.stringify({ bookingId: bookingTargetId }),
                      });
                    }
                  } catch (e) {}
                  Alert.alert(
                    "Payment Confirmed! 🥂",
                    "Your PayFast payment has been processed successfully. Your tasting pass is now confirmed.",
                    [
                      {
                        text: "View My Pass",
                        onPress: () => {
                          navigation.navigate("EventTicketPass", {
                            bookingId: booked?._id,
                            booking: { ...booked, paymentStatus: "Paid", ticketStatus: "Valid" },
                            justBooked: true,
                          });
                        },
                      },
                    ]
                  );
                } else if (msg.type === "PAYFAST_CANCEL" || msg.status === "cancel") {
                  setShowPayfastModal(false);
                  setIsPayfastLoading(false);
                  Alert.alert("Payment Cancelled", "The PayFast payment was cancelled.");
                }
              } catch (e) {}
            }}
            onShouldStartLoadWithRequest={(request) => {
              const reqUrl = request.url || "";
              if (reqUrl.includes("mobile-return") && reqUrl.includes("status=success")) {
                setShowPayfastModal(false);
                setIsPayfastLoading(false);
                const booked = payfastModalData?.booking;
                const bookingTargetId = booked?._id || booked?.ticketId;
                (async () => {
                  try {
                    const token = await AsyncStorage.getItem("userToken");
                    if (bookingTargetId) {
                      await safeFetch("/payfast/confirm-order", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                        body: JSON.stringify({ bookingId: bookingTargetId }),
                      });
                    }
                  } catch (e) {
                    console.log("Error confirming event in onShouldStartLoadWithRequest:", e);
                  }
                })();

                Alert.alert(
                  "Payment Confirmed! 🥂",
                  "Your PayFast payment has been processed successfully. Your tasting pass is now confirmed.",
                  [
                    {
                      text: "View My Pass",
                      onPress: () => {
                        navigation.navigate("EventTicketPass", {
                          bookingId: booked?._id,
                          booking: { ...booked, paymentStatus: "Paid", ticketStatus: "Valid" },
                          justBooked: true,
                        });
                      },
                    },
                  ]
                );
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

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0907" />
        <ActivityIndicator size="large" color="#c99742" />
        <Text style={styles.loadingText}>Unveiling Experience...</Text>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0a0907" />
        <Image source={SOMMELIER_CREST} style={styles.errorCrest} resizeMode="contain" />
        <Text style={styles.errorTitle}>Experience Not Found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Back to Events</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const formattedDate = event.date
    ? new Date(event.date).toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Date TBA";

  const totalAvailableTickets = (event.ticketTiers || []).reduce(
    (acc, tier) => acc + getTierAvailability(tier),
    0
  );
  const isSoldOut = (event.ticketTiers && event.ticketTiers.length > 0) && totalAvailableTickets === 0;
  const statusLower = String(event.status || "").toLowerCase();
  const isPastDate = event.date && new Date(event.date) < new Date(new Date().setHours(0, 0, 0, 0)) && statusLower !== "ongoing";
  const isEventClosed =
    ["completed", "closed", "cancelled", "concluded", "ended"].includes(statusLower) ||
    event.bookingClosed === true ||
    event.isClosed === true ||
    isPastDate ||
    isSoldOut;
  const isBookable = !isEventClosed;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0907" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO BANNER SECTION */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: resolveEventImage(event.image) }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["rgba(10, 9, 7, 0.3)", "rgba(10, 9, 7, 0.7)", "#0a0907"]}
            style={styles.heroGradient}
          />

          {/* Floating Back Button */}
          <TouchableOpacity
            style={styles.floatingBack}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={styles.floatingBackText}>‹</Text>
          </TouchableOpacity>

          {/* Top Badges */}
          <View style={styles.heroBadgesRow}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{event.type || "TASTING"}</Text>
            </View>
            <View style={styles.formatBadge}>
              <Text style={styles.formatBadgeText}>
                {event.format === "Virtual" ? "🌐 VIRTUAL" : "📍 IN-PERSON"}
              </Text>
            </View>
            {isEventClosed && (
              <View style={styles.heroClosedBadge}>
                <Text style={styles.heroClosedBadgeText}>
                  {isSoldOut ? "SOLD OUT" : "BOOKING CLOSED"}
                </Text>
              </View>
            )}
          </View>

          {/* Hero Content Overlay */}
          <View style={styles.heroTextOverlay}>
            <Text style={styles.heroTitle}>{event.title}</Text>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>📅</Text>
                <Text style={styles.metaText}>{formattedDate}</Text>
              </View>
              {event.startTime && (
                <View style={styles.metaItem}>
                  <Text style={styles.metaIcon}>⏰</Text>
                  <Text style={styles.metaText}>
                    {event.startTime} {event.endTime ? `- ${event.endTime}` : ""}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>📍</Text>
              <Text style={styles.metaText} numberOfLines={1}>
                {event.format === "Virtual"
                  ? "Virtual Global Experience"
                  : `${event.location || "Venue"}${event.city ? `, ${event.city}` : ""}`}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bodyWrapper}>
          {/* HOST / SOMMELIER SPOTLIGHT */}
          <LinearGradient
            colors={["#1c1711", "#110f0c"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hostCard}
          >
            <View style={styles.hostAvatarWrap}>
              <Image
                source={
                  event.hostImage || event.hostAvatar
                    ? { uri: resolveEventImage(event.hostImage || event.hostAvatar) }
                    : SOMMELIER_CREST
                }
                style={styles.hostAvatarImage}
                resizeMode="cover"
              />
              <View style={styles.hostVerifiedBadge}>
                <Text style={styles.hostVerifiedText}>★</Text>
              </View>
            </View>
            <View style={styles.hostInfo}>
              <View style={styles.hostHeaderRow}>
                <Text style={styles.hostLabel}>CURATED & HOSTED BY</Text>
                <View style={styles.hostMasterBadge}>
                  <Text style={styles.hostMasterBadgeText}>CELLAR MASTER</Text>
                </View>
              </View>
              <Text style={styles.hostName}>{event.hostName || "Grand Store Sommelier"}</Text>
              <Text style={styles.hostTitle}>
                {event.hostTitle || "Master of Wine & Cellar Curator"}
              </Text>
              <View style={styles.hostPledge}>
                <Text style={styles.hostPledgeText}>
                  ⚜️ Guiding your exclusive tasting flight & vintage cellar pairings
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* ABOUT THE EXPERIENCE */}
          <View style={styles.sectionCard}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Text style={styles.sectionHeading}>ABOUT THE EXPERIENCE</Text>
              {isEventClosed && (
                <View style={styles.closedStatusTag}>
                  <Text style={styles.closedStatusTagText}>
                    {isSoldOut ? "SOLD OUT" : "BOOKING CLOSED"}
                  </Text>
                </View>
              )}
            </View>

            {isEventClosed && (
              <View style={styles.closedNoticeBox}>
                <Text style={styles.closedNoticeIcon}>🔒</Text>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.closedNoticeTitle}>
                    {isSoldOut ? "Session Fully Booked" : "Booking Is Closed"}
                  </Text>
                  <Text style={styles.closedNoticeDesc}>
                    {statusLower === "completed"
                      ? "This cellar tasting experience has concluded and bookings are no longer accepted."
                      : isSoldOut
                      ? "All passes for this session are currently sold out. Join our exclusive waitlist below to be notified if spots open."
                      : "Bookings for this session are currently closed. Please browse our other available cellar tastings."}
                  </Text>
                </View>
              </View>
            )}

            <Text style={styles.descriptionText}>{event.description}</Text>

            {event.capacity && (
              <View style={styles.capacityNotice}>
                <Text style={styles.capacityNoticeIcon}>👥</Text>
                <Text style={styles.capacityNoticeText}>
                  Intimate setting strictly limited to {event.capacity} distinguished guests.
                </Text>
              </View>
            )}
          </View>

          {/* TASTING JOURNEY / BOTTLE LINEUP */}
          {event.tastingJourney && event.tastingJourney.length > 0 && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeading}>TASTING JOURNEY FLIGHT</Text>
              <Text style={styles.sectionSub}>
                Exclusive rare vintages & spirits presented during this session:
              </Text>

              {event.tastingJourney.map((bottle, idx) => (
                <View key={idx} style={styles.tastingFlightRow}>
                  <View style={styles.flightNumberBadge}>
                    <Text style={styles.flightNumberText}>{idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.flightName}>{bottle}</Text>
                    <Text style={styles.flightNote}>Flight Glass • Sommelier Poured</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* TICKET TIER SELECTION */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>SELECT TICKET TIER</Text>
              {isEventClosed ? (
                <View style={styles.closedTagPill}>
                  <Text style={styles.closedTagPillText}>
                    {isSoldOut ? "SOLD OUT" : "CLOSED"}
                  </Text>
                </View>
              ) : (
                <Text style={styles.availabilityTotalText}>
                  {totalAvailableTickets} passes remaining
                </Text>
              )}
            </View>

            {event.ticketTiers && event.ticketTiers.length > 0 ? (
              event.ticketTiers.map((tier) => {
                const available = getTierAvailability(tier);
                const isSelected = selectedTicket?._id === tier._id;
                const isTierSoldOut = available === 0 || isEventClosed;

                return (
                  <TouchableOpacity
                    key={tier._id || tier.name}
                    style={[
                      styles.tierCard,
                      isSelected && styles.tierCardSelected,
                      isTierSoldOut && styles.tierCardSoldOut,
                    ]}
                    onPress={() => {
                      if (!isTierSoldOut && isBookable) {
                        setSelectedTicket(tier);
                        setQuantity((prev) => Math.min(prev, available));
                      }
                    }}
                    activeOpacity={isTierSoldOut ? 1 : 0.8}
                  >
                    <View style={styles.tierTopRow}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.tierTitleRow}>
                          <Text
                            style={[
                              styles.tierName,
                              isSelected && { color: "#f5c242" },
                              isTierSoldOut && { color: "#888" },
                            ]}
                          >
                            {tier.name}
                          </Text>
                          {isTierSoldOut && (
                            <View style={styles.soldOutPill}>
                              <Text style={styles.soldOutPillText}>
                                {isSoldOut ? "SOLD OUT" : "CLOSED"}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.tierRemaining}>
                          {isTierSoldOut ? (isSoldOut ? "No passes remaining" : "Booking closed") : `${available} passes remaining`}
                        </Text>
                      </View>

                      <View style={styles.tierPriceBox}>
                        <Text style={styles.tierPrice}>
                          R{Number(tier.price || 0).toFixed(2)}
                        </Text>
                        <Text style={styles.tierPriceSub}>per guest</Text>
                      </View>
                    </View>

                    {tier.benefits && tier.benefits.length > 0 && (
                      <View style={styles.benefitsBox}>
                        {tier.benefits.map((benefit, bIdx) => (
                          <View key={bIdx} style={styles.benefitRow}>
                            <Text style={styles.benefitCheck}>✓</Text>
                            <Text style={styles.benefitText}>{benefit}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {isSelected && (
                      <View style={styles.tierSelectedPill}>
                        <Text style={styles.tierSelectedPillText}>SELECTED PASS TIER</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            ) : (
              <Text style={styles.noTiersText}>No ticket tiers available for this event.</Text>
            )}

            {/* QUANTITY PICKER (When a tier with availability is selected) */}
            {selectedTicket && getTierAvailability(selectedTicket) > 0 && (
              <View style={styles.qtyContainer}>
                <View>
                  <Text style={styles.qtyLabel}>GUEST PASSES</Text>
                  <Text style={styles.qtySub}>{selectedTicket.name}</Text>
                </View>

                <View style={styles.qtyCounterBox}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                  >
                    <Text style={styles.qtyBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyVal}>{quantity}</Text>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() =>
                      setQuantity((q) =>
                        Math.min(getTierAvailability(selectedTicket), Math.min(10, q + 1))
                      )
                    }
                    disabled={quantity >= getTierAvailability(selectedTicket) || quantity >= 10}
                  >
                    <Text style={styles.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* PAYMENT METHOD SELECTION */}
          {selectedTicket && getTierAvailability(selectedTicket) > 0 && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionHeading}>PAYMENT METHOD</Text>

              {/* Option A: PayFast */}
              <TouchableOpacity
                style={[
                  styles.paymentCard,
                  paymentMethod === "payfast" && styles.paymentCardSelected,
                ]}
                onPress={() => setPaymentMethod("payfast")}
                activeOpacity={0.8}
              >
                <View style={styles.radioOuter}>
                  {paymentMethod === "payfast" && <View style={styles.radioInner} />}
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={styles.paymentTitleRow}>
                    <Text style={styles.paymentTitle}>PayFast Instant Gateway</Text>
                    <View style={styles.instantBadge}>
                      <Text style={styles.instantBadgeText}>⚡ INSTANT</Text>
                    </View>
                  </View>
                  <Text style={styles.paymentDesc}>
                    Visa, Mastercard, Debit, and Instant EFT. Immediate ticket issuance.
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Option B: Bank Transfer */}
              <TouchableOpacity
                style={[
                  styles.paymentCard,
                  paymentMethod === "bank_transfer" && styles.paymentCardSelected,
                ]}
                onPress={() => setPaymentMethod("bank_transfer")}
                activeOpacity={0.8}
              >
                <View style={styles.radioOuter}>
                  {paymentMethod === "bank_transfer" && <View style={styles.radioInner} />}
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={styles.paymentTitleRow}>
                    <Text style={styles.paymentTitle}>Manual Bank Transfer (EFT)</Text>
                    <View style={styles.eftBadge}>
                      <Text style={styles.eftBadgeText}>🏛️ EFT</Text>
                    </View>
                  </View>
                  <Text style={styles.paymentDesc}>
                    Transfer to Standard Bank. Ticket confirmed upon review of payment proof.
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* TOTAL & BOOKING CTA */}
          {isEventClosed && !isSoldOut ? (
            <View style={styles.closedBottomBar}>
              <View style={styles.closedBottomInfo}>
                <Text style={styles.closedBottomTitle}>
                  {statusLower === "completed" ? "EXPERIENCE CONCLUDED" : "BOOKING CLOSED"}
                </Text>
                <Text style={styles.closedBottomSub}>
                  {statusLower === "completed"
                    ? "This tasting has concluded. Tasting notes & flights are shown above."
                    : "Passes for this session are currently closed."}
                </Text>
              </View>
              <View style={styles.closedBottomBtn}>
                <Text style={styles.closedBottomBtnText}>CLOSED</Text>
              </View>
            </View>
          ) : isSoldOut ? (
            <TouchableOpacity
              style={styles.waitlistBtn}
              onPress={handleJoinWaitlist}
              disabled={waitlistLoading}
              activeOpacity={0.85}
            >
              {waitlistLoading ? (
                <ActivityIndicator color="#0a0907" />
              ) : (
                <Text style={styles.waitlistBtnText}>JOIN EXCLUSIVE WAITLIST</Text>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.bottomBar}>
              <View style={styles.totalBox}>
                <Text style={styles.totalLabel}>TOTAL AMOUNT</Text>
                <Text style={styles.totalPrice}>
                  R
                  {selectedTicket
                    ? (Number(selectedTicket.price || 0) * quantity).toFixed(2)
                    : "0.00"}
                </Text>
                <Text style={styles.totalSub}>VAT & Service Fee Included</Text>
              </View>

              <TouchableOpacity
                style={styles.bookBtn}
                onPress={handleBookTickets}
                disabled={bookingLoading || !selectedTicket}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={["#f5c242", "#c99742", "#9e7428"]}
                  style={styles.bookGradient}
                >
                  {bookingLoading ? (
                    <ActivityIndicator color="#0a0907" />
                  ) : (
                    <Text style={styles.bookBtnText}>
                      {paymentMethod === "payfast"
                        ? "CONFIRM & PAY WITH PAYFAST"
                        : "RESERVE & PAY VIA EFT"}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* In-App PayFast Modal */}
      {renderPayfastModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0907",
  },
  scrollContent: {
    paddingBottom: 60,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0a0907",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    color: "#c99742",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: 16,
  },
  errorCrest: {
    width: 68,
    height: 68,
    borderRadius: 34,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "rgba(201, 151, 66, 0.45)",
  },
  errorTitle: {
    color: "#f8f5ee",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: "rgba(201, 151, 66, 0.15)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#c99742",
  },
  backBtnText: {
    color: "#f5c242",
    fontWeight: "700",
  },

  // HERO BANNER
  heroContainer: {
    width: "100%",
    height: 380,
    position: "relative",
    justifyContent: "flex-end",
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  floatingBack: {
    position: "absolute",
    top: 20,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(10, 9, 7, 0.65)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  floatingBackText: {
    color: "#f8f5ee",
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "300",
  },
  heroBadgesRow: {
    position: "absolute",
    top: 24,
    right: 16,
    flexDirection: "row",
    gap: 8,
    zIndex: 10,
  },
  typeBadge: {
    backgroundColor: "rgba(201, 151, 66, 0.25)",
    borderWidth: 1,
    borderColor: "#c99742",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: {
    color: "#f5c242",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  formatBadge: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  formatBadgeText: {
    color: "#ddd",
    fontSize: 10,
    fontWeight: "700",
  },
  heroTextOverlay: {
    padding: 18,
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 30,
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginBottom: 6,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaIcon: {
    fontSize: 13,
    marginRight: 6,
  },
  metaText: {
    color: "#c2bab0",
    fontSize: 12.5,
    fontWeight: "600",
  },

  // BODY WRAPPER
  bodyWrapper: {
    padding: 16,
  },

  // HOST SPOTLIGHT
  hostCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.32)",
    padding: 14,
    marginBottom: 18,
  },
  hostAvatarWrap: {
    position: "relative",
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#0d0b09",
    borderWidth: 1.5,
    borderColor: "rgba(212, 175, 55, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  hostAvatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#000",
  },
  hostVerifiedBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#c99742",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#13100c",
  },
  hostVerifiedText: {
    color: "#0a0907",
    fontSize: 9,
    fontWeight: "900",
  },
  hostInfo: {
    flex: 1,
  },
  hostHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  hostLabel: {
    color: "#c99742",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  hostMasterBadge: {
    backgroundColor: "rgba(201, 151, 66, 0.12)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: "rgba(201, 151, 66, 0.35)",
  },
  hostMasterBadgeText: {
    color: "#e8c566",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  hostName: {
    color: "#ffffff",
    fontSize: 15.5,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  hostTitle: {
    color: "#a3998b",
    fontSize: 11.5,
    fontWeight: "500",
    marginTop: 2,
  },
  hostPledge: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
  },
  hostPledgeText: {
    color: "#8a7e72",
    fontSize: 10,
    fontStyle: "italic",
    lineHeight: 14,
  },

  // SECTION CARDS
  sectionCard: {
    backgroundColor: "#110f0c",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.07)",
    padding: 16,
    marginBottom: 18,
  },
  sectionHeading: {
    color: "#f5c242",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  sectionSub: {
    color: "#8e867b",
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  availabilityTotalText: {
    color: "#918a7f",
    fontSize: 11,
    fontWeight: "600",
  },
  soldOutBadge: {
    backgroundColor: "rgba(220, 53, 69, 0.15)",
    borderColor: "rgba(220, 53, 69, 0.4)",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  soldOutText: {
    color: "#ff6b6b",
    fontSize: 10,
    fontWeight: "800",
  },
  descriptionText: {
    color: "#b0a89d",
    fontSize: 13.5,
    lineHeight: 21,
  },
  capacityNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(201, 151, 66, 0.08)",
    borderRadius: 10,
    padding: 10,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.2)",
  },
  capacityNoticeIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  capacityNoticeText: {
    color: "#d4af37",
    fontSize: 11.5,
    fontWeight: "600",
    flex: 1,
  },

  // TASTING FLIGHT
  tastingFlightRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  flightNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(201, 151, 66, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  flightNumberText: {
    color: "#f5c242",
    fontSize: 12,
    fontWeight: "800",
  },
  flightName: {
    color: "#eee8dd",
    fontSize: 13,
    fontWeight: "700",
  },
  flightNote: {
    color: "#777",
    fontSize: 10.5,
    marginTop: 2,
  },

  // TICKET TIERS
  tierCard: {
    backgroundColor: "#15120e",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 14,
    marginBottom: 12,
  },
  tierCardSelected: {
    borderColor: "#c99742",
    backgroundColor: "rgba(201, 151, 66, 0.08)",
  },
  tierCardSoldOut: {
    opacity: 0.45,
  },
  tierTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  tierTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tierName: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  soldOutPill: {
    backgroundColor: "rgba(220, 53, 69, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  soldOutPillText: {
    color: "#ff6b6b",
    fontSize: 9,
    fontWeight: "800",
  },
  tierRemaining: {
    color: "#8e867b",
    fontSize: 11,
    marginTop: 3,
  },
  tierPriceBox: {
    alignItems: "flex-end",
  },
  tierPrice: {
    color: "#f5c242",
    fontSize: 16,
    fontWeight: "900",
  },
  tierPriceSub: {
    color: "#777",
    fontSize: 9.5,
  },
  benefitsBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  benefitCheck: {
    color: "#c99742",
    fontSize: 11,
    fontWeight: "900",
    marginRight: 6,
  },
  benefitText: {
    color: "#a59d91",
    fontSize: 11.5,
  },
  tierSelectedPill: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: "#c99742",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tierSelectedPillText: {
    color: "#0a0907",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  noTiersText: {
    color: "#777",
    fontSize: 12,
    fontStyle: "italic",
  },

  // QUANTITY PICKER
  qtyContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  qtyLabel: {
    color: "#f5c242",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  qtySub: {
    color: "#888",
    fontSize: 11,
    marginTop: 2,
  },
  qtyCounterBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0d0b09",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.3)",
    padding: 2,
  },
  qtyBtn: {
    width: 34,
    height: 34,
    justifyContent: "center",
    alignItems: "center",
  },
  qtyBtnText: {
    color: "#f5c242",
    fontSize: 18,
    fontWeight: "700",
  },
  qtyVal: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    paddingHorizontal: 12,
  },

  // PAYMENT CARDS
  paymentCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#15120e",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 12,
    marginBottom: 10,
  },
  paymentCardSelected: {
    borderColor: "#c99742",
    backgroundColor: "rgba(201, 151, 66, 0.08)",
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#c99742",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: "#f5c242",
  },
  paymentTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  paymentTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  instantBadge: {
    backgroundColor: "rgba(245, 194, 66, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  instantBadgeText: {
    color: "#f5c242",
    fontSize: 9,
    fontWeight: "800",
  },
  eftBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  eftBadgeText: {
    color: "#ccc",
    fontSize: 9,
    fontWeight: "700",
  },
  paymentDesc: {
    color: "#888",
    fontSize: 11,
    lineHeight: 15,
  },

  // BOTTOM ACTIONS
  bottomBar: {
    marginTop: 6,
  },
  totalBox: {
    alignItems: "center",
    marginBottom: 14,
  },
  totalLabel: {
    color: "#8e867b",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 2,
  },
  totalPrice: {
    color: "#f5c242",
    fontSize: 26,
    fontWeight: "900",
  },
  totalSub: {
    color: "#666",
    fontSize: 10,
    marginTop: 2,
  },
  bookBtn: {
    borderRadius: 12,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#f5c242",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  bookGradient: {
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  bookBtnText: {
    color: "#0a0907",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  waitlistBtn: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "#c99742",
    borderRadius: 12,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  waitlistBtnText: {
    color: "#f5c242",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
  },

  // CLOSED STATES
  heroClosedBadge: {
    backgroundColor: "rgba(180, 40, 40, 0.85)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 90, 90, 0.5)",
  },
  heroClosedBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  closedStatusTag: {
    backgroundColor: "rgba(180, 40, 40, 0.15)",
    borderColor: "rgba(255, 80, 80, 0.4)",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  closedStatusTagText: {
    color: "#ff6b6b",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  closedNoticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(255, 80, 80, 0.08)",
    borderLeftWidth: 3,
    borderLeftColor: "#ff4d4d",
    padding: 12,
    borderRadius: 8,
    marginBottom: 14,
  },
  closedNoticeIcon: {
    fontSize: 18,
    marginTop: 1,
  },
  closedNoticeTitle: {
    color: "#ff8080",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 3,
  },
  closedNoticeDesc: {
    color: "#c2b8aa",
    fontSize: 12,
    lineHeight: 18,
  },
  closedTagPill: {
    backgroundColor: "rgba(120, 120, 120, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  closedTagPillText: {
    color: "#888",
    fontSize: 11,
    fontWeight: "800",
  },
  closedBottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#16130f",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    marginTop: 8,
  },
  closedBottomInfo: {
    flex: 1,
    marginRight: 12,
  },
  closedBottomTitle: {
    color: "#e8ded1",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  closedBottomSub: {
    color: "#8a7e72",
    fontSize: 11,
    marginTop: 2,
  },
  closedBottomBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  closedBottomBtnText: {
    color: "#888",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },

  // PAYFAST IN-APP MODAL
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
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalLockIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  modalTitle: {
    color: "#f5c242",
    fontSize: 14,
    fontWeight: "800",
  },
  modalSubtitle: {
    color: "#888",
    fontSize: 10,
    marginTop: 1,
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
});
