/* eslint-disable prettier/prettier */
/* eslint-disable quotes */
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Modal,
  Animated,
  Vibration,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Easing,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AppHeader from "../../widgets/AppHeader";
import { API_BASE, getActiveServerHost } from "../../resources/data/Constants";

const { width, height } = Dimensions.get("window");

const API_CANDIDATES = [
  API_BASE,
  "http://localhost:5000/api",
  "http://192.168.1.9:5000/api",
  "http://10.0.2.2:5000/api",
];

const resolveImage = (img) => {
  if (!img) return "https://images.unsplash.com/photo-1527281400683-1aae777175f8?auto=format&fit=crop&q=80&w=1000";
  if (img.startsWith("http")) return img;
  return `${getActiveServerHost()}/${img.replace(/^\//, "")}`;
};

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return "";
  const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diffSec < 45) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
};

// Dynamic increment ladder matching web
const getDynamicIncrement = (currentBid) => {
  if (currentBid < 5000) return 250;
  if (currentBid < 10000) return 500;
  if (currentBid < 50000) return 1000;
  if (currentBid < 100000) return 2500;
  return 5000;
};

// -------------------------------------------------------------
// MAGICAL BESPOKE BID EFFECT COMPONENT (Tactile + Particles + Rings)
// -------------------------------------------------------------
function MagicalBidOverlay({ visible, amount, onComplete }) {
  const shockwave1 = useRef(new Animated.Value(0)).current;
  const shockwave2 = useRef(new Animated.Value(0)).current;
  const toastAnim = useRef(new Animated.Value(0)).current;
  const particleAnims = useRef(
    Array.from({ length: 28 }).map(() => ({
      pos: new Animated.Value(0),
      opacity: new Animated.Value(1),
    }))
  ).current;

  useEffect(() => {
    if (!visible) return;

    // 1. Prestigious double-gavel physical vibration pattern
    try {
      Vibration.vibrate([0, 50, 40, 75]);
    } catch (e) {
      // ignore
    }

    // 2. Shockwave animations
    shockwave1.setValue(0);
    shockwave2.setValue(0);
    toastAnim.setValue(0);
    particleAnims.forEach((p) => {
      p.pos.setValue(0);
      p.opacity.setValue(1);
    });

    Animated.parallel([
      Animated.timing(shockwave1, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(120),
        Animated.timing(shockwave2, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      // Floating Toast
      Animated.spring(toastAnim, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
      // Particle dispersal
      ...particleAnims.map((p, i) =>
        Animated.parallel([
          Animated.timing(p.pos, {
            toValue: 1,
            duration: 800 + (i % 5) * 80,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(400),
            Animated.timing(p.opacity, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
          ]),
        ])
      ),
    ]).start();

    const timer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 2800);

    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {/* Radiant Shockwave Rings */}
      <View style={styles.magicalCenterContainer}>
        <Animated.View
          style={[
            styles.shockwaveRing,
            {
              transform: [
                {
                  scale: shockwave1.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 3.2],
                  }),
                },
              ],
              opacity: shockwave1.interpolate({
                inputRange: [0, 0.4, 1],
                outputRange: [0.9, 0.5, 0],
              }),
            },
          ]}
        />
        <Animated.View
          style={[
            styles.shockwaveRingSecondary,
            {
              transform: [
                {
                  scale: shockwave2.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.2, 2.8],
                  }),
                },
              ],
              opacity: shockwave2.interpolate({
                inputRange: [0, 0.3, 1],
                outputRange: [0.8, 0.4, 0],
              }),
            },
          ]}
        />

        {/* Golden Particles Dispersing Radially */}
        {particleAnims.map((p, i) => {
          const angle = (i / 28) * Math.PI * 2;
          const dist = 90 + (i % 4) * 35;
          const tx = Math.cos(angle) * dist;
          const ty = Math.sin(angle) * dist;
          const symbols = ["✦", "◆", "★", "✨", "•"];
          const colors = ["#FFD700", "#F5D77F", "#D4AF37", "#FFF8DC"];

          return (
            <Animated.Text
              key={i}
              style={[
                styles.particleSymbol,
                {
                  color: colors[i % colors.length],
                  fontSize: 12 + (i % 3) * 4,
                  opacity: p.opacity,
                  transform: [
                    {
                      translateX: p.pos.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, tx],
                      }),
                    },
                    {
                      translateY: p.pos.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, ty],
                      }),
                    },
                    {
                      scale: p.pos.interpolate({
                        inputRange: [0, 0.3, 1],
                        outputRange: [0.5, 1.2, 0.3],
                      }),
                    },
                  ],
                },
              ]}
            >
              {symbols[i % symbols.length]}
            </Animated.Text>
          );
        })}

        {/* Floating Leading Position Badge */}
        <Animated.View
          style={[
            styles.magicalToastCard,
            {
              transform: [
                {
                  scale: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.7, 1],
                  }),
                },
                {
                  translateY: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [40, 0],
                  }),
                },
              ],
              opacity: toastAnim,
            },
          ]}
        >
          <View style={styles.magicalCrownBadge}>
            <Text style={styles.magicalCrownEmoji}>👑</Text>
          </View>
          <View style={styles.magicalToastContent}>
            <View style={styles.magicalToastRow}>
              <Text style={styles.magicalToastHeader}>RECORDED WITH VAULT</Text>
              <View style={styles.magicalCertifiedPill}>
                <Text style={styles.magicalCertifiedText}>✓ CERTIFIED</Text>
              </View>
            </View>
            <Text style={styles.magicalToastTitle}>You Hold The Leading Position!</Text>
            <Text style={styles.magicalToastAmount}>
              Active High Bid: R{Number(amount || 0).toLocaleString("en-ZA")}
            </Text>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

// -------------------------------------------------------------
// MAIN AUCTION LOT DETAILS COMPONENT
// -------------------------------------------------------------
export default function AuctionLotDetails({ route, navigation }) {
  const { lotId, lot: initialLot } = route.params || {};

  const [lot, setLot] = useState(initialLot || null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(!initialLot);
  const [submitting, setSubmitting] = useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  // User state & bidder profile
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [bidderProfile, setBidderProfile] = useState(null);

  // Live timer
  const [now, setNow] = useState(Date.now());

  // Bidding console inputs
  const [bidAmount, setBidAmount] = useState("");
  const [isMaxBid, setIsMaxBid] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmedAmount, setConfirmedAmount] = useState(0);

  // FX & Celebration Modals
  const [showMagicalEffect, setShowMagicalEffect] = useState(false);
  const [lastBidAmount, setLastBidAmount] = useState(0);
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [showCalendarFullSpecs, setShowCalendarFullSpecs] = useState(false);

  // Verification Form Inputs
  const [verifyForm, setVerifyForm] = useState({
    legalName: "",
    idType: "national_id",
    idNumber: "",
    dob: "",
    phone: "",
  });
  const [verifying, setVerifying] = useState(false);

  // 1-second precision anti-sniping clock ticker
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

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
        // try next
      }
    }
    return null;
  };

  const loadStoredUser = async () => {
    try {
      const stored = await AsyncStorage.getItem("userInfo");
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        setToken(parsed.token);
        if (parsed.name) {
          setVerifyForm((prev) => ({ ...prev, legalName: parsed.name, phone: parsed.phone || "" }));
        }
      }
    } catch (e) {
      // ignore
    }
  };

  const fetchBidderStatus = async (userToken) => {
    const authToken = userToken || token;
    if (!authToken) return;
    try {
      const res = await safeFetch("/auction/bidder/status", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res && res.ok) {
        const data = await res.json();
        setBidderProfile(data);
      }
    } catch (e) {
      console.log("Error fetching bidder status:", e);
    }
  };

  const fetchLotDetails = useCallback(
    async (isSilent = false) => {
      if (!lotId && !lot?._id) return;
      const targetId = lotId || lot?._id;
      if (!isSilent) setLoading(true);

      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await safeFetch(`/auction/${targetId}`, { headers });
        if (res && res.ok) {
          const data = await res.json();
          setLot(data.lot);
          setBids(data.bids || []);

          // Auto-trigger victory celebration if current user won and unpaid
          if (user && data.lot?.winner) {
            const winnerId = typeof data.lot.winner === "object" ? data.lot.winner._id : data.lot.winner;
            if (winnerId === user._id && data.lot.status === "sold" && data.lot.paymentStatus !== "Paid") {
              setShowCelebrationModal(true);
            }
          }
        }
      } catch (e) {
        console.log("Error fetching lot details:", e);
      } finally {
        setLoading(false);
      }
    },
    [lotId, lot?._id, token, user]
  );

  useEffect(() => {
    loadStoredUser();
  }, []);

  useEffect(() => {
    if (token) {
      fetchBidderStatus(token);
    }
  }, [token]);

  useEffect(() => {
    fetchLotDetails();
    const interval = setInterval(() => fetchLotDetails(true), 5000);
    return () => clearInterval(interval);
  }, [fetchLotDetails]);

  // Calculations
  const isWinner = Boolean(
    user && lot?.winner && user._id === (typeof lot.winner === "object" ? lot.winner._id : lot.winner)
  );
  const activeIncrement = lot?.bidIncrement || getDynamicIncrement(lot?.currentBid || 0);
  const nextMinimum =
    lot?.currentBid === 0 ? lot?.startingBid || 0 : (lot?.currentBid || 0) + activeIncrement;

  const targetEndDate = lot?.endDate ? new Date(lot.endDate).getTime() : 0;
  const targetStartDate = lot?.startDate ? new Date(lot.startDate).getTime() : 0;
  const hasStarted = targetStartDate ? targetStartDate <= now : true;
  const hasEnded =
    (targetEndDate && targetEndDate < now) ||
    lot?.status === "closed" ||
    lot?.status === "sold" ||
    lot?.status === "unsold";
  const isUpcoming = lot?.status === "upcoming" || !hasStarted;
  const isLive = (lot?.status === "live" || lot?.status === "extended") && hasStarted && !hasEnded;
  const isSold = lot?.status === "sold";

  // Countdown timer calculations
  const remainingMs = Math.max(0, (isUpcoming ? targetStartDate : targetEndDate) - now);
  const d = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
  const h = Math.floor((remainingMs / (1000 * 60 * 60)) % 24);
  const m = Math.floor((remainingMs / 1000 / 60) % 60);
  const s = Math.floor((remainingMs / 1000) % 60);

  // Quick increment buttons
  const applyQuickIncrement = (delta) => {
    const base = Number(bidAmount) || nextMinimum;
    const nextVal = Math.max(nextMinimum, base + delta);
    setBidAmount(String(nextVal));
  };

  const handleOpenBidConfirm = () => {
    const amt = Number(bidAmount || nextMinimum);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert("Invalid Bid", "Please enter a valid amount.");
      return;
    }

    if (!token) {
      Alert.alert("Login Required", "You must be signed in to place a certified bid.", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => navigation.navigate("LoginScreen") },
      ]);
      return;
    }

    if (!bidderProfile || !bidderProfile.isVerified) {
      if (bidderProfile?.isPending) {
        Alert.alert(
          "Verification Pending",
          "Your 18+ bidder verification application is currently undergoing administrator review. You will be cleared to bid once approved."
        );
        return;
      }
      setVerificationModalOpen(true);
      return;
    }

    if (bidderProfile.isBiddingSuspended) {
      Alert.alert("Privileges Suspended", bidderProfile.biddingSuspensionReason || "Account under compliance review.");
      return;
    }

    if (bidderProfile.biddingLimit > 0 && amt > bidderProfile.biddingLimit) {
      Alert.alert(
        "Bidding Limit Exceeded",
        `Your bid of R${amt.toLocaleString()} exceeds your current certified limit of R${bidderProfile.biddingLimit.toLocaleString()}. Upgrade to VIP Bidding to lift this ceiling.`
      );
      return;
    }

    if (amt < nextMinimum) {
      Alert.alert("Bid Below Minimum", `Your bid must be at least R${nextMinimum.toLocaleString("en-ZA")}.`);
      return;
    }

    setConfirmedAmount(amt);
    setConfirmModalOpen(true);
  };

  const submitBid = async () => {
    setSubmitting(true);
    try {
      const res = await safeFetch(`/auction/${lot._id}/bid`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: confirmedAmount,
          isMaxBid,
          placedCurrency: "ZAR",
          placedAmount: confirmedAmount,
        }),
      });

      if (res && res.ok) {
        const data = await res.json();
        setConfirmModalOpen(false);
        setLastBidAmount(confirmedAmount);
        setShowMagicalEffect(true);
        setBidAmount("");
        await fetchLotDetails(true);
      } else {
        const errData = res ? await res.json() : {};
        Alert.alert("Bid Rejected", errData.message || "Could not place bid at this time.");
        setConfirmModalOpen(false);
      }
    } catch (e) {
      Alert.alert("Error", "Network error placing bid. Please try again.");
      setConfirmModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifySubmit = async () => {
    if (!verifyForm.legalName || !verifyForm.idNumber) {
      Alert.alert("Required Fields", "Please supply your legal full name and identity number.");
      return;
    }
    setVerifying(true);
    try {
      const res = await safeFetch("/auction/bidder/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(verifyForm),
      });

      if (res && res.ok) {
        Alert.alert(
          "Verification Submitted",
          "Your 18+ legal bidder credentials have been submitted for compliance verification. You will receive an alert once verified."
        );
        setVerificationModalOpen(false);
        fetchBidderStatus(token);
      } else {
        const err = res ? await res.json() : {};
        Alert.alert("Submission Failed", err.message || "Could not submit verification.");
      }
    } catch (e) {
      Alert.alert("Error", "Connection error. Please retry.");
    } finally {
      setVerifying(false);
    }
  };

  if (loading && !lot) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader title="LOT DETAILS" backgroundColor="#0a0805" isBack={true} navigation={navigation} />
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#c99742" />
          <Text style={styles.loadingText}>Fetching Vault Lot Inspection...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!lot) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader title="LOT NOT FOUND" backgroundColor="#0a0805" isBack={true} navigation={navigation} />
        <View style={styles.centerLoading}>
          <Text style={styles.emptyTitle}>Lot Not Available</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Return to Catalogue</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const images = lot.images && lot.images.length > 0 ? lot.images : ["/assets/auction/macallan-25.png"];
  const currentMediaUrl = resolveImage(images[activeMediaIndex] || images[0]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080705" />

      {/* Header */}
      <AppHeader
        title={`LOT ${lot.lotNumber || lot._id.slice(-6).toUpperCase()}`}
        backgroundColor="#0a0805"
        isBack={true}
        navigation={navigation}
        rightButtons={[
          {
            id: 1,
            color: "transparent",
            content: (
              <Image
                source={require("../../resources/images/event.png")}
                style={{ width: 22, height: 22, tintColor: "#D4AF37" }}
                resizeMode="contain"
              />
            ),
            action: () => navigation.navigate("MyBids"),
          },
        ]}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* 1. LUXURY INTERACTIVE MEDIA SHOWCASE */}
        <View style={styles.mediaContainer}>
          <View style={styles.mainStageCard}>
            <Image source={{ uri: currentMediaUrl }} style={styles.mainImage} resizeMode="contain" />

            {/* Photo Counter Pill */}
            <View style={styles.mediaCounterPill}>
              <Text style={styles.mediaCounterText}>
                📷 View {activeMediaIndex + 1} of {images.length}
              </Text>
            </View>

            {/* Live Indicator Pill */}
            {isLive && (
              <View style={styles.livePulsePill}>
                <View style={styles.livePulseDot} />
                <Text style={styles.livePulseText}>LIVE AUCTION</Text>
              </View>
            )}
          </View>

          {/* Thumbnails Row */}
          {images.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnailsRow}>
              {images.map((img, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.thumbBox, activeMediaIndex === idx && styles.thumbBoxActive]}
                  onPress={() => setActiveMediaIndex(idx)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: resolveImage(img) }} style={styles.thumbImage} resizeMode="cover" />
                  {idx === 0 && (
                    <View style={styles.thumbCoverTag}>
                      <Text style={styles.thumbCoverText}>Cover</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* 2. LOT IDENTIFIERS & ANTI-SNIPING STATUS */}
        <View style={styles.lotHeaderSection}>
          <View style={styles.lotMetaRow}>
            <Text style={styles.lotNumberText}>
              LOT #{lot.lotNumber || lot._id.slice(-6).toUpperCase()}
            </Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.lotCategoryText}>{lot.category || "Fine Spirits"}</Text>

            {isLive && (
              <View style={[styles.reserveStatusPill, lot.reserveMet ? styles.reserveMetPill : styles.reserveUnmetPill]}>
                <Text style={[styles.reserveStatusText, lot.reserveMet ? styles.reserveMetText : styles.reserveUnmetText]}>
                  {lot.reserveMet ? "✓ Reserve Met" : "● Reserve Not Met"}
                </Text>
              </View>
            )}
          </View>

          {/* Anti-Sniping Alert Banner */}
          {lot.isExtended && isLive && (
            <View style={styles.antiSnipingBanner}>
              <Text style={styles.antiSnipingIcon}>⏱️</Text>
              <Text style={styles.antiSnipingText}>
                <Text style={styles.boldText}>Anti-Sniping Extension Active: </Text>
                Auction extended by 2 minutes due to competitive late bidding.
              </Text>
            </View>
          )}

          {/* Lot Title & Detailed Description */}
          <Text style={styles.lotTitleText}>{lot.title}</Text>
          <Text style={styles.lotDescriptionText}>{lot.description}</Text>
        </View>

        {/* 3. REAL-TIME COUNTDOWN & CURRENT BID TICKER */}
        <View style={styles.financialBannerCard}>
          <LinearGradient colors={["#1c160b", "#120e07", "#0a0805"]} style={styles.financialGradient}>
            <View style={styles.financialSplitRow}>
              {/* Left Column: Price Indicator */}
              <View style={styles.priceCol}>
                <Text style={styles.priceLabel}>
                  {hasEnded
                    ? lot.winningBid
                      ? "WINNING HAMMER BID"
                      : "FINAL BID"
                    : isUpcoming
                    ? "STARTING VALUATION"
                    : lot.currentBid > 0
                    ? "CURRENT LEADING BID"
                    : "OPENING BID"}
                </Text>
                <Text style={styles.priceValue}>
                  R
                  {Number(
                    hasEnded && lot.winningBid
                      ? lot.winningBid
                      : lot.currentBid || lot.startingBid || 0
                  ).toLocaleString("en-ZA")}
                </Text>
                <Text style={styles.priceSubtext}>
                  {isLive
                    ? `${lot.bidCount || bids.length} certified bids recorded`
                    : isUpcoming
                    ? "Bidding opens at starting price"
                    : "Gavel has officially fallen"}
                </Text>
              </View>

              {/* Right Column: Precision Countdown Ticker */}
              <View style={styles.timerCol}>
                <Text style={styles.timerLabel}>
                  {hasEnded ? "AUCTION STATUS" : isUpcoming ? "BIDDING OPENS IN" : "TIME REMAINING"}
                </Text>
                {hasEnded ? (
                  <View style={styles.closedBadge}>
                    <Text style={styles.closedBadgeText}>CLOSED</Text>
                  </View>
                ) : (
                  <View style={styles.clockRow}>
                    <View style={styles.clockUnit}>
                      <Text style={styles.clockNum}>{String(d).padStart(2, "0")}</Text>
                      <Text style={styles.clockUnitLabel}>DAYS</Text>
                    </View>
                    <Text style={styles.clockColon}>:</Text>
                    <View style={styles.clockUnit}>
                      <Text style={styles.clockNum}>{String(h).padStart(2, "0")}</Text>
                      <Text style={styles.clockUnitLabel}>HRS</Text>
                    </View>
                    <Text style={styles.clockColon}>:</Text>
                    <View style={styles.clockUnit}>
                      <Text style={styles.clockNum}>{String(m).padStart(2, "0")}</Text>
                      <Text style={styles.clockUnitLabel}>MIN</Text>
                    </View>
                    <Text style={styles.clockColon}>:</Text>
                    <View style={styles.clockUnit}>
                      <Text style={styles.clockNumHighlight}>{String(s).padStart(2, "0")}</Text>
                      <Text style={styles.clockUnitLabel}>SEC</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* 4. OFFICIAL CERTIFICATE OF ACQUISITION (IF CURRENT USER IS WINNER) */}
        {isSold && isWinner && (
          <View style={styles.certificateCard}>
            <LinearGradient colors={["#20180a", "#120e06", "#080603"]} style={styles.certificateGradient}>
              <View style={styles.certificateHeader}>
                <View style={styles.certificateEmblem}>
                  <Text style={styles.certificateEmblemText}>🏆</Text>
                </View>
                <View style={styles.certificateHeaderInfo}>
                  <View style={styles.awardTagRow}>
                    <Text style={styles.awardTag}>IMPERIAL AWARD</Text>
                    <Text style={styles.verifiedWinnerTag}>✓ VERIFIED WINNER</Text>
                  </View>
                  <Text style={styles.certificateTitle}>Certificate of Acquisition</Text>
                </View>
              </View>

              <Text style={styles.certificateGreeting}>
                Distinguished Patron, the auction gavel has officially fallen in your favor. Ownership of this singular piece has been awarded to your registered vault account.
              </Text>

              {/* Christie's / Sotheby's Financial Settlement Statement */}
              <View style={styles.settlementStatement}>
                <View style={styles.settlementHeaderRow}>
                  <Text style={styles.settlementHeaderText}>SETTLEMENT STATEMENT</Text>
                  <Text style={styles.settlementVaultTag}>ZAR ESCROW</Text>
                </View>

                <View style={styles.statementRow}>
                  <Text style={styles.statementLabel}>Winning Hammer Bid</Text>
                  <Text style={styles.statementVal}>R{Number(lot.winningBid || 0).toLocaleString("en-ZA")}</Text>
                </View>
                <View style={styles.statementRow}>
                  <Text style={styles.statementLabel}>Buyer's Premium (5%)</Text>
                  <Text style={styles.statementVal}>R{Number(lot.buyerPremiumAmount || 0).toLocaleString("en-ZA")}</Text>
                </View>
                <View style={styles.statementRow}>
                  <Text style={styles.statementLabel}>B.A.R. Vault Surcharge (2%)</Text>
                  <Text style={styles.statementVal}>R{Number(lot.barChargeAmount || 0).toLocaleString("en-ZA")}</Text>
                </View>
                <View style={styles.statementRow}>
                  <Text style={styles.statementLabel}>VAT (15%)</Text>
                  <Text style={styles.statementVal}>R{Number(lot.vatAmount || 0).toLocaleString("en-ZA")}</Text>
                </View>
                <View style={styles.statementRow}>
                  <Text style={styles.statementLabel}>White-Glove Courier Logistics</Text>
                  <Text style={styles.statementValHighlight}>
                    {lot.shippingCost ? `R${Number(lot.shippingCost).toLocaleString("en-ZA")}` : "Calculated at Checkout"}
                  </Text>
                </View>

                <View style={styles.netSumDivider} />
                <View style={styles.netSumRow}>
                  <View>
                    <Text style={styles.netSumLabel}>NET ACQUISITION SUM</Text>
                    <Text style={styles.netSumSub}>Full taxes & insurance included</Text>
                  </View>
                  <Text style={styles.netSumTotal}>
                    R{Number(lot.totalPaidByBuyer || (lot.winningBid || 0) * 1.22).toLocaleString("en-ZA")}
                  </Text>
                </View>
              </View>

              {/* Action Button */}
              {lot.paymentStatus === "Paid" ? (
                <View style={styles.settledBadgeBtn}>
                  <Text style={styles.settledBadgeText}>✓ ACQUISITION SETTLED • VAULT DISPATCH IN PREPARATION</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.claimLotBtn}
                  onPress={() => navigation.navigate("AuctionCheckout", { lotId: lot._id, lot })}
                  activeOpacity={0.88}
                >
                  <LinearGradient colors={["#ffd700", "#e0ad38", "#c99742"]} style={styles.claimLotGradient}>
                    <Text style={styles.claimLotText}>CLAIM LOT & COMPLETE SETTLEMENT →</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {/* Integrated Calendar Handover Card */}
              <View style={styles.calendarMiniCard}>
                <View style={styles.calendarMiniHeader}>
                  <Text style={styles.calendarMiniIcon}>📅</Text>
                  <View>
                    <Text style={styles.calendarMiniTitle}>Vault Handover & Courier Window</Text>
                    <Text style={styles.calendarMiniDesc}>Scheduled within 3 business days post-settlement</Text>
                  </View>
                </View>
                <View style={styles.calendarLocationRow}>
                  <Text style={styles.calendarLocationText}>
                    📍 {lot.custodyLocation || "Grand Store High-Security Vault, Cape Town, South Africa"}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* 5. LIVE BIDDING CONSOLE (IF AUCTION IS LIVE) */}
        {isLive && (
          <View style={styles.biddingConsoleCard}>
            <View style={styles.biddingConsoleHeader}>
              <Text style={styles.consoleTitle}>LIVE BIDDING CONSOLE</Text>
              <Text style={styles.consoleNextMin}>
                Next Minimum: <Text style={styles.goldBold}>R{nextMinimum.toLocaleString("en-ZA")}</Text>
              </Text>
            </View>

            {/* Bidder Profile Status Banner */}
            {bidderProfile?.isPending && (
              <View style={styles.pendingStatusBox}>
                <Text style={styles.pendingStatusTitle}>⏳ Application Pending Review</Text>
                <Text style={styles.pendingStatusDesc}>
                  Your 18+ verification is undergoing administrator compliance check.
                </Text>
              </View>
            )}

            {(!bidderProfile || !bidderProfile.isVerified) && !bidderProfile?.isPending && (
              <TouchableOpacity
                style={styles.verificationPromptBox}
                onPress={() => setVerificationModalOpen(true)}
                activeOpacity={0.85}
              >
                <View style={styles.verificationPromptTextCol}>
                  <Text style={styles.verificationPromptTitle}>⚡ 18+ Bidder Verification Required</Text>
                  <Text style={styles.verificationPromptDesc}>
                    Submit national ID or passport to unlock live bidding.
                  </Text>
                </View>
                <View style={styles.verifyNowBtn}>
                  <Text style={styles.verifyNowBtnText}>VERIFY</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Quick Increment Ladder Chips */}
            <Text style={styles.quickChipsLabel}>QUICK BID INCREMENTS</Text>
            <View style={styles.quickChipsRow}>
              {[500, 1000, 2500, 5000].map((inc) => (
                <TouchableOpacity
                  key={inc}
                  style={styles.quickChip}
                  onPress={() => applyQuickIncrement(inc)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickChipText}>+R{inc.toLocaleString()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Bid Input Box */}
            <View style={styles.inputContainer}>
              <Text style={styles.currencyPrefix}>ZAR (R)</Text>
              <TextInput
                style={styles.bidInput}
                keyboardType="numeric"
                value={bidAmount}
                onChangeText={setBidAmount}
                placeholder={`Min: ${nextMinimum.toLocaleString("en-ZA")}`}
                placeholderTextColor="#555"
              />
            </View>

            {/* Max Auto-Bid Toggle */}
            <TouchableOpacity
              style={styles.maxBidRow}
              onPress={() => setIsMaxBid(!isMaxBid)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, isMaxBid && styles.checkboxActive]}>
                {isMaxBid && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.maxBidTextCol}>
                <Text style={styles.maxBidTitle}>Place Max Auto-Bid (Proxy Bidding)</Text>
                <Text style={styles.maxBidDesc}>
                  System will automatically bid on your behalf up to your ceiling.
                </Text>
              </View>
            </TouchableOpacity>

            {/* Submit Bid Button */}
            <TouchableOpacity
              style={styles.submitBidBtn}
              onPress={handleOpenBidConfirm}
              activeOpacity={0.88}
            >
              <LinearGradient colors={["#ffd700", "#d4af37", "#997520"]} style={styles.submitBidGradient}>
                <Text style={styles.submitBidText}>
                  SUBMIT BID • R{Number(bidAmount || nextMinimum).toLocaleString("en-ZA")} →
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* 6. DETAILED BOTTLE SPECIFICATIONS GRID (PRESERVED IN MINUTE DETAIL) */}
        <View style={styles.specsSection}>
          <Text style={styles.sectionHeader}>PROVENANCE & SPECIFICATIONS</Text>
          <View style={styles.specsGrid}>
            <View style={styles.specCard}>
              <Text style={styles.specLabel}>DISTILLERY & VINTAGE</Text>
              <Text style={styles.specValue}>
                {lot.distillery || "Single Malt Distillery"}
                {lot.vintage ? ` • ${lot.vintage} Vintage` : ""}
                {lot.ageStatement ? ` (${lot.ageStatement})` : ""}
              </Text>
            </View>

            <View style={styles.specCard}>
              <Text style={styles.specLabel}>FILL LEVEL</Text>
              <Text style={styles.specValueGold}>{lot.fillLevel || "Into Neck"}</Text>
            </View>

            <View style={styles.specCard}>
              <Text style={styles.specLabel}>BOTTLE & CASK REFERENCE</Text>
              <Text style={styles.specValue}>
                {lot.bottleNumber ? `Bottle #${lot.bottleNumber}` : "Numbered Release"}
                {lot.caskNumber ? ` • Cask #${lot.caskNumber}` : ""}
              </Text>
            </View>

            <View style={styles.specCard}>
              <Text style={styles.specLabel}>FORMAT & STRENGTH</Text>
              <Text style={styles.specValue}>
                {lot.bottleSizeMl || 750}ml • {lot.abv ? `${lot.abv}% ABV` : "Standard ABV"} • {lot.countryOfOrigin || "Scotland"}
              </Text>
            </View>

            <View style={styles.specCard}>
              <Text style={styles.specLabel}>BOX & SEAL CONDITION</Text>
              <Text style={styles.specValue}>
                {lot.boxCondition || "Original Presentation Box"} • {lot.sealCondition || "Capsule Intact"}
              </Text>
            </View>

            <View style={styles.specCard}>
              <Text style={styles.specLabel}>CUSTODY & AUTHENTICATION</Text>
              <Text style={styles.specValueGreen}>
                🛡️ {lot.authenticationStatus || "Authenticated"} ({lot.custodyLocation || "Grand Store Vault"})
              </Text>
            </View>
          </View>
        </View>

        {/* 7. VERIFIED CRYPTOGRAPHIC BID LEDGER */}
        <View style={styles.ledgerSection}>
          <View style={styles.ledgerHeaderRow}>
            <View>
              <Text style={styles.sectionHeader}>VERIFIED BID LEDGER</Text>
              <Text style={styles.ledgerSubtitle}>Real-time cryptographic record of all bids</Text>
            </View>
            <View style={styles.liveLedgerPill}>
              <View style={styles.pingDot} />
              <Text style={styles.liveLedgerText}>{bids.length} RECORDED</Text>
            </View>
          </View>

          {bids.length > 0 ? (
            <View style={styles.bidsList}>
              {bids.map((bid, index) => {
                const isLeading = index === 0;
                const isUser =
                  bid.isUserBid ||
                  (user && bid.user && user._id === (typeof bid.user === "object" ? bid.user._id : bid.user));

                return (
                  <View
                    key={bid._id || index}
                    style={[
                      styles.bidRowItem,
                      isLeading && styles.bidRowLeading,
                      isUser && !isLeading && styles.bidRowUser,
                    ]}
                  >
                    <View style={styles.bidRankCol}>
                      {isLeading ? (
                        <View style={styles.leadingCrownBox}>
                          <Text style={styles.leadingCrownIcon}>👑</Text>
                        </View>
                      ) : (
                        <View style={styles.normalRankBox}>
                          <Text style={styles.normalRankText}>#{index + 1}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.bidInfoCol}>
                      <View style={styles.bidderNameRow}>
                        <Text style={[styles.bidderNameText, isLeading && styles.bidderNameLeading]}>
                          {bid.bidderNumber || bid.bidder || `Collector GS-${(index * 73 + 12).toString().slice(-4)}`}
                        </Text>
                        {isLeading && (
                          <View style={styles.highBidderBadge}>
                            <Text style={styles.highBidderText}>HIGH BIDDER</Text>
                          </View>
                        )}
                        {isUser && (
                          <View style={styles.yourBidBadge}>
                            <Text style={styles.yourBidText}>YOUR BID</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.bidTimestamp}>{formatTimeAgo(bid.createdAt || bid.time)}</Text>
                    </View>

                    <View style={styles.bidAmountCol}>
                      <Text style={[styles.bidAmountText, isLeading && styles.bidAmountLeading]}>
                        R{Number(bid.amount || 0).toLocaleString("en-ZA")}
                      </Text>
                      {isLeading && <Text style={styles.leadingTag}>LEADING</Text>}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyLedgerBox}>
              <Text style={styles.emptyLedgerIcon}>🏛️</Text>
              <Text style={styles.emptyLedgerTitle}>No Bids Recorded Yet</Text>
              <Text style={styles.emptyLedgerDesc}>
                Be the inaugural collector to place the opening bid on this singular lot.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* MAGICAL BID BURST OVERLAY */}
      <MagicalBidOverlay
        visible={showMagicalEffect}
        amount={lastBidAmount}
        onComplete={() => setShowMagicalEffect(false)}
      />

      {/* BID CONFIRMATION SHEET MODAL */}
      <Modal visible={confirmModalOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalPre}>BID COMMITMENT VERIFICATION</Text>
            <Text style={styles.modalTitle}>Confirm Certified Bid</Text>
            <Text style={styles.modalDesc}>
              You are about to commit an official binding bid for <Text style={styles.boldWhite}>{lot.title}</Text>.
            </Text>

            <View style={styles.confirmBreakdown}>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Committed Bid Amount</Text>
                <Text style={styles.confirmValGold}>R{confirmedAmount.toLocaleString("en-ZA")}</Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Estimated Buyer Premium (5%)</Text>
                <Text style={styles.confirmVal}>R{Math.round(confirmedAmount * 0.05).toLocaleString("en-ZA")}</Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>BAR Surcharge & VAT (17%)</Text>
                <Text style={styles.confirmVal}>R{Math.round(confirmedAmount * 0.17).toLocaleString("en-ZA")}</Text>
              </View>
              {isMaxBid && (
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>Type</Text>
                  <Text style={styles.confirmValHighlight}>Max Auto-Bid (Proxy Ceiling)</Text>
                </View>
              )}
            </View>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setConfirmModalOpen(false)}
                disabled={submitting}
              >
                <Text style={styles.modalCancelText}>CANCEL</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={submitBid}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>AUTHORIZE BID</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 18+ BIDDER VERIFICATION MODAL */}
      <Modal visible={verificationModalOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.verificationModalCard}>
            <Text style={styles.modalPre}>REGULATORY COMPLIANCE</Text>
            <Text style={styles.modalTitle}>18+ Bidder Legal Qualification</Text>
            <Text style={styles.modalDesc}>
              South African CPA & liquor auction regulations require verified legal identification prior to participating in rare fine spirit auctions.
            </Text>

            <View style={styles.verifyInputGroup}>
              <Text style={styles.verifyInputLabel}>FULL LEGAL NAME</Text>
              <TextInput
                style={styles.verifyTextInput}
                value={verifyForm.legalName}
                onChangeText={(text) => setVerifyForm((prev) => ({ ...prev, legalName: text }))}
                placeholder="As shown on official ID"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.verifyInputGroup}>
              <Text style={styles.verifyInputLabel}>NATIONAL ID / PASSPORT NUMBER</Text>
              <TextInput
                style={styles.verifyTextInput}
                value={verifyForm.idNumber}
                onChangeText={(text) => setVerifyForm((prev) => ({ ...prev, idNumber: text }))}
                placeholder="e.g. 9001015009087 or Passport Ref"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.verifyInputGroup}>
              <Text style={styles.verifyInputLabel}>DATE OF BIRTH (DD/MM/YYYY)</Text>
              <TextInput
                style={styles.verifyTextInput}
                value={verifyForm.dob}
                onChangeText={(text) => setVerifyForm((prev) => ({ ...prev, dob: text }))}
                placeholder="Must be 18 or older"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setVerificationModalOpen(false)}
                disabled={verifying}
              >
                <Text style={styles.modalCancelText}>CLOSE</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleVerifySubmit}
                disabled={verifying}
                activeOpacity={0.85}
              >
                {verifying ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>SUBMIT VERIFICATION</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* AUCTION WINNER VICTORY CELEBRATION MODAL */}
      <Modal visible={showCelebrationModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.celebrationCard}>
            <View style={styles.trophyEmblemBox}>
              <Text style={styles.trophyEmblemEmoji}>🏆</Text>
            </View>

            <View style={styles.victoryTagBadge}>
              <Text style={styles.victoryTagText}>👑 OFFICIAL AUCTION VICTORY</Text>
            </View>

            <Text style={styles.celebrationTitle}>
              Congratulations{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!
            </Text>
            <Text style={styles.celebrationDesc}>
              The auction gavel has officially fallen. You emerged as the triumphant winning bidder for this singular reserve lot.
            </Text>

            <View style={styles.celebrationLotBox}>
              <Text style={styles.celebrationLotTag}>LOT #{lot.lotNumber || lot._id.slice(-6).toUpperCase()}</Text>
              <Text style={styles.celebrationLotTitle} numberOfLines={2}>
                {lot.title}
              </Text>
              <View style={styles.celebrationHammerRow}>
                <Text style={styles.celebrationHammerLabel}>Winning Hammer Price:</Text>
                <Text style={styles.celebrationHammerVal}>
                  R{Number(lot.winningBid || lot.currentBid || 0).toLocaleString("en-ZA")}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.proceedCheckoutBtn}
              onPress={() => {
                setShowCelebrationModal(false);
                navigation.navigate("AuctionCheckout", { lotId: lot._id, lot });
              }}
              activeOpacity={0.88}
            >
              <LinearGradient colors={["#ffd700", "#e5b43b", "#c99742"]} style={styles.proceedCheckoutGradient}>
                <Text style={styles.proceedCheckoutText}>CLAIM LOT & SECURE DELIVERY →</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeCelebrationBtn}
              onPress={() => setShowCelebrationModal(false)}
            >
              <Text style={styles.closeCelebrationText}>Review Certificate in Catalogue</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  centerLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    color: "#c99742",
    marginTop: 12,
    fontSize: 13,
    letterSpacing: 1,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  backBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#c99742",
    borderRadius: 8,
  },
  backBtnText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 12,
    letterSpacing: 1,
  },

  // 1. Media Showcase
  mediaContainer: {
    padding: 16,
    backgroundColor: "#0c0a08",
  },
  mainStageCard: {
    width: "100%",
    height: 340,
    backgroundColor: "#120f0a",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  mainImage: {
    width: "82%",
    height: "82%",
  },
  mediaCounterPill: {
    position: "absolute",
    top: 14,
    left: 14,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  mediaCounterText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
    fontWeight: "600",
  },
  livePulsePill: {
    position: "absolute",
    top: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(220, 38, 38, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(220, 38, 38, 0.5)",
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ef4444",
    marginRight: 6,
  },
  livePulseText: {
    color: "#ef4444",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  thumbnailsRow: {
    paddingTop: 14,
    gap: 10,
  },
  thumbBox: {
    width: 62,
    height: 62,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#15120d",
    overflow: "hidden",
    position: "relative",
  },
  thumbBoxActive: {
    borderColor: "#c99742",
    borderWidth: 2,
    shadowColor: "#c99742",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  thumbCoverTag: {
    position: "absolute",
    bottom: 2,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.85)",
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  thumbCoverText: {
    color: "#c99742",
    fontSize: 8,
    fontWeight: "bold",
  },

  // 2. Lot Header
  lotHeaderSection: {
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  lotMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    flexWrap: "wrap",
  },
  lotNumberText: {
    color: "#c99742",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  metaDot: {
    color: "rgba(255,255,255,0.3)",
    marginHorizontal: 8,
  },
  lotCategoryText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    fontWeight: "500",
    textTransform: "uppercase",
  },
  reserveStatusPill: {
    marginLeft: "auto",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  reserveMetPill: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderColor: "rgba(16, 185, 129, 0.3)",
    borderWidth: 1,
  },
  reserveUnmetPill: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderColor: "rgba(245, 158, 11, 0.3)",
    borderWidth: 1,
  },
  reserveMetText: {
    color: "#34d399",
    fontSize: 10,
    fontWeight: "bold",
  },
  reserveUnmetText: {
    color: "#fbbf24",
    fontSize: 10,
    fontWeight: "bold",
  },
  antiSnipingBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(201, 151, 66, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.35)",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  antiSnipingIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  antiSnipingText: {
    color: "#f5d77f",
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
  boldText: {
    fontWeight: "bold",
  },
  lotTitleText: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "bold",
    letterSpacing: 0.3,
    lineHeight: 28,
    marginBottom: 8,
  },
  lotDescriptionText: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
    lineHeight: 20,
  },

  // 3. Financial Banner & Countdown
  financialBannerCard: {
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.3)",
  },
  financialGradient: {
    padding: 16,
  },
  financialSplitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceCol: {
    flex: 1,
    paddingRight: 10,
  },
  priceLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  priceValue: {
    color: "#f5d77f",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  priceSubtext: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    marginTop: 3,
  },
  timerCol: {
    alignItems: "flex-end",
  },
  timerLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  clockRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  clockUnit: {
    alignItems: "center",
  },
  clockNum: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  clockNumHighlight: {
    color: "#ffd700",
    fontSize: 14,
    fontWeight: "900",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  clockUnitLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 7.5,
    fontWeight: "bold",
    marginTop: 1,
  },
  clockColon: {
    color: "rgba(201, 151, 66, 0.7)",
    fontSize: 13,
    fontWeight: "bold",
    marginHorizontal: 3,
  },
  closedBadge: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  closedBadgeText: {
    color: "#aaa",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1,
  },

  // 4. Certificate of Acquisition
  certificateCard: {
    marginHorizontal: 16,
    marginVertical: 14,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(212, 175, 55, 0.7)",
    shadowColor: "#d4af37",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 8,
  },
  certificateGradient: {
    padding: 18,
  },
  certificateHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  certificateEmblem: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#000",
    borderWidth: 1.5,
    borderColor: "#d4af37",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  certificateEmblemText: {
    fontSize: 24,
  },
  certificateHeaderInfo: {
    flex: 1,
  },
  awardTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  awardTag: {
    color: "#f5d77f",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
    backgroundColor: "rgba(212, 175, 55, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedWinnerTag: {
    color: "#34d399",
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 0.8,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  certificateTitle: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "bold",
  },
  certificateGreeting: {
    color: "#e7ddcb",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  settlementStatement: {
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 14,
    marginBottom: 16,
  },
  settlementHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    marginBottom: 8,
  },
  settlementHeaderText: {
    color: "#f5d77f",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  settlementVaultTag: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 9,
    fontWeight: "600",
  },
  statementRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 3,
  },
  statementLabel: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 11,
  },
  statementVal: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "600",
  },
  statementValHighlight: {
    color: "#f5d77f",
    fontSize: 11,
    fontWeight: "bold",
  },
  netSumDivider: {
    height: 1,
    backgroundColor: "rgba(212, 175, 55, 0.3)",
    marginVertical: 8,
  },
  netSumRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  netSumLabel: {
    color: "#f5d77f",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  netSumSub: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 9,
  },
  netSumTotal: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
  },
  claimLotBtn: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 12,
  },
  claimLotGradient: {
    paddingVertical: 14,
    alignItems: "center",
  },
  claimLotText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  settledBadgeBtn: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderColor: "rgba(16, 185, 129, 0.5)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  settledBadgeText: {
    color: "#34d399",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.8,
    textAlign: "center",
  },
  calendarMiniCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 12,
  },
  calendarMiniHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  calendarMiniIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  calendarMiniTitle: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },
  calendarMiniDesc: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
  },
  calendarLocationRow: {
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  calendarLocationText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 10,
  },

  // 5. Bidding Console
  biddingConsoleCard: {
    marginHorizontal: 16,
    marginVertical: 10,
    backgroundColor: "#110e09",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.25)",
  },
  biddingConsoleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  consoleTitle: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  consoleNextMin: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
  },
  goldBold: {
    color: "#f5d77f",
    fontWeight: "bold",
  },
  pendingStatusBox: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderColor: "rgba(245, 158, 11, 0.3)",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  pendingStatusTitle: {
    color: "#fbbf24",
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 2,
  },
  pendingStatusDesc: {
    color: "rgba(251, 191, 36, 0.8)",
    fontSize: 10,
  },
  verificationPromptBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    borderColor: "rgba(59, 130, 246, 0.3)",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  verificationPromptTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  verificationPromptTitle: {
    color: "#60a5fa",
    fontSize: 11,
    fontWeight: "bold",
  },
  verificationPromptDesc: {
    color: "rgba(147, 197, 253, 0.7)",
    fontSize: 10,
    marginTop: 2,
  },
  verifyNowBtn: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  verifyNowBtnText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  quickChipsLabel: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 6,
  },
  quickChipsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  quickChip: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: "center",
  },
  quickChipText: {
    color: "#f5d77f",
    fontSize: 11,
    fontWeight: "bold",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#070604",
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.4)",
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  currencyPrefix: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    fontWeight: "bold",
    marginRight: 10,
  },
  bidInput: {
    flex: 1,
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
    paddingVertical: 12,
  },
  maxBidRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  checkboxActive: {
    backgroundColor: "#c99742",
    borderColor: "#c99742",
  },
  checkmark: {
    color: "#000",
    fontSize: 11,
    fontWeight: "bold",
  },
  maxBidTextCol: {
    flex: 1,
  },
  maxBidTitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontWeight: "bold",
  },
  maxBidDesc: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 9.5,
  },
  submitBidBtn: {
    borderRadius: 12,
    overflow: "hidden",
  },
  submitBidGradient: {
    paddingVertical: 14,
    alignItems: "center",
  },
  submitBidText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  // 6. Bottle Specifications Grid
  specsSection: {
    paddingHorizontal: 16,
    marginVertical: 14,
  },
  sectionHeader: {
    color: "#c99742",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  specsGrid: {
    gap: 8,
  },
  specCard: {
    backgroundColor: "#100d08",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  specLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 8.5,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 3,
  },
  specValue: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "500",
  },
  specValueGold: {
    color: "#f5d77f",
    fontSize: 12,
    fontWeight: "bold",
  },
  specValueGreen: {
    color: "#34d399",
    fontSize: 12,
    fontWeight: "600",
  },

  // 7. Verified Cryptographic Bid Ledger
  ledgerSection: {
    paddingHorizontal: 16,
    marginVertical: 10,
  },
  ledgerHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  ledgerSubtitle: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
  },
  liveLedgerPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderColor: "rgba(16, 185, 129, 0.3)",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#34d399",
    marginRight: 5,
  },
  liveLedgerText: {
    color: "#34d399",
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  bidsList: {
    gap: 8,
  },
  bidRowItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0d0b07",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  bidRowLeading: {
    backgroundColor: "#181308",
    borderColor: "rgba(212, 175, 55, 0.5)",
    shadowColor: "#d4af37",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  bidRowUser: {
    borderColor: "rgba(16, 185, 129, 0.3)",
    backgroundColor: "rgba(16, 185, 129, 0.05)",
  },
  bidRankCol: {
    marginRight: 10,
  },
  leadingCrownBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: "#d4af37",
    justifyContent: "center",
    alignItems: "center",
  },
  leadingCrownIcon: {
    fontSize: 14,
  },
  normalRankBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  normalRankText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    fontWeight: "bold",
  },
  bidInfoCol: {
    flex: 1,
  },
  bidderNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  bidderNameText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  bidderNameLeading: {
    color: "#f5d77f",
    fontWeight: "bold",
  },
  highBidderBadge: {
    backgroundColor: "rgba(212, 175, 55, 0.2)",
    borderColor: "rgba(212, 175, 55, 0.4)",
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  highBidderText: {
    color: "#ffd700",
    fontSize: 8,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  yourBidBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderColor: "rgba(16, 185, 129, 0.4)",
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  yourBidText: {
    color: "#34d399",
    fontSize: 8,
    fontWeight: "bold",
  },
  bidTimestamp: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 9.5,
    marginTop: 2,
  },
  bidAmountCol: {
    alignItems: "flex-end",
  },
  bidAmountText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "bold",
  },
  bidAmountLeading: {
    color: "#ffd700",
    fontSize: 14,
    fontWeight: "900",
  },
  leadingTag: {
    color: "rgba(255, 215, 0, 0.8)",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },
  emptyLedgerBox: {
    backgroundColor: "#0d0b07",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 24,
    alignItems: "center",
  },
  emptyLedgerIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  emptyLedgerTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  emptyLedgerDesc: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
  },

  // Modal Backdrop
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.88)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#13100a",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(201, 151, 66, 0.5)",
    padding: 20,
  },
  modalPre: {
    color: "#c99742",
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  modalTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 6,
  },
  modalDesc: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  boldWhite: {
    color: "#fff",
    fontWeight: "bold",
  },
  confirmBreakdown: {
    backgroundColor: "#090805",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 18,
  },
  confirmRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },
  confirmLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
  },
  confirmVal: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "bold",
  },
  confirmValGold: {
    color: "#ffd700",
    fontSize: 14,
    fontWeight: "900",
  },
  confirmValHighlight: {
    color: "#60a5fa",
    fontSize: 11,
    fontWeight: "bold",
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
  },
  modalCancelText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  modalConfirmBtn: {
    flex: 1.4,
    backgroundColor: "#c99742",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  modalConfirmText: {
    color: "#000",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },

  // Verification Modal Card
  verificationModalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#13100a",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(59, 130, 246, 0.5)",
    padding: 20,
  },
  verifyInputGroup: {
    marginBottom: 12,
  },
  verifyInputLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 4,
  },
  verifyTextInput: {
    backgroundColor: "#070604",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#ffffff",
    fontSize: 13,
  },

  // Celebration Modal
  celebrationCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#17120a",
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#ffd700",
    padding: 24,
    alignItems: "center",
    shadowColor: "#ffd700",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  trophyEmblemBox: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: "#000",
    borderWidth: 2,
    borderColor: "#ffd700",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  trophyEmblemEmoji: {
    fontSize: 34,
  },
  victoryTagBadge: {
    backgroundColor: "rgba(212, 175, 55, 0.2)",
    borderColor: "rgba(212, 175, 55, 0.5)",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  victoryTagText: {
    color: "#ffd700",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  celebrationTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 6,
  },
  celebrationDesc: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  celebrationLotBox: {
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 12,
    marginBottom: 18,
  },
  celebrationLotTag: {
    color: "#c99742",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 2,
  },
  celebrationLotTitle: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 8,
  },
  celebrationHammerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
    paddingTop: 8,
  },
  celebrationHammerLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
  },
  celebrationHammerVal: {
    color: "#ffd700",
    fontSize: 14,
    fontWeight: "900",
  },
  proceedCheckoutBtn: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 10,
  },
  proceedCheckoutGradient: {
    paddingVertical: 14,
    alignItems: "center",
  },
  proceedCheckoutText: {
    color: "#000",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  closeCelebrationBtn: {
    paddingVertical: 6,
  },
  closeCelebrationText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    textDecorationLine: "underline",
  },

  // Magical Bid Overlay Styles
  magicalCenterContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  shockwaveRing: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: "#ffd700",
    backgroundColor: "rgba(255, 215, 0, 0.15)",
  },
  shockwaveRingSecondary: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: "#f5d77f",
    backgroundColor: "rgba(245, 215, 127, 0.08)",
  },
  particleSymbol: {
    position: "absolute",
    fontWeight: "bold",
  },
  magicalToastCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16120a",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#ffd700",
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#ffd700",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 16,
  },
  magicalCrownBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#ffd700",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  magicalCrownEmoji: {
    fontSize: 20,
  },
  magicalToastContent: {
    alignItems: "flex-start",
  },
  magicalToastRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  magicalToastHeader: {
    color: "#ffd700",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  magicalCertifiedPill: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderColor: "rgba(16, 185, 129, 0.5)",
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  magicalCertifiedText: {
    color: "#34d399",
    fontSize: 8,
    fontWeight: "bold",
  },
  magicalToastTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
  },
  magicalToastAmount: {
    color: "#f5d77f",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 1,
  },
});
