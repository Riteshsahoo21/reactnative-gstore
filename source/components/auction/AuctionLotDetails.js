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
  DeviceEventEmitter,
  Share,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import RNShare from "react-native-share";
import AppHeader from "../../widgets/AppHeader";
import BidderVerificationModal from "./BidderVerificationModal";
import AuctionAcquisitionCertificate from "./AuctionAcquisitionCertificate";
import {
  API_BASE,
  getActiveServerHost,
  getActiveApiBase,
  getCandidateBases,
} from "../../resources/data/Constants";

const { width, height } = Dimensions.get("window");

const getLotApiCandidates = () => {
  const active = typeof getActiveApiBase === "function" ? getActiveApiBase() : API_BASE;
  const list = [active];
  if (typeof getCandidateBases === "function") {
    list.push(...getCandidateBases());
  }
  list.push(
    API_BASE,
    "http://127.0.0.1:5000/api",
    "http://localhost:5000/api",
    "http://10.0.2.2:5000/api",
    "http://192.168.1.9:5000/api"
  );
  return [...new Set(list.filter(Boolean))];
};

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
  const dismissedCelebrationRef = useRef(new Set());
  const [downloadingCert, setDownloadingCert] = useState(false);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [showCalendarFullSpecs, setShowCalendarFullSpecs] = useState(false);

  const handleDismissCelebration = useCallback(async () => {
    const targetId = lot?._id || lotId;
    if (targetId) {
      dismissedCelebrationRef.current.add(String(targetId));
      try {
        await AsyncStorage.setItem(`hasDismissedCelebration_${targetId}`, "true");
      } catch (e) {}
    }
    setShowCelebrationModal(false);
  }, [lot?._id, lotId]);

  const fetchCertificateBase64 = useCallback(async (targetId) => {
    const candidates = getLotApiCandidates();
    for (const base of candidates) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4500);
        const cleanBase = base.replace(/\/$/, "");
        const url = `${cleanBase}/auction/${targetId}/certificate?format=base64`;
        const res = await fetch(url, { method: "GET", signal: controller.signal });
        clearTimeout(timer);
        if (res && res.ok) {
          const json = await res.json();
          if (json && json.pdfBase64) {
            return json;
          }
        }
      } catch (e) {}
    }
    return null;
  }, []);

  const handleDownloadCertificate = useCallback(async () => {
    const targetId = lot?._id || lotId;
    if (!targetId || downloadingCert) return;

    setDownloadingCert(true);
    try {
      // Open the existing download endpoint immediately. PDF sharing has its own action.
      const host = getActiveServerHost().replace(/\/+$/, "");
      const downloadUrl = `${host}/api/auction/${encodeURIComponent(targetId)}/certificate?download=1`;
      await Linking.openURL(downloadUrl);
    } catch (err) {
      console.warn("Could not open certificate download:", err);
      Alert.alert(
        "Download Certificate",
        "Could not open the certificate download. Please try again or use Share to save the PDF."
      );
    } finally {
      setDownloadingCert(false);
    }
  }, [lot?._id, lotId, downloadingCert]);

  const handleShareCertificate = useCallback(async () => {
    const targetId = lot?._id || lotId;
    if (!targetId) return;
    const safeLotNum = lot?.lotNumber || String(targetId).slice(-6).toUpperCase();
    const filename = `TheGrandStore_Certificate_Lot_${safeLotNum}`;

    try {
      const certData = await fetchCertificateBase64(targetId);
      const pdfDataUrl = certData?.pdfBase64;
      if (pdfDataUrl) {
        await RNShare.open({
          title: `Certificate of Acquisition - Lot #${safeLotNum}`,
          subject: `Official Certificate of Acquisition • ${lot?.title || "Masterpiece"}`,
          url: pdfDataUrl,
          filename: filename,
          type: "application/pdf",
          message: `🏆 Official Certificate of Acquisition awarded for Lot #${safeLotNum}: ${lot?.title || "Masterpiece"}\n\nThe Grand Store Private Vault Provenance.`,
          useInternalStorage: true,
          failOnCancel: false,
        });
        return;
      }
    } catch (e) {
      console.log("RNShare share error:", e);
    }

    // Standard Share fallback
    const certUrl = `https://grandstoreglobal.com/auction/${targetId}`;
    try {
      await Share.share({
        title: `The Grand Store Certificate of Acquisition - ${lot?.title}`,
        message: `🏆 Official Certificate of Acquisition awarded for Lot #${safeLotNum}: ${lot?.title}\n\nVerify provenance:\n${certUrl}`,
        url: certUrl,
      });
    } catch (e) {
      console.log("Error sharing certificate:", e);
    }
  }, [lot, lotId, fetchCertificateBase64]);

  // 1-second precision anti-sniping clock ticker
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const safeFetch = async (endpoint, options = {}) => {
    const candidates = getLotApiCandidates();
    for (const base of candidates) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);
        const cleanBase = base.replace(/\/$/, "");
        const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
        const url = `${cleanBase}${cleanEndpoint}`;
        const res = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timer);
        if (res) return res;
      } catch (err) {
        // try next candidate
      }
    }
    return null;
  };

  const loadStoredUser = async () => {
    try {
      const [stored, storedToken] = await Promise.all([
        AsyncStorage.getItem("userInfo"),
        AsyncStorage.getItem("userToken"),
      ]);

      let parsed = null;
      if (stored) {
        parsed = JSON.parse(stored);
        setUser(parsed);
      }

      const activeToken = parsed?.token || storedToken || null;
      if (activeToken) {
        setToken(activeToken);
      }

      // Strict check: pending status must never be bypassed by local session
      const isPending = Boolean(parsed?.bidderApprovalStatus === "pending_approval");
      const isApproved = !isPending && Boolean(
        parsed?.bidderApprovalStatus === "approved" ||
        (parsed?.isAgeVerified === true && parsed?.bidderApprovalStatus !== "pending_approval" && parsed?.bidderApprovalStatus !== "rejected") ||
        (['level_2_verified', 'level_3_enhanced', 'level_4_vip'].includes(parsed?.bidderLevel))
      );

      console.log('[AuctionLotDetails] loadStoredUser: parsed =', parsed ? { email: parsed.email, bidderApprovalStatus: parsed.bidderApprovalStatus, isAgeVerified: parsed.isAgeVerified, bidderLevel: parsed.bidderLevel } : 'NULL', 'storedToken =', storedToken ? 'YES' : 'NO');

      if (isPending) {
        setBidderProfile((prev) => ({
          ...(prev || {}),
          isVerified: false,
          isPending: true,
          bidderApprovalStatus: "pending_approval",
          biddingLimit: 0,
        }));
      } else if (isApproved) {
        setBidderProfile((prev) => ({
          ...(prev || {}),
          isVerified: true,
          isPending: false,
          bidderApprovalStatus: parsed?.bidderApprovalStatus || "approved",
          biddingLimit: parsed?.biddingLimit || prev?.biddingLimit || 25000,
          bidderLevel: parsed?.bidderLevel || prev?.bidderLevel || "level_2_verified",
          bidderNumber: parsed?.bidderNumber || prev?.bidderNumber || null,
          isBiddingSuspended: parsed?.isBiddingSuspended || false,
        }));
      }

      if (activeToken) {
        fetchBidderStatus(activeToken);
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

        // Synchronize local session with fresh server verification data
        if (data.isVerified && data.bidderApprovalStatus !== "pending_approval") {
          AsyncStorage.setItem("isAgeVerified", "true").catch(() => {});
          AsyncStorage.setItem("grand-store-age-verified", "true").catch(() => {});
          try {
            const raw = await AsyncStorage.getItem("userInfo");
            if (raw) {
              const u = JSON.parse(raw);
              u.isAgeVerified = true;
              u.bidderApprovalStatus = data.bidderApprovalStatus || "approved";
              u.bidderLevel = data.bidderLevel || "level_2_verified";
              u.biddingLimit = data.biddingLimit || 50000;
              u.bidderNumber = data.bidderNumber;
              await AsyncStorage.setItem("userInfo", JSON.stringify(u));
              setUser(u);
            }
          } catch (storageErr) {}
        } else {
          AsyncStorage.removeItem("isAgeVerified").catch(() => {});
          AsyncStorage.removeItem("grand-store-age-verified").catch(() => {});
          try {
            const raw = await AsyncStorage.getItem("userInfo");
            if (raw) {
              const u = JSON.parse(raw);
              u.isAgeVerified = false;
              if (data.bidderApprovalStatus) {
                u.bidderApprovalStatus = data.bidderApprovalStatus;
              }
              await AsyncStorage.setItem("userInfo", JSON.stringify(u));
              setUser(u);
            }
          } catch (storageErr) {}
        }
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

          // Auto-trigger victory celebration if current user won and unpaid (only once)
          if (user && data.lot?.winner) {
            const winnerId = typeof data.lot.winner === "object" ? data.lot.winner._id : data.lot.winner;
            if (winnerId === user._id && data.lot.status === "sold" && data.lot.paymentStatus !== "Paid") {
              const alreadyDismissed = dismissedCelebrationRef.current.has(String(targetId));
              if (!alreadyDismissed) {
                const storedDismiss = await AsyncStorage.getItem(`hasDismissedCelebration_${targetId}`);
                if (storedDismiss === "true") {
                  dismissedCelebrationRef.current.add(String(targetId));
                } else {
                  setShowCelebrationModal(true);
                }
              }
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

    const sub = DeviceEventEmitter.addListener("userAgeVerified", () => {
      loadStoredUser();
      if (token) {
        fetchBidderStatus(token);
      }
    });

    return () => {
      if (sub && typeof sub.remove === "function") {
        sub.remove();
      }
    };
  }, [token]);

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

  const isUserPending = Boolean(
    bidderProfile?.isPending === true ||
    bidderProfile?.bidderApprovalStatus === "pending_approval" ||
    user?.bidderApprovalStatus === "pending_approval"
  );

  const isUserVerified = !isUserPending && Boolean(
    bidderProfile?.isVerified === true ||
    bidderProfile?.bidderApprovalStatus === "approved" ||
    user?.bidderApprovalStatus === "approved" ||
    (user?.isAgeVerified === true && user?.bidderApprovalStatus !== "pending_approval" && user?.bidderApprovalStatus !== "rejected") ||
    (['level_2_verified', 'level_3_enhanced', 'level_4_vip'].includes(user?.bidderLevel)) ||
    (['level_2_verified', 'level_3_enhanced', 'level_4_vip'].includes(bidderProfile?.bidderLevel))
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

    const isPending =
      bidderProfile?.isPending === true ||
      bidderProfile?.bidderApprovalStatus === "pending_approval" ||
      user?.bidderApprovalStatus === "pending_approval";

    const isVerified = !isPending && Boolean(
      bidderProfile?.isVerified === true ||
      bidderProfile?.bidderApprovalStatus === "approved" ||
      user?.bidderApprovalStatus === "approved" ||
      (user?.isAgeVerified === true && user?.bidderApprovalStatus !== "pending_approval" && user?.bidderApprovalStatus !== "rejected") ||
      (['level_2_verified', 'level_3_enhanced', 'level_4_vip'].includes(user?.bidderLevel)) ||
      (['level_2_verified', 'level_3_enhanced', 'level_4_vip'].includes(bidderProfile?.bidderLevel))
    );

    if (isPending) {
      Alert.alert(
        "Verification Under Review",
        "Your 18+ bidder verification application has been submitted and is currently undergoing compliance review by our verification team. You will be cleared to bid once approved."
      );
      return;
    }

    if (!isVerified) {
      setVerificationModalOpen(true);
      return;
    }

    const isSuspended = bidderProfile?.isBiddingSuspended || user?.isBiddingSuspended;
    if (isSuspended) {
      Alert.alert(
        "Privileges Suspended",
        bidderProfile?.biddingSuspensionReason || user?.biddingSuspensionReason || "Account under compliance review."
      );
      return;
    }

    const effectiveLimit = bidderProfile?.biddingLimit || user?.biddingLimit || 25000;
    if (effectiveLimit > 0 && amt > effectiveLimit) {
      Alert.alert(
        "Bidding Limit Exceeded",
        `Your bid of R${amt.toLocaleString("en-ZA")} exceeds your current certified limit of R${effectiveLimit.toLocaleString("en-ZA")}. Upgrade to VIP Bidding with a refundable escrow deposit of R5,000 to unlock limits of R250,000+.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Upgrade to VIP",
            onPress: () => navigation.navigate("AuctionVipCheckout", { user, returnScreen: "AuctionLotDetails" }),
          },
        ]
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
      const activeToken = token || (await AsyncStorage.getItem("userToken"));
      if (!activeToken) {
        Alert.alert("Authentication Required", "Session expired. Please sign in again.");
        setConfirmModalOpen(false);
        return;
      }

      const res = await safeFetch(`/auction/${lot._id}/bid`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeToken}`,
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
        const errData = res ? await res.json().catch(() => ({})) : {};
        const errorMsg = errData.message || "Could not place bid at this time.";
        Alert.alert("Bid Not Accepted", errorMsg);
        setConfirmModalOpen(false);
      }
    } catch (e) {
      Alert.alert("Connection Error", "Network error placing bid. Please try again.");
      setConfirmModalOpen(false);
    } finally {
      setSubmitting(false);
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

        {/* 4. Official certificate of acquisition */}
        {isSold && isWinner && (
          <View style={styles.certOuterContainer}>
            <View style={styles.certInnerFrame}>
              <AuctionAcquisitionCertificate lot={lot} user={user} />

              {/* Action Buttons: Download PDF & Share */}
              <View style={styles.certButtonRow}>
                <TouchableOpacity
                  style={[styles.certDownloadBtn, downloadingCert && { opacity: 0.6 }]}
                  onPress={handleDownloadCertificate}
                  disabled={downloadingCert}
                  activeOpacity={0.8}
                >
                  <Text style={styles.certDownloadBtnText}>
                    {downloadingCert ? "⏳ DOWNLOADING PDF..." : "📜 DOWNLOAD OFFICIAL PDF"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.certShareBtn}
                  onPress={handleShareCertificate}
                  activeOpacity={0.8}
                >
                  <Text style={styles.certShareBtnText}>🔗 SHARE</Text>
                </TouchableOpacity>
              </View>

              {/* Settlement / Claim Status CTA */}
              <View style={{ marginTop: 12 }}>
                {lot.paymentStatus === "Paid" ? (
                  <View style={styles.certPaidBadge}>
                    <Text style={styles.certPaidBadgeText}>
                      ✓ ACQUISITION SETTLED • VAULT DISPATCH IN PREPARATION
                    </Text>
                  </View>
                ) : (lot.paymentStatus === "Awaiting_Approval" || Boolean(lot.proofUrl)) ? (
                  <TouchableOpacity
                    style={styles.certAwaitingBadge}
                    onPress={() => navigation.navigate("AuctionCheckout", { lotId: lot._id, lot })}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.certAwaitingBadgeText}>
                      ⏳ EFT PROOF SUBMITTED • AWAITING ADMIN VERIFICATION
                    </Text>
                  </TouchableOpacity>
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
              </View>

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
            </View>
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
            {isUserPending ? (
              <View style={styles.pendingStatusBox}>
                <View style={styles.pendingStatusHeaderRow}>
                  <Text style={styles.pendingStatusIcon}>⏳</Text>
                  <Text style={styles.pendingStatusTitle}>18+ Verification Under Review</Text>
                </View>
                <Text style={styles.pendingStatusDesc}>
                  Your national ID / passport verification has been submitted and is currently undergoing compliance review. Live bidding will unlock as soon as administrator approval is granted.
                </Text>
              </View>
            ) : isUserVerified ? (
              <View>
                <View style={styles.verifiedBidderBox}>
                  <View style={styles.verifiedBidderHeader}>
                    <Text style={styles.verifiedCheckmark}>✓</Text>
                    <Text style={styles.verifiedTitle}>
                      18+ Certified Bidder • Limit: R{(bidderProfile?.biddingLimit || user?.biddingLimit || 25000).toLocaleString("en-ZA")}
                    </Text>
                  </View>
                  <Text style={styles.verifiedDesc}>
                    Your account is fully authenticated for live auction bidding.
                  </Text>
                </View>

                {/* VIP Tier Upgrade Banner (if not already VIP level 4) */}
                {Boolean(
                  bidderProfile?.bidderLevel !== "level_4_vip" &&
                  user?.bidderLevel !== "level_4_vip"
                ) && (
                  <TouchableOpacity
                    style={styles.vipUpgradeBanner}
                    activeOpacity={0.88}
                    onPress={() => navigation.navigate("AuctionVipCheckout", { user, returnScreen: "AuctionLotDetails" })}
                  >
                    <View style={styles.vipBannerLeft}>
                      <Text style={styles.vipBannerCrown}>👑</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.vipBannerTitle}>Upgrade to VIP Bidding</Text>
                        <Text style={styles.vipBannerSubtitle}>
                          R5,000 Refundable Escrow Deposit • Unlock R250,000+ Limit
                        </Text>
                      </View>
                    </View>
                    <View style={styles.vipBannerCtaBadge}>
                      <Text style={styles.vipBannerCtaText}>UPGRADE →</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
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
                  style={[styles.quickChip, isUserPending && { opacity: 0.4 }]}
                  onPress={() => !isUserPending && applyQuickIncrement(inc)}
                  activeOpacity={isUserPending ? 1 : 0.7}
                  disabled={isUserPending}
                >
                  <Text style={styles.quickChipText}>+R{inc.toLocaleString()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Bid Input Box */}
            <View style={[styles.inputContainer, isUserPending && { opacity: 0.5 }]}>
              <Text style={styles.currencyPrefix}>ZAR (R)</Text>
              <TextInput
                style={styles.bidInput}
                keyboardType="numeric"
                value={bidAmount}
                onChangeText={setBidAmount}
                placeholder={`Min: ${nextMinimum.toLocaleString("en-ZA")}`}
                placeholderTextColor="#555"
                editable={!isUserPending}
              />
            </View>

            {/* Max Auto-Bid Toggle */}
            <TouchableOpacity
              style={[styles.maxBidRow, isUserPending && { opacity: 0.5 }]}
              onPress={() => !isUserPending && setIsMaxBid(!isMaxBid)}
              activeOpacity={isUserPending ? 1 : 0.8}
              disabled={isUserPending}
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
              style={[styles.submitBidBtn, isUserPending && styles.submitBidBtnDisabled]}
              onPress={handleOpenBidConfirm}
              activeOpacity={isUserPending ? 0.9 : 0.88}
            >
              <LinearGradient
                colors={isUserPending ? ["#2b2210", "#1e170b", "#141007"] : ["#ffd700", "#d4af37", "#997520"]}
                style={styles.submitBidGradient}
              >
                <Text style={[styles.submitBidText, isUserPending && styles.submitBidTextDisabled]}>
                  {isUserPending
                    ? "⏳ 18+ VERIFICATION UNDER REVIEW • LOCKED"
                    : `SUBMIT BID • R${Number(bidAmount || nextMinimum).toLocaleString("en-ZA")} →`}
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

      {/* 18+ DYNAMIC ADMIN BIDDER VERIFICATION MODAL */}
      <BidderVerificationModal
        visible={verificationModalOpen}
        onClose={() => setVerificationModalOpen(false)}
        onSuccess={(data) => {
          setVerificationModalOpen(false);
          const activeTok = token || data?.token;
          if (activeTok) fetchBidderStatus(activeTok);
          loadStoredUser();
        }}
        user={user}
        token={token}
        bidderProfile={bidderProfile}
      />

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
                handleDismissCelebration();
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
              onPress={handleDismissCelebration}
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

  // Certificate frame and existing actions
  certOuterContainer: {
    marginHorizontal: 16,
    marginVertical: 14,
    backgroundColor: "#fbf8f1",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#b99b60",
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  certInnerFrame: {
    position: "relative",
  },
  certButtonRow: {
    flexDirection: "column",
    gap: 8,
    marginTop: 14,
    zIndex: 1,
  },
  certDownloadBtn: {
    minHeight: 48,
    backgroundColor: "#161616",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#c5a059",
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  certDownloadBtnText: {
    color: "#f5d77f",
    fontSize: 10.5,
    fontWeight: "bold",
    letterSpacing: 0.8,
    textAlign: "center",
  },
  certShareBtn: {
    minHeight: 44,
    backgroundColor: "rgba(197, 160, 89, 0.15)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#c5a059",
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  certShareBtnText: {
    color: "#705214",
    fontSize: 10.5,
    fontWeight: "bold",
    letterSpacing: 0.8,
    textAlign: "center",
  },
  certPaidBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderColor: "rgba(16, 185, 129, 0.5)",
    borderWidth: 1,
    borderRadius: 10,
    padding: 11,
    alignItems: "center",
  },
  certPaidBadgeText: {
    color: "#059669",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.8,
    textAlign: "center",
  },
  certAwaitingBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderColor: "rgba(245, 158, 11, 0.5)",
    borderWidth: 1,
    borderRadius: 10,
    padding: 11,
    alignItems: "center",
  },
  certAwaitingBadgeText: {
    color: "#b45309",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.8,
    textAlign: "center",
  },
  claimLotBtn: {
    borderRadius: 10,
    overflow: "hidden",
  },
  claimLotGradient: {
    paddingVertical: 12,
    alignItems: "center",
  },
  claimLotText: {
    color: "#000",
    fontSize: 11.5,
    fontWeight: "900",
    letterSpacing: 1,
  },
  calendarMiniCard: {
    backgroundColor: "#F4F1E6",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(197, 160, 89, 0.3)",
    padding: 10,
    marginTop: 10,
  },
  calendarMiniHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  calendarMiniIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  calendarMiniTitle: {
    color: "#1a1a1a",
    fontSize: 10.5,
    fontWeight: "bold",
  },
  calendarMiniDesc: {
    color: "#6b5a41",
    fontSize: 9.5,
  },
  calendarLocationRow: {
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "rgba(197, 160, 89, 0.2)",
  },
  calendarLocationText: {
    color: "#4a4237",
    fontSize: 9.5,
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
  verifiedBidderBox: {
    backgroundColor: "rgba(34, 197, 94, 0.08)",
    borderColor: "rgba(34, 197, 94, 0.3)",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  verifiedBidderHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  verifiedCheckmark: {
    color: "#4ade80",
    fontSize: 12,
    fontWeight: "900",
  },
  verifiedTitle: {
    color: "#4ade80",
    fontSize: 11,
    fontWeight: "bold",
    flex: 1,
  },
  verifiedDesc: {
    color: "rgba(187, 247, 208, 0.7)",
    fontSize: 10,
    marginTop: 2,
    paddingLeft: 18,
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
  pendingStatusHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  pendingStatusIcon: {
    fontSize: 14,
  },
  vipUpgradeBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(212, 175, 55, 0.12)",
    borderColor: "rgba(212, 175, 55, 0.4)",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    marginBottom: 12,
  },
  vipBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  vipBannerCrown: {
    fontSize: 18,
  },
  vipBannerTitle: {
    color: "#ffd700",
    fontSize: 11,
    fontWeight: "bold",
  },
  vipBannerSubtitle: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 9.5,
    marginTop: 2,
  },
  vipBannerCtaBadge: {
    backgroundColor: "#d4af37",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginLeft: 8,
  },
  vipBannerCtaText: {
    color: "#000",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
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
  submitBidBtnDisabled: {
    borderColor: "rgba(245, 158, 11, 0.4)",
    borderWidth: 1,
  },
  submitBidTextDisabled: {
    color: "#fbbf24",
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 0.8,
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
