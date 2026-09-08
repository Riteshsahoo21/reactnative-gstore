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
  TextInput,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import tmh_styles from "../../styles/tmh_styles";
import AppHeader from "../../widgets/AppHeader";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "../../resources/data/Constants";
import discoverIcon from "../../resources/assets/discover.png";

const IMAGE_BASE_URL = "https://ik.imagekit.io/thegrandstore/images/products/";

const API_CANDIDATES = [
  API_BASE,
  "http://localhost:5000/api",
  "http://192.168.1.9:5000/api",
  "http://10.0.2.2:5000/api",
];

const getImageUrl = (imagePath) => {
  if (!imagePath || typeof imagePath !== "string") return "";
  const cleaned = imagePath.startsWith("/") ? imagePath.slice(1) : imagePath;
  return cleaned.startsWith("http") ? cleaned : `${IMAGE_BASE_URL}${cleaned}`;
};

// Real Order Card Component
const OrderItem = ({ item, navigation, onOrderUpdated }) => {
  const isPaid = item.isPaid || item.paymentStatus === "Paid";
  const isPickup = item.deliveryPreference === 'pickup' || Boolean(item.selectedPostnetStore);
  const latestMsg = item.latestAdminMessage || (item.adminMessages && item.adminMessages.length > 0 ? item.adminMessages[item.adminMessages.length - 1] : null);
  const items = (item.items && item.items.length > 0)
    ? item.items
    : (item.orderItems && item.orderItems.length > 0)
    ? item.orderItems
    : [];
  const totalAmount = Number(item.grandTotal || item.totalPrice || 0);
  const formattedDate =
    item.date ||
    (item.createdAt
      ? new Date(item.createdAt).toLocaleDateString("en-ZA", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "Recent Order");

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("OrderDetails", { order: item })}
      activeOpacity={0.9}
    >
      {/* Top Meta Row */}
      <View style={styles.rowBetween}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={styles.orderRef}>#{item.orderId || item.id || item._id}</Text>
          <Text style={styles.orderDate}>{formattedDate}</Text>
        </View>
        <View style={styles.statusCol}>
          <View style={[styles.statusBadge, isPaid ? styles.statusBadgePaid : styles.statusBadgePending]}>
            <Text style={[styles.statusText, isPaid ? styles.statusTextPaid : styles.statusTextPending]}>
              {isPaid ? "✓ PAID" : "⏳ PENDING"}
            </Text>
          </View>
        </View>
      </View>

      {/* Fulfillment Status Pill */}
      <View style={{ marginTop: 8, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: "rgba(216, 183, 109, 0.08)", borderWidth: 1, borderColor: "rgba(216, 183, 109, 0.2)", flexDirection: "row", alignItems: "center" }}>
        <Text style={{ fontSize: 13, marginRight: 6 }}>{isPickup ? "📍" : "🚚"}</Text>
        <Text style={{ color: "#d8b76d", fontSize: 11, fontWeight: "600", flex: 1 }} numberOfLines={1}>
          {isPickup
            ? (item.selectedPostnetStore ? `Arriving at PostNet ${item.selectedPostnetStore.name}` : "Arriving at your PostNet collection branch")
            : "Delivery Soon"}
        </Text>
      </View>

      {/* Concierge / Out of Stock Alert Banner */}
      {latestMsg && (
        <View style={{ marginTop: 8, padding: 9, borderRadius: 8, backgroundColor: latestMsg.type === 'emergency' || latestMsg.type === 'stock_issue' ? "rgba(225, 29, 72, 0.15)" : "rgba(217, 119, 6, 0.15)", borderWidth: 1, borderColor: latestMsg.type === 'emergency' || latestMsg.type === 'stock_issue' ? "rgba(225, 29, 72, 0.4)" : "rgba(217, 119, 6, 0.4)" }}>
          <Text style={{ color: latestMsg.type === 'emergency' || latestMsg.type === 'stock_issue' ? "#fda4af" : "#fcd34d", fontSize: 10, fontWeight: "700", textTransform: "uppercase", marginBottom: 2 }}>
            {latestMsg.type === 'stock_issue' ? "⚠️ Out of Stock Notice" : latestMsg.type === 'emergency' ? "🚨 Urgent Notice" : "💬 Concierge Notice"}
          </Text>
          <Text style={{ color: "#ffffff", fontSize: 11, lineHeight: 15 }} numberOfLines={2}>
            {latestMsg.message}
          </Text>
        </View>
      )}

      {/* Items Preview List */}
      <View style={styles.itemsBox}>
        {items.map((prod, idx) => (
          <View key={idx} style={styles.productRow}>
            {prod.image ? (
              <Image
                source={{ uri: getImageUrl(prod.image) }}
                style={styles.productImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.productPlaceholder}>
                <Text style={{ color: "#c99742", fontWeight: "800", fontSize: 11 }}>GS</Text>
              </View>
            )}

            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.productName} numberOfLines={2}>
                {prod.name}
              </Text>
              <Text style={styles.productMeta}>
                Qty: {prod.quantity || prod.qty || 1} • R{Number(prod.price || 0).toFixed(2)} each
              </Text>
            </View>

            <Text style={styles.productPrice}>
              R{((prod.quantity || prod.qty || 1) * Number(prod.price || 0)).toFixed(2)}
            </Text>
          </View>
        ))}
      </View>

      {/* Card Divider */}
      <View style={styles.cardDivider} />

      {/* Bottom Summary & Actions */}
      <View style={styles.footerRow}>
        <View>
          <Text style={styles.totalLabel}>TOTAL AMOUNT</Text>
          <Text style={styles.totalValue}>R{totalAmount.toFixed(2)}</Text>
        </View>

        <TouchableOpacity
          style={styles.detailsBtn}
          onPress={() => navigation.navigate("OrderDetails", { order: item })}
          activeOpacity={0.8}
        >
          <Text style={styles.detailsBtnText}>View Receipt & Details →</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export default function MyOrders({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadOrders = useCallback(async () => {
    let localOrders = [];
    let paidSet = new Set();

    try {
      const rawPaid = await AsyncStorage.getItem("grand_store_paid_order_ids");
      if (rawPaid) {
        const list = JSON.parse(rawPaid);
        if (Array.isArray(list)) paidSet = new Set(list.map(String));
      }
    } catch (e) {}

    const isOrderPaid = (o) => {
      if (!o) return false;
      if (o.isPaid || o.paymentStatus === "Paid") return true;
      const k1 = String(o.orderId || "");
      const k2 = String(o.id || "");
      const k3 = String(o._id || "");
      const k4 = String(o.orderMongoId || "");
      return (k1 && paidSet.has(k1)) || (k2 && paidSet.has(k2)) || (k3 && paidSet.has(k3)) || (k4 && paidSet.has(k4));
    };

    // 1. Fetch from Local Storage for instant display
    try {
      let rawLocal = await AsyncStorage.getItem("grand_store_recent_orders");
      if (!rawLocal) {
        // Fallback to single latest order key if recent_orders is empty
        const lastOrder = await AsyncStorage.getItem("grand_store_last_order");
        if (lastOrder) {
          rawLocal = JSON.stringify([JSON.parse(lastOrder)]);
        }
      }

      if (rawLocal) {
        const parsed = JSON.parse(rawLocal);
        if (Array.isArray(parsed)) {
          // Strictly filter out any old 2024 / mock items
          localOrders = parsed
            .filter(
              (o) =>
                !String(o.date || "").includes("2024") &&
                !String(o.createdAt || "").startsWith("2024") &&
                !String(o.orderId || "").includes("2024") &&
                !String(o.name || "").includes("Buld Light") &&
                !String(o.name || "").includes("Flyrsian") &&
                !String(o.name || "").includes("Besperados") &&
                !(o.items || []).some((it) =>
                  String(it.name || "").includes("Buld Light") ||
                  String(it.name || "").includes("Flyrsian") ||
                  String(it.name || "").includes("Besperados")
                )
            )
            .map((o) => {
              const paid = isOrderPaid(o);
              return {
                ...o,
                isPaid: paid,
                paymentStatus: paid ? "Paid" : o.paymentStatus,
              };
            });

          setOrders(localOrders);

          // Permanently clean storage if mock items were detected
          if (localOrders.length !== parsed.length) {
            await AsyncStorage.setItem("grand_store_recent_orders", JSON.stringify(localOrders));
          }
        }
      }
    } catch (e) {
      console.log("Error loading local orders:", e);
    }

    // 2. Query Backend API for synced server orders
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (token) {
        for (const base of API_CANDIDATES) {
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 4000);
            const res = await fetch(`${base}/orders/myorders`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
              signal: controller.signal,
            });
            clearTimeout(timer);

            if (res && res.ok) {
              const serverOrders = await res.json();
              if (Array.isArray(serverOrders)) {
                // Filter out any 2024 mock data
                const formattedServerOrders = serverOrders
                  .filter(
                    (o) =>
                      !String(o.createdAt || "").startsWith("2024") &&
                      !String(o.orderId || "").includes("2024")
                  )
                  .map((o) => {
                    const paid = isOrderPaid(o);
                    return {
                      id: o._id,
                      orderId: o.orderId || o.invoiceNumber || o._id,
                      date: new Date(o.createdAt).toLocaleDateString("en-ZA", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      }),
                      createdAt: o.createdAt,
                      totalPrice: o.totalPrice,
                      grandTotal: o.totalPrice,
                      subtotal: o.subTotal || o.totalPrice - (o.shippingCost || 0),
                      shippingFee: o.shippingCost || 0,
                      paymentMethod: o.paymentMethod || "PayFast",
                      paymentStatus: paid ? "Paid" : (o.paymentStatus || (o.isPaid ? "Paid" : "Pending")),
                      isPaid: paid || o.isPaid || o.paymentStatus === "Paid",
                      courierName: o.shipments?.[0]?.selectedCourier?.courierName || "Courier Guy",
                      deliveryPreference: o.deliveryPreference,
                      selectedPostnetStore: o.selectedPostnetStore,
                      latestAdminMessage: o.latestAdminMessage,
                      adminMessages: o.adminMessages,
                      items: (o.orderItems || []).map((item) => ({
                        name: item.name,
                        price: Number(item.price || 0),
                        quantity: Number(item.qty || item.quantity || 1),
                        image: item.image,
                        size: item.size || "750ml",
                      })),
                      recipient: {
                        address: o.shippingAddress?.address,
                        city: o.shippingAddress?.city,
                        postalCode: o.shippingAddress?.postalCode,
                        country: o.shippingAddress?.country,
                      },
                    };
                  });

                // Combine and de-duplicate by orderId or id with smart paid merging
                const mergedMap = new Map();
                for (const item of [...localOrders, ...formattedServerOrders]) {
                  const key = item.orderId || item.id || item._id;
                  if (!key) continue;
                  const itemIsPaid = isOrderPaid(item);

                  if (mergedMap.has(key)) {
                    const existing = mergedMap.get(key);
                    const finalPaid = itemIsPaid || isOrderPaid(existing);
                    mergedMap.set(key, {
                      ...existing,
                      ...item,
                      isPaid: finalPaid,
                      paymentStatus: finalPaid ? "Paid" : (item.paymentStatus || existing.paymentStatus),
                    });
                  } else {
                    mergedMap.set(key, {
                      ...item,
                      isPaid: itemIsPaid,
                      paymentStatus: itemIsPaid ? "Paid" : item.paymentStatus,
                    });
                  }
                }

                const merged = Array.from(mergedMap.values());

                // Sort newest first safely
                merged.sort((a, b) => {
                  const parseTime = (obj) => {
                    if (obj.createdAt) {
                      const t = new Date(obj.createdAt).getTime();
                      if (!isNaN(t)) return t;
                    }
                    if (obj.date) {
                      const t = new Date(obj.date).getTime();
                      if (!isNaN(t)) return t;
                    }
                    return 0;
                  };
                  return parseTime(b) - parseTime(a);
                });

                setOrders(merged);
                await AsyncStorage.setItem("grand_store_recent_orders", JSON.stringify(merged));
                break;
              }
            }
          } catch (fetchErr) {
            // try next candidate
          }
        }
      }
    } catch (apiErr) {
      console.log("Error querying API orders:", apiErr);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    const unsubscribe = navigation.addListener("focus", () => {
      loadOrders();
    });
    return unsubscribe;
  }, [navigation, loadOrders]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadOrders();
  };

  // Filter orders by search query (orderId or item names)
  const filteredOrders = orders.filter((o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const refMatch = String(o.orderId || o.id || o._id || "").toLowerCase().includes(q);
    const itemMatch = (o.items || o.orderItems || []).some((item) =>
      String(item.name || "").toLowerCase().includes(q)
    );
    return refMatch || itemMatch;
  });

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="My Orders"
        isGradient={false}
        backgroundColor="#0c0a08"
        statusBarColor="#0c0a08"
        statusBarStyle="light-content"
        titleStyle={{ color: "#FFFFFF", fontSize: 18, fontWeight: "700" }}
        isShowShadow={false}
        isBack={true}
        backButtonStyle={{ width: 35, height: 25, alignItems: "center" }}
        backIconColor="white"
        logoImage={null}
        navigation={navigation}
      />

      {/* Search Input Box */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBox}>
          <Image source={discoverIcon} style={styles.searchIcon} />
          <TextInput
            placeholder="Search by Order # or Product Name..."
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Text style={{ color: "#aaa", fontSize: 13, paddingHorizontal: 6 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Loading state */}
      {isLoading && orders.length === 0 ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color="#c99742" />
          <Text style={styles.loadingText}>Loading Your Orders...</Text>
        </View>
      ) : filteredOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Text style={{ fontSize: 36 }}>🛍️</Text>
          </View>
          <Text style={styles.emptyTitle}>No Orders Found</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? `No purchases matched "${searchQuery}".`
              : "You haven't placed any orders yet. Explore our curated selection of luxury spirits & fine wines."}
          </Text>
          <TouchableOpacity
            style={styles.startShoppingBtn}
            onPress={() => navigation.navigate("Home")}
            activeOpacity={0.85}
          >
            <Text style={styles.startShoppingText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item, idx) => item.orderId || item.id || String(idx)}
          renderItem={({ item }) => (
            <OrderItem
              item={item}
              navigation={navigation}
              onOrderUpdated={loadOrders}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#c99742"
              colors={["#c99742"]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0c0a08" },
  searchWrapper: { alignItems: "center", paddingHorizontal: 14, marginTop: 10 },
  searchBox: {
    flexDirection: "row",
    backgroundColor: "#161310",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.25)",
    paddingHorizontal: 12,
    width: "100%",
    height: 46,
    alignItems: "center",
  },
  searchIcon: { width: 18, height: 18, marginRight: 8, tintColor: "#c99742" },
  searchInput: { flex: 1, fontSize: 13, color: "#fff" },

  loadingCenter: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { color: "#c99742", marginTop: 12, fontSize: 13, fontWeight: "600" },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(201, 151, 66, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    color: "#f5c242",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  emptySubtitle: {
    color: "#888",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 24,
  },
  startShoppingBtn: {
    backgroundColor: "#c99742",
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  startShoppingText: { color: "#000", fontWeight: "800", fontSize: 13, letterSpacing: 0.5 },

  listContent: { padding: 14, paddingBottom: 50 },

  card: {
    backgroundColor: "#15120e",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.22)",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  orderRef: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  orderDate: { color: "#888", fontSize: 11, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgePaid: {
    backgroundColor: "rgba(76, 217, 100, 0.12)",
    borderColor: "rgba(76, 217, 100, 0.35)",
  },
  statusBadgePending: {
    backgroundColor: "rgba(245, 194, 66, 0.12)",
    borderColor: "rgba(245, 194, 66, 0.35)",
  },
  statusText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  statusTextPaid: { color: "#4cd964" },
  statusTextPending: { color: "#f5c242" },

  itemsBox: { marginBottom: 12 },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: 10,
    padding: 8,
    marginBottom: 8,
  },
  productImage: { width: 44, height: 44, borderRadius: 6 },
  productPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: "rgba(201, 151, 66, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  productName: { color: "#fff", fontSize: 12, fontWeight: "700", lineHeight: 16 },
  productMeta: { color: "#888", fontSize: 11, marginTop: 2 },
  productPrice: { color: "#f5c242", fontSize: 12, fontWeight: "800", marginLeft: 8 },

  cardDivider: { height: 1, backgroundColor: "rgba(255, 255, 255, 0.08)", marginBottom: 12 },

  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: { color: "#777", fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  totalValue: { color: "#fff", fontSize: 16, fontWeight: "900", marginTop: 2 },
  detailsBtn: {
    backgroundColor: "rgba(201, 151, 66, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.35)",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  detailsBtnText: { color: "#f5c242", fontSize: 11, fontWeight: "700" },

  statusCol: { alignItems: "flex-end" },
});
