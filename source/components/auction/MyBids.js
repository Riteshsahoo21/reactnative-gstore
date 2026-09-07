/* eslint-disable prettier/prettier */
/* eslint-disable quotes */
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AppHeader from "../../widgets/AppHeader";
import { API_BASE, getActiveServerHost } from "../../resources/data/Constants";

const { width } = Dimensions.get("window");

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

export default function MyBids({ navigation }) {
  const [activeTab, setActiveTab] = useState("active"); // 'active' | 'won' | 'watchlist'
  const [activeLots, setActiveLots] = useState([]);
  const [wonLots, setWonLots] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [bidderProfile, setBidderProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

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

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);

    try {
      const stored = await AsyncStorage.getItem("userInfo");
      if (!stored) {
        setLoading(false);
        setRefreshing(false);
        return;
      }
      const parsed = JSON.parse(stored);
      setUser(parsed);
      setToken(parsed.token);

      const headers = { Authorization: `Bearer ${parsed.token}` };

      // 1. Fetch dashboard data (active lots, won lots, watchlist)
      const dashRes = await safeFetch("/auction/user/dashboard", { headers });
      if (dashRes && dashRes.ok) {
        const data = await dashRes.json();
        setActiveLots(data.activeLots || []);
        setWonLots(data.wonLots || []);
        setWatchlist(data.watchlist || []);
      }

      // 2. Fetch bidder profile
      const profRes = await safeFetch("/auction/bidder/status", { headers });
      if (profRes && profRes.ok) {
        const profData = await profRes.json();
        setBidderProfile(profData);
      }
    } catch (e) {
      console.log("Error loading dashboard:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  // Render Active Bid Card
  const renderActiveLot = ({ item }) => {
    const isLeading = item.isHighBidder || (user && item.highestBidder === user._id);
    const imgUrl = resolveImage(item.images?.[0]);

    return (
      <TouchableOpacity
        style={[styles.bidCard, isLeading && styles.bidCardLeading]}
        onPress={() => navigation.navigate("AuctionLotDetails", { lotId: item._id, lot: item })}
        activeOpacity={0.88}
      >
        <Image source={{ uri: imgUrl }} style={styles.cardImage} resizeMode="contain" />
        <View style={styles.cardContent}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.lotNumber}>LOT #{item.lotNumber || item._id?.slice(-6)?.toUpperCase()}</Text>
            <View style={[styles.positionBadge, isLeading ? styles.leadingBadge : styles.outbidBadge]}>
              <Text style={[styles.positionBadgeText, isLeading ? styles.leadingText : styles.outbidText]}>
                {isLeading ? "👑 HIGH BIDDER" : "⚡ OUTBID"}
              </Text>
            </View>
          </View>

          <Text style={styles.lotTitle} numberOfLines={2}>
            {item.title}
          </Text>

          <View style={styles.financialRow}>
            <View>
              <Text style={styles.finLabel}>CURRENT BID</Text>
              <Text style={styles.finValue}>R{Number(item.currentBid || 0).toLocaleString("en-ZA")}</Text>
            </View>

            <TouchableOpacity
              style={styles.raiseBidBtn}
              onPress={() => navigation.navigate("AuctionLotDetails", { lotId: item._id, lot: item })}
            >
              <LinearGradient colors={["#ffd700", "#c99742"]} style={styles.raiseBidGradient}>
                <Text style={styles.raiseBidText}>{isLeading ? "View Lot" : "Outbid: Raise →"}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render Won Lot Card
  const renderWonLot = ({ item }) => {
    const isPaid = item.paymentStatus === "Paid";
    const imgUrl = resolveImage(item.images?.[0]);

    return (
      <View style={styles.wonCard}>
        <View style={styles.wonHeaderBanner}>
          <View style={styles.wonTagBox}>
            <Text style={styles.wonTagText}>🏆 WON AUCTION</Text>
          </View>
          <View style={[styles.paidStatusBadge, isPaid ? styles.paidBadge : styles.unpaidBadge]}>
            <Text style={[styles.paidStatusText, isPaid ? styles.paidText : styles.unpaidText]}>
              {isPaid ? "✓ Paid & Settled" : "● Awaiting Payment"}
            </Text>
          </View>
        </View>

        <View style={styles.wonBody}>
          <Image source={{ uri: imgUrl }} style={styles.wonImage} resizeMode="contain" />
          <View style={styles.wonDetailsCol}>
            <Text style={styles.lotNumber}>LOT #{item.lotNumber || item._id?.slice(-6)?.toUpperCase()}</Text>
            <Text style={styles.lotTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.hammerPriceText}>
              Winning Hammer:{" "}
              <Text style={styles.goldBold}>R{Number(item.winningBid || 0).toLocaleString("en-ZA")}</Text>
            </Text>
          </View>
        </View>

        {/* Won Lot Financial Breakdown */}
        <View style={styles.wonBreakdown}>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Buyer's Premium (5%)</Text>
            <Text style={styles.breakdownVal}>
              R{Number(item.buyerPremiumAmount || Math.round((item.winningBid || 0) * 0.05)).toLocaleString("en-ZA")}
            </Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>BAR & VAT (17%)</Text>
            <Text style={styles.breakdownVal}>
              R{Number(item.vatAmount || Math.round((item.winningBid || 0) * 0.17)).toLocaleString("en-ZA")}
            </Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Total Settlement Sum</Text>
            <Text style={styles.breakdownTotal}>
              R{Number(item.totalPaidByBuyer || (item.winningBid || 0) * 1.22).toLocaleString("en-ZA")}
            </Text>
          </View>
        </View>

        {/* Action Button */}
        <View style={styles.wonActionsRow}>
          {!isPaid ? (
            <TouchableOpacity
              style={styles.payNowBtn}
              onPress={() => navigation.navigate("AuctionCheckout", { lotId: item._id, lot: item })}
              activeOpacity={0.88}
            >
              <LinearGradient colors={["#ffd700", "#e5b43b", "#c99742"]} style={styles.payNowGradient}>
                <Text style={styles.payNowText}>CLAIM LOT & PAY NOW →</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.viewCertificateBtn}
              onPress={() => navigation.navigate("AuctionLotDetails", { lotId: item._id, lot: item })}
            >
              <Text style={styles.viewCertificateText}>📜 View Certificate of Acquisition</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // Render Watchlist Card
  const renderWatchlistLot = ({ item }) => {
    const imgUrl = resolveImage(item.images?.[0]);

    return (
      <TouchableOpacity
        style={styles.bidCard}
        onPress={() => navigation.navigate("AuctionLotDetails", { lotId: item._id, lot: item })}
        activeOpacity={0.88}
      >
        <Image source={{ uri: imgUrl }} style={styles.cardImage} resizeMode="contain" />
        <View style={styles.cardContent}>
          <Text style={styles.lotNumber}>LOT #{item.lotNumber || item._id?.slice(-6)?.toUpperCase()}</Text>
          <Text style={styles.lotTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.financialRow}>
            <View>
              <Text style={styles.finLabel}>CURRENT ESTIMATE / BID</Text>
              <Text style={styles.finValue}>R{Number(item.currentBid || item.startingBid || 0).toLocaleString("en-ZA")}</Text>
            </View>
            <TouchableOpacity
              style={styles.raiseBidBtn}
              onPress={() => navigation.navigate("AuctionLotDetails", { lotId: item._id, lot: item })}
            >
              <LinearGradient colors={["#ffd700", "#c99742"]} style={styles.raiseBidGradient}>
                <Text style={styles.raiseBidText}>Inspect Lot →</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const currentData =
    activeTab === "active" ? activeLots : activeTab === "won" ? wonLots : watchlist;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080705" />

      <AppHeader
        title="MY AUCTIONS & BIDS"
        backgroundColor="#0a0805"
        isBack={true}
        navigation={navigation}
      />

      {/* Bidder Status Top Banner */}
      {bidderProfile && (
        <View style={styles.bidderProfileBanner}>
          <View style={styles.profileLeftCol}>
            <Text style={styles.profileStatusIcon}>{bidderProfile.isVerified ? "🛡️" : "⏳"}</Text>
            <View>
              <Text style={styles.profileTitle}>
                {bidderProfile.isVerified
                  ? `Approved Bidder • ${bidderProfile.bidderNumber || "VIP"}`
                  : "Bidder Verification Pending"}
              </Text>
              <Text style={styles.profileLimit}>
                Certified Bidding Limit:{" "}
                <Text style={styles.profileLimitVal}>
                  R{Number(bidderProfile.biddingLimit || 0).toLocaleString()}
                </Text>
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Phase Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "active" && styles.tabBtnActive]}
          onPress={() => setActiveTab("active")}
        >
          <Text style={[styles.tabText, activeTab === "active" && styles.tabTextActive]}>
            Active Bids ({activeLots.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "won" && styles.tabBtnActive]}
          onPress={() => setActiveTab("won")}
        >
          <Text style={[styles.tabText, activeTab === "won" && styles.tabTextActive]}>
            Won Lots 🏆 ({wonLots.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "watchlist" && styles.tabBtnActive]}
          onPress={() => setActiveTab("watchlist")}
        >
          <Text style={[styles.tabText, activeTab === "watchlist" && styles.tabTextActive]}>
            Watchlist ({watchlist.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Feed List */}
      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color="#c99742" />
          <Text style={styles.loadingText}>Syncing Vault Bids...</Text>
        </View>
      ) : (
        <FlatList
          data={currentData}
          renderItem={
            activeTab === "active"
              ? renderActiveLot
              : activeTab === "won"
              ? renderWonLot
              : renderWatchlistLot
          }
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
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
                {activeTab === "active"
                  ? "No Active Bids"
                  : activeTab === "won"
                  ? "No Won Lots Yet"
                  : "Watchlist is Empty"}
              </Text>
              <Text style={styles.emptyDesc}>
                {activeTab === "active"
                  ? "You have not placed any bids on current live lots. Explore the catalogue to participate."
                  : activeTab === "won"
                  ? "Lots you successfully win will appear here with settlement statements and checkout access."
                  : "Save lots of interest to track price movement and ending timers."}
              </Text>

              <TouchableOpacity
                style={styles.exploreBtn}
                onPress={() => navigation.navigate("AuctionsHub")}
              >
                <Text style={styles.exploreBtnText}>EXPLORE LIVE AUCTIONS →</Text>
              </TouchableOpacity>
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
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Bidder Status Top Banner
  bidderProfileBanner: {
    backgroundColor: "#110e09",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(201, 151, 66, 0.2)",
  },
  profileLeftCol: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileStatusIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  profileTitle: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold",
  },
  profileLimit: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    marginTop: 1,
  },
  profileLimitVal: {
    color: "#ffd700",
    fontWeight: "bold",
  },

  // Tabs
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#0d0b07",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: "rgba(201, 151, 66, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.35)",
  },
  tabText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontWeight: "bold",
  },
  tabTextActive: {
    color: "#f5d77f",
  },

  // Bid Card (Active / Watchlist)
  bidCard: {
    flexDirection: "row",
    backgroundColor: "#100d08",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 12,
  },
  bidCardLeading: {
    borderColor: "rgba(212, 175, 55, 0.5)",
    backgroundColor: "#161109",
    shadowColor: "#d4af37",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cardImage: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: "#000",
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  lotNumber: {
    color: "#c99742",
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 1,
  },
  positionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  leadingBadge: {
    backgroundColor: "rgba(212, 175, 55, 0.2)",
    borderColor: "rgba(212, 175, 55, 0.5)",
    borderWidth: 1,
  },
  outbidBadge: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: "rgba(239, 68, 68, 0.4)",
    borderWidth: 1,
  },
  positionBadgeText: {
    fontSize: 8.5,
    fontWeight: "900",
  },
  leadingText: {
    color: "#ffd700",
  },
  outbidText: {
    color: "#f87171",
  },
  lotTitle: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 8,
  },
  financialRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  finLabel: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 8.5,
    fontWeight: "bold",
    letterSpacing: 0.8,
  },
  finValue: {
    color: "#f5d77f",
    fontSize: 14,
    fontWeight: "900",
  },
  raiseBidBtn: {
    borderRadius: 8,
    overflow: "hidden",
  },
  raiseBidGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  raiseBidText: {
    color: "#000",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  // Won Card
  wonCard: {
    backgroundColor: "#130f08",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(212, 175, 55, 0.6)",
    overflow: "hidden",
    marginBottom: 14,
  },
  wonHeaderBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(212, 175, 55, 0.12)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(212, 175, 55, 0.2)",
  },
  wonTagBox: {
    flexDirection: "row",
    alignItems: "center",
  },
  wonTagText: {
    color: "#ffd700",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  paidStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  paidBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderColor: "rgba(16, 185, 129, 0.4)",
    borderWidth: 1,
  },
  unpaidBadge: {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    borderColor: "rgba(245, 158, 11, 0.4)",
    borderWidth: 1,
  },
  paidStatusText: {
    fontSize: 9,
    fontWeight: "bold",
  },
  paidText: {
    color: "#34d399",
  },
  unpaidText: {
    color: "#fbbf24",
  },
  wonBody: {
    flexDirection: "row",
    padding: 14,
  },
  wonImage: {
    width: 68,
    height: 68,
    borderRadius: 8,
    backgroundColor: "#000",
    marginRight: 12,
  },
  wonDetailsCol: {
    flex: 1,
  },
  hammerPriceText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    marginTop: 2,
  },
  goldBold: {
    color: "#ffd700",
    fontWeight: "bold",
  },
  wonBreakdown: {
    backgroundColor: "#090704",
    marginHorizontal: 14,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  breakdownLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
  },
  breakdownVal: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  breakdownTotal: {
    color: "#f5d77f",
    fontSize: 12,
    fontWeight: "900",
  },
  wonActionsRow: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  payNowBtn: {
    borderRadius: 10,
    overflow: "hidden",
  },
  payNowGradient: {
    paddingVertical: 12,
    alignItems: "center",
  },
  payNowText: {
    color: "#000",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  viewCertificateBtn: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  viewCertificateText: {
    color: "#f5d77f",
    fontSize: 11,
    fontWeight: "bold",
  },

  // Empty Container
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 6,
  },
  emptyDesc: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  exploreBtn: {
    backgroundColor: "#c99742",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  exploreBtnText: {
    color: "#000",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
});
