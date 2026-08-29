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
} from "react-native";
import AppHeader from "../widgets/AppHeader";
import tmh_styles from "../styles/tmh_styles";
import Checkout from "./Checkout";
import { HEADER_HEIGHT_THRESHOLD } from "../resources/data/Constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { API_BASE } from "../resources/data/Constants";
const API_CART_SHOW = `${API_BASE}/cart/show`;
const IMAGE_BASE_URL = "https://ik.imagekit.io/thegrandstore/images/products/";

// Toast helper
const showMessage = (message) => {
  if (Platform.OS === "android") ToastAndroid.show(message, ToastAndroid.SHORT);
  else Alert.alert("", message);
};

const Cart = ({ navigation }) => {
  const { height } = Dimensions.get("screen");
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState("");
  const [isCouponApplied, setIsCouponApplied] = useState(false);
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);

const API_CART_REMOVE = `${API_BASE}/cart/remove`;
const API_APPLY_COUPON = `${API_BASE}/customer/coupon/applyCouponCode`;

const applyCoupon = async () => {
  try {
    if (!couponCode.trim()) {
      setCouponError("Please enter a coupon code.");
      return;
    }

    const token = await AsyncStorage.getItem("userToken");
    if (!token) {
      showMessage("You must be logged in to apply a coupon.");
      return;
    }

    const res = await axios.post(
      API_APPLY_COUPON,
      {
        uid: token, // assuming token is UID; if token is different, replace with user ID
        couponCode: couponCode.trim(),
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    console.log("Coupon API response:", res.data);

   if (res.data.status === 1) {
  setIsCouponApplied(true);
  setCouponDiscount(Number(res.data.discount)); // <-- store discount %
  setCouponError("");
  showMessage(res.data.message || "Coupon applied successfully!");
  fetchCart(); // refresh cart totals after coupon applied
} else {
  setIsCouponApplied(false);
  setCouponDiscount(0);
  setCouponError(res.data.message || "Failed to apply coupon.");
}

  } catch (error) {
    console.error("Coupon apply error:", error?.response?.data || error.message);
    setIsCouponApplied(false);
    setCouponError("Failed to apply coupon. Try again.");
  }
};

const removeFromCart = async (cartId) => {
  try {
    const token = await AsyncStorage.getItem("userToken");
    if (!token) {
      showMessage("You must be logged in to remove items.");
      return;
    }

    const res = await axios.post(API_CART_REMOVE, { cartid: cartId }, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (res.data.status === 1) {
      showMessage("🗑️ Item removed from cart");
      fetchCart();
    } else {
      showMessage(res.data.message || "Failed to remove item");
    }
  } catch (error) {
    console.error("Remove from cart failed:", error?.response?.data || error.message);
    showMessage("❌ Could not remove item");
  }
};

  // Fetch cart from API
  const fetchCart = async () => {
  try {
    setLoading(true);
    const token = await AsyncStorage.getItem("userToken");

    if (!token) {
      showMessage("You must be logged in to view your cart.");
      setLoading(false);
      return;
    }

    const res = await axios.get(API_CART_SHOW, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    console.log("Cart API response:", res.data);

    const items = res.data?.items;

    if (res.data.status === 1 && Array.isArray(items)) {
      const formattedItems = items.map((item) => ({
        id: item.cart_id,
        name: item.product_name,
        price: Number(item.final_price || 0),
        image: item.product_image,
        quantity: Number(item.quantity || 1),
      }));

      setCartItems(formattedItems);
    } else {
      setCartItems([]);
      showMessage(res.data.message || "Your cart is empty.");
    }
  } catch (error) {
    console.error("Cart fetch error:", error?.response?.data || error.message);
    showMessage("Failed to load cart.");
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
    fetchCart();
  }, []);

  // Increment/decrement quantity locally
  const incrementQty = (id) => {
    setCartItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: item.quantity + 1 } : item))
    );
  };

  const decrementQty = (id) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === id && item.quantity > 1 ? { ...item, quantity: item.quantity - 1 } : item
      )
    );
  };

const getTotal = () => {
  let total = 0;
  cartItems.forEach((item) => {
    total += item.price * item.quantity;
  });

  if (isCouponApplied && couponDiscount > 0) {
    const discountAmount = (total * couponDiscount) / 100;
    total = total - discountAmount;
  }

  return total.toFixed(2);
};


 const renderItem = ({ item }) => (
  <View style={styles.card}>
    {/* Cross button top-left */}
    <TouchableOpacity 
      style={styles.crossBtn} 
      onPress={() => removeFromCart(item.id)}
    >
      <Text style={styles.crossText}>×</Text>
    </TouchableOpacity>

    <Image source={{ uri: IMAGE_BASE_URL + item.image }} style={styles.image} />
    <View style={styles.info}>
      <Text style={styles.name}>{item.name}</Text>

      <View style={styles.rowBetween}>
        <Text style={styles.price}>R{item.price}</Text>

        {/* Quantity Controls */}
        <View style={styles.qtyControl}>
          <TouchableOpacity onPress={() => decrementQty(item.id)} style={styles.qtyBtn}>
            <Text style={styles.qtyBtnText}>–</Text>
          </TouchableOpacity>
          <Text style={styles.qtyText}>{item.quantity}</Text>
          <TouchableOpacity onPress={() => incrementQty(item.id)} style={styles.qtyBtn}>
            <Text style={styles.qtyBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Existing Remove Button */}
      {/* <TouchableOpacity onPress={() => removeFromCart(item.id)} style={styles.removeBtn}>
        <Text style={styles.removeBtnText}>Remove</Text>
      </TouchableOpacity> */}
    </View>
  </View>
);



  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#c99742" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Cart"
        backgroundColor="#c99742"
        height={(HEADER_HEIGHT_THRESHOLD * height) / 100}
        rightButtons={[]}
        titleStyle={tmh_styles.header_title_tmb}
        navigation={navigation}
        isBack
        backIconColor="black"
      />

      {cartItems.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: "#fff", fontSize: 18 }}>🛒 Your cart is empty</Text>
        </View>
      ) : (
        <FlatList
          data={cartItems}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 200 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Footer */}
<View style={styles.footer}>
  <View style={{ flex: 1 }}>
    {/* Coupon Input */}
    {showCouponInput ? (
      <>
        <View style={styles.couponRow}>
          <TextInput
            style={styles.couponInput}
            placeholder="Voucher code or gift card"
            placeholderTextColor="#888"
            value={couponCode}
            onChangeText={setCouponCode}
          />
          <TouchableOpacity style={styles.applyButton} onPress={applyCoupon}>
            <Text style={styles.applyText}>Apply</Text>
          </TouchableOpacity>
        </View>
        {couponError !== "" && (
          <Text style={styles.errorText}>{couponError}</Text>
        )}
      </>
    ) : (
      <TouchableOpacity onPress={() => setShowCouponInput(true)}>
        <Text style={styles.addVoucherText}>+ Add Voucher</Text>
      </TouchableOpacity>
    )}

    {/* Total & Discount */}
    <View style={{ marginTop: 8 }}>
      {isCouponApplied && couponDiscount > 0 && (
        <Text style={{ color: "#000", fontSize: 16, marginBottom: 4 }}>
          Discount ({couponDiscount}%): -R{(
            (cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0) *
              couponDiscount) /
            100
          ).toFixed(2)}
        </Text>
      )}
      <Text style={styles.totalLabel}>Total</Text>
      <Text style={styles.total}>R {getTotal()}</Text>
    </View>
  </View>

  {/* Checkout Button */}
  <TouchableOpacity
    style={styles.checkout}
    onPress={() => navigation.navigate(Checkout)}
  >
    <Text style={styles.checkoutText}>Checkout</Text>
  </TouchableOpacity>
</View>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d0d0d" },
  card: {
    flexDirection: "row",
    backgroundColor: "#1c1c1c",
    borderRadius: 20,
    padding: 12,
    marginBottom: 20,
    alignItems: "center",
  },
  crossBtn: {
  position: "absolute",
  top: 8,
  left: 8,
  // backgroundColor: "#FF3B30",
  width: 35,
  height: 35,
  borderRadius: 14,
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1,
},
crossText: {
  color: "#fff",
  fontWeight: "bold",
  fontSize: 24,
  lineHeight: 18,
},

  image: { width: 100, height: 130, borderRadius: 12, resizeMode: "contain" },
  info: { flex: 1, marginLeft: 16 },
  name: { color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 6 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 18 },
  price: { color: "#c99742", fontSize: 16, fontWeight: "700" },
  qtyControl: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 6,
    borderColor: "#c99742",
    borderWidth: 1,
  },
  qtyBtn: { borderRadius: 8, width: 30, height: 30, justifyContent: "center", alignItems: "center" },
  qtyBtnText: { color: "#c99742", fontSize: 18, fontWeight: "bold" },
  qtyText: { color: "#c99742", fontSize: 16, fontWeight: "600", marginHorizontal: 12 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#c99742",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  addVoucherText: { color: "#000", fontWeight: "600", marginBottom: 10, fontSize: 15 },
  couponRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#1c1c1c", borderRadius: 12, padding: 8, marginBottom: 8 },
  couponInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, color: "#fff", fontSize: 14 },
  applyButton: { backgroundColor: "transparent", borderColor: "#c99742", borderWidth: 1.5, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16 },
  applyText: { color: "#c99742", fontWeight: "bold", fontSize: 14 },
  errorText: { color: "#FF3B30", fontSize: 14, marginTop: 4, fontWeight: "600" },
  totalLabel: { color: "#1c1c1c", fontSize: 22, fontWeight: "bold", marginTop: 8 },
  total: { color: "#000", fontSize: 22, fontWeight: "700" },
  checkout: { backgroundColor: "#000", paddingVertical: 12, paddingHorizontal: 28, borderRadius: 20, marginLeft: 16 },
  checkoutText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  removeBtn: {
  margin: 10,
  paddingVertical: 6,
  paddingHorizontal: 12,
  backgroundColor: "#c99742",
  borderRadius: 8,
  alignSelf: "flex-start",
},
removeBtnText: {
  color: "#fff",
  fontWeight: "bold",
  fontSize: 13,
},
});

export default Cart;
