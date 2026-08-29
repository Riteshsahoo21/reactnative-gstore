/* eslint-disable prettier/prettier */
/* eslint-disable quotes */
import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  ToastAndroid,
  Platform,
  Alert,
  Modal,
  Animated,
  Easing,
} from "react-native";
import { APP_FONT } from "../resources/data/Fonts";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import VideoSlider from "./VideoSlider";
import SearchBar from "./SearchBar";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// === Constants ===
// === API Constants ===
const IMAGE_BASE_URL = "https://ik.imagekit.io/thegrandstore/images/products/";
const API_BASE = `${API_BASE}`;
const API_WISHLIST_TOGGLE = `${API_BASE}/customer/wishlist/add`;
const API_GET_WISHLIST = `${API_BASE}/customer/wishlist`;
const API_CART_ADD = `${API_BASE}/cart/addToCart`; // ✅ updated here
const API_CART_SHOW = `${API_BASE}/cart/show`;

// === Toast Helper ===
const showMessage = (message) => {
  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert("", message);
  }
};

const HomeScreen = ({ navigation }) => {
  const [wishlistItemIds, setWishlistItemIds] = useState(new Set());
  const [cartItems, setCartItems] = useState(new Set());
  const [categories, setCategories] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [sections, setSections] = useState({
    newArrivals: [],
    trending: [],
    specialOffers: [],
    featured: [],
    bestSeller: [],
    wineBrands: [],
    whiskyBrands: [],
    vodkaBrands: [],
  });
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const allProducts = useMemo(() => {
    const productsMap = new Map();
    Object.values(sections).forEach(sectionArray => {
      if (Array.isArray(sectionArray)) {
        sectionArray.forEach(p => {
          const id = p.id || p.productid;
          if (p && p.name && id && !productsMap.has(id)) {
            productsMap.set(id, p);
          }
        });
      }
    });
    return Array.from(productsMap.values());
  }, [sections]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const lowerQuery = searchQuery.toLowerCase();
    return allProducts.filter(p => p.name.toLowerCase().includes(lowerQuery)).slice(0, 5);
  }, [searchQuery, allProducts]);

  // === Add-to-Cart Animation ===
  const scaleAnim = useState(new Animated.Value(1))[0];
  const opacityAnim = useState(new Animated.Value(1))[0];

  const animateButton = () => {
    Animated.parallel([
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 150,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  // === API Calls ===
  const fetchUserName = async () => {
    try {
      const name = await AsyncStorage.getItem("userName");
      if (name) setUserName(name);
    } catch (err) {
      console.error("Error fetching user name:", err);
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

    // 🔧 FIX: send FormData instead of JSON
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

    console.log("Wishlist Response:", res.data);

    // ✅ Update local wishlist state only if successful
    if (res.data.status === "success" || res.data.status === 1) {
      const updatedIds = new Set(wishlistItemIds);
      if (updatedIds.has(productid)) {
        updatedIds.delete(productid);
        showMessage("Removed from Wishlist");
      } else {
        updatedIds.add(productid);
        showMessage("Added to Wishlist");
      }
      setWishlistItemIds(updatedIds);
      await saveToStorage("wishlistItemIds", updatedIds);

    } else {
      console.warn("Wishlist API failed:", res.data);
      showMessage(res.data.message || "Wishlist update failed");
    }
  } catch (error) {
    console.error(
      "Wishlist toggle failed:",
      error?.response?.data || error.message
    );
    showMessage("Failed to update wishlist");
  }
};
// === Persistent Storage Helpers ===
const saveToStorage = async (key, data) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(Array.from(data)));
  } catch (err) {
    console.error(`Failed to save ${key}:`, err);
  }
};

const loadFromStorage = async (key) => {
  try {
    const stored = await AsyncStorage.getItem(key);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch (err) {
    console.error(`Failed to load ${key}:`, err);
    return new Set();
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
      customerid: user.id, // ✅ new field name
      productid: product.productid || product.id,
      variantid: product.variantid || product.id || "0",
      quantity: "1",
      vendorid: product.vendorid || "1",
    };

    const res = await axios.post(API_CART_ADD, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (res.data.status === 1) {
      showMessage("✅ Added to cart");
      setCartItems(new Set([...cartItems, product.id || product.productid]));
      await saveToStorage("cartItems", new Set([...cartItems, product.id || product.productid]));
      animateButton();
    } else {
      showMessage(res.data.message || "Failed to add to cart");
    }
  } catch (err) {
    console.error("Add to cart (instant) failed:", err?.response?.data || err.message);
    showMessage("❌ Could not add to cart");
  }
};



  const fetchAllData = async () => {
    try {
      const endpoints = {
        newArrivals: "/new-arrivals",
        trending: "/trending",
        specialOffers: "/special-offers",
        featured: "/featured",
        bestSeller: "/best-seller",
        wineBrands: "/getBrandSlider/14",
        whiskyBrands: "/getBrandSlider/5",
        vodkaBrands: "/getBrandSlider/13",
        categories: "/categories",
      };

      const responses = await Promise.all(
        Object.values(endpoints).map((url) => axios.get(`${API_BASE}${url}`))
      );

  const normalizeSpecialOffers = (data = []) =>
  data.map((item) => ({
    ...item,
    id: item.productid, // ✅ ensures FlatList & navigation work
    vendorid: item.vendorid || 1, // ✅ safe fallback for cart
    category_id: item.category_id || null, // ✅ optional
    price: item.price || item.offer_price || item.final_price || 0,
    final_price: item.final_price || item.offer_price || item.price || 0,
  }));


setSections({
  newArrivals: responses[0].data.data || [],
  trending: responses[1].data.data || [],
  specialOffers: normalizeSpecialOffers(responses[2].data.data || []),
  featured: responses[3].data.data || [],
  bestSeller: responses[4].data.data || [],
  wineBrands: responses[5].data.data || [],
  whiskyBrands: responses[6].data.data || [],
  vodkaBrands: responses[7].data.data || [],
});


      setCategories(responses[8].data.data || []);
      console.log("Special Offers API sample:", responses[2].data.data?.[0]);
console.log("✅ Normalized Special Offers:", normalizeSpecialOffers(responses[2].data.data)[0]);

    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

//   const handleAddToCart = async () => {
//     if (!selectedProduct) return;

//     try {
//       const token = await AsyncStorage.getItem("userToken");
//       if (!token) {
//         showMessage("You must be logged in to add to cart.");
//         return;
//       }

//    const payload = {
//   productid: selectedProduct.productid || selectedProduct.id,
//   variantid: selectedProduct.id || null,
//   vendorid: selectedProduct.vendorid || 1,
//   quantity,
// };


//       const res = await axios.post(API_CART_ADD, payload, {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           Accept: "application/json",
//         },
//       });

//       if (res.data.status === 1) {
//         showMessage("✅ Added to cart");
//         setCartItems(new Set([...cartItems, selectedProduct.id]));
//        await saveToStorage("cartItems", new Set([...cartItems, product.id || product.productid]));

//         animateButton();
//         setTimeout(() => setIsModalVisible(false), 1000);
//       } else {
//         showMessage(res.data.message || "Failed to add to cart");
//       }
//     } catch (err) {
//       console.error("Add to cart failed:", err?.response?.data || err.message);
//       showMessage("❌ Could not add to cart");
//     }
//   };

 useEffect(() => {
  const initData = async () => {
    const storedWishlist = await loadFromStorage("wishlistItemIds");
    const storedCart = await loadFromStorage("cartItems");

    if (storedWishlist.size > 0) setWishlistItemIds(storedWishlist);
    if (storedCart.size > 0) setCartItems(storedCart);

    await fetchUserName();
    await fetchAllData();
    await fetchWishlist();
    await fetchCartItems();
  };

  initData();
}, []);


  const getImageUrl = (imagePath) =>
    imagePath?.startsWith("http") ? imagePath : `${IMAGE_BASE_URL}${imagePath}`;

  const renderProduct = ({ item, section }) => {
  const isInWishlist = wishlistItemIds.has(item.id || item.productid);
  const imageUrl = getImageUrl(item.image);
  const hasDiscount = item.final_price && Number(item.final_price) < Number(item.price);
  const displayPrice = hasDiscount ? item.final_price : item.price;

  // 🧩 Remove border radius if product belongs to special offers
  const imageStyle = [
    styles.productImage,
    section === "specialOffers" && { borderRadius: 0 },
  ];

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.wishlistIcon} onPress={() => toggleWishlist(item)}>
        <Image
          source={
            isInWishlist
              ? require("../resources/assets/heart.png")
              : require("../resources/assets/wishlist.png")
          }
          style={[styles.icon2, { tintColor: isInWishlist ? "red" : "white" }]}
        />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() =>
          navigation.push("ProductDetails", {
            product: item,
            category: categories.find(cat => cat.id === item.category_id) || null,
            related_products: sections.newArrivals.concat(sections.featured, sections.specialOffers)
              .filter(p => (p.id || p.productid) !== (item.id || item.productid)),
          })
        }
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={imageStyle} />
        ) : (
          <View style={[styles.productImage, { backgroundColor: "#333" }]} />
        )}
      </TouchableOpacity>

        <Text style={styles.productName}>
          {item.name.length > 20 ? item.name.slice(0, 20) + "..." : item.name}
        </Text>

        {item.size && <Text style={styles.productSize}>{item.size}</Text>}

           <View style={styles.priceRow}>
        <View>
          {/* ✅ Show final_price and crossed-out original price if applicable */}
          <Text style={styles.productPrice}>R{displayPrice}</Text>
          {hasDiscount && (
            <Text style={styles.oldPrice}>R{item.price}</Text>
          )}
        </View>

          <TouchableOpacity
            style={styles.cartBtn}
           onPress={async () => {
  setSelectedProduct(item);
  setIsModalVisible(true);
  await handleAddToCartInstant(item); // 👈 instantly add to cart
}}

          >
            <Image source={require("../resources/assets/bag.png")} style={styles.icon1} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderVSectionTitle = (title, data) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <TouchableOpacity
        onPress={() => navigation.navigate("ViewAll", { category_title: title, products: data })}
      >
        <Text style={styles.viewAll}>View All</Text>
      </TouchableOpacity>
    </View>
  );

  const renderBrandSlider = (brands) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.brandContainer}>
      {brands.map((item) =>
        item.brandlogo ? (
          <Image
            key={item.brandslug}
            source={{ uri: item.brandlogo }}
            style={styles.brandImage}
            resizeMode="contain"
          />
        ) : null
      )}
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#c99742" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#121212' }}>
      <ScrollView style={styles.container}>
        <Text style={{ color: "#f5c242", fontSize: 20, fontWeight: "600", marginTop: 20, marginBottom: 10 }}>
          {userName ? `Welcome, ${userName}` : "Please sign in"}
        </Text>

        <View style={{ zIndex: 100 }}>
          <SearchBar query={searchQuery} setQuery={setSearchQuery} placeholder="Search products..." />
          {searchResults.length > 0 && (
            <View style={styles.searchResultsContainer}>
              {searchResults.map((item, index) => (
                <TouchableOpacity
                  key={item.id || item.productid || index}
                  style={styles.searchResultItem}
                  onPress={() => {
                    setSearchQuery("");
                    navigation.push("ProductDetails", {
                      product: item,
                      category: categories.find(cat => cat.id === item.category_id) || null,
                      related_products: []
                    });
                  }}
                >
                  <Image source={{ uri: getImageUrl(item.image) }} style={styles.searchResultImg} />
                  <View style={styles.searchResultTextContainer}>
                    <Text style={styles.searchResultName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.searchResultPrice}>R{item.offer_active ? item.offer_price : item.price}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <VideoSlider />

        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 15, paddingVertical: 10, paddingLeft: 10 }}>
          {categories.map((cat, index) => (
            <TouchableOpacity
              key={cat.id || index}
              onPress={() => navigation.navigate("ViewAll", { category_title: cat.name === 'View All' ? '' : cat.name })}
              style={{ marginRight: 20, alignItems: 'center' }}
            >
              <View style={styles.webCategoryIconContainer}>
                <Icon name={cat.icon || 'bottle-wine'} size={30} color="#c99742" />
              </View>
              <Text style={styles.categoryIconText}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Product Sections */}
        {renderVSectionTitle("Special Offers", sections.specialOffers)}
        <FlatList
          horizontal
          data={sections.specialOffers}
          renderItem={renderProduct}
keyExtractor={(item, index) => (item.id || item.productid || index).toString()}
          showsHorizontalScrollIndicator={false}
          // contentContainerStyle={{ paddingVertical: 10 }}
        />

        <Text style={styles.brandheading}>Top Wine Brands</Text>
        <View style={styles.verticleline} />
        {renderBrandSlider(sections.wineBrands)}

        {renderVSectionTitle("New Arrivals", sections.newArrivals)}
        <FlatList
          horizontal
          data={sections.newArrivals}
          renderItem={renderProduct}
          keyExtractor={(item,index) => (item.id|| item.productid || index).toString()}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 10 }}
        />

        {renderVSectionTitle("Featured Collection", sections.featured)}
        <FlatList
          horizontal
          data={sections.featured}
          renderItem={renderProduct}
          keyExtractor={(item,index) => (item.id|| item.productid || index).toString()}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 10 }}
        />

        <Text style={styles.brandheading}>Top Whisky Brands</Text>
        <View style={styles.verticleline} />
        {renderBrandSlider(sections.whiskyBrands)}

        {renderVSectionTitle("Best Seller", sections.bestSeller)}
        <FlatList
          horizontal
          data={sections.bestSeller}
          renderItem={renderProduct}
          keyExtractor={(item,index) => (item.id|| item.productid || index).toString()}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 10 }}
        />

        <Text style={styles.brandheading}>Top Vodka Brands</Text>
        <View style={styles.verticleline} />
        {renderBrandSlider(sections.vodkaBrands)}

        {renderVSectionTitle("Trending Now", sections.trending)}
        <FlatList
          horizontal
          data={sections.trending}
          renderItem={renderProduct}
          keyExtractor={(item,index) => (item.id|| item.productid || index).toString()}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 10 }}
        />
      </ScrollView>

      {/* Modal */}
  <Modal
  transparent
  visible={isModalVisible}
  animationType="fade"
  onRequestClose={() => setIsModalVisible(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContainer}>

      {/* === Added to Cart Strip at Top === */}
      {cartItems?.has(selectedProduct?.id) && (
        <View style={styles.addedToCartStrip}>
          <Text style={styles.addedToCartText}> Added to Cart</Text>
        </View>
      )}

      {/* Close Icon at Top-Right */}
      <TouchableOpacity
        style={styles.modalCloseIcon}
        onPress={() => setIsModalVisible(false)}
      >
        <Text style={styles.closeBtnText}>✖</Text>
      </TouchableOpacity>

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

      {/* Buttons */}
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

// === Styles ===
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d0d0d", paddingHorizontal: 15 },
  card: {
    backgroundColor: "#1C1C1C",
    borderRadius: 5,
    padding: 15,
    marginHorizontal: 10,
    width: 160,
    borderWidth: 1,
    borderColor: "#c99742",
  },
  oldPrice: {
  color: "#888",
  fontSize: 13,
  textDecorationLine: "line-through",
  marginTop: 2,
},

  wishlistIcon: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 1,
    backgroundColor: "#3B3E40",
    padding: 6,
    borderRadius: 20,
    elevation: 3,
  },
  superscript: { fontSize: 10, lineHeight: 16 },
  icon1: { width: 20, height: 20 },
  icon2: { width: 16, height: 16 },
  productImage: { width: "100%", height: 150, resizeMode: "cover" },
  productName: { color: "#fff", fontWeight: "400", fontSize: 14 },
  productSize: { color: "#aaa", fontSize: 12 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  productPrice: { color: "#9a7823ff", fontSize: 16, fontWeight: "700", marginVertical: 5 },
  cartBtn: { backgroundColor: "#d19f42ff", padding: 8, borderRadius: 11 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", marginVertical: 15 },
  sectionTitle: { fontWeight: "500", color: "#CCC", fontSize: 20, fontFamily: APP_FONT },
  viewAll: { color: "#f5c242", fontSize: 14 },
  categoryText: { color: "#ccc", fontSize: 18, fontWeight: "500" },
  activeCategory: { color: "#936e2bff", borderBottomWidth: 2, borderBottomColor: "#f5c242" },
  webCategoryIconContainer: {
    width: 65,
    height: 65,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#c99742',
    marginBottom: 12,
  },
  categoryIconContainer: {
    width: 65,
    height: 65,
    borderRadius: 35,
    backgroundColor: '#1C1C1C',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c99742',
    marginBottom: 8,
    elevation: 3,
  },
  categoryIconImage: {
    width: 40,
    height: 40,
  },
  categoryIconText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
    textAlign: 'center',
  },
  brandheading: { color: "#fff", fontSize: 24, textAlign: "center", marginVertical: 15 },
  verticleline: { height: 2, width: "65%", backgroundColor: "#c39f5f", alignSelf: "center" },
  brandContainer: { marginLeft: 10 },
  brandImage: { width: 100, height: 100, marginRight: 5, borderRadius: 8 },
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
    backgroundColor: "#1C1C1C",
    borderRadius: 5,
    padding: 20,
    alignItems: "center",
    width: "85%",
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
    borderWidth: 1,
  },
  searchResultsContainer: {
    position: 'absolute',
    top: 65,
    left: '2.5%',
    width: '95%',
    backgroundColor: '#1c1c1c',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c99742',
    zIndex: 999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  searchResultItem: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    alignItems: 'center',
  },
  searchResultImg: {
    width: 40,
    height: 40,
    borderRadius: 5,
    backgroundColor: '#333',
  },
  searchResultTextContainer: {
    marginLeft: 10,
    flex: 1,
  },
  searchResultName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  searchResultPrice: {
    color: '#f5c242',
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 2,
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

export default HomeScreen;
