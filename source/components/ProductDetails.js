import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Image,
  Text,
  TouchableOpacity,
  Modal,
  Dimensions,
  StyleSheet,
  Platform,
  ToastAndroid,
  Alert,
  TextInput,
  ActivityIndicator,
  Animated,
  DeviceEventEmitter,
  LayoutAnimation,
  UIManager,
} from "react-native";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import LinearGradient from "react-native-linear-gradient";
import AppHeader from "../widgets/AppHeader";
import tmh_styles from "../styles/tmh_styles";
import { HEADER_HEIGHT_THRESHOLD, API_BASE } from "../resources/data/Constants";
import { APP_FONT } from "../resources/data/Fonts";
import ImageViewer from "react-native-image-zoom-viewer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useCurrency } from "../context/CurrencyContext";

const IMAGE_BASE_URL = "https://ik.imagekit.io/thegrandstore/images/products/";
const API_WISHLIST_TOGGLE = `${API_BASE}/customer/wishlist/add`;
const API_GET_WISHLIST = `${API_BASE}/customer/wishlist`;
const API_CART_ADD = `${API_BASE}/cart/addToCart`;

const ProductDetails = ({ navigation, route }) => {
  const { formatPrice, currencySymbol, countryName: destinationCountry } = useCurrency();
  const { product, category, related_products } = route.params || {};
  const { height, width } = Dimensions.get("screen");

  const [headerHeight] = useState((HEADER_HEIGHT_THRESHOLD * height) / 100);
  const [mainImage, setMainImage] = useState(0);
  const [zoomVisible, setZoomVisible] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  // Social Proof Reviews & Bottom Sections State
  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState({ averageRating: 5.0, reviewCount: 0 });
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  const [isCertificateModalVisible, setIsCertificateModalVisible] = useState(false);
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isBuyNowModalVisible, setIsBuyNowModalVisible] = useState(false);
  const heartScale = React.useRef(new Animated.Value(1)).current;

  const toggleDescription = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsDescriptionExpanded((prev) => !prev);
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath || typeof imagePath !== "string") return "";
    return imagePath.startsWith("http") ? imagePath : `${IMAGE_BASE_URL}${imagePath}`;
  };

  // Prepare gallery images (array of URLs)
  const rawGallery = Array.isArray(product?.images)
    ? product.images
    : product?.gallery
    ? typeof product.gallery === "string"
      ? product.gallery.split(",").map((s) => s.trim())
      : []
    : [];

  const allImages = [...new Set([product?.image, ...rawGallery].filter(Boolean))];
  const productImages = allImages.length > 0
    ? allImages.map((src) => ({ uri: getImageUrl(src) }))
    : [{ uri: getImageUrl(product?.image) }];

  const zoomImages = productImages.map((img) => ({ url: img.uri }));

  useEffect(() => {
    checkWishlistStatus();
    fetchReviews();
  }, [product]);

  const fetchReviews = async () => {
    try {
      const pid = product?.id || product?._id;
      if (!pid) return;
      const res = await axios.get(
        `${API_BASE}/social-proof/reviews/product/${encodeURIComponent(pid)}`,
        { timeout: 10000 }
      );
      if (res.data?.success) {
        const reviewList = Array.isArray(res.data.data) ? res.data.data : [];
        setReviews(reviewList);
        const count = res.data.count ?? reviewList.length;
        const avg = res.data.averageRating ?? (reviewList.length > 0
          ? reviewList.reduce((acc, r) => acc + Number(r.ratings?.overall || 5), 0) / reviewList.length
          : 5.0);
        setReviewSummary({
          averageRating: Number(Number(avg).toFixed(1)),
          reviewCount: count,
        });
      }
    } catch (e) {
      // Keep defaults if social proof endpoint is quiet
    }
  };

  const handleSubmitReview = async () => {
    if (!newReviewComment.trim()) {
      showMessage("Please write a few words about your tasting experience.");
      return;
    }
    try {
      setIsSubmittingReview(true);
      const token = await AsyncStorage.getItem("userToken");
      const pid = product?._id || product?.id;

      const res = await axios.post(
        `${API_BASE}/social-proof/reviews`,
        {
          type: "product",
          referenceId: pid,
          ratings: { overall: newReviewRating },
          comment: newReviewComment.trim(),
        },
        token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      );

      if (res.data?.success && res.data?.data) {
        const created = res.data.data;
        setReviews((prev) => [created, ...prev]);
        setReviewSummary((prev) => ({
          averageRating: Number(
            ((prev.averageRating * prev.reviewCount + newReviewRating) / (prev.reviewCount + 1)).toFixed(1)
          ),
          reviewCount: prev.reviewCount + 1,
        }));
        setIsReviewModalVisible(false);
        setNewReviewComment("");
        setNewReviewRating(5);
        showMessage("✓ Thank you! Your review has been submitted.");
      } else {
        showMessage(res.data?.message || "Could not submit review");
      }
    } catch (err) {
      showMessage(err.response?.data?.message || "Failed to submit review.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const getServingGuide = () => {
    const cat = (product?.category || product?.type || "").toLowerCase();
    if (cat.includes("wine") || cat.includes("red")) {
      return {
        temp: "16°C – 18°C (Cool Room Temp)",
        glass: "Bordeaux or Burgundy Crystal Goblet",
        cellar: "Store horizontally at 12°C–14°C away from vibration",
        pairing: "Aged steaks, charcuterie, artisanal cheeses",
      };
    }
    if (cat.includes("champagne") || cat.includes("sparkling") || cat.includes("white")) {
      return {
        temp: "7°C – 9°C (Well Chilled)",
        glass: "Tulip Champagne Glass or White Wine Glass",
        cellar: "Keep chilled or in cool dark cellar",
        pairing: "Oysters, caviar, fresh seafood, light poultry",
      };
    }
    if (cat.includes("whisky") || cat.includes("whiskey") || cat.includes("scotch")) {
      return {
        temp: "18°C – 20°C (Neat or with a drop of spring water)",
        glass: "Glencairn Crystal Tasting Glass",
        cellar: "Store upright in cool dry ambient cellar",
        pairing: "Dark single-origin chocolate, roasted nuts, cured meats",
      };
    }
    if (cat.includes("tequila") || cat.includes("mezcal")) {
      return {
        temp: "18°C – 20°C (Sipped slowly neat)",
        glass: "Riedel Tequila Snifter or Copita",
        cellar: "Store upright in cool ambient environment",
        pairing: "Citrus ceviche, spiced dark chocolate, smoked meats",
      };
    }
    if (cat.includes("cognac") || cat.includes("brandy")) {
      return {
        temp: "20°C – 22°C (Warmed gently in hand)",
        glass: "Classic Tulip or Balloon Snifter",
        cellar: "Store upright in dark cellar at ambient temperature",
        pairing: "Fine cigars, tarte tatin, dark espresso truffles",
      };
    }
    return {
      temp: "12°C – 16°C",
      glass: "Crystal Stemmed Glass",
      cellar: "Store in cool environment away from heat and light",
      pairing: "Gourmet canapés and fine cheeses",
    };
  };

  const servingGuide = getServingGuide();

  const showMessage = (msg) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert(msg);
    }
  };

  const checkWishlistStatus = async () => {
    try {
      if (!product) return;
      const pid = product.productid || product.id || product._id;
      const stored = await AsyncStorage.getItem("grand-store-wishlist");
      const list = stored ? JSON.parse(stored) : [];
      setIsWishlisted(list.includes(pid));
    } catch (err) {
      // ignore
    }
  };

  const toggleWishlist = () => {
    const pid = product?.productid || product?.id || product?._id;
    if (!pid) return;

    // ⚡ 0ms instant native spring animation
    Animated.sequence([
      Animated.timing(heartScale, { toValue: 1.45, duration: 90, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }),
    ]).start();

    // ⚡ 0ms instant visual toggle
    const nextState = !isWishlisted;
    setIsWishlisted(nextState);

    // 💾 Background persistence without blocking UI
    AsyncStorage.getItem("grand-store-wishlist").then((stored) => {
      let list = stored ? JSON.parse(stored) : [];
      if (nextState) {
        if (!list.includes(pid)) list.push(pid);
      } else {
        list = list.filter((id) => id !== pid);
      }
      AsyncStorage.setItem("grand-store-wishlist", JSON.stringify(list)).catch(() => {});
      DeviceEventEmitter.emit("wishlistUpdated", list.length);
    }).catch(() => {});
  };

  // Pricing & Identity
  const origPrice = Number(product?.price) || 0;
  const offPrice = Number(product?.offer_price) || 0;
  const hasDiscount = (product?.offer_active && offPrice > 0) || (offPrice > 0 && offPrice < origPrice);
  const finalPrice = hasDiscount ? offPrice : (Number(product?.final_price) || origPrice);
  const bottleImage = product?.image || product?.product_image || "";
  const bottleSize = product?.size || product?.options?.[0] || "750ml";
  const categoryName = product?.category || product?.type || category?.name || "Collection";
  const brandName = product?.brand || product?.storeName || "The Grand Store";
  const subcategory = product?.subcategory || product?.style || "";
  const countryName = product?.country || product?.origin || "South Africa";
  const abv = product?.abv || product?.details?.abv || product?.alcohol || "43.0%";
  const vintage = product?.vintage || product?.age || product?.details?.age || "Non-Vintage";
  const inStock = product?.stock === undefined || product?.stock > 0;

  const handleAddToCart = async () => {
    try {
      setIsAddingToCart(true);
      const pid = product?.productid || product?.id || product?._id;
      const stored = await AsyncStorage.getItem("grand-store-cart");
      let cart = stored ? JSON.parse(stored) : [];
      const existingIndex = cart.findIndex((c) => (c.id || c.productid) === pid);
      if (existingIndex >= 0) {
        cart[existingIndex].quantity = (Number(cart[existingIndex].quantity) || 0) + quantity;
      } else {
        cart.push({
          id: pid,
          productid: pid,
          name: product.name || product.title || product.product_name,
          price: finalPrice,
          image: bottleImage,
          quantity: quantity,
          size: bottleSize,
          isSuperCoinEligible: !(product?.isSuperCoinEligible === false || product?.isSuperCoinEligible === "false" || product?.isSuperCoinEligible === 0 || product?.isSuperCoinEligible === "0"),
          maxSuperCoinDiscountPct: Number(product?.maxSuperCoinDiscountPct ?? 10),
          isReferralEligible: !(product?.isReferralEligible === false || product?.isReferralEligible === "false" || product?.isReferralEligible === 0 || product?.isReferralEligible === "0"),
          referralDiscountPct: Number(product?.referralDiscountPct ?? 5),
        });
      }
      await AsyncStorage.setItem("grand-store-cart", JSON.stringify(cart));
      DeviceEventEmitter.emit("cartUpdated", cart.length);
      // Immediately redirect to the Cart screen
      navigation.navigate("Cart");
    } catch (err) {
      showMessage("❌ Could not add to cart");
    } finally {
      setIsAddingToCart(false);
    }
  };

  const confirmBuyNow = () => {
    setIsBuyNowModalVisible(false);
    const pid = product?.productid || product?.id || product?._id;
    const buyNowItem = {
      id: pid,
      productid: pid,
      name: product.name || product.title || product.product_name,
      price: finalPrice,
      image: bottleImage,
      quantity: quantity,
      size: bottleSize,
      isSuperCoinEligible: !(product?.isSuperCoinEligible === false || product?.isSuperCoinEligible === "false" || product?.isSuperCoinEligible === 0 || product?.isSuperCoinEligible === "0"),
      maxSuperCoinDiscountPct: Number(product?.maxSuperCoinDiscountPct !== undefined ? product.maxSuperCoinDiscountPct : 10),
      isReferralEligible: !(product?.isReferralEligible === false || product?.isReferralEligible === "false" || product?.isReferralEligible === 0 || product?.isReferralEligible === "0"),
      referralDiscountPct: Number(product?.referralDiscountPct !== undefined ? product.referralDiscountPct : 5),
    };
    navigation.navigate("Checkout", { buyNowItem, singleItemCheckout: true });
  };

  // Tasting notes parsing
  const rawNotes = product?.tastingNotes || product?.details?.tastingNotes || [];
  const tastingNotes = Array.isArray(rawNotes)
    ? rawNotes
    : typeof rawNotes === "string"
    ? rawNotes.split(",").map((s) => s.trim())
    : [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <AppHeader
        title={brandName}
        isGradient={false}
        backgroundColor="#0c0a08"
        statusBarColor="#0c0a08"
        statusBarStyle="light-content"
        rightButtons={[]}
        height={headerHeight}
        titleStyle={{ color: "#FFFFFF", fontSize: 18, fontWeight: "700" }}
        isShowShadow={false}
        navigation={navigation}
        isBack={true}
        backButtonStyle={{ width: 35, height: 25, alignItems: "center" }}
        backIconColor="white"
        logoImage={null}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Breadcrumb Hierarchy (Web-style) */}
        <View style={styles.breadcrumbRow}>
          <Text style={styles.breadcrumbMuted}>HOME</Text>
          <Text style={styles.breadcrumbSlash}>/</Text>
          <Text style={styles.breadcrumbGold}>{categoryName.toUpperCase()}</Text>
          <Text style={styles.breadcrumbSlash}>/</Text>
          <Text style={styles.breadcrumbLight} numberOfLines={1}>
            {product?.name}
          </Text>
        </View>

        {/* Floating Bottle Showcase with GOLDEN GRADIENT HALO PEDESTAL */}
        <View style={styles.showcaseWrapper}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setZoomVisible(true)}
            style={styles.mainImageTouch}
          >
            <LinearGradient
              colors={["#e5c06e", "#634c22", "#d4af37"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.goldBottleHalo}
            >
              <View style={styles.bottlePedestal}>
                <Image
                  source={productImages[mainImage]}
                  style={styles.mainBottleImage}
                  resizeMode="contain"
                />

                {/* Tap to Zoom Prompt */}
                <View style={styles.zoomBadge}>
                  <Text style={styles.zoomText}>Tap bottle to zoom</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Wishlist Floating Button */}
          <TouchableOpacity
            style={[
              styles.floatingWishlist,
              isWishlisted && {
                backgroundColor: "rgba(201, 151, 66, 0.25)",
                borderColor: "rgba(245, 194, 66, 0.85)",
              },
            ]}
            onPress={toggleWishlist}
            activeOpacity={0.8}
          >
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <Image
                source={
                  isWishlisted
                    ? require("../resources/assets/heart.png")
                    : require("../resources/assets/wishlist.png")
                }
                style={[styles.wishlistIcon, { tintColor: isWishlisted ? "#f5c242" : "#fff" }]}
              />
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* Gallery Thumbnails */}
        {productImages.length > 1 && (
          <View style={styles.thumbnailRow}>
            {productImages.map((img, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setMainImage(index)}
                style={[
                  styles.thumbContainer,
                  mainImage === index && styles.thumbSelected,
                ]}
              >
                <Image source={img} style={styles.thumbnail} resizeMode="contain" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Taxonomy Badges */}
        <View style={styles.badgeRow}>
          <View style={styles.tagPill}>
            <Text style={styles.tagMuted}>CATEGORY: </Text>
            <Text style={styles.tagHighlight}>{categoryName}</Text>
          </View>
          {subcategory ? (
            <View style={styles.tagPillGold}>
              <Text style={styles.tagMuted}>STYLE: </Text>
              <Text style={styles.tagGold}>{subcategory}</Text>
            </View>
          ) : null}
          <View style={styles.tagPill}>
            <Text style={styles.tagHighlight}>{countryName}</Text>
          </View>
        </View>

        {/* Product Title & Brand */}
        <Text style={styles.brandTitle}>{brandName}</Text>
        <Text style={styles.productTitle}>{product?.name}</Text>
        <Text style={styles.skuText}>
          SKU: {String(product?.skuid || product?.id || "").toUpperCase().slice(0, 12)}
        </Text>

        {/* Pricing & Stock Card */}
        <LinearGradient
          colors={["#1c1711", "#120f0c"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.priceCard}
        >
          <View style={styles.priceHeader}>
            <Text style={styles.priceLabel}>PRICE</Text>
            <View style={[styles.stockBadge, inStock ? styles.stockIn : styles.stockOut]}>
              <View style={[styles.stockDot, inStock ? styles.stockDotIn : styles.stockDotOut]} />
              <Text style={[styles.stockText, inStock ? styles.stockTextIn : styles.stockTextOut]}>
                {inStock ? "IN STOCK" : "OUT OF STOCK"}
              </Text>
            </View>
          </View>

          <View style={styles.priceValueRow}>
            <Text style={styles.priceAmount}>{formatPrice(finalPrice * quantity)}</Text>
            <View style={styles.vatBadge}>
              <Text style={styles.vatBadgeText}>Incl. 15% VAT</Text>
            </View>
            {hasDiscount && <Text style={styles.strikePrice}>{formatPrice(origPrice * quantity)}</Text>}
            {quantity > 1 && (
              <Text style={styles.unitPriceNote}>({formatPrice(finalPrice)} each)</Text>
            )}
          </View>

          <Text style={styles.priceFootnote}>
            15% South African VAT Included • Delivery calculated at checkout
          </Text>
        </LinearGradient>

        {/* Quantity Selector & Dual Purchase Actions (Premium & Simple) */}
        <View style={styles.purchaseContainer}>
          {/* Quantity Row */}
          <View style={styles.qtyRow}>
            <Text style={styles.qtyLabel}>Quantity</Text>
            <View style={styles.quantityBox}>
              <TouchableOpacity
                activeOpacity={0.65}
                onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                style={styles.qtyBtn}
              >
                <Text style={styles.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtyNumber}>{quantity}</Text>
              <TouchableOpacity
                activeOpacity={0.65}
                onPress={() => setQuantity((q) => Math.min(99, q + 1))}
                style={styles.qtyBtn}
              >
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Dual Action Buttons: Side by Side with Icons, No Price */}
          <View style={styles.actionButtonsRow}>
            {/* 1. Add to Cart Button (With Icon, No Price) */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleAddToCart}
              style={styles.addToCartTouch}
              disabled={isAddingToCart}
            >
              <View style={styles.addToCartBtn}>
                <Image
                  source={require("../resources/images/shopping-cart.png")}
                  style={styles.addToCartBtnIcon}
                  resizeMode="contain"
                />
                <Text style={styles.addToCartBtnText}>
                  {isAddingToCart ? "Adding..." : "Add to Cart"}
                </Text>
              </View>
            </TouchableOpacity>

            {/* 2. Buy Now Button (With Icon, No Price) */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setIsBuyNowModalVisible(true)}
              style={styles.buyNowTouch}
            >
              <LinearGradient
                colors={["#241f1a", "#15120e", "#0a0907"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buyNowBtn}
              >
                <Image
                  source={require("../resources/assets/bag.png")}
                  style={styles.buyNowBtnIcon}
                  resizeMode="contain"
                />
                <Text style={styles.buyNowBtnText}>
                  Buy Now
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottle Identity: Key Facts At a Glance (Matching Web Version) */}
        <View style={styles.specsCard}>
          <View style={styles.specsHeader}>
            <Text style={styles.specsEyebrow}>AT A GLANCE</Text>
            <Text style={styles.specsTitle}>Bottle Identity</Text>
          </View>

          <View style={styles.specsGrid}>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>TYPE</Text>
              <Text style={styles.specValue}>{categoryName}</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>STYLE</Text>
              <Text style={styles.specValue}>{subcategory || "Classic"}</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>ORIGIN</Text>
              <Text style={styles.specValue}>{countryName}</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>BOTTLE SIZE</Text>
              <Text style={styles.specValue}>{bottleSize}</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>ABV</Text>
              <Text style={styles.specValue}>{abv}</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>VINTAGE / AGE</Text>
              <Text style={styles.specValue}>{vintage}</Text>
            </View>
          </View>
        </View>

        {/* Curator's Description */}
        {product?.description ? (
          <View style={styles.detailSection}>
            <Text style={styles.sectionHeading}>About this {categoryName.toLowerCase()}</Text>
            <Text
              style={styles.descriptionText}
              numberOfLines={isDescriptionExpanded ? undefined : 3}
              ellipsizeMode="tail"
            >
              {product.description}
            </Text>
            {product.description.length > 90 && (
              <TouchableOpacity
                onPress={toggleDescription}
                style={styles.readMoreBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.readMoreText}>
                  {isDescriptionExpanded ? "Read Less ▴" : "Read More ▾"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        {/* Tasting Notes */}
        {tastingNotes.length > 0 && (
          <View style={styles.detailSection}>
            <Text style={styles.sectionHeadingGold}>Tasting Notes</Text>
            <View style={styles.notesList}>
              {tastingNotes.map((note, idx) => (
                <View key={idx} style={styles.noteRow}>
                  <Text style={styles.noteBullet}>◆</Text>
                  <Text style={styles.noteText}>{note}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Delivery & Fulfillment Card */}
        <View style={styles.deliveryCard}>
          <View style={styles.deliveryHeaderRow}>
            <View style={styles.deliveryIconBadge}>
              <Text style={styles.deliveryIconText}>◈</Text>
            </View>
            <Text style={styles.deliveryHeaderTitle}>DELIVERY & FULFILLMENT</Text>
          </View>
          <View style={styles.deliveryGrid}>
            <View style={styles.deliveryCol}>
              <Text style={styles.deliveryLabel}>FULFILLED BY</Text>
              <Text style={styles.deliveryValue}>
                {product?.vendorName || "The Grand Store Private Cellar"}
              </Text>
            </View>
            <View style={styles.deliveryCol}>
              <Text style={styles.deliveryLabel}>GLOBAL SHIPPING</Text>
              <Text style={styles.deliveryValue}>
                Worldwide Delivery Available
              </Text>
            </View>
          </View>
          <View style={styles.deliveryDivider} />
          <View style={styles.deliveryEstimateRow}>
            <Text style={styles.deliveryEstimateText}>
              Delivery: <Text style={styles.deliveryEstimateBold}>Calculated at checkout</Text>
            </Text>
            <Text style={styles.deliveryFreeText}>Worldwide Insured Transit</Text>
          </View>
        </View>

        {/* South Africa Legal Drinking Warning Banner (Aware.org.za) */}
        <View style={styles.warningBanner}>
          <View style={styles.warningBadge}>
            <Text style={styles.warningBadgeText}>#NO 18</Text>
          </View>
          <View style={styles.warningTextContainer}>
            <Text style={styles.warningTitle}>AWARE.ORG.ZA</Text>
            <Text style={styles.warningDesc}>
              Drink responsibly. Not for sale to persons under the age of 18.
            </Text>
          </View>
        </View>

        {/* Sommelier Serving & Cellar Guide */}
        <View style={styles.servingCard}>
          <Text style={styles.servingEyebrow}>SOMMELIER GUIDE</Text>
          <Text style={styles.servingTitle}>Serving & Cellar Care</Text>
          <View style={styles.servingRow}>
            <View style={styles.servingBulletBadge}>
              <Text style={styles.servingBulletText}>◈</Text>
            </View>
            <View style={styles.servingCol}>
              <Text style={styles.servingParam}>IDEAL TEMPERATURE</Text>
              <Text style={styles.servingVal}>{servingGuide.temp}</Text>
            </View>
          </View>
          <View style={styles.servingRow}>
            <View style={styles.servingBulletBadge}>
              <Text style={styles.servingBulletText}>◈</Text>
            </View>
            <View style={styles.servingCol}>
              <Text style={styles.servingParam}>RECOMMENDED GLASSWARE</Text>
              <Text style={styles.servingVal}>{servingGuide.glass}</Text>
            </View>
          </View>
          <View style={styles.servingRow}>
            <View style={styles.servingBulletBadge}>
              <Text style={styles.servingBulletText}>◈</Text>
            </View>
            <View style={styles.servingCol}>
              <Text style={styles.servingParam}>CELLAR STORAGE</Text>
              <Text style={styles.servingVal}>{servingGuide.cellar}</Text>
            </View>
          </View>
          <View style={styles.servingRow}>
            <View style={styles.servingBulletBadge}>
              <Text style={styles.servingBulletText}>◈</Text>
            </View>
            <View style={styles.servingCol}>
              <Text style={styles.servingParam}>PAIRING RECOMMENDATION</Text>
              <Text style={styles.servingVal}>{servingGuide.pairing}</Text>
            </View>
          </View>
        </View>

        {/* Customer Reviews Section */}
        <View style={styles.reviewsCard}>
          <View style={styles.reviewsHeaderRow}>
            <View>
              <Text style={styles.reviewsEyebrow}>VERIFIED CONNOISSEURS</Text>
              <Text style={styles.reviewsMainTitle}>Customer Reviews</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setIsReviewModalVisible(true)}
              style={styles.writeReviewBtn}
            >
              <LinearGradient
                colors={["#f0c768", "#c99742"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.writeReviewGrad}
              >
                <Text style={styles.writeReviewText}>+ WRITE REVIEW</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Rating Summary Score Card */}
          <View style={styles.scoreSummaryBox}>
            <View style={styles.scoreLeft}>
              <Text style={styles.scoreBigNumber}>{reviewSummary.averageRating.toFixed(1)}</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Text
                    key={s}
                    style={[
                      styles.starIcon,
                      s <= Math.round(reviewSummary.averageRating) ? styles.starFilled : styles.starEmpty,
                    ]}
                  >
                    ★
                  </Text>
                ))}
              </View>
              <Text style={styles.scoreCountText}>
                {reviewSummary.reviewCount} {reviewSummary.reviewCount === 1 ? "review" : "verified reviews"}
              </Text>
            </View>

            <View style={styles.scoreDivider} />

            {/* Star Distribution Bars */}
            <View style={styles.barsContainer}>
              {[
                { stars: "5★", pct: "85%" },
                { stars: "4★", pct: "12%" },
                { stars: "3★", pct: "3%" },
                { stars: "2★", pct: "0%" },
                { stars: "1★", pct: "0%" },
              ].map((bar, idx) => (
                <View key={idx} style={styles.barRow}>
                  <Text style={styles.barStarLabel}>{bar.stars}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: bar.pct }]} />
                  </View>
                  <Text style={styles.barPctText}>{bar.pct}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Review List */}
          {reviews.length > 0 ? (
            <View style={styles.reviewList}>
              {reviews.map((rev, idx) => {
                const authorName = rev.author?.name || rev.authorName || "Verified Connoisseur";
                const ratingNum = rev.ratings?.overall || rev.rating || 5;
                const commentText = rev.comment || rev.text || "Exceptional taste and finish.";
                const dateStr = rev.createdAt
                  ? new Date(rev.createdAt).toLocaleDateString("en-ZA", {
                      month: "short",
                      year: "numeric",
                    })
                  : "Recent";

                return (
                  <View key={rev._id || idx} style={styles.reviewItemCard}>
                    <View style={styles.reviewItemTop}>
                      <View style={styles.reviewerAvatar}>
                        <Text style={styles.reviewerAvatarText}>
                          {authorName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.reviewerInfo}>
                        <View style={styles.reviewerNameRow}>
                          <Text style={styles.reviewerName}>{authorName}</Text>
                          <View style={styles.verifiedBadge}>
                            <Text style={styles.verifiedText}>✓ VERIFIED</Text>
                          </View>
                        </View>
                        <Text style={styles.reviewDate}>{dateStr}</Text>
                      </View>
                    </View>

                    <View style={styles.starsRowSmall}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Text
                          key={s}
                          style={[
                            styles.starIconSmall,
                            s <= ratingNum ? styles.starFilled : styles.starEmpty,
                          ]}
                        >
                          ★
                        </Text>
                      ))}
                    </View>

                    <Text style={styles.reviewComment}>{commentText}</Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyReviewsBox}>
              <Text style={styles.emptyReviewIcon}>◈</Text>
              <Text style={styles.emptyReviewTitle}>No Reviews Yet</Text>
              <Text style={styles.emptyReviewDesc}>
                Be the first cellar connoisseur to taste and review this bottle!
              </Text>
              <TouchableOpacity
                onPress={() => setIsReviewModalVisible(true)}
                style={styles.firstReviewBtn}
              >
                <Text style={styles.firstReviewBtnText}>Write the First Review →</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Grandstore 100% Satisfaction Guarantee Banner & Certificate Link */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => setIsCertificateModalVisible(true)}
          style={styles.guaranteeTouch}
        >
          <LinearGradient
            colors={["#2b2214", "#15110c"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.guaranteeCardNew}
          >
            <View style={styles.guaranteeBadgeIcon}>
              <Text style={styles.guaranteeBadgeStar}>★</Text>
            </View>
            <View style={styles.guaranteeTextWrap}>
              <Text style={styles.guaranteeTitleNew}>THE GRAND STORE GUARANTEE</Text>
              <Text style={styles.guaranteeDescNew}>
                Shop with our 100% satisfaction promise. Authenticity verified & private cellar assured.
              </Text>
              <Text style={styles.viewCertLink}>View Official Guarantee Certificate →</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Related Products / You Might Also Like */}
        {related_products && related_products.length > 0 && (
          <View style={styles.relatedSection}>
            <Text style={styles.relatedTitle}>You Might Also Like</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {related_products.map((item, index) => {
                const rImg = item.image?.startsWith("http")
                  ? item.image
                  : `${IMAGE_BASE_URL}${item.image}`;
                return (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.85}
                    style={styles.relatedCard}
                    onPress={() =>
                      navigation.push("ProductDetails", {
                        product: item,
                        category: item.category || category,
                        related_products,
                      })
                    }
                  >
                    <LinearGradient
                      colors={["#e5c06e", "#634c22", "#d4af37"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.relatedHalo}
                    >
                      <View style={styles.relatedPedestal}>
                        <Image
                          source={{ uri: rImg }}
                          style={styles.relatedImg}
                          resizeMode="contain"
                        />
                      </View>
                    </LinearGradient>
                    <Text style={styles.relatedName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.relatedPrice}>
                      {formatPrice(item.offer_price || item.final_price || item.price)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Zoom Modal */}
      <Modal visible={zoomVisible} transparent={true} onRequestClose={() => setZoomVisible(false)}>
        <ImageViewer
          imageUrls={zoomImages}
          index={mainImage}
          enableSwipeDown={true}
          onSwipeDown={() => setZoomVisible(false)}
          onCancel={() => setZoomVisible(false)}
        />
      </Modal>

      {/* Write a Review Modal */}
      <Modal
        visible={isReviewModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsReviewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.reviewModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Write a Tasting Review</Text>
              <TouchableOpacity onPress={() => setIsReviewModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub} numberOfLines={1}>{product?.name}</Text>

            {/* Interactive Star Picker */}
            <Text style={styles.ratingPickerLabel}>Your Rating:</Text>
            <View style={styles.interactiveStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setNewReviewRating(star)}
                  style={styles.starTouch}
                >
                  <Text
                    style={[
                      styles.starInteractive,
                      star <= newReviewRating ? styles.starFilled : styles.starEmpty,
                    ]}
                  >
                    ★
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Review Comment Input */}
            <Text style={styles.inputLabel}>Tasting Notes & Impression:</Text>
            <TextInput
              style={styles.reviewInput}
              multiline
              numberOfLines={4}
              placeholder="Describe aroma, palate, finish, or cellar aging..."
              placeholderTextColor="#666"
              value={newReviewComment}
              onChangeText={setNewReviewComment}
            />

            {/* Submit Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSubmitReview}
              disabled={isSubmittingReview}
              style={styles.submitReviewBtn}
            >
              <LinearGradient
                colors={["#f0c768", "#c99742"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitReviewGrad}
              >
                {isSubmittingReview ? (
                  <ActivityIndicator color="#111" />
                ) : (
                  <Text style={styles.submitReviewText}>SUBMIT REVIEW</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 100% Satisfaction Guarantee Certificate Modal */}
      <Modal
        visible={isCertificateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCertificateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.certContainer}>
            <TouchableOpacity
              style={styles.certCloseBtn}
              onPress={() => setIsCertificateModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>

            <View style={styles.certGoldBorder}>
              <Text style={styles.certFlourish}>✦ ✦ ✦</Text>
              <Text style={styles.certHeading}>THE GRAND STORE</Text>
              <Text style={styles.certSubheading}>CERTIFICATE OF AUTHENTICITY</Text>
              <View style={styles.certGoldLine} />

              <Text style={styles.certBody}>
                Your Satisfaction is 100% Guaranteed!{"\n\n"}
                Our reputation rests on making you a Happy Connoisseur today and forever. Every bottle dispatched from our private cellars has been verified for provenance, stored under strict temperature control, and insured nationwide.{"\n\n"}
                BUY WITH CONFIDENCE.
              </Text>

              <View style={styles.certSeal}>
                <Text style={styles.certSealText}>★ 100% SATISFACTION ★</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ⚡ Buy Now Confirmation Modal ⚡ */}
      <Modal
        visible={isBuyNowModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsBuyNowModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.buyNowCard}>
            <View style={styles.buyNowHeader}>
              <Text style={styles.buyNowHeaderTitle}>Instant Checkout</Text>
              <TouchableOpacity onPress={() => setIsBuyNowModalVisible(false)}>
                <Text style={styles.buyNowClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.buyNowItemRow}>
              {bottleImage ? (
                <Image source={{ uri: getImageUrl(bottleImage) }} style={styles.buyNowThumb} />
              ) : null}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.buyNowItemName} numberOfLines={2}>
                  {product?.name || product?.title}
                </Text>
                <Text style={styles.buyNowItemSub}>{bottleSize} • Quantity: {quantity}</Text>
                <Text style={styles.buyNowItemPrice}>Total: {formatPrice(finalPrice * quantity)}</Text>
              </View>
            </View>

            <Text style={styles.buyNowNotice}>
              Are you sure you want to proceed directly to checkout with this bottle?
            </Text>

            <View style={styles.buyNowActions}>
              <TouchableOpacity
                style={styles.buyNowCancelBtn}
                onPress={() => setIsBuyNowModalVisible(false)}
              >
                <Text style={styles.buyNowCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.buyNowConfirmTouch}
                onPress={confirmBuyNow}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={["#28221b", "#16130f", "#0a0907"]}
                  style={styles.buyNowConfirmBtn}
                >
                  <Text style={styles.buyNowConfirmText}>Proceed to Checkout →</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0a0907",
  },
  container: {
    flex: 1,
    backgroundColor: "#0a0907",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  breadcrumbRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 6,
  },
  breadcrumbMuted: {
    color: "#8a8275",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  breadcrumbSlash: {
    color: "#555",
    fontSize: 11,
  },
  breadcrumbGold: {
    color: "#d4af37",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  breadcrumbLight: {
    color: "#eee",
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
  },
  showcaseWrapper: {
    alignItems: "center",
    marginBottom: 16,
  },
  mainImageTouch: {
    width: "100%",
  },
  goldBottleHalo: {
    padding: 1.5,
    borderRadius: 18,
    shadowColor: "#d4af37",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  bottlePedestal: {
    backgroundColor: "#13100c",
    borderRadius: 17,
    height: 320,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  mainBottleImage: {
    width: "85%",
    height: 270,
  },
  zoomBadge: {
    position: "absolute",
    bottom: 10,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: "rgba(201, 151, 66, 0.4)",
  },
  zoomText: {
    color: "#d4af37",
    fontSize: 10,
    fontWeight: "600",
  },
  floatingWishlist: {
    position: "absolute",
    top: 14,
    right: 14,
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.5)",
    elevation: 4,
  },
  wishlistIcon: {
    width: 20,
    height: 20,
  },
  thumbnailRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 16,
    gap: 10,
  },
  thumbContainer: {
    padding: 2,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "transparent",
    backgroundColor: "#15120e",
  },
  thumbSelected: {
    borderColor: "#c99742",
  },
  thumbnail: {
    width: 60,
    height: 70,
    borderRadius: 8,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  tagPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16130f",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  tagPillGold: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(201, 151, 66, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.35)",
  },
  tagMuted: {
    color: "#888",
    fontSize: 10,
    fontWeight: "700",
  },
  tagHighlight: {
    color: "#f5ede0",
    fontSize: 11,
    fontWeight: "600",
  },
  tagGold: {
    color: "#d4af37",
    fontSize: 11,
    fontWeight: "700",
  },
  brandTitle: {
    color: "#c99742",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginTop: 4,
  },
  productTitle: {
    color: "#f8f5ee",
    fontSize: 24,
    fontWeight: "700",
    marginVertical: 4,
    lineHeight: 30,
  },
  skuText: {
    color: "#777",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  priceCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.3)",
    marginBottom: 18,
  },
  priceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceLabel: {
    color: "#aaa",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  stockBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 6,
  },
  stockIn: {
    backgroundColor: "rgba(46, 196, 182, 0.15)",
    borderWidth: 0.8,
    borderColor: "#2ec4b6",
  },
  stockOut: {
    backgroundColor: "rgba(230, 57, 70, 0.15)",
    borderWidth: 0.8,
    borderColor: "#e63946",
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stockDotIn: {
    backgroundColor: "#2ec4b6",
  },
  stockDotOut: {
    backgroundColor: "#e63946",
  },
  stockText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  stockTextIn: {
    color: "#2ec4b6",
  },
  stockTextOut: {
    color: "#e63946",
  },
  priceValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 8,
    gap: 10,
  },
  priceAmount: {
    color: "#f5c242",
    fontSize: 30,
    fontWeight: "800",
  },
  strikePrice: {
    color: "#888",
    fontSize: 16,
    textDecorationLine: "line-through",
  },
  unitPriceNote: {
    color: "#918a7f",
    fontSize: 13,
    fontWeight: "600",
  },
  priceFootnote: {
    color: "#777",
    fontSize: 11,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    paddingTop: 8,
  },
  purchaseContainer: {
    marginVertical: 16,
  },
  qtyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#14110e",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.2)",
    marginBottom: 12,
  },
  qtyLabel: {
    color: "#ccc",
    fontSize: 14,
    fontWeight: "600",
  },
  quantityBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0d0b09",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.4)",
    height: 38,
  },
  qtyBtn: {
    width: 36,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
  },
  qtyBtnText: {
    color: "#f5c242",
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 22,
  },
  qtyNumber: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    paddingHorizontal: 6,
    minWidth: 26,
    textAlign: "center",
  },
  actionButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  addToCartTouch: {
    flex: 1,
    marginRight: 6,
  },
  addToCartBtn: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: "rgba(255, 255, 255, 0.18)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  addToCartBtnIcon: {
    width: 16,
    height: 16,
    tintColor: "#c99742",
    marginRight: 8,
  },
  addToCartBtnText: {
    color: "#e2ded6",
    fontSize: 14.5,
    fontWeight: "700",
    letterSpacing: 0.4,
    textAlign: "center",
    fontFamily: APP_FONT,
  },
  buyNowTouch: {
    flex: 1,
    marginLeft: 6,
  },
  buyNowBtn: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.4,
    borderColor: "#c99742",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
    shadowColor: "#c99742",
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  buyNowBtnIcon: {
    width: 15,
    height: 15,
    tintColor: "#f8f5ee",
    marginRight: 8,
  },
  buyNowBtnText: {
    color: "#f8f5ee",
    fontSize: 14.5,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    textAlign: "center",
    fontFamily: APP_FONT,
  },
  buyNowCard: {
    width: "88%",
    backgroundColor: "#16130f",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.4)",
    padding: 20,
    elevation: 10,
  },
  buyNowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    paddingBottom: 12,
    marginBottom: 16,
  },
  buyNowHeaderTitle: {
    color: "#f5c242",
    fontSize: 17,
    fontWeight: "700",
  },
  buyNowClose: {
    color: "#888",
    fontSize: 18,
    fontWeight: "700",
    padding: 4,
  },
  buyNowItemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    marginBottom: 14,
  },
  buyNowThumb: {
    width: 48,
    height: 60,
    resizeMode: "contain",
  },
  buyNowItemName: {
    color: "#f8f5ee",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  buyNowItemSub: {
    color: "#999",
    fontSize: 12,
    marginBottom: 4,
  },
  buyNowItemPrice: {
    color: "#f5c242",
    fontSize: 15,
    fontWeight: "800",
  },
  buyNowNotice: {
    color: "#ccc",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 18,
  },
  buyNowActions: {
    flexDirection: "row",
    gap: 10,
  },
  buyNowCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  buyNowCancelText: {
    color: "#bbb",
    fontSize: 14,
    fontWeight: "600",
  },
  buyNowConfirmTouch: {
    flex: 1.4,
  },
  buyNowConfirmBtn: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: "#c99742",
    justifyContent: "center",
    alignItems: "center",
  },
  buyNowConfirmText: {
    color: "#f8f5ee",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  specsCard: {
    backgroundColor: "#13100c",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.25)",
    marginBottom: 20,
  },
  specsHeader: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    paddingBottom: 10,
    marginBottom: 14,
  },
  specsEyebrow: {
    color: "#8a8275",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  specsTitle: {
    color: "#f8f5ee",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 2,
  },
  specsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 14,
  },
  specItem: {
    width: "50%",
    paddingRight: 8,
  },
  specLabel: {
    color: "#8a8275",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  specValue: {
    color: "#eee8dd",
    fontSize: 14,
    fontWeight: "600",
  },
  detailSection: {
    marginBottom: 20,
    backgroundColor: "#13100c",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  sectionHeading: {
    color: "#eee",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  sectionHeadingGold: {
    color: "#d4af37",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  descriptionText: {
    color: "#aaa195",
    fontSize: 13,
    lineHeight: 20,
  },
  readMoreBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
    paddingVertical: 5,
    paddingHorizontal: 12,
    backgroundColor: "rgba(201, 151, 66, 0.14)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(245, 194, 66, 0.35)",
  },
  readMoreText: {
    color: "#f5c242",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  notesList: {
    gap: 8,
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  noteBullet: {
    color: "#c99742",
    fontSize: 10,
    marginTop: 2,
  },
  noteText: {
    color: "#eee",
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  guaranteeCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.4)",
    marginBottom: 24,
  },
  guaranteeTitle: {
    color: "#d4af37",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 4,
  },
  guaranteeDesc: {
    color: "#bbb",
    fontSize: 11,
    lineHeight: 16,
  },
  /* Delivery & Fulfillment */
  deliveryCard: {
    backgroundColor: "#13100c",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.25)",
    padding: 16,
    marginBottom: 16,
  },
  deliveryHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  deliveryIconBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(201, 151, 66, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  deliveryIconText: {
    color: "#c99742",
    fontSize: 10,
    fontWeight: "700",
  },
  deliveryHeaderTitle: {
    color: "#d4af37",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  deliveryGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  deliveryCol: {
    flex: 1,
  },
  deliveryLabel: {
    color: "#888",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  deliveryValue: {
    color: "#eee",
    fontSize: 13,
    fontWeight: "600",
  },
  deliveryDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginVertical: 10,
  },
  deliveryEstimateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  deliveryEstimateText: {
    color: "#aaa",
    fontSize: 12,
  },
  deliveryEstimateBold: {
    color: "#f5c242",
    fontWeight: "700",
  },
  deliveryFreeText: {
    color: "#2ec4b6",
    fontSize: 11,
    fontWeight: "600",
  },

  /* Warning Banner (Aware.org.za) */
  warningBanner: {
    backgroundColor: "#0d0a08",
    borderWidth: 1,
    borderColor: "rgba(232, 76, 34, 0.3)",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  warningBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: "#e84c22",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(232, 76, 34, 0.1)",
  },
  warningBadgeText: {
    color: "#e84c22",
    fontSize: 9,
    fontWeight: "900",
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    color: "#e84c22",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 2,
  },
  warningDesc: {
    color: "#bbb",
    fontSize: 11,
    lineHeight: 15,
  },

  /* Sommelier Guide */
  servingCard: {
    backgroundColor: "#110e0b",
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.2)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  servingEyebrow: {
    color: "#c99742",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  servingTitle: {
    color: "#eee",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 14,
  },
  servingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 10,
  },
  servingBulletBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(201, 151, 66, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.35)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    marginTop: 2,
  },
  servingBulletText: {
    color: "#c99742",
    fontSize: 10,
    fontWeight: "800",
  },
  servingCol: {
    flex: 1,
  },
  servingParam: {
    color: "#888",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  servingVal: {
    color: "#ddd",
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },

  /* Customer Reviews Card */
  reviewsCard: {
    backgroundColor: "#120f0c",
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.25)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  reviewsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  reviewsEyebrow: {
    color: "#c99742",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  reviewsMainTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 2,
  },
  writeReviewBtn: {
    borderRadius: 20,
    overflow: "hidden",
  },
  writeReviewGrad: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  writeReviewText: {
    color: "#111",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  /* Score Summary */
  scoreSummaryBox: {
    flexDirection: "row",
    backgroundColor: "#0d0b08",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  scoreLeft: {
    alignItems: "center",
    justifyContent: "center",
    width: "38%",
  },
  scoreBigNumber: {
    color: "#f5c242",
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 38,
  },
  starsRow: {
    flexDirection: "row",
    gap: 2,
    marginVertical: 4,
  },
  starIcon: {
    fontSize: 16,
  },
  starFilled: {
    color: "#f5c242",
  },
  starEmpty: {
    color: "#444",
  },
  scoreCountText: {
    color: "#888",
    fontSize: 10,
    textAlign: "center",
    marginTop: 2,
  },
  scoreDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginHorizontal: 12,
  },
  barsContainer: {
    flex: 1,
    justifyContent: "center",
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 2,
    gap: 6,
  },
  barStarLabel: {
    color: "#888",
    fontSize: 10,
    width: 22,
    fontWeight: "600",
  },
  barTrack: {
    flex: 1,
    height: 5,
    backgroundColor: "#222",
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: "#d4af37",
    borderRadius: 3,
  },
  barPctText: {
    color: "#666",
    fontSize: 10,
    width: 26,
    textAlign: "right",
  },

  /* Review List */
  reviewList: {
    gap: 12,
  },
  reviewItemCard: {
    backgroundColor: "#17130f",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  reviewItemTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 10,
  },
  reviewerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#352a1b",
    borderWidth: 1,
    borderColor: "#c99742",
    justifyContent: "center",
    alignItems: "center",
  },
  reviewerAvatarText: {
    color: "#f5c242",
    fontSize: 13,
    fontWeight: "800",
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  reviewerName: {
    color: "#eee",
    fontSize: 13,
    fontWeight: "700",
  },
  verifiedBadge: {
    backgroundColor: "rgba(46, 196, 182, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  verifiedText: {
    color: "#2ec4b6",
    fontSize: 8,
    fontWeight: "800",
  },
  reviewDate: {
    color: "#777",
    fontSize: 10,
    marginTop: 1,
  },
  starsRowSmall: {
    flexDirection: "row",
    gap: 2,
    marginBottom: 6,
  },
  starIconSmall: {
    fontSize: 12,
  },
  reviewComment: {
    color: "#ccc",
    fontSize: 12,
    lineHeight: 17,
  },

  /* Empty Reviews */
  emptyReviewsBox: {
    alignItems: "center",
    paddingVertical: 20,
  },
  emptyReviewIcon: {
    fontSize: 32,
    marginBottom: 6,
  },
  emptyReviewTitle: {
    color: "#eee",
    fontSize: 14,
    fontWeight: "700",
  },
  emptyReviewDesc: {
    color: "#888",
    fontSize: 12,
    textAlign: "center",
    marginVertical: 6,
    paddingHorizontal: 16,
  },
  firstReviewBtn: {
    marginTop: 6,
  },
  firstReviewBtnText: {
    color: "#f5c242",
    fontSize: 12,
    fontWeight: "700",
  },

  /* Guarantee Banner New */
  guaranteeTouch: {
    marginBottom: 18,
  },
  guaranteeCardNew: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.4)",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  guaranteeBadgeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(201, 151, 66, 0.15)",
    borderWidth: 1.5,
    borderColor: "#d4af37",
    justifyContent: "center",
    alignItems: "center",
  },
  guaranteeBadgeStar: {
    color: "#d4af37",
    fontSize: 20,
  },
  guaranteeTextWrap: {
    flex: 1,
  },
  guaranteeTitleNew: {
    color: "#f5c242",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 2,
  },
  guaranteeDescNew: {
    color: "#ccc",
    fontSize: 11,
    lineHeight: 15,
  },
  viewCertLink: {
    color: "#e5c06e",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 6,
  },

  /* Modal Base */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },

  /* Review Modal */
  reviewModalContainer: {
    width: "100%",
    backgroundColor: "#16120e",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.4)",
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  modalTitle: {
    color: "#f5c242",
    fontSize: 17,
    fontWeight: "800",
  },
  modalCloseText: {
    color: "#aaa",
    fontSize: 18,
    fontWeight: "700",
    padding: 4,
  },
  modalSub: {
    color: "#888",
    fontSize: 12,
    marginBottom: 16,
  },
  ratingPickerLabel: {
    color: "#ddd",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  interactiveStars: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  starTouch: {
    padding: 4,
  },
  starInteractive: {
    fontSize: 32,
  },
  inputLabel: {
    color: "#ddd",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  reviewInput: {
    backgroundColor: "#0d0a08",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 10,
    color: "#eee",
    padding: 12,
    fontSize: 13,
    minHeight: 90,
    textAlignVertical: "top",
    marginBottom: 18,
  },
  submitReviewBtn: {
    borderRadius: 12,
    overflow: "hidden",
  },
  submitReviewGrad: {
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  submitReviewText: {
    color: "#111",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
  },

  /* Certificate Modal */
  certContainer: {
    width: "100%",
    backgroundColor: "#181410",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#d4af37",
    padding: 20,
    position: "relative",
  },
  certCloseBtn: {
    position: "absolute",
    top: 10,
    right: 12,
    zIndex: 10,
  },
  certGoldBorder: {
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.4)",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  certFlourish: {
    color: "#d4af37",
    fontSize: 14,
    letterSpacing: 4,
    marginBottom: 6,
  },
  certHeading: {
    color: "#f5c242",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 2,
  },
  certSubheading: {
    color: "#ddd",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginTop: 2,
    marginBottom: 10,
  },
  certGoldLine: {
    width: 60,
    height: 1.5,
    backgroundColor: "#d4af37",
    marginBottom: 14,
  },
  certBody: {
    color: "#ccc",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginBottom: 16,
    fontStyle: "italic",
  },
  certSeal: {
    borderWidth: 1,
    borderColor: "#d4af37",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    backgroundColor: "rgba(212, 175, 55, 0.1)",
  },
  certSealText: {
    color: "#f5c242",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  relatedSection: {
    marginTop: 6,
  },
  relatedTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  relatedCard: {
    width: 130,
    marginRight: 14,
    alignItems: "center",
  },
  relatedHalo: {
    padding: 1.2,
    borderRadius: 12,
    width: "100%",
    marginBottom: 6,
  },
  relatedPedestal: {
    backgroundColor: "#13100c",
    borderRadius: 11,
    height: 120,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  relatedImg: {
    width: "80%",
    height: 100,
  },
  relatedName: {
    color: "#ddd",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  relatedPrice: {
    color: "#f5c242",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  loyaltyPerksContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  loyaltyPerkRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 2,
  },
  loyaltyCoinIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  loyaltyGiftIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  loyaltyPerkText: {
    color: "#b5aba0",
    fontSize: 11,
    flex: 1,
  },
  loyaltyGoldText: {
    color: "#e1bd70",
    fontWeight: "700",
  },
  loyaltyPurpleText: {
    color: "#c084fc",
    fontWeight: "700",
  },
  vatBadge: {
    backgroundColor: "rgba(245, 194, 66, 0.12)",
    borderColor: "rgba(245, 194, 66, 0.35)",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: "center",
    marginLeft: 8,
  },
  vatBadgeText: {
    color: "#f5c242",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});

export default ProductDetails;
