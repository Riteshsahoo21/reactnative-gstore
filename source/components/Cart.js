/* eslint-disable prettier/prettier */
/* eslint-disable quotes */
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  TextInput,
  ActivityIndicator,
  ToastAndroid,
  Platform,
  Alert,
  DeviceEventEmitter,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import AppHeader from "../widgets/AppHeader";
import tmh_styles from "../styles/tmh_styles";
import { HEADER_HEIGHT_THRESHOLD } from "../resources/data/Constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

const IMAGE_BASE_URL = "https://ik.imagekit.io/thegrandstore/images/products/";

const showMessage = (message) => {
  if (Platform.OS === "android") ToastAndroid.show(message, ToastAndroid.SHORT);
  else Alert.alert("", message);
};

const Cart = ({ navigation }) => {
  const { height, width } = Dimensions.get("screen");
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState("");
  const [isCouponApplied, setIsCouponApplied] = useState(false);
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);

  const getImageUrl = (imagePath) => {
    if (!imagePath || typeof imagePath !== "string") return "";
    return imagePath.startsWith("http") ? imagePath : `${IMAGE_BASE_URL}${imagePath}`;
  };

  const fetchCart = async () => {
    try {
      setLoading(true);
      const stored = await AsyncStorage.getItem("grand-store-cart");
      const items = stored ? JSON.parse(stored) : [];

      const formatted = items.map((item) => ({
        id: item.id || item.productid,
        productid: item.productid || item.id,
        name: item.name || item.title || item.product_name,
        price: Number(item.price || item.final_price || 0),
        image: item.image || item.product_image,
        quantity: Math.max(1, Number(item.quantity || 1)),
        size: item.size || "750ml",
      }));

      setCartItems(formatted);
    } catch (error) {
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();

    const sub = DeviceEventEmitter.addListener("cartUpdated", () => {
      fetchCart();
    });

    return () => sub.remove();
  }, []);

  const persistCart = async (items) => {
    setCartItems(items);
    await AsyncStorage.setItem("grand-store-cart", JSON.stringify(items));
    DeviceEventEmitter.emit("cartUpdated", items.length);
  };

  const incrementQty = (id) => {
    const updated = cartItems.map((item) =>
      item.id === id ? { ...item, quantity: item.quantity + 1 } : item
    );
    persistCart(updated);
  };

  const decrementQty = (id) => {
    const updated = cartItems.map((item) =>
      item.id === id && item.quantity > 1 ? { ...item, quantity: item.quantity - 1 } : item
    );
    persistCart(updated);
  };

  const removeFromCart = (id) => {
    const updated = cartItems.filter((item) => item.id !== id);
    persistCart(updated);
    showMessage("🗑️ Removed from cart");
  };

  const moveToWishlist = async (item) => {
    try {
      const pid = item.id || item.productid;
      const stored = await AsyncStorage.getItem("grand-store-wishlist");
      let list = stored ? JSON.parse(stored) : [];
      if (!list.includes(pid)) {
        list.push(pid);
        await AsyncStorage.setItem("grand-store-wishlist", JSON.stringify(list));
        DeviceEventEmitter.emit("wishlistUpdated", list.length);
      }
      removeFromCart(item.id);
      showMessage("💛 Saved to Wishlist");
    } catch (e) {
      showMessage("Failed to move to wishlist");
    }
  };

  const confirmClearCart = () => {
    if (cartItems.length === 0) return;
    Alert.alert(
      "Clear Cart",
      "Are you sure you want to remove all bottles from your cart?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: () => persistCart([]),
        },
      ]
    );
  };

  const applyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      setCouponError("Please enter a voucher code");
      return;
    }

    if (code === "WELCOME50" || code === "WELCOME5" || code === "GRAND10" || code === "VIP") {
      setIsCouponApplied(true);
      const pct = code === "GRAND10" ? 10 : code === "VIP" ? 15 : 5;
      setCouponDiscount(pct);
      setCouponError("");
      showMessage(`🎉 ${pct}% discount applied!`);
    } else {
      setIsCouponApplied(false);
      setCouponDiscount(0);
      setCouponError("Invalid or expired voucher code");
    }
  };

  const subtotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discountAmount = isCouponApplied ? (subtotal * couponDiscount) / 100 : 0;
  // Free delivery over R1000, otherwise R150 standard nationwide delivery
  const shippingFee = subtotal >= 1000 || subtotal === 0 ? 0 : 150;
  const grandTotal = Math.max(0, subtotal - discountAmount + shippingFee);

  const proceedToCheckout = () => {
    if (cartItems.length === 0) {
      showMessage("Your cart is empty");
      return;
    }
    navigation.navigate("Checkout", {
      cartItems,
      subtotal,
      discountAmount,
      shippingFee,
      grandTotal,
    });
  };

  const renderCartItem = ({ item }) => {
    const itemTotal = item.price * item.quantity;
    const bottleUri = getImageUrl(item.image);

    return (
      <View style={styles.card}>
        {/* Bottle Pedestal Image */}
        <View style={styles.imagePedestal}>
          {bottleUri ? (
            <Image source={{ uri: bottleUri }} style={styles.bottleImage} resizeMode="contain" />
          ) : (
            <Image
              source={require("../resources/assets/bottle1.webp")}
              style={styles.bottleImage}
              resizeMode="contain"
            />
          )}
        </View>

        {/* Info & Controls */}
        <View style={styles.cardInfo}>
          <View style={styles.cardTopRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.bottleName} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.bottleSize}>{item.size}</Text>
            </View>
            <TouchableOpacity
              onPress={() => removeFromCart(item.id)}
              style={styles.deleteBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.deleteBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cardBottomRow}>
            {/* Price */}
            <View>
              <Text style={styles.unitPrice}>R{item.price.toFixed(2)}</Text>
              {item.quantity > 1 && (
                <Text style={styles.totalItemPrice}>Total: R{itemTotal.toFixed(2)}</Text>
              )}
            </View>

            {/* Stepper */}
            <View style={styles.stepperContainer}>
              <TouchableOpacity
                onPress={() => decrementQty(item.id)}
                style={styles.stepperBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.stepperBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepperNumber}>{item.quantity}</Text>
              <TouchableOpacity
                onPress={() => incrementQty(item.id)}
                style={styles.stepperBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.stepperBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Action: Move to Wishlist */}
          <View style={styles.itemActionsRow}>
            <TouchableOpacity
              onPress={() => moveToWishlist(item)}
              style={styles.wishlistActionBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.wishlistActionText}>💛 Move to Wishlist</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderFooterSummary = () => (
    <View style={styles.summaryContainer}>
      {/* Voucher Input */}
      <View style={styles.voucherCard}>
        {showCouponInput ? (
          <View>
            <View style={styles.voucherInputRow}>
              <TextInput
                style={styles.voucherInput}
                placeholder="Enter voucher (e.g. WELCOME50)"
                placeholderTextColor="#777"
                value={couponCode}
                onChangeText={setCouponCode}
                autoCapitalize="characters"
              />
              <TouchableOpacity style={styles.voucherApplyBtn} onPress={applyCoupon}>
                <Text style={styles.voucherApplyText}>Apply</Text>
              </TouchableOpacity>
            </View>
            {couponError ? <Text style={styles.voucherErrorText}>{couponError}</Text> : null}
            {isCouponApplied ? (
              <Text style={styles.voucherSuccessText}>
                ✓ Voucher applied: {couponDiscount}% off
              </Text>
            ) : null}
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addVoucherLink}
            onPress={() => setShowCouponInput(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.addVoucherLinkText}>🎟️ Have a Promo or Voucher Code?</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Free Delivery Bar */}
      <View style={styles.shippingNoticeCard}>
        {subtotal >= 1000 ? (
          <Text style={styles.freeShippingActive}>
            ✓ You've unlocked <Text style={{ fontWeight: "800", color: "#f5c242" }}>FREE Delivery</Text>
          </Text>
        ) : (
          <Text style={styles.freeShippingNotice}>
            Add <Text style={{ color: "#f5c242", fontWeight: "700" }}>R{(1000 - subtotal).toFixed(2)}</Text> more for Free Nationwide Delivery
          </Text>
        )}
      </View>

      {/* Financial Breakdown */}
      <View style={styles.breakdownCard}>
        <Text style={styles.breakdownTitle}>ORDER SUMMARY</Text>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Subtotal ({cartItems.length} items)</Text>
          <Text style={styles.breakdownValue}>R{subtotal.toFixed(2)}</Text>
        </View>

        {isCouponApplied && discountAmount > 0 && (
          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { color: "#4cd964" }]}>
              Voucher Discount ({couponDiscount}%)
            </Text>
            <Text style={[styles.breakdownValue, { color: "#4cd964" }]}>
              -R{discountAmount.toFixed(2)}
            </Text>
          </View>
        )}

        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Estimated Delivery</Text>
          <Text style={styles.breakdownValue}>
            {shippingFee === 0 ? "FREE" : `R${shippingFee.toFixed(2)}`}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.breakdownRowTotal}>
          <Text style={styles.breakdownLabelTotal}>ESTIMATED TOTAL</Text>
          <Text style={styles.breakdownValueTotal}>R{grandTotal.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader
          title="Cart"
          backgroundColor="#0c0a08"
          statusBarColor="#0c0a08"
          statusBarStyle="light-content"
          height={(HEADER_HEIGHT_THRESHOLD * height) / 100}
          rightButtons={[]}
          titleStyle={{ color: "#FFFFFF", fontSize: 18, fontWeight: "700" }}
          navigation={navigation}
          isBack
          backIconColor="white"
        />
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color="#c99742" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Cellar Cart"
        backgroundColor="#0c0a08"
        statusBarColor="#0c0a08"
        statusBarStyle="light-content"
        height={(HEADER_HEIGHT_THRESHOLD * height) / 100}
        rightButtons={[]}
        titleStyle={{ color: "#FFFFFF", fontSize: 18, fontWeight: "700" }}
        navigation={navigation}
        isBack
        backIconColor="white"
      />

      {cartItems.length === 0 ? (
        /* Empty State */
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Text style={styles.emptyIconEmoji}>🍾</Text>
          </View>
          <Text style={styles.emptyTitle}>Your Cellar Cart is Empty</Text>
          <Text style={styles.emptySubtitle}>
            Explore our curated vault of prestige single malts, aged rums, and vintage champagnes.
          </Text>
          <TouchableOpacity
            style={styles.exploreBtn}
            onPress={() => navigation.navigate("Home")}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#f5c242", "#c99742"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.exploreGradient}
            >
              <Text style={styles.exploreBtnText}>Explore Grand Collection →</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Subheader Toolbar */}
          <View style={styles.toolbar}>
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>
                🛒 {cartItems.reduce((sum, i) => sum + i.quantity, 0)} Bottles
              </Text>
            </View>

            <TouchableOpacity
              onPress={confirmClearCart}
              style={styles.clearBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.clearBtnText}>Clear Cart</Text>
            </TouchableOpacity>
          </View>

          {/* Cart Items List */}
          <FlatList
            data={cartItems}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderCartItem}
            ListFooterComponent={renderFooterSummary}
            contentContainerStyle={{ padding: 14, paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
          />

          {/* Fixed Checkout Bottom Bar */}
          <View style={styles.fixedBottomBar}>
            <View style={styles.bottomTotalCol}>
              <Text style={styles.bottomTotalLabel}>Total to pay</Text>
              <Text style={styles.bottomTotalValue}>R{grandTotal.toFixed(2)}</Text>
            </View>

            <TouchableOpacity
              style={styles.checkoutTouch}
              onPress={proceedToCheckout}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={["#f5c242", "#c99742", "#a67c2e"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.checkoutGradient}
              >
                <Text style={styles.checkoutBtnText}>PROCEED TO CHECKOUT →</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0c0a08" },
  loadingCenter: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Subheader Toolbar
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#110e0b",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  countPill: {
    backgroundColor: "rgba(201, 151, 66, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(245, 194, 66, 0.4)",
  },
  countPillText: {
    color: "#f5c242",
    fontSize: 12,
    fontWeight: "700",
  },
  clearBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  clearBtnText: {
    color: "#888",
    fontSize: 12,
    fontWeight: "600",
  },

  // Bottle Card
  card: {
    flexDirection: "row",
    backgroundColor: "#15120e",
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.2)",
    elevation: 4,
  },
  imagePedestal: {
    width: 85,
    height: 115,
    backgroundColor: "#0e0c0a",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
  },
  bottleImage: {
    width: "80%",
    height: "85%",
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "space-between",
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  bottleName: {
    color: "#f8f5ee",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },
  bottleSize: {
    color: "#888",
    fontSize: 11,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 4,
  },
  deleteBtnText: {
    color: "#777",
    fontSize: 16,
    fontWeight: "700",
  },

  cardBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  unitPrice: {
    color: "#f5c242",
    fontSize: 15,
    fontWeight: "800",
  },
  totalItemPrice: {
    color: "#888",
    fontSize: 11,
    marginTop: 2,
  },

  // Stepper
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0d0b09",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.35)",
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  stepperBtn: {
    width: 26,
    height: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  stepperBtnText: {
    color: "#f5c242",
    fontSize: 16,
    fontWeight: "800",
  },
  stepperNumber: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    paddingHorizontal: 8,
  },

  // Item Actions
  itemActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 6,
  },
  wishlistActionBtn: {
    paddingVertical: 2,
  },
  wishlistActionText: {
    color: "#a99882",
    fontSize: 11,
    fontWeight: "600",
  },

  // Summary & Breakdown
  summaryContainer: {
    marginTop: 10,
  },
  voucherCard: {
    backgroundColor: "#15120e",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.2)",
    marginBottom: 12,
  },
  addVoucherLink: {
    paddingVertical: 6,
  },
  addVoucherLinkText: {
    color: "#f5c242",
    fontSize: 13,
    fontWeight: "700",
  },
  voucherInputRow: {
    flexDirection: "row",
    gap: 8,
  },
  voucherInput: {
    flex: 1,
    backgroundColor: "#0d0b09",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: "#fff",
    fontSize: 13,
  },
  voucherApplyBtn: {
    backgroundColor: "#c99742",
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  voucherApplyText: {
    color: "#0a0a0a",
    fontSize: 13,
    fontWeight: "800",
  },
  voucherErrorText: {
    color: "#ff4d6d",
    fontSize: 11,
    marginTop: 6,
  },
  voucherSuccessText: {
    color: "#4cd964",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 6,
  },

  shippingNoticeCard: {
    backgroundColor: "rgba(201, 151, 66, 0.08)",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.25)",
    marginBottom: 12,
    alignItems: "center",
  },
  freeShippingNotice: {
    color: "#ccc",
    fontSize: 12,
  },
  freeShippingActive: {
    color: "#4cd964",
    fontSize: 12,
    fontWeight: "700",
  },

  breakdownCard: {
    backgroundColor: "#15120e",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.2)",
    marginBottom: 20,
  },
  breakdownTitle: {
    color: "#888",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  breakdownLabel: {
    color: "#bbb",
    fontSize: 13,
  },
  breakdownValue: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginVertical: 10,
  },
  breakdownRowTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  breakdownLabelTotal: {
    color: "#f8f5ee",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  breakdownValueTotal: {
    color: "#f5c242",
    fontSize: 18,
    fontWeight: "900",
  },

  // Fixed Bottom Bar
  fixedBottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#120f0c",
    borderTopWidth: 1,
    borderTopColor: "rgba(201, 151, 66, 0.3)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 10,
  },
  bottomTotalCol: {
    marginRight: 12,
  },
  bottomTotalLabel: {
    color: "#888",
    fontSize: 11,
    fontWeight: "600",
  },
  bottomTotalValue: {
    color: "#f5c242",
    fontSize: 18,
    fontWeight: "900",
  },
  checkoutTouch: {
    flex: 1,
  },
  checkoutGradient: {
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  checkoutBtnText: {
    color: "#0a0a0a",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(201, 151, 66, 0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(245, 194, 66, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyIconEmoji: {
    fontSize: 36,
  },
  emptyTitle: {
    color: "#f8f5ee",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    color: "#8a8275",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    marginBottom: 24,
  },
  exploreBtn: {
    width: "100%",
    maxWidth: 280,
  },
  exploreGradient: {
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  exploreBtnText: {
    color: "#0a0a0a",
    fontSize: 14,
    fontWeight: "800",
  },
});

export default Cart;
