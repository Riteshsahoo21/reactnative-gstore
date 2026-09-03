/* eslint-disable prettier/prettier */
/* eslint-disable quotes */
import React, { useState, useEffect, useMemo, useRef } from "react";
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
  DeviceEventEmitter,
} from "react-native";
import { APP_FONT } from "../resources/data/Fonts";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import VideoSlider from "./VideoSlider";
import SearchBar from "./SearchBar";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { API_BASE } from "../resources/data/Constants";
import { getCategoryIcon } from "../helpers/categoryIcons";

// === Constants ===
// === API Constants ===
const IMAGE_BASE_URL = "https://ik.imagekit.io/thegrandstore/images/products/";
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

const DEFAULT_CATEGORIES = [
  { id: 13, name: "Whisky", slug: "whisky" },
  { id: 14, name: "Wine", slug: "wine" },
  { id: 3, name: "Champagne", slug: "champagne" },
  { id: 11, name: "Tequila", slug: "tequila" },
  { id: 5, name: "Cognac", slug: "cognac" },
  { id: 2, name: "Brandy", slug: "brandy" },
  { id: 1, name: "Beer", slug: "beer" },
  { id: 4, name: "Ciders", slug: "ciders" },
  { id: 10, name: "Spirits", slug: "spirits" },
  { id: 6, name: "Gin", slug: "gin" },
  { id: 12, name: "Vodka", slug: "vodka" },
  { id: 8, name: "Rum", slug: "rum" },
  { id: 7, name: "Liqueur", slug: "liqueur" },
  { id: 9, name: "Scotch", slug: "scotch" },
];

const HomeScreen = ({ navigation }) => {
  const [wishlistItemIds, setWishlistItemIds] = useState(new Set());
  const [cartItems, setCartItems] = useState(new Set());
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isCheckoutConfirmModalVisible, setIsCheckoutConfirmModalVisible] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [sections, setSections] = useState({
    newArrivals: [],
    categorySections: [],
  });
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const allProducts = useMemo(() => {
    const productsMap = new Map();
    if (Array.isArray(sections?.newArrivals)) {
      sections.newArrivals.forEach((p) => {
        if (!p) return;
        const id = p.id || p.productid;
        if (id && !productsMap.has(id)) productsMap.set(id, p);
      });
    }
    if (Array.isArray(sections?.categorySections)) {
      sections.categorySections.forEach((sec) => {
        if (Array.isArray(sec?.products)) {
          sec.products.forEach((p) => {
            if (!p) return;
            const id = p.id || p.productid;
            if (id && !productsMap.has(id)) productsMap.set(id, p);
          });
        }
      });
    }
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
    const stored = await AsyncStorage.getItem("grand-store-wishlist");
    const list = stored ? JSON.parse(stored) : [];
    setWishlistItemIds(new Set(list));
  } catch (err) {
    // ignore
  }
};

const fetchCartItems = async () => {
  try {
    const stored = await AsyncStorage.getItem("grand-store-cart");
    const cart = stored ? JSON.parse(stored) : [];
    const ids = new Set(cart.map((item) => item.id || item._id || item.productid));
    setCartItems(ids);
  } catch (err) {
    // ignore
  }
};

const toggleWishlist = (item) => {
  const productid = item.productid || item.id;
  if (!productid) return;

  // ⚡ 0ms Optimistic in-memory update
  const updatedIds = new Set(wishlistItemIds);
  if (updatedIds.has(productid)) {
    updatedIds.delete(productid);
  } else {
    updatedIds.add(productid);
  }

  setWishlistItemIds(updatedIds);
  DeviceEventEmitter.emit("wishlistUpdated", updatedIds.size);

  // 💾 Background persistence (non-blocking)
  AsyncStorage.setItem("grand-store-wishlist", JSON.stringify([...updatedIds])).catch(() => {});
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
        name: product.title || product.name || product.product_name,
        price: Number(product.price || product.final_price || 0),
        image: product.image || product.product_image,
        quantity: 1,
      });
    }

    await AsyncStorage.setItem("grand-store-cart", JSON.stringify(cart));
    DeviceEventEmitter.emit("cartUpdated", cart.length);
    const ids = new Set(cart.map((c) => c.id || c.productid));
    setCartItems(ids);
    showMessage("✅ Added to cart");
    animateButton();
  } catch (err) {
    console.error("Add to cart (instant) failed:", err);
    showMessage("❌ Could not add to cart");
  }
};

  const fetchAllData = async () => {
    try {
      // Fetch categories reliably from web backend with cross-platform fallback
      try {
        const catCandidates = [
          `${API_BASE}/categories`,
          'http://localhost:5000/api/categories',
          'http://192.168.1.9:5000/api/categories',
          'http://10.0.2.2:5000/api/categories',
        ];
        const uniqueCatUrls = [...new Set(catCandidates)];
        let catRes = null;

        for (const url of uniqueCatUrls) {
          try {
            catRes = await axios.get(url, { timeout: 3000 });
            if (catRes?.data) break;
          } catch (e) {
            // try next
          }
        }

        if (catRes && catRes.data) {
          const list = Array.isArray(catRes.data.data)
            ? catRes.data.data
            : Array.isArray(catRes.data)
              ? catRes.data
              : [];
          setCategories(list);
        }
      } catch (catErr) {
        console.error("Failed to fetch categories in HomeScreen:", catErr?.message || catErr);
      }

      // Fetch products from web backend (/products) and group by category
      let newArrivals = [];
      let categorySections = [];
      try {
        const prodCandidates = [
          `${API_BASE}/products`,
          'http://localhost:5000/api/products',
          'http://192.168.1.9:5000/api/products',
          'http://10.0.2.2:5000/api/products',
        ];
        const uniqueProdUrls = [...new Set(prodCandidates)];
        let prodRes = null;

        for (const url of uniqueProdUrls) {
          try {
            prodRes = await axios.get(url, { timeout: 3000 });
            if (prodRes?.data && Array.isArray(prodRes.data)) break;
          } catch (e) {
            // try next
          }
        }

        if (prodRes && Array.isArray(prodRes.data)) {
          const allNormalized = prodRes.data
            .filter((p) => !p.vendorId || p.approvalStatus === 'approved')
            .filter((p) => {
              const cat = String(p.category || p.type || '').toLowerCase();
              return cat !== 'accessories' && cat !== 'accessory';
            })
            .map((p) => {
              const imgUrl = (Array.isArray(p.images) && p.images[0]) || p.image || '';
              const origPrice = Number(p.price) || 0;
              const offPrice = Number(p.offer_price) || 0;
              const hasDiscount = offPrice > 0 && offPrice < origPrice;
              return {
                ...p,
                id: p.id || p._id,
                productid: p.id || p._id,
                vendorid: p.vendorId || p.vendorid || 1,
                name: p.name || 'Product',
                image: imgUrl,
                gallery: Array.isArray(p.images) ? p.images.join(',') : imgUrl,
                price: origPrice,
                final_price: hasDiscount ? offPrice : origPrice,
                offer_price: offPrice || origPrice,
                offer_active: hasDiscount,
                size: p.size || p.options?.[0] || '',
                category: p.category || p.type || '',
                category_id: p.category_id || null,
              };
            });

          // 1. New Arrivals: newest bottles first
          newArrivals = [...allNormalized]
            .sort((a, b) => {
              const aTime = Date.parse(a.createdAt || '') || 0;
              const bTime = Date.parse(b.createdAt || '') || 0;
              return bTime - aTime;
            })
            .slice(0, 15);

          // 2. Category Sections: dynamically group products for each category
          const categoryOrder = [
            { key: 'whisky', title: 'Whisky Collection', defaultName: 'Whisky' },
            { key: 'wine', title: 'Fine Wines', defaultName: 'Wine' },
            { key: 'champagne', title: 'Champagne & Sparkling', defaultName: 'Champagne' },
            { key: 'tequila', title: 'Tequila & Mezcal', defaultName: 'Tequila' },
            { key: 'cognac', title: 'Cognac Collection', defaultName: 'Cognac' },
            { key: 'brandy', title: 'Brandy Collection', defaultName: 'Brandy' },
            { key: 'beer', title: 'Craft Beers', defaultName: 'Beer' },
            { key: 'ciders', title: 'Ciders Collection', defaultName: 'Ciders' },
            { key: 'spirits', title: 'Fine Spirits', defaultName: 'Spirits' },
            { key: 'gin', title: 'Gin Selection', defaultName: 'Gin' },
            { key: 'vodka', title: 'Premium Vodka', defaultName: 'Vodka' },
            { key: 'rum', title: 'Aged Rums', defaultName: 'Rum' },
            { key: 'liqueur', title: 'Liqueurs', defaultName: 'Liqueur' },
          ];

          const usedKeys = new Set();
          for (const item of categoryOrder) {
            const matches = allNormalized.filter((p) => {
              const c = String(p.category || p.type || '').trim().toLowerCase();
              return c === item.key || c.includes(item.key);
            });
            if (matches.length > 0) {
              usedKeys.add(item.key);
              categorySections.push({
                category: item.defaultName,
                title: item.title,
                products: matches,
              });
            }
          }

          // Catch any other categories present in data
          const otherCats = new Set(
            allNormalized.map((p) => String(p.category || p.type || '').trim()).filter(Boolean)
          );
          for (const cat of otherCats) {
            const lower = cat.toLowerCase();
            if (!Array.from(usedKeys).some((k) => lower === k || lower.includes(k))) {
              const matches = allNormalized.filter((p) => {
                const c = String(p.category || p.type || '').trim().toLowerCase();
                return c === lower;
              });
              if (matches.length > 0) {
                categorySections.push({
                  category: cat,
                  title: `${cat} Collection`,
                  products: matches,
                });
              }
            }
          }
        }
      } catch (prodErr) {
        console.error("Failed to fetch products for categories:", prodErr?.message || prodErr);
      }

      setSections({
        newArrivals,
        categorySections,
      });
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

  // 🧩 Animated Heart Button Component with Pop & Flying Zigzag to Header
  const AnimatedHeartButton = React.memo(({ isWishlisted, onPress }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePress = (event) => {
      // ⚡ Instant native driver pop (0ms JS delay)
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.45,
          duration: 90,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();

      // Trigger the zigzag flying heart immediately when saving a bottle!
      if (!isWishlisted) {
        const pageX = event?.nativeEvent?.pageX;
        const pageY = event?.nativeEvent?.pageY;
        DeviceEventEmitter.emit("flyHeartToHeader", {
          startX: typeof pageX === "number" ? pageX : 200,
          startY: typeof pageY === "number" ? pageY : 400,
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
            style={[styles.icon2, { tintColor: isWishlisted ? "#f5c242" : "#ffffff" }]}
          />
        </Animated.View>
      </TouchableOpacity>
    );
  });

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
      <AnimatedHeartButton
        isWishlisted={isInWishlist}
        onPress={() => toggleWishlist(item)}
      />

      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() =>
          navigation.push("ProductDetails", {
            product: item,
            category: categories.find((cat) => cat?.id === item?.category_id) || null,
            related_products: allProducts
              .filter((p) => p && (p.id || p.productid) !== (item?.id || item?.productid))
              .slice(0, 8),
          })
        }
      >
        {/* Golden Gradient Halo Around the Bottle */}
        <LinearGradient
          colors={["#e5c06e", "#634c22", "#d4af37"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.goldBottleHalo}
        >
          <View style={styles.bottlePedestal}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="contain" />
            ) : (
              <View style={[styles.productImage, { backgroundColor: "#12100d" }]} />
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>

        <Text style={styles.productName}>
          {item.name.length > 20 ? item.name.slice(0, 20) + "..." : item.name}
        </Text>

        {item.size && <Text style={styles.productSize}>{item.size}</Text>}

        <View style={styles.cardPriceRow}>
          <View style={{ flex: 1, paddingRight: 4 }}>
            <Text style={styles.productPrice}>R{displayPrice}</Text>
            {hasDiscount && (
              <Text style={styles.oldPrice}>R{item.price}</Text>
            )}
          </View>

          {/* Pure Icon Buttons: Cart & Shop (Icons Only, Purely Visible) */}
          <View style={styles.cardIconActions}>
            {/* 1. Add to Cart Icon Button */}
            <TouchableOpacity
              style={styles.cartIconOnlyBtn}
              activeOpacity={0.7}
              onPress={async () => {
                await handleAddToCartInstant(item);
              }}
            >
              <Image
                source={require("../resources/images/shopping-cart.png")}
                style={styles.cartIconOnlyImg}
                resizeMode="contain"
              />
            </TouchableOpacity>

            {/* 2. Shop Now (Opens Instant Checkout Confirmation Popup) */}
            <TouchableOpacity
              style={styles.shopIconOnlyBtn}
              activeOpacity={0.8}
              onPress={() => {
                setSelectedProduct(item);
                setIsCheckoutConfirmModalVisible(true);
              }}
            >
              <LinearGradient
                colors={["#f5c242", "#c99742"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.shopIconOnlyGradient}
              >
                <Image
                  source={require("../resources/assets/bag.png")}
                  style={styles.shopIconOnlyImg}
                  resizeMode="contain"
                />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderVSectionTitle = (title, data, categoryFilter) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <TouchableOpacity
        onPress={() =>
          navigation.navigate("ViewAll", {
            category_title: categoryFilter || title,
            products: data,
          })
        }
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
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => {
            if (!userName) {
              navigation.navigate("LoginScreen");
            }
          }}
        >
          <Text style={{ color: "#f5c242", fontSize: 20, fontWeight: "600", marginTop: 20, marginBottom: 10 }}>
            {userName ? `Welcome, ${userName}` : "Please sign in →"}
          </Text>
        </TouchableOpacity>

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
                      category: categories.find((cat) => cat?.id === item?.category_id) || null,
                      related_products: allProducts
                        .filter((p) => p && (p.id || p.productid) !== (item?.id || item?.productid))
                        .slice(0, 8),
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {categories.map((cat, index) => (
            <TouchableOpacity
              key={cat.id || index}
              activeOpacity={0.78}
              onPress={() => navigation.navigate("ViewAll", { category_title: cat.name === 'View All' ? '' : cat.name, category_id: cat.id })}
              style={styles.categoryItem}
            >
              <LinearGradient
                colors={['#352a1b', '#1e1711', '#100c08']}
                start={{ x: 0.1, y: 0 }}
                end={{ x: 0.9, y: 1 }}
                style={styles.webCategoryIconContainer}
              >
                <Image
                  source={getCategoryIcon(cat.name)}
                  style={styles.categoryIconImg}
                  resizeMode="contain"
                />
              </LinearGradient>
              <Text style={styles.categoryIconText} numberOfLines={1}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* New Arrivals - Immediately below Categories */}
        {renderVSectionTitle("New Arrivals", sections.newArrivals)}
        <FlatList
          horizontal
          data={sections.newArrivals}
          renderItem={(props) => renderProduct({ ...props, section: 'newArrivals' })}
          keyExtractor={(item, index) => (item.id || item.productid || index).toString()}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 10 }}
        />

        {/* Dynamic Category Sliders (Whisky, Wine, Champagne, Tequila, Cognac, Beer, etc.) */}
        {sections.categorySections &&
          sections.categorySections.map((sec) => (
            <View key={sec.category}>
              {renderVSectionTitle(sec.title, sec.products, sec.category)}
              <FlatList
                horizontal
                data={sec.products}
                renderItem={renderProduct}
                keyExtractor={(item, index) => (item.id || item.productid || index).toString()}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 10, paddingLeft: 4 }}
              />
            </View>
          ))}
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

      {/* Product Image with Golden Halo */}
      <LinearGradient
        colors={["#e5c06e", "#634c22", "#d4af37"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.modalBottleHalo}
      >
        <View style={styles.modalBottlePedestal}>
          <Image
            source={{ uri: getImageUrl(selectedProduct?.image) }}
            style={styles.modalImage}
            resizeMode="contain"
          />
        </View>
      </LinearGradient>

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

      {/* ⚡ Instant Checkout Confirmation Modal ⚡ */}
      <Modal
        visible={isCheckoutConfirmModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCheckoutConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.buyNowModalCard}>
            <View style={styles.buyNowModalHeader}>
              <Text style={styles.buyNowModalTitle}>Instant Checkout</Text>
              <TouchableOpacity onPress={() => setIsCheckoutConfirmModalVisible(false)}>
                <Text style={styles.buyNowModalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.buyNowModalItemRow}>
              {selectedProduct?.image ? (
                <Image
                  source={{ uri: getImageUrl(selectedProduct.image) }}
                  style={styles.buyNowModalThumb}
                  resizeMode="contain"
                />
              ) : null}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.buyNowModalItemName} numberOfLines={2}>
                  {selectedProduct?.name || selectedProduct?.title}
                </Text>
                <Text style={styles.buyNowModalItemSub}>
                  {selectedProduct?.size || "750ml"} • 1 bottle
                </Text>
                <Text style={styles.buyNowModalItemPrice}>
                  R{selectedProduct?.offer_active && Number(selectedProduct?.offer_price) > 0
                    ? Number(selectedProduct?.offer_price).toFixed(2)
                    : Number(selectedProduct?.final_price || selectedProduct?.price || 0).toFixed(2)}
                </Text>
              </View>
            </View>

            <Text style={styles.buyNowModalNotice}>
              Are you sure you want to proceed directly to checkout with this bottle?
            </Text>

            <View style={styles.buyNowModalActions}>
              <TouchableOpacity
                style={styles.buyNowModalCancelBtn}
                onPress={() => setIsCheckoutConfirmModalVisible(false)}
              >
                <Text style={styles.buyNowModalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.buyNowModalConfirmTouch}
                activeOpacity={0.85}
                onPress={() => {
                  setIsCheckoutConfirmModalVisible(false);
                  const pid = selectedProduct?.id || selectedProduct?.productid;
                  const price = selectedProduct?.offer_active && Number(selectedProduct?.offer_price) > 0
                    ? Number(selectedProduct?.offer_price)
                    : Number(selectedProduct?.final_price || selectedProduct?.price || 0);

                  const buyNowItem = {
                    id: pid,
                    productid: pid,
                    name: selectedProduct?.name || selectedProduct?.title,
                    price,
                    image: selectedProduct?.image,
                    quantity: 1,
                    size: selectedProduct?.size || "750ml",
                  };
                  navigation.navigate("Checkout", { buyNowItem, singleItemCheckout: true });
                }}
              >
                <LinearGradient
                  colors={["#f5c242", "#c99742"]}
                  style={styles.buyNowModalConfirmBtn}
                >
                  <Text style={styles.buyNowModalConfirmText}>Yes, Checkout →</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
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
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 8,
    width: 168,
    borderWidth: 1,
    borderColor: "#c99742",
  },
  oldPrice: {
    color: "#888",
    fontSize: 12,
    textDecorationLine: "line-through",
    marginLeft: 4,
  },

  wishlistIcon: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 15,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    padding: 7,
    borderRadius: 20,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
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
  superscript: { fontSize: 10, lineHeight: 16 },
  icon1: { width: 20, height: 20 },
  icon2: { width: 16, height: 16 },
  goldBottleHalo: {
    padding: 1.5,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#d4af37",
    shadowOpacity: 0.32,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  bottlePedestal: {
    backgroundColor: "#13100d",
    borderRadius: 11,
    height: 145,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  modalBottleHalo: {
    padding: 1.5,
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: "#d4af37",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  modalBottlePedestal: {
    backgroundColor: "#13100d",
    borderRadius: 13,
    width: 140,
    height: 140,
    justifyContent: "center",
    alignItems: "center",
  },
  productImage: { width: "88%", height: 130, resizeMode: "contain" },
  productName: { color: "#fff", fontWeight: "600", fontSize: 13, minHeight: 34 },
  productSize: { color: "#aaa", fontSize: 11, marginBottom: 2 },
  cardPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  productPrice: { color: "#f5c242", fontSize: 15, fontWeight: "800" },
  cardIconActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cartIconOnlyBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "rgba(201, 151, 66, 0.15)",
    borderWidth: 1.2,
    borderColor: "rgba(245, 194, 66, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  cartIconOnlyImg: {
    width: 17,
    height: 17,
    tintColor: "#f5c242",
  },
  shopIconOnlyBtn: {
    width: 34,
    height: 34,
  },
  shopIconOnlyGradient: {
    width: 34,
    height: 34,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
  },
  shopIconOnlyImg: {
    width: 17,
    height: 17,
    tintColor: "#0a0a0a",
  },
  cartBtn: { backgroundColor: "#d19f42ff", padding: 8, borderRadius: 11 },
  buyNowModalCard: {
    width: "88%",
    backgroundColor: "#16130f",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.4)",
    padding: 20,
    elevation: 10,
  },
  buyNowModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    paddingBottom: 12,
    marginBottom: 16,
  },
  buyNowModalTitle: {
    color: "#f5c242",
    fontSize: 17,
    fontWeight: "700",
  },
  buyNowModalClose: {
    color: "#888",
    fontSize: 18,
    fontWeight: "700",
    padding: 4,
  },
  buyNowModalItemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    marginBottom: 14,
  },
  buyNowModalThumb: {
    width: 48,
    height: 60,
  },
  buyNowModalItemName: {
    color: "#f8f5ee",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  buyNowModalItemSub: {
    color: "#999",
    fontSize: 12,
    marginBottom: 4,
  },
  buyNowModalItemPrice: {
    color: "#f5c242",
    fontSize: 15,
    fontWeight: "800",
  },
  buyNowModalNotice: {
    color: "#ccc",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 18,
  },
  buyNowModalActions: {
    flexDirection: "row",
    gap: 10,
  },
  buyNowModalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  buyNowModalCancelText: {
    color: "#bbb",
    fontSize: 14,
    fontWeight: "600",
  },
  buyNowModalConfirmTouch: {
    flex: 1.4,
  },
  buyNowModalConfirmBtn: {
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  buyNowModalConfirmText: {
    color: "#0a0a0a",
    fontSize: 14,
    fontWeight: "800",
  },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", marginVertical: 15 },
  sectionTitle: { fontWeight: "500", color: "#CCC", fontSize: 20, fontFamily: APP_FONT },
  viewAll: { color: "#f5c242", fontSize: 14 },
  categoryScroll: {
    marginVertical: 14,
    paddingVertical: 8,
    paddingLeft: 12,
  },
  categoryItem: {
    marginRight: 16,
    alignItems: 'center',
    width: 72,
  },
  webCategoryIconContainer: {
    width: 66,
    height: 66,
    borderRadius: 33,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(201, 151, 66, 0.75)',
    shadowColor: '#f5c242',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
    marginBottom: 8,
  },
  categoryIconImg: {
    width: 44,
    height: 44,
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
    color: "#f0ece3",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
    textAlign: "center",
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
