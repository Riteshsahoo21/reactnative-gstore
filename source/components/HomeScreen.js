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
import { API_BASE, getActiveServerHost } from "../resources/data/Constants";
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

// === Price / Currency Formatter (ensures "R" and numbers never wrap) ===
const formatPrice = (value) => {
  if (value === null || value === undefined || value === "") return "0";
  const cleaned =
    typeof value === "number"
      ? value
      : parseFloat(String(value).replace(/[^0-9.-]+/g, ""));
  if (isNaN(cleaned)) return String(value).replace(/^R\s*/i, "").trim();

  if (cleaned % 1 === 0) {
    return cleaned.toLocaleString("en-US");
  }
  return cleaned.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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

const DEFAULT_AUCTIONS = [
  {
    _id: "6a95896cd59ce399e7017eb7",
    lotNumber: "LOT-2026-17EB7",
    title: "wine",
    description: "best in the town",
    category: "Wine",
    status: "live",
    currentBid: 2002,
    startingBid: 100,
    bidIncrement: 500,
    endDate: "2026-09-07T14:05:00.000Z",
    reserveMet: false,
    bidCount: 3,
    images: [
      "https://res.cloudinary.com/oioqrgj0/image/upload/v1788184939/grandstore-uploads/wyonfqo8yf7mdhhc3rub.jpg",
    ],
  },
  {
    _id: "6a9a728552d8c97805c587aa",
    lotNumber: "GS-2026-00112",
    title: "The Macallan 1926 60-Year-Old Valerio Adami Edition",
    description: "Distilled in 1926 and matured in sherry-seasoned oak cask #263 for six decades. Features artwork label by Valerio Adami.",
    category: "Whisky",
    status: "sold",
    currentBid: 75000,
    winningBid: 75000,
    startingBid: 75000,
    reserveMet: true,
    bidCount: 1,
    images: [
      "https://images.unsplash.com/photo-1527281400683-1aae777175f8?auto=format&fit=crop&q=80&w=1200",
    ],
  },
  {
    _id: "6a994ca431f127330aa8ff46",
    lotNumber: "LOT-2026-094CA",
    title: "Château Chaplosi Grand Cru Réserve 2015",
    description: "Grand Cru classified vintage with unparalleled complexity, velvety tannins, and cellared in optimal conditions.",
    category: "Wine",
    status: "sold",
    currentBid: 25000,
    winningBid: 25000,
    startingBid: 15000,
    reserveMet: true,
    bidCount: 4,
    images: [
      "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&q=80&w=1000",
    ],
  },
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
  const [featuredEvents, setFeaturedEvents] = useState([]);
  const [featuredAuctions, setFeaturedAuctions] = useState(DEFAULT_AUCTIONS);
  const [wonAuctionAlert, setWonAuctionAlert] = useState(null);

  const displayedVaultAuctions = useMemo(() => {
    if (!Array.isArray(featuredAuctions)) return [];
    const liveLots = featuredAuctions.filter(
      (a) => a && (a.status === "live" || a.status === "extended")
    );
    const pastLots = featuredAuctions.filter(
      (a) => a && a.status === "sold"
    );
    const upcomingLots = featuredAuctions.filter(
      (a) => a && a.status === "upcoming"
    );

    if (liveLots.length >= 2) {
      // More than one live auction: show live auctions only!
      return liveLots;
    } else if (liveLots.length === 1) {
      // Exactly 1 live auction: the only live auction first, then only ONE past auction
      return [...liveLots, ...pastLots.slice(0, 1)];
    } else if (pastLots.length > 0) {
      // No live auctions: at most one past auction
      return pastLots.slice(0, 1);
    } else if (upcomingLots.length > 0) {
      return upcomingLots.slice(0, 1);
    }
    return [];
  }, [featuredAuctions]);

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

      // Render products immediately without waiting for events & auctions
      setSections({
        newArrivals,
        categorySections,
      });
      setLoading(false);

      try {
        const evtCandidates = [
          `${API_BASE}/events`,
          'http://localhost:5000/api/events',
          'http://127.0.0.1:5000/api/events',
          'http://10.0.2.2:5000/api/events',
          'http://192.168.1.9:5000/api/events',
        ];
        for (const url of evtCandidates) {
          try {
            const evtRes = await axios.get(url, { timeout: 2000, _skipRewrite: true });
            if (evtRes?.data && Array.isArray(evtRes.data)) {
              setFeaturedEvents(evtRes.data.slice(0, 6));
              break;
            }
          } catch (e) {}
        }
      } catch (evtErr) {
        console.error("Error fetching events for home:", evtErr?.message || evtErr);
      }

      try {
        const aucCandidates = [
          `${API_BASE}/auction`,
          'http://localhost:5000/api/auction',
          'http://127.0.0.1:5000/api/auction',
          `${API_BASE}/auctions`,
          'http://10.0.2.2:5000/api/auction',
          'http://192.168.1.9:5000/api/auction',
        ];
        for (const url of aucCandidates) {
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 2000);
            const res = await fetch(url, { signal: controller.signal, _skipRewrite: true });
            clearTimeout(timer);
            if (res && res.ok) {
              const data = await res.json();
              const list = Array.isArray(data) ? data : (data.lots || data.data || []);
              if (list.length > 0) {
                setFeaturedAuctions(list.slice(0, 10));
                break;
              }
            }
          } catch (e) {}
        }
      } catch (aucErr) {
        console.error("Error fetching auctions for home:", aucErr?.message || aucErr);
      }

      // Check for user's won auctions (for luxury top alert)
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (token) {
          const dashCandidates = [
            `${API_BASE}/auction/user/dashboard`,
            'http://localhost:5000/api/auction/user/dashboard',
            'http://127.0.0.1:5000/api/auction/user/dashboard',
            'http://192.168.1.9:5000/api/auction/user/dashboard',
          ];
          for (const url of dashCandidates) {
            try {
              const controller = new AbortController();
              const timer = setTimeout(() => controller.abort(), 2000);
              const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` },
                signal: controller.signal,
                _skipRewrite: true,
              });
              clearTimeout(timer);
              if (res && res.ok) {
                const data = await res.json();
                if (Array.isArray(data.wonLots) && data.wonLots.length > 0) {
                  const pending = data.wonLots.find(l => l.paymentStatus !== 'Paid') || data.wonLots[0];
                  if (pending) {
                    setWonAuctionAlert(pending);
                    break;
                  }
                }
              }
            } catch (e) {}
          }
        }
      } catch (dashErr) {}
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
          <View style={styles.cardPriceContainer}>
            <Text
              style={styles.productPrice}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              R{formatPrice(displayPrice)}
            </Text>
            {hasDiscount && (
              <Text
                style={styles.oldPrice}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                R{formatPrice(item.price)}
              </Text>
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

  const renderVSectionTitle = (title, data, categoryFilter, actionText = "View All →") => (
    <View style={styles.centeredSectionHeader}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionAccentLine} />
        <Text style={styles.centeredSectionTitle}>{title}</Text>
        <View style={styles.sectionAccentLine} />
      </View>
      <TouchableOpacity
        style={styles.centeredViewAllTouch}
        activeOpacity={0.72}
        onPress={() =>
          navigation.navigate("ViewAll", {
            category_title: categoryFilter || title,
            products: data,
          })
        }
      >
        <Text style={styles.centeredViewAllText}>{actionText}</Text>
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
          style={styles.welcomeBannerTouch}
          onPress={() => {
            if (!userName) {
              navigation.navigate("LoginScreen");
            }
          }}
        >
          <View style={styles.welcomePillContainer}>
            <Text style={styles.welcomeText}>
              {userName ? `Welcome, ${userName}` : "Please sign in →"}
            </Text>
          </View>
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
                    <Text style={styles.searchResultPrice} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                      R{formatPrice(item.offer_active ? item.offer_price : item.price)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* 🏆 Luxury Won Auction Notification Banner (matches web AuctionWinnerHomeAlert.jsx) */}
        {wonAuctionAlert && (
          <TouchableOpacity
            style={styles.wonAlertBanner}
            activeOpacity={0.88}
            onPress={() => navigation.navigate("AuctionCheckout", { lotId: wonAuctionAlert._id, lot: wonAuctionAlert })}
          >
            <LinearGradient
              colors={["#2b1f0d", "#1c1408", "#120d04"]}
              style={styles.wonAlertGradient}
            />
            <View style={styles.wonAlertIconWrap}>
              <Text style={{ fontSize: 20 }}>🏆</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.wonAlertTitle}>
                AUCTION WON • LOT #{wonAuctionAlert.lotNumber || (wonAuctionAlert._id && wonAuctionAlert._id.slice(-6).toUpperCase()) || "GS-LOT"}
              </Text>
              <Text style={styles.wonAlertDesc} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {wonAuctionAlert.title} — Hammer: R{formatPrice(wonAuctionAlert.winningBid || wonAuctionAlert.currentBid || 0)}
              </Text>
            </View>
            <View style={styles.wonAlertBtn}>
              <Text style={styles.wonAlertBtnText}>Claim →</Text>
            </View>
          </TouchableOpacity>
        )}

        <VideoSlider />

        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {/* Auctions Quick Entry */}
          <TouchableOpacity
            activeOpacity={0.78}
            onPress={() => navigation.navigate("AuctionsHub")}
            style={styles.categoryItem}
          >
            <LinearGradient
              colors={['#4a3512', '#2a1e0a', '#171005']}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={[styles.webCategoryIconContainer, { borderColor: '#d4af37', borderWidth: 1.2 }]}
            >
              <Image
                source={require("../resources/images/event.png")}
                style={[styles.categoryIconImg, { tintColor: '#ffd700' }]}
                resizeMode="contain"
              />
            </LinearGradient>
            <Text style={[styles.categoryIconText, { color: '#ffd700', fontWeight: 'bold' }]} numberOfLines={1}>
              Auctions
            </Text>
          </TouchableOpacity>

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
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
        />

        {/* Exclusive Events & Tastings Spotlight */}
        {featuredEvents.length > 0 && (
          <View style={styles.eventsSection}>
            <View style={styles.centeredSectionHeader}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionAccentLine} />
                <Text style={styles.centeredSectionTitle}>Cellar Tastings & Events 🎟️</Text>
                <View style={styles.sectionAccentLine} />
              </View>
              <TouchableOpacity
                style={styles.centeredViewAllTouch}
                onPress={() => navigation.navigate("EventsHub")}
                activeOpacity={0.72}
              >
                <Text style={styles.centeredViewAllText}>View All Events →</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10 }}
            >
              {featuredEvents.map((evt) => {
                const prices = (evt.ticketTiers || [])
                  .map((t) => Number(t.price))
                  .filter((p) => Number.isFinite(p));
                const startPrice = prices.length ? Math.min(...prices) : null;
                const evtDate = evt.date
                  ? new Date(evt.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  : "Upcoming";
                const imgUri = evt.image
                  ? evt.image.startsWith("http")
                    ? evt.image
                    : `${getActiveServerHost()}/${evt.image.replace(/^\//, "")}`
                  : "https://ik.imagekit.io/thegrandstore/bg.webp";

                const statusLower = String(evt.status || "").toLowerCase();
                const isPastDate = evt.date && new Date(evt.date) < new Date(new Date().setHours(0, 0, 0, 0)) && statusLower !== "ongoing";
                const totalPasses = (evt.ticketTiers || []).reduce((acc, tier) => {
                  const qty = Number(tier.quantity) || 0;
                  const sold = Number(tier.sold) || 0;
                  const res = Number(tier.reserved) || 0;
                  return acc + Math.max(0, qty - sold - res);
                }, 0);
                const isSoldOut = (evt.ticketTiers && evt.ticketTiers.length > 0) && totalPasses === 0;
                const isClosed = ["completed", "closed", "cancelled", "concluded", "ended"].includes(statusLower) || evt.bookingClosed === true || isPastDate || isSoldOut;

                return (
                  <TouchableOpacity
                    key={evt._id}
                    style={[styles.eventHomeCard, isClosed && styles.eventHomeCardClosed]}
                    onPress={() => navigation.navigate("EventDetails", { eventId: evt._id, event: evt })}
                    activeOpacity={0.88}
                  >
                    <Image source={{ uri: imgUri }} style={[styles.eventHomeImage, isClosed && { opacity: 0.7 }]} resizeMode="cover" />
                    <LinearGradient
                      colors={["transparent", "rgba(10, 9, 7, 0.75)", "#0a0907"]}
                      style={styles.eventHomeGradient}
                    />

                    {/* Top Badges */}
                    <View style={styles.eventHomeBadgesRow}>
                      <View style={styles.eventHomeBadge}>
                        <Text style={styles.eventHomeBadgeText}>{evt.type || "TASTING"}</Text>
                      </View>
                      {isClosed && (
                        <View style={styles.eventHomeClosedBadge}>
                          <Text style={styles.eventHomeClosedBadgeText}>
                            {isSoldOut ? "SOLD OUT" : "CLOSED"}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.eventHomeInfo}>
                      <Text style={styles.eventHomeDate}>📅 {evtDate} {evt.startTime ? `• ${evt.startTime}` : ""}</Text>
                      <Text style={styles.eventHomeTitle} numberOfLines={1}>
                        {evt.title}
                      </Text>
                      <View style={styles.eventHomeFooter}>
                        <Text
                          style={[
                            styles.eventHomePrice,
                            isClosed && { color: "#8a7e72" }
                          ]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.8}
                        >
                          {isClosed ? (isSoldOut ? "Passes Sold Out" : "Booking Closed") : (startPrice === null ? "Complimentary" : `From R${formatPrice(startPrice)}`)}
                        </Text>
                        <View style={[styles.eventHomeBookBtn, isClosed && styles.eventHomeBookBtnClosed]}>
                          <Text style={[styles.eventHomeArrow, isClosed && styles.eventHomeArrowClosed]}>
                            {isClosed ? "Closed" : "Book →"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Rare Vault Auctions Spotlight */}
        {displayedVaultAuctions && displayedVaultAuctions.length > 0 && (
          <View style={styles.eventsSection}>
            <View style={styles.centeredSectionHeader}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionAccentLine} />
                <Text style={styles.centeredSectionTitle}>Rare Vault Auctions 🏛️</Text>
                <View style={styles.sectionAccentLine} />
              </View>
              <TouchableOpacity
                style={styles.centeredViewAllTouch}
                onPress={() => navigation.navigate("AuctionsHub")}
                activeOpacity={0.72}
              >
                <Text style={styles.centeredViewAllText}>Enter Vault Room →</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10 }}
            >
              {displayedVaultAuctions.map((lot) => {
                const imgUri = lot.images && lot.images.length > 0
                  ? (lot.images[0].startsWith("http") ? lot.images[0] : `${getActiveServerHost()}/${lot.images[0].replace(/^\//, "")}`)
                  : "https://ik.imagekit.io/thegrandstore/bg.webp";
                const isSold = lot.status === "sold";
                const isLive = lot.status === "live" || lot.status === "extended";
                const displayPrice = isSold && lot.winningBid ? lot.winningBid : (lot.currentBid || lot.startingBid || 0);

                return (
                  <TouchableOpacity
                    key={lot._id}
                    style={styles.eventHomeCard}
                    onPress={() => navigation.navigate("AuctionLotDetails", { lotId: lot._id, lot })}
                    activeOpacity={0.88}
                  >
                    <Image source={{ uri: imgUri }} style={styles.eventHomeImage} resizeMode="contain" />
                    <LinearGradient
                      colors={["transparent", "rgba(10, 9, 7, 0.8)", "#0a0907"]}
                      style={styles.eventHomeGradient}
                    />

                    <View style={[
                      styles.eventHomeBadge,
                      isLive && { backgroundColor: "rgba(220, 38, 38, 0.35)", borderColor: "#ef4444" },
                      isSold && { backgroundColor: "rgba(201, 151, 66, 0.25)", borderColor: "#c99742" },
                    ]}>
                      <Text style={[
                        styles.eventHomeBadgeText,
                        isLive && { color: "#fca5a5" },
                      ]}>
                        {isSold ? "👑 SOLD ARCHIVE" : isLive ? "● LIVE AUCTION" : "UPCOMING"}
                      </Text>
                    </View>

                    <View style={styles.eventHomeInfo}>
                      <Text style={styles.eventHomeDate}>
                        LOT #{lot.lotNumber || lot._id.slice(-6).toUpperCase()} • {lot.category || "Fine Spirits"}
                      </Text>
                      <Text style={styles.eventHomeTitle} numberOfLines={1}>
                        {lot.title}
                      </Text>
                      <View style={styles.eventHomeFooter}>
                        <View style={{ flex: 1, paddingRight: 6 }}>
                          <Text style={{ color: "#8a7e72", fontSize: 9, textTransform: "uppercase", fontWeight: "700" }}>
                            {isSold ? "Hammer Price" : "Current Leading"}
                          </Text>
                          <Text style={styles.eventHomePrice} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                            R{formatPrice(displayPrice)}
                          </Text>
                        </View>
                        <View style={styles.bidNowPill}>
                          <Text style={styles.bidNowPillText}>{isSold ? "Recap →" : "Bid Now →"}</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

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
                initialNumToRender={4}
                maxToRenderPerBatch={4}
                windowSize={5}
                removeClippedSubviews={Platform.OS === 'android'}
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
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        style={{
          textDecorationLine: "line-through",
          color: "#aaa",
          fontSize: 16,
          marginRight: 8,
        }}
      >
        R{formatPrice(selectedProduct?.price)}
      </Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        style={{
          color: "#f5c242",
          fontWeight: "bold",
          fontSize: 18,
        }}
      >
        R{formatPrice(selectedProduct?.offer_price)}
      </Text>
    </>
  ) : (
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.8}
      style={{
        color: "#f5c242",
        fontWeight: "bold",
        fontSize: 18,
      }}
    >
      R{formatPrice(selectedProduct?.price)}
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
                <Text style={styles.buyNowModalItemPrice} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                  R{formatPrice(selectedProduct?.offer_active && Number(selectedProduct?.offer_price) > 0
                    ? selectedProduct?.offer_price
                    : (selectedProduct?.final_price || selectedProduct?.price || 0))}
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
    padding: 10,
    marginHorizontal: 6,
    width: 176,
    borderWidth: 1,
    borderColor: "#c99742",
  },
  oldPrice: {
    color: "#888",
    fontSize: 11,
    textDecorationLine: "line-through",
    marginTop: 1,
    includeFontPadding: false,
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
  productName: { color: "#fff", fontWeight: "600", fontSize: 13, minHeight: 34, textAlign: "center" },
  productSize: { color: "#aaa", fontSize: 11, marginBottom: 2, textAlign: "center" },
  cardPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  cardPriceContainer: {
    flex: 1,
    paddingRight: 4,
    justifyContent: "center",
  },
  productPrice: {
    color: "#f5c242",
    fontSize: 14,
    fontWeight: "800",
    includeFontPadding: false,
  },
  cardIconActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  cartIconOnlyBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "rgba(201, 151, 66, 0.15)",
    borderWidth: 1.2,
    borderColor: "rgba(245, 194, 66, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  cartIconOnlyImg: {
    width: 15,
    height: 15,
    tintColor: "#f5c242",
  },
  shopIconOnlyBtn: {
    width: 30,
    height: 30,
  },
  shopIconOnlyGradient: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
  },
  shopIconOnlyImg: {
    width: 15,
    height: 15,
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
  welcomeBannerTouch: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    marginBottom: 12,
  },
  welcomePillContainer: {
    backgroundColor: "rgba(201, 151, 66, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.45)",
    borderRadius: 22,
    paddingVertical: 8,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  welcomeText: {
    color: "#f5c242",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
    textAlign: "center",
    fontFamily: APP_FONT,
  },
  centeredSectionHeader: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
    marginBottom: 10,
    paddingHorizontal: 8,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  sectionAccentLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(201, 151, 66, 0.4)",
    marginHorizontal: 10,
  },
  centeredSectionTitle: {
    color: "#f0ece3",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    textAlign: "center",
    fontFamily: APP_FONT,
  },
  centeredViewAllTouch: {
    marginTop: 4,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  centeredViewAllText: {
    color: "#c99742",
    fontSize: 12.5,
    fontWeight: "600",
    letterSpacing: 0.5,
    textAlign: "center",
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

// Featured Events Carousel Styles
eventsSection: {
  marginVertical: 14,
},
eventHomeCard: {
  width: 260,
  height: 200,
  borderRadius: 14,
  marginRight: 14,
  backgroundColor: "#13100c",
  borderWidth: 1.2,
  borderColor: "rgba(201, 151, 66, 0.25)",
  overflow: "hidden",
  position: "relative",
  justifyContent: "flex-end",
},
eventHomeImage: {
  ...StyleSheet.absoluteFillObject,
},
eventHomeGradient: {
  ...StyleSheet.absoluteFillObject,
},
eventHomeBadge: {
  position: "absolute",
  top: 10,
  left: 10,
  backgroundColor: "rgba(201, 151, 66, 0.25)",
  borderWidth: 1,
  borderColor: "#c99742",
  paddingHorizontal: 8,
  paddingVertical: 3,
  borderRadius: 4,
},
eventHomeBadgeText: {
  color: "#f5c242",
  fontSize: 9,
  fontWeight: "800",
},
eventHomeInfo: {
  padding: 12,
},
eventHomeDate: {
  color: "#c2bab0",
  fontSize: 11,
  fontWeight: "600",
  marginBottom: 2,
},
eventHomeTitle: {
  color: "#ffffff",
  fontSize: 15,
  fontWeight: "800",
  marginBottom: 8,
},
eventHomeFooter: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},
eventHomePrice: {
  color: "#f5c242",
  fontSize: 13,
  fontWeight: "900",
},
eventHomeArrow: {
  color: "#ffffff",
  fontSize: 12,
  fontWeight: "800",
},
eventHomeBadgesRow: {
  position: "absolute",
  top: 10,
  left: 10,
  flexDirection: "row",
  gap: 6,
  zIndex: 5,
},
eventHomeCardClosed: {
  borderColor: "rgba(255, 255, 255, 0.1)",
},
eventHomeClosedBadge: {
  backgroundColor: "rgba(180, 40, 40, 0.9)",
  paddingHorizontal: 8,
  paddingVertical: 3,
  borderRadius: 6,
  borderWidth: 1,
  borderColor: "rgba(255, 90, 90, 0.4)",
},
eventHomeClosedBadgeText: {
  color: "#ffffff",
  fontSize: 9,
  fontWeight: "900",
  letterSpacing: 0.5,
},
eventHomeBookBtn: {
  backgroundColor: "rgba(212, 175, 55, 0.18)",
  borderWidth: 1,
  borderColor: "rgba(212, 175, 55, 0.5)",
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 6,
},
eventHomeBookBtnClosed: {
  backgroundColor: "rgba(255, 255, 255, 0.06)",
  borderColor: "rgba(255, 255, 255, 0.15)",
},
eventHomeArrowClosed: {
  color: "#888",
  fontSize: 11,
  fontWeight: "700",
},
bidNowPill: {
  backgroundColor: "rgba(212, 175, 55, 0.15)",
  borderWidth: 1,
  borderColor: "#d4af37",
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 6,
},
bidNowPillText: {
  color: "#ffd700",
  fontSize: 11,
  fontWeight: "800",
},

// Won Auction Alert Banner (matches web AuctionWinnerHomeAlert)
wonAlertBanner: {
  marginHorizontal: 12,
  marginTop: 10,
  marginBottom: 6,
  borderRadius: 12,
  borderWidth: 1.2,
  borderColor: "#d4af37",
  overflow: "hidden",
  padding: 12,
  flexDirection: "row",
  alignItems: "center",
  elevation: 6,
},
wonAlertGradient: {
  ...StyleSheet.absoluteFillObject,
},
wonAlertIconWrap: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: "rgba(212, 175, 55, 0.2)",
  borderWidth: 1,
  borderColor: "#ffd700",
  justifyContent: "center",
  alignItems: "center",
},
wonAlertTitle: {
  color: "#ffd700",
  fontSize: 12,
  fontWeight: "900",
  letterSpacing: 0.5,
},
wonAlertDesc: {
  color: "#e8dec8",
  fontSize: 12,
  fontWeight: "600",
  marginTop: 2,
},
wonAlertBtn: {
  backgroundColor: "#d4af37",
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 6,
  marginLeft: 8,
},
wonAlertBtnText: {
  color: "#080705",
  fontSize: 11,
  fontWeight: "800",
},


});

export default HomeScreen;
