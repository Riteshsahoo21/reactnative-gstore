/* eslint-disable quotes */
/* eslint-disable prettier/prettier */
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  ToastAndroid,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import tmh_styles from "../styles/tmh_styles";
import AppHeader from "../widgets/AppHeader";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { API_BASE } from "../resources/data/Constants";

const IMAGE_BASE_URL = "https://ik.imagekit.io/thegrandstore/images/products/";
const API_WISHLIST_TOGGLE = `${API_BASE}/customer/wishlist/add`;
const API_GET_WISHLIST = `${API_BASE}/customer/wishlist`;
const API_CART_ADD = `${API_BASE}/cart/addToCart`;
const API_CART_SHOW = `${API_BASE}/cart/show`;

const ViewAll = ({ route, navigation }) => {
 const { category_title, products: initialProducts, category_id } = route.params;
  const [products, setProducts] = useState(initialProducts || []);
  const [loading, setLoading] = useState(false);  const [cartItems, setCartItems] = useState(new Set());
  const [wishlistItemIds, setWishlistItemIds] = useState(new Set());
 const [selectedProduct, setSelectedProduct] = useState(null);
   const [isModalVisible, setIsModalVisible] = useState(false);
 
useEffect(() => {
  fetchWishlist(); // your existing wishlist fetch
  fetchWishlist();
    fetchCartItems();
  if (route.params.category_id) {
    fetchCategoryProducts(route.params.category_id);
  } else if (route.params.products) {
    setProducts(route.params.products);
    setLoading(false);
  }
}, []);

const fetchCategoryProducts = async (catId) => {
  try {
    setLoading(true);
    const response = await axios.post(
      `${API_BASE}/category/products`,
      { catid: catId.toString() }
    );

    // Correct key from your response
    if (response.data && response.data.products) {
      setProducts(response.data.products);
    } else {
      setProducts([]);
    }
  } catch (error) {
    console.error("Failed to fetch category products:", error);
    setProducts([]);
  } finally {
    setLoading(false);
  }
};

  const showMessage = (message) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert(message);
    }
  };

  const getImageUrl = (imagePath) => {
  if (!imagePath || typeof imagePath !== "string") return ""; // Return empty string or fallback image
  return imagePath.startsWith("http") ? imagePath : `${IMAGE_BASE_URL}${imagePath}`;
};

 // === Fetch Wishlist ===
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
        showMessage(" Added to cart");
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

const renderProduct = ({ item }) => {
  const scale = new Animated.Value(1);
  const isInWishlist = wishlistItemIds.has(item.id);

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, friction: 3, useNativeDriver: true }).start();
  };

  const hasOffer =
    (item.offer_active === 1 || item.offer_price < item.price) &&
    item.offer_price !== 0 &&
    item.offer_price !== null;

  return (
    <Animated.View style={{ transform: [{ scale }], marginBottom: 16, width: "48%" }}>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => navigation.navigate("ProductDetails", { product: item })}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
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

        {/* 🖼 Product Image */}
        <Image source={{ uri: getImageUrl(item.image) }} style={styles.productImage} />

        <View style={styles.cardContent}>
          <Text style={styles.productName}>
            {item.name.length > 20 ? item.name.slice(0, 20) + "..." : item.name}
          </Text>
          {item.size && <Text style={styles.size}>{item.size}</Text>}

          {/* 💰 Price + Cart Button Row */}
          <View style={styles.priceRow}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {hasOffer ? (
                <>
                  <Text style={styles.strikePrice}>R{item.price}</Text>
                  <Text style={styles.offerPrice}> R{item.offer_price}</Text>
                </>
              ) : (
                <Text style={styles.productPrice}>R{item.price}</Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.cartBtn}
              onPress={() => {
                setSelectedProduct(item);
                setIsModalVisible(true);
                handleAddToCartInstant(item);
              }}
            >
              <Image
                source={require("../resources/assets/bag.png")}
                style={styles.icon1}
              />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};


  return (
    <View style={styles.container}>
      <AppHeader
        title={category_title || "Products"}
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
      {loading && <ActivityIndicator size="large" color="#c99742" style={{ marginTop: 50 }} />}

      <FlatList
        data={products}
        renderItem={renderProduct}
          keyExtractor={(item,index) => (item.id|| item.productid || index).toString()}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: "space-between" }}
        contentContainerStyle={{ padding: 10 }}
      />
       {/* === Modal Overlay === */}
           <Modal
           transparent
           visible={isModalVisible}
           animationType="fade"
           onRequestClose={() => setIsModalVisible(false)}
         >
           <View style={styles.modalOverlay}>
             <View style={styles.modalContainer}>
               {/* Close Icon at Top-Right */}
               <TouchableOpacity
                 style={styles.modalCloseIcon}
                 onPress={() => setIsModalVisible(false)}
               >
                 <Text style={styles.closeBtnText}>✖</Text>
               </TouchableOpacity>
                     {cartItems.has(selectedProduct?.id) && (
                  <View style={styles.addedToCartStrip}>
                     <Text style={styles.addedToCartText}> Added to Cart</Text>
                   </View>
         )}
         
               {/* Product Image */}
               <Image
                 source={{ uri: getImageUrl(selectedProduct?.image) }}
                 style={styles.modalImage}
               />
         
               {/* Product Name & Price */}
               <Text style={styles.modalProductName}>{selectedProduct?.name}</Text>
               {selectedProduct?.size && (
                 <Text style={styles.modalProductSize}>Size: {selectedProduct.size}</Text>
               )}
{/* Product Price with Offer */}
<View style={{ flexDirection: "row", alignItems: "center", marginVertical: 5 }}>
  {selectedProduct?.offer_active ? (
    <>
      <Text
        style={{
          textDecorationLine: "line-through",
          color: "#aaa",
          fontSize: 16,
          marginRight: 8,
        }}
      >
        R{selectedProduct?.price}
      </Text>
      <Text
        style={{
          color: "#f5c242",
          fontWeight: "bold",
          fontSize: 18,
        }}
      >
        R{selectedProduct?.offer_price}
      </Text>
    </>
  ) : (
    <Text
      style={{
        color: "#f5c242",
        fontWeight: "bold",
        fontSize: 18,
      }}
    >
      R{selectedProduct?.price}
    </Text>
  )}
</View>
         
               <View style={styles.modalDivider} />
         
               {/* Horizontal Button Row: Add to Cart, View Cart, Checkout */}
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
         
               {/* Continue Shopping Button */}
               <TouchableOpacity
                 style={styles.continueShoppingBtn}
             onPress={() => setIsModalVisible(false)}
               >
                 <Text style={styles.continueShoppingText}>⬅ Continue Shopping</Text>
               </TouchableOpacity>
             </View>
           </View>
         </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d0d0d" },
  card: {
    backgroundColor: "#1c1c1c",
    borderRadius: 5,
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    borderColor: "#c99742",
    borderWidth: 1,
  },
  productImage: {
    width: "100%",
    height: 180,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    resizeMode: "contain",
  },
  cardContent: { padding: 12 },
  productName: { fontSize: 14, fontWeight: "700", color: "#fff", marginBottom: 4 },
  size: { fontSize: 12, color: "#bbb", marginBottom: 6 },
  productPrice: { color: "#9a7823ff", fontSize: 16, fontWeight: "700", marginVertical: 5 },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  wishlistIcon: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
    backgroundColor: "#1c1c1c",
    padding: 6,
    borderRadius: 20,
  },
  superscript: {
    fontSize: 10,
    lineHeight: 16,
    textAlignVertical: "top",
  },
  cartBtn: { marginLeft: 8, backgroundColor: "#c99742", padding: 6, borderRadius: 8 },
  icon1: { width: 20, height: 20 },
  icon2: { width: 22, height: 22 },
   // Modal Styles
 modalOverlay: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.75)",
  justifyContent: "center",
  alignItems: "center",
},

modalContainer: {
  backgroundColor: "#1c1c1c",
  borderRadius: 5,
  paddingVertical: 25,
  paddingHorizontal: 20,
  width: "85%",
  alignItems: "center",
  borderWidth: 1,
  borderColor: "#c99742",
  elevation: 5,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.5,
  shadowRadius: 8,
},
strikePrice: {
  fontSize: 14,
  color: "#999",
  textDecorationLine: "line-through",
  marginRight: 5,
},
offerPrice: {
  fontSize: 16,
  color: "#c99742",
  fontWeight: "700",
},

modalImage: { width: 150, height: 150, borderRadius: 15, marginBottom: 10 },
  modalProductName: { color: "#fff", fontSize: 18, fontWeight: "600" },
  modalProductSize: { color: "#aaa", fontSize: 14 },
  modalProductPrice: { color: "#f5c242", fontSize: 20, fontWeight: "bold", marginVertical: 5 },
  modalDivider: { width: "100%", height: 1, backgroundColor: "#333", marginVertical: 10 },
  confirmBtn: { paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  confirmBtnText: { color: "#000", fontSize: 16, fontWeight: "600" },
  closeBtn: { marginTop: 10 },
  closeBtnText: { color: "#ccc", fontSize: 14 },
  modalCloseIcon: {
  position: "absolute",
  top: 10,
  right: 10,
  zIndex: 10,
},

modalButtonRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginVertical: 15,
  width: "100%",
},

secondaryBtn: {
  backgroundColor: "#444",
  paddingVertical: 12,
  borderRadius: 10,
  alignItems: "center",
},

secondaryBtnText: {
  color: "#fff",
  fontWeight: "600",
  fontSize: 14,
},
addedToCartStrip: {
  width: "90%",
  paddingVertical: 8,
  alignItems: "center",
  position: "absolute",
  top: 5,
  zIndex: 2,
  borderColor:"#f5c242",
  borderWidth:1,
  marginTop:"5px"
},

addedToCartText: {
  color: "#fff",
  fontWeight: "700",
  fontSize: 16,
},
continueShoppingBtn: {
  marginTop: 10,
  paddingVertical: 12,
  paddingHorizontal: 25,
  backgroundColor: "#1c1c1c",
  borderRadius: 10,
  borderWidth: 1,
  borderColor: "#c99742",
  alignSelf: "center",
},
continueShoppingText: {
  color: "#f5c242",
  fontWeight: "600",
  fontSize: 14,
},

});

export default ViewAll;
