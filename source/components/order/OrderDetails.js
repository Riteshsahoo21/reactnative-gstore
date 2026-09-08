/* eslint-disable prettier/prettier */
/* eslint-disable quotes */
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  StatusBar,
  Alert,
} from "react-native";
import AppHeader from "../../widgets/AppHeader";
import tmh_styles from "../../styles/tmh_styles";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "../../resources/data/Constants";

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

export default function OrderDetails({ route, navigation }) {
  const initialOrder = route?.params?.order || null;
  const [order, setOrder] = useState(initialOrder);
  const [isLoading, setIsLoading] = useState(!initialOrder);
  const [storeBankDetails, setStoreBankDetails] = useState({
    bankName: "Standard Bank",
    accountName: "The Grand Store PTY LTD",
    accountNumber: "0123456789",
    branchCode: "051001",
  });

  useEffect(() => {
    const fetchSettings = async () => {
      for (const base of API_CANDIDATES) {
        try {
          const res = await fetch(`${base}/settings/public`);
          if (res && res.ok) {
            const data = await res.json();
            if (data?.bankDetails) {
              setStoreBankDetails(data.bankDetails);
              break;
            }
          }
        } catch (e) {}
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    const syncPaidStatus = async (targetOrder) => {
      if (!targetOrder) return targetOrder;
      try {
        const rawPaid = await AsyncStorage.getItem("grand_store_paid_order_ids");
        if (rawPaid) {
          const paidList = JSON.parse(rawPaid);
          const key = targetOrder.orderId || targetOrder.id || targetOrder._id;
          if (
            paidList.includes(key) ||
            (targetOrder.id && paidList.includes(targetOrder.id)) ||
            (targetOrder._id && paidList.includes(targetOrder._id)) ||
            (targetOrder.orderMongoId && paidList.includes(targetOrder.orderMongoId))
          ) {
            return {
              ...targetOrder,
              isPaid: true,
              paymentStatus: "Paid",
            };
          }
        }
      } catch (e) {}
      return targetOrder;
    };

    if (initialOrder) {
      syncPaidStatus(initialOrder).then((finalOrd) => {
        setOrder(finalOrd);
        setIsLoading(false);
      });
      return;
    }

    // Fallback: Fetch most recent order from local storage if no params passed
    const fetchLatestOrder = async () => {
      try {
        // 1. Try single latest order key
        const rawLast = await AsyncStorage.getItem("grand_store_last_order");
        if (rawLast) {
          const parsedLast = JSON.parse(rawLast);
          if (
            parsedLast &&
            !String(parsedLast.date || "").includes("2024") &&
            !String(parsedLast.createdAt || "").startsWith("2024") &&
            !String(parsedLast.name || "").includes("Buld Light")
          ) {
            const synced = await syncPaidStatus(parsedLast);
            setOrder(synced);
            setIsLoading(false);
            return;
          }
        }

        // 2. Try recent orders list
        const rawOrders = await AsyncStorage.getItem("grand_store_recent_orders");
        if (rawOrders) {
          const list = JSON.parse(rawOrders);
          if (Array.isArray(list) && list.length > 0) {
            const cleanList = list.filter(
              (o) =>
                !String(o.date || "").includes("2024") &&
                !String(o.createdAt || "").startsWith("2024") &&
                !String(o.name || "").includes("Buld Light") &&
                !String(o.name || "").includes("Flyrsian") &&
                !String(o.name || "").includes("Besperados")
            );
            if (cleanList.length > 0) {
              setOrder(cleanList[0]);
              setIsLoading(false);
              return;
            }
          }
        }

        // 3. Try server API
        const token = await AsyncStorage.getItem("userToken");
        if (token) {
          for (const base of API_CANDIDATES) {
            try {
              const res = await fetch(`${base}/orders/myorders`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                const serverOrders = await res.json();
                if (Array.isArray(serverOrders) && serverOrders.length > 0) {
                  const cleanServer = serverOrders.filter(
                    (o) =>
                      !String(o.createdAt || "").startsWith("2024") &&
                      !String(o.orderId || "").includes("2024")
                  );
                  if (cleanServer.length > 0) {
                    const first = cleanServer[0];
                    setOrder({
                      id: first._id,
                      orderId: first.orderId || first.invoiceNumber || first._id,
                      date: new Date(first.createdAt).toLocaleDateString("en-ZA", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      }),
                      createdAt: first.createdAt,
                      totalPrice: first.totalPrice,
                      grandTotal: first.totalPrice,
                      subtotal: first.subTotal || first.totalPrice - (first.shippingCost || 0),
                      shippingFee: first.shippingCost || 0,
                      paymentMethod: first.paymentMethod || "PayFast",
                      paymentStatus: first.paymentStatus || (first.isPaid ? "Paid" : "Pending"),
                      isPaid: first.isPaid || first.paymentStatus === "Paid",
                      courierName: first.shipments?.[0]?.selectedCourier?.courierName || "Courier Guy",
                      items: (first.orderItems || []).map((item) => ({
                        name: item.name,
                        price: Number(item.price || 0),
                        quantity: Number(item.qty || item.quantity || 1),
                        image: item.image,
                        size: item.size || "750ml",
                      })),
                      recipient: {
                        address: first.shippingAddress?.address,
                        city: first.shippingAddress?.city,
                        postalCode: first.shippingAddress?.postalCode,
                        country: first.shippingAddress?.country,
                        phone: first.shippingAddress?.phone || first.shippingAddress?.phoneNumber,
                      },
                      deliveryPreference: first.deliveryPreference,
                      selectedPostnetStore: first.selectedPostnetStore,
                      latestAdminMessage: first.latestAdminMessage,
                      adminMessages: first.adminMessages,
                    });
                    break;
                  }
                }
              }
            } catch (err) {
              // try next candidate
            }
          }
        }
      } catch (e) {
        console.log("Error loading order details:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLatestOrder();
  }, [initialOrder]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0c0a08" />
        <AppHeader
          title="Order Details"
          isGradient={false}
          backgroundColor="#c99742"
          titleStyle={tmh_styles.header_title_tmb}
          isShowShadow={true}
          isBack={true}
          backButtonStyle={{ width: 35, height: 25, alignItems: "center" }}
          backIconColor="black"
          logoImage={null}
          navigation={navigation}
        />
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color="#c99742" />
          <Text style={styles.loadingText}>Retrieving Order Information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0c0a08" />
        <AppHeader
          title="Order Details"
          isGradient={false}
          backgroundColor="#c99742"
          titleStyle={tmh_styles.header_title_tmb}
          isShowShadow={true}
          isBack={true}
          backButtonStyle={{ width: 35, height: 25, alignItems: "center" }}
          backIconColor="black"
          logoImage={null}
          navigation={navigation}
        />
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Text style={{ fontSize: 36 }}>🔍</Text>
          </View>
          <Text style={styles.emptyTitle}>Order Not Found</Text>
          <Text style={styles.emptySubtitle}>
            We could not find the details for this order. Check your recent orders or browse our catalog.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate("MyOrder")}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>View All My Orders</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isPaid = order.isPaid || order.paymentStatus === "Paid";
  const items = (order.items && order.items.length > 0)
    ? order.items
    : (order.orderItems && order.orderItems.length > 0)
    ? order.orderItems
    : [];
  const grandTotal = Number(order.grandTotal || order.totalPrice || 0);
  const subtotal = Number(order.subtotal || grandTotal - (order.shippingFee || 0));
  const shippingFee = Number(order.shippingFee || 0);
  const discount = Number(order.discount || 0);

  const formattedDate =
    order.date ||
    (order.createdAt
      ? new Date(order.createdAt).toLocaleDateString("en-ZA", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "Recent Order");

  const orderRefId = order.orderId || order.id || order._id || "GS-ORDER";
  const recipient = order.recipient || {};
  const isPostNet =
    order.deliveryPreference === "postnet" ||
    order.deliveryPreference === "pickup" ||
    Boolean(order.selectedPostnetStore) ||
    String(order.courierName || "").toLowerCase().includes("postnet") ||
    !!order.pickupStore;

  const latestAdminMsg = order.latestAdminMessage || (order.adminMessages && order.adminMessages.length > 0 ? order.adminMessages[order.adminMessages.length - 1] : null);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0c0a08" />
      <AppHeader
        title="Order Details"
        isGradient={false}
        backgroundColor="#c99742"
        titleStyle={tmh_styles.header_title_tmb}
        isShowShadow={true}
        isBack={true}
        backButtonStyle={{ width: 35, height: 25, alignItems: "center" }}
        backIconColor="black"
        logoImage={null}
        navigation={navigation}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Reference & Status Card */}
        <View style={styles.card}>
          <View style={styles.refRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.refLabel}>ORDER REFERENCE</Text>
              <Text style={styles.refNumber}>#{orderRefId}</Text>
              <Text style={styles.refDate}>Placed on {formattedDate}</Text>
            </View>
            <View style={[styles.statusBadge, isPaid ? styles.statusBadgePaid : styles.statusBadgePending]}>
              <Text style={[styles.statusText, isPaid ? styles.statusTextPaid : styles.statusTextPending]}>
                {isPaid ? "✓ PAID" : "⏳ PENDING"}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Delivery Status Banner */}
          <View style={styles.deliveryStatusRow}>
            <Text style={{ fontSize: 20, marginRight: 12 }}>{isPostNet ? "📍" : "🚚"}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.deliveryStatusTitle}>
                {isPostNet
                  ? "Your order has been received — Arriving at your PostNet collection branch"
                  : "Your order has been received — Delivery Soon"}
              </Text>
              <Text style={styles.deliveryStatusSub}>
                {isPostNet
                  ? (order.selectedPostnetStore ? `Collection point: ${order.selectedPostnetStore.name} (${order.selectedPostnetStore.address})` : "Counter pickup with collection PIN upon parcel arrival.")
                  : (recipient.address ? `Delivering to: ${recipient.address}, ${recipient.city || ''}` : "Priority doorstep delivery undergoing warehouse dispatch preparation.")}
              </Text>
            </View>
          </View>
        </View>

        {/* Concierge Custom Advisory / Out of Stock / Emergency Notice Card */}
        {latestAdminMsg && (
          <View style={[
            styles.card,
            {
              backgroundColor: latestAdminMsg.type === 'emergency' || latestAdminMsg.type === 'stock_issue'
                ? "rgba(225, 29, 72, 0.12)"
                : latestAdminMsg.type === 'warning'
                ? "rgba(217, 119, 6, 0.12)"
                : "rgba(59, 130, 246, 0.12)",
              borderColor: latestAdminMsg.type === 'emergency' || latestAdminMsg.type === 'stock_issue'
                ? "rgba(225, 29, 72, 0.45)"
                : latestAdminMsg.type === 'warning'
                ? "rgba(217, 119, 6, 0.45)"
                : "rgba(59, 130, 246, 0.45)",
              borderWidth: 1.5,
            }
          ]}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.1)" }}>
              <Text style={{
                color: latestAdminMsg.type === 'emergency' || latestAdminMsg.type === 'stock_issue'
                  ? "#fda4af"
                  : latestAdminMsg.type === 'warning'
                  ? "#fcd34d"
                  : "#93c5fd",
                fontSize: 12,
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: 0.5
              }}>
                {latestAdminMsg.type === 'stock_issue'
                  ? "⚠️ Out of Stock / Stock Notice"
                  : latestAdminMsg.type === 'emergency'
                  ? "🚨 Urgent Order Notice"
                  : latestAdminMsg.type === 'warning'
                  ? "⚠️ Delivery Advisory"
                  : "💬 Store Concierge Message"}
              </Text>
              {latestAdminMsg.sentAt && (
                <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, fontFamily: "monospace" }}>
                  {new Date(latestAdminMsg.sentAt).toLocaleDateString()} {new Date(latestAdminMsg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
            </View>
            <Text style={{ color: "#ffffff", fontSize: 13, lineHeight: 19, marginBottom: 8, borderLeftWidth: 2, borderLeftColor: "#d8b76d", paddingLeft: 10 }}>
              {latestAdminMsg.message}
            </Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
              <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 10 }}>
                From: {latestAdminMsg.sentByName || "The Grand Store Concierge"}
              </Text>
              <Text style={{ color: "#d8b76d", fontSize: 10, fontWeight: "600" }}>
                concierge@grandstore.co.za
              </Text>
            </View>
          </View>
        )}

        {/*
          [COMMENTED OUT FOR NOW AS REQUESTED - 6-STAGE TRACKING TIMELINE]
          Multi-stage status progression:
          Stage 1: Payment Confirmed
          Stage 2: Order Confirmed
          Stage 3: Vendor Preparing
          Stage 4: Collected by Courier
          Stage 5: In Transit
          Stage 6: Ready for Collection / Delivered
        */}

        {/* Ordered Products Section */}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>
            PURCHASED PRODUCTS ({items.length})
          </Text>

          {items.map((prod, idx) => {
            const qty = Number(prod.quantity || prod.qty || 1);
            const unitPrice = Number(prod.price || 0);
            const lineTotal = qty * unitPrice;

            return (
              <View key={idx} style={styles.productRow}>
                {prod.image ? (
                  <Image
                    source={{ uri: getImageUrl(prod.image) }}
                    style={styles.productImg}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.productPlaceholder}>
                    <Text style={styles.placeholderText}>GS</Text>
                  </View>
                )}

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.productTitle} numberOfLines={2}>
                    {prod.name}
                  </Text>
                  <Text style={styles.productSpecs}>
                    {prod.size ? `${prod.size} • ` : ""}Qty: {qty} • R{unitPrice.toFixed(2)} each
                  </Text>
                  <Text style={styles.productSubtotal}>
                    Total: R{lineTotal.toFixed(2)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Delivery Destination Card */}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>DELIVERY DESTINATION</Text>

          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Courier / Method</Text>
            <Text style={styles.infoValue}>
              {order.courierName || (isPostNet ? "PostNet Counter-to-Counter" : "The Courier Guy Express")}
            </Text>
          </View>

          {recipient.fullName && (
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Recipient</Text>
              <Text style={styles.infoValue}>
                {recipient.fullName} {recipient.phone ? `(${recipient.phone})` : ""}
              </Text>
            </View>
          )}

          {order.isGift && (
            <View style={[styles.infoBlock, { backgroundColor: "rgba(201, 151, 66, 0.08)", padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "rgba(201, 151, 66, 0.2)" }]}>
              <Text style={[styles.infoLabel, { color: "#f5c242" }]}>🎁 Gift Order</Text>
              {order.giftRecipientName ? (
                <Text style={styles.infoValue}>For: {order.giftRecipientName}</Text>
              ) : null}
              {order.giftMessage ? (
                <Text style={[styles.infoValue, { fontStyle: "italic", color: "#ccc", marginTop: 2 }]}>"{order.giftMessage}"</Text>
              ) : null}
            </View>
          )}

          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>
              {isPostNet ? "PostNet Pickup Branch" : "Shipping Address"}
            </Text>
            <Text style={styles.infoValue}>
              {order.pickupStore?.address ||
                recipient.address ||
                [recipient.city, recipient.postalCode, recipient.country]
                  .filter(Boolean)
                  .join(", ") ||
                "Destination registered on file"}
            </Text>
          </View>

          {isPostNet && (
            <View style={styles.postnetPinBox}>
              <Text style={{ fontSize: 16, marginRight: 8 }}>📲</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.postnetPinTitle}>SMS Collection PIN & 18+ ID Required</Text>
                <Text style={styles.postnetPinSub}>
                  Bring your 6-digit SMS dispatch PIN and government ID (18+) to collect from the counter. Parcels are safely stored for 30 days in temperature-controlled holding.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Financial & Invoice Summary Card */}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>FINANCIAL BREAKDOWN</Text>

          <View style={styles.costRow}>
            <Text style={styles.costLabel}>Subtotal</Text>
            <Text style={styles.costValue}>R{subtotal.toFixed(2)}</Text>
          </View>

          <View style={styles.costRow}>
            <Text style={styles.costLabel}>Delivery Fee</Text>
            <Text style={styles.costValue}>
              {shippingFee > 0 ? `R${shippingFee.toFixed(2)}` : "Free Delivery"}
            </Text>
          </View>

          {discount > 0 && (
            <View style={styles.costRow}>
              <Text style={styles.costLabelDiscount}>Special Discount</Text>
              <Text style={styles.costValueDiscount}>-R{discount.toFixed(2)}</Text>
            </View>
          )}

          {order.superCoinsDiscount > 0 && (
            <View style={styles.costRow}>
              <Text style={[styles.costLabelDiscount, { color: "#f5c242" }]}>
                🪙 Super Coins Redeemed ({order.superCoinsUsed || Math.round(order.superCoinsDiscount / 0.1)} coins)
              </Text>
              <Text style={[styles.costValueDiscount, { color: "#f5c242" }]}>
                -R{Number(order.superCoinsDiscount).toFixed(2)}
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.costRowTotal}>
            <Text style={styles.totalHeading}>GRAND TOTAL</Text>
            <Text style={styles.totalAmount}>R{grandTotal.toFixed(2)}</Text>
          </View>

          {(order.superCoinsEarned > 0 || subtotal > 0) && (
            <View style={styles.superCoinsEarnedBanner}>
              <Text style={styles.superCoinsEarnedIcon}>🎉</Text>
              <Text style={styles.superCoinsEarnedText}>
                +{order.superCoinsEarned || Math.floor((subtotal / 100) * 10)} Super Coins (Value: R{((order.superCoinsEarned || Math.floor((subtotal / 100) * 10)) * 0.1).toFixed(2)}) will be credited post-delivery.
              </Text>
            </View>
          )}

          <View style={styles.paymentMethodRow}>
            <Text style={styles.paymentMethodLabel}>Payment Method:</Text>
            <Text style={styles.paymentMethodValue}>
              {order.paymentMethod || "PayFast Sandbox (Instant Cards / EFT)"}
            </Text>
          </View>
        </View>

        {/* Bank Transfer Instructions (Only shown if pending bank transfer) */}
        {!isPaid && (
          <View style={[styles.card, styles.bankCard]}>
            <Text style={styles.bankHeader}>
              🏦 {storeBankDetails.bankName || "Standard Bank"} Payment Instructions
            </Text>
            <Text style={styles.bankSub}>
              Please transfer R{grandTotal.toFixed(2)} using your Order Reference:
            </Text>

            <View style={styles.bankDetailRow}>
              <Text style={styles.bankDetailLabel}>Bank:</Text>
              <Text style={styles.bankDetailValue}>
                {storeBankDetails.bankName || "Standard Bank"}
              </Text>
            </View>
            <View style={styles.bankDetailRow}>
              <Text style={styles.bankDetailLabel}>Account Name:</Text>
              <Text style={styles.bankDetailValue}>
                {storeBankDetails.accountName || "The Grand Store PTY LTD"}
              </Text>
            </View>
            <View style={styles.bankDetailRow}>
              <Text style={styles.bankDetailLabel}>Account Number:</Text>
              <Text style={styles.bankDetailValue}>
                {storeBankDetails.accountNumber || "0123456789"}
              </Text>
            </View>
            <View style={styles.bankDetailRow}>
              <Text style={styles.bankDetailLabel}>Branch Code:</Text>
              <Text style={styles.bankDetailValue}>
                {storeBankDetails.branchCode || "051001"}
              </Text>
            </View>
            <View style={styles.bankDetailRow}>
              <Text style={styles.bankDetailLabel}>Reference:</Text>
              <Text style={[styles.bankDetailValue, { color: "#f5c242", fontWeight: "900" }]}>
                {orderRefId.slice(-8).toUpperCase()}
              </Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() => navigation.navigate("MyOrder")}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryActionBtnText}>← Back to All Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryActionBtn}
            onPress={() => navigation.navigate("Home")}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryActionBtnText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0c0a08" },
  scrollContent: { padding: 14, paddingBottom: 40 },

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
  },
  emptySubtitle: {
    color: "#888",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 24,
  },
  primaryBtn: {
    backgroundColor: "#c99742",
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  primaryBtnText: { color: "#000", fontWeight: "800", fontSize: 13 },

  card: {
    backgroundColor: "#15120e",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.22)",
  },
  refRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  refLabel: { color: "#777", fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  refNumber: { color: "#fff", fontSize: 16, fontWeight: "900", marginTop: 2 },
  refDate: { color: "#888", fontSize: 11, marginTop: 3 },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
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

  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginVertical: 12,
  },

  deliveryStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(201, 151, 66, 0.05)",
    padding: 10,
    borderRadius: 10,
  },
  deliveryStatusTitle: { color: "#fff", fontSize: 12, fontWeight: "700" },
  deliveryStatusSub: { color: "#888", fontSize: 10, marginTop: 2, lineHeight: 14 },

  sectionHeading: {
    color: "#c99742",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 12,
  },

  productRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  productImg: { width: 50, height: 50, borderRadius: 8 },
  productPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: "rgba(201, 151, 66, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: { color: "#c99742", fontWeight: "800", fontSize: 12 },
  productTitle: { color: "#fff", fontSize: 13, fontWeight: "700", lineHeight: 17 },
  productSpecs: { color: "#888", fontSize: 11, marginTop: 3 },
  productSubtotal: { color: "#f5c242", fontSize: 12, fontWeight: "800", marginTop: 2 },

  infoBlock: { marginBottom: 10 },
  infoLabel: { color: "#777", fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  infoValue: { color: "#fff", fontSize: 13, fontWeight: "600", marginTop: 2, lineHeight: 18 },

  costRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  costLabel: { color: "#888", fontSize: 12 },
  costValue: { color: "#fff", fontSize: 12, fontWeight: "600" },
  costLabelDiscount: { color: "#4cd964", fontSize: 12 },
  costValueDiscount: { color: "#4cd964", fontSize: 12, fontWeight: "700" },

  costRowTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  totalHeading: { color: "#fff", fontSize: 14, fontWeight: "900", letterSpacing: 0.5 },
  totalAmount: { color: "#f5c242", fontSize: 18, fontWeight: "900" },

  paymentMethodRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
  paymentMethodLabel: { color: "#777", fontSize: 10, fontWeight: "700" },
  paymentMethodValue: { color: "#ccc", fontSize: 11, fontWeight: "600" },

  bankCard: {
    backgroundColor: "#161310",
    borderColor: "rgba(201, 151, 66, 0.35)",
  },
  bankHeader: { color: "#f5c242", fontSize: 13, fontWeight: "800", marginBottom: 4 },
  bankSub: { color: "#888", fontSize: 11, marginBottom: 12, lineHeight: 15 },
  bankDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  bankDetailLabel: { color: "#777", fontSize: 11 },
  bankDetailValue: { color: "#fff", fontSize: 11, fontWeight: "700" },

  actionsContainer: { marginTop: 6, gap: 10 },
  primaryActionBtn: {
    backgroundColor: "#c99742",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryActionBtnText: { color: "#000", fontWeight: "800", fontSize: 13 },
  secondaryActionBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryActionBtnText: { color: "#ccc", fontWeight: "700", fontSize: 13 },

  // Timeline Styles
  timelineHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  liveTrackingPill: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderWidth: 0.8,
    borderColor: "#10b981",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveTrackingPillText: {
    color: "#34d399",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  timelineList: {
    paddingLeft: 4,
    marginTop: 4,
  },
  timelineStepRow: {
    flexDirection: "row",
    minHeight: 48,
  },
  timelineLeftCol: {
    alignItems: "center",
    width: 28,
    marginRight: 10,
  },
  timelineNode: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#1c1917",
    borderWidth: 1.5,
    borderColor: "#57534e",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  timelineNodeDone: {
    backgroundColor: "#10b981",
    borderColor: "#10b981",
  },
  timelineNodeActive: {
    backgroundColor: "rgba(201, 151, 66, 0.2)",
    borderColor: "#f5c242",
  },
  timelineNodeText: {
    color: "#ffffff",
    fontSize: 9.5,
    fontWeight: "800",
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#292524",
    marginVertical: 2,
  },
  timelineLineDone: {
    backgroundColor: "#10b981",
  },
  timelineRightCol: {
    flex: 1,
    paddingBottom: 12,
  },
  timelineStepName: {
    color: "#78716c",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 2,
  },
  timelineStepNameActive: {
    color: "#f5c242",
    fontWeight: "800",
  },
  timelineStepDesc: {
    color: "#a8a29e",
    fontSize: 10,
    lineHeight: 14,
  },

  // PostNet PIN Box
  postnetPinBox: {
    flexDirection: "row",
    backgroundColor: "rgba(201, 151, 66, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.25)",
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    alignItems: "flex-start",
  },
  postnetPinTitle: {
    color: "#f5c242",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 2,
  },
  postnetPinSub: {
    color: "#a8a29e",
    fontSize: 10,
    lineHeight: 14,
  },

  // Super Coins Banner
  superCoinsEarnedBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(201, 151, 66, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.3)",
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  superCoinsEarnedIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  superCoinsEarnedText: {
    color: "#f5c242",
    fontSize: 10.5,
    fontWeight: "700",
    flex: 1,
    lineHeight: 14,
  },
});
