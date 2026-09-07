/* eslint-disable prettier/prettier */
import React, { useState, useEffect, useRef } from "react";
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
  DeviceEventEmitter,
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
      const candidates = [
        `${API_BASE}/products`,
        'http://192.168.1.9:5000/api/products',
        'http://localhost:5000/api/products',
      ];
      let data = null;
      for (const url of candidates) {
        try {
          const res = await axios.get(url, { timeout: 3500 });
          if (res?.data && Array.isArray(res.data)) {
            data = res.data;
            break;
          }
        } catch (e) {}
      }
      if (Array.isArray(data)) {
        const filtered = data.filter((p) => {
          const c = String(p.category || p.type || '').toLowerCase();
          return c.includes('whisky') || c.includes('wine') || c.includes('spirit') || p.category_id === 8 || p.category_id === 13 || p.category_id === 14;
        });
        setProducts(filtered.length > 0 ? filtered : data.slice(0, 20));
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error("Error fetching products:", error?.message || error);
    } finally {
      setLoading(false);
    }
  };


  // === Wishlist ===
  const fetchWishlist = async () => {
    try {
      const stored = await AsyncStorage.getItem("grand-store-wishlist");
      const list = stored ? JSON.parse(stored) : [];
      setWishlistItemIds(new Set(list));
    } catch (err) {
      // ignore
    }
  };

  const toggleWishlist = (item) => {
    const productid = item.productid || item.id;
    if (!productid) return;

    // ⚡ 0ms Optimistic update
    const updated = new Set(wishlistItemIds);
    if (updated.has(productid)) {
      updated.delete(productid);
    } else {
      updated.add(productid);
    }

    setWishlistItemIds(updated);
    DeviceEventEmitter.emit("wishlistUpdated", updated.size);
    AsyncStorage.setItem("grand-store-wishlist", JSON.stringify([...updated])).catch(() => {});
  };

  // === Cart ===
  const fetchCartItems = async () => {
    try {
      const stored = await AsyncStorage.getItem("grand-store-cart");
      const cart = stored ? JSON.parse(stored) : [];
      setCartItems(new Set(cart.map((i) => i.id || i.productid)));
    } catch (err) {
      // ignore
    }
  };

  const handleAddToCartInstant = async (product) => {
    try {
      const pid = product.productid || product.id;
      const stored = await AsyncStorage.getItem("grand-store-cart");
      let cart = stored ? JSON.parse(stored) : [];
      const existingIndex = cart.findIndex((c) => (c.id || c.productid) === pid);

      if (existingIndex >= 0) {
        cart[existingIndex].quantity = (Number(cart[existingIndex].quantity) || 1) + 1;
      } else {
        cart.push({
          id: pid,
          productid: pid,
          name: product.name,
          price: Number(product.finalprice || product.price || 0),
          image: product.image,
          quantity: 1,
        });
      }

      await AsyncStorage.setItem("grand-store-cart", JSON.stringify(cart));
      const updated = new Set(cart.map((i) => i.id || i.productid));
      setCartItems(updated);
      setSelectedProduct(product);
      setIsModalVisible(true);
      showMessage("✅ Added to cart");
    } catch (err) {
      showMessage("❌ Could not add to cart");
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchWishlist();
    fetchCartItems();
  }, []);

  const AnimatedHeartButton = React.memo(({ isWishlisted, onPress }) => {
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    const handlePress = (event) => {
      // ⚡ Instant native driver pop
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.45, duration: 90, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }),
      ]).start();

      if (!isWishlisted) {
        const pageX = event?.nativeEvent?.pageX;
        const pageY = event?.nativeEvent?.pageY;
        DeviceEventEmitter.emit("flyHeartToHeader", {
          startX: pageX || 200,
          startY: pageY || 400,
        });
      }

      onPress();
    };

    return (
      <TouchableOpacity
        style={[styles.wishlistIcon, isWishlisted && styles.wishlistIconActive]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Image
            source={
              isWishlisted
                ? require("../resources/assets/heart.png")
                : require("../resources/assets/wishlist.png")
            }
            style={[styles.icon2, { tintColor: isWishlisted ? "#f5c242" : "#fff" }]}
          />
        </Animated.View>
      </TouchableOpacity>
    );
  });

  const renderProductCard = ({ item }) => {
    const isInWishlist = wishlistItemIds.has(item.id || item.productid);

    return (
      <View key={item.id} style={{ marginBottom: 16, width: "48%" }}>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.9}
          onPress={() => navigation.navigate("ProductDetails", { product: item })}
        >
          <Image
            source={{ uri: IMAGE_BASE_URL + item.image }}
            style={styles.productImage}
            resizeMode="contain"
          />

          {/* ❤️ Wishlist Icon */}
          <AnimatedHeartButton
            isWishlisted={isInWishlist}
            onPress={() => toggleWishlist(item)}
          />

          <View style={styles.cardContent}>
            <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.size}>{item.subcatname || "Whisky"}</Text>
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
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title={"Whisky Category"}
        isGradient={false}
        backgroundColor={"#0c0a08"}
        statusBarColor={"#0c0a08"}
        statusBarStyle={"light-content"}
        rightButtons={rightButtons}
        height={headerHeight}
        titleStyle={{ color: "#FFFFFF", fontSize: 18, fontWeight: "700" }}
        isShowShadow={false}
        navigation={navigation}
        isBack={true}
        backButtonStyle={{ width: 35, height: 25, alignItems: "center" }}
        backIconColor={"white"}
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
  wishlistIcon: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
    padding: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  wishlistIconActive: {
    backgroundColor: "rgba(201, 151, 66, 0.22)",
    borderColor: "rgba(245, 194, 66, 0.75)",
    shadowColor: "#f5c242",
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
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
