/* eslint-disable prettier/prettier */
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Modal,
  Platform,
  ToastAndroid,
  Alert,
  DeviceEventEmitter,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AppHeader from "../widgets/AppHeader";
import tmh_styles from "../styles/tmh_styles";
import { API_BASE } from "../resources/data/Constants";

const IMAGE_BASE_URL = "https://ik.imagekit.io/thegrandstore/images/products/";

const showMessage = (message) => {
  if (Platform.OS === "android") ToastAndroid.show(message, ToastAndroid.SHORT);
  else Alert.alert("", message);
};

const Wishlist = ({ navigation }) => {
  const screenWidth = Dimensions.get("window").width;
  const numColumns = 2;
  const cardWidth = (screenWidth - 36) / numColumns;

  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const getImageUrl = (imagePath) => {
    if (!imagePath) return "";
    return imagePath.startsWith("http")
      ? imagePath
      : `${IMAGE_BASE_URL}${imagePath}`;
  };

  const fetchWishlist = async () => {
    setLoading(true);
    try {
      const stored = await AsyncStorage.getItem("grand-store-wishlist");
      const ids = stored ? JSON.parse(stored) : [];

      if (!Array.isArray(ids) || ids.length === 0) {
        setWishlist([]);
        DeviceEventEmitter.emit("wishlistUpdated", 0);
        setLoading(false);
        return;
      }

      // Fetch products to match IDs
      const res = await axios.get(`${API_BASE}/products`);
      const all = res.data?.products || (Array.isArray(res.data) ? res.data : []);

      const matched = all
        .filter((p) => ids.includes(p.id) || ids.includes(p._id))
        .map((p) => ({
          id: p._id || p.id,
          name: p.title || p.name,
          price: Number(p.price || 0),
          final_price: Number(p.offer_price || p.price || 0),
          image: p.images?.[0] || p.image || "",
          category: p.category?.name || p.category_name || "Fine Spirit",
        }));

      setWishlist(matched);
      DeviceEventEmitter.emit("wishlistUpdated", matched.length);
    } catch (error) {
      console.warn("Failed to fetch wishlist:", error);
      setWishlist([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchWishlist();
    }, [])
  );

  const removeFromWishlist = async (productId) => {
    try {
      const stored = await AsyncStorage.getItem("grand-store-wishlist");
      let ids = stored ? JSON.parse(stored) : [];
      ids = ids.filter((id) => id !== productId);
      await AsyncStorage.setItem("grand-store-wishlist", JSON.stringify(ids));
      const next = wishlist.filter((item) => item.id !== productId);
      setWishlist(next);
      DeviceEventEmitter.emit("wishlistUpdated", next.length);
      showMessage("Removed from Wishlist");
    } catch (error) {
      console.error("Failed to remove from wishlist:", error);
    }
  };

  const clearAllWishlist = () => {
    Alert.alert(
      "Clear Wishlist",
      "Are you sure you want to remove all saved bottles from your wishlist?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.setItem("grand-store-wishlist", JSON.stringify([]));
            setWishlist([]);
            DeviceEventEmitter.emit("wishlistUpdated", 0);
            showMessage("Wishlist cleared");
          },
        },
      ]
    );
  };

  const handleAddToCart = async (product) => {
    try {
      const pid = product.id;
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
          price: Number(product.final_price || product.price || 0),
          image: product.image,
          quantity: 1,
        });
      }

      await AsyncStorage.setItem("grand-store-cart", JSON.stringify(cart));
      setSelectedProduct(product);
      setIsModalVisible(true);
    } catch (err) {
      showMessage("Could not add to cart");
    }
  };

  const handleMoveAllToCart = async () => {
    if (wishlist.length === 0) return;
    try {
      const stored = await AsyncStorage.getItem("grand-store-cart");
      let cart = stored ? JSON.parse(stored) : [];

      wishlist.forEach((product) => {
        const pid = product.id;
        const idx = cart.findIndex((c) => (c.id || c.productid) === pid);
        if (idx >= 0) {
          cart[idx].quantity = (Number(cart[idx].quantity) || 1) + 1;
        } else {
          cart.push({
            id: pid,
            productid: pid,
            name: product.name,
            price: Number(product.final_price || product.price || 0),
            image: product.image,
            quantity: 1,
          });
        }
      });

      await AsyncStorage.setItem("grand-store-cart", JSON.stringify(cart));
      showMessage(`✅ Moved ${wishlist.length} bottle(s) to Cart!`);
      navigation.navigate("Cart");
    } catch (e) {
      showMessage("Failed to move items to cart");
    }
  };

  const renderItem = ({ item }) => {
    const hasDiscount = item.final_price && item.final_price < item.price;
    const discountPct = hasDiscount
      ? Math.round(((item.price - item.final_price) / item.price) * 100)
      : 0;

    return (
      <View style={[styles.card, { width: cardWidth }]}>
        {/* Active Pink Heart / Remove Button */}
        <TouchableOpacity
          style={styles.heartBtn}
          onPress={() => removeFromWishlist(item.id)}
          activeOpacity={0.75}
        >
          <Image
            source={require("../resources/assets/heart.png")}
            style={styles.heartIconGold}
          />
        </TouchableOpacity>

        {/* Discount Badge */}
        {hasDiscount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{discountPct}%</Text>
          </View>
        )}

        {/* Golden Gradient Pedestal */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => navigation.navigate("ProductDetails", { product: item })}
          style={styles.imageTouch}
        >
          <LinearGradient
            colors={["#e5c06e", "#634c22", "#d4af37"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.haloBorder}
          >
            <View style={styles.pedestal}>
              <Image
                source={{ uri: getImageUrl(item.image) }}
                style={styles.productImage}
                resizeMode="contain"
              />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.details}>
          <Text style={styles.categoryLabel} numberOfLines={1}>
            {item.category.toUpperCase()}
          </Text>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>

          {/* Pricing */}
          <View style={styles.priceRow}>
            <Text style={styles.currentPrice}>R{item.final_price || item.price}</Text>
            {hasDiscount && <Text style={styles.oldPrice}>R{item.price}</Text>}
          </View>

          {/* Move to Cart CTA */}
          <TouchableOpacity
            style={styles.addToCartBtn}
            onPress={() => handleAddToCart(item)}
            activeOpacity={0.85}
          >
            <Image
              source={require("../resources/assets/bag.png")}
              style={styles.bagIcon}
            />
            <Text style={styles.addToCartText}>Add to Cart</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="My Wishlist"
        isGradient={false}
        backgroundColor="#c99742"
        rightButtons={[]}
        height={65}
        titleStyle={tmh_styles.header_title_tmb}
        isShowShadow={false}
        navigation={navigation}
        isBack={true}
        backButtonStyle={{ width: 35, height: 25, alignItems: "center" }}
        backIconColor="black"
        logoImage={null}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#c99742" />
        </View>
      ) : wishlist.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Text style={styles.emptyHeartEmoji}>❤️</Text>
          </View>
          <Text style={styles.emptyTitle}>Your Wishlist is Empty</Text>
          <Text style={styles.emptyDesc}>
            Curate your private cellar collection. Save your favorite rare whiskies,
            vintage wines, and fine spirits here.
          </Text>
          <TouchableOpacity
            style={styles.exploreBtn}
            onPress={() => navigation.navigate("Home")}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#e5c06e", "#c99742"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.exploreGrad}
            >
              <Text style={styles.exploreText}>Explore Grand Collection →</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Subheader Toolbar */}
          <View style={styles.toolbar}>
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>
                💛 {wishlist.length} {wishlist.length === 1 ? "Saved Bottle" : "Saved Bottles"}
              </Text>
            </View>

            <View style={styles.toolbarActions}>
              <TouchableOpacity
                style={styles.moveAllBtn}
                onPress={handleMoveAllToCart}
                activeOpacity={0.8}
              >
                <Text style={styles.moveAllText}>Move All to Cart 🛒</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={clearAllWishlist}
                activeOpacity={0.7}
              >
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>

          <FlatList
            data={wishlist}
            key={numColumns}
            keyExtractor={(item, index) => item?.id?.toString() || index.toString()}
            renderItem={renderItem}
            numColumns={numColumns}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {/* Added to Cart Modal Confirmation */}
      <Modal
        transparent
        visible={isModalVisible}
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeaderStrip}>
              <Text style={styles.modalHeaderTitle}>✅ Added to Your Cart</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Text style={styles.modalCloseX}>✕</Text>
              </TouchableOpacity>
            </View>

            <Image
              source={{ uri: getImageUrl(selectedProduct?.image) }}
              style={styles.modalImage}
              resizeMode="contain"
            />
            <Text style={styles.modalProductName} numberOfLines={2}>
              {selectedProduct?.name}
            </Text>
            <Text style={styles.modalPrice}>
              R{selectedProduct?.final_price || selectedProduct?.price}
            </Text>

            <View style={styles.modalDivider} />

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalSecondaryBtn}
                onPress={() => {
                  setIsModalVisible(false);
                  navigation.navigate("Cart");
                }}
              >
                <Text style={styles.modalSecondaryText}>View Cart 🛒</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={() => {
                  setIsModalVisible(false);
                  navigation.navigate("Checkout");
                }}
              >
                <LinearGradient
                  colors={["#e5c06e", "#c99742"]}
                  style={styles.modalGradBtn}
                >
                  <Text style={styles.modalPrimaryText}>Checkout</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.continueShopping}
              onPress={() => setIsModalVisible(false)}
            >
              <Text style={styles.continueShoppingText}>← Continue Browsing</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0a08",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  /* Subheader Toolbar */
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
    backgroundColor: "#110e0b",
  },
  countPill: {
    backgroundColor: "rgba(201, 151, 66, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(245, 194, 66, 0.45)",
  },
  countPillText: {
    color: "#f5c242",
    fontSize: 11,
    fontWeight: "700",
  },
  toolbarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  moveAllBtn: {
    backgroundColor: "rgba(201, 151, 66, 0.18)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.4)",
  },
  moveAllText: {
    color: "#f5c242",
    fontSize: 11,
    fontWeight: "700",
  },
  clearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  clearText: {
    color: "#888",
    fontSize: 11,
    fontWeight: "600",
  },

  /* Grid Layout */
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 28,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: 14,
  },

  /* Product Card */
  card: {
    backgroundColor: "#161310",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.22)",
    position: "relative",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  heartBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 10,
    backgroundColor: "rgba(201, 151, 66, 0.22)",
    borderWidth: 1,
    borderColor: "rgba(245, 194, 66, 0.75)",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#f5c242",
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  heartIconGold: {
    width: 17,
    height: 17,
    tintColor: "#f5c242",
  },
  discountBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    zIndex: 10,
    backgroundColor: "#e84c22",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  discountText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "900",
  },
  imageTouch: {
    width: "100%",
    alignItems: "center",
  },
  haloBorder: {
    padding: 1.5,
    borderRadius: 12,
    width: "100%",
    marginBottom: 8,
  },
  pedestal: {
    backgroundColor: "#0f0d0a",
    borderRadius: 11,
    height: 140,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  productImage: {
    width: "82%",
    height: 120,
  },
  details: {
    alignItems: "center",
    width: "100%",
  },
  categoryLabel: {
    color: "#c99742",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  productName: {
    fontSize: 13,
    color: "#eee",
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
    minHeight: 34,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  currentPrice: {
    fontSize: 15,
    color: "#f5c242",
    fontWeight: "800",
  },
  oldPrice: {
    fontSize: 12,
    color: "#888",
    textDecorationLine: "line-through",
  },
  addToCartBtn: {
    width: "100%",
    backgroundColor: "#c99742",
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  bagIcon: {
    width: 14,
    height: 14,
    tintColor: "#111",
  },
  addToCartText: {
    color: "#111",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  /* Empty State */
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
    borderColor: "rgba(245, 194, 66, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyHeartEmoji: {
    fontSize: 36,
  },
  emptyTitle: {
    color: "#f5c242",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  emptyDesc: {
    color: "#999",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 24,
  },
  exploreBtn: {
    borderRadius: 24,
    overflow: "hidden",
  },
  exploreGrad: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  exploreText: {
    color: "#111",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  /* Confirmation Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  modalContainer: {
    backgroundColor: "#161310",
    borderRadius: 16,
    padding: 18,
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.4)",
  },
  modalHeaderStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 12,
  },
  modalHeaderTitle: {
    color: "#2ec4b6",
    fontSize: 15,
    fontWeight: "800",
  },
  modalCloseX: {
    color: "#aaa",
    fontSize: 18,
    fontWeight: "700",
    padding: 4,
  },
  modalImage: {
    width: 120,
    height: 120,
    marginVertical: 8,
  },
  modalProductName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  modalPrice: {
    color: "#f5c242",
    fontSize: 16,
    fontWeight: "800",
  },
  modalDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    width: "100%",
    marginVertical: 14,
  },
  modalButtonsRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  modalSecondaryBtn: {
    flex: 1,
    backgroundColor: "#221d17",
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.3)",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalSecondaryText: {
    color: "#eee",
    fontSize: 13,
    fontWeight: "700",
  },
  modalPrimaryBtn: {
    flex: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  modalGradBtn: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalPrimaryText: {
    color: "#111",
    fontSize: 13,
    fontWeight: "800",
  },
  continueShopping: {
    marginTop: 14,
  },
  continueShoppingText: {
    color: "#999",
    fontSize: 12,
  },
});

export default Wishlist;
