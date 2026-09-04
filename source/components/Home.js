/* eslint-disable react-native/no-inline-styles */
/* eslint-disable quotes */
/* eslint-disable prettier/prettier */
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  View,
  Image,
  BackHandler,
  SafeAreaView,
  Dimensions,
  ScrollView,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  ImageBackground,
  Platform,
  Alert,
  ToastAndroid,
  Animated,
  DeviceEventEmitter,
  Easing,
} from "react-native";
import ModalRN from "react-native-modal";
import RBSheet from "react-native-raw-bottom-sheet";
import {
  HEADER_HEIGHT_THRESHOLD,
  MENU_ICON_HEIGHT_THRESHOLD,
  MENU_ICON_SELECTED_HEIGHT_THRESHOLD,
} from "../resources/data/Constants";
import {
  CART_ICON,
  CLOSE_ICON_OUTLINE,
  EVENT_ICON,
  EVENT_ICON_SELECTED,
  FILLER_ICON,
  FILLER_ICON_SELECTED,
  HOME_ICON,
  HOME_ICON_SELECTED,
  IMAGES_ICON,
  IMAGES_ICON_SELECTED,
  MENU_HAMBURGER,
} from "../resources/data/Images";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ConfirmationPopup from "../widgets/ConfirmationPopup";
import Cart from "./Cart";
import HomeScreen from "./HomeScreen";
import RegisterPatients from "./Categories";
import Search from "./Search";
import WhiskyBrands from "./WhiskyBrands";
import { APP_FONT } from "../resources/data/Fonts";
import Colors from "../resources/colors/Colors";
import Wishlist from "./Wishlist";
import Offers from "./Offers";
import Shop from "./Shop";
import EventsHub from "./events/EventsHub";
import CustomerDashboard from "./CustomerDashboard";
import { API_BASE } from "../resources/data/Constants";


const { width, height } = Dimensions.get("window");

// 💖 Dynamic Zigzag Flying Heart to Header 💖
const FlyingHeart = ({ id, startX, startY, targetX, targetY, onComplete }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 800,
      easing: Easing.bezier(0.2, 0.7, 0.2, 1),
      useNativeDriver: true,
    }).start(() => {
      onComplete(id);
    });
  }, []);

  const deltaX = targetX - startX;

  // Zigzag trajectory: swings left and right on its way to the top heart
  const translateX = anim.interpolate({
    inputRange: [0, 0.2, 0.45, 0.72, 0.9, 1],
    outputRange: [
      startX - 14,
      startX + deltaX * 0.2 - 38,
      startX + deltaX * 0.45 + 32,
      startX + deltaX * 0.72 - 20,
      startX + deltaX * 0.9 + 10,
      targetX - 14,
    ],
  });

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [startY - 14, targetY - 14],
  });

  const scale = anim.interpolate({
    inputRange: [0, 0.15, 0.6, 0.88, 1],
    outputRange: [0.6, 1.4, 1.15, 0.85, 0.25],
  });

  const rotate = anim.interpolate({
    inputRange: [0, 0.2, 0.45, 0.72, 0.9, 1],
    outputRange: ["0deg", "-26deg", "24deg", "-18deg", "10deg", "0deg"],
  });

  const opacity = anim.interpolate({
    inputRange: [0, 0.05, 0.85, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: 28,
        height: 28,
        zIndex: 999999,
        elevation: 99,
        transform: [{ translateX }, { translateY }, { scale }, { rotate }],
        opacity,
      }}
    >
      <Image
        source={require("../resources/assets/heart.png")}
        style={{
          width: 28,
          height: 28,
          tintColor: "#f5c242",
        }}
      />
    </Animated.View>
  );
};

// 💖 Isolated Flying Heart Overlay — zero parent re-renders
const FlyingHeartOverlay = React.memo(() => {
  const [flyingHearts, setFlyingHearts] = useState([]);
  const targetX = width - 58;
  const targetY = Platform.OS === "android" ? 38 : 45;

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener("flyHeartToHeader", ({ startX, startY }) => {
      const id = Date.now() + Math.random();
      setFlyingHearts((prev) => [
        ...prev,
        {
          id,
          startX: typeof startX === "number" ? startX : 200,
          startY: typeof startY === "number" ? startY : 400,
        },
      ]);
    });
    return () => sub.remove();
  }, []);

  const handleComplete = useCallback((id) => {
    setFlyingHearts((prev) => prev.filter((h) => h.id !== id));
    DeviceEventEmitter.emit("bounceHeaderHeart");
  }, []);

  if (flyingHearts.length === 0) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {flyingHearts.map((fh) => (
        <FlyingHeart
          key={fh.id}
          id={fh.id}
          startX={fh.startX}
          startY={fh.startY}
          targetX={targetX}
          targetY={targetY}
          onComplete={handleComplete}
        />
      ))}
    </View>
  );
});

// 💖 Isolated Header Wishlist Icon — zero parent re-renders
const HeaderWishlistIcon = React.memo(({ navigation }) => {
  const [wishlistCount, setWishlistCount] = useState(0);
  const heartScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    AsyncStorage.getItem("grand-store-wishlist").then((stored) => {
      const list = stored ? JSON.parse(stored) : [];
      setWishlistCount(Array.isArray(list) ? list.length : 0);
    }).catch(() => {});

    const subCount = DeviceEventEmitter.addListener("wishlistUpdated", (count) => {
      setWishlistCount(typeof count === "number" ? count : 0);
    });

    const subBounce = DeviceEventEmitter.addListener("bounceHeaderHeart", () => {
      Animated.sequence([
        Animated.timing(heartScale, {
          toValue: 1.55,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(heartScale, {
          toValue: 1,
          friction: 3,
          tension: 70,
          useNativeDriver: true,
        }),
      ]).start();
    });

    return () => {
      subCount.remove();
      subBounce.remove();
    };
  }, []);

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate("Wishlist")}
      style={styles.wishlistHeaderTouch}
      activeOpacity={0.75}
    >
      <Animated.View style={{ transform: [{ scale: heartScale }] }}>
        <Image
          source={require("../resources/images/heart.png")}
          style={[
            styles.headerIcon,
            wishlistCount > 0 && { tintColor: "#f5c242" },
          ]}
        />
      </Animated.View>
      {wishlistCount > 0 && (
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{wishlistCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

const Home = ({ navigation, route }) => {
  const [userName, setUserName] = useState(null);
  const [navigationIndex, setNavigationIndex] = useState(
    typeof route?.params?.tabIndex === "number" ? route.params.tabIndex : 0
  );

  useEffect(() => {
    if (typeof route?.params?.tabIndex === "number") {
      setNavigationIndex(route.params.tabIndex);
    }
  }, [route?.params?.tabIndex]);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [confirmationVisibility, setConfirmationVisibility] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState("Are you sure?");
  const [confirmationPurpose, setConfirmationPurpose] = useState("NA");
  const [mobileNumber, setMobileNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [comments, setComments] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("Are You Over 18 years of Age?");
  const helpSheetRef = useRef();

  // Dynamic sizes
  const headerHeight = Platform.OS === "android" ? 68 : 72;
  const footerHeight = Platform.OS === "android" ? 70 : 76;
  const bottomMenuIconSize = 28;
  const bottomMenuIconSizeSelected = 32;
  const showMessage = (msg) => {
  if (Platform.OS === "android") ToastAndroid.show(msg, ToastAndroid.SHORT);
  else Alert.alert("", msg);
};

const handleLogout = async () => {
  try {
    const token = await AsyncStorage.getItem("userToken");
    const userInfo = await AsyncStorage.getItem("userInfo");
    const user = userInfo ? JSON.parse(userInfo) : null;
    const uid = user?.id || user?.uid;

    if (!uid) {
      showMessage("User ID not found.");
      return;
    }

    // 🔹 Call Logout API
    const response = await fetch(`${API_BASE}/customer-logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uid }),
    });

    const data = await response.json();
    console.log("Logout API Response:", data);

    if (data.status === 1 || data.message?.includes("Logout successful")) {
      // 🧹 Clear AsyncStorage
      await AsyncStorage.clear(); // or use multiRemove([...]) if preferred
await AsyncStorage.multiRemove(["wishlistItemIds", "cartItems"]);

      setUserName(null);
      setOpenDrawer(false);
      showMessage("Logout successful");

      // 🚪 Navigate to Login
      navigation.reset({
        index: 0,
        routes: [{ name: "LoginScreen" }],
      });
    } else {
      showMessage("Logout failed. Please try again.");
    }
  } catch (error) {
    console.error("Logout error:", error);
    showMessage("An error occurred while logging out.");
  }
};



  useEffect(() => {
    fetchUserName();
    const backAction = () => {
      if (navigationIndex !== 0) {
        setNavigationIndex(0);
        return true;
      }
      if (navigation.canGoBack && navigation.canGoBack()) {
        navigation.goBack();
      } else {
        BackHandler.exitApp();
      }
      return true;
    };
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );
    return () => backHandler.remove();
  }, [navigation, navigationIndex]);

  const fetchUserName = async () => {
    try {
      const name = await AsyncStorage.getItem("userName");
      if (name) setUserName(name);
    } catch (error) {
      console.error("Failed to fetch user name:", error);
    }
  };

  useEffect(() => {
    AsyncStorage.getItem("isAgeVerified").then((val) => {
      if (val !== "true" && route?.params?.showPopup) {
        setShowPopup(true);
      }
    }).catch(() => {
      if (route?.params?.showPopup) setShowPopup(true);
    });
  }, [route?.params]);

  const renderHomeScreenHeader = () => (
    <View style={[styles.customHeader, { height: headerHeight }]}>
      <TouchableOpacity
        style={styles.menuBtn}
        onPress={() => setOpenDrawer(true)}
      >
        <Image
          source={MENU_HAMBURGER}
          style={{ width: 28, height: 28, resizeMode: "contain" }}
        />
      </TouchableOpacity>

      <View style={styles.centerContainer}>
        <Image
          source={require("../resources/assets/logo.webp")}
          style={[styles.headerLogo, { height: headerHeight * 0.9 }]}
        />
      </View>

      <View style={styles.sideContainer}>
        <HeaderWishlistIcon navigation={navigation} />
        <TouchableOpacity onPress={() => navigation.navigate("Cart")}>
          <Image source={CART_ICON} style={styles.headerIcon} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const homeScreenMemo = useMemo(() => <HomeScreen navigation={navigation} />, [navigation]);
  const shopScreenMemo = useMemo(() => <Shop navigation={navigation} onBack={() => setNavigationIndex(0)} />, [navigation]);
  const categoriesScreenMemo = useMemo(() => <RegisterPatients navigation={navigation} onBack={() => setNavigationIndex(0)} />, [navigation]);
  const customerDashboardMemo = useMemo(() => <CustomerDashboard navigation={navigation} onBack={() => setNavigationIndex(0)} />, [navigation]);

  const renderScreen = () => {
    switch (navigationIndex) {
      case 0:
        return homeScreenMemo;
      case 1:
        return shopScreenMemo;
      case 2:
        return categoriesScreenMemo;
      case 3:
        return customerDashboardMemo;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {navigationIndex === 0 && renderHomeScreenHeader()}

      <View style={{ flex: 1 }}>
        {renderScreen()}
      </View>

      {/* Footer Tabs */}
      <View style={[styles.footer, { height: footerHeight }]}>
        {[
          { id: 0, label: "Home", icon: HOME_ICON, selected: HOME_ICON_SELECTED },
          { id: 1, label: "Shop", icon: require("../resources/images/store.png"), selected: require("../resources/images/store.png"), isTintable: true },
          { id: 2, label: "Categories", icon: FILLER_ICON, selected: FILLER_ICON_SELECTED },
          { id: 3, label: "Dashboard", icon: require("../resources/images/group.png"), selected: require("../resources/images/group.png"), isTintable: true },
        ].map((tab) => {
          const isSelected = navigationIndex === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tab}
              onPress={() => setNavigationIndex(tab.id)}
              activeOpacity={0.75}
            >
              <Image
                source={isSelected ? tab.selected : tab.icon}
                style={[
                  {
                    width: isSelected ? bottomMenuIconSizeSelected : bottomMenuIconSize,
                    height: isSelected ? bottomMenuIconSizeSelected : bottomMenuIconSize,
                  },
                  tab.isTintable && {
                    tintColor: isSelected ? "#f5c242" : "#777777",
                  },
                ]}
                resizeMode="contain"
              />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Drawer */}
      <ModalRN
        isVisible={openDrawer}
        animationIn="slideInLeft"
        animationOut="slideOutLeft"
        onBackdropPress={() => setOpenDrawer(false)}
        style={styles.drawerModal}
      >
        <View style={styles.drawer}>
          <View style={styles.drawerHeader}>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setOpenDrawer(false)}
            >
              <Image
                source={CLOSE_ICON_OUTLINE}
                style={{ width: 25, height: 25 }}
                resizeMode="contain"
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate("LoginScreen")}
              style={{ alignItems: "center", marginVertical: 10 }}
            >
              <Text style={styles.drawerWelcome}>
                {userName ? `Welcome, ${userName}` : "Please sign in"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.drawerTabs}>
            {[
              { label: "Home", icon: HOME_ICON, onPress: () => setNavigationIndex(0) },
              { label: "Shop", icon: require("../resources/images/store.png"), onPress: () => setNavigationIndex(1) },
              { label: "Categories", icon: FILLER_ICON, onPress: () => setNavigationIndex(2) },
              { label: "Customer Dashboard", icon: require("../resources/images/group.png"), onPress: () => setNavigationIndex(3) },
              { label: "Live Auctions 🏛️", icon: require("../resources/images/event.png"), onPress: () => navigation.navigate("AuctionsHub") },
              { label: "My Bids & Won Lots 🏆", icon: require("../resources/images/Order.png"), onPress: () => navigation.navigate("MyBids") },
              { label: "Events & Tastings 🎟️", icon: EVENT_ICON, onPress: () => navigation.navigate("EventsHub") },
              { label: "My Passes 🎟️", icon: require("../resources/images/event.png"), onPress: () => navigation.navigate("EventTicketPass") },
              { label: "Offers", icon: require("../resources/images/offer.png"), onPress: () => navigation.navigate(Offers) },
              { label: "My Orders", icon: require("../resources/images/Order.png"), onPress: () => navigation.navigate("MyOrders") },
              { label: "Contact Us", icon: require("../resources/images/phone.png"), onPress: () => navigation.navigate("ContactUs") },
              { label: "About Us", icon: require("../resources/images/group.png"), onPress: () => navigation.navigate("AboutUs") },
              { label: "Logout", icon: require("../resources/images/logout_icon.png"), onPress: handleLogout },
            ].map((item, i) => (
              <TouchableOpacity
                key={i}
                style={styles.drawerTab}
                onPress={() => {
                  setOpenDrawer(false);
                  item.onPress();
                }}
              >
                <Image source={item.icon} style={styles.drawerIcon} />
                <Text style={styles.drawerLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ModalRN>

      {/* Confirmation Popup */}
      <ConfirmationPopup
        visibility={confirmationVisibility}
        message={confirmationMessage}
        purpose={confirmationPurpose}
        confirmationDecision={() => setConfirmationVisibility(false)}
      />

      {/* Popup */}
      <Modal transparent visible={showPopup} animationType="fade">
        <View style={styles.popupContainer}>
          <ImageBackground
            source={{ uri: "https://ik.imagekit.io/thegrandstore/bg.webp" }}
            style={styles.overlay}
            resizeMode="cover"
          >
            <Image
              source={require("../resources/assets/logo.webp")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.popupTitle}>Welcome to Grand Store!</Text>
            <Text style={styles.subtitle}>
              You must be 18 years old to{"\n"} visit this site.
            </Text>
            <Text style={styles.message}>{popupMessage}</Text>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.yesButton]}
                onPress={() => {
                  setShowPopup(false);
                  AsyncStorage.setItem("isAgeVerified", "true").catch(() => {});
                }}
              >
                <Text style={styles.buttonText}>Yes</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.noButton]}
                onPress={() =>
                  setPopupMessage(
                    "You need to be 18 years or older to access this site."
                  )
                }
              >
                <Text style={styles.buttonText}>No</Text>
              </TouchableOpacity>
            </View>
          </ImageBackground>
        </View>
      </Modal>

      {/* 💖 Isolated Flying Heart Overlay 💖 */}
      <FlyingHeartOverlay />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0d0d0d" },
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0d0d0d",
    paddingHorizontal: 16,
    justifyContent: "space-between",
  },
  sideContainer: { flexDirection: "row", alignItems: "center" },
  centerContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerLogo: { width: width * 0.48, height: 44, resizeMode: "contain" },
  headerIcon: { width: 28, height: 28, resizeMode: "contain", marginHorizontal: 6 },
  menuBtn: { padding: 4 },
  wishlistHeaderTouch: {
    position: "relative",
    padding: 3,
    marginRight: 2,
  },
  headerBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    backgroundColor: "#c99742",
    borderRadius: 9,
    minWidth: 17,
    height: 17,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#0d0d0d",
  },
  headerBadgeText: {
    color: "#111111",
    fontSize: 9,
    fontWeight: "900",
  },
  footer: {
    width: "100%",
    backgroundColor: "#141414",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    position: "absolute",
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
    paddingBottom: Platform.OS === "android" ? 4 : 8,
  },
  tab: { flex: 1, alignItems: "center", justifyContent: "center" },
  drawerModal: { margin: 0 },
  drawer: { flex: 1, width: "75%", backgroundColor: "#0d0d0d" },
  drawerHeader: { backgroundColor: "#c99742", paddingVertical: 15 },
  closeBtn: { alignSelf: "flex-end", marginRight: 10 },
  drawerWelcome: {
    color: Colors.black_tmb,
    fontWeight: "bold",
    fontFamily: APP_FONT,
    fontSize: 20,
  },
  drawerTabs: { paddingVertical: 20 },
  drawerTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: "#333",
  },
  drawerIcon: {
    width: 28,
    height: 28,
    resizeMode: "contain",
    marginRight: 15,
    tintColor: "#c99742",
  },
  drawerLabel: { color: "#fff", fontSize: 18, fontFamily: APP_FONT },

  // Popup styles
  popupContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    width: width * 0.9,
    padding: 20,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: { width: width * 0.6, height: height * 0.08, marginBottom: 10 },
  popupTitle: { fontSize: 22, fontWeight: "bold", color: "#C99742" },
  subtitle: { fontSize: 17, color: "#ccc", marginVertical: 15, textAlign: "center" },
  message: { fontSize: 15, color: "#ccc", textAlign: "center" },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 10,
    alignItems: "center",
  },
  yesButton: {
    backgroundColor: "#1c1c1c",
    borderColor: "#c99742",
    borderWidth: 1,
  },
  noButton: {
    backgroundColor: "#1c1c1c",
    borderColor: "#c99742",
    borderWidth: 1,
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});

export default Home;
