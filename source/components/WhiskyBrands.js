/* eslint-disable prettier/prettier */
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Animated,
  ActivityIndicator,
  ScrollView,
  ToastAndroid,
  Platform,
  Alert,
  Modal,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AppHeader from "../widgets/AppHeader";
import tmh_styles from "../styles/tmh_styles";
import SearchBar from "./SearchBar";
import { HEADER_HEIGHT_THRESHOLD } from "../resources/data/Constants";
import { API_BASE } from "../resources/data/Constants";

// === API Constants ===
const API_PRODUCTS_BY_WINE_CAT = `${API_BASE}/productsByWineCat`;
const API_WISHLIST_TOGGLE = `${API_BASE}/customer/wishlist/add`;
const API_GET_WISHLIST = `${API_BASE}/customer/wishlist`;
const API_CART_ADD = `${API_BASE}/cart/addToCart`;
const API_CART_SHOW = `${API_BASE}/cart/show`;

const IMAGE_BASE_URL = "https://ik.imagekit.io/thegrandstore/images/products/";

const showMessage = (message) => {
  if (Platform.OS === "android") ToastAndroid.show(message, ToastAndroid.SHORT);
  else Alert.alert("", message);
};

const WhiskyBrands = ({ navigation }) => {
  const screenDimensions = Dimensions.get("screen");
  const [headerHeight] = useState(
    (HEADER_HEIGHT_THRESHOLD * screenDimensions.height) / 100
  );
  const [rightButtons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [wishlistItemIds, setWishlistItemIds] = useState(new Set());
  const [cartItems, setCartItems] = useState(new Set());
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // === Fetch Products ===
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.post(API_PRODUCTS_BY_WINE_CAT, { catid: "8" });
      if (response.data.status === 1 && Array.isArray(response.data.products)) {
        setProducts(response.data.products);
      } else setProducts([]);
    } catch (error) {
      console.error("Error fetching products:", error?.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

const fetchWishlist = async () => {
  try {
    const token = await AsyncStorage.getItem("userToken");
    const userInfo = await AsyncStorage.getItem("userInfo");

    if (!token || !userInfo) {
      console.warn("User not logged in or user info missing");
      return;
    }

    const user = JSON.parse(userInfo);
    const uid = user.id;

    // ✅ POST with uid
    const res = await axios.post(
      API_GET_WISHLIST,
      { uid },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    const wishlist = res.data.wishlist || res.data.data || [];
    setWishlistItemIds(new Set(wishlist.map((item) => item.productid)));
  } catch (err) {
    console.error("Error fetching wishlist:", err?.response?.data || err.message);
  }
};



  const toggleWishlist = async (item) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const userInfo = await AsyncStorage.getItem("userInfo");
      if (!token || !userInfo) {
        showMessage("You must be logged in to use wishlist.");
        return;
      }

      const user = JSON.parse(userInfo);
      const uid = user.id;
      const productid = item.productid || item.id;

      const formData = new FormData();
      formData.append("uid", uid);
      formData.append("productid", productid);

      const res = await axios.post(API_WISHLIST_TOGGLE, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "multipart/form-data",
        },
      });

      if (res.data.status === "success" || res.data.status === 1) {
        const updated = new Set(wishlistItemIds);
        if (updated.has(productid)) {
          updated.delete(productid);
          showMessage("Removed from Wishlist");
        } else {
          updated.add(productid);
          showMessage("Added to Wishlist");
        }
        setWishlistItemIds(updated);
      } else {
        showMessage(res.data.message || "Wishlist update failed");
      }
    } catch (error) {
      console.error("Wishlist toggle failed:", error?.response?.data || error.message);
      showMessage("Failed to update wishlist");
    }
  };

  // === Cart ===
  const fetchCartItems = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) return;
      const res = await axios.get(API_CART_SHOW, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.status === 1 && res.data.cart) {
        const ids = new Set(res.data.cart.map((item) => item.productid));
        setCartItems(ids);
      }
    } catch (err) {
      console.error("Error fetching cart items:", err);
    }
  };

  const handleAddToCartInstant = async (product) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const userInfo = await AsyncStorage.getItem("userInfo");
      if (!token || !userInfo) {
        showMessage("You must be logged in to add to cart.");
        return;
      }

      const user = JSON.parse(userInfo);
      const payload = {
        customerid: user.id,
        productid: product.productid || product.id,
        variantid: product.variantid || product.id || "0",
        quantity: "1",
        vendorid: product.vendorid || "1",
      };

      const res = await axios.post(API_CART_ADD, payload, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });

      if (res.data.status === 1) {
        showMessage("✅ Added to cart");
        const updated = new Set(cartItems);
        updated.add(product.id);
        setCartItems(updated);
        setSelectedProduct(product);
        setIsModalVisible(true);
      } else {
        showMessage(res.data.message || "Failed to add to cart");
      }
    } catch (err) {
      console.error("Add to cart failed:", err?.response?.data || err.message);
      showMessage("❌ Could not add to cart");
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchWishlist();
    fetchCartItems();
  }, []);

  const renderProductCard = ({ item }) => {
    const scale = new Animated.Value(1);
    const isInWishlist = wishlistItemIds.has(item.id);

    const handlePressIn = () => {
      Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
    };
    const handlePressOut = () => {
      Animated.spring(scale, { toValue: 1, friction: 3, useNativeDriver: true }).start();
    };

    return (
      <Animated.View style={{ transform: [{ scale }], marginBottom: 16, width: "48%" }}>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.9}
          onPress={() => navigation.navigate("ProductDetails", { product: item })}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <Image
            source={{ uri: IMAGE_BASE_URL + item.image }}
            style={styles.productImage}
            resizeMode="contain"
          />

          {/* ❤️ Wishlist Icon */}
          <TouchableOpacity
            style={styles.wishlistIcon}
            onPress={() => toggleWishlist(item)}
          >
            <Image
              source={
                isInWishlist
                  ? require("../resources/assets/heart.png")
                  : require("../resources/assets/wishlist.png")
              }
              style={[styles.icon2, { tintColor: isInWishlist ? "red" : "white" }]}
            />
          </TouchableOpacity>

          <View style={styles.cardContent}>
            <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.size}>{item.subcatname || "Whisky"}</Text>
           {/* === Price + Cart Button Row === */}
<View style={styles.priceCartRow}>
  <Text style={styles.price}>R{item.finalprice}</Text>

  <TouchableOpacity
    style={styles.cartBtn}
    onPress={() => handleAddToCartInstant(item)}
  >
    <Image source={require("../resources/assets/bag.png")} style={styles.icon1} />
  </TouchableOpacity>
</View>

          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title={"Whisky Category"}
        isGradient={false}
        backgroundColor={"#c99742"}
        rightButtons={rightButtons}
        height={headerHeight}
        titleStyle={tmh_styles.header_title_tmb}
        isShowShadow={true}
        navigation={navigation}
        isBack={true}
        backButtonStyle={{ width: 35, height: 25, alignItems: "center" }}
        backIconColor={"black"}
        logoImage={null}
      />

      <SearchBar query={""} setQuery={() => {}} />

      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#c99742" />
          <Text style={{ color: "#fff", marginTop: 10 }}>Loading whiskies...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.grid}>
          {products.length > 0 ? (
            products.map((item) => renderProductCard({ item }))
          ) : (
            <Text style={{ color: "#fff", textAlign: "center", marginTop: 20 }}>
              No products found.
            </Text>
          )}
        </ScrollView>
      )}

      {/* === Added-to-Cart Modal === */}
      <Modal
        transparent
        visible={isModalVisible}
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {cartItems?.has(selectedProduct?.id) && (
              <View style={styles.addedToCartStrip}>
                <Text style={styles.addedToCartText}>✅ Added to Cart</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.modalCloseIcon}
              onPress={() => setIsModalVisible(false)}
            >
              <Text style={styles.closeBtnText}>✖</Text>
            </TouchableOpacity>

            <Image
              source={{ uri: IMAGE_BASE_URL + selectedProduct?.image }}
              style={styles.modalImage}
            />
            <Text style={styles.modalProductName}>{selectedProduct?.name}</Text>
            <Text style={styles.modalProductPrice}>R{selectedProduct?.finalprice}</Text>

            <View style={styles.modalDivider} />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.secondaryBtn, { flex: 1, marginHorizontal: 5 }]}
                onPress={() => {
                  setIsModalVisible(false);
                  navigation.navigate("Cart");
                }}
              >
                <Text style={styles.secondaryBtnText}>View Cart</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryBtn, { flex: 1, marginLeft: 5 }]}
                onPress={() => {
                  setIsModalVisible(false);
                  navigation.navigate("Checkout");
                }}
              >
                <Text style={styles.secondaryBtnText}>Checkout</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.continueShoppingBtn}
              onPress={() => setIsModalVisible(false)}
            >
              <Text style={styles.continueShoppingText}>⬅ Continue Shopping</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d0d0d" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    padding: 16,
  },
  priceCartRow: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginTop: 10,
},

  card: {
    backgroundColor: "#1c1c1c",
    borderRadius: 16,
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    borderColor: "#c99742",
    borderWidth: 1,
    position: "relative",
  },
  productImage: { width: "100%", height: 180, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  wishlistIcon: { position: "absolute", top: 10, right: 10, zIndex: 10 },
  icon1: { width: 22, height: 22, tintColor: "#fff" },
  icon2: { width: 20, height: 20 },
  cardContent: { padding: 12 , display:"flex"},
  name: { fontSize: 15, fontWeight: "700", color: "#fff", marginBottom: 4 },
  size: { fontSize: 13, color: "#bbb", marginBottom: 6 },
  price: { fontSize: 15, fontWeight: "bold", color: "#c99742" },
  cartBtn: {
    marginTop: 10,
    alignSelf: "flex-end",
    backgroundColor: "#c99742",
    borderRadius: 8,
    padding: 6,
  },

  // === Modal ===
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#1c1c1c",
    borderRadius: 5,
    padding: 20,
    width: "85%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f5c242",
  },
  modalCloseIcon: { position: "absolute", top: 10, right: 15 },
  closeBtnText: { fontSize: 18, color: "#fff" },
  modalImage: { width: 150, height: 150, borderRadius: 10, marginVertical: 10 },
  modalProductName: { color: "#fff", fontSize: 16, fontWeight: "700", textAlign: "center" },
  modalProductPrice: { color: "#f5c242", fontSize: 15, marginVertical: 5 },
  modalDivider: { height: 1, backgroundColor: "#444", width: "100%", marginVertical: 10 },
  secondaryBtn: {
    backgroundColor: "#c99742",
    borderRadius: 8,
    paddingVertical: 10,
  },
  secondaryBtnText: { color: "#fff", textAlign: "center", fontWeight: "600" },
  modalButtonRow: { flexDirection: "row", justifyContent: "space-between", width: "100%" },
  continueShoppingBtn: { marginTop: 15 },
  continueShoppingText: { color: "#f5c242", fontSize: 14 },
  addedToCartStrip: {
    width: "100%",
    paddingVertical: 8,
    alignItems: "center",
    position: "absolute",
    top: 5,
    zIndex: 10,
    borderColor: "#f5c242",
    borderWidth: 1,
  },
  addedToCartText: { color: "#f5c242", fontWeight: "bold" },
});

export default WhiskyBrands;
