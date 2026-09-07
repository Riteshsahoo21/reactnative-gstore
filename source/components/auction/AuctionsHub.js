/* eslint-disable prettier/prettier */
/* eslint-disable quotes */
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  ScrollView,
  StatusBar,
  Platform,
  DeviceEventEmitter,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AppHeader from "../../widgets/AppHeader";
import {
  API_BASE,
  getActiveServerHost,
  getActiveApiBase,
  getCandidateBases,
} from "../../resources/data/Constants";

const { width } = Dimensions.get("window");

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

const CATEGORIES = ["All", "Whisky", "Wine", "Champagne", "Cognac", "Rare Spirits"];

const resolveImage = (img) => {
  if (!img) return "https://images.unsplash.com/photo-1527281400683-1aae777175f8?auto=format&fit=crop&q=80&w=1000";
  if (img.startsWith("http")) return img;
  return `${getActiveServerHost()}/${img.replace(/^\//, "")}`;
};

const getAuctionTime = (ms) => {
  if (ms < 0) ms = 0;
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((ms / 1000 / 60) % 60);
  const seconds = Math.floor((ms / 1000) % 60);
  return { days, hours, minutes, seconds };
};

export default function AuctionsHub({ navigation }) {
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("live"); // 'live' | 'upcoming' | 'sold'
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [bidderStatus, setBidderStatus] = useState(null);
  const [now, setNow] = useState(Date.now());

  // 1-second local timer for anti-sniping clock sync
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

  const fetchAuctions = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      // Try /auction first, then /auctions
      let res = await safeFetch("/auction");
      if (!res || !res.ok) {
        res = await safeFetch("/auctions");
      }

      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setLots(data);
        }
      }
    } catch (e) {
      console.log("Error fetching auctions:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchBidderStatus = useCallback(async () => {
    try {
      const [token, userInfoRaw] = await Promise.all([
        AsyncStorage.getItem("userToken"),
        AsyncStorage.getItem("userInfo"),
      ]);

      if (userInfoRaw) {
        try {
          const u = JSON.parse(userInfoRaw);
          const isApproved =
            u?.bidderApprovalStatus === "approved" ||
            u?.isAgeVerified === true ||
            (u?.bidderLevel && u.bidderLevel !== "none");

          if (isApproved) {
            setBidderStatus((prev) => prev || {
              isVerified: true,
              bidderApprovalStatus: u?.bidderApprovalStatus || "approved",
              biddingLimit: u?.biddingLimit || 25000,
              bidderLevel: u?.bidderLevel || "level_2_verified",
              bidderNumber: u?.bidderNumber || null,
            });
          }
        } catch (err) {}
      }

      const activeToken = token || (userInfoRaw ? JSON.parse(userInfoRaw)?.token : null);
      if (!activeToken) return;

      const res = await safeFetch("/auction/bidder/status", {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (res && res.ok) {
        const data = await res.json();
        setBidderStatus(data);
      }
    } catch (e) {
      // Ignore
    }
  }, []);

  useEffect(() => {
    fetchAuctions();
    fetchBidderStatus();

    const subLogin = DeviceEventEmitter.addListener("userLoggedIn", () => {
      fetchBidderStatus();
      fetchAuctions(true);
    });

    const poller = setInterval(() => {
      fetchAuctions(true);
    }, 5000);

    return () => {
      subLogin.remove();
      clearInterval(poller);
    };
  }, [fetchAuctions, fetchBidderStatus]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAuctions(false);
    fetchBidderStatus();
  };

  // Filter lots according to tab and category
  const filteredLots = lots.filter((lot) => {
    // 1. Category filter
    if (selectedCategory !== "All") {
      const cat = (lot.category || "").toLowerCase();
      if (!cat.includes(selectedCategory.toLowerCase())) return false;
    }

    // 2. Tab filter based on status and dates
    const isEnded = lot.status === "closed" || lot.status === "sold" || lot.status === "unsold" || (lot.endDate && new Date(lot.endDate).getTime() < now);
    const hasStarted = lot.startDate ? new Date(lot.startDate).getTime() <= now : true;

    if (activeTab === "live") {
      return (lot.status === "live" || lot.status === "extended") && hasStarted && !isEnded;
    }
    if (activeTab === "upcoming") {
      return (lot.status === "upcoming" || !hasStarted) && !isEnded;
    }
    if (activeTab === "sold") {
      return isEnded;
    }
    return true;
  });

  const renderCountdown = (endDate) => {
    if (!endDate) return null;
    const endMs = new Date(endDate).getTime();
    const diff = endMs - now;
    if (diff <= 0) {
      return <Text style={styles.countdownTextClosed}>Gavel Closed</Text>;
    }
    const t = getAuctionTime(diff);
    return (
      <View style={styles.countdownBox}>
        <Text style={styles.countdownUnit}>
          <Text style={styles.countdownDigit}>{String(t.days).padStart(2, "0")}</Text>d
        </Text>
        <Text style={styles.countdownColon}>:</Text>
        <Text style={styles.countdownUnit}>
          <Text style={styles.countdownDigit}>{String(t.hours).padStart(2, "0")}</Text>h
        </Text>
        <Text style={styles.countdownColon}>:</Text>
        <Text style={styles.countdownUnit}>
          <Text style={styles.countdownDigit}>{String(t.minutes).padStart(2, "0")}</Text>m
        </Text>
        <Text style={styles.countdownColon}>:</Text>
        <Text style={styles.countdownUnit}>
          <Text style={styles.countdownDigit}>{String(t.seconds).padStart(2, "0")}</Text>s
        </Text>
      </View>
    );
  };

  const renderLotCard = ({ item: lot }) => {
    const isLive = lot.status === "live" || lot.status === "extended";
    const isSold = lot.status === "sold";
    const coverImage = resolveImage(lot.images?.[0]);
    const currentBidVal = lot.currentBid > 0 ? lot.currentBid : lot.startingBid || 0;
    const bidsCount = lot.bidCount || 0;

    return (
      <TouchableOpacity
        style={styles.lotCard}
        onPress={() => navigation.navigate("AuctionLotDetails", { lotId: lot._id, lot })}
        activeOpacity={0.9}
      >
        {/* Cover Image & Vignette Gradient */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: coverImage }} style={styles.lotImage} resizeMode="cover" />
          <LinearGradient
            colors={["rgba(10, 9, 7, 0.2)", "rgba(10, 9, 7, 0.6)", "#0e0c0a"]}
            style={styles.imageGradient}
          />

          {/* Top Floating Badges */}
          <View style={styles.topBadgesRow}>
            <View style={styles.lotNumberBadge}>
              <Text style={styles.lotNumberText}>
                LOT {lot.lotNumber || `GS-${lot._id.slice(-6).toUpperCase()}`}
              </Text>
            </View>

            {isLive ? (
              <View style={styles.livePulseBadge}>
                <View style={styles.pulseDot} />
                <Text style={styles.livePulseText}>LIVE GAVEL</Text>
              </View>
            ) : isSold ? (
              <View style={styles.soldBadge}>
                <Text style={styles.soldBadgeText}>HAMMER SOLD</Text>
              </View>
            ) : (
              <View style={styles.upcomingBadge}>
                <Text style={styles.upcomingBadgeText}>UPCOMING</Text>
              </View>
            )}
          </View>

          {/* Anti-Sniping Indicator */}
          {lot.isExtended && (
            <View style={styles.extendedBanner}>
              <Text style={styles.extendedBannerText}>⚡ Anti-Sniping Extension +2m</Text>
            </View>
          )}

          {/* Countdown Clock Floating on Image Bottom */}
          <View style={styles.countdownOverlay}>
            <Text style={styles.countdownLabel}>
              {isSold ? "FINAL GAVEL" : isLive ? "CLOSING IN" : "STARTS IN"}
            </Text>
            {renderCountdown(isLive ? lot.endDate : lot.startDate || lot.endDate)}
          </View>
        </View>

        {/* Content Body */}
        <View style={styles.cardBody}>
          {/* Specifications Pills */}
          <View style={styles.specsRow}>
            {lot.category ? (
              <View style={styles.specPill}>
                <Text style={styles.specPillText}>{lot.category}</Text>
              </View>
            ) : null}
            {lot.vintage ? (
              <View style={styles.specPill}>
                <Text style={styles.specPillText}>{lot.vintage} Vintage</Text>
              </View>
            ) : null}
            {lot.fillLevel ? (
              <View style={styles.specPill}>
                <Text style={styles.specPillText}>{lot.fillLevel}</Text>
              </View>
            ) : null}
            {lot.reserveMet ? (
              <View style={styles.reserveMetPill}>
                <Text style={styles.reserveMetText}>✓ Reserve Met</Text>
              </View>
            ) : null}
          </View>

          {/* Title */}
          <Text style={styles.lotTitle} numberOfLines={2}>
            {lot.title}
          </Text>

          {/* Distillery / Subtitle */}
          <Text style={styles.distilleryText} numberOfLines={1}>
            {lot.distillery || "Imperial Private Cellar"} {lot.ageStatement ? `• ${lot.ageStatement}` : ""}
          </Text>

          {/* Financial & Bid Summary */}
          <View style={styles.financialSection}>
            <View>
              <Text style={styles.bidLabel}>
                {isSold ? "HAMMER PRICE" : lot.currentBid > 0 ? "CURRENT LEADING BID" : "OPENING BID"}
              </Text>
              <Text style={styles.currentBidVal}>
                R{Number(isSold && lot.winningBid ? lot.winningBid : currentBidVal).toLocaleString("en-ZA")}
              </Text>
              {lot.estimatedValueMin ? (
                <Text style={styles.estimateRange}>
                  Est. R{Number(lot.estimatedValueMin).toLocaleString("en-ZA")} – R{Number(lot.estimatedValueMax || lot.estimatedValueMin).toLocaleString("en-ZA")}
                </Text>
              ) : null}
            </View>

            <TouchableOpacity
              style={[styles.bidActionBtn, isSold && styles.bidActionBtnSold]}
              onPress={() => navigation.navigate("AuctionLotDetails", { lotId: lot._id, lot })}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={isSold ? ["#333", "#222"] : ["#f5c242", "#c99742", "#9e7428"]}
                style={styles.bidActionGradient}
              >
                <Text style={[styles.bidActionText, isSold && { color: "#bbb" }]}>
                  {isSold ? "View Recap" : "Bid Now →"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Footer Bid Count & Authentication Seal */}
          <View style={styles.cardFooter}>
            <Text style={styles.bidsCountText}>
              🏛️ {bidsCount} {bidsCount === 1 ? "Bid Placed" : "Bids Placed"}
            </Text>
            <View style={styles.authenticatedPill}>
              <Text style={styles.authenticatedText}>🛡️ Vault Authenticated</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080705" />

      {/* Luxury App Header with VIP Passes / My Bids shortcut */}
      <AppHeader
        title="RARE & FINE AUCTIONS"
        backgroundColor="#0c0a08"
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

      {/* Sub-Header Banner & VIP Status Bar */}
      <View style={styles.heroSubHeader}>
        <View style={styles.heroTextCol}>
          <Text style={styles.heroPreTitle}>THE GRAND VAULT AUCTIONEERS</Text>
          <Text style={styles.heroTitle}>Rare Spirits & Vintage Wines</Text>
          <Text style={styles.heroDesc}>
            Certified provenance, bonded vault escrow & confidential bidding.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.myBidsShortcut}
          onPress={() => navigation.navigate("MyBids")}
          activeOpacity={0.8}
        >
          <Text style={styles.myBidsIcon}>🏆</Text>
          <Text style={styles.myBidsText}>My Bids</Text>
        </TouchableOpacity>
      </View>

      {/* Bidder Verification Status Pill */}
      {bidderStatus && (
        <View style={styles.bidderStatusContainer}>
          <View style={styles.bidderStatusPill}>
            <Text style={styles.bidderStatusIcon}>
              {bidderStatus.isVerified ? "✓" : "⚡"}
            </Text>
            <Text style={styles.bidderStatusText}>
              {bidderStatus.isVerified
                ? `Approved Bidder • ${bidderStatus.bidderNumber || "VIP"} (Limit: R${Number(bidderStatus.biddingLimit || 0).toLocaleString()})`
                : bidderStatus.isPending
                ? "Bidder Verification Pending Review"
                : "18+ Bidder Verification Required to Bid"}
            </Text>
          </View>
        </View>
      )}

      {/* Catalogue Phase Tabs */}
      <View style={styles.phaseTabsContainer}>
        <TouchableOpacity
          style={[styles.phaseTab, activeTab === "live" && styles.phaseTabActive]}
          onPress={() => setActiveTab("live")}
          activeOpacity={0.8}
        >
          <View style={styles.tabLiveDot} />
          <Text style={[styles.phaseTabText, activeTab === "live" && styles.phaseTabTextActive]}>
            Live Auctions
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.phaseTab, activeTab === "upcoming" && styles.phaseTabActive]}
          onPress={() => setActiveTab("upcoming")}
          activeOpacity={0.8}
        >
          <Text style={[styles.phaseTabText, activeTab === "upcoming" && styles.phaseTabTextActive]}>
            Upcoming Lots
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.phaseTab, activeTab === "sold" && styles.phaseTabActive]}
          onPress={() => setActiveTab("sold")}
          activeOpacity={0.8}
        >
          <Text style={[styles.phaseTabText, activeTab === "sold" && styles.phaseTabTextActive]}>
            Sold Archive
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category Filter Horizontal Scroll */}
      <View style={styles.categoriesSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,
                selectedCategory === cat && styles.categoryChipSelected,
              ]}
              onPress={() => setSelectedCategory(cat)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === cat && styles.categoryChipTextSelected,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main Lot Feed */}
      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color="#c99742" />
          <Text style={styles.loadingText}>Opening Grand Vault Catalogue...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredLots}
          renderItem={renderLotCard}
          keyExtractor={(item, index) => item._id || item.id || String(index)}
          contentContainerStyle={styles.lotListContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#c99742"
              colors={["#c99742"]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🏛️</Text>
              <Text style={styles.emptyTitle}>
                {activeTab === "live"
                  ? "No Live Auctions in Progress"
                  : activeTab === "upcoming"
                  ? "No Upcoming Lots Scheduled"
                  : "No Past Lots Found"}
              </Text>
              <Text style={styles.emptyDesc}>
                {activeTab === "live"
                  ? "Exclusive lots are being prepared in our bonded cellar. Check Upcoming Lots or view the Sold Archive."
                  : "Check back shortly for newly catalogued rare vintages and collector releases."}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#080705",
  },
  heroSubHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#110e0a",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(201, 151, 66, 0.2)",
  },
  heroTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  heroPreTitle: {
    color: "#c99742",
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "900",
  },
  heroDesc: {
    color: "#888",
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  myBidsShortcut: {
    backgroundColor: "rgba(201, 151, 66, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.35)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
  },
  myBidsIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  myBidsText: {
    color: "#f5c242",
    fontSize: 10,
    fontWeight: "800",
  },

  // Bidder Status
  bidderStatusContainer: {
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  bidderStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(201, 151, 66, 0.08)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.25)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  bidderStatusIcon: {
    color: "#f5c242",
    fontSize: 11,
    fontWeight: "900",
    marginRight: 6,
  },
  bidderStatusText: {
    color: "#d4af37",
    fontSize: 10.5,
    fontWeight: "700",
    flex: 1,
  },

  // Tabs
  phaseTabsContainer: {
    flexDirection: "row",
    backgroundColor: "#0d0b08",
    marginHorizontal: 14,
    marginTop: 10,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  phaseTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 8,
  },
  phaseTabActive: {
    backgroundColor: "rgba(201, 151, 66, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.4)",
  },
  tabLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4cd964",
    marginRight: 6,
  },
  phaseTabText: {
    color: "#888",
    fontSize: 11.5,
    fontWeight: "700",
  },
  phaseTabTextActive: {
    color: "#f5c242",
    fontWeight: "900",
  },

  // Category Filter
  categoriesSection: {
    marginVertical: 10,
  },
  categoryScroll: {
    paddingHorizontal: 14,
    gap: 8,
  },
  categoryChip: {
    backgroundColor: "#13100c",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  categoryChipSelected: {
    backgroundColor: "#c99742",
    borderColor: "#c99742",
  },
  categoryChipText: {
    color: "#aaa",
    fontSize: 11,
    fontWeight: "600",
  },
  categoryChipTextSelected: {
    color: "#080705",
    fontWeight: "900",
  },

  // Lot List
  lotListContent: {
    paddingHorizontal: 14,
    paddingBottom: 40,
  },
  lotCard: {
    backgroundColor: "#110f0c",
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: "rgba(201, 151, 66, 0.22)",
    overflow: "hidden",
    marginBottom: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },

  // Card Image Stage
  imageContainer: {
    width: "100%",
    height: 240,
    position: "relative",
    justifyContent: "space-between",
  },
  lotImage: {
    ...StyleSheet.absoluteFillObject,
  },
  imageGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  topBadgesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    zIndex: 10,
  },
  lotNumberBadge: {
    backgroundColor: "rgba(10, 9, 7, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.4)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  lotNumberText: {
    color: "#f5c242",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  livePulseBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(76, 217, 100, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(76, 217, 100, 0.4)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4cd964",
    marginRight: 5,
  },
  livePulseText: {
    color: "#4cd964",
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  soldBadge: {
    backgroundColor: "rgba(220, 53, 69, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(220, 53, 69, 0.4)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  soldBadgeText: {
    color: "#ff6b6b",
    fontSize: 9.5,
    fontWeight: "900",
  },
  upcomingBadge: {
    backgroundColor: "rgba(50, 130, 250, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(50, 130, 250, 0.4)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  upcomingBadgeText: {
    color: "#64b5f6",
    fontSize: 9.5,
    fontWeight: "900",
  },
  extendedBanner: {
    position: "absolute",
    top: 48,
    left: 12,
    backgroundColor: "rgba(245, 194, 66, 0.2)",
    borderColor: "#f5c242",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  extendedBannerText: {
    color: "#f5c242",
    fontSize: 10,
    fontWeight: "800",
  },
  countdownOverlay: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(10, 9, 7, 0.8)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  countdownLabel: {
    color: "#c99742",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 1,
  },
  countdownBox: {
    flexDirection: "row",
    alignItems: "center",
  },
  countdownUnit: {
    color: "#aaa",
    fontSize: 11,
    fontWeight: "600",
  },
  countdownDigit: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
    fontFamily: Platform.OS === "android" ? "monospace" : "Menlo",
  },
  countdownColon: {
    color: "#666",
    fontSize: 12,
    marginHorizontal: 3,
    fontWeight: "700",
  },
  countdownTextClosed: {
    color: "#888",
    fontSize: 11,
    fontWeight: "700",
  },

  // Card Body
  cardBody: {
    padding: 14,
  },
  specsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  specPill: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  specPillText: {
    color: "#888",
    fontSize: 10,
    fontWeight: "600",
  },
  reserveMetPill: {
    backgroundColor: "rgba(76, 217, 100, 0.12)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(76, 217, 100, 0.3)",
  },
  reserveMetText: {
    color: "#4cd964",
    fontSize: 9.5,
    fontWeight: "800",
  },
  lotTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 21,
    marginBottom: 4,
  },
  distilleryText: {
    color: "#8e867b",
    fontSize: 11.5,
    marginBottom: 12,
  },
  financialSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#16130e",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.2)",
    marginBottom: 10,
  },
  bidLabel: {
    color: "#888",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  currentBidVal: {
    color: "#f5c242",
    fontSize: 18,
    fontWeight: "900",
  },
  estimateRange: {
    color: "#777",
    fontSize: 10,
    marginTop: 2,
  },
  bidActionBtn: {
    borderRadius: 8,
    overflow: "hidden",
  },
  bidActionBtnSold: {
    opacity: 0.8,
  },
  bidActionGradient: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  bidActionText: {
    color: "#080705",
    fontSize: 11.5,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
  bidsCountText: {
    color: "#888",
    fontSize: 11,
    fontWeight: "600",
  },
  authenticatedPill: {
    backgroundColor: "rgba(201, 151, 66, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  authenticatedText: {
    color: "#c99742",
    fontSize: 9.5,
    fontWeight: "800",
  },

  // Loading & Empty
  loadingCenter: {
    paddingVertical: 80,
    alignItems: "center",
  },
  loadingText: {
    color: "#c99742",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 14,
    letterSpacing: 0.8,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: "center",
    paddingHorizontal: 30,
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: 12,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
    textAlign: "center",
  },
  emptyDesc: {
    color: "#777",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 17,
  },
});
