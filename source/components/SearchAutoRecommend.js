/* eslint-disable react-native/no-inline-styles */
/* eslint-disable quotes */
/* eslint-disable prettier/prettier */
import React, { useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  Platform,
  Keyboard,
  Modal,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { APP_FONT } from "../resources/data/Fonts";

import { useCurrency } from "../context/CurrencyContext";

const IMAGE_BASE_URL = "https://ik.imagekit.io/thegrandstore/images/products/";

const getImageUrl = (imagePath) => {
  if (!imagePath || typeof imagePath !== "string") return "";
  const cleaned = imagePath.startsWith("/") ? imagePath.slice(1) : imagePath;
  return cleaned.startsWith("http") ? cleaned : `${IMAGE_BASE_URL}${cleaned}`;
};



const TRENDING_CHIPS = [
  { label: "🥃 Single Malt", query: "Single Malt" },
  { label: "🍷 Fine Wine", query: "Wine" },
  { label: "🍾 Champagne", query: "Champagne" },
  { label: "🍸 Premium Gin", query: "Gin" },
  { label: "🌵 Tequila", query: "Tequila" },
  { label: "🥃 Bourbon", query: "Bourbon" },
  { label: "🪵 Cognac", query: "Cognac" },
  { label: "⭐ Rare Vintages", query: "Vintage" },
];

/**
 * Luxury Auto-Recommended Search Component for Mobile React Native
 * Supports:
 * - Standalone dedicated search overlay that eliminates nested scroll conflicts on Android
 * - Empty query: curated trending searches & top recommended bottles
 * - Active typing: live multi-field predictive matching (name, brand, category, style, country)
 * - Zero match fallback: "You might also like" recommendations
 * - Seamless integration on both Home Search & Shop / ViewAll Search
 */
const SearchAutoRecommend = ({
  query = "",
  setQuery,
  products = [],
  navigation,
  placeholder = "Search bottles, brands, styles...",
  categories = [],
  onSelectProduct,
  onSearchSubmit,
  containerStyle,
  inputStyle,
  showShopViewAll = true,
  shopViewAllText = "View all results in Shop →",
}) => {
  const { formatPrice } = useCurrency();
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  // Curated top recommended bottles (picks diverse premium bottles across categories)
  const topRecommendations = useMemo(() => {
    if (!products || products.length === 0) return [];
    
    // Pick bottles with discounts, featured tags, or diverse categories
    const seenCats = new Set();
    const diverse = [];
    const rest = [];

    for (const p of products) {
      const cat = String(p.category || p.type || "").toLowerCase();
      if (!seenCats.has(cat) && diverse.length < 8) {
        seenCats.add(cat);
        diverse.push(p);
      } else {
        rest.push(p);
      }
    }

    const combined = [...diverse, ...rest];
    return combined.slice(0, 10);
  }, [products]);

  // Live matching recommendations when typing
  const liveMatches = useMemo(() => {
    if (!query || !query.trim() || !products || products.length === 0) {
      return [];
    }
    const q = query.trim().toLowerCase();

    // Score products based on where match occurs
    const scored = [];
    for (const p of products) {
      const name = String(p.name || p.title || "").toLowerCase();
      const brand = String(p.brand || "").toLowerCase();
      const cat = String(p.category || p.type || "").toLowerCase();
      const subcat = String(p.subcategory || p.identity?.style || "").toLowerCase();
      const country = String(p.country || p.identity?.origin || "").toLowerCase();

      let score = 0;
      if (name.startsWith(q)) {
        score = 100;
      } else if (name.includes(q)) {
        score = 80;
      } else if (brand.includes(q)) {
        score = 60;
      } else if (subcat.includes(q)) {
        score = 40;
      } else if (cat.includes(q)) {
        score = 30;
      } else if (country.includes(q)) {
        score = 20;
      }

      if (score > 0) {
        scored.push({ product: p, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.product);
  }, [query, products]);

  const handleProductPress = (item) => {
    setIsFocused(false);
    Keyboard.dismiss();
    if (onSelectProduct) {
      onSelectProduct(item);
      return;
    }

    if (navigation && navigation.push) {
      navigation.push("ProductDetails", {
        product: item,
        category: { name: item.category || "Spirits" },
        recommendedProducts: products
          .filter(
            (p) =>
              (p.id || p.productid || p._id) !==
              (item.id || item.productid || item._id)
          )
          .slice(0, 8),
      });
    } else if (navigation && navigation.navigate) {
      navigation.navigate("ProductDetails", {
        product: item,
        category: { name: item.category || "Spirits" },
      });
    }
  };

  const handleChipPress = (chipQuery) => {
    setQuery(chipQuery);
  };

  const handleClear = () => {
    setQuery("");
  };

  const handleDismiss = () => {
    setIsFocused(false);
    Keyboard.dismiss();
  };

  const handleViewAllInShop = () => {
    setIsFocused(false);
    Keyboard.dismiss();
    if (onSearchSubmit) {
      onSearchSubmit(query);
    }
  };

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {/* Inline Search Bar Trigger (tapping opens the dedicated search view) */}
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => setIsFocused(true)}
        style={[styles.searchBar, inputStyle]}
      >
        <Image
          source={require("../resources/assets/discover.png")}
          style={styles.searchIcon}
          resizeMode="contain"
        />

        <Text
          style={[
            styles.inputDisplay,
            query ? styles.inputDisplayTextActive : styles.inputDisplayTextPlaceholder,
          ]}
          numberOfLines={1}
        >
          {query || placeholder}
        </Text>

        {query.length > 0 && (
          <TouchableOpacity
            onPress={(e) => {
              e?.stopPropagation?.();
              handleClear();
            }}
            style={styles.clearBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {/* Dedicated Search Modal with Completely Independent, Buttery-Smooth Scroll */}
      <Modal
        visible={isFocused}
        animationType="fade"
        transparent={true}
        onRequestClose={handleDismiss}
        statusBarTranslucent={true}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <StatusBar backgroundColor="#0c0b08" barStyle="light-content" />

          {/* Modal Header with Live Interactive TextInput */}
          <View style={styles.modalHeader}>
            <View style={styles.modalSearchBar}>
              <Image
                source={require("../resources/assets/discover.png")}
                style={[styles.searchIcon, { tintColor: "#f5c242" }]}
                resizeMode="contain"
              />

              <TextInput
                ref={inputRef}
                style={styles.modalInput}
                placeholder={placeholder}
                placeholderTextColor="#777777"
                value={query}
                onChangeText={setQuery}
                autoFocus={true}
                returnKeyType="search"
                onSubmitEditing={handleViewAllInShop}
              />

              {query.length > 0 && (
                <TouchableOpacity
                  onPress={handleClear}
                  style={styles.clearBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.clearBtnText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              onPress={handleDismiss}
              style={styles.modalCancelBtn}
              activeOpacity={0.75}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {/* Sub-Header with Result Category/Count */}
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownHeaderTitle}>
              {query.trim().length === 0
                ? "🔥 CURATED RECOMMENDATIONS"
                : liveMatches.length > 0
                ? `✨ RECOMMENDED MATCHES (${liveMatches.length})`
                : "💡 SEARCH RECOMMENDATIONS"}
            </Text>

            {query.trim().length > 0 && (
              <TouchableOpacity
                onPress={handleClear}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.clearAllText}>Clear search</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Dedicated Smooth Scroll View (100% native scroll without parent interception) */}
          <ScrollView
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={true}
            style={styles.scrollList}
            contentContainerStyle={styles.scrollContent}
          >
            {/* When search query is empty: Trending category chips */}
            {query.trim().length === 0 && (
              <View style={styles.chipsSection}>
                <Text style={styles.chipsSectionLabel}>POPULAR SEARCHES</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="always"
                  contentContainerStyle={styles.chipsRow}
                >
                  {TRENDING_CHIPS.map((chip, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.chip}
                      activeOpacity={0.75}
                      onPress={() => handleChipPress(chip.query)}
                    >
                      <Text style={styles.chipText}>{chip.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* List of Recommended Bottles */}
            {query.trim().length === 0 ? (
              // Empty query -> show top curated recommendations
              <View style={styles.productsList}>
                {topRecommendations.map((item, idx) => {
                  const price = item.offer_active
                    ? item.offer_price
                    : item.price;
                  return (
                    <TouchableOpacity
                      key={item.id || item.productid || idx}
                      style={styles.productRow}
                      activeOpacity={0.78}
                      onPress={() => handleProductPress(item)}
                    >
                      <View style={styles.productImgWrap}>
                        {item.image ? (
                          <Image
                            source={{ uri: getImageUrl(item.image) }}
                            style={styles.productImg}
                            resizeMode="contain"
                          />
                        ) : (
                          <View style={styles.imgPlaceholder}>
                            <Text style={styles.imgPlaceholderText}>GS</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.productInfo}>
                        <View style={styles.tagRow}>
                          <Text style={styles.categoryTag} numberOfLines={1}>
                            {item.brand || item.category || "Fine Bottle"}
                          </Text>
                          <View style={styles.recommendedBadge}>
                            <Text style={styles.recommendedBadgeText}>
                              RECOMMENDED
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.productName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.productPrice}>
                          {formatPrice(price)}
                        </Text>
                      </View>

                      <Text style={styles.arrowIcon}>→</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : liveMatches.length > 0 ? (
              // Active search query with matches
              <View style={styles.productsList}>
                {liveMatches.map((item, idx) => {
                  const price = item.offer_active
                    ? item.offer_price
                    : item.price;
                  return (
                    <TouchableOpacity
                      key={item.id || item.productid || idx}
                      style={styles.productRow}
                      activeOpacity={0.78}
                      onPress={() => handleProductPress(item)}
                    >
                      <View style={styles.productImgWrap}>
                        {item.image ? (
                          <Image
                            source={{ uri: getImageUrl(item.image) }}
                            style={styles.productImg}
                            resizeMode="contain"
                          />
                        ) : (
                          <View style={styles.imgPlaceholder}>
                            <Text style={styles.imgPlaceholderText}>GS</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.productInfo}>
                        <View style={styles.tagRow}>
                          <Text style={styles.categoryTag} numberOfLines={1}>
                            {item.category}
                            {item.brand ? ` • ${item.brand}` : ""}
                          </Text>
                          {item.offer_active && (
                            <View style={styles.offerBadge}>
                              <Text style={styles.offerBadgeText}>OFFER</Text>
                            </View>
                          )}
                        </View>
                        <Text
                          style={[styles.productName, styles.productNameMatch]}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        <Text style={styles.productPrice}>
                          {formatPrice(price)}
                        </Text>
                      </View>

                      <Text style={styles.arrowIcon}>→</Text>
                    </TouchableOpacity>
                  );
                })}

                {/* Bottom View All in Shop Action */}
                {showShopViewAll && (
                  <TouchableOpacity
                    style={styles.viewAllShopBtn}
                    activeOpacity={0.8}
                    onPress={handleViewAllInShop}
                  >
                    <Text style={styles.viewAllShopText}>
                      🔍 {shopViewAllText.replace("{count}", liveMatches.length)}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              // No matches -> friendly fallback with recommended alternatives
              <View style={styles.noMatchContainer}>
                <Text style={styles.noMatchEmoji}>🔎</Text>
                <Text style={styles.noMatchTitle}>
                  No exact match for "{query}"
                </Text>
                <Text style={styles.noMatchSubtitle}>
                  Try broader keywords or explore these popular recommendations:
                </Text>

                <View style={styles.productsList}>
                  {topRecommendations.slice(0, 6).map((item, idx) => {
                    const price = item.offer_active
                      ? item.offer_price
                      : item.price;
                    return (
                      <TouchableOpacity
                        key={item.id || item.productid || idx}
                        style={styles.productRow}
                        activeOpacity={0.78}
                        onPress={() => handleProductPress(item)}
                      >
                        <View style={styles.productImgWrap}>
                          {item.image ? (
                            <Image
                              source={{ uri: getImageUrl(item.image) }}
                              style={styles.productImg}
                              resizeMode="contain"
                            />
                          ) : (
                            <View style={styles.imgPlaceholder}>
                              <Text style={styles.imgPlaceholderText}>GS</Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.productInfo}>
                          <Text style={styles.categoryTag} numberOfLines={1}>
                            {item.category || "Fine Spirit"}
                          </Text>
                          <Text style={styles.productName} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text style={styles.productPrice}>
                            {formatPrice(price)}
                          </Text>
                        </View>

                        <Text style={styles.arrowIcon}>→</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: "95%",
    alignSelf: "center",
    marginVertical: 10,
    zIndex: 9999,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#191815",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "android" ? 7 : 10,
    borderColor: "rgba(201, 151, 66, 0.45)",
    borderWidth: 1.2,
  },
  searchIcon: {
    width: 17,
    height: 17,
    tintColor: "#c99742",
    marginRight: 10,
  },
  inputDisplay: {
    flex: 1,
    fontSize: 14,
    fontFamily: APP_FONT,
    paddingVertical: 2,
  },
  inputDisplayTextPlaceholder: {
    color: "#777777",
  },
  inputDisplayTextActive: {
    color: "#f0ece3",
  },
  clearBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  clearBtnText: {
    color: "#888888",
    fontSize: 14,
    fontWeight: "bold",
  },

  // Modal Full Screen Overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: "#0d0c0a",
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 24) + 6 : 0,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  modalSearchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#191815",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "android" ? 4 : 8,
    borderColor: "#f5c242",
    borderWidth: 1.2,
  },
  modalInput: {
    flex: 1,
    fontSize: 14,
    color: "#f0ece3",
    paddingVertical: 4,
    fontFamily: APP_FONT,
  },
  modalCancelBtn: {
    paddingLeft: 12,
    paddingVertical: 6,
  },
  modalCancelBtnText: {
    color: "#f5c242",
    fontSize: 13,
    fontWeight: "700",
  },

  // Sub-header
  dropdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
    backgroundColor: "rgba(245, 194, 66, 0.04)",
  },
  dropdownHeaderTitle: {
    color: "#f5c242",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  clearAllText: {
    color: "rgba(245, 194, 66, 0.8)",
    fontSize: 11,
    fontWeight: "600",
  },

  // Scroll Container
  scrollList: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 60,
  },

  // Chips section
  chipsSection: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  chipsSectionLabel: {
    color: "rgba(255, 255, 255, 0.45)",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.9,
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: "row",
    gap: 7,
    paddingBottom: 4,
  },
  chip: {
    backgroundColor: "rgba(245, 194, 66, 0.1)",
    borderColor: "rgba(245, 194, 66, 0.25)",
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
  },
  chipText: {
    color: "#e8dec8",
    fontSize: 11,
    fontWeight: "600",
  },

  // Products list in dropdown
  productsList: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  productImgWrap: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#000000",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  productImg: {
    width: 42,
    height: 42,
  },
  imgPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#1f1a10",
    justifyContent: "center",
    alignItems: "center",
  },
  imgPlaceholderText: {
    color: "#c99742",
    fontWeight: "800",
    fontSize: 12,
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  categoryTag: {
    color: "rgba(245, 194, 66, 0.85)",
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  recommendedBadge: {
    backgroundColor: "rgba(245, 194, 66, 0.15)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.8,
    borderColor: "rgba(245, 194, 66, 0.35)",
  },
  recommendedBadgeText: {
    color: "#ffd700",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  offerBadge: {
    backgroundColor: "rgba(225, 29, 72, 0.2)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.8,
    borderColor: "rgba(225, 29, 72, 0.4)",
  },
  offerBadgeText: {
    color: "#fda4af",
    fontSize: 8,
    fontWeight: "800",
  },
  productName: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },
  productNameMatch: {
    color: "#f8f5ee",
  },
  productPrice: {
    color: "#f5c242",
    fontSize: 12,
    fontWeight: "800",
    fontFamily: APP_FONT,
  },
  arrowIcon: {
    color: "rgba(245, 194, 66, 0.7)",
    fontSize: 15,
    paddingHorizontal: 6,
  },

  // View All in Shop CTA Button
  viewAllShopBtn: {
    backgroundColor: "rgba(245, 194, 66, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 194, 66, 0.35)",
    borderRadius: 8,
    paddingVertical: 11,
    marginTop: 10,
    marginBottom: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  viewAllShopText: {
    color: "#f5c242",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // No match
  noMatchContainer: {
    padding: 20,
    alignItems: "center",
  },
  noMatchEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  noMatchTitle: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  noMatchSubtitle: {
    color: "rgba(255, 255, 255, 0.55)",
    fontSize: 11,
    textAlign: "center",
    marginBottom: 12,
    paddingHorizontal: 12,
  },
});

export default SearchAutoRecommend;
