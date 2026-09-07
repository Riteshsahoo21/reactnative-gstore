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
import { HEADER_HEIGHT_THRESHOLD, BLOCK_HEIGHT_THRESHOLD } from "../resources/data/Constants";
import SearchBar from "./SearchBar";
import { API_BASE } from "../resources/data/Constants";

const API_SPECIAL_OFFERS = `${API_BASE}/special-offers`;
const API_WISHLIST_TOGGLE = `${API_BASE}/customer/wishlist/add`;
const API_GET_WISHLIST = `${API_BASE}/customer/wishlist`;
const IMAGE_BASE_URL = "https://ik.imagekit.io/thegrandstore/images/products/";

const Offers = ({ navigation }) => {
  const screenDimensions = Dimensions.get("screen");

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wishlistIds, setWishlistIds] = useState(new Set());
 const [selectedProduct, setSelectedProduct] = useState(null);
   const [isModalVisible, setIsModalVisible] = useState(false);
 
  const headerHeight = (HEADER_HEIGHT_THRESHOLD * screenDimensions.height) / 100;
const getImageUrl = (imagePath) => {
    if (!imagePath) return "";
    return imagePath.startsWith("http") ? imagePath : `${IMAGE_BASE_URL}${imagePath}`;
  };

  useEffect(() => {
    fetchOffers();
    fetchWishlist();
  }, []);

  const showToast = (msg) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert(msg);
    }
  };

  const fetchOffers = async () => {
    try {
      const response = await axios.get(API_SPECIAL_OFFERS);
      const data = response?.data?.data || response?.data || [];
      setProducts(data);
    } catch (error) {
      console.error("Error fetching offers:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchWishlist = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) return;

      const res = await axios.get(API_GET_WISHLIST, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const wishlist = res?.data?.data || [];
      const ids = wishlist.map((item) => item.id);
      setWishlistIds(new Set(ids));
    } catch (err) {
      console.error("Error fetching wishlist:", err);
    }
  };

  const toggleWishlist = async (productId) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        showToast("Please login to use wishlist.");
        return;
      }

      await axios.post(
        API_WISHLIST_TOGGLE,
        { productid: productId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      const updatedSet = new Set(wishlistIds);
      if (updatedSet.has(productId)) {
        updatedSet.delete(productId);
        showToast("Removed from Wishlist");
      } else {
        updatedSet.add(productId);
        showToast("Added to Wishlist");
      }

      setWishlistIds(updatedSet);
    } catch (err) {
      console.error("Error toggling wishlist:", err.message);
      showToast("Something went wrong.");
    }
  };

  const renderWhiskyCard = ({ item }) => {
    const scale = new Animated.Value(1);
    const isInWishlist = wishlistIds.has(item.id);

    const handlePressIn = () => {
      Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scale, { toValue: 1, friction: 3, useNativeDriver: true }).start();
    };

    return (
      <Animated.View style={{ transform: [{ scale }], marginBottom: 16, width: "48%" }} key={item.id}>
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.9}
          onPress={() => navigation.navigate("ProductDetails", { product: item })}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          {/* Heart Icon */}
          <TouchableOpacity
            style={styles.wishlistIcon}
            onPress={() => toggleWishlist(item.id)}
          >
            <Image
              source={
                isInWishlist
                  ? require("../resources/assets/heart.png")
                  : require("../resources/assets/wishlist.png")
              }
              style={[styles.icon2, { tintColor: isInWishlist ? "#f5c242" : "white" }]}
            />
          </TouchableOpacity>

          {/* Product Image */}
          <Image
            source={{ uri: `${IMAGE_BASE_URL}${item.image}` }}
            style={styles.productImage}
            resizeMode="cover"
          />

          {/* Card Content */}
          <View style={styles.cardContent}>
            <Text
              style={styles.name}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.name}
            </Text>
            {item.size && <Text style={styles.size}>{item.size}</Text>}
            <View style={styles.priceRow}>
              <Text style={styles.price}>
                R{item.price}
                <Text style={styles.superscript}>00</Text>
              </Text>
              <TouchableOpacity style={styles.cartBtn}
               onPress={() => {
              setSelectedProduct(item);
              setIsModalVisible(true);
            }}>
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
        title="Offers"
        isGradient={false}
        backgroundColor="#0c0a08"
        statusBarColor="#0c0a08"
        statusBarStyle="light-content"
        rightButtons={[]}
        height={headerHeight}
        titleStyle={{ color: "#FFFFFF", fontSize: 18, fontWeight: "700" }}
        isShowShadow={false}
        isBack={true}
        backButtonStyle={{ width: 35, height: 25, alignItems: "center" }}
        backIconColor="white"
        logoImage={null}
        navigation={navigation}
      />

      <SearchBar query={""} setQuery={() => {}} />

      {loading ? (
        <ActivityIndicator size="large" color="#c99742" style={{ marginTop: 20 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.grid}>
          {products.map((item) => renderWhiskyCard({ item }))}
        </ScrollView>
      )}
       {/* === Modal Overlay === */}
          <Modal
        transparent
        visible={isModalVisible}
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Product Image */}
            <Image
              source={{ uri: getImageUrl(selectedProduct?.image) }}
              style={styles.modalImage}
            />
      
            {/* Product Info */}
            <Text style={styles.modalProductName}>{selectedProduct?.name}</Text>
      
            {selectedProduct?.size && (
              <Text style={styles.modalProductSize}>Size: {selectedProduct.size}</Text>
            )}
      
            <Text style={styles.modalProductPrice}>
              R{selectedProduct?.price}
            </Text>
      
            {/* Divider */}
            <View style={styles.modalDivider} />
      
            {/* Buttons */}
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => {
                // handle add to cart logic here
                setIsModalVisible(false);
              }}
            >
              <Text style={styles.confirmBtnText}>🛒 Add to Cart</Text>
            </TouchableOpacity>
      
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setIsModalVisible(false)}
            >
              <Text style={styles.closeBtnText}>✖ Close</Text>
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
    marginTop: 12,
    paddingHorizontal: 10,
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
  },
  productImage: {
    width: "100%",
    height: 180,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  superscript: {
    fontSize: 10,
    lineHeight: 16,
    textAlignVertical: "top",
  },
  cardContent: { padding: 12 },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  size: { fontSize: 13, color: "#bbb", marginBottom: 6 },
  price: { fontSize: 15, fontWeight: "bold", color: "#c99742" },
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
  borderRadius: 20,
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

modalImage: {
  width: 140,
  height: 140,
  borderRadius: 14,
  marginBottom: 15,
  resizeMode: "contain",
},

modalProductName: {
  color: "#fff",
  fontSize: 18,
  fontWeight: "600",
  textAlign: "center",
  marginBottom: 5,
},

modalProductSize: {
  color: "#bbb",
  fontSize: 14,
  marginBottom: 8,
},

modalProductPrice: {
  color: "#f5c242",
  fontSize: 22,
  fontWeight: "bold",
  marginBottom: 10,
},

modalDivider: {
  height: 1,
  width: "100%",
  backgroundColor: "#333",
  marginVertical: 15,
},

confirmBtn: {
  backgroundColor: "#f5c242",
  paddingVertical: 12,
  paddingHorizontal: 30,
  borderRadius: 10,
  width: "100%",
  alignItems: "center",
  marginBottom: 12,
},

confirmBtnText: {
  color: "#000",
  fontSize: 16,
  fontWeight: "700",
},

closeBtn: {
  paddingVertical: 10,
  width: "100%",
  alignItems: "center",
},

closeBtnText: {
  color: "#bbb",
  fontSize: 14,
  fontWeight: "500",
},

});

export default Offers;
