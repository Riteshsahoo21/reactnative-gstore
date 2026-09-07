/* eslint-disable react-native/no-inline-styles */
/* eslint-disable quotes */
/* eslint-disable prettier/prettier */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
  ScrollView,
  Dimensions,
  DeviceEventEmitter,
  TextInput,
  StatusBar,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { API_BASE } from "../resources/data/Constants";
import { getCategoryIcon } from "../helpers/categoryIcons";

const { width } = Dimensions.get("window");
const cardWidth = (width - 40) / 2;

const IMAGE_BASE_URL = "https://ik.imagekit.io/thegrandstore/images/products/";

const CATEGORY_CHIPS = [
  "All",
  "Brandy",
  "Whisky",
  "Wine",
  "Champagne",
  "Cognac",
  "Tequila",
  "Beer",
  "Ciders",
  "Spirits",
  "Gin",
  "Vodka",
  "Rum",
  "Liqueur",
];

const SORT_OPTIONS = [
  { id: "featured", label: "Featured" },
  { id: "name_asc", label: "Name: A to Z" },
  { id: "price_asc", label: "Price: Low to High" },
  { id: "price_desc", label: "Price: High to Low" },
  { id: "newest", label: "Newest Arrivals" },
];

const PRICE_RANGES = [
  { id: "all", label: "All Prices", min: 0, max: Infinity },
  { id: "under_500", label: "Under R500", min: 0, max: 500 },
  { id: "500_1500", label: "R500 – R1,500", min: 500, max: 1500 },
  { id: "1500_5000", label: "R1,500 – R5,000", min: 1500, max: 5000 },
  { id: "above_5000", label: "R5,000+", min: 5000, max: Infinity },
];

const FILTER_TABS = [
  { id: "category", label: "Category" },
  { id: "price", label: "Price" },
  { id: "brand", label: "Brand" },
  { id: "country", label: "Country" },
  { id: "style", label: "Style" },
  { id: "size", label: "Size" },
];

const WINE_STYLES = {
  Red: ['Cabernet Sauvignon', 'Merlot', 'Pinot Noir', 'Shiraz / Syrah', 'Malbec', 'Tempranillo', 'Zinfandel', 'Rhone Blend', 'Grenache'],
  White: ['Chardonnay', 'Chenin Blanc', 'Sauvignon Blanc', 'Riesling', 'White Blend'],
  Sparkling: ['Cava', 'Prosecco', 'General Sparkling Wine', 'Champagne'],
  Rose: ['Rosé', 'Non-Alcoholic Rosé Wine'],
  Fortified: ['Port', 'Sherry', 'Madeira', 'Vermouth', 'Late Harvest Wine', 'Ice Wine', 'Sauternes', 'Moscato']
};

const showMessage = (msg) => {
  if (Platform.OS === "android") {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    Alert.alert("", msg);
  }
};

const Shop = ({ navigation, onBack, route }) => {
  const params = route?.params || {};
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Category & Filter states (mirroring web ShopPage.jsx)
  const [selectedCategory, setSelectedCategory] = useState(
    params.category_title || "All"
  );
  const [selectedBrand, setSelectedBrand] = useState("All");
  const [selectedCountry, setSelectedCountry] = useState("All");
  const [selectedSubcategory, setSelectedSubcategory] = useState("All");
  const [selectedSize, setSelectedSize] = useState("All");
  const [selectedPriceRange, setSelectedPriceRange] = useState("all");
  const [minPriceInput, setMinPriceInput] = useState("");
  const [maxPriceInput, setMaxPriceInput] = useState("");
  const [onlyOffers, setOnlyOffers] = useState(false);

  // Sorting state (default to name_asc to match user's screenshot)
  const [sortBy, setSortBy] = useState("name_asc");

  // Filter modal search query
  const [filterSearchQuery, setFilterSearchQuery] = useState("");

  // Modals
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [isSortModalVisible, setIsSortModalVisible] = useState(false);
  const [isCartModalVisible, setIsCartModalVisible] = useState(false);
  const [isCheckoutConfirmModalVisible, setIsCheckoutConfirmModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeFilterTab, setActiveFilterTab] = useState("category");

  // Cart & Wishlist storage states
  const [cartItems, setCartItems] = useState(new Set());
  const [wishlistIds, setWishlistIds] = useState(new Set());

  const getImageUrl = (imagePath) => {
    if (!imagePath) return "";
    return imagePath.startsWith("http")
      ? imagePath
      : `${IMAGE_BASE_URL}${imagePath}`;
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const candidates = [
        `${API_BASE}/products`,
        "http://localhost:5000/api/products",
        "http://192.168.1.9:5000/api/products",
        "http://10.0.2.2:5000/api/products",
      ];
      const uniqueUrls = [...new Set(candidates)];
      let rawData = [];
      for (const url of uniqueUrls) {
        try {
          const res = await axios.get(url, { timeout: 4000 });
          if (res?.data && Array.isArray(res.data)) {
            rawData = res.data;
            break;
          } else if (res?.data?.data && Array.isArray(res.data.data)) {
            rawData = res.data.data;
            break;
          }
        } catch (e) {}
      }

      const normalized = rawData
        .filter((p) => p.type !== "accessory" && p.category !== "accessory")
        .map((p) => {
          const imgUrl =
            (Array.isArray(p.images) && p.images[0]) || p.image || "";
          const origPrice = Number(p.price) || 0;
          const offPrice = Number(p.offer_price) || 0;
          const hasDiscount = offPrice > 0 && offPrice < origPrice;
          const finalPrice = hasDiscount ? offPrice : origPrice;

          return {
            ...p,
            id: p.id || p._id,
            productid: p.id || p._id,
            name: p.name || p.title || "Luxury Bottle",
            image: imgUrl,
            price: origPrice,
            final_price: finalPrice,
            offer_price: offPrice || origPrice,
            offer_active: hasDiscount,
            size:
              p.size ||
              p.identity?.bottleSize ||
              (Array.isArray(p.options) && p.options[0]) ||
              "750ml",
            category: p.category || p.type || "Spirits",
            subcategory: p.subcategory || p.identity?.style || "",
            brand: p.brand || "",
            country: p.country || p.identity?.origin || "",
          };
        });

      setProducts(normalized);
    } catch (err) {
      console.error("Error fetching shop products:", err?.message || err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWishlist = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem("grand-store-wishlist");
      const list = stored ? JSON.parse(stored) : [];
      if (Array.isArray(list)) {
        setWishlistIds(new Set(list));
      }
    } catch (e) {}
  }, []);

  const fetchCart = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem("grand-store-cart");
      const cart = stored ? JSON.parse(stored) : [];
      setCartItems(new Set(cart.map((i) => i.id || i.productid)));
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchWishlist();
    fetchCart();

    const wishSub = DeviceEventEmitter.addListener(
      "wishlistUpdated",
      () => fetchWishlist()
    );
    return () => wishSub.remove();
  }, [fetchProducts, fetchWishlist, fetchCart]);

  // Wishlist toggle with optimistic UI and notification
  const toggleWishlist = async (product) => {
    try {
      const prodId = product.id || product.productid;
      if (!prodId) return;

      const updated = new Set(wishlistIds);
      if (updated.has(prodId)) {
        updated.delete(prodId);
        showMessage("Removed from Wishlist");
      } else {
        updated.add(prodId);
        showMessage("Added to Wishlist");
      }
      setWishlistIds(updated);
      await AsyncStorage.setItem(
        "grand-store-wishlist",
        JSON.stringify([...updated])
      );
      DeviceEventEmitter.emit("wishlistUpdated", updated.size);
    } catch (e) {
      showMessage("Error updating wishlist");
    }
  };

  // Cart Add
  const handleAddToCart = async (product) => {
    try {
      const pid = product.productid || product.id;
      const stored = await AsyncStorage.getItem("grand-store-cart");
      let cart = stored ? JSON.parse(stored) : [];
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

      await AsyncStorage.setItem("grand-store-cart", JSON.stringify(cart));
      setCartItems(new Set(cart.map((i) => i.id || i.productid)));
      setSelectedProduct(product);
      setIsCartModalVisible(true);
      showMessage("Added to bag 🛍️");
    } catch (e) {
      showMessage("Could not add to bag");
    }
  };

  // Web-like Cascading Filter Options
  // 1. Available Countries (dynamically filtered by selected Category)
  const productsForCountries = useMemo(() => {
    if (selectedCategory === "All") return products;
    const catLower = selectedCategory.toLowerCase();
    return products.filter((p) => {
      const c = String(p.category || p.type || "").toLowerCase();
      return c.includes(catLower);
    });
  }, [products, selectedCategory]);

  const availableCountries = useMemo(() => {
    const counts = {};
    productsForCountries.forEach((p) => {
      const c = (p.country || p.origin || "").trim();
      if (c) counts[c] = (counts[c] || 0) + 1;
    });
    const sorted = Object.keys(counts).sort((a, b) => a.localeCompare(b));
    return [
      { id: "All", label: "All Countries", count: productsForCountries.length },
      ...sorted.map((name) => ({ id: name, label: name, count: counts[name] })),
    ];
  }, [productsForCountries]);

  // 2. Available Subcategories / Styles (filtered by Category & Country)
  const productsForSubcategories = useMemo(() => {
    let pool = productsForCountries;
    if (selectedCountry !== "All") {
      pool = pool.filter(
        (p) => String(p.country || "").toLowerCase() === selectedCountry.toLowerCase()
      );
    }
    return pool;
  }, [productsForCountries, selectedCountry]);

  const availableSubcategories = useMemo(() => {
    const counts = {};
    productsForSubcategories.forEach((p) => {
      const s = (p.subcategory || "").trim();
      if (s) counts[s] = (counts[s] || 0) + 1;
    });
    const sorted = Object.keys(counts).sort((a, b) => a.localeCompare(b));
    return [
      { id: "All", label: "All Styles", count: productsForSubcategories.length },
      ...sorted.map((name) => ({ id: name, label: name, count: counts[name] })),
    ];
  }, [productsForSubcategories]);

  // 3. Available Brands (filtered by Category, Country, and Subcategory)
  const productsForBrands = useMemo(() => {
    let pool = productsForSubcategories;
    if (selectedSubcategory !== "All") {
      pool = pool.filter(
        (p) =>
          String(p.subcategory || "").toLowerCase() ===
          selectedSubcategory.toLowerCase()
      );
    }
    return pool;
  }, [productsForSubcategories, selectedSubcategory]);

  const availableBrands = useMemo(() => {
    const counts = {};
    productsForBrands.forEach((p) => {
      const b = (p.brand || "").trim();
      if (b) counts[b] = (counts[b] || 0) + 1;
    });
    const sorted = Object.keys(counts).sort((a, b) => a.localeCompare(b));
    return [
      { id: "All", label: "All Brands", count: productsForBrands.length },
      ...sorted.map((name) => ({ id: name, label: name, count: counts[name] })),
    ];
  }, [productsForBrands]);

  // 4. Available Bottle Sizes
  const availableSizes = useMemo(() => {
    const counts = {};
    products.forEach((p) => {
      const sz = (p.size || "").trim();
      if (sz) counts[sz] = (counts[sz] || 0) + 1;
    });
    const sorted = Object.keys(counts).sort((a, b) => a.localeCompare(b));
    return [
      { id: "All", label: "All Sizes", count: products.length },
      ...sorted.map((name) => ({ id: name, label: name, count: counts[name] })),
    ];
  }, [products]);

  // 5. Category counts for rich filter cards
  const categoryCounts = useMemo(() => {
    const counts = {};
    products.forEach((p) => {
      const c = (p.category || "").trim();
      if (c) {
        const matched = CATEGORY_CHIPS.find(
          (chip) => chip.toLowerCase() === c.toLowerCase()
        );
        const key = matched || c;
        counts[key] = (counts[key] || 0) + 1;
      }
    });
    return counts;
  }, [products]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== "All") count++;
    if (selectedBrand !== "All") count++;
    if (selectedCountry !== "All") count++;
    if (selectedSubcategory !== "All") count++;
    if (selectedSize !== "All") count++;
    if (selectedPriceRange !== "all" || minPriceInput || maxPriceInput) count++;
    if (onlyOffers) count++;
    return count;
  }, [
    selectedCategory,
    selectedBrand,
    selectedCountry,
    selectedSubcategory,
    selectedSize,
    selectedPriceRange,
    minPriceInput,
    maxPriceInput,
    onlyOffers,
  ]);

  const resetAllFilters = () => {
    setSelectedCategory("All");
    setSelectedBrand("All");
    setSelectedCountry("All");
    setSelectedSubcategory("All");
    setSelectedSize("All");
    setSelectedPriceRange("all");
    setMinPriceInput("");
    setMaxPriceInput("");
    setOnlyOffers(false);
    setSearchQuery("");
    setFilterSearchQuery("");
  };

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (p) =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q)) ||
          (p.brand && p.brand.toLowerCase().includes(q)) ||
          (p.subcategory && p.subcategory.toLowerCase().includes(q)) ||
          (p.country && p.country.toLowerCase().includes(q))
      );
    }

    // 2. Category
    if (selectedCategory !== "All") {
      const target = selectedCategory.toLowerCase();
      result = result.filter((p) => {
        const c = String(p.category || p.type || "").toLowerCase();
        return c.includes(target);
      });
    }

    // 3. Brand
    if (selectedBrand !== "All") {
      result = result.filter(
        (p) => String(p.brand || "").toLowerCase() === selectedBrand.toLowerCase()
      );
    }

    // 4. Country / Origin
    if (selectedCountry !== "All") {
      result = result.filter(
        (p) =>
          String(p.country || "").toLowerCase() ===
          selectedCountry.toLowerCase()
      );
    }

    // 5. Subcategory / Style
    if (selectedSubcategory !== "All") {
      result = result.filter(
        (p) =>
          String(p.subcategory || "").toLowerCase() ===
          selectedSubcategory.toLowerCase()
      );
    }

    // 6. Bottle Size
    if (selectedSize !== "All") {
      result = result.filter(
        (p) => String(p.size || "").toLowerCase() === selectedSize.toLowerCase()
      );
    }

    // 7. Price Filter (Ranges or Custom Inputs)
    if (minPriceInput || maxPriceInput) {
      const minP = minPriceInput ? Number(minPriceInput) : 0;
      const maxP = maxPriceInput ? Number(maxPriceInput) : Infinity;
      result = result.filter((p) => {
        const pr = Number(p.final_price || p.price || 0);
        return pr >= minP && pr <= maxP;
      });
    } else if (selectedPriceRange !== "all") {
      const config = PRICE_RANGES.find((r) => r.id === selectedPriceRange);
      if (config) {
        result = result.filter((p) => {
          const pr = Number(p.final_price || p.price || 0);
          return pr >= config.min && pr <= config.max;
        });
      }
    }

    // 8. Special Offers Only
    if (onlyOffers) {
      result = result.filter(
        (p) => p.offer_active || (p.final_price && p.final_price < p.price)
      );
    }

    // 9. Sorting
    result.sort((a, b) => {
      const priceA = Number(a.final_price || a.price || 0);
      const priceB = Number(b.final_price || b.price || 0);
      if (sortBy === "price_asc") return priceA - priceB;
      if (sortBy === "price_desc") return priceB - priceA;
      if (sortBy === "name_asc") return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "newest") {
        return (
          (Date.parse(b.createdAt || "") || 0) -
          (Date.parse(a.createdAt || "") || 0)
        );
      }
      return 0; // featured
    });

    return result;
  }, [
    products,
    searchQuery,
    selectedCategory,
    selectedBrand,
    selectedCountry,
    selectedSubcategory,
    selectedSize,
    selectedPriceRange,
    minPriceInput,
    maxPriceInput,
    onlyOffers,
    sortBy,
  ]);

  // Animated heart button inside the top-right of bottle pedestal
  const AnimatedHeartButton = React.memo(({ isWishlisted, onPress }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePress = (event) => {
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
            style={[
              styles.wishlistImg,
              { tintColor: isWishlisted ? "#f5c242" : "#ffffff" },
            ]}
          />
        </Animated.View>
      </TouchableOpacity>
    );
  });

  // Render 2-column product card matching user's screenshot exactly
  const renderProductItem = ({ item }) => {
    const isWishlisted = wishlistIds.has(item.id || item.productid);
    const hasDiscount =
      item.final_price && Number(item.final_price) < Number(item.price);

    return (
      <View style={styles.cardWrapper}>
        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.card}
          onPress={() =>
            navigation.navigate("ProductDetails", {
              product: item,
              category: { name: item.category },
            })
          }
        >
          {/* Golden Halo Box enclosing Bottle and Wishlist Heart */}
          <View style={styles.bottleBox}>
            <AnimatedHeartButton
              isWishlisted={isWishlisted}
              onPress={() => toggleWishlist(item)}
            />

            {getImageUrl(item.image) ? (
              <Image
                source={{ uri: getImageUrl(item.image) }}
                style={styles.productImage}
                resizeMode="contain"
              />
            ) : null}
          </View>

          {/* Clean details outside box */}
          <View style={styles.cardInfo}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.productSize} numberOfLines={1}>
              {item.size || "750ml"}
            </Text>

            {/* Bottom Row: Price + Add to Cart & Checkout Action Buttons */}
            <View style={styles.priceRow}>
              <View style={{ flex: 1, marginRight: 6 }}>
                <Text style={styles.productPrice}>
                  R{Number(item.final_price).toFixed(2)}
                </Text>
                {hasDiscount && (
                  <Text style={styles.oldPrice}>
                    R{Number(item.price).toFixed(2)}
                  </Text>
                )}
              </View>

              <View style={styles.cardIconActions}>
                {/* 1. Add to Cart Button */}
                <TouchableOpacity
                  style={styles.cartIconOnlyBtn}
                  activeOpacity={0.7}
                  onPress={() => handleAddToCart(item)}
                >
                  <Image
                    source={require("../resources/images/shopping-cart.png")}
                    style={styles.cartIconOnlyImg}
                    resizeMode="contain"
                  />
                </TouchableOpacity>

                {/* 2. Instant Checkout Button (Opens Checkout Confirmation Popup) */}
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
        </TouchableOpacity>
      </View>
    );
  };

  const headerTitle =
    selectedCategory !== "All" ? selectedCategory : "Shop Collection";

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#c99742" barStyle="dark-content" />

      {/* Luxury Gold Header with Back Arrow and Category Title */}
      <View style={styles.goldHeader}>
        <TouchableOpacity
          style={styles.backTouch}
          onPress={() => {
            if (onBack) {
              onBack();
            } else if (navigation?.canGoBack && navigation.canGoBack()) {
              navigation.goBack();
            } else if (navigation?.navigate) {
              navigation.navigate("Home");
            }
          }}
          activeOpacity={0.7}
        >
          <Image
            source={require("../resources/images/back_icon.png")}
            style={styles.backArrowIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>

        <Text style={styles.headerTitleText} numberOfLines={1}>
          {headerTitle}
        </Text>
      </View>

      {/* Real-time Search Input */}
      <View style={styles.searchContainer}>
        <Image
          source={require("../resources/assets/discover.png")}
          style={styles.searchIcon}
          resizeMode="contain"
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search bottles, brands, styles..."
          placeholderTextColor="#777777"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Text style={{ color: "#777777", fontSize: 16, paddingHorizontal: 6 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Horizontal Category Chips */}
      <View style={styles.chipsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContent}
        >
          {CATEGORY_CHIPS.map((cat) => {
            const isActive =
              selectedCategory.toLowerCase() === cat.toLowerCase();
            return (
              <TouchableOpacity
                key={cat}
                activeOpacity={0.8}
                onPress={() => setSelectedCategory(cat)}
                style={[styles.chip, isActive && styles.chipActive]}
              >
                <Text style={isActive ? styles.chipTextActive : styles.chipText}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Controls Bar: Bottle Count + Sort & Filter Buttons */}
      <View style={styles.controlsBar}>
        <Text style={styles.countText}>
          {filteredProducts.length}{" "}
          {filteredProducts.length === 1 ? "Bottle" : "Bottles"}
        </Text>

        <View style={styles.controlsRight}>
          {/* Sort Button */}
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => setIsSortModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.filterBtnText}>
              Sort:{" "}
              {SORT_OPTIONS.find((s) => s.id === sortBy)?.label.split(":")[0]}
            </Text>
          </TouchableOpacity>

          {/* Filters Button with Active Indicator */}
          <TouchableOpacity
            style={[
              styles.filterBtn,
              activeFilterCount > 0 && styles.filterBtnHighlighted,
            ]}
            onPress={() => setIsFilterModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterBtnText,
                activeFilterCount > 0 && { color: "#c99742" },
              ]}
            >
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Product Grid */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color="#c99742"
          style={{ marginTop: 60 }}
        />
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProductItem}
          keyExtractor={(item, idx) =>
            (item.id || item.productid || idx).toString()
          }
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={5}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={Platform.OS === 'android'}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No Bottles Found</Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your search query or removing active filters.
              </Text>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={resetAllFilters}
              >
                <Text style={styles.resetBtnText}>Reset All Filters</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* === Comprehensive Web-Style Filters Modal === */}
      <Modal
        visible={isFilterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.modalBackdropDismiss}
            activeOpacity={1}
            onPress={() => setIsFilterModalVisible(false)}
          />
          <View style={styles.filterModalCard}>
            {/* Top Grab Handle */}
            <View style={styles.modalHandleWrap}>
              <View style={styles.modalHandleBar} />
            </View>

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={styles.modalHeading}>FILTERS</Text>
                {activeFilterCount > 0 && (
                  <View style={styles.activeCountBadge}>
                    <Text style={styles.activeCountBadgeText}>
                      {activeFilterCount} Active
                    </Text>
                  </View>
                )}
              </View>

              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {activeFilterCount > 0 && (
                  <TouchableOpacity
                    onPress={resetAllFilters}
                    style={{ marginRight: 15 }}
                  >
                    <Text style={styles.clearAllText}>Clear all</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setIsFilterModalVisible(false)}
                  style={styles.closeBtnCircle}
                >
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Filter Group Segment Tabs */}
            <View style={styles.filterTabsRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {FILTER_TABS.map((tab) => {
                  const isSelected = activeFilterTab === tab.id;
                  let hasValue = false;
                  if (tab.id === "category" && selectedCategory !== "All") hasValue = true;
                  if (tab.id === "price" && (selectedPriceRange !== "all" || minPriceInput || maxPriceInput)) hasValue = true;
                  if (tab.id === "brand" && selectedBrand !== "All") hasValue = true;
                  if (tab.id === "country" && selectedCountry !== "All") hasValue = true;
                  if (tab.id === "style" && selectedSubcategory !== "All") hasValue = true;
                  if (tab.id === "size" && selectedSize !== "All") hasValue = true;

                  return (
                    <TouchableOpacity
                      key={tab.id}
                      onPress={() => setActiveFilterTab(tab.id)}
                      style={[
                        styles.filterSubTab,
                        isSelected && styles.filterSubTabSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterSubTabText,
                          isSelected && styles.filterSubTabTextSelected,
                        ]}
                      >
                        {tab.label}
                        {hasValue ? " •" : ""}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Search within active filter options */}
            <View style={styles.modalSearchRow}>
              <Text style={styles.modalSearchIcon}>🔍</Text>
              <TextInput
                style={styles.modalSearchInput}
                placeholder={
                  activeFilterTab === "brand"
                    ? "Search brands (e.g. Aberlour, 1800)..."
                    : activeFilterTab === "country"
                    ? "Search countries (e.g. Mexico, France)..."
                    : activeFilterTab === "style"
                    ? "Search styles (e.g. Añejo, Single Malt)..."
                    : activeFilterTab === "category"
                    ? "Search categories (e.g. Tequila, Wine)..."
                    : activeFilterTab === "size"
                    ? "Search sizes (e.g. 750ml, 1L)..."
                    : "Search filter options..."
                }
                placeholderTextColor="#777777"
                value={filterSearchQuery}
                onChangeText={setFilterSearchQuery}
              />
              {filterSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setFilterSearchQuery("")}>
                  <Text style={{ color: "#777777", fontSize: 13, paddingHorizontal: 6 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Tab Body Contents */}
            <ScrollView
              style={styles.modalTabScrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 8, paddingBottom: 24 }}
            >
              {/* Category Tab */}
              {activeFilterTab === "category" && (
                <View style={styles.categoryGrid}>
                  {CATEGORY_CHIPS.filter((c) =>
                    !filterSearchQuery ||
                    c.toLowerCase().includes(filterSearchQuery.trim().toLowerCase())
                  ).map((cat) => {
                    const isSelected =
                      selectedCategory.toLowerCase() === cat.toLowerCase();
                    const count = cat === "All" ? products.length : (categoryCounts[cat] || 0);
                    const iconSource = cat === "All"
                      ? require("../resources/assets/category_icon.png")
                      : getCategoryIcon(cat);

                    return (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => setSelectedCategory(cat)}
                        style={[
                          styles.categoryFilterCard,
                          isSelected && styles.categoryFilterCardSelected,
                        ]}
                        activeOpacity={0.75}
                      >
                        <LinearGradient
                          colors={
                            isSelected
                              ? ["#332717", "#201810", "#130f0a"]
                              : ["#211b15", "#15120e", "#0e0c09"]
                          }
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.categoryCardGradient}
                        >
                          <View
                            style={[
                              styles.categoryIconCircle,
                              isSelected && styles.categoryIconCircleSelected,
                            ]}
                          >
                            <Image
                              source={iconSource}
                              style={styles.categoryCardIcon}
                              resizeMode="contain"
                            />
                          </View>

                          <View style={styles.categoryCardContent}>
                            <Text
                              style={[
                                styles.categoryCardTitle,
                                isSelected && styles.categoryCardTitleSelected,
                              ]}
                              numberOfLines={1}
                            >
                              {cat}
                            </Text>
                            <Text
                              style={[
                                styles.categoryCardCount,
                                isSelected && styles.categoryCardCountSelected,
                              ]}
                            >
                              {count} {count === 1 ? "bottle" : "bottles"}
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.categoryCheckBadge,
                              isSelected && styles.categoryCheckBadgeSelected,
                            ]}
                          >
                            <Text
                              style={[
                                styles.categoryCheckText,
                                isSelected && styles.categoryCheckTextSelected,
                              ]}
                            >
                              {isSelected ? "✓" : ""}
                            </Text>
                          </View>
                        </LinearGradient>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Price Range Tab */}
              {activeFilterTab === "price" && (
                <View>
                  <Text style={styles.filterSectionTitle}>Quick Ranges</Text>
                  <View style={styles.optionsWrap}>
                    {PRICE_RANGES.filter((r) =>
                      !filterSearchQuery ||
                      r.label.toLowerCase().includes(filterSearchQuery.trim().toLowerCase())
                    ).map((range) => {
                      const isSelected =
                        selectedPriceRange === range.id &&
                        !minPriceInput &&
                        !maxPriceInput;
                      return (
                        <TouchableOpacity
                          key={range.id}
                          onPress={() => {
                            setSelectedPriceRange(range.id);
                            setMinPriceInput("");
                            setMaxPriceInput("");
                          }}
                          style={[
                            styles.optionPill,
                            isSelected && styles.optionPillSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.optionPillText,
                              isSelected && styles.optionPillTextSelected,
                            ]}
                          >
                            {range.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={[styles.filterSectionTitle, { marginTop: 16 }]}>
                    Custom Price Range (ZAR)
                  </Text>
                  <View style={styles.priceInputsRow}>
                    <TextInput
                      style={styles.priceInput}
                      placeholder="Min R"
                      placeholderTextColor="#777"
                      keyboardType="numeric"
                      value={minPriceInput}
                      onChangeText={(t) => {
                        setMinPriceInput(t);
                        setSelectedPriceRange("all");
                      }}
                    />
                    <Text style={{ color: "#777", marginHorizontal: 8 }}>—</Text>
                    <TextInput
                      style={styles.priceInput}
                      placeholder="Max R"
                      placeholderTextColor="#777"
                      keyboardType="numeric"
                      value={maxPriceInput}
                      onChangeText={(t) => {
                        setMaxPriceInput(t);
                        setSelectedPriceRange("all");
                      }}
                    />
                  </View>
                </View>
              )}

              {/* Brand Tab */}
              {activeFilterTab === "brand" && (
                <View style={styles.optionsWrap}>
                  {availableBrands.filter((b) =>
                    !filterSearchQuery ||
                    b.label.toLowerCase().includes(filterSearchQuery.trim().toLowerCase())
                  ).map((b) => {
                    const isSelected =
                      selectedBrand.toLowerCase() === b.id.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={b.id}
                        onPress={() => setSelectedBrand(b.id)}
                        style={[
                          styles.optionPill,
                          isSelected && styles.optionPillSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionPillText,
                            isSelected && styles.optionPillTextSelected,
                          ]}
                        >
                          {b.label} ({b.count})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Country / Origin Tab */}
              {activeFilterTab === "country" && (
                <View style={styles.optionsWrap}>
                  {availableCountries.filter((c) =>
                    !filterSearchQuery ||
                    c.label.toLowerCase().includes(filterSearchQuery.trim().toLowerCase())
                  ).map((c) => {
                    const isSelected =
                      selectedCountry.toLowerCase() === c.id.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={c.id}
                        onPress={() => setSelectedCountry(c.id)}
                        style={[
                          styles.optionPill,
                          isSelected && styles.optionPillSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionPillText,
                            isSelected && styles.optionPillTextSelected,
                          ]}
                        >
                          {c.label} ({c.count})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Style / Subcategory Tab */}
              {activeFilterTab === "style" && (
                <View style={styles.optionsWrap}>
                  {availableSubcategories.filter((s) =>
                    !filterSearchQuery ||
                    s.label.toLowerCase().includes(filterSearchQuery.trim().toLowerCase())
                  ).map((s) => {
                    const isSelected =
                      selectedSubcategory.toLowerCase() === s.id.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={s.id}
                        onPress={() => setSelectedSubcategory(s.id)}
                        style={[
                          styles.optionPill,
                          isSelected && styles.optionPillSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionPillText,
                            isSelected && styles.optionPillTextSelected,
                          ]}
                        >
                          {s.label} ({s.count})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Bottle Size Tab */}
              {activeFilterTab === "size" && (
                <View style={styles.optionsWrap}>
                  {availableSizes.filter((sz) =>
                    !filterSearchQuery ||
                    sz.label.toLowerCase().includes(filterSearchQuery.trim().toLowerCase())
                  ).map((sz) => {
                    const isSelected =
                      selectedSize.toLowerCase() === sz.id.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={sz.id}
                        onPress={() => setSelectedSize(sz.id)}
                        style={[
                          styles.optionPill,
                          isSelected && styles.optionPillSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionPillText,
                            isSelected && styles.optionPillTextSelected,
                          ]}
                        >
                          {sz.label} ({sz.count})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Special Offers Toggle */}
              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setOnlyOffers(!onlyOffers)}
                activeOpacity={0.8}
              >
                <View>
                  <Text style={styles.toggleText}>
                    Special Offers & Vault Discounts
                  </Text>
                  <Text style={styles.toggleSub}>
                    Show only bottles with marked-down pricing
                  </Text>
                </View>
                <View
                  style={[
                    styles.checkbox,
                    onlyOffers && styles.checkboxActive,
                  ]}
                >
                  {onlyOffers ? <Text style={styles.checkMark}>✓</Text> : null}
                </View>
              </TouchableOpacity>
            </ScrollView>

            {/* Modal Bottom Action Row */}
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={resetAllFilters}
              >
                <Text style={styles.clearBtnText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => setIsFilterModalVisible(false)}
              >
                <LinearGradient
                  colors={["#f0c768", "#c99742"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.applyBtnGradient}
                >
                  <Text style={styles.applyBtnText}>
                    Show {filteredProducts.length} Bottles
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* === Sort Modal === */}
      <Modal
        visible={isSortModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSortModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.sortModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeading}>Sort Collection</Text>
              <TouchableOpacity onPress={() => setIsSortModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 10 }}>
              {SORT_OPTIONS.map((opt) => {
                const isSelected = sortBy === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.sortOptionRow,
                      isSelected && styles.sortOptionRowSelected,
                    ]}
                    onPress={() => {
                      setSortBy(opt.id);
                      setIsSortModalVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.sortOptionText,
                        isSelected && styles.sortOptionTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {isSelected && <Text style={styles.sortCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* Quick Add To Cart Feedback Modal */}
      {selectedProduct && (
        <Modal
          visible={isCartModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsCartModalVisible(false)}
        >
          <View style={styles.modalBackdropCenter}>
            <View style={styles.cartPopupCard}>
              <Image
                source={{ uri: getImageUrl(selectedProduct.image) }}
                style={styles.cartPopupImage}
                resizeMode="contain"
              />
              <Text style={styles.cartPopupTitle} numberOfLines={2}>
                {selectedProduct.name}
              </Text>
              <Text style={styles.cartPopupPrice}>
                R{Number(selectedProduct.final_price || selectedProduct.price).toFixed(2)}
              </Text>
              <Text style={styles.cartPopupMsg}>Added to your shopping bag!</Text>

              <View style={styles.cartPopupActions}>
                <TouchableOpacity
                  style={styles.cartContinueBtn}
                  onPress={() => setIsCartModalVisible(false)}
                >
                  <Text style={styles.cartContinueText}>Continue Shopping</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cartViewBagBtn}
                  onPress={() => {
                    setIsCartModalVisible(false);
                    navigation.navigate("Cart");
                  }}
                >
                  <Text style={styles.cartViewBagText}>View Bag</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ⚡ Instant Checkout Confirmation Modal ⚡ */}
      <Modal
        visible={isCheckoutConfirmModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCheckoutConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlayCenter}>
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
                  R{Number(selectedProduct?.final_price || selectedProduct?.price || 0).toFixed(2)}
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
                  const price = Number(selectedProduct?.final_price || selectedProduct?.price || 0);

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#080808",
  },
  // Luxury Gold Header
  goldHeader: {
    backgroundColor: "#c99742",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: Platform.OS === "android" ? 58 : 62,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  backTouch: {
    paddingVertical: 8,
    paddingRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  backArrowIcon: {
    width: 24,
    height: 20,
    tintColor: "#000000",
  },
  headerTitleText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000000",
    letterSpacing: 0.3,
  },

  // Search Container matching screenshot
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161616",
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: "rgba(201, 151, 66, 0.3)",
    marginHorizontal: 16,
    marginTop: 14,
    height: 48,
    paddingHorizontal: 14,
  },
  searchIcon: {
    width: 18,
    height: 18,
    tintColor: "#777777",
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: "#ffffff",
    fontSize: 15,
    paddingVertical: 0,
  },

  // Horizontal Category Chips
  chipsContainer: {
    marginTop: 14,
  },
  chipsContent: {
    paddingHorizontal: 16,
  },
  chip: {
    backgroundColor: "#181818",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#2c2c2c",
    paddingHorizontal: 18,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  chipActive: {
    backgroundColor: "#cca152",
    borderColor: "#cca152",
  },
  chipText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "700",
  },

  // Subheader Controls Bar
  controlsBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  countText: {
    color: "#cca152",
    fontSize: 15,
    fontWeight: "700",
  },
  controlsRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  filterBtn: {
    backgroundColor: "#181818",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2c2c2c",
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginLeft: 8,
  },
  filterBtnHighlighted: {
    borderColor: "#cca152",
    backgroundColor: "rgba(201, 151, 66, 0.12)",
  },
  filterBtnText: {
    color: "#e0e0e0",
    fontSize: 13,
    fontWeight: "600",
  },

  // Product Grid List
  listContainer: {
    paddingHorizontal: 14,
    paddingBottom: 95,
    paddingTop: 8,
  },
  columnWrapper: {
    justifyContent: "space-between",
  },
  cardWrapper: {
    width: cardWidth,
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#14120f",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#cca152",
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
  },

  // The Bottle Showcase area inside the card
  bottleBox: {
    height: 174,
    backgroundColor: "#080705",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(201, 151, 66, 0.25)",
  },
  wishlistIcon: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 10,
    backgroundColor: "rgba(18, 15, 12, 0.75)",
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  wishlistIconActive: {
    backgroundColor: "rgba(201, 151, 66, 0.3)",
    borderColor: "#f5c242",
  },
  wishlistImg: {
    width: 16,
    height: 16,
  },
  productImage: {
    width: "82%",
    height: 150,
  },

  // Card Text Details inside the card boundary
  cardInfo: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: "#14120f",
  },
  productName: {
    color: "#ffffff",
    fontSize: 13.5,
    fontWeight: "700",
    lineHeight: 18,
    minHeight: 36,
  },
  productSize: {
    color: "#a09585",
    fontSize: 12,
    marginTop: 3,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  productPrice: {
    color: "#f5c242",
    fontSize: 16,
    fontWeight: "800",
  },
  oldPrice: {
    color: "#777777",
    fontSize: 11,
    textDecorationLine: "line-through",
    marginTop: 1,
  },
  cardIconActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cartIconOnlyBtn: {
    width: 32,
    height: 32,
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
    width: 32,
    height: 32,
  },
  shopIconOnlyGradient: {
    width: 32,
    height: 32,
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
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.78)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  buyNowModalCard: {
    width: "92%",
    backgroundColor: "#16130f",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#c99742",
    padding: 20,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
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

  // Empty View
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: "#c99742",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptySubtitle: {
    color: "#777",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  resetBtn: {
    backgroundColor: "#1c1914",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#c99742",
  },
  resetBtnText: {
    color: "#c99742",
    fontSize: 13,
    fontWeight: "700",
  },

  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  modalBackdropDismiss: {
    flex: 1,
  },
  filterModalCard: {
    backgroundColor: "#14110d",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 34 : 18,
    borderWidth: 1.2,
    borderBottomWidth: 0,
    borderColor: "rgba(201, 151, 66, 0.4)",
    height: "92%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 20,
  },
  modalHandleWrap: {
    alignItems: "center",
    paddingVertical: 6,
    marginBottom: 6,
  },
  modalHandleBar: {
    width: 44,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: "rgba(201, 151, 66, 0.5)",
  },
  modalTabScrollView: {
    flex: 1,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  categoryFilterCard: {
    width: "48.5%",
    marginBottom: 10,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1.2,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  categoryFilterCardSelected: {
    borderColor: "#c99742",
    shadowColor: "#c99742",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  categoryCardGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  categoryIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  categoryIconCircleSelected: {
    backgroundColor: "rgba(201, 151, 66, 0.22)",
    borderColor: "rgba(201, 151, 66, 0.6)",
  },
  categoryCardIcon: {
    width: 22,
    height: 22,
  },
  categoryCardContent: {
    flex: 1,
  },
  categoryCardTitle: {
    color: "#e8e5df",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  categoryCardTitleSelected: {
    color: "#f5c242",
    fontWeight: "800",
  },
  categoryCardCount: {
    color: "#888",
    fontSize: 10,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  categoryCardCountSelected: {
    color: "#d4af37",
    fontWeight: "600",
  },
  categoryCheckBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },
  categoryCheckBadgeSelected: {
    backgroundColor: "#c99742",
    borderColor: "#c99742",
  },
  categoryCheckText: {
    color: "transparent",
    fontSize: 10,
    fontWeight: "800",
  },
  categoryCheckTextSelected: {
    color: "#0a0a0a",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalHeading: {
    fontSize: 17,
    fontWeight: "800",
    color: "#f5c242",
    letterSpacing: 1,
  },
  activeCountBadge: {
    backgroundColor: "rgba(201, 151, 66, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: "#c99742",
  },
  activeCountBadgeText: {
    color: "#f5c242",
    fontSize: 11,
    fontWeight: "700",
  },
  clearAllText: {
    color: "#d4af37",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  closeBtnCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalClose: {
    color: "#aaa",
    fontSize: 15,
    fontWeight: "bold",
  },
  filterTabsRow: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    paddingBottom: 8,
    marginBottom: 8,
  },
  modalSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1612",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.3)",
    paddingHorizontal: 10,
    height: 38,
    marginBottom: 10,
  },
  modalSearchIcon: {
    fontSize: 13,
    marginRight: 6,
    color: "#888",
  },
  modalSearchInput: {
    flex: 1,
    color: "#ffffff",
    fontSize: 13,
    paddingVertical: 0,
  },
  filterSubTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "#1e1a14",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  filterSubTabSelected: {
    backgroundColor: "#c99742",
    borderColor: "#c99742",
  },
  filterSubTabText: {
    color: "#aaa",
    fontSize: 13,
    fontWeight: "600",
  },
  filterSubTabTextSelected: {
    color: "#000",
    fontWeight: "700",
  },
  optionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "#1a1612",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 6,
  },
  optionPillSelected: {
    borderColor: "#c99742",
    backgroundColor: "rgba(201, 151, 66, 0.2)",
  },
  optionPillText: {
    color: "#ccc",
    fontSize: 13,
  },
  optionPillTextSelected: {
    color: "#f5c242",
    fontWeight: "700",
  },
  filterSectionTitle: {
    color: "#888",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  priceInputsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  priceInput: {
    flex: 1,
    backgroundColor: "#1a1612",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 8,
    color: "#f5c242",
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  toggleText: {
    color: "#eee",
    fontSize: 14,
    fontWeight: "600",
  },
  toggleSub: {
    color: "#777",
    fontSize: 11,
    marginTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#666",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: "#c99742",
    borderColor: "#c99742",
  },
  checkMark: {
    color: "#000",
    fontSize: 13,
    fontWeight: "bold",
  },
  modalActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  clearBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  clearBtnText: {
    color: "#aaa",
    fontSize: 13,
    fontWeight: "600",
  },
  applyBtn: {
    flex: 1,
    marginLeft: 12,
  },
  applyBtnGradient: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  applyBtnText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "800",
  },

  // Sort Modal
  sortModalCard: {
    backgroundColor: "#14110d",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.3)",
  },
  sortOptionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  sortOptionRowSelected: {
    backgroundColor: "rgba(201, 151, 66, 0.1)",
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  sortOptionText: {
    color: "#aaa",
    fontSize: 14,
  },
  sortOptionTextSelected: {
    color: "#f5c242",
    fontWeight: "700",
  },
  sortCheck: {
    color: "#f5c242",
    fontSize: 15,
    fontWeight: "bold",
  },

  // Centered Quick Cart Modal
  modalBackdropCenter: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  cartPopupCard: {
    backgroundColor: "#14110d",
    borderRadius: 16,
    padding: 20,
    width: "88%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#c99742",
  },
  cartPopupImage: {
    width: 100,
    height: 120,
    marginBottom: 12,
  },
  cartPopupTitle: {
    color: "#eee",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  cartPopupPrice: {
    color: "#f5c242",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 4,
  },
  cartPopupMsg: {
    color: "#888",
    fontSize: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  cartPopupActions: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
  },
  cartContinueBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 8,
    marginRight: 6,
    alignItems: "center",
  },
  cartContinueText: {
    color: "#aaa",
    fontSize: 12,
    fontWeight: "600",
  },
  cartViewBagBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: "#c99742",
    borderRadius: 8,
    marginLeft: 6,
    alignItems: "center",
  },
  cartViewBagText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "700",
  },
});

export default Shop;
