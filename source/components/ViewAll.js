import React, { useState, useEffect, useMemo, useRef } from "react";
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
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import tmh_styles from "../styles/tmh_styles";
import AppHeader from "../widgets/AppHeader";
import SearchBar from "./SearchBar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { API_BASE } from "../resources/data/Constants";

const IMAGE_BASE_URL = "https://ik.imagekit.io/thegrandstore/images/products/";
const API_WISHLIST_TOGGLE = `${API_BASE}/customer/wishlist/add`;
const API_GET_WISHLIST = `${API_BASE}/customer/wishlist`;
const API_CART_ADD = `${API_BASE}/cart/addToCart`;
const API_CART_SHOW = `${API_BASE}/cart/show`;

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
  { id: "newest", label: "Newest Arrivals" },
  { id: "price_asc", label: "Price: Low to High" },
  { id: "price_desc", label: "Price: High to Low" },
  { id: "name_asc", label: "Name: A to Z" },
];

const PRICE_RANGES = [
  { id: "all", label: "All Prices", min: 0, max: Infinity },
  { id: "under_500", label: "Under R500", min: 0, max: 500 },
  { id: "500_1500", label: "R500 – R1,500", min: 500, max: 1500 },
  { id: "1500_5000", label: "R1,500 – R5,000", min: 1500, max: 5000 },
  { id: "above_5000", label: "R5,000+", min: 5000, max: Infinity },
];

const ViewAll = ({ route, navigation }) => {
  const params = route.params || {};
  const initialTitle = params.category_title || "Shop Collection";

  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Initial category selection logic
  const determineInitialCategory = () => {
    if (!params.category_title) return "All";
    const found = CATEGORY_CHIPS.find(
      (c) => c.toLowerCase() === params.category_title.trim().toLowerCase()
    );
    return found || "All";
  };

  const [selectedCategory, setSelectedCategory] = useState(determineInitialCategory());
  const [selectedSort, setSelectedSort] = useState("featured");
  const [selectedPriceRange, setSelectedPriceRange] = useState("all");
  const [onlyOffers, setOnlyOffers] = useState(
    params.category_title?.toLowerCase().includes("offer") || false
  );

  // Modals
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [isSortModalVisible, setIsSortModalVisible] = useState(false);
  const [isCartModalVisible, setIsCartModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // State for cart & wishlist
  const [cartItems, setCartItems] = useState(new Set());
  const [wishlistItemIds, setWishlistItemIds] = useState(new Set());

  useEffect(() => {
    fetchWishlist();
    fetchCartItems();
    fetchAllShopProducts();
  }, []);

  const fetchAllShopProducts = async () => {
    try {
      setLoading(true);
      const productCandidates = [
        `${API_BASE}/products`,
        "http://localhost:5000/api/products",
        "http://192.168.1.9:5000/api/products",
        "http://10.0.2.2:5000/api/products",
      ];
      const uniqueUrls = [...new Set(productCandidates)];
      let response = null;

      for (const url of uniqueUrls) {
        try {
          response = await axios.get(url, { timeout: 3000 });
          if (response?.data && Array.isArray(response.data)) break;
        } catch (e) {
          // try next
        }
      }

      if (response && Array.isArray(response.data)) {
        const normalized = response.data
          .filter((p) => {
            const cat = String(p.category || p.type || "").toLowerCase();
            return cat !== "accessories" && cat !== "accessory";
          })
          .map((p) => {
            const imgUrl = (Array.isArray(p.images) && p.images[0]) || p.image || "";
            const origPrice = Number(p.price) || 0;
            const offPrice = Number(p.offer_price) || 0;
            const hasDiscount = offPrice > 0 && offPrice < origPrice;
            return {
              ...p,
              id: p.id || p._id,
              productid: p.id || p._id,
              vendorid: p.vendorId || p.vendorid || 1,
              name: p.name || "Product",
              image: imgUrl,
              gallery: Array.isArray(p.images) ? p.images.join(",") : imgUrl,
              price: origPrice,
              final_price: hasDiscount ? offPrice : origPrice,
              offer_price: offPrice || origPrice,
              offer_active: hasDiscount,
              size: p.size || p.options?.[0] || "",
              category: p.category || p.type || "",
              category_id: p.category_id || null,
            };
          });
        setAllProducts(normalized);
      } else if (params.products && Array.isArray(params.products)) {
        setAllProducts(params.products);
      }
    } catch (err) {
      console.error("Failed to load shop products:", err?.message || err);
      if (params.products && Array.isArray(params.products)) {
        setAllProducts(params.products);
      }
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (msg) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert(msg);
    }
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath || typeof imagePath !== "string") return "";
    return imagePath.startsWith("http") ? imagePath : `${IMAGE_BASE_URL}${imagePath}`;
  };

  // === Wishlist Operations ===
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
    const pid = item.productid || item.id || item._id;
    if (!pid) return;

    // ⚡ 0ms Optimistic update
    const updated = new Set(wishlistItemIds);
    if (updated.has(pid)) {
      updated.delete(pid);
    } else {
      updated.add(pid);
    }

    setWishlistItemIds(updated);
    DeviceEventEmitter.emit("wishlistUpdated", updated.size);
    AsyncStorage.setItem("grand-store-wishlist", JSON.stringify([...updated])).catch(() => {});
  };

  // === Cart Operations ===
  const fetchCartItems = async () => {
    try {
      const stored = await AsyncStorage.getItem("grand-store-cart");
      const cart = stored ? JSON.parse(stored) : [];
      setCartItems(new Set(cart.map((i) => i.id || i.productid)));
    } catch (err) {
      // ignore
    }
  };

  const handleAddToCart = async (product) => {
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
      const updated = new Set(cart.map((i) => i.id || i.productid));
      setCartItems(updated);
      setSelectedProduct(product);
      setIsCartModalVisible(true);
      showMessage("Added to cart 🛒");
    } catch (err) {
      showMessage("❌ Could not add to cart");
    }
  };

  // === Computed Filtered Products ===
  const filteredProducts = useMemo(() => {
    let result = [...allProducts];

    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (p) =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q)) ||
          (p.brand && p.brand.toLowerCase().includes(q))
      );
    }

    // 2. Category Chip Filter
    if (selectedCategory !== "All") {
      const targetCat = selectedCategory.toLowerCase();
      result = result.filter((p) => {
        const cat = String(p.category || p.type || "").toLowerCase();
        return cat.includes(targetCat);
      });
    }

    // 3. Price Range Filter
    const priceConfig = PRICE_RANGES.find((r) => r.id === selectedPriceRange);
    if (priceConfig && priceConfig.id !== "all") {
      result = result.filter(
        (p) => p.final_price >= priceConfig.min && p.final_price <= priceConfig.max
      );
    }

    // 4. Special Offers Toggle
    if (onlyOffers) {
      result = result.filter((p) => p.offer_active);
    }

    // 5. Sorting
    result.sort((a, b) => {
      if (selectedSort === "price_asc") return a.final_price - b.final_price;
      if (selectedSort === "price_desc") return b.final_price - a.final_price;
      if (selectedSort === "name_asc") return (a.name || "").localeCompare(b.name || "");
      if (selectedSort === "newest") {
        return (Date.parse(b.createdAt || "") || 0) - (Date.parse(a.createdAt || "") || 0);
      }
      return 0; // featured default
    });

    return result;
  }, [allProducts, searchQuery, selectedCategory, selectedPriceRange, onlyOffers, selectedSort]);

  // 🧩 Animated Heart Button with pop spring and pink glow
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
            style={[styles.wishlistImg, { tintColor: isWishlisted ? "#f5c242" : "#fff" }]}
          />
        </Animated.View>
      </TouchableOpacity>
    );
  });

  const renderProductItem = ({ item }) => {
    const isInWishlist = wishlistItemIds.has(item.id || item.productid);
    const hasDiscount = item.final_price && Number(item.final_price) < Number(item.price);

    return (
      <View style={styles.cardWrapper}>
        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.card}
          onPress={() => navigation.navigate("ProductDetails", { product: item })}
        >
          {/* Wishlist Button */}
          <AnimatedHeartButton
            isWishlisted={isInWishlist}
            onPress={() => toggleWishlist(item)}
          />

          {/* Golden Gradient Halo Around the Bottle */}
          <LinearGradient
            colors={["#e5c06e", "#634c22", "#d4af37"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.goldBottleHalo}
          >
            <View style={styles.bottlePedestal}>
              <Image
                source={{ uri: getImageUrl(item.image) }}
                style={styles.productImage}
                resizeMode="contain"
              />
            </View>
          </LinearGradient>

          {/* Product Info */}
          <View style={styles.cardInfo}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.name}
            </Text>
            {item.size ? <Text style={styles.productSize}>{item.size}</Text> : null}

            {/* Price Row */}
            <View style={styles.priceRow}>
              <View>
                <Text style={styles.productPrice}>R{item.final_price}</Text>
                {hasDiscount && (
                  <Text style={styles.oldPrice}>R{item.price}</Text>
                )}
              </View>

              <TouchableOpacity
                style={styles.cartBtn}
                onPress={() => handleAddToCart(item)}
              >
                <Image
                  source={require("../resources/assets/bag.png")}
                  style={styles.cartIcon}
                />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title={initialTitle}
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

      {/* Real-time Search */}
      <SearchBar
        query={searchQuery}
        setQuery={setSearchQuery}
        placeholder="Search bottles, brands, styles..."
      />

      {/* Horizontal Category Filter Chips (Web style) */}
      <View style={styles.chipsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContent}
        >
          {CATEGORY_CHIPS.map((cat) => {
            const isActive = selectedCategory.toLowerCase() === cat.toLowerCase();
            return (
              <TouchableOpacity
                key={cat}
                activeOpacity={0.8}
                onPress={() => setSelectedCategory(cat)}
                style={[styles.chip, isActive && styles.chipActive]}
              >
                {isActive ? (
                  <LinearGradient
                    colors={["#f0c768", "#c99742"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.chipGradient}
                  >
                    <Text style={styles.chipTextActive}>{cat}</Text>
                  </LinearGradient>
                ) : (
                  <Text style={styles.chipText}>{cat}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Controls Bar: Bottle Count + Sort & Filter Buttons */}
      <View style={styles.controlsBar}>
        <Text style={styles.countText}>
          {filteredProducts.length} {filteredProducts.length === 1 ? "Bottle" : "Bottles"}
        </Text>

        <View style={styles.controlsRight}>
          {/* Sort Button */}
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => setIsSortModalVisible(true)}
          >
            <Text style={styles.filterBtnText}>
              Sort: {SORT_OPTIONS.find((s) => s.id === selectedSort)?.label.split(":")[0]}
            </Text>
          </TouchableOpacity>

          {/* Filter Modal Button */}
          <TouchableOpacity
            style={[
              styles.filterBtn,
              (selectedPriceRange !== "all" || onlyOffers) && styles.filterBtnHighlighted,
            ]}
            onPress={() => setIsFilterModalVisible(true)}
          >
            <Text style={styles.filterBtnText}>
              Filters {selectedPriceRange !== "all" || onlyOffers ? "•" : ""}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Product List or Loading */}
      {loading ? (
        <ActivityIndicator size="large" color="#c99742" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={(item, idx) => (item.id || item.productid || idx).toString()}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No Bottles Found</Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your search query or removing some active filters.
              </Text>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                  setSelectedPriceRange("all");
                  setOnlyOffers(false);
                }}
              >
                <Text style={styles.resetBtnText}>Reset All Filters</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* === Filter Options Modal === */}
      <Modal
        visible={isFilterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.filterModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeading}>Filters</Text>
              <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Price Filter Section */}
            <Text style={styles.filterSectionTitle}>Price Range</Text>
            <View style={styles.optionsWrap}>
              {PRICE_RANGES.map((range) => {
                const isSelected = selectedPriceRange === range.id;
                return (
                  <TouchableOpacity
                    key={range.id}
                    onPress={() => setSelectedPriceRange(range.id)}
                    style={[styles.optionPill, isSelected && styles.optionPillSelected]}
                  >
                    <Text
                      style={[styles.optionPillText, isSelected && styles.optionPillTextSelected]}
                    >
                      {range.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Offers Only Toggle */}
            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setOnlyOffers(!onlyOffers)}
            >
              <Text style={styles.toggleText}>Special Offers & Discounts Only</Text>
              <View style={[styles.checkbox, onlyOffers && styles.checkboxActive]}>
                {onlyOffers ? <Text style={styles.checkMark}>✓</Text> : null}
              </View>
            </TouchableOpacity>

            {/* Modal Actions */}
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => {
                  setSelectedPriceRange("all");
                  setOnlyOffers(false);
                }}
              >
                <Text style={styles.clearBtnText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => setIsFilterModalVisible(false)}
              >
                <Text style={styles.applyBtnText}>Apply</Text>
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
            <Text style={styles.modalHeading}>Sort Collection</Text>
            {SORT_OPTIONS.map((opt) => {
              const isSelected = selectedSort === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.sortItem, isSelected && styles.sortItemSelected]}
                  onPress={() => {
                    setSelectedSort(opt.id);
                    setIsSortModalVisible(false);
                  }}
                >
                  <Text style={[styles.sortItemText, isSelected && styles.sortItemTextSelected]}>
                    {opt.label}
                  </Text>
                  {isSelected ? <Text style={styles.sortCheck}>✓</Text> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* === Cart Quick View Modal (Golden Aura) === */}
      <Modal
        visible={isCartModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCartModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.cartModalCard}>
            <TouchableOpacity
              style={styles.cartModalClose}
              onPress={() => setIsCartModalVisible(false)}
            >
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.cartModalTitle}>Added to Cart</Text>

            {/* Bottle with Golden Halo */}
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

            <Text style={styles.modalProductName}>{selectedProduct?.name}</Text>
            <Text style={styles.modalProductPrice}>R{selectedProduct?.final_price}</Text>

            <TouchableOpacity
              style={styles.continueBtn}
              onPress={() => setIsCartModalVisible(false)}
            >
              <Text style={styles.continueBtnText}>Continue Shopping</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const cardWidth = (Dimensions.get("window").width - 32) / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0b09",
  },
  chipsContainer: {
    paddingVertical: 10,
    backgroundColor: "#13100c",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(201, 151, 66, 0.2)",
  },
  chipsContent: {
    paddingHorizontal: 12,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#1f1b15",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.3)",
    overflow: "hidden",
  },
  chipActive: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderWidth: 0,
  },
  chipGradient: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipText: {
    color: "#ccc",
    fontSize: 13,
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#000",
    fontSize: 13,
    fontWeight: "700",
  },
  controlsBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  countText: {
    color: "#d4af37",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  controlsRight: {
    flexDirection: "row",
    gap: 8,
  },
  filterBtn: {
    backgroundColor: "#1c1813",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.35)",
  },
  filterBtnHighlighted: {
    borderColor: "#f5c242",
    backgroundColor: "rgba(201, 151, 66, 0.15)",
  },
  filterBtnText: {
    color: "#f5ede0",
    fontSize: 12,
    fontWeight: "600",
  },
  listContainer: {
    paddingHorizontal: 10,
    paddingBottom: 40,
    paddingTop: 4,
  },
  columnWrapper: {
    justifyContent: "space-between",
  },
  cardWrapper: {
    width: cardWidth,
    marginBottom: 14,
  },
  card: {
    backgroundColor: "#171410",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.22)",
    elevation: 3,
  },
  wishlistIcon: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
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
  wishlistImg: {
    width: 16,
    height: 16,
  },
  // Golden Gradient Halo Around the Bottle (MEMORY PATTERN)
  goldBottleHalo: {
    padding: 1.5,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#d4af37",
    shadowOpacity: 0.3,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  bottlePedestal: {
    backgroundColor: "#12100d",
    borderRadius: 11,
    height: 155,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  productImage: {
    width: "88%",
    height: 140,
  },
  cardInfo: {
    paddingTop: 4,
  },
  productName: {
    color: "#f7f3ed",
    fontSize: 13,
    fontWeight: "600",
    minHeight: 34,
  },
  productSize: {
    color: "#999",
    fontSize: 11,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  productPrice: {
    color: "#f5c242",
    fontSize: 15,
    fontWeight: "700",
  },
  oldPrice: {
    color: "#777",
    fontSize: 11,
    textDecorationLine: "line-through",
  },
  cartBtn: {
    backgroundColor: "#c99742",
    padding: 7,
    borderRadius: 9,
  },
  cartIcon: {
    width: 17,
    height: 17,
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: "#f8f4ec",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptySubtitle: {
    color: "#888",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 16,
  },
  resetBtn: {
    backgroundColor: "#c99742",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  resetBtnText: {
    color: "#000",
    fontWeight: "700",
    fontSize: 13,
  },
  // Modal Backdrop
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  filterModalCard: {
    width: "88%",
    backgroundColor: "#181410",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.2,
    borderColor: "rgba(201, 151, 66, 0.4)",
  },
  sortModalCard: {
    width: "80%",
    backgroundColor: "#181410",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.2,
    borderColor: "rgba(201, 151, 66, 0.4)",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  modalHeading: {
    color: "#f5c242",
    fontSize: 18,
    fontWeight: "700",
  },
  modalClose: {
    color: "#aaa",
    fontSize: 18,
  },
  filterSectionTitle: {
    color: "#eee",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  optionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  optionPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#221d17",
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.25)",
  },
  optionPillSelected: {
    backgroundColor: "#c99742",
    borderColor: "#c99742",
  },
  optionPillText: {
    color: "#ccc",
    fontSize: 12,
  },
  optionPillTextSelected: {
    color: "#000",
    fontWeight: "700",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(201, 151, 66, 0.15)",
  },
  toggleText: {
    color: "#eee",
    fontSize: 13,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#c99742",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxActive: {
    backgroundColor: "#c99742",
  },
  checkMark: {
    color: "#000",
    fontSize: 12,
    fontWeight: "bold",
  },
  modalActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
    gap: 12,
  },
  clearBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#28231c",
    alignItems: "center",
  },
  clearBtnText: {
    color: "#aaa",
    fontWeight: "600",
  },
  applyBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#c99742",
    alignItems: "center",
  },
  applyBtnText: {
    color: "#000",
    fontWeight: "700",
  },
  sortItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(201, 151, 66, 0.12)",
  },
  sortItemSelected: {
    borderBottomColor: "#c99742",
  },
  sortItemText: {
    color: "#ccc",
    fontSize: 14,
  },
  sortItemTextSelected: {
    color: "#f5c242",
    fontWeight: "700",
  },
  sortCheck: {
    color: "#f5c242",
    fontWeight: "bold",
  },
  // Cart Quick View Modal
  cartModalCard: {
    width: "82%",
    backgroundColor: "#181410",
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
    borderWidth: 1.2,
    borderColor: "#c99742",
  },
  cartModalClose: {
    position: "absolute",
    top: 12,
    right: 14,
  },
  cartModalTitle: {
    color: "#2ec4b6",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  modalBottleHalo: {
    padding: 1.5,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: "#d4af37",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  modalBottlePedestal: {
    backgroundColor: "#12100d",
    borderRadius: 13,
    width: 140,
    height: 140,
    justifyContent: "center",
    alignItems: "center",
  },
  modalImage: {
    width: 110,
    height: 110,
  },
  modalProductName: {
    color: "#fdfaf5",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginVertical: 4,
  },
  modalProductPrice: {
    color: "#f5c242",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 14,
  },
  continueBtn: {
    backgroundColor: "#c99742",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  continueBtnText: {
    color: "#000",
    fontWeight: "700",
    fontSize: 13,
  },
});

export default ViewAll;
