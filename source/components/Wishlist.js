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
} from "react-native";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AppHeader from "../widgets/AppHeader";
import tmh_styles from "../styles/tmh_styles";
import { API_BASE } from "../resources/data/Constants";

const API_GET_WISHLIST = `${API_BASE}/customer/wishlist`;
const API_TOGGLE_WISHLIST = `${API_BASE}/customer/wishlist/add`;
const API_CART_ADD = `${API_BASE}/cart/addToCart`;
const API_CART_SHOW = `${API_BASE}/cart/show`;

const Wishlist = ({ navigation }) => {
  const screenWidth = Dimensions.get("window").width;
  const numColumns = 2;
  const cardWidth = (screenWidth - 40) / numColumns;

  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [cartItems, setCartItems] = useState(new Set());
    const [selectedProduct, setSelectedProduct] = useState(null);
  
const IMAGE_BASE_URL = "https://ik.imagekit.io/thegrandstore/images/products/";
const showMessage = (message) => {
  if (Platform.OS === "android") ToastAndroid.show(message, ToastAndroid.SHORT);
  else Alert.alert("", message);
};

  const getImageUrl = (imagePath) => {
    if (!imagePath) return "";
    return imagePath.startsWith("http")
      ? imagePath
      : `https://ik.imagekit.io/thegrandstore/images/products/${imagePath}`;
  };

const fetchWishlist = async () => {
  setLoading(true);
  try {
    const token = await AsyncStorage.getItem("userToken");
    if (!token) {
      console.warn("User not logged in");
      setWishlist([]);
      return;
    }

    // Use POST instead of GET
    const res = await axios.post(
      API_GET_WISHLIST,
      { uid: "738" }, // or dynamically from logged-in user
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    setWishlist(res.data.wishlist || []);
  } catch (error) {
    console.error("Failed to fetch wishlist:", error?.response?.data || error.message);
  } finally {
    setLoading(false);
  }
};



  useFocusEffect(
    useCallback(() => {
      fetchWishlist();
    }, [])
  );

const toggleWishlist = async (productid) => {
  try {
    const token = await AsyncStorage.getItem("userToken");
    const userInfo = await AsyncStorage.getItem("userInfo");
    const user = userInfo ? JSON.parse(userInfo) : null;

    if (!token || !user?.id) return;

    const res = await axios.post(
      API_TOGGLE_WISHLIST,
      { uid: user.id, productid },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    if (res.data.status === 1) {
      fetchWishlist(); // Refresh after toggle
    }
  } catch (error) {
    console.error("Failed to toggle wishlist:", error?.response?.data || error.message);
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



  const renderItem = ({ item }) => (
  <View style={[styles.card, { width: cardWidth }]}>
    {/* Cross button at top-right */}
    <TouchableOpacity
      style={styles.crossBtn}
      onPress={() => toggleWishlist(item.id)}
    >
      <Text style={styles.crossText}>×</Text>
    </TouchableOpacity>

    <Image source={{ uri: getImageUrl(item.image) }} style={styles.productImage} />
    <View style={styles.details}>
      <Text style={styles.productName} numberOfLines={2}>
        {item.name}
      </Text>

      {/* Price and Cart Button Row */}
      <View style={styles.bottomRow}>
        {item.final_price && item.final_price !== item.price ? (
          <View style={styles.priceContainer}>
            <Text style={styles.oldPrice}>R{item.price}</Text>
            <Text style={styles.newPrice}>R{item.final_price}</Text>
          </View>
        ) : (
          <Text style={styles.newPrice}>R{item.final_price || item.price}</Text>
        )}

        <TouchableOpacity
          style={styles.cartBtn}
    onPress={() => handleAddToCartInstant(item)}
        >
    <Image source={require("../resources/assets/bag.png")} style={styles.icon1} />
        </TouchableOpacity>
      </View>
    </View>
  </View>
);


  return (
    <View style={styles.container}>
      <AppHeader
        title={`My Wishlist (${wishlist.length})`}
        isGradient={false}
        backgroundColor={"#c99742"}
        rightButtons={[]}
        height={65}
        titleStyle={tmh_styles.header_title_tmb}
        isShowShadow={false}
        navigation={navigation}
        isBack={true}
        backButtonStyle={{ width: 35, height: 25, alignItems: "center" }}
        backIconColor={"black"}
        logoImage={null}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#c99742" />
        </View>
      ) : wishlist.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.Con}>
            <Image
              source={require("../resources/assets/data.png")}
              style={styles.emptyImage}
            />
            <Text style={styles.emptyText}>Your wishlist is empty</Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={wishlist}
          key={numColumns}
          keyExtractor={(item, index) => (item?.id?.toString() || index.toString())}
          renderItem={renderItem}
          numColumns={numColumns}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
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

      {/* Corrected price display */}
      {selectedProduct?.final_price && selectedProduct?.final_price !== selectedProduct?.price ? (
        <View style={styles.priceContainer}>
          <Text style={styles.oldPrice}>R{selectedProduct.price}</Text>
          <Text style={styles.newPrice}>R{selectedProduct.final_price}</Text>
        </View>
      ) : (
        <Text style={styles.newPrice}>R{selectedProduct?.price || selectedProduct?.final_price}</Text>
      )}

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

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0d0d",
  },
  crossBtn: {
  position: "absolute",
  top: 3,
  right: 4,
  zIndex: 1,
  // backgroundColor: "#c99742",
  width: 25,
  height: 25,
  borderRadius: 12.5,
  justifyContent: "center",
  alignItems: "center",
},
crossText: {
  color: "#fff",
  fontSize: 24,
  fontWeight: "bold",
},

bottomRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
  marginTop: 8,
},

cartBtn: {
   marginTop: 10,
    alignSelf: "flex-end",
    backgroundColor: "#c99742",
    borderRadius: 8,
    padding: 6,
},
cartText: {
  color: "#000",
  fontWeight: "bold",
  fontSize: 14,
},

  listContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 20,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: 14,
  },
    icon1: { width: 22, height: 22, tintColor: "#fff" },

  Con: {
    backgroundColor: "#c99742",
    borderRadius: 25,
    padding: 20,
    margin: 40,
    alignItems: "center",
  },
  card: {
    backgroundColor: "#1c1c1c",
    borderRadius: 5,
    padding: 12,
    alignItems: "center",
    borderColor: "#c99742",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  productImage: {
    width: "100%",
    height: 130,
    borderRadius: 10,
    resizeMode: "contain",
    marginBottom: 12,
  },
  details: {
    alignItems: "center",
  },
  productName: {
    fontSize: 15,
    color: "#fff",
    fontWeight: "600",
    marginBottom: 6,
    textAlign: "center",
  },
  productPrice: {
    fontSize: 15,
    color: "#c99742",
    marginBottom: 10,
  },
  removeBtn: {
    backgroundColor: "#c99742",
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  removeText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "bold",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    color: "#000",
    marginTop: 15,
  },
  emptyImage: {
    width: 80,
    height: 80,
    resizeMode: "contain",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  priceContainer: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 10,
},
oldPrice: {
  fontSize: 14,
  color: "#888",
  textDecorationLine: "line-through",
  marginRight: 6,
},
newPrice: {
  fontSize: 16,
  color: "#c99742",
  fontWeight: "bold",
},
 modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#1c1c1c",
    borderRadius: 5,
    padding: 5,
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

export default Wishlist;
