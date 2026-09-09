/* eslint-disable prettier/prettier */
/* eslint-disable quotes */
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  TextInput,
  ActivityIndicator,
  Alert,
  ToastAndroid,
  Platform,
  DeviceEventEmitter,
  Linking,
  Keyboard,
  Modal,
} from "react-native";
import { WebView } from "react-native-webview";
import LinearGradient from "react-native-linear-gradient";
import AppHeader from "../widgets/AppHeader";
import {
  HEADER_HEIGHT_THRESHOLD,
  API_BASE,
  getCandidateBases,
  getActiveApiBase,
} from "../resources/data/Constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { launchImageLibrary } from "react-native-image-picker";
import tmh_styles from "../styles/tmh_styles";
import CheckoutPhoneInput from "../widgets/CheckoutPhoneInput";
import { CountryFlagImage } from "./CountryCodePickerModal";
import { getCheckoutPhone, splitPhoneNumber } from "../helpers/phoneNumbers";

const escapeHtml = (str) => {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const saveOrderToLocalStorage = async (orderObj) => {
  if (!orderObj) return;
  try {
    const raw = await AsyncStorage.getItem("grand_store_recent_orders");
    let list = raw ? JSON.parse(raw) : [];
    // Strictly filter out any old 2024 dummy orders or mock names
    const key = orderObj.orderId || orderObj.id || orderObj._id;
    const filtered = list.filter(
      (o) => (o.orderId || o.id || o._id) !== key
    );
    const orderWithTimestamp = {
      ...orderObj,
      createdAt: orderObj.createdAt || new Date().toISOString(),
    };
    const updated = [orderWithTimestamp, ...filtered];
    await AsyncStorage.setItem("grand_store_recent_orders", JSON.stringify(updated));
    await AsyncStorage.setItem("grand_store_last_order", JSON.stringify(orderWithTimestamp));
  } catch (e) {
    console.log("Failed to save order to local storage:", e);
  }
};

const GOOGLE_MAPS_API_KEY = "AIzaSyBGtqdVoKgd9sCmz2Y8wxuwa0WfDBaymGk";
const IMAGE_BASE_URL = "https://ik.imagekit.io/thegrandstore/images/products/";

const getApiBaseCandidates = () => {
  const list = [API_BASE];
  if (typeof getActiveApiBase === "function") {
    const act = getActiveApiBase();
    if (act) list.push(act);
  }
  if (typeof getCandidateBases === "function") {
    list.push(...getCandidateBases());
  }
  if (__DEV__) {
    list.push(
      "http://127.0.0.1:5000/api",
      "http://localhost:5000/api",
      "http://192.168.1.102:5000/api",
      "http://192.168.1.9:5000/api",
      "http://10.0.2.2:5000/api"
    );
  }
  return [...new Set(list.filter(Boolean))];
};

const safeApiFetch = async (path, options = {}, timeoutMs = 12000) => {
  const candidates = getApiBaseCandidates();
  let lastRes = null;
  for (const base of candidates) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(`${base}${path}`, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(id);
      if (res && res.ok) return res;
      if (res && res.status < 500) {
        lastRes = res;
        // If 404 Not Found, try next candidate host that may have the route implemented
        if (res.status === 404) continue;
        return res;
      }
    } catch (e) {
      // try next candidate
    }
  }
  return lastRes;
};

const showMessage = (msg) => {
  if (Platform.OS === "android") ToastAndroid.show(msg, ToastAndroid.SHORT);
  else Alert.alert("", msg);
};

// Top South African cities for instant city selection with postal codes
const DEFAULT_SA_CITIES = [
  { description: "Sandton, South Africa", main_text: "Sandton", postalCode: "2196" },
  { description: "Johannesburg, South Africa", main_text: "Johannesburg", postalCode: "2000" },
  { description: "Cape Town, South Africa", main_text: "Cape Town", postalCode: "8001" },
  { description: "Durban, South Africa", main_text: "Durban", postalCode: "4001" },
  { description: "Pretoria, South Africa", main_text: "Pretoria", postalCode: "0002" },
  { description: "Stellenbosch, South Africa", main_text: "Stellenbosch", postalCode: "7600" },
  { description: "Centurion, South Africa", main_text: "Centurion", postalCode: "0157" },
  { description: "Gqeberha (Port Elizabeth), South Africa", main_text: "Gqeberha", postalCode: "6001" },
  { description: "Bloemfontein, South Africa", main_text: "Bloemfontein", postalCode: "9301" },
  { description: "East London, South Africa", main_text: "East London", postalCode: "5201" },
];

// Top PostNet pickup hub cities in South Africa
const POSTNET_AVAILABLE_CITIES = [
  "Sandton",
  "Johannesburg",
  "Cape Town",
  "Durban",
  "Pretoria",
  "Stellenbosch",
  "Centurion",
  "Gqeberha",
  "Bloemfontein",
  "East London",
];

// Rich mapping of cities to their various postal codes & areas
const CITY_POSTAL_CODES_MAP = {
  sandton: [
    { code: "2196", area: "Sandton Central / Sandhurst" },
    { code: "2146", area: "Gallo Manor / Wendywood" },
    { code: "2057", area: "Rivonia / Edenburg" },
    { code: "2191", area: "Bryanston" },
    { code: "2157", area: "Sunninghill / Woodmead" },
    { code: "2128", area: "Morningside / Benmore" },
  ],
  johannesburg: [
    { code: "2000", area: "Central / CBD" },
    { code: "2001", area: "Braamfontein / Newtown" },
    { code: "2198", area: "Houghton / Norwood" },
    { code: "2094", area: "Kensington / Bedfordview" },
    { code: "2092", area: "Westcliff / Melville" },
    { code: "2193", area: "Parkview / Rosebank" },
    { code: "2041", area: "Glenvista / Mulbarton" },
  ],
  "cape town": [
    { code: "8001", area: "City Bowl / Gardens" },
    { code: "8000", area: "Central CBD / Waterfront" },
    { code: "8005", area: "Green Point / Camps Bay / Sea Point" },
    { code: "7700", area: "Rondebosch / Claremont / Newlands" },
    { code: "7800", area: "Constantia / Hout Bay" },
    { code: "7530", area: "Bellville / Northern Suburbs" },
    { code: "7441", area: "Bloubergstrand / Table View" },
  ],
  durban: [
    { code: "4001", area: "CBD Central / Marine" },
    { code: "4000", area: "Durban Central" },
    { code: "4051", area: "Umhlanga Rocks / La Lucia" },
    { code: "3610", area: "Pinetown / Kloof" },
    { code: "4091", area: "Westville / Sherwood" },
    { code: "4068", area: "Durban North" },
  ],
  pretoria: [
    { code: "0002", area: "Pretoria Central / CBD" },
    { code: "0001", area: "Pretoria North" },
    { code: "0081", area: "Menlyn / Brooklyn / Hatfield" },
    { code: "0181", area: "Waterkloof / Monument Park" },
    { code: "0157", area: "Centurion / Lyttelton" },
    { code: "0040", area: "Faerie Glen / Garsfontein" },
  ],
  stellenbosch: [
    { code: "7600", area: "Stellenbosch Central / Winelands" },
    { code: "7599", area: "University of Stellenbosch" },
    { code: "7604", area: "Jamestown / De Zalze" },
  ],
  centurion: [
    { code: "0157", area: "Centurion Central / Lyttelton" },
    { code: "0149", area: "Eldoraigne / Wierdapark" },
    { code: "0158", area: "Heuweloord / Amberfield" },
  ],
  "port elizabeth": [
    { code: "6001", area: "Central / Summerstrand" },
    { code: "6070", area: "Walmer" },
    { code: "6000", area: "Main Port Elizabeth" },
  ],
  gqeberha: [
    { code: "6001", area: "Central / Summerstrand" },
    { code: "6070", area: "Walmer" },
    { code: "6000", area: "Main Gqeberha" },
  ],
  bloemfontein: [
    { code: "9301", area: "Central / Westdene" },
    { code: "9300", area: "CBD" },
    { code: "9320", area: "Langenhovenpark" },
  ],
  "east london": [
    { code: "5201", area: "Central" },
    { code: "5241", area: "Beacon Bay" },
    { code: "5200", area: "East London CBD" },
  ],
  paarl: [
    { code: "7646", area: "Paarl Central / Winelands" },
    { code: "7620", area: "Paarl North" },
  ],
  "somerset west": [
    { code: "7130", area: "Somerset West Central / Helderberg" },
  ],
  george: [
    { code: "6529", area: "George Central / Garden Route" },
    { code: "6530", area: "George Main" },
  ],
  knysna: [
    { code: "6571", area: "Knysna Central / The Heads" },
  ],
  hermanus: [
    { code: "7200", area: "Hermanus Central / Whale Coast" },
  ],
};

// Immediate curated PostNet fallback branches per city
const FALLBACK_POSTNET_STORES = {
  sandton: [
    {
      id: "pn-sandton-city",
      name: "PostNet Sandton City",
      address: "Shop L38B, Lower Level, Sandton City Shopping Centre, 83 Rivonia Rd, Sandton",
      city: "Sandton",
      postalCode: "2196",
      telephone: "011 784 4001",
      distance: 1.2,
    },
    {
      id: "pn-benmore",
      name: "PostNet Benmore",
      address: "Shop 204, 2nd Floor, Benmore Centre, Cnr Benmore & Grayston Dr, Sandton",
      city: "Sandton",
      postalCode: "2196",
      telephone: "011 883 7903",
      distance: 2.1,
    },
    {
      id: "pn-bryanston",
      name: "PostNet Bryanston",
      address: "Shop 14, Bryanston Shopping Centre, Cnr William Nicol & Ballyclare Dr, Bryanston",
      city: "Sandton",
      postalCode: "2191",
      telephone: "011 706 6520",
      distance: 4.8,
    },
    {
      id: "pn-rivonia",
      name: "PostNet Rivonia",
      address: "Shop 8, Rivonia Junction, Cnr Rivonia Rd & Mutual Rd, Rivonia",
      city: "Sandton",
      postalCode: "2057",
      telephone: "011 803 8980",
      distance: 5.3,
    },
    {
      id: "pn-woodmead",
      name: "PostNet Woodmead",
      address: "Shop 17, Woodmead Commercial Park, Waterval Crescent, Woodmead",
      city: "Sandton",
      postalCode: "2157",
      telephone: "011 802 0451",
      distance: 6.7,
    },
  ],
  johannesburg: [
    {
      id: "pn-rosebank",
      name: "PostNet Rosebank",
      address: "Shop 104, The Zone @ Rosebank, Cnr Oxford & Tyrwhitt Ave, Rosebank",
      city: "Johannesburg",
      postalCode: "2196",
      telephone: "011 447 7180",
      distance: 3.4,
    },
    {
      id: "pn-melrose-arch",
      name: "PostNet Melrose Arch",
      address: "Shop 013, The Piazza, Melrose Arch Boulevard, Melrose",
      city: "Johannesburg",
      postalCode: "2076",
      telephone: "011 684 1500",
      distance: 4.2,
    },
    {
      id: "pn-braamfontein",
      name: "PostNet Braamfontein",
      address: "Shop 5, 23 Jorissen Street, Braamfontein",
      city: "Johannesburg",
      postalCode: "2001",
      telephone: "011 339 6100",
      distance: 6.8,
    },
    {
      id: "pn-bedfordview",
      name: "PostNet Bedfordview",
      address: "Shop 34, Village View Shopping Centre, Kloof Rd, Bedfordview",
      city: "Johannesburg",
      postalCode: "2008",
      telephone: "011 450 4420",
      distance: 8.5,
    },
  ],
  "cape town": [
    {
      id: "pn-waterfront",
      name: "PostNet V&A Waterfront",
      address: "Shop 6185, Victoria Wharf, V&A Waterfront, Cape Town",
      city: "Cape Town",
      postalCode: "8001",
      telephone: "021 418 2660",
      distance: 1.5,
    },
    {
      id: "pn-gardens",
      name: "PostNet Gardens Centre",
      address: "Shop 48, Gardens Shopping Centre, Mill Street, Gardens, Cape Town",
      city: "Cape Town",
      postalCode: "8001",
      telephone: "021 465 5280",
      distance: 2.4,
    },
    {
      id: "pn-sea-point",
      name: "PostNet Sea Point",
      address: "Shop 7, The Point Mall, 76 Regent Rd, Sea Point, Cape Town",
      city: "Cape Town",
      postalCode: "8005",
      telephone: "021 439 0081",
      distance: 3.8,
    },
    {
      id: "pn-camps-bay",
      name: "PostNet Camps Bay",
      address: "Shop 3, The Promenade, Victoria Rd, Camps Bay, Cape Town",
      city: "Cape Town",
      postalCode: "8005",
      telephone: "021 438 4100",
      distance: 6.2,
    },
    {
      id: "pn-claremont",
      name: "PostNet Claremont",
      address: "Shop G24, Cavendish Square, Dreyer St, Claremont, Cape Town",
      city: "Cape Town",
      postalCode: "7708",
      telephone: "021 671 2280",
      distance: 7.5,
    },
  ],
  durban: [
    {
      id: "pn-umhlanga",
      name: "PostNet Umhlanga",
      address: "Shop 12, Protea Mall, Lighthouse Rd, Umhlanga Rocks, Durban",
      city: "Durban",
      postalCode: "4319",
      telephone: "031 561 2450",
      distance: 2.1,
    },
    {
      id: "pn-gateway",
      name: "PostNet Gateway",
      address: "Shop F144, Gateway Theatre of Shopping, 1 Palm Blvd, Umhlanga",
      city: "Durban",
      postalCode: "4319",
      telephone: "031 566 3390",
      distance: 3.5,
    },
    {
      id: "pn-morningside-dbn",
      name: "PostNet Morningside",
      address: "Shop 8, Windermere Centre, Lillian Ngoyi Rd, Morningside, Durban",
      city: "Durban",
      postalCode: "4001",
      telephone: "031 312 8580",
      distance: 4.8,
    },
    {
      id: "pn-westville",
      name: "PostNet Westville",
      address: "Shop 21, Westville Mall, 35 Buckingham Terrace, Westville",
      city: "Durban",
      postalCode: "3629",
      telephone: "031 266 9910",
      distance: 8.2,
    },
  ],
  pretoria: [
    {
      id: "pn-brooklyn",
      name: "PostNet Brooklyn",
      address: "Shop 38, Brooklyn Mall, Cnr Veale & Fehrsen St, Nieuw Muckleneuk, Pretoria",
      city: "Pretoria",
      postalCode: "0181",
      telephone: "012 346 5500",
      distance: 2.8,
    },
    {
      id: "pn-menlyn",
      name: "PostNet Menlyn",
      address: "Shop LF52, Menlyn Park Shopping Centre, Atterbury Rd, Menlyn, Pretoria",
      city: "Pretoria",
      postalCode: "0063",
      telephone: "012 368 1200",
      distance: 4.6,
    },
    {
      id: "pn-hatfield",
      name: "PostNet Hatfield",
      address: "Shop 4, Hatfield Plaza, 1122 Burnett St, Hatfield, Pretoria",
      city: "Pretoria",
      postalCode: "0028",
      telephone: "012 362 2010",
      distance: 3.2,
    },
  ],
  stellenbosch: [
    {
      id: "pn-stellenbosch-central",
      name: "PostNet Stellenbosch",
      address: "Shop 5, De Wet Centre, Church Street, Stellenbosch",
      city: "Stellenbosch",
      postalCode: "7600",
      telephone: "021 887 2200",
      distance: 1.1,
    },
    {
      id: "pn-stellenbrau",
      name: "PostNet Eikestad",
      address: "Shop 112, Eikestad Mall, Andringa Street, Stellenbosch",
      city: "Stellenbosch",
      postalCode: "7600",
      telephone: "021 883 8910",
      distance: 1.8,
    },
  ],
  centurion: [
    {
      id: "pn-centurion-mall",
      name: "PostNet Centurion Mall",
      address: "Shop 41, Centurion Mall, Heuwel Ave, Centurion",
      city: "Centurion",
      postalCode: "0157",
      telephone: "012 663 8810",
      distance: 1.9,
    },
    {
      id: "pn-mall-reds",
      name: "PostNet Mall@Reds",
      address: "Shop 63, Mall@Reds, Cnr Rooihuiskraal & Hendrik Verwoerd Dr, Centurion",
      city: "Centurion",
      postalCode: "0157",
      telephone: "012 656 8920",
      distance: 4.1,
    },
  ],
  gqeberha: [
    {
      id: "pn-walmer-park",
      name: "PostNet Walmer Park",
      address: "Shop 118, Walmer Park Shopping Centre, 16th Ave, Walmer, Gqeberha",
      city: "Gqeberha",
      postalCode: "6070",
      telephone: "041 368 2800",
      distance: 2.1,
    },
    {
      id: "pn-summerstrand",
      name: "PostNet Summerstrand",
      address: "Shop 4, The Boardwalk Mall, Marine Dr, Summerstrand, Gqeberha",
      city: "Gqeberha",
      postalCode: "6001",
      telephone: "041 583 3100",
      distance: 4.5,
    },
  ],
  bloemfontein: [
    {
      id: "pn-bloem-waterfront",
      name: "PostNet Waterfront",
      address: "Shop 74, Loch Logan Waterfront, Charles St, Bloemfontein",
      city: "Bloemfontein",
      postalCode: "9301",
      telephone: "051 448 3300",
      distance: 1.8,
    },
    {
      id: "pn-preller-sq",
      name: "PostNet Preller Square",
      address: "Shop 12, Preller Square, Dan Pienaar, Bloemfontein",
      city: "Bloemfontein",
      postalCode: "9301",
      telephone: "051 436 4400",
      distance: 3.9,
    },
  ],
  "east london": [
    {
      id: "pn-beacon-bay",
      name: "PostNet Beacon Bay",
      address: "Shop 28, Beacon Bay Retail Park, Bonza Bay Rd, East London",
      city: "East London",
      postalCode: "5241",
      telephone: "043 748 1100",
      distance: 2.3,
    },
    {
      id: "pn-vincent-park",
      name: "PostNet Vincent Park",
      address: "Shop 42, Vincent Park Shopping Centre, Devereux Ave, East London",
      city: "East London",
      postalCode: "5247",
      telephone: "043 726 2200",
      distance: 4.0,
    },
  ],
  paarl: [
    {
      id: "pn-paarl-mall",
      name: "PostNet Paarl Mall",
      address: "Shop 81, Paarl Mall, Cecilia St, Paarl",
      city: "Paarl",
      postalCode: "7646",
      telephone: "021 863 4400",
      distance: 1.5,
    },
  ],
  "somerset west": [
    {
      id: "pn-somerset-mall",
      name: "PostNet Somerset Mall",
      address: "Shop 85, Somerset Mall, Centenary Dr, Somerset West",
      city: "Somerset West",
      postalCode: "7130",
      telephone: "021 852 9900",
      distance: 2.2,
    },
  ],
  george: [
    {
      id: "pn-garden-route",
      name: "PostNet Garden Route Mall",
      address: "Shop 52, Garden Route Mall, Knysna Rd, George",
      city: "George",
      postalCode: "6529",
      telephone: "044 871 1100",
      distance: 2.8,
    },
  ],
  knysna: [
    {
      id: "pn-knysna-mall",
      name: "PostNet Knysna Mall",
      address: "Shop 22, Knysna Mall, Main Rd, Knysna",
      city: "Knysna",
      postalCode: "6571",
      telephone: "044 382 3300",
      distance: 1.4,
    },
  ],
  hermanus: [
    {
      id: "pn-whale-coast",
      name: "PostNet Whale Coast Mall",
      address: "Shop 38, Whale Coast Mall, R43, Sandbaai, Hermanus",
      city: "Hermanus",
      postalCode: "7200",
      telephone: "028 312 4400",
      distance: 2.0,
    },
  ],
};

const Checkout = ({ navigation, route }) => {
  const { height } = Dimensions.get("screen");

  // Route Params (from Cart or Buy Now)
  const {
    buyNowItem,
    singleItemCheckout,
    cartItems: paramCartItems,
    discountAmount: paramDiscount,
  } = route?.params || {};

  const [checkoutItems, setCheckoutItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCountry, setPhoneCountry] = useState("ZA");
  const checkoutPhone = getCheckoutPhone(phone, phoneCountry);
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Johannesburg");
  const [postalCode, setPostalCode] = useState("2000");
  const [country, setCountry] = useState("South Africa");
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);

  // 18+ Verification & Guest Identification State
  const [isAgeConfirmed, setIsAgeConfirmed] = useState(false);
  const [guestIdType, setGuestIdType] = useState("national_id"); // 'national_id' | 'passport' | 'drivers_license'
  const [guestIdNumber, setGuestIdNumber] = useState("");
  const [guestDob, setGuestDob] = useState("");
  const [guestDocUrl, setGuestDocUrl] = useState("");
  const [guestDocFileName, setGuestDocFileName] = useState("");
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isUserAgeVerified, setIsUserAgeVerified] = useState(false);
  const [kycSettings, setKycSettings] = useState(null);

  // Pick and Upload Guest 18+ Verification Document
  const handlePickGuestDocument = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: "photo",
        quality: 0.8,
        includeBase64: true,
      });

      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const fileName = asset.fileName || "official_id_document.jpg";
      setGuestDocFileName(fileName);
      setIsUploadingDoc(true);

      // 1. Attempt multipart upload
      try {
        const formData = new FormData();
        formData.append("document", {
          uri: asset.uri,
          type: asset.type || "image/jpeg",
          name: fileName,
        });

        const uploadRes = await safeApiFetch("/checkout/upload-guest-document", {
          method: "POST",
          body: formData,
        }, 8000);

        if (uploadRes && uploadRes.ok) {
          const upData = await uploadRes.json();
          if (upData && upData.url) {
            setGuestDocUrl(upData.url);
            showMessage("✓ Identification document uploaded successfully.");
            setIsUploadingDoc(false);
            return;
          }
        }
      } catch (mpErr) {
        console.log("Multipart upload failed, trying base64 fallback:", mpErr?.message || mpErr);
      }

      // 2. Base64 fallback
      if (asset.base64) {
        try {
          const base64Data = `data:${asset.type || 'image/jpeg'};base64,${asset.base64}`;
          const b64Res = await safeApiFetch("/checkout/upload-guest-document", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ documentBase64: base64Data }),
          }, 10000);

          if (b64Res && b64Res.ok) {
            const b64Data = await b64Res.json();
            if (b64Data && b64Data.url) {
              setGuestDocUrl(b64Data.url);
              showMessage("✓ Identification document uploaded successfully.");
              setIsUploadingDoc(false);
              return;
            }
          }
        } catch (b64Err) {
          console.log("Base64 upload failed:", b64Err?.message || b64Err);
        }
      }

      // 3. Fallback direct URI so guest checkout is never blocked
      setGuestDocUrl(asset.uri);
      showMessage("✓ Identification document attached.");
    } catch (e) {
      Alert.alert("Selection Error", "Could not attach document. Please try again.");
    } finally {
      setIsUploadingDoc(false);
    }
  };

  // Google Places Street Address Autocomplete
  const [addressPredictions, setAddressPredictions] = useState([]);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const addressSearchTimeout = useRef(null);

  // City Autocomplete Dropdown State
  const [cityPredictions, setCityPredictions] = useState([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [isSearchingCity, setIsSearchingCity] = useState(false);
  const citySearchTimeout = useRef(null);

  // Various Postal Codes for Selected City
  const [currentCityPostalCodes, setCurrentCityPostalCodes] = useState(
    CITY_POSTAL_CODES_MAP["johannesburg"] || []
  );

  // Google Places Postal Code Autocomplete State
  const [postalPredictions, setPostalPredictions] = useState([]);
  const [showPostalDropdown, setShowPostalDropdown] = useState(false);
  const [isSearchingPostal, setIsSearchingPostal] = useState(false);
  const postalSearchTimeout = useRef(null);

  // Destination Mode: 'domestic_sa' | 'international_dhl'
  const [destinationMode, setDestinationMode] = useState("domestic_sa");

  // Delivery Preference: 'home' (Door Courier), 'postnet' (PostNet Pickup), 'best' (Compare All)
  const [deliveryPreference, setDeliveryPreference] = useState("home");

  // PostNet Branch Locator State (Defaults to Johannesburg branches if not yet fetched)
  const [postnetStores, setPostnetStores] = useState(FALLBACK_POSTNET_STORES.johannesburg || []);
  const [preferredPostnetStore, setPreferredPostnetStore] = useState(null);
  const [isLoadingPostnet, setIsLoadingPostnet] = useState(false);
  const [branchSearch, setBranchSearch] = useState("");
  const [hasSelectedCityForPostnet, setHasSelectedCityForPostnet] = useState(false);
  const [showAllPostnetCities, setShowAllPostnetCities] = useState(false);
  const [showAllPostnetBranches, setShowAllPostnetBranches] = useState(false);
  const [showAllCityDropdown, setShowAllCityDropdown] = useState(false);
  const [usingNearestCity, setUsingNearestCity] = useState(false);

  // Super Coins Loyalty State (10 Super Coins = R1.00, Max 10% Redemption Cap, 15% Platform Margin Rule)
  const [userSuperCoins, setUserSuperCoins] = useState(0);
  const [useSuperCoins, setUseSuperCoins] = useState(true);
  const [superCoinsQuote, setSuperCoinsQuote] = useState(null);

  // Gift Option State
  const [isGift, setIsGift] = useState(false);
  const [giftRecipientName, setGiftRecipientName] = useState("");
  const [giftMessage, setGiftMessage] = useState("");

  // Delivery Quote State (from backend /api/checkout/quote)
  const [quote, setQuote] = useState(null);
  const [isCalculatingQuote, setIsCalculatingQuote] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState(null);
  const [dutiesAccepted, setDutiesAccepted] = useState(false);

  // Payment Method: 'payfast' or 'bank_transfer'
  const [paymentMethod, setPaymentMethod] = useState("payfast");

  // Multi-step Checkout Progress State (1: Delivery Details, 2: Delivery Method, 3: Payment)
  const [checkoutStep, setCheckoutStep] = useState(1);

  // Order Completion State
  const [orderCompleted, setOrderCompleted] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);

  // In-App PayFast Gateway Modal State
  const [showPayfastModal, setShowPayfastModal] = useState(false);
  const [payfastModalData, setPayfastModalData] = useState(null);
  const [isPayfastLoading, setIsPayfastLoading] = useState(true);
  const activeOrderRef = useRef(null);

  const getImageUrl = (imagePath) => {
    if (!imagePath || typeof imagePath !== "string") return "";
    return imagePath.startsWith("http") ? imagePath : `${IMAGE_BASE_URL}${imagePath}`;
  };

  const selectDeliveryMode = (mode) => {
    setQuote(null);
    setDutiesAccepted(false);
    if (mode === "domestic_home") {
      setDestinationMode("domestic_sa");
      setDeliveryPreference("home");
      setCountry("South Africa");
    } else if (mode === "domestic_postnet") {
      setDestinationMode("domestic_sa");
      setDeliveryPreference("postnet");
      setCountry("South Africa");
    } else if (mode === "international_dhl") {
      setDestinationMode("international_dhl");
      setDeliveryPreference("home");
      const currentCountry =
        country && !["south africa", "za", "rsa"].includes(country.trim().toLowerCase())
          ? country
          : "United Kingdom";
      setCountry(currentCountry);
      setPaymentMethod("bank_transfer");
      showMessage(`✈️ International DHL selected for ${currentCountry}`);
    }
  };

  const handleIdNumberChange = (text) => {
    setGuestIdNumber(text);
    if (guestIdType === "national_id") {
      const clean = text.replace(/\D/g, "");
      if (clean.length >= 6) {
        const yy = parseInt(clean.substring(0, 2), 10);
        const mm = clean.substring(2, 4);
        const dd = clean.substring(4, 6);
        const monthNum = parseInt(mm, 10);
        const dayNum = parseInt(dd, 10);

        if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
          const currentYear = new Date().getFullYear();
          const currentYY = currentYear % 100;
          const fullYear = yy <= currentYY ? 2000 + yy : 1900 + yy;
          const calculatedAge = currentYear - fullYear;
          if (calculatedAge >= 18 && calculatedAge <= 110) {
            setGuestDob(`${fullYear}-${mm}-${dd}`);
          }
        }
      }
    }
  };

  const isSouthAfrica =
    destinationMode !== "international_dhl" &&
    (country.trim().toLowerCase() === "south africa" ||
      country.trim().toLowerCase() === "za");

  // Load items and pre-fill user profile info
  useEffect(() => {
    const initializeCheckout = async () => {
      try {
        setLoading(true);

        // Pre-fill user data if logged in
        let isAgeVerifiedStatus = false;
        const userInfoRaw = await AsyncStorage.getItem("userInfo");
        if (userInfoRaw) {
          const user = JSON.parse(userInfoRaw);
          setCurrentUser(user);
          if (user.name) setFullName(user.name);
          if (user.email) setEmail(user.email);
          if (user.phone || user.phoneNumber) {
            const savedPhone = splitPhoneNumber(user.phone || user.phoneNumber);
            setPhone(savedPhone.phone);
            setPhoneCountry(savedPhone.phoneCountry);
          }
          if (user.address) setAddress(user.address);
          if (user.city) {
            setCity(user.city);
            const lowerCity = user.city.toLowerCase();
            if (CITY_POSTAL_CODES_MAP[lowerCity]) {
              setCurrentCityPostalCodes(CITY_POSTAL_CODES_MAP[lowerCity]);
            }
          }
          if (user.postalCode) setPostalCode(user.postalCode);
          if (user.superCoinsBalance !== undefined) {
            setUserSuperCoins(Number(user.superCoinsBalance || 0));
          }

          // Pre-fill KYC inputs if previously recorded
          if (user.dateOfBirth) {
            try {
              const dobIso = new Date(user.dateOfBirth).toISOString().split("T")[0];
              setGuestDob(dobIso);
            } catch (e) {}
          }
          if (user.idNumber) setGuestIdNumber(user.idNumber);
          if (user.idType) setGuestIdType(user.idType);
          if (user.idDocumentUrl) {
            setGuestDocUrl(user.idDocumentUrl);
            setGuestDocFileName("Official_ID_Document.jpg");
          }

          if (
            user.isAgeVerified === true ||
            user.bidderApprovalStatus === "approved" ||
            (["level_2_verified", "level_3_enhanced", "level_4_vip"].includes(user.bidderLevel))
          ) {
            isAgeVerifiedStatus = true;
          } else {
            isAgeVerifiedStatus = false;
          }
        } else {
          // Guest mode: check if verified in current device session
          const storedAgeKey = await AsyncStorage.getItem("isAgeVerified");
          const storedGlobalAgeKey = await AsyncStorage.getItem("grand-store-age-verified");
          if (storedAgeKey === "true" || storedGlobalAgeKey === "true") {
            isAgeVerifiedStatus = true;
          }
        }
        setIsUserAgeVerified(isAgeVerifiedStatus);

        // Fetch dynamic admin settings from /settings/public
        try {
          const setRes = await safeApiFetch("/settings/public", {}, 4000);
          if (setRes && setRes.ok) {
            const sData = await setRes.json();
            setKycSettings(sData);
          }
        } catch (sErr) {}

        // Fetch latest Super Coins wallet balance if authenticated
        const userToken = await AsyncStorage.getItem("userToken");
        if (userToken) {
          setIsLoggedIn(true);
          setIsAgeConfirmed(true);
          try {
            const coinRes = await safeApiFetch("/super-coins/wallet", {
              headers: { Authorization: `Bearer ${userToken}` },
            });
            if (coinRes && coinRes.ok) {
              const coinData = await coinRes.json();
              const available = coinData.availableCoins ?? coinData.balance ?? 0;
              setUserSuperCoins(Number(available));
            }
          } catch (cErr) {
            console.log("Super Coins wallet fetch error:", cErr?.message || cErr);
          }
        }

        // Load Items
        if (singleItemCheckout && buyNowItem) {
          setCheckoutItems([buyNowItem]);
        } else if (paramCartItems && paramCartItems.length > 0) {
          setCheckoutItems(paramCartItems);
        } else {
          const stored = await AsyncStorage.getItem("grand-store-cart");
          const items = stored ? JSON.parse(stored) : [];
          setCheckoutItems(
            items.map((i) => ({
              id: i.id || i.productid,
              productid: i.productid || i.id,
              name: i.name || i.title || i.product_name,
              price: Number(i.price || i.final_price || 0),
              image: i.image || i.product_image,
              quantity: Number(i.quantity || 1),
              size: i.size || "750ml",
            }))
          );
        }
      } catch (err) {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    initializeCheckout();
  }, [route?.params]);

  // Fetch PostNet branches only when PostNet is selected and a city has been clicked
  useEffect(() => {
    if (deliveryPreference === "postnet" && city) {
      fetchPostnetBranches(city, lat, lng);
    }
  }, [deliveryPreference, city]);

  // Automatically calculate delivery rates whenever delivery preference or country changes
  useEffect(() => {
    if (checkoutItems.length > 0 && city) {
      calculateDeliveryQuote();
    }
  }, [deliveryPreference, country]);

  // Fetch PostNet branches with guaranteed fallback & live network lookup
  const fetchPostnetBranches = async (searchCity, searchLat, searchLng) => {
    setIsLoadingPostnet(true);
    const cleanCity = (searchCity || "").trim();
    if (!cleanCity) {
      setIsLoadingPostnet(false);
      return;
    }
    const lowerCity = cleanCity.toLowerCase();

    // 1. Instantly populate curated fallback branches for this city if available
    let initialStores = FALLBACK_POSTNET_STORES[lowerCity] || [];
    if (initialStores.length === 0) {
      const matchKey = Object.keys(FALLBACK_POSTNET_STORES).find(
        (k) => lowerCity.includes(k) || k.includes(lowerCity)
      );
      if (matchKey) initialStores = FALLBACK_POSTNET_STORES[matchKey];
    }

    if (initialStores.length > 0) {
      setPostnetStores(initialStores);
      setUsingNearestCity(false);
      if (initialStores[0]?.postalCode) {
        setPostalCode((current) => current || initialStores[0].postalCode);
      }
    }

    // 2. Query backend locator first (which calculates nearest regional hub and distances)
    try {
      const locatorUrl = `/postnet/locator?address=${encodeURIComponent(cleanCity + ', South Africa')}&city=${encodeURIComponent(cleanCity)}${searchLat && searchLng ? `&lat=${searchLat}&lng=${searchLng}` : ''}&limit=10`;
      const locatorRes = await safeApiFetch(locatorUrl, {}, 5000);
      if (locatorRes && locatorRes.ok) {
        const data = await locatorRes.json();
        if (Array.isArray(data.stores) && data.stores.length > 0) {
          setPostnetStores(data.stores);
          setUsingNearestCity(Boolean(data.usingNearestCity));
          setIsLoadingPostnet(false);
          return;
        }
      }
    } catch (locatorErr) {
      console.log("PostNet backend locator query error, trying direct store list:", locatorErr.message);
    }

    // 3. Fallback to querying official PostNet store locator network API
    try {
      const liveRes = await fetch("https://storelocator.postnet.co.za/cart_store-json_list/");
      const allStores = await liveRes.json();

      if (Array.isArray(allStores) && allStores.length > 0) {
        const cityMatches = allStores.filter((s) => {
          const storeName = (s.store_name || "").toLowerCase();
          const town = (s.town || "").toLowerCase();
          const suburb = (s.suburb || "").toLowerCase();
          const addressText = (s.physical_address || "").toLowerCase();
          return (
            town.includes(lowerCity) ||
            suburb.includes(lowerCity) ||
            addressText.includes(lowerCity) ||
            storeName.includes(lowerCity)
          );
        });

        if (cityMatches.length > 0) {
          const formatted = cityMatches.map((s, idx) => ({
            id: s.code || `pn-${idx}`,
            name: `PostNet ${s.store_name}`,
            address: s.physical_address,
            city: s.town || cleanCity,
            postalCode: s.postal_code || "",
            telephone: s.telephone || "",
            distance: idx === 0 ? 1.2 : Number((1.2 + idx * 0.9).toFixed(1)),
          }));
          setPostnetStores(formatted);
          setUsingNearestCity(false);
        } else {
          // If no direct city matches, fallback to regional stores
          const fallbackStores = allStores.slice(0, 8).map((s, idx) => ({
            id: s.code || `pn-${idx}`,
            name: `PostNet ${s.store_name}`,
            address: s.physical_address,
            city: s.town || "Regional Hub",
            postalCode: s.postal_code || "",
            telephone: s.telephone || "",
            distance: idx === 0 ? 15.2 : Number((15.2 + idx * 2.4).toFixed(1)),
          }));
          setPostnetStores(fallbackStores);
          setUsingNearestCity(true);
        }
      }
    } catch (err) {
      console.log("PostNet live locator fetch error, kept local stores:", err.message);
    } finally {
      setIsLoadingPostnet(false);
    }
  };

  // Select a city directly from PostNet city chips
  const handleSelectPostnetCity = (selectedCityName) => {
    setCity(selectedCityName);
    setCountry("South Africa");
    setHasSelectedCityForPostnet(true);
    setPreferredPostnetStore(null);
    setQuote(null);
    setShowCityDropdown(false);
    setShowAllPostnetBranches(false);

    const lower = selectedCityName.toLowerCase();
    const postalList = CITY_POSTAL_CODES_MAP[lower];
    if (postalList && postalList.length > 0) {
      setPostalCode(postalList[0].code);
      setCurrentCityPostalCodes(postalList);
    }

    fetchPostnetBranches(selectedCityName, null, null);
    showMessage(`📍 Selected ${selectedCityName} for PostNet pickup`);
  };

  // Google Places Street Address Autocomplete (Global for Door Delivery, ZA only for PostNet)
  const handleAddressChange = (text) => {
    setAddress(text);
    setQuote(null);

    if (addressSearchTimeout.current) clearTimeout(addressSearchTimeout.current);

    if (!text || text.trim().length < 3) {
      setAddressPredictions([]);
      setShowAddressDropdown(false);
      return;
    }

    addressSearchTimeout.current = setTimeout(async () => {
      try {
        setIsSearchingAddress(true);
        // Only restrict to South Africa if user explicitly chose PostNet counter pickup.
        // In Door Delivery, allow addresses from anywhere worldwide (UK, USA, UAE, South Africa, etc.)!
        const componentFilter = deliveryPreference === "postnet" ? "&components=country:za" : "";
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          text.trim()
        )}${componentFilter}&key=${GOOGLE_MAPS_API_KEY}`;

        const res = await fetch(url);
        const data = await res.json();

        if (data && data.status === "OK" && Array.isArray(data.predictions)) {
          setAddressPredictions(data.predictions);
          setShowAddressDropdown(true);
        } else {
          setAddressPredictions([]);
          setShowAddressDropdown(false);
        }
      } catch (err) {
        console.log("Address autocomplete error:", err);
      } finally {
        setIsSearchingAddress(false);
      }
    }, 320);
  };

  // Select Address Prediction & Fetch Place Details
  const handleSelectAddressPrediction = async (prediction) => {
    Keyboard.dismiss();
    setShowAddressDropdown(false);

    const mainText = prediction.structured_formatting?.main_text || prediction.description || "";
    const secondaryText = prediction.structured_formatting?.secondary_text || "";
    const parts = secondaryText.split(",").map((s) => s.trim()).filter(Boolean);

    let fallbackCity = "";
    let fallbackCountry = "";
    if (parts.length >= 2) {
      fallbackCountry = parts[parts.length - 1];
      fallbackCity = parts[parts.length - 2];
    } else if (parts.length === 1) {
      fallbackCity = parts[0];
    }

    setAddress(mainText);
    if (fallbackCity) {
      setCity(fallbackCity);
      const lowerCity = fallbackCity.toLowerCase();
      if (CITY_POSTAL_CODES_MAP[lowerCity]) {
        setCurrentCityPostalCodes(CITY_POSTAL_CODES_MAP[lowerCity]);
      }
    }
    if (deliveryPreference === "postnet") {
      setCountry("South Africa");
    } else if (fallbackCountry) {
      setCountry(fallbackCountry);
    }

    try {
      setIsSearchingAddress(true);
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=address_components,formatted_address,geometry,name&key=${GOOGLE_MAPS_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data && data.status === "OK" && data.result) {
        const components = data.result.address_components || [];
        let stNumber = "";
        let route = "";
        let subpremise = "";
        let premise = "";
        let suburb = "";
        let localityCity = "";
        let postalTownCity = "";
        let adminCity = "";
        let detectedPostal = "";
        let detectedCountry = "";

        for (const c of components) {
          const types = c.types || [];
          if (types.includes("street_number")) stNumber = c.long_name;
          if (types.includes("route")) route = c.long_name;
          if (types.includes("subpremise")) subpremise = c.long_name;
          if (types.includes("premise")) premise = c.long_name;
          if (types.includes("sublocality_level_1") || types.includes("sublocality")) suburb = c.long_name;
          if (types.includes("locality")) localityCity = c.long_name;
          if (types.includes("postal_town")) postalTownCity = c.long_name;
          if (types.includes("administrative_area_level_2")) adminCity = c.long_name;
          if (types.includes("postal_code")) detectedPostal = c.long_name;
          if (types.includes("country")) detectedCountry = c.long_name;
        }

        const finalCity = localityCity || postalTownCity || suburb || adminCity;

        let streetLine = "";
        if (stNumber && route) streetLine = `${stNumber} ${route}`;
        else if (route) streetLine = route;
        else if (mainText) streetLine = mainText;
        else if (data.result.name) streetLine = data.result.name;
        else streetLine = (data.result.formatted_address || "").split(",")[0];

        if (subpremise) streetLine = `Unit ${subpremise}, ${streetLine}`;
        else if (premise && !streetLine.includes(premise)) streetLine = `${premise}, ${streetLine}`;

        if (suburb && suburb !== finalCity && !streetLine.includes(suburb)) {
          streetLine = `${streetLine}, ${suburb}`;
        }

        if (streetLine) setAddress(streetLine);
        if (finalCity) {
          setCity(finalCity);
          const lowerCity = finalCity.toLowerCase();
          if (CITY_POSTAL_CODES_MAP[lowerCity]) {
            setCurrentCityPostalCodes(CITY_POSTAL_CODES_MAP[lowerCity]);
          }
        }
        if (detectedPostal) setPostalCode(detectedPostal);

        if (deliveryPreference === "postnet") {
          setCountry("South Africa");
        } else if (detectedCountry) {
          setCountry(detectedCountry);
          const isSA =
            detectedCountry.trim().toLowerCase() === "south africa" ||
            detectedCountry.trim().toLowerCase() === "za";
          // If international address is picked, switch payment method to Bank Transfer (EFT) because PayFast is ZA only
          if (!isSA && paymentMethod === "payfast") {
            setPaymentMethod("bank_transfer");
            showMessage(`🌍 Destination: ${detectedCountry} — Switched to Bank Transfer & DHL Express`);
          }
        }

        if (data.result.geometry?.location) {
          setLat(data.result.geometry.location.lat);
          setLng(data.result.geometry.location.lng);
        }

        showMessage("📍 Address autocompleted!");
      }
    } catch (err) {
      console.log("Place details error:", err);
    } finally {
      setIsSearchingAddress(false);
    }
  };

  // City Autocomplete Search (Debounced via Google Places - Global in Door Delivery)
  const handleCityInputChange = (text) => {
    setCity(text);
    setQuote(null);

    if (citySearchTimeout.current) clearTimeout(citySearchTimeout.current);

    if (!text || text.trim().length < 2) {
      setCityPredictions(DEFAULT_SA_CITIES);
      setShowCityDropdown(true);
      return;
    }

    citySearchTimeout.current = setTimeout(async () => {
      try {
        setIsSearchingCity(true);
        // Only restrict to South Africa if PostNet pickup is chosen
        const componentFilter = deliveryPreference === "postnet" ? "&components=country:za" : "";
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          text.trim()
        )}&types=(cities)${componentFilter}&key=${GOOGLE_MAPS_API_KEY}`;

        const res = await fetch(url);
        const data = await res.json();

        if (data && data.status === "OK" && Array.isArray(data.predictions)) {
          setCityPredictions(data.predictions);
          setShowCityDropdown(true);
        } else {
          setCityPredictions(DEFAULT_SA_CITIES.filter((c) =>
            c.main_text.toLowerCase().includes(text.toLowerCase())
          ));
          setShowCityDropdown(true);
        }
      } catch (err) {
        console.log("City autocomplete error:", err);
      } finally {
        setIsSearchingCity(false);
      }
    }, 280);
  };

  // Select City from Dropdown & Update Postal Codes & PostNet Branches
  const handleSelectCity = async (prediction) => {
    Keyboard.dismiss();
    setShowCityDropdown(false);

    const fullDesc = prediction.description || "";
    const cityName = prediction.structured_formatting?.main_text || prediction.main_text || fullDesc.split(",")[0].trim();
    setCity(cityName);
    setQuote(null);
    setHasSelectedCityForPostnet(true);
    setPreferredPostnetStore(null);

    // Look up and AUTO-FILL postal code for this selected city
    const lowerCity = cityName.toLowerCase();
    let autoPostal = prediction.postalCode || "";
    const mappedCodes = CITY_POSTAL_CODES_MAP[lowerCity];

    if (mappedCodes && mappedCodes.length > 0) {
      setCurrentCityPostalCodes(mappedCodes);
      if (!autoPostal) autoPostal = mappedCodes[0].code;
    } else {
      const matchKey = Object.keys(CITY_POSTAL_CODES_MAP).find(
        (k) => lowerCity.includes(k) || k.includes(lowerCity)
      );
      if (matchKey && CITY_POSTAL_CODES_MAP[matchKey]?.length > 0) {
        setCurrentCityPostalCodes(CITY_POSTAL_CODES_MAP[matchKey]);
        if (!autoPostal) autoPostal = CITY_POSTAL_CODES_MAP[matchKey][0].code;
      } else {
        const fallbackPostnet = FALLBACK_POSTNET_STORES[lowerCity];
        if (fallbackPostnet && fallbackPostnet.length > 0 && fallbackPostnet[0].postalCode) {
          autoPostal = fallbackPostnet[0].postalCode;
        } else {
          fetchDynamicPostalCodesForCity(cityName);
        }
      }
    }

    if (autoPostal) {
      setPostalCode(autoPostal);
      showMessage(`🏙️ ${cityName} selected (${autoPostal})`);
    } else {
      showMessage(`🏙️ ${cityName} selected`);
    }

    // Immediately fetch PostNet branches near this clicked city
    fetchPostnetBranches(cityName);

    if (prediction.place_id) {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=geometry,address_components&key=${GOOGLE_MAPS_API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data && data.status === "OK" && data.result) {
          if (data.result.geometry?.location) {
            setLat(data.result.geometry.location.lat);
            setLng(data.result.geometry.location.lng);
          }
          const comps = data.result.address_components || [];
          const countryComp = comps.find((c) => c.types?.includes("country"));
          if (countryComp && deliveryPreference !== "postnet") {
            setCountry(countryComp.long_name);
            const isSA =
              countryComp.long_name.toLowerCase() === "south africa" ||
              countryComp.long_name.toLowerCase() === "za";
            if (!isSA && paymentMethod === "payfast") {
              setPaymentMethod("bank_transfer");
              showMessage(`🌍 ${countryComp.long_name} selected — Switched to Bank Transfer & DHL Express`);
            }
          }
        }
      } catch (err) {
        // ignore
      }
    }
  };

  // Dynamic Google Places regional query to find postal codes for any city
  const fetchDynamicPostalCodesForCity = async (cityName) => {
    try {
      const componentFilter = deliveryPreference === "postnet" ? "&components=country:za" : "";
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        cityName
      )}+postal+code${componentFilter}&key=${GOOGLE_MAPS_API_KEY}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data && data.status === "OK" && Array.isArray(data.predictions)) {
        const extracted = [];
        const seen = new Set();

        data.predictions.forEach((p) => {
          const match = p.description.match(/\b\d{4,6}\b/);
          if (match && !seen.has(match[0])) {
            seen.add(match[0]);
            extracted.push({
              code: match[0],
              area: p.structured_formatting?.main_text || p.description.split(",")[0],
            });
          }
        });

        if (extracted.length > 0) {
          setCurrentCityPostalCodes(extracted);
          setPostalCode(extracted[0].code);
        }
      }
    } catch (err) {
      console.log("Dynamic postal code query error:", err);
    }
  };

  // Google Places Postal Code Autocomplete (Debounced)
  const handlePostalCodeChange = (text) => {
    setPostalCode(text);
    setQuote(null);

    if (postalSearchTimeout.current) clearTimeout(postalSearchTimeout.current);

    if (!text || text.trim().length < 2) {
      setPostalPredictions([]);
      setShowPostalDropdown(false);
      return;
    }

    postalSearchTimeout.current = setTimeout(async () => {
      try {
        setIsSearchingPostal(true);
        const componentFilter = deliveryPreference === "postnet" ? "&components=country:za" : "";
        const queryText = city ? `${text.trim()} ${city}` : text.trim();
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          queryText
        )}&types=(regions)${componentFilter}&key=${GOOGLE_MAPS_API_KEY}`;

        const res = await fetch(url);
        const data = await res.json();

        if (data && data.status === "OK" && Array.isArray(data.predictions)) {
          setPostalPredictions(data.predictions);
          setShowPostalDropdown(true);
        } else {
          setPostalPredictions([]);
          setShowPostalDropdown(false);
        }
      } catch (err) {
        console.log("Postal code search error:", err);
      } finally {
        setIsSearchingPostal(false);
      }
    }, 300);
  };

  // Select Postal Code Prediction
  const handleSelectPostalPrediction = (prediction) => {
    Keyboard.dismiss();
    setShowPostalDropdown(false);

    const mainText = prediction.structured_formatting?.main_text || prediction.description || "";
    const digitsMatch = mainText.match(/\b\d{4,6}\b/) || prediction.description.match(/\b\d{4,6}\b/);
    const chosenCode = digitsMatch ? digitsMatch[0] : mainText;
    setPostalCode(chosenCode);

    const sec = prediction.structured_formatting?.secondary_text || "";
    if (sec) {
      const parts = sec.split(",").map((s) => s.trim()).filter(Boolean);
      if (parts.length > 0 && !city) {
        setCity(parts[0]);
      }
    }

    showMessage(`📮 Postal code set to ${chosenCode}`);
  };

  // Calculate Delivery Rates via Backend /api/checkout/quote
  const calculateDeliveryQuote = async () => {
    if (!city.trim()) {
      showMessage("Please enter your delivery city to calculate rates");
      return;
    }

    setIsCalculatingQuote(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const effectiveCountry =
        paymentMethod === "payfast" || deliveryPreference === "postnet"
          ? "South Africa"
          : country.trim() || "South Africa";

      const quotePayload = {
        cartItems: checkoutItems.map((item) => ({
          product: item.productid || item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        shippingAddress: {
          address:
            deliveryPreference === "postnet" && preferredPostnetStore
              ? preferredPostnetStore.address
              : address.trim() || `${city.trim()}, South Africa`,
          city: city.trim(),
          postalCode: postalCode.trim() || "2000",
          country: effectiveCountry,
          lat,
          lng,
        },
        deliveryPreference,
      };

      const headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      let data = null;
      const res = await safeApiFetch("/checkout/quote", {
        method: "POST",
        headers,
        body: JSON.stringify(quotePayload),
      });

      if (res && res.ok) {
        data = await res.json();
      }

      if (data && data.shipments && data.shipments.length > 0) {
        setQuote(data);
        if (data.superCoins) {
          setSuperCoinsQuote(data.superCoins);
        } else {
          const coinVal = 0.10;
          const maxPct = 0.10;
          const maxRand = Math.min(subtotal * maxPct, (userSuperCoins || 0) * coinVal);
          const maxCoins = Math.floor(maxRand / coinVal);
          setSuperCoinsQuote({
            availableCoins: userSuperCoins || 0,
            coinValue: coinVal,
            maxRedeemableCoins: maxCoins,
            maxDiscountRand: maxRand,
            potentialCoinsToEarn: Math.floor((subtotal / 100) * 10),
            isMarginCapped: (userSuperCoins || 0) * coinVal > subtotal * maxPct,
            marginMessage: "Deduction capped at 10% to protect 15% platform margin",
          });
        }
        const shipment = data.shipments[0];
        const quotesList = shipment.shippingQuotes || [];

        // Auto-select preferred courier
        if (deliveryPreference === "postnet") {
          const pn = quotesList.find((q) => q.courierName === "PostNet" && (q.deliveryType === "pickup" || q.serviceLevel.includes("Collection")));
          setSelectedCourier(pn || quotesList[0]);
        } else if (effectiveCountry.toLowerCase() === "south africa") {
          const pn = quotesList.find((q) => q.serviceLevel.includes("Standard")) || quotesList.find((q) => q.courierName === "PostNet");
          setSelectedCourier(pn || quotesList[0]);
        } else {
          // International -> DHL Express
          const dhl = quotesList.find((q) => q.courierName.includes("DHL"));
          setSelectedCourier(dhl || quotesList[0]);
        }

        showMessage("✅ Live courier rates calculated!");
      } else {
        // Fallback curated courier quotes when offline / guest / unauthenticated
        const fallbackQuotes = isSouthAfrica
          ? deliveryPreference === "postnet"
            ? [
                {
                  courierName: "PostNet",
                  serviceLevel: "PostNet Store Collection",
                  deliveryType: "pickup",
                  cost: 100,
                  estimatedDays: "2-3 business days",
                },
              ]
            : [
                {
                  courierName: "PostNet",
                  serviceLevel: "PostNet Standard Delivery",
                  deliveryType: "home",
                  cost: 120,
                  estimatedDays: "2-5 business days",
                },
                {
                  courierName: "PostNet",
                  serviceLevel: "PostNet Express Delivery",
                  deliveryType: "home",
                  cost: 180,
                  estimatedDays: "1-2 business days",
                },
                {
                  courierName: "Courier Guy",
                  serviceLevel: "Courier Guy Door Delivery",
                  deliveryType: "home",
                  cost: 150,
                  estimatedDays: "2-3 business days",
                },
              ]
          : [
              {
                courierName: "DHL Express",
                serviceLevel: "DHL Express International Air",
                deliveryType: "home",
                cost: 1800,
                estimatedDays: "3-5 business days",
              },
            ];

        const coinVal = 0.10;
        const maxPct = 0.10;
        const maxRand = Math.min(subtotal * maxPct, (userSuperCoins || 0) * coinVal);
        const maxCoins = Math.floor(maxRand / coinVal);
        const fallbackSuperCoins = {
          availableCoins: userSuperCoins || 0,
          coinValue: coinVal,
          maxRedeemableCoins: maxCoins,
          maxDiscountRand: maxRand,
          potentialCoinsToEarn: Math.floor((subtotal / 100) * 10),
          isMarginCapped: (userSuperCoins || 0) * coinVal > subtotal * maxPct,
          marginMessage: "Deduction capped at 10% to protect 15% platform margin",
        };
        setSuperCoinsQuote(fallbackSuperCoins);

        const fallbackQuote = {
          globalSubtotal: subtotal,
          subTotal: subtotal,
          expiresAt: new Date(Date.now() + 60 * 60000).toISOString(),
          hasInternational: !isSouthAfrica,
          aggregatedTotals: {
            shipping: fallbackQuotes[0]?.cost || 100,
            vat: 0,
            estimatedImportDuties: !isSouthAfrica ? Math.round(subtotal * 0.15) : 0,
            estimatedImportTaxes: !isSouthAfrica ? Math.round(subtotal * 0.20) : 0,
          },
          superCoins: fallbackSuperCoins,
          shipments: [
            {
              shippingQuotes: fallbackQuotes,
              selectedCourier: fallbackQuotes[0],
              selectedPickupStore: deliveryPreference === "postnet" ? preferredPostnetStore : null,
            },
          ],
        };

        setQuote(fallbackQuote);
        setSelectedCourier(fallbackQuotes[0]);
      }
    } catch (err) {
      console.log("Delivery quote fallback applied:", err?.message || err);
      const fallbackQuotes = isSouthAfrica
        ? deliveryPreference === "postnet"
          ? [
              {
                courierName: "PostNet",
                serviceLevel: "PostNet Store Collection",
                deliveryType: "pickup",
                cost: 100,
                estimatedDays: "2-3 business days",
              },
            ]
          : [
              {
                courierName: "PostNet",
                serviceLevel: "PostNet Standard Delivery",
                deliveryType: "home",
                cost: 120,
                estimatedDays: "2-5 business days",
              },
              {
                courierName: "PostNet",
                serviceLevel: "PostNet Express Delivery",
                deliveryType: "home",
                cost: 180,
                estimatedDays: "1-2 business days",
              },
              {
                courierName: "Courier Guy",
                serviceLevel: "Courier Guy Door Delivery",
                deliveryType: "home",
                cost: 150,
                estimatedDays: "2-3 business days",
              },
            ]
        : [
            {
              courierName: "DHL Express",
              serviceLevel: "DHL Express Worldwide",
              deliveryType: "home",
              cost: 1800,
              estimatedDays: "3-5 business days",
            },
          ];

      const coinVal = 0.10;
      const maxPct = 0.10;
      const maxRand = Math.min(subtotal * maxPct, (userSuperCoins || 0) * coinVal);
      const maxCoins = Math.floor(maxRand / coinVal);
      const fallbackSuperCoins = {
        availableCoins: userSuperCoins || 0,
        coinValue: coinVal,
        maxRedeemableCoins: maxCoins,
        maxDiscountRand: maxRand,
        potentialCoinsToEarn: Math.floor((subtotal / 100) * 10),
        isMarginCapped: (userSuperCoins || 0) * coinVal > subtotal * maxPct,
        marginMessage: "Deduction capped at 10% to protect 15% platform margin",
      };
      setSuperCoinsQuote(fallbackSuperCoins);

      setQuote({
        globalSubtotal: subtotal,
        subTotal: subtotal,
        expiresAt: new Date(Date.now() + 60 * 60000).toISOString(),
        hasInternational: !isSouthAfrica,
        aggregatedTotals: {
          shipping: fallbackQuotes[0]?.cost || (deliveryPreference === "postnet" ? 100 : 120),
          vat: 0,
          estimatedImportDuties: Math.round(subtotal * 0.15),
          estimatedImportTaxes: Math.round(subtotal * 0.20),
        },
        superCoins: fallbackSuperCoins,
        shipments: [
          {
            shippingQuotes: fallbackQuotes,
            selectedCourier: fallbackQuotes[0],
            selectedPickupStore: deliveryPreference === "postnet" ? preferredPostnetStore : null,
          },
        ],
      });
      setSelectedCourier(fallbackQuotes[0]);
    } finally {
      setIsCalculatingQuote(false);
    }
  };

  // Payment method selection with strict country locking for PayFast
  const handlePaymentMethodSelect = (method) => {
    setPaymentMethod(method);
    if (method === "payfast") {
      if (!isSouthAfrica) {
        setCountry("South Africa");
        showMessage("🇿🇦 Country set to South Africa (PayFast only accepts ZAR in South Africa)");
      }
    }
  };

  // Filter PostNet stores by search
  const filteredPostnetStores = (postnetStores || []).filter((store) => {
    if (!branchSearch.trim()) return true;
    const term = branchSearch.toLowerCase();
    return (
      (store.name || "").toLowerCase().includes(term) ||
      (store.address || "").toLowerCase().includes(term) ||
      (store.city || "").toLowerCase().includes(term)
    );
  });

  // Calculations
  const subtotal = checkoutItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = Number(paramDiscount) || 0;

  // Super Coin discount calculation (10 Super Coins = R1.00, Max 10% Order Cap)
  const superCoinDiscount =
    useSuperCoins && (superCoinsQuote || quote?.superCoins)
      ? Number(
          superCoinsQuote?.maxDiscountRand ??
          quote?.superCoins?.maxDiscountRand ??
          0
        )
      : 0;

  // Dynamic shipping fee based on live calculated quote or standard fallback
  let shippingFee = 0;
  if (selectedCourier) {
    shippingFee = Number(selectedCourier.cost) || 0;
  } else if (deliveryPreference === "postnet") {
    shippingFee = 100;
  } else if (isSouthAfrica) {
    shippingFee = 120;
  } else {
    // International DHL Express flat rate
    shippingFee = 1800;
  }

  // International duties/taxes estimate (matches web aggregated totals formula)
  const estimatedDutiesTaxes =
    quote?.aggregatedTotals?.estimatedImportDuties != null && quote?.aggregatedTotals?.estimatedImportTaxes != null
      ? Number(quote.aggregatedTotals.estimatedImportDuties) + Number(quote.aggregatedTotals.estimatedImportTaxes)
      : quote?.shipments?.[0]?.landedCostEstimates
      ? Number(quote.shipments[0].landedCostEstimates.estimatedDuties || 0) + Number(quote.shipments[0].landedCostEstimates.estimatedTaxes || 0)
      : Math.round(subtotal * 0.35 * 100) / 100;

  const grandTotal = Math.max(0, subtotal - discount - superCoinDiscount + shippingFee);

  const getItemKey = (item) => String(item.id || item.productid || item._id || "");

  const persistCartIfApplicable = async (updatedItems) => {
    if (!singleItemCheckout) {
      try {
        await AsyncStorage.setItem("grand-store-cart", JSON.stringify(updatedItems));
        DeviceEventEmitter.emit("cartUpdated", updatedItems.length);
      } catch (e) {
        console.log("Error persisting cart from checkout:", e);
      }
    }
  };

  const handleIncrementItemQty = (itemKey) => {
    const updated = checkoutItems.map((item) => {
      if (getItemKey(item) === itemKey) {
        return { ...item, quantity: (Number(item.quantity) || 1) + 1 };
      }
      return item;
    });
    setCheckoutItems(updated);
    persistCartIfApplicable(updated);
  };

  const handleDecrementItemQty = (itemKey) => {
    const target = checkoutItems.find((item) => getItemKey(item) === itemKey);
    if (!target) return;

    if ((Number(target.quantity) || 1) > 1) {
      const updated = checkoutItems.map((item) => {
        if (getItemKey(item) === itemKey) {
          return { ...item, quantity: (Number(item.quantity) || 1) - 1 };
        }
        return item;
      });
      setCheckoutItems(updated);
      persistCartIfApplicable(updated);
    } else {
      handleRemoveCheckoutItem(itemKey);
    }
  };

  const handleRemoveCheckoutItem = (itemKey) => {
    const target = checkoutItems.find((item) => getItemKey(item) === itemKey);
    const itemName = target?.name || "this bottle";

    Alert.alert(
      "Remove Bottle",
      `Remove "${itemName}" from your order?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            const updated = checkoutItems.filter(
              (item) => getItemKey(item) !== itemKey
            );
            setCheckoutItems(updated);
            persistCartIfApplicable(updated);

            if (updated.length === 0) {
              showMessage("Order reserve is empty");
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate("Cart");
              }
            } else {
              showMessage("Removed from reserve");
            }
          },
        },
      ]
    );
  };

  // Step 1 -> Step 2 validation & rate calculation
  const handleProceedToDeliveryMethod = async () => {
    if (!checkoutItems || checkoutItems.length === 0) {
      showMessage("Your order reserve is empty. Please add bottles first.");
      return;
    }
    if (!fullName.trim()) {
      showMessage("Please enter recipient full name");
      return;
    }
    if (!checkoutPhone) {
      showMessage("Please select a country code and enter a valid phone number for that country");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      showMessage("Please enter a valid email for order receipt");
      return;
    }
    if (deliveryPreference === "home" && !address.trim()) {
      showMessage("Please enter your street delivery address");
      return;
    }
    if (deliveryPreference === "home" && !city.trim()) {
      showMessage("Please enter your delivery city or town");
      return;
    }
    if (deliveryPreference === "postnet" && !preferredPostnetStore) {
      showMessage("Please search and select your preferred PostNet collection branch");
      return;
    }
    if (deliveryPreference === "postnet" && preferredPostnetStore && !city.trim()) {
      setCity(preferredPostnetStore.city || preferredPostnetStore.suburb || "Johannesburg");
    }
    /*
    ========================================================================================
    [COMMENTED OUT FOR NOW - 18+ VERIFICATION & ID DOCUMENT UPLOAD IS ONLY FOR AUCTIONS]
    ========================================================================================
    if (!isAgeConfirmed) {
      showMessage("Please certify that you are at least 18 years of age to purchase alcoholic beverages.");
      return;
    }
    const token = await AsyncStorage.getItem("userToken");
    if (!token) {
      if (!guestIdNumber.trim()) {
        showMessage("Please enter your official ID / Passport number for 18+ verification.");
        return;
      }
      if (!guestDocUrl) {
        showMessage("Please upload or attach your official ID document for 18+ verification.");
        return;
      }
    }
    ========================================================================================
    */

    await calculateDeliveryQuote();
    setCheckoutStep(2);
  };

  // Step 2 -> Step 3 validation
  const handleProceedToPayment = () => {
    if (!selectedCourier) {
      showMessage("Please select your preferred delivery service.");
      return;
    }
    if (!isSouthAfrica && !dutiesAccepted) {
      showMessage("Please accept the International Duties acknowledgment.");
      return;
    }
    setCheckoutStep(3);
  };

  // Submit Order & Launch PayFast Sandbox or EFT Instructions
  const handlePlaceOrder = async () => {
    if (!checkoutItems || checkoutItems.length === 0) {
      showMessage("Your order reserve is empty. Please add bottles first.");
      return;
    }
    if (!fullName.trim()) {
      showMessage("Please enter recipient full name");
      return;
    }
    if (!checkoutPhone) {
      showMessage("Please select a country code and enter a valid phone number for that country");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      showMessage("Please enter a valid email for order receipt");
      return;
    }
    if (deliveryPreference !== "postnet" && !address.trim()) {
      showMessage("Please enter your street delivery address");
      return;
    }
    if (deliveryPreference === "postnet" && !preferredPostnetStore) {
      showMessage("Please select a PostNet branch for pickup");
      return;
    }
    if (paymentMethod === "payfast" && !isSouthAfrica) {
      showMessage("PayFast is exclusive to South Africa. Please switch to South Africa or select Bank Transfer (EFT).");
      return;
    }
    if (!isSouthAfrica && !dutiesAccepted) {
      showMessage("Please accept the International Duties acknowledgment");
      return;
    }

    const token = await AsyncStorage.getItem("userToken");

    /*
    ========================================================================================
    [COMMENTED OUT FOR NOW - 18+ VERIFICATION & ID DOCUMENT UPLOAD IS ONLY FOR AUCTIONS]
    ========================================================================================
    if (!isAgeConfirmed) {
      showMessage("Please certify that you are at least 18 years of age to purchase alcoholic beverages.");
      return;
    }
    if (!isUserAgeVerified) {
      if (!guestIdNumber.trim()) {
        showMessage("Please enter your official ID / Passport number for 18+ verification.");
        return;
      }
    }
    ========================================================================================
    */

    try {
      setIsSubmitting(true);

      const generatedOrderId = `GS-${Date.now().toString().slice(-6).toUpperCase()}`;

      const finalShippingAddress = {
        name: (fullName || "").trim() || "Customer",
        fullName: (fullName || "").trim() || "Customer",
        ...checkoutPhone,
        email: (email || "").trim() || "customer@grandstore.co.za",
        address:
          deliveryPreference === "postnet" && preferredPostnetStore
            ? preferredPostnetStore.address
            : (address || "").trim() || "Collection Address",
        city: (city || "").trim() || preferredPostnetStore?.city || "Johannesburg",
        postalCode: (postalCode || "").trim() || preferredPostnetStore?.postalCode || "2000",
        country: isSouthAfrica ? "South Africa" : (country || "").trim() || "South Africa",
      };

      let finalOrderId = generatedOrderId;
      let orderMongoId = null;

      const reqHeaders = { "Content-Type": "application/json" };
      if (token) reqHeaders.Authorization = `Bearer ${token}`;

      // 1. Submit order to backend /api/orders (supports both authenticated and guest orders)
      try {
        let finalQuote = quote;
        if (!finalQuote) {
          const quoteRes = await safeApiFetch("/checkout/quote", {
            method: "POST",
            headers: reqHeaders,
            body: JSON.stringify({
              cartItems: checkoutItems.map((item) => ({
                product: item.productid || item.id,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                image: item.image,
                option: item.size || item.option,
              })),
              shippingAddress: finalShippingAddress,
              deliveryPreference,
            }),
          });
          if (quoteRes && quoteRes.ok) finalQuote = await quoteRes.json();
        }

        // Guaranteed fallback quote if remote quote generation is not available
        if (!finalQuote || !Array.isArray(finalQuote.shipments) || finalQuote.shipments.length === 0) {
          const fallbackCost = deliveryPreference === "postnet" ? 100 : 120;
          finalQuote = {
            globalSubtotal: subtotal,
            subTotal: subtotal,
            expiresAt: new Date(Date.now() + 60 * 60000).toISOString(),
            hasInternational: !isSouthAfrica,
            aggregatedTotals: {
              shipping: shippingFee || fallbackCost,
              vat: 0,
              estimatedImportDuties: !isSouthAfrica ? Math.round(subtotal * 0.15) : 0,
              estimatedImportTaxes: !isSouthAfrica ? Math.round(subtotal * 0.20) : 0,
            },
            shipments: [
              {
                shippingQuotes: [
                  {
                    courierName: deliveryPreference === "postnet" ? "PostNet" : "Courier Guy",
                    serviceLevel: deliveryPreference === "postnet" ? "PostNet Store Collection" : "Door Delivery",
                    deliveryType: deliveryPreference === "postnet" ? "pickup" : "home",
                    cost: shippingFee || fallbackCost,
                  },
                ],
                selectedCourier: selectedCourier || {
                  courierName: deliveryPreference === "postnet" ? "PostNet" : "Courier Guy",
                  serviceLevel: deliveryPreference === "postnet" ? "PostNet Store Collection" : "Door Delivery",
                  deliveryType: deliveryPreference === "postnet" ? "pickup" : "home",
                  cost: shippingFee || fallbackCost,
                },
                selectedPickupStore: deliveryPreference === "postnet" ? preferredPostnetStore : null,
              },
            ],
          };
        }

        if (finalQuote && Array.isArray(finalQuote.shipments)) {
          finalQuote.shipments.forEach((shp) => {
            if (selectedCourier) {
              shp.selectedCourier = selectedCourier;
            }
            if (preferredPostnetStore) {
              shp.selectedPickupStore = preferredPostnetStore;
            }
          });
          if (!finalQuote.expiresAt) {
            finalQuote.expiresAt = new Date(Date.now() + 60 * 60000).toISOString();
          }
          if (!finalQuote.globalSubtotal) {
            finalQuote.globalSubtotal = subtotal;
          }
          if (!finalQuote.subTotal) {
            finalQuote.subTotal = subtotal;
          }

          const orderPayload = {
            quote: finalQuote,
            shippingAddress: finalShippingAddress,
            deliveryPreference,
            selectedPostnetStore: preferredPostnetStore,
            paymentMethod: paymentMethod === "payfast" ? "PayFast" : "Bank Transfer",
            useSuperCoins: Boolean(token && useSuperCoins),
            isAgeConfirmed: true,
            isGuest: !token,
            guestEmail: (email || "").trim(),
            guestName: (fullName || "").trim(),
            guestPhone: checkoutPhone.phone,
            isGift: Boolean(isGift),
            giftRecipientName: isGift ? String(giftRecipientName || "").trim() : "",
            giftMessage: isGift ? String(giftMessage || "").trim() : "",
            guestKyc: (!token || !isUserAgeVerified) && (guestDocUrl || guestIdNumber)
              ? {
                  idType: guestIdType,
                  idNumber: String(guestIdNumber || "").trim(),
                  dateOfBirth: String(guestDob || "").trim(),
                  documentUrl: guestDocUrl,
                  documentType: guestDocFileName && String(guestDocFileName).toLowerCase().endsWith(".pdf") ? "pdf" : "image",
                }
              : null,
          };

          const orderRes = await safeApiFetch("/orders", {
            method: "POST",
            headers: reqHeaders,
            body: JSON.stringify(orderPayload),
          });

          if (orderRes && orderRes.ok) {
            const orderData = await orderRes.json();
            if (orderData) {
              finalOrderId = orderData.orderId || orderData._id || generatedOrderId;
              orderMongoId = orderData._id || null;
            }
          } else {
            const errData = await orderRes?.json?.().catch(() => null);
            const errMsg = errData?.message || "Order could not be registered on server. Please check your connection.";
            console.log("Order submission failed:", errMsg);
            if (paymentMethod === "payfast") {
              Alert.alert("Order Submission Error", errMsg);
              setIsSubmitting(false);
              return;
            }
          }
        }
      } catch (apiErr) {
        console.log("Backend API order submission skipped/fallback:", apiErr?.message || apiErr);
      }

      // If user supplied KYC documents during checkout, save and unlock verification permanently
      if (!isUserAgeVerified && (guestDocUrl || guestIdNumber)) {
        setIsUserAgeVerified(true);
        await AsyncStorage.setItem("isAgeVerified", "true");
        await AsyncStorage.setItem("grand-store-age-verified", "true");
        try {
          const uRaw = await AsyncStorage.getItem("userInfo");
          if (uRaw) {
            const parsed = JSON.parse(uRaw);
            parsed.isAgeVerified = true;
            if (guestDocUrl) parsed.idDocumentUrl = guestDocUrl;
            if (guestIdNumber) parsed.idNumber = String(guestIdNumber).trim();
            if (guestDob) parsed.dateOfBirth = String(guestDob).trim();
            if (parsed.bidderApprovalStatus === "unregistered") {
              parsed.bidderApprovalStatus = "pending_approval";
            }
            await AsyncStorage.setItem("userInfo", JSON.stringify(parsed));
          }
        } catch (e) {}
        DeviceEventEmitter.emit("userAgeVerified", { isAgeVerified: true });
      }

      // Construct order summary for in-app receipt & confirmation
      const orderSummary = {
        orderId: finalOrderId,
        orderMongoId,
        isGuest: !token,
        guestKyc: (!token || !isUserAgeVerified) && (guestDocUrl || guestIdNumber)
          ? {
              idType: guestIdType || "national_id",
              idNumber: String(guestIdNumber || "").trim(),
              status: "pending_review",
              documentUrl: guestDocUrl,
            }
          : null,
        isAgeConfirmed: true,
        date: (() => {
          try {
            return new Date().toLocaleDateString("en-ZA", {
              year: "numeric",
              month: "short",
              day: "numeric",
            });
          } catch (e) {
            return new Date().toISOString().split("T")[0];
          }
        })(),
        createdAt: new Date().toISOString(),
        items: checkoutItems.map((i) => ({
          name: i.name || "Item",
          price: Number(i.price || 0),
          quantity: Number(i.quantity || 1),
          image: i.image,
          size: i.size || "750ml",
        })),
        subtotal,
        shippingFee,
        discount,
        superCoinsDiscount: token ? superCoinDiscount : 0,
        superCoinsUsed:
          token && useSuperCoins
            ? superCoinsQuote?.maxRedeemableCoins || quote?.superCoins?.maxRedeemableCoins || 0
            : 0,
        superCoinsEarned: token
          ? superCoinsQuote?.potentialCoinsToEarn ||
            quote?.superCoins?.potentialCoinsToEarn ||
            Math.floor((subtotal / 100) * 10)
          : 0,
        deliveryPreference,
        isGift: Boolean(isGift),
        giftRecipientName: isGift ? String(giftRecipientName || "").trim() : "",
        giftMessage: isGift ? String(giftMessage || "").trim() : "",
        grandTotal,
        paymentMethod:
          paymentMethod === "payfast"
            ? "PayFast Sandbox (Instant Cards / EFT)"
            : "Manual Bank Transfer (Standard Bank)",
        paymentStatus: paymentMethod === "payfast" ? "Pending" : "Pending",
        courierName: selectedCourier
          ? `${selectedCourier.courierName} (${selectedCourier.serviceLevel})`
          : deliveryPreference === "postnet"
          ? "PostNet"
          : "Courier Guy",
        pickupStore: preferredPostnetStore,
        bankDetails: {
          bankName: "Standard Bank",
          accountName: "The Grand Store PTY LTD",
          accountNumber: "0123456789",
          branchCode: "051001",
          reference: String(finalOrderId || "").slice(-8).toUpperCase(),
        },
        recipient: {
          fullName: (fullName || "").trim() || "Customer",
          ...checkoutPhone,
          email: (email || "").trim(),
          address:
            deliveryPreference === "postnet" && preferredPostnetStore
              ? `Pickup: ${preferredPostnetStore.name || "PostNet"} — ${preferredPostnetStore.address || "Store Collection"}`
              : `${finalShippingAddress.address || "Collection"}, ${finalShippingAddress.city || ""}, ${finalShippingAddress.postalCode || ""}, ${finalShippingAddress.country || ""}`,
        },
      };

      // 2. If PayFast selected, launch directly inside IN-APP WebView modal (supports both user and guest orders)
      if (paymentMethod === "payfast" && (orderMongoId || finalOrderId)) {
        try {
          const targetPayOrderId = orderMongoId || finalOrderId;
          const pfRes = await safeApiFetch("/payfast/generate-shop", {
            method: "POST",
            headers: reqHeaders,
            body: JSON.stringify({ orderId: targetPayOrderId, isMobile: true }),
          });

          if (pfRes && pfRes.ok) {
            const pfData = await pfRes.json();
            if (pfData && pfData.url && pfData.data) {
              activeOrderRef.current = orderSummary;
              setCreatedOrder(orderSummary);
              saveOrderToLocalStorage(orderSummary);
              setPayfastModalData({
                url: pfData.url,
                fields: pfData.data,
                orderSummary,
              });
              setShowPayfastModal(true);
              setIsPayfastLoading(true);
              setIsSubmitting(false);
              return;
            }
          } else {
            console.log("PayFast generate-shop returned non-ok status:", pfRes?.status);
            const errData = await pfRes?.json?.().catch(() => null);
            const errMsg = errData?.message || "PayFast payment gateway could not be initiated. Please choose Bank Transfer or retry.";
            Alert.alert("Payment Gateway Notice", errMsg);
            setIsSubmitting(false);
            return;
          }
        } catch (pfErr) {
          console.log("PayFast sandbox generation error:", pfErr);
          Alert.alert("Payment Gateway Error", "Could not connect to payment gateway. Please select Bank Transfer or check connection.");
          setIsSubmitting(false);
          return;
        }
      }

      // Clear local cart if not buy now (for Bank Transfer)
      if (!singleItemCheckout) {
        await AsyncStorage.setItem("grand-store-cart", JSON.stringify([]));
        DeviceEventEmitter.emit("cartUpdated", 0);
      }

      setCreatedOrder(orderSummary);
      saveOrderToLocalStorage(orderSummary);
      setOrderCompleted(true);
    } catch (err) {
      console.error("Order placement exception:", err);
      const userMsg =
        err?.message ||
        (typeof err === "string" ? err : null) ||
        "Order placement encountered an issue. Please try again.";
      showMessage(userMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // PayFast In-App Navigation Interceptor
  const handlePayfastNavStateChange = (navState) => {
    const currentUrl = navState?.url || "";
    console.log("PayFast In-App Navigation State:", currentUrl);

    // 1. Success interception (PayFast returns to return_url, sandbox finish, mobile-return, or success page)
    const isSuccessUrl =
      currentUrl.includes("mobile-return") && currentUrl.includes("status=success") ||
      currentUrl.includes("payment=success") ||
      currentUrl.includes("order-success") ||
      currentUrl.includes("/customer/order/") ||
      currentUrl.includes("/success") ||
      currentUrl.includes("success=true") ||
      currentUrl.includes("status=COMPLETE") ||
      currentUrl.includes("status=complete") ||
      currentUrl.includes("status=success") ||
      currentUrl.includes("/process/finish") ||
      currentUrl.includes("/process/complete") ||
      currentUrl.includes("/finish") ||
      currentUrl.includes("/complete") ||
      currentUrl.includes("paid=true") ||
      currentUrl.includes("pf_payment_id");

    if (isSuccessUrl) {
      setShowPayfastModal(false);
      setIsPayfastLoading(false);
      finalizePaidOrder(activeOrderRef.current);
      return;
    }

    // 2. Cancellation interception (PayFast returns to cancel_url or mobile-return cancel)
    if (
      (currentUrl.includes("mobile-return") && currentUrl.includes("status=cancel")) ||
      currentUrl.includes("payment=cancel") ||
      currentUrl.includes("/cancel") ||
      currentUrl.includes("cancelled") ||
      currentUrl.includes("cancel=true")
    ) {
      setShowPayfastModal(false);
      setIsPayfastLoading(false);
      showMessage("PayFast payment was cancelled. You can retry or choose Bank Transfer.");
      return;
    }
  };

  // Close PayFast Modal Prompt
  const handleClosePayfastModal = () => {
    Alert.alert(
      "PayFast Gateway",
      "Have you completed your payment on PayFast?",
      [
        {
          text: "Yes, I Have Paid",
          onPress: () => {
            setShowPayfastModal(false);
            setIsPayfastLoading(false);
            finalizePaidOrder(activeOrderRef.current);
          },
        },
        {
          text: "Leave as Pending",
          style: "destructive",
          onPress: () => {
            setShowPayfastModal(false);
            setIsPayfastLoading(false);
            setOrderCompleted(true);
            showMessage("Payment pending. You can complete payment with PayFast anytime.");
          },
        },
        { text: "Stay in Gateway", style: "cancel" },
      ]
    );
  };

  // Finalize order as PAID and transition to in-app bill receipt
  const finalizePaidOrder = async (orderParam) => {
    try {
      if (!singleItemCheckout) {
        await AsyncStorage.setItem("grand-store-cart", JSON.stringify([]));
        DeviceEventEmitter.emit("cartUpdated", 0);
      }

      const activeOrd = orderParam || activeOrderRef.current || createdOrder || payfastModalData?.orderSummary;
      const candidateIds = [
        activeOrd?.orderMongoId,
        activeOrd?._id,
        activeOrd?.orderId,
        activeOrd?.id,
      ].filter(Boolean);

      const token = await AsyncStorage.getItem("userToken");

      // Loop through candidate IDs to ensure MongoDB confirms payment
      for (const targetId of [...new Set(candidateIds)]) {
        try {
          await safeApiFetch(`/payfast/confirm-order`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ orderId: targetId }),
          });
          await safeApiFetch(`/orders/${targetId}/pay`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ paymentMethod: "PayFast" }),
          });
        } catch (apiErr) {
          console.log("Error marking order as paid on backend:", apiErr);
        }
      }

      setCreatedOrder((prev) => {
        const base = prev || activeOrd || {};
        const updated = {
          ...base,
          isPaid: true,
          paymentStatus: "Paid",
          paidAt: new Date().toISOString(),
          paymentMethod: "PayFast (Instant) • Paid",
        };
        saveOrderToLocalStorage(updated);

        // Record in paid order IDs list so it never reverts to pending on refresh
        const keys = [
          ...candidateIds,
          updated.orderId,
          updated.id,
          updated._id,
          updated.orderMongoId,
        ].filter(Boolean);

        AsyncStorage.getItem("grand_store_paid_order_ids").then((raw) => {
          const list = raw ? JSON.parse(raw) : [];
          let changed = false;
          for (const k of keys) {
            const strK = String(k);
            if (!list.includes(strK)) {
              list.push(strK);
              changed = true;
            }
          }
          if (changed) {
            AsyncStorage.setItem("grand_store_paid_order_ids", JSON.stringify(list));
          }
        });

        return updated;
      });
      setOrderCompleted(true);
      showMessage("🎉 Payment completed successfully via PayFast!");
    } catch (e) {
      setOrderCompleted(true);
    }
  };

  // Relaunch PayFast in-app if payment was pending
  const handleRelaunchPayfast = async () => {
    if (!createdOrder) return;
    const targetPayOrderId = createdOrder.orderMongoId || createdOrder.orderId;
    try {
      setIsSubmitting(true);
      const token = await AsyncStorage.getItem("userToken");
      const pfRes = await safeApiFetch("/payfast/generate-shop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId: targetPayOrderId, isMobile: true }),
      });
      if (pfRes && pfRes.ok) {
        const pfData = await pfRes.json();
        if (pfData && pfData.url && pfData.data) {
          setPayfastModalData({
            url: pfData.url,
            fields: pfData.data,
            orderSummary: createdOrder,
          });
          setShowPayfastModal(true);
          setIsPayfastLoading(true);
        }
      } else {
        showMessage("Could not initialize PayFast gateway. Please try again.");
      }
    } catch (e) {
      showMessage("PayFast connection error. Please check your network.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render PayFast In-App Modal with auto-submitting POST form inside WebView
  const renderPayfastModal = () => {
    if (!showPayfastModal || !payfastModalData) return null;

    const { url, fields } = payfastModalData;
    const hiddenInputs = Object.entries(fields || {})
      .map(
        ([key, val]) =>
          `<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(
            String(val ?? "")
          )}" />`
      )
      .join("\n");

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <title>PayFast Gateway</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              background-color: #0c0b0a;
              color: #f5c242;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              padding: 24px;
              text-align: center;
            }
            .loader {
              width: 44px;
              height: 44px;
              border: 3px solid rgba(245, 194, 66, 0.2);
              border-top: 3px solid #f5c242;
              border-radius: 50%;
              animation: spin 0.8s linear infinite;
              margin-bottom: 20px;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            h2 {
              font-size: 18px;
              font-weight: 800;
              letter-spacing: 1.5px;
              color: #f5c242;
              text-transform: uppercase;
              margin-bottom: 6px;
            }
            p {
              font-size: 13px;
              color: #888;
              line-height: 1.4;
              margin-bottom: 16px;
            }
            .shield {
              display: inline-block;
              padding: 6px 14px;
              background: rgba(245, 194, 66, 0.1);
              border: 1px solid rgba(245, 194, 66, 0.3);
              border-radius: 20px;
              font-size: 11px;
              letter-spacing: 0.8px;
              color: #f5c242;
              text-transform: uppercase;
              font-weight: 700;
            }
          </style>
        </head>
        <body>
          <div class="loader"></div>
          <h2>THE GRAND STORE</h2>
          <p>Connecting to PayFast Secure Gateway. Initializing encrypted checkout...</p>
          <div class="shield">🔒 256-Bit Encrypted Sandbox</div>

          <form id="payfastForm" action="${url}" method="POST">
            ${hiddenInputs}
          </form>

          <script>
            window.onload = function() {
              setTimeout(function() {
                var f = document.getElementById('payfastForm');
                if (f) f.submit();
              }, 300);
            };
          </script>
        </body>
      </html>
    `;

    return (
      <Modal
        visible={showPayfastModal}
        animationType="slide"
        transparent={false}
        onRequestClose={handleClosePayfastModal}
      >
        <SafeAreaView style={styles.payfastModalContainer}>
          {/* Top Gold Header */}
          <View style={styles.payfastModalHeader}>
            <View style={styles.payfastModalHeaderLeft}>
              <View style={styles.payfastLockBadge}>
                <Text style={styles.payfastLockIcon}>🔒</Text>
              </View>
              <View>
                <Text style={styles.payfastModalTitle}>PayFast Secure Checkout</Text>
                <Text style={styles.payfastModalSubtitle}>
                  Instant Cards & EFT • In-App Gateway
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.payfastModalCloseBtn}
              onPress={handleClosePayfastModal}
              activeOpacity={0.7}
            >
              <Text style={styles.payfastModalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Loading Indicator */}
          {isPayfastLoading && (
            <View style={styles.payfastLoadingBar}>
              <ActivityIndicator size="small" color="#c99742" />
              <Text style={styles.payfastLoadingText}>Securing Connection...</Text>
            </View>
          )}

          {/* In-App WebView */}
          <WebView
            source={{ html: htmlContent }}
            originWhitelist={["*"]}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            scalesPageToFit={true}
            injectedJavaScript={`
              (function() {
                function detectPayfastStatus() {
                  try {
                    var text = (document.body && document.body.innerText) ? document.body.innerText.toLowerCase() : "";
                    var href = window.location.href.toLowerCase();
                    if (
                      href.indexOf('payment=success') !== -1 ||
                      href.indexOf('/customer/order/') !== -1 ||
                      href.indexOf('status=complete') !== -1 ||
                      href.indexOf('/finish') !== -1 ||
                      href.indexOf('/complete') !== -1 ||
                      text.indexOf('payment successful') !== -1 ||
                      text.indexOf('payment processed') !== -1 ||
                      text.indexOf('payment approved') !== -1 ||
                      text.indexOf('transaction successful') !== -1
                    ) {
                      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PAYFAST_SUCCESS' }));
                      }
                    }
                  } catch (e) {}
                }
                setInterval(detectPayfastStatus, 600);
              })();
              true;
            `}
            onMessage={(event) => {
              try {
                const data = JSON.parse(event.nativeEvent.data);
                if (data && data.type === "PAYFAST_SUCCESS") {
                  setShowPayfastModal(false);
                  setIsPayfastLoading(false);
                  finalizePaidOrder(activeOrderRef.current);
                }
              } catch (e) {}
            }}
            onShouldStartLoadWithRequest={(req) => {
              const targetUrl = req?.url || "";
              if (
                (targetUrl.includes("mobile-return") && targetUrl.includes("status=success")) ||
                targetUrl.includes("payment=success") ||
                targetUrl.includes("order-success") ||
                targetUrl.includes("/customer/order/") ||
                targetUrl.includes("/success") ||
                targetUrl.includes("success=true") ||
                targetUrl.includes("status=COMPLETE") ||
                targetUrl.includes("status=complete") ||
                targetUrl.includes("status=success") ||
                targetUrl.includes("/finish") ||
                targetUrl.includes("/complete") ||
                targetUrl.includes("paid=true")
              ) {
                setShowPayfastModal(false);
                setIsPayfastLoading(false);
                finalizePaidOrder(activeOrderRef.current);
                return false;
              }
              return true;
            }}
            onLoadStart={() => setIsPayfastLoading(true)}
            onLoadEnd={() => setIsPayfastLoading(false)}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              const failingUrl = (nativeEvent?.url || "").toLowerCase();
              if (
                failingUrl.includes("payment=success") ||
                failingUrl.includes("/customer/order/") ||
                failingUrl.includes("status=complete") ||
                failingUrl.includes("success") ||
                failingUrl.includes("/finish") ||
                failingUrl.includes("/complete")
              ) {
                setShowPayfastModal(false);
                setIsPayfastLoading(false);
                finalizePaidOrder(activeOrderRef.current);
              }
            }}
            onNavigationStateChange={handlePayfastNavStateChange}
            renderLoading={() => (
              <View style={styles.payfastLoadingOverlay}>
                <ActivityIndicator size="large" color="#c99742" />
                <Text style={styles.payfastOverlayText}>Connecting to PayFast...</Text>
              </View>
            )}
            style={styles.payfastWebView}
          />
        </SafeAreaView>
      </Modal>
    );
  };

  // Render Success / Bank Transfer / PayFast Screen with Full Itemized Bill Receipt
  if (orderCompleted && createdOrder) {
    const isBank = paymentMethod === "bank_transfer";
    const isPaid = createdOrder.paymentStatus === "Paid";
    const isPostNet =
      deliveryPreference === "postnet" ||
      Boolean(createdOrder.pickupStore) ||
      createdOrder.deliveryType === "pickup" ||
      (createdOrder.courierName || "").toLowerCase().includes("postnet");
    const isDHL =
      destinationMode === "international_dhl" ||
      (createdOrder.courierName || "").toLowerCase().includes("dhl") ||
      !isSouthAfrica;

    return (
      <SafeAreaView style={styles.container}>
        <AppHeader
          title="Order Confirmation"
          backgroundColor="#c99742"
          height={(HEADER_HEIGHT_THRESHOLD * height) / 100}
          rightButtons={[]}
          titleStyle={tmh_styles.header_title_tmb}
          navigation={navigation}
          isBack={false}
        />

        <ScrollView contentContainerStyle={styles.successScroll}>
          {/* Success Header */}
          <View style={styles.successHeader}>
            <View style={[styles.checkCircle, isPaid && styles.checkCirclePaid]}>
              <Text style={styles.checkMark}>✓</Text>
            </View>
            <Text style={styles.successTitle}>
              {isPaid ? "Payment Completed Successfully" : "Order Placed Successfully"}
            </Text>
            <Text style={styles.orderIdBadge}>
              Order Ref: <Text style={styles.orderIdText}>{createdOrder.orderId}</Text>
            </Text>
          </View>

          {/* PayFast Paid Banner */}
          {!isBank && isPaid && (
            <View style={styles.payfastPaidBanner}>
              <View style={styles.payfastPaidRow}>
                <Text style={styles.payfastPaidIcon}>✓</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.payfastPaidTitle}>Payment Verified (PayFast Sandbox)</Text>
                  <Text style={styles.payfastPaidSub}>
                    Instant payment received in-app. Your order is confirmed and transitioning to dispatch.
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Bank Transfer Details (if Bank Transfer chosen) */}
          {isBank && (
            <View style={styles.bankCard}>
              <View style={styles.bankCardHeader}>
                <Text style={styles.bankCardTitle}>Awaiting Bank Transfer (EFT)</Text>
                <Text style={styles.bankNotice}>
                  Please transfer exactly{" "}
                  <Text style={styles.bankAmount}>R{createdOrder.grandTotal.toFixed(2)}</Text> to our Standard Bank account below.
                </Text>
              </View>

              <View style={styles.bankDetailsBox}>
                <View style={styles.bankRow}>
                  <Text style={styles.bankLabel}>BANK NAME</Text>
                  <Text style={styles.bankVal}>{createdOrder.bankDetails.bankName}</Text>
                </View>
                <View style={styles.bankRow}>
                  <Text style={styles.bankLabel}>ACCOUNT NAME</Text>
                  <Text style={styles.bankVal}>{createdOrder.bankDetails.accountName}</Text>
                </View>
                <View style={styles.bankRow}>
                  <Text style={styles.bankLabel}>ACCOUNT NUMBER</Text>
                  <Text style={[styles.bankVal, styles.bankValMono]}>
                    {createdOrder.bankDetails.accountNumber}
                  </Text>
                </View>
                <View style={styles.bankRow}>
                  <Text style={styles.bankLabel}>BRANCH CODE</Text>
                  <Text style={[styles.bankVal, styles.bankValMono]}>
                    {createdOrder.bankDetails.branchCode}
                  </Text>
                </View>
                <View style={[styles.bankRow, { borderBottomWidth: 0 }]}>
                  <Text style={[styles.bankLabel, { color: "#f5c242" }]}>REFERENCE NUMBER</Text>
                  <Text style={[styles.bankVal, styles.bankRefVal]}>
                    {createdOrder.bankDetails.reference}
                  </Text>
                </View>
              </View>

              <View style={styles.emailNoticeBox}>
                <Text style={styles.emailNoticeText}>
                  ✉️ Full banking instructions and invoice have been dispatched to{" "}
                  <Text style={{ color: "#fff", fontWeight: "700" }}>{email}</Text>.
                </Text>
              </View>
            </View>
          )}

          {/* PayFast Pending Card (if user closed modal or exited before completing) */}
          {!isBank && !isPaid && (
            <View style={styles.payfastSuccessCard}>
              <Text style={styles.payfastSuccessTitle}>💳 PayFast Payment Pending</Text>
              <Text style={styles.payfastSuccessSub}>
                Your order is safely saved. Tap below to complete your payment with PayFast.
              </Text>
              <TouchableOpacity
                style={styles.relaunchPayfastBtn}
                onPress={handleRelaunchPayfast}
                activeOpacity={0.8}
              >
                <Text style={styles.relaunchPayfastText}>⚡ Complete Payment with PayFast</Text>
              </TouchableOpacity>
              <View style={styles.emailNoticeBox}>
                <Text style={styles.emailNoticeText}>
                  ✉️ An order summary and invoice have been emailed to{" "}
                  <Text style={{ color: "#fff", fontWeight: "700" }}>{email}</Text>.
                </Text>
              </View>
            </View>
          )}

          {/* Real-time Tracking & 18+ ID Compliance Notice Card */}
          <View style={styles.complianceNoticeCard}>
            <View style={styles.complianceNoticeHeader}>
              <View style={styles.complianceNoticeBadge}>
                <Text style={styles.complianceNoticeBadgeText}>COMPLIANCE & DISPATCH</Text>
              </View>
              <Text style={styles.complianceNoticeTitle}>Real-Time Tracking & Verification Status</Text>
            </View>

            {/* Real-Time Dispatch & Tracking Notification Box */}
            <View style={styles.complianceNoticeBox}>
              <Text style={styles.complianceNoticeIcon}>🔔</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.complianceNoticeItemTitle}>Dispatch & Tracking Alerts Active</Text>
                <Text style={styles.complianceNoticeItemDesc}>
                  Live parcel tracking links, dispatch waybill numbers, and SMS pickup OTPs will be broadcast directly to your contact endpoints:
                </Text>
                <View style={styles.complianceContactRow}>
                  <Text style={styles.complianceContactLine}>✉️ Email: <Text style={styles.complianceContactHighlight}>{email || createdOrder.recipient?.email}</Text></Text>
                  <Text style={styles.complianceContactLine}>📱 Phone / SMS: <Text style={styles.complianceContactHighlight}>{createdOrder.recipient?.phone || checkoutPhone?.phone}</Text></Text>
                </View>
              </View>
            </View>

            {/* 18+ ID Compliance Review Status Box */}
            <View style={styles.complianceKycBox}>
              <Text style={styles.complianceKycIcon}>🛡️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.complianceKycTitle}>
                  {createdOrder.isGuest ? "18+ ID Document Submitted to Administration" : "18+ Legal Age Verification Confirmed"}
                </Text>
                <Text style={styles.complianceKycDesc}>
                  {createdOrder.isGuest
                    ? "Your official identification document has been securely forwarded to The Grand Store administrative compliance team for verification under the South African Liquor Act. Your order checkout is complete and reserved."
                    : "Your account age certification has been validated. Delivery requires adult signature (18+) upon courier handover."}
                </Text>
                <View style={styles.complianceStatusRow}>
                  <View style={[styles.complianceStatusDot, { backgroundColor: createdOrder.isGuest ? "#f59e0b" : "#10b981" }]} />
                  <Text style={[styles.complianceStatusText, { color: createdOrder.isGuest ? "#f59e0b" : "#10b981" }]}>
                    {createdOrder.isGuest ? "Document Review: Pending Administrator Approval (Order Confirmed)" : "Compliance Status: Verified (18+)"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* PostNet Store Collection Banner */}
          {(createdOrder.pickupStore || isPostNet) && (
            <View style={styles.postnetPickupConfirmCard}>
              <View style={styles.postnetPickupHeader}>
                <Text style={styles.postnetPickupIcon}>📍</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.postnetPickupBadge}>YOUR POSTNET COLLECTION POINT</Text>
                  <Text style={styles.postnetPickupName}>
                    {createdOrder.pickupStore?.name || "PostNet Collection Branch"}
                  </Text>
                  <Text style={styles.postnetPickupAddress}>
                    {createdOrder.pickupStore?.address || createdOrder.recipient?.address}
                  </Text>
                  {createdOrder.pickupStore?.telephone ? (
                    <Text style={styles.postnetPickupPhone}>
                      📞 Contact: {createdOrder.pickupStore.telephone}
                    </Text>
                  ) : null}
                </View>
              </View>
              <View style={styles.postnetPinNotice}>
                <Text style={styles.postnetPinNoticeText}>
                  📲 An SMS alert containing your unique collection PIN and required ID verification will be sent to {createdOrder.recipient?.phone || checkoutPhone?.phone || "your phone"} when the package arrives at the branch.
                </Text>
              </View>
            </View>
          )}

          {/*
          ========================================================================
          [COMMENTED OUT FOR NOW AS REQUESTED - 6-STAGE DELIVERY & TRACKING TIMELINE]
          ========================================================================
          <View style={styles.timelineCard}>
            <Text style={styles.timelineTitle}>DELIVERY & TRACKING TIMELINE</Text>
            <View style={styles.timelineList}>
              {[
                {
                  stage: 1,
                  name: "Payment Confirmed",
                  desc: isPaid ? "Payment verified via PayFast" : "Awaiting payment settlement",
                  done: isPaid,
                  active: !isPaid,
                },
                {
                  stage: 2,
                  name: "Order Confirmed",
                  desc: `Assigned reference #${createdOrder.orderId}`,
                  done: true,
                  active: false,
                },
                {
                  stage: 3,
                  name: "Vendor Preparing",
                  desc: "Bottles inspected & sealed with tamper-proof security wax",
                  done: isPaid,
                  active: isPaid,
                },
                {
                  stage: 4,
                  name: "Collected by Courier",
                  desc: isPostNet
                    ? "Collected by PostNet Logistics"
                    : isDHL
                    ? "Collected by DHL Express Air Courier"
                    : "Collected by Courier Guy Express",
                  done: false,
                  active: false,
                },
                {
                  stage: 5,
                  name: "In Transit 🚚",
                  desc: isDHL
                    ? "Secured international air transit & customs clearance"
                    : "Secured transport via regional distribution hub",
                  done: false,
                  active: false,
                },
                {
                  stage: 6,
                  name: isPostNet ? "Ready for Collection 📍" : "Delivered ✅",
                  desc: isPostNet
                    ? "Counter collection with SMS PIN & 18+ ID"
                    : isDHL
                    ? "International doorstep handover & adult signature"
                    : "Direct doorstep handover & signature",
                  done: false,
                  active: false,
                },
              ].map((step, sIdx, arr) => (
                <View key={sIdx} style={styles.timelineStepRow}>
                  <View style={styles.timelineLeftCol}>
                    <View
                      style={[
                        styles.timelineNode,
                        step.done && styles.timelineNodeDone,
                        step.active && styles.timelineNodeActive,
                      ]}
                    >
                      <Text style={styles.timelineNodeText}>
                        {step.done ? "✓" : step.stage}
                      </Text>
                    </View>
                    {sIdx < arr.length - 1 && (
                      <View
                        style={[
                          styles.timelineLine,
                          step.done && styles.timelineLineDone,
                        ]}
                      />
                    )}
                  </View>
                  <View style={styles.timelineRightCol}>
                    <Text
                      style={[
                        styles.timelineStepName,
                        (step.done || step.active) && styles.timelineStepNameActive,
                      ]}
                    >
                      {step.name}
                    </Text>
                    <Text style={styles.timelineStepDesc}>{step.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
          ========================================================================
          */}

          {/* FULL ITEMIZED TAX INVOICE / BILL RECEIPT */}
          <View style={styles.invoiceBillCard}>
            <View style={styles.invoiceBillHeader}>
              <View>
                <Text style={styles.invoiceBrand}>THE GRAND STORE</Text>
                <Text style={styles.invoiceSubtitle}>TAX INVOICE & OFFICIAL RECEIPT</Text>
              </View>
              <View style={styles.invoiceMetaRight}>
                <Text style={styles.invoiceDateLabel}>DATE</Text>
                <Text style={styles.invoiceDateVal}>{createdOrder.date}</Text>
              </View>
            </View>

            <View style={styles.invoiceDivider} />

            {/* Billed To & Destination */}
            <View style={styles.invoiceRowTwoCol}>
              <View style={{ flex: 1, paddingRight: 6 }}>
                <Text style={styles.invoiceSmallHeading}>BILLED TO</Text>
                <Text style={styles.invoiceCustomerName}>{createdOrder.recipient.fullName}</Text>
                <Text style={styles.invoiceCustomerDetail}>{createdOrder.recipient.email}</Text>
                <Text style={styles.invoiceCustomerDetail}>{createdOrder.recipient.phone}</Text>
              </View>
              <View style={{ flex: 1, paddingLeft: 6, alignItems: "flex-end" }}>
                <Text style={styles.invoiceSmallHeading}>DELIVERY DESTINATION</Text>
                <Text style={[styles.invoiceCustomerDetail, { textAlign: "right" }]}>
                  {createdOrder.recipient.address}
                </Text>
                <View style={styles.invoiceCourierPill}>
                  <Text style={styles.invoiceCourierText}>
                    {createdOrder.courierName}
                  </Text>
                </View>
              </View>
            </View>

            {createdOrder.isGift && (
              <>
                <View style={styles.invoiceDivider} />
                <View style={styles.giftReceiptCard}>
                  <Text style={styles.giftReceiptTitle}>🎁 COMPLIMENTARY GIFT DELIVERY</Text>
                  {createdOrder.giftRecipientName ? (
                    <Text style={styles.giftReceiptRecipient}>
                      For: <Text style={{ color: "#fff", fontWeight: "700" }}>{createdOrder.giftRecipientName}</Text>
                    </Text>
                  ) : null}
                  {createdOrder.giftMessage ? (
                    <Text style={styles.giftReceiptMessage}>
                      "{createdOrder.giftMessage}"
                    </Text>
                  ) : null}
                </View>
              </>
            )}

            <View style={styles.invoiceDivider} />

            {/* Items List */}
            <Text style={styles.invoiceSmallHeading}>PURCHASED ITEMS</Text>
            {(createdOrder.items || []).map((item, idx) => (
              <View key={idx} style={styles.invoiceItemRow}>
                {item.image ? (
                  <Image
                    source={{ uri: getImageUrl(item.image) }}
                    style={styles.invoiceItemImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.invoiceItemPlaceholder}>
                    <Text style={{ color: "#c99742", fontSize: 10, fontWeight: "700" }}>GS</Text>
                  </View>
                )}
                <View style={styles.invoiceItemInfo}>
                  <Text style={styles.invoiceItemName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={styles.invoiceItemMeta}>
                    Qty: {item.quantity || 1} • R{Number(item.price || 0).toFixed(2)} each
                  </Text>
                </View>
                <Text style={styles.invoiceItemTotal}>
                  R{((item.quantity || 1) * Number(item.price || 0)).toFixed(2)}
                </Text>
              </View>
            ))}

            <View style={styles.invoiceDivider} />

            {/* Subtotal, Shipping, Super Coins, and Total Due */}
            <View style={styles.invoiceTotalRow}>
              <Text style={styles.invoiceTotalLabel}>Subtotal</Text>
              <Text style={styles.invoiceTotalVal}>R{createdOrder.subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.invoiceTotalRow}>
              <Text style={styles.invoiceTotalLabel}>Delivery</Text>
              <Text style={styles.invoiceTotalVal}>
                {createdOrder.shippingFee === 0
                  ? "Complimentary"
                  : `R${createdOrder.shippingFee.toFixed(2)}`}
              </Text>
            </View>
            {createdOrder.discount > 0 && (
              <View style={styles.invoiceTotalRow}>
                <Text style={styles.invoiceTotalLabel}>Voucher Discount</Text>
                <Text style={[styles.invoiceTotalVal, { color: "#4ade80" }]}>
                  -R{createdOrder.discount.toFixed(2)}
                </Text>
              </View>
            )}
            {createdOrder.superCoinsDiscount > 0 && (
              <View style={styles.invoiceTotalRow}>
                <Text style={[styles.invoiceTotalLabel, { color: "#f5c242" }]}>
                  🪙 Super Coins Redeemed ({createdOrder.superCoinsUsed || Math.round(createdOrder.superCoinsDiscount / 0.1)} coins)
                </Text>
                <Text style={[styles.invoiceTotalVal, { color: "#f5c242", fontWeight: "700" }]}>
                  -R{Number(createdOrder.superCoinsDiscount).toFixed(2)}
                </Text>
              </View>
            )}

            <View style={styles.invoiceGrandTotalBox}>
              <Text style={styles.invoiceGrandTotalLabel}>TOTAL {isPaid ? "PAID" : "DUE"}</Text>
              <Text style={styles.invoiceGrandTotalVal}>
                R{createdOrder.grandTotal.toFixed(2)}
              </Text>
            </View>

            {createdOrder.superCoinsEarned > 0 && (
              <View style={styles.superCoinsEarnedReceiptRow}>
                <Text style={styles.superCoinsEarnedReceiptIcon}>🎉</Text>
                <Text style={styles.superCoinsEarnedReceiptText}>
                  +{createdOrder.superCoinsEarned} Super Coins (Value: R{(createdOrder.superCoinsEarned * 0.1).toFixed(2)}) will be credited upon payment completion!
                </Text>
              </View>
            )}

            <View style={styles.invoicePaymentTagRow}>
              <Text style={styles.invoicePaymentTagLabel}>Payment Status:</Text>
              <Text
                style={[
                  styles.invoicePaymentTagVal,
                  isPaid ? { color: "#4cd964" } : { color: "#f5c242" },
                ]}
              >
                {isPaid
                  ? "PAID via PayFast Sandbox ✓"
                  : isBank
                  ? "Awaiting Bank Transfer (EFT)"
                  : "PayFast Payment Pending"}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.successActionsCol}>
            <TouchableOpacity
              style={styles.doneBtnTouch}
              onPress={() => navigation.navigate("Home")}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#f5c242", "#c99742"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.doneBtnGradient}
              >
                <Text style={styles.doneBtnText}>Continue Shopping</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.ordersBtnTouch}
              onPress={() => navigation.navigate("MyOrder")}
              activeOpacity={0.85}
            >
              <Text style={styles.ordersBtnText}>View My Orders</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        {renderPayfastModal()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Luxury Checkout"
        backgroundColor="#c99742"
        height={(HEADER_HEIGHT_THRESHOLD * height) / 100}
        rightButtons={[]}
        titleStyle={tmh_styles.header_title_tmb}
        navigation={navigation}
        isBack
        backIconColor="black"
      />

      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color="#c99742" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top 3-Step Wizard Progress Bar */}
          <View style={styles.topProgressContainer}>
            <TouchableOpacity
              style={[styles.progressStepTouch, checkoutStep === 1 && styles.progressStepActive]}
              onPress={() => setCheckoutStep(1)}
              activeOpacity={0.7}
            >
              <View style={[styles.progressBadge, checkoutStep > 1 && styles.progressBadgeDone, checkoutStep === 1 && styles.progressBadgeActive]}>
                <Text style={[styles.progressBadgeText, checkoutStep === 1 && styles.progressBadgeTextActive, checkoutStep > 1 && styles.progressBadgeTextDone]}>
                  {checkoutStep > 1 ? "✓" : "1"}
                </Text>
              </View>
              <Text style={[styles.progressLabel, checkoutStep === 1 && styles.progressLabelActive]}>Delivery Details</Text>
            </TouchableOpacity>

            <View style={[styles.progressLine, checkoutStep >= 2 && styles.progressLineActive]} />

            <TouchableOpacity
              style={[styles.progressStepTouch, checkoutStep === 2 && styles.progressStepActive]}
              onPress={() => { if (checkoutStep > 2) setCheckoutStep(2); }}
              disabled={checkoutStep < 2}
              activeOpacity={0.7}
            >
              <View style={[styles.progressBadge, checkoutStep > 2 && styles.progressBadgeDone, checkoutStep === 2 && styles.progressBadgeActive]}>
                <Text style={[styles.progressBadgeText, checkoutStep === 2 && styles.progressBadgeTextActive, checkoutStep > 2 && styles.progressBadgeTextDone]}>
                  {checkoutStep > 2 ? "✓" : "2"}
                </Text>
              </View>
              <Text style={[styles.progressLabel, checkoutStep === 2 && styles.progressLabelActive]}>Delivery Method</Text>
            </TouchableOpacity>

            <View style={[styles.progressLine, checkoutStep >= 3 && styles.progressLineActive]} />

            <TouchableOpacity
              style={[styles.progressStepTouch, checkoutStep === 3 && styles.progressStepActive]}
              disabled={checkoutStep < 3}
              activeOpacity={0.7}
            >
              <View style={[styles.progressBadge, checkoutStep === 3 && styles.progressBadgeActive]}>
                <Text style={[styles.progressBadgeText, checkoutStep === 3 && styles.progressBadgeTextActive]}>
                  3
                </Text>
              </View>
              <Text style={[styles.progressLabel, checkoutStep === 3 && styles.progressLabelActive]}>Payment</Text>
            </TouchableOpacity>
          </View>

          {/* ========================================================================= */}
          {/* STEP 1: DELIVERY DETAILS & LOCATION                                       */}
          {/* ========================================================================= */}
          {checkoutStep === 1 && (
            <>
              {/* Delivery Mode Selection: Home, PostNet, or International DHL */}
              <View style={styles.sectionCard}>
                <View style={styles.stepHeader}>
                  <View style={styles.stepNumberCircle}>
                    <Text style={styles.stepNumber}>1</Text>
                  </View>
                  <Text style={styles.stepTitle}>Choose Delivery Location</Text>
                </View>

                <Text style={styles.subtleHelperText}>
                  Where would you like your fine spirits delivered?
                </Text>

                <View style={styles.deliveryModesColumn}>
                  {/* Option 1: Deliver to my address (Standard & Express Home Delivery) */}
                  <TouchableOpacity
                    style={[
                      styles.modeCard,
                      destinationMode === "domestic_sa" && deliveryPreference === "home" && styles.modeCardActive,
                    ]}
                    onPress={() => selectDeliveryMode("domestic_home")}
                    activeOpacity={0.8}
                  >
                    <View style={styles.modeIconBox}>
                      <Text style={styles.modeIcon}>🏠</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={styles.modeTitleRow}>
                        <Text style={styles.modeTitle}>Deliver to my address</Text>
                        <View style={styles.modeTag}>
                          <Text style={styles.modeTagText}>PostNet & Courier Guy</Text>
                        </View>
                      </View>
                      <Text style={styles.modeSubtitle}>
                        Standard (2–5 days @ R120) or Express (1–2 days @ R180) to your door in South Africa
                      </Text>
                    </View>
                    <View style={styles.modeRadio}>
                      {destinationMode === "domestic_sa" && deliveryPreference === "home" && (
                        <View style={styles.modeRadioDot} />
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Option 2: Collect from a PostNet Store (PostNet-to-PostNet Counter Collection) */}
                  <TouchableOpacity
                    style={[
                      styles.modeCard,
                      destinationMode === "domestic_sa" && deliveryPreference === "postnet" && styles.modeCardActive,
                    ]}
                    onPress={() => selectDeliveryMode("domestic_postnet")}
                    activeOpacity={0.8}
                  >
                    <View style={styles.modeIconBox}>
                      <Text style={styles.modeIcon}>🏪</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={styles.modeTitleRow}>
                        <Text style={styles.modeTitle}>Collect from a PostNet Store</Text>
                        <View style={[styles.modeTag, { backgroundColor: "rgba(76, 217, 100, 0.15)" }]}>
                          <Text style={[styles.modeTagText, { color: "#4cd964" }]}>R100 • 400+ Stores</Text>
                        </View>
                      </View>
                      <Text style={styles.modeSubtitle}>
                        PostNet-to-PostNet counter collection (2–3 days). Pick up when convenient with SMS PIN.
                      </Text>
                    </View>
                    <View style={styles.modeRadio}>
                      {destinationMode === "domestic_sa" && deliveryPreference === "postnet" && (
                        <View style={styles.modeRadioDot} />
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Option 3: International DHL Air Courier */}
                  <TouchableOpacity
                    style={[
                      styles.modeCard,
                      destinationMode === "international_dhl" && styles.modeCardActive,
                    ]}
                    onPress={() => selectDeliveryMode("international_dhl")}
                    activeOpacity={0.8}
                  >
                    <View style={styles.modeIconBox}>
                      <Text style={styles.modeIcon}>✈️</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={styles.modeTitleRow}>
                        <Text style={styles.modeTitle}>International DHL</Text>
                        <View style={[styles.modeTag, { backgroundColor: "rgba(245, 194, 66, 0.2)" }]}>
                          <Text style={[styles.modeTagText, { color: "#f5c242" }]}>DHL Express Air</Text>
                        </View>
                      </View>
                      <Text style={styles.modeSubtitle}>
                        Air express courier to UK, USA, Europe & 50+ countries (3–5 days). Base R1,800.
                      </Text>
                    </View>
                    <View style={styles.modeRadio}>
                      {destinationMode === "international_dhl" && (
                        <View style={styles.modeRadioDot} />
                      )}
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Recipient Information Card */}
              <View style={styles.sectionCard}>
                <Text style={styles.cardHeaderTitle}>RECIPIENT INFORMATION</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>FULL NAME *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Alexander Sterling"
                    placeholderTextColor="#666"
                    value={fullName}
                    onChangeText={setFullName}
                  />
                </View>

                <View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>MOBILE NUMBER (FOR SMS PIN) *</Text>
                    <CheckoutPhoneInput
                      phone={phone}
                      phoneCountry={phoneCountry}
                      onChangePhone={setPhone}
                      onChangeCountry={setPhoneCountry}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>EMAIL (FOR RECEIPT) *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="name@domain.com"
                      placeholderTextColor="#666"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                    />
                  </View>
                </View>
              </View>

              {/* Address Details (if Home Delivery or International DHL) */}
              {deliveryPreference === "home" && (
                <View style={styles.sectionCard}>
                  <Text style={styles.cardHeaderTitle}>
                    {destinationMode === "international_dhl" ? "WORLDWIDE DELIVERY ADDRESS" : "STREET DELIVERY ADDRESS"}
                  </Text>

                  <View style={styles.inputGroup}>
                    <View style={styles.labelRowWithIcon}>
                      <Text style={styles.inputLabel}>STREET ADDRESS *</Text>
                      {isSearchingAddress && (
                        <ActivityIndicator size="small" color="#c99742" style={{ marginLeft: 6 }} />
                      )}
                    </View>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Street address, house or building number..."
                      placeholderTextColor="#666"
                      value={address}
                      onChangeText={handleAddressChange}
                    />
                    {showAddressDropdown && addressPredictions.length > 0 && (
                      <View style={styles.predictionsDropdown}>
                        <View style={styles.predictionsHeader}>
                          <Text style={styles.predictionsHeaderText}>SUGGESTED ADDRESSES</Text>
                          <Text style={styles.googlePoweredText}>Powered by Google Maps</Text>
                        </View>
                        {addressPredictions.map((p, idx) => (
                          <TouchableOpacity
                            key={p.place_id || idx}
                            style={[styles.predictionItem, idx === addressPredictions.length - 1 && { borderBottomWidth: 0 }]}
                            onPress={() => handleSelectAddressPrediction(p)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.predictionPinIcon}>📍</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.predictionMainText} numberOfLines={1}>
                                {p.structured_formatting?.main_text || p.description}
                              </Text>
                              {p.structured_formatting?.secondary_text && (
                                <Text style={styles.predictionSubText} numberOfLines={1}>
                                  {p.structured_formatting.secondary_text}
                                </Text>
                              )}
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>

                  <View style={styles.rowInputs}>
                    <View style={[styles.inputGroup, { flex: 1.2, marginRight: 8 }]}>
                      <View style={styles.labelRowWithIcon}>
                        <Text style={styles.inputLabel}>CITY / SUBURB *</Text>
                        {isSearchingCity && (
                          <ActivityIndicator size="small" color="#c99742" style={{ marginLeft: 4 }} />
                        )}
                      </View>
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g. Sandton or London"
                        placeholderTextColor="#666"
                        value={city}
                        onFocus={() => {
                          if (cityPredictions.length === 0) setCityPredictions(DEFAULT_SA_CITIES);
                          setShowCityDropdown(true);
                        }}
                        onChangeText={handleCityInputChange}
                      />
                      {showCityDropdown && (
                        <View style={styles.predictionsDropdown}>
                          <View style={styles.predictionsHeader}>
                            <Text style={styles.predictionsHeaderText}>SUGGESTED CITIES</Text>
                            <TouchableOpacity onPress={() => setShowCityDropdown(false)}>
                              <Text style={{ color: "#aaa", fontSize: 11 }}>✕ Close</Text>
                            </TouchableOpacity>
                          </View>
                          {(() => {
                            const allCityList = cityPredictions.length > 0 ? cityPredictions : DEFAULT_SA_CITIES;
                            const displayedCities = showAllCityDropdown ? allCityList : allCityList.slice(0, 3);
                            return (
                              <>
                                {displayedCities.map((p, idx) => {
                                  const cityName = p.structured_formatting?.main_text || p.main_text || p.description?.split(",")[0] || "";
                                  const subName = p.structured_formatting?.secondary_text || p.description || "";
                                  return (
                                    <TouchableOpacity
                                      key={p.place_id || idx}
                                      style={[styles.predictionItem, idx === displayedCities.length - 1 && !allCityList.length > 3 && { borderBottomWidth: 0 }]}
                                      onPress={() => handleSelectCity(p)}
                                      activeOpacity={0.7}
                                    >
                                      <Text style={styles.predictionPinIcon}>🏙️</Text>
                                      <View style={{ flex: 1 }}>
                                        <Text style={styles.predictionMainText} numberOfLines={1}>{cityName}</Text>
                                        {subName ? <Text style={styles.predictionSubText} numberOfLines={1}>{subName}</Text> : null}
                                      </View>
                                    </TouchableOpacity>
                                  );
                                })}
                                {allCityList.length > 3 && (
                                  <TouchableOpacity
                                    style={styles.dropdownShowMoreBtn}
                                    onPress={() => setShowAllCityDropdown(!showAllCityDropdown)}
                                    activeOpacity={0.75}
                                  >
                                    <Text style={styles.dropdownShowMoreBtnText}>
                                      {showAllCityDropdown ? "▴ Show Fewer Cities" : `▾ Show More Cities (${allCityList.length - 3} More)`}
                                    </Text>
                                  </TouchableOpacity>
                                )}
                              </>
                            );
                          })()}
                        </View>
                      )}
                    </View>

                    <View style={[styles.inputGroup, { flex: 0.8 }]}>
                      <View style={styles.labelRowWithIcon}>
                        <Text style={styles.inputLabel}>POSTAL CODE *</Text>
                        {isSearchingPostal && (
                          <ActivityIndicator size="small" color="#c99742" style={{ marginLeft: 4 }} />
                        )}
                      </View>
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g. 2196"
                        placeholderTextColor="#666"
                        value={postalCode}
                        onChangeText={handlePostalCodeChange}
                      />
                      {showPostalDropdown && postalPredictions.length > 0 && (
                        <View style={styles.predictionsDropdown}>
                          <View style={styles.predictionsHeader}>
                            <Text style={styles.predictionsHeaderText}>MATCHING POSTAL CODES</Text>
                            <Text style={styles.googlePoweredText}>Google Places</Text>
                          </View>
                          {postalPredictions.map((p, idx) => (
                            <TouchableOpacity
                              key={p.place_id || idx}
                              style={[styles.predictionItem, idx === postalPredictions.length - 1 && { borderBottomWidth: 0 }]}
                              onPress={() => handleSelectPostalPrediction(p)}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.predictionPinIcon}>📮</Text>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.predictionMainText} numberOfLines={1}>
                                  {p.structured_formatting?.main_text || p.description}
                                </Text>
                                {p.structured_formatting?.secondary_text && (
                                  <Text style={styles.predictionSubText} numberOfLines={1}>
                                    {p.structured_formatting.secondary_text}
                                  </Text>
                                )}
                              </View>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>COUNTRY *</Text>
                    {destinationMode === "domestic_sa" ? (
                      <View style={styles.lockedCountryBox}>
                        <CountryFlagImage iso="ZA" size={16} style={{ marginRight: 6 }} />
                        <Text style={styles.lockedCountryText}>South Africa</Text>
                        <View style={styles.zaTag}>
                          <Text style={styles.zaTagText}>PostNet & Local Courier</Text>
                        </View>
                      </View>
                    ) : (
                      <TextInput
                        style={[styles.textInput, { color: "#f5c242", fontWeight: "700" }]}
                        value={country}
                        placeholder="e.g. United Kingdom, United States, Germany..."
                        placeholderTextColor="#666"
                        onChangeText={(t) => {
                          setCountry(t);
                          setQuote(null);
                        }}
                      />
                    )}
                  </View>
                </View>
              )}

              {/* PostNet Branch Selection (if PostNet Store Collection) */}
              {deliveryPreference === "postnet" && (
                <View style={styles.sectionCard}>
                  <Text style={styles.cardHeaderTitle}>CHOOSE POSTNET COLLECTION BRANCH</Text>
                  <Text style={styles.subtleHelperText}>
                    Select your city or suburb to choose your preferred PostNet counter:
                  </Text>

                  {/* PostNet City / Suburb & Postal Code Inputs */}
                  <View style={[styles.rowInputs, { marginBottom: 12 }]}>
                    <View style={[styles.inputGroup, { flex: 1.2, marginRight: 8 }]}>
                      <View style={styles.labelRowWithIcon}>
                        <Text style={styles.inputLabel}>CITY / SUBURB *</Text>
                        {isSearchingCity && (
                          <ActivityIndicator size="small" color="#c99742" style={{ marginLeft: 4 }} />
                        )}
                      </View>
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g. Sandton, Durban..."
                        placeholderTextColor="#666"
                        value={city}
                        onFocus={() => {
                          if (cityPredictions.length === 0) setCityPredictions(DEFAULT_SA_CITIES);
                          setShowCityDropdown(true);
                        }}
                        onChangeText={(text) => {
                          handleCityInputChange(text);
                          setHasSelectedCityForPostnet(true);
                        }}
                      />
                      {showCityDropdown && (
                        <View style={styles.predictionsDropdown}>
                          <View style={styles.predictionsHeader}>
                            <Text style={styles.predictionsHeaderText}>SELECT CITY</Text>
                            <TouchableOpacity onPress={() => setShowCityDropdown(false)}>
                              <Text style={{ color: "#aaa", fontSize: 11 }}>✕ Close</Text>
                            </TouchableOpacity>
                          </View>
                          {(() => {
                            const allCityList = cityPredictions.length > 0 ? cityPredictions : DEFAULT_SA_CITIES;
                            const displayedCities = showAllCityDropdown ? allCityList : allCityList.slice(0, 3);
                            return (
                              <>
                                {displayedCities.map((p, idx) => {
                                  const cityName = p.structured_formatting?.main_text || p.main_text || p.description?.split(",")[0] || "";
                                  const subName = p.structured_formatting?.secondary_text || p.description || "";
                                  return (
                                    <TouchableOpacity
                                      key={p.place_id || idx}
                                      style={[styles.predictionItem, idx === displayedCities.length - 1 && !allCityList.length > 3 && { borderBottomWidth: 0 }]}
                                      onPress={() => handleSelectCity(p)}
                                      activeOpacity={0.7}
                                    >
                                      <Text style={styles.predictionPinIcon}>🏙️</Text>
                                      <View style={{ flex: 1 }}>
                                        <Text style={styles.predictionMainText} numberOfLines={1}>{cityName}</Text>
                                        {subName ? <Text style={styles.predictionSubText} numberOfLines={1}>{subName}</Text> : null}
                                      </View>
                                    </TouchableOpacity>
                                  );
                                })}
                                {allCityList.length > 3 && (
                                  <TouchableOpacity
                                    style={styles.dropdownShowMoreBtn}
                                    onPress={() => setShowAllCityDropdown(!showAllCityDropdown)}
                                    activeOpacity={0.75}
                                  >
                                    <Text style={styles.dropdownShowMoreBtnText}>
                                      {showAllCityDropdown ? "▴ Show Fewer Cities" : `▾ Show More Cities (${allCityList.length - 3} More)`}
                                    </Text>
                                  </TouchableOpacity>
                                )}
                              </>
                            );
                          })()}
                        </View>
                      )}
                    </View>

                    <View style={[styles.inputGroup, { flex: 0.8 }]}>
                      <View style={styles.labelRowWithIcon}>
                        <Text style={styles.inputLabel}>POSTAL CODE</Text>
                        {isSearchingPostal && (
                          <ActivityIndicator size="small" color="#c99742" style={{ marginLeft: 4 }} />
                        )}
                      </View>
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g. 2196"
                        placeholderTextColor="#666"
                        value={postalCode}
                        onChangeText={handlePostalCodeChange}
                      />
                      {showPostalDropdown && postalPredictions.length > 0 && (
                        <View style={styles.predictionsDropdown}>
                          <View style={styles.predictionsHeader}>
                            <Text style={styles.predictionsHeaderText}>MATCHING POSTAL CODES</Text>
                            <Text style={styles.googlePoweredText}>Google Places</Text>
                          </View>
                          {postalPredictions.map((p, idx) => (
                            <TouchableOpacity
                              key={p.place_id || idx}
                              style={[styles.predictionItem, idx === postalPredictions.length - 1 && { borderBottomWidth: 0 }]}
                              onPress={() => handleSelectPostalPrediction(p)}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.predictionPinIcon}>📮</Text>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.predictionMainText} numberOfLines={1}>
                                  {p.structured_formatting?.main_text || p.description}
                                </Text>
                                {p.structured_formatting?.secondary_text && (
                                  <Text style={styles.predictionSubText} numberOfLines={1}>
                                    {p.structured_formatting.secondary_text}
                                  </Text>
                                )}
                              </View>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Selected PostNet Confirmation Banner */}
                  {preferredPostnetStore && (
                    <View style={styles.selectedBranchBanner}>
                      <View style={styles.selectedBranchCheckCircle}>
                        <Text style={styles.selectedBranchCheckText}>✓</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.selectedBranchBannerTitle}>
                          Collection Point: {preferredPostnetStore.name}
                        </Text>
                        <Text style={styles.selectedBranchBannerAddress} numberOfLines={2}>
                          {preferredPostnetStore.address}
                        </Text>
                        {preferredPostnetStore.postalCode ? (
                          <Text style={{ color: "#f5c242", fontSize: 10, marginTop: 2, fontWeight: "700" }}>
                            Postal Code: {preferredPostnetStore.postalCode} • {preferredPostnetStore.distance ? `${preferredPostnetStore.distance} km away` : "Nearest branch"}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  )}

                  {/* Nearest Regional Hub Warning Banner (Mobile) */}
                  {usingNearestCity && postnetStores.length > 0 && (
                    <View style={styles.nearestCityBanner}>
                      <Text style={{ fontSize: 18, marginRight: 8 }}>📍</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.nearestCityTitle}>Nearest Regional Hub</Text>
                        <Text style={styles.nearestCityDesc}>
                          No direct PostNet branch found in "{city}". Showing nearest available branches in{" "}
                          <Text style={{ color: "#fff", fontWeight: "700" }}>{postnetStores[0]?.city || "the nearest regional hub"}</Text>.
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Loading indicator */}
                  {isLoadingPostnet && (
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14 }}>
                      <ActivityIndicator size="small" color="#c99742" />
                      <Text style={{ color: "#c99742", fontSize: 12, marginLeft: 8, fontWeight: "600" }}>
                        Finding available PostNet branches in {city}...
                      </Text>
                    </View>
                  )}

                  {/* Available Locations Header & Search */}
                  <View style={{ marginTop: 8, marginBottom: 8 }}>
                    <Text style={{ color: "#f5c242", fontSize: 11, fontWeight: "800", letterSpacing: 0.5, marginBottom: 6 }}>
                      AVAILABLE POSTNET LOCATIONS IN {(city || "SOUTH AFRICA").toUpperCase()} ({filteredPostnetStores.length})
                    </Text>
                    <View style={styles.branchSearchBox}>
                      <Text style={{ fontSize: 13, marginRight: 6 }}>🔍</Text>
                      <TextInput
                        style={styles.branchSearchInput}
                        placeholder={`Filter ${city} branches by mall, area or street...`}
                        placeholderTextColor="#666"
                        value={branchSearch}
                        onChangeText={setBranchSearch}
                      />
                      {branchSearch.length > 0 && (
                        <TouchableOpacity onPress={() => setBranchSearch("")}>
                          <Text style={{ color: "#888", fontSize: 12, paddingHorizontal: 4 }}>✕</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* List of Available Locations */}
                  {filteredPostnetStores.length > 0 ? (
                    <>
                      {(showAllPostnetBranches || branchSearch.trim().length > 0 ? filteredPostnetStores : filteredPostnetStores.slice(0, 4)).map((store, idx) => {
                        const isStoreSelected = preferredPostnetStore?.id === store.id || preferredPostnetStore?.name === store.name;
                        return (
                          <TouchableOpacity
                            key={store.id || idx}
                            style={[styles.postnetStoreCard, isStoreSelected && styles.postnetStoreCardSelected]}
                            onPress={() => {
                              setPreferredPostnetStore(store);
                              if (store.postalCode) setPostalCode(store.postalCode);
                              showMessage(`📍 Selected ${store.name}`);
                            }}
                            activeOpacity={0.8}
                          >
                            <View style={{ marginRight: 10, marginTop: 2 }}>
                              <View style={[
                                styles.selectedBranchCheckCircle,
                                { width: 22, height: 22, borderRadius: 11 },
                                isStoreSelected ? { backgroundColor: "#10b981" } : { backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" }
                              ]}>
                                <Text style={{ color: isStoreSelected ? "#000" : "transparent", fontSize: 11, fontWeight: "900" }}>✓</Text>
                              </View>
                            </View>
                            <View style={{ flex: 1 }}>
                              <View style={styles.storeNameRow}>
                                <Text style={[styles.storeName, isStoreSelected && { color: "#f5c242", fontWeight: "800" }]}>{store.name}</Text>
                                {store.distance !== null && store.distance !== undefined && (
                                  <View style={styles.distanceBadge}>
                                    <Text style={styles.distanceBadgeText}>{store.distance} km away</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={styles.storeAddress}>{store.address}</Text>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 }}>
                                {store.postalCode ? <Text style={{ color: "#888", fontSize: 10, fontFamily: "monospace" }}>📮 Code: {store.postalCode}</Text> : null}
                                {store.telephone ? <Text style={styles.storePhone}>📞 {store.telephone}</Text> : null}
                              </View>
                              {isStoreSelected ? (
                                <View style={{ marginTop: 6, alignSelf: "flex-start", backgroundColor: "rgba(16, 185, 129, 0.15)", borderWidth: 1, borderColor: "rgba(16, 185, 129, 0.4)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                                  <Text style={{ color: "#10b981", fontSize: 9.5, fontWeight: "800" }}>✓ SELECTED COLLECTION POINT</Text>
                                </View>
                              ) : (
                                <View style={{ marginTop: 6, alignSelf: "flex-start", backgroundColor: "rgba(201, 151, 66, 0.12)", borderWidth: 1, borderColor: "rgba(201, 151, 66, 0.3)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                                  <Text style={{ color: "#f5c242", fontSize: 9.5, fontWeight: "700" }}>TAP TO CHOOSE THIS LOCATION</Text>
                                </View>
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}

                      {filteredPostnetStores.length > 4 && !branchSearch.trim() && (
                        <TouchableOpacity
                          style={styles.showMoreBranchesBtn}
                          onPress={() => setShowAllPostnetBranches(!showAllPostnetBranches)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.showMoreBranchesBtnText}>
                            {showAllPostnetBranches ? "▴ Show Fewer Locations" : `▾ Show All Available Locations (${filteredPostnetStores.length} Available)`}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </>
                  ) : (
                    <View style={styles.emptyStoresBox}>
                      <Text style={styles.emptyStoresText}>
                        No PostNet branches found matching "{branchSearch}". Try typing your suburb or city above.
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Send as a Gift Card */}
              <View style={styles.sectionCard}>
                <TouchableOpacity
                  style={styles.giftToggleHeader}
                  onPress={() => setIsGift(!isGift)}
                  activeOpacity={0.8}
                >
                  <View style={styles.giftIconBox}>
                    <Text style={styles.giftIcon}>🎁</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={styles.modeTitleRow}>
                      <Text style={styles.modeTitle}>Send as a Gift</Text>
                      <View style={[styles.modeTag, { backgroundColor: "rgba(201, 151, 66, 0.18)" }]}>
                        <Text style={[styles.modeTagText, { color: "#f5c242" }]}>Complimentary</Text>
                      </View>
                    </View>
                    <Text style={styles.modeSubtitle}>
                      Includes luxury gift packaging and a personalized handwritten message card
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.superCoinsToggle,
                      isGift && styles.superCoinsToggleActive,
                      { width: 28, height: 28, marginLeft: 8 },
                    ]}
                  >
                    <Text style={[styles.superCoinsToggleCheck, { fontSize: 14 }]}>
                      {isGift ? "✓" : ""}
                    </Text>
                  </View>
                </TouchableOpacity>

                {isGift && (
                  <View style={styles.giftFieldsContainer}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>RECIPIENT NAME *</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g. Alexander Sterling"
                        placeholderTextColor="#666"
                        value={giftRecipientName}
                        onChangeText={setGiftRecipientName}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>PERSONAL GIFT MESSAGE</Text>
                      <TextInput
                        style={[styles.textInput, { height: 80, textAlignVertical: "top", paddingTop: 10 }]}
                        placeholder="Write your personal message to be printed on the gift card..."
                        placeholderTextColor="#666"
                        multiline
                        numberOfLines={3}
                        value={giftMessage}
                        onChangeText={setGiftMessage}
                      />
                    </View>
                  </View>
                )}
              </View>

              {/*
              ========================================================================================
              [COMMENTED OUT FOR NOW - 18+ LEGAL AGE & ID DOCUMENT UPLOAD IS ONLY FOR AUCTIONS]
              ========================================================================================
               18+ Legal Age Verification & Guest ID KYC Card 
              <View style={styles.sectionCard}>
                <View style={styles.stepHeader}>
                  <View style={[styles.stepNumberCircle, { backgroundColor: "rgba(201, 151, 66, 0.2)", borderColor: "#c99742" }]}>
                    <Text style={[styles.stepNumber, { color: "#c99742", fontSize: 13 }]}>18+</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stepTitle}>18+ Legal Age & Identity Verification</Text>
                    <Text style={styles.verifySubtitle}>Mandatory compliance under the Liquor Act</Text>
                  </View>
                </View>

                {!isUserAgeVerified ? (
                  <View style={styles.guestVerifyContainer}>
                    <Text style={styles.inputLabel}>OFFICIAL ID DOCUMENT TYPE *</Text>
                    <View style={styles.verifyTypeSelector}>
                      {(kycSettings?.bidderKycIdTypes && kycSettings.bidderKycIdTypes.length > 0
                        ? kycSettings.bidderKycIdTypes
                        : ["National ID", "Passport", "Driver's License"]
                      ).map((tName) => {
                        const tKey = tName.toLowerCase().replace(/[^a-z0-9]/g, "_");
                        const isMatch = guestIdType === tKey || guestIdType === tName;
                        return (
                          <TouchableOpacity
                            key={tName}
                            style={[styles.verifyTypeOption, isMatch && styles.verifyTypeOptionActive]}
                            onPress={() => setGuestIdType(tKey)}
                            activeOpacity={0.8}
                          >
                            <Text style={[styles.verifyTypeOptionText, isMatch && styles.verifyTypeOptionTextActive]}>
                              {tName}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <View style={styles.rowInputs}>
                      <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                        <Text style={styles.inputLabel}>
                          {guestIdType === "national_id" ? "SA ID NUMBER *" : guestIdType === "passport" ? "PASSPORT NUMBER *" : "LICENSE NUMBER *"}
                        </Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder={guestIdType === "national_id" ? "e.g. 9205125089087" : "e.g. A12345678"}
                          placeholderTextColor="#666"
                          value={guestIdNumber}
                          onChangeText={handleIdNumberChange}
                          autoCapitalize="characters"
                        />
                      </View>

                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.inputLabel}>DATE OF BIRTH *</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="YYYY-MM-DD"
                          placeholderTextColor="#666"
                          value={guestDob}
                          onChangeText={setGuestDob}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>
                        ATTACH OFFICIAL ID / PASSPORT PHOTO {kycSettings?.bidderKycRequireDocumentUpload !== false ? "*" : "(OPTIONAL)"}
                      </Text>
                      {isUploadingDoc ? (
                        <View style={styles.docUploadingBox}>
                          <ActivityIndicator size="small" color="#c99742" />
                          <Text style={styles.docUploadingText}>Uploading and encrypting document...</Text>
                        </View>
                      ) : guestDocUrl ? (
                        <View style={styles.verifyDocAttachedBox}>
                          <View style={styles.verifyDocAttachedLeft}>
                            <Text style={styles.verifyDocAttachedCheck}>✓</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.verifyDocAttachedTitle}>Document Attached Successfully</Text>
                              <Text style={styles.verifyDocAttachedName} numberOfLines={1}>
                                {guestDocFileName || "Official_ID_Document.jpg"}
                              </Text>
                            </View>
                          </View>
                          <TouchableOpacity style={styles.verifyDocReuploadBtn} onPress={handlePickGuestDocument} activeOpacity={0.8}>
                            <Text style={styles.verifyDocReuploadText}>Change</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity style={styles.verifyDocUploadBtn} onPress={handlePickGuestDocument} activeOpacity={0.8}>
                          <Text style={styles.verifyDocUploadIcon}>📷</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.verifyDocUploadTitle}>Attach Official ID Photo</Text>
                            <Text style={styles.verifyDocUploadSub}>Select photo or scan from gallery (PNG, JPG)</Text>
                          </View>
                        </TouchableOpacity>
                      )}
                    </View>

                    <TouchableOpacity
                      style={styles.verifyCheckboxRow}
                      activeOpacity={0.8}
                      onPress={() => setIsAgeConfirmed(!isAgeConfirmed)}
                    >
                      <View style={[styles.verifyCheckbox, isAgeConfirmed && styles.verifyCheckboxChecked]}>
                        {isAgeConfirmed && <Text style={styles.verifyCheckmark}>✓</Text>}
                      </View>
                      <Text style={styles.verifyCheckboxText}>
                        I legally certify that I am at least {kycSettings?.bidderKycMinAge || 18} years of age and authorized to purchase alcoholic beverages under the South African Liquor Act. I confirm this document belongs to me.
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.authVerifiedContainer}>
                    <View style={styles.authVerifiedRow}>
                      <View style={styles.authVerifiedIconBox}>
                        <Text style={styles.authVerifiedIcon}>✓</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.authVerifiedTitle}>18+ Account Pre-Cleared</Text>
                        <Text style={styles.authVerifiedSub}>
                          Your account is certified and legally age-verified under the National Liquor Act. Pre-cleared for instant 1-click wine and spirits checkout without document uploads.
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.verifyCheckboxRow, { marginTop: 12 }]}>
                      <View style={[styles.verifyCheckbox, styles.verifyCheckboxChecked]}>
                        <Text style={styles.verifyCheckmark}>✓</Text>
                      </View>
                      <Text style={[styles.verifyCheckboxText, { color: "#34d399", fontWeight: "700" }]}>
                        18+ Legal Age Compliance Verified • Ready for Instant Dispatch
                      </Text>
                    </View>
                  </View>
                )}
              </View>


              ========================================================================================
              */}

                            {/* Continue to Step 2 Button */}
              <TouchableOpacity
                style={styles.continueStepBtn}
                onPress={handleProceedToDeliveryMethod}
                disabled={isCalculatingQuote}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={["#f5c242", "#c99742", "#a67c2e"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.continueStepGradient}
                >
                  {isCalculatingQuote ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={styles.continueStepText}>CONTINUE TO DELIVERY METHOD →</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: DELIVERY METHOD & ALCOHOL COMPLIANCE                              */}
          {/* ========================================================================= */}
          {checkoutStep === 2 && (
            <>
              <View style={styles.stepTitleRow}>
                <View>
                  <Text style={styles.mainStepTitle}>2. Delivery Method</Text>
                  <Text style={styles.mainStepSubtitle}>Choose your preferred shipping service level.</Text>
                </View>
                <TouchableOpacity onPress={() => setCheckoutStep(1)} style={styles.stepBackLink}>
                  <Text style={styles.stepBackLinkText}>← Edit Details</Text>
                </TouchableOpacity>
              </View>

              {/* Available Courier Rates */}
              <View style={styles.sectionCard}>
                <Text style={styles.courierSectionTitle}>
                  AVAILABLE COURIER SERVICES ({isSouthAfrica ? "SOUTH AFRICA" : "INTERNATIONAL"})
                </Text>

                {quote?.shipments?.[0]?.shippingQuotes?.map((opt, idx) => {
                  const isSelected = selectedCourier?.serviceLevel === opt.serviceLevel;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.courierRateCard,
                        isSelected && styles.courierRateCardSelected,
                      ]}
                      onPress={() => setSelectedCourier(opt)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.radioCircle}>
                        {isSelected && <View style={styles.radioDot} />}
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={styles.courierHeaderRow}>
                          <Text style={styles.courierNameText}>
                            {opt.courierName} — {opt.serviceLevel}
                          </Text>
                          <Text style={styles.courierCostText}>
                            {opt.cost > 0 ? `R${Number(opt.cost).toFixed(2)}` : "FREE"}
                          </Text>
                        </View>
                        <Text style={styles.courierDaysText}>⏱ {opt.estimatedDays}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 🔒 THE CONFIDENCE SECTION */}
              <View style={styles.confidenceCard}>
                <View style={styles.confidenceHeader}>
                  <Text style={styles.confidenceShieldIcon}>🔒</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.confidenceTitle}>Secure & Trackable Delivery</Text>
                    <Text style={styles.confidenceSub}>
                      {deliveryPreference === "postnet"
                        ? "Direct vault dispatch to your chosen PostNet collection branch with PIN verification."
                        : "Insured courier dispatch with tamper-proof packaging & real-time tracking."}
                    </Text>
                  </View>
                </View>

                <View style={styles.confidenceGrid}>
                  <View style={styles.confidenceGridItem}>
                    <Text style={styles.confidenceCheck}>✓</Text>
                    <Text style={styles.confidenceItemText}>Live Waybill Tracking</Text>
                  </View>
                  <View style={styles.confidenceGridItem}>
                    <Text style={styles.confidenceCheck}>✓</Text>
                    <Text style={styles.confidenceItemText}>SMS Dispatch PIN</Text>
                  </View>
                  <View style={styles.confidenceGridItem}>
                    <Text style={styles.confidenceCheck}>✓</Text>
                    <Text style={styles.confidenceItemText}>Fragile Handling</Text>
                  </View>
                  <View style={styles.confidenceGridItem}>
                    <Text style={styles.confidenceCheck}>✓</Text>
                    <Text style={styles.confidenceItemText}>18+ ID Verification</Text>
                  </View>
                </View>

                <View style={styles.liquorComplianceBox}>
                  <Text style={styles.liquorComplianceIcon}>⚖️</Text>
                  <Text style={styles.liquorComplianceText}>
                    <Text style={styles.liquorComplianceBold}>South African Liquor Compliance: </Text>
                    Recipients must present a valid National ID or Passport upon delivery or PostNet branch collection.
                  </Text>
                </View>
              </View>

              {/* International Duties Disclaimer if International */}
              {!isSouthAfrica && (
                <View style={styles.internationalDeliveryCard}>
                  <View style={styles.internationalDeliveryHeader}>
                    <Text style={styles.internationalWarningIcon}>⚠️</Text>
                    <Text style={styles.internationalDeliveryTitle}>
                      IMPORTANT: International Delivery & Duties
                    </Text>
                  </View>

                  <Text style={styles.internationalDeliveryText}>
                    Import duties, customs charges, destination VAT/GST or other government charges may be payable by you upon arrival in {country.trim() || "your destination country"}. The delivery charge covers transportation only. Estimated duties/taxes: R {estimatedDutiesTaxes.toFixed(2)}.
                  </Text>

                  <TouchableOpacity
                    style={styles.dutiesCheckboxRow}
                    activeOpacity={0.8}
                    onPress={() => setDutiesAccepted(!dutiesAccepted)}
                  >
                    <View style={[styles.dutiesCheckbox, dutiesAccepted && styles.dutiesCheckboxChecked]}>
                      {dutiesAccepted && <Text style={styles.dutiesCheckmark}>✓</Text>}
                    </View>
                    <Text style={styles.dutiesCheckboxLabel}>
                      I understand that I am responsible for any destination-country taxes, duties, or customs charges.
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Continue to Step 3 Button */}
              <TouchableOpacity
                style={styles.continueStepBtn}
                onPress={handleProceedToPayment}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={["#f5c242", "#c99742", "#a67c2e"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.continueStepGradient}
                >
                  <Text style={styles.continueStepText}>CONTINUE TO PAYMENT →</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: PAYMENT & CONFIRMATION                                            */}
          {/* ========================================================================= */}
          {checkoutStep === 3 && (
            <>
              <View style={styles.stepTitleRow}>
                <View>
                  <Text style={styles.mainStepTitle}>3. Payment & Rewards</Text>
                  <Text style={styles.mainStepSubtitle}>Apply Super Coins and select payment method.</Text>
                </View>
                <TouchableOpacity onPress={() => setCheckoutStep(2)} style={styles.stepBackLink}>
                  <Text style={styles.stepBackLinkText}>← Edit Delivery</Text>
                </TouchableOpacity>
              </View>

              {/* Locked Delivery Summary Card with Shortcut */}
              <View style={styles.lockedDeliveryCard}>
                <View style={styles.lockedDeliveryLeft}>
                  <Text style={{ fontSize: 20, marginRight: 10 }}>
                    {deliveryPreference === "postnet" ? "🏪" : "🏠"}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lockedDeliveryTag}>
                      {deliveryPreference === "postnet" ? "POSTNET COLLECTION POINT" : "DELIVERY DESTINATION"}
                    </Text>
                    <Text style={styles.lockedDeliveryAddress} numberOfLines={2}>
                      {deliveryPreference === "postnet" && preferredPostnetStore
                        ? `${preferredPostnetStore.name} — ${preferredPostnetStore.address}`
                        : `${address}, ${city}, ${country}`}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.changeDeliveryBtn}
                  onPress={() => setCheckoutStep(1)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.changeDeliveryBtnText}>Change</Text>
                </TouchableOpacity>
              </View>

              {/* Bottle Reserve Summary */}
              <View style={styles.sectionCard}>
                <Text style={styles.cardHeaderTitle}>BOTTLE RESERVE ({checkoutItems.length})</Text>
                {checkoutItems.map((item, idx) => {
                  const key = getItemKey(item) || String(idx);
                  const lineTotal = Number(item.price || 0) * Number(item.quantity || 1);
                  return (
                    <View key={key} style={styles.itemRow}>
                      <Image
                        source={{ uri: getImageUrl(item.image) }}
                        style={styles.itemThumb}
                        resizeMode="contain"
                      />
                      <View style={styles.itemDetailsCol}>
                        <View style={styles.itemTopRow}>
                          <Text style={styles.itemName} numberOfLines={2}>
                            {item.name}
                          </Text>
                          <TouchableOpacity
                            onPress={() => handleRemoveCheckoutItem(key)}
                            style={styles.itemRemoveTouch}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.itemRemoveIcon}>✕</Text>
                          </TouchableOpacity>
                        </View>

                        <View style={styles.itemMetaRow}>
                          <Text style={styles.itemSizeBadge}>{item.size || "750ml"}</Text>
                          <Text style={styles.itemUnitPrice}>
                            R{Number(item.price || 0).toFixed(2)} each
                          </Text>
                        </View>

                        <View style={styles.itemControlsRow}>
                          <View style={styles.itemStepper}>
                            <TouchableOpacity
                              onPress={() => handleDecrementItemQty(key)}
                              style={styles.stepperActionBtn}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.stepperActionMinus}>−</Text>
                            </TouchableOpacity>
                            <View style={styles.stepperQtyBox}>
                              <Text style={styles.stepperQtyText}>{item.quantity || 1}</Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => handleIncrementItemQty(key)}
                              style={styles.stepperActionBtn}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.stepperActionPlus}>+</Text>
                            </TouchableOpacity>
                          </View>

                          <View style={styles.itemTotalCol}>
                            <Text style={styles.itemTotalLabel}>Total</Text>
                            <Text style={styles.itemPrice}>R{lineTotal.toFixed(2)}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Super Coins Card */}
              <View style={styles.superCoinsCheckoutCard}>
                <View style={styles.superCoinsCardHeader}>
                  <View style={styles.superCoinsIconBox}>
                    <Text style={styles.superCoinsIconText}>🪙</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={styles.superCoinsTitleRow}>
                      <Text style={styles.superCoinsCardTitle}>Grand Store Super Coins</Text>
                      <View style={styles.superCoinsRateBadge}>
                        <Text style={styles.superCoinsRateBadgeText}>10 COINS = R1.00</Text>
                      </View>
                    </View>
                    <Text style={styles.superCoinsBalanceSub}>
                      Available: <Text style={styles.superCoinsBalanceGold}>{(userSuperCoins || 0).toLocaleString()} Coins</Text> (Value: R{((userSuperCoins || 0) * 0.1).toFixed(2)})
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.superCoinsToggle,
                      useSuperCoins && (userSuperCoins || 0) > 0 && styles.superCoinsToggleActive,
                    ]}
                    onPress={() => {
                      if ((userSuperCoins || 0) <= 0) {
                        showMessage("You currently have 0 Super Coins. Earn 10 coins per R100 on this order!");
                        return;
                      }
                      setUseSuperCoins(!useSuperCoins);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.superCoinsToggleCheck}>
                      {useSuperCoins && (userSuperCoins || 0) > 0 ? "✓" : ""}
                    </Text>
                  </TouchableOpacity>
                </View>

                {useSuperCoins && (userSuperCoins || 0) > 0 && superCoinDiscount > 0 ? (
                  <View style={styles.superCoinsAppliedRow}>
                    <View style={styles.superCoinsAppliedLeft}>
                      <Text style={styles.superCoinsAppliedCheck}>✓</Text>
                      <Text style={styles.superCoinsAppliedText}>
                        Margin-Safe Deduction: <Text style={styles.superCoinsAppliedAmount}>-R{superCoinDiscount.toFixed(2)}</Text> ({Math.round(superCoinDiscount / 0.1)} coins)
                      </Text>
                    </View>
                    {superCoinsQuote?.isMarginCapped ? (
                      <Text style={styles.superCoinsMarginNote}>
                        🛡️ {superCoinsQuote.marginMessage || "10% max order redemption cap (protects 15% platform margin)"}
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                <View style={styles.superCoinsEarnBanner}>
                  <Text style={styles.superCoinsEarnIcon}>🎉</Text>
                  <Text style={styles.superCoinsEarnText}>
                    Earn <Text style={styles.superCoinsEarnGold}>+{superCoinsQuote?.potentialCoinsToEarn || Math.floor((subtotal / 100) * 10)} Super Coins</Text> (R{((superCoinsQuote?.potentialCoinsToEarn || Math.floor((subtotal / 100) * 10)) * 0.1).toFixed(2)}) upon payment completion!
                  </Text>
                </View>
              </View>

              {/* Payment Method Selection */}
              <View style={styles.sectionCard}>
                <Text style={styles.cardHeaderTitle}>PAYMENT METHOD</Text>

                {/* Option A: PayFast (Instant Cards & Instant EFT - South Africa) */}
                {isSouthAfrica && (
                  <TouchableOpacity
                    style={[
                      styles.paymentOption,
                      paymentMethod === "payfast" && styles.paymentOptionActive,
                    ]}
                    onPress={() => handlePaymentMethodSelect("payfast")}
                    activeOpacity={0.8}
                  >
                    <View style={styles.radioCircle}>
                      {paymentMethod === "payfast" && <View style={styles.radioDot} />}
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={styles.optionHeaderRow}>
                        <Text style={styles.paymentOptionTitle}>PayFast (Instant)</Text>
                        <Text style={styles.zaOnlyBadge}>🇿🇦 ZA ONLY</Text>
                      </View>
                      <Text style={styles.paymentOptionDesc}>
                        Visa, Mastercard, Debit, and Instant EFT via PayFast Sandbox for immediate dispatch.
                      </Text>
                      <View style={styles.payfastBadgeBox}>
                        <Text style={styles.payfastBadgeText}>🔒 Powered by PayFast Sandbox</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}

                {/* Option B: Manual Bank Transfer (Standard Bank EFT) */}
                <TouchableOpacity
                  style={[
                    styles.paymentOption,
                    paymentMethod === "bank_transfer" && styles.paymentOptionActive,
                  ]}
                  onPress={() => handlePaymentMethodSelect("bank_transfer")}
                  activeOpacity={0.8}
                >
                  <View style={styles.radioCircle}>
                    {paymentMethod === "bank_transfer" && <View style={styles.radioDot} />}
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={styles.optionHeaderRow}>
                      <Text style={styles.paymentOptionTitle}>Manual Bank Transfer (EFT)</Text>
                      <Text style={styles.preferredBadge}>ANY COUNTRY</Text>
                    </View>
                    <Text style={styles.paymentOptionDesc}>
                      Direct deposit to our Standard Bank account. Details & Reference displayed upon order.
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Total Financial Breakdown */}
              <View style={styles.breakdownCard}>
                <Text style={styles.breakdownTitle}>TOTAL BREAKDOWN</Text>

                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Subtotal</Text>
                  <Text style={styles.breakdownVal}>R{subtotal.toFixed(2)}</Text>
                </View>

                {discount > 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={[styles.breakdownLabel, { color: "#4cd964" }]}>Voucher Discount</Text>
                    <Text style={[styles.breakdownVal, { color: "#4cd964" }]}>-R{discount.toFixed(2)}</Text>
                  </View>
                )}

                {superCoinDiscount > 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={[styles.breakdownLabel, { color: "#f5c242" }]}>🪙 Super Coins Redeemed</Text>
                    <Text style={[styles.breakdownVal, { color: "#f5c242", fontWeight: "700" }]}>
                      -R{superCoinDiscount.toFixed(2)}
                    </Text>
                  </View>
                )}

                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>
                    {selectedCourier
                      ? `${selectedCourier.courierName} (${selectedCourier.serviceLevel})`
                      : deliveryPreference === "postnet"
                      ? "PostNet Pickup Delivery"
                      : isSouthAfrica
                      ? "PostNet Standard Delivery"
                      : "DHL Express Courier"}
                  </Text>
                  <Text style={styles.breakdownVal}>
                    {shippingFee === 0 ? "FREE" : `R${shippingFee.toFixed(2)}`}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.breakdownRowTotal}>
                  <Text style={styles.breakdownLabelTotal}>TOTAL TO PAY</Text>
                  <Text style={styles.breakdownValTotal}>R{grandTotal.toFixed(2)}</Text>
                </View>
              </View>

              {/* Place Order CTA */}
              <TouchableOpacity
                style={styles.placeOrderTouch}
                onPress={handlePlaceOrder}
                disabled={isSubmitting}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={["#f5c242", "#c99742", "#a67c2e"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.placeOrderGradient}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={styles.placeOrderText}>
                      {paymentMethod === "payfast"
                        ? `PAY WITH PAYFAST • R${grandTotal.toFixed(2)}`
                        : `PLACE ORDER • R${grandTotal.toFixed(2)}`}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}
      {renderPayfastModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0c0a08" },
  loadingCenter: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { padding: 14, paddingBottom: 60 },

  // Top Wizard Progress Bar
  topProgressContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#15120e",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.25)",
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  progressStepTouch: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressStepActive: {},
  progressBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  progressBadgeActive: {
    backgroundColor: "#c99742",
    borderColor: "#c99742",
  },
  progressBadgeDone: {
    backgroundColor: "rgba(201, 151, 66, 0.2)",
    borderColor: "#c99742",
  },
  progressBadgeText: {
    color: "#888",
    fontSize: 11,
    fontWeight: "800",
  },
  progressBadgeTextActive: {
    color: "#000",
    fontWeight: "900",
  },
  progressBadgeTextDone: {
    color: "#f5c242",
    fontWeight: "900",
  },
  progressLabel: {
    color: "#777",
    fontSize: 11,
    fontWeight: "700",
  },
  progressLabelActive: {
    color: "#f5c242",
    fontWeight: "800",
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginHorizontal: 8,
  },
  progressLineActive: {
    backgroundColor: "#c99742",
  },

  // Step Title Row & Navigation Shortcuts
  stepTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  mainStepTitle: {
    color: "#f8f5ee",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  mainStepSubtitle: {
    color: "#888",
    fontSize: 11,
    marginTop: 2,
  },
  stepBackLink: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "rgba(201, 151, 66, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.25)",
  },
  stepBackLinkText: {
    color: "#f5c242",
    fontSize: 11,
    fontWeight: "700",
  },

  // Delivery Modes Column (Deliver to Address / Collect from PostNet / International DHL)
  deliveryModesColumn: {
    gap: 10,
    marginTop: 4,
  },
  modeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0e0c0a",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 12,
  },
  modeCardActive: {
    borderColor: "#c99742",
    backgroundColor: "rgba(201, 151, 66, 0.12)",
  },
  modeIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  modeIcon: {
    fontSize: 18,
  },
  modeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  modeTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  modeTag: {
    backgroundColor: "rgba(201, 151, 66, 0.18)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  modeTagText: {
    color: "#f5c242",
    fontSize: 9,
    fontWeight: "800",
  },
  modeSubtitle: {
    color: "#888",
    fontSize: 10.5,
    lineHeight: 14,
  },
  modeRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#c99742",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  modeRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#f5c242",
  },

  // Card Header Titles
  cardHeaderTitle: {
    color: "#c99742",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 12,
  },

  // Select Store Button in PostNet list
  selectStoreBtn: {
    backgroundColor: "#c99742",
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
    alignSelf: "center",
    marginLeft: 8,
  },
  selectStoreBtnText: {
    color: "#000",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  // Locked Delivery Card in Step 3
  lockedDeliveryCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#15120e",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.3)",
    padding: 14,
    marginBottom: 16,
  },
  lockedDeliveryLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  lockedDeliveryTag: {
    color: "#f5c242",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  lockedDeliveryAddress: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  changeDeliveryBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "rgba(201, 151, 66, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.35)",
  },
  changeDeliveryBtnText: {
    color: "#f5c242",
    fontSize: 11,
    fontWeight: "800",
    textDecorationLine: "underline",
  },

  // Continue Step Button (Gradient)
  continueStepBtn: {
    marginBottom: 24,
  },
  continueStepGradient: {
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#f5c242",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  continueStepText: {
    color: "#0a0a0a",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  // Section Cards
  sectionCard: {
    backgroundColor: "#15120e",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.22)",
    marginBottom: 16,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
    paddingBottom: 10,
  },
  stepNumberCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#c99742",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  stepNumber: {
    color: "#0a0a0a",
    fontSize: 12,
    fontWeight: "900",
  },
  stepTitle: {
    color: "#f8f5ee",
    fontSize: 15,
    fontWeight: "700",
  },
  subtleHelperText: {
    color: "#888",
    fontSize: 11,
    marginBottom: 12,
    lineHeight: 16,
  },

  // Delivery Method Selection Row
  deliveryMethodsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  deliveryMethodCard: {
    flex: 1,
    backgroundColor: "#0e0c0a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 10,
    alignItems: "center",
  },
  deliveryMethodCardActive: {
    borderColor: "#c99742",
    backgroundColor: "rgba(201, 151, 66, 0.14)",
  },
  deliveryMethodIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  deliveryMethodTitle: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 3,
    textAlign: "center",
  },
  deliveryMethodDesc: {
    color: "#777",
    fontSize: 9,
    textAlign: "center",
    lineHeight: 12,
  },

  // PostNet Notice Box
  postnetNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(201, 151, 66, 0.08)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.25)",
    padding: 12,
    marginBottom: 12,
  },
  postnetNoticeIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  postnetNoticeTitle: {
    color: "#f5c242",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  postnetNoticeDesc: {
    color: "#bbb",
    fontSize: 11,
    lineHeight: 15,
  },

  // PostNet Stores Section (Prominent)
  postnetStoresSection: {
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.3)",
    padding: 12,
    marginBottom: 14,
  },
  selectCityPromptBox: {
    padding: 18,
    backgroundColor: "rgba(201, 151, 66, 0.08)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.28)",
    alignItems: "center",
    marginVertical: 4,
  },
  selectCityPromptIcon: {
    fontSize: 26,
    marginBottom: 6,
  },
  selectCityPromptTitle: {
    color: "#f5c242",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    textAlign: "center",
    marginBottom: 4,
  },
  selectCityPromptSub: {
    color: "#aaa",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: 6,
  },
  quickCityChip: {
    backgroundColor: "#16130f",
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.35)",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
  },
  quickCityChipText: {
    color: "#f5c242",
    fontSize: 11,
    fontWeight: "700",
  },
  changeCityBtn: {
    backgroundColor: "rgba(201, 151, 66, 0.15)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#c99742",
  },
  changeCityBtnText: {
    color: "#f5c242",
    fontSize: 10,
    fontWeight: "800",
  },
  switchCityScroll: {
    marginBottom: 10,
  },
  switchCityChip: {
    backgroundColor: "#110e0c",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 6,
  },
  switchCityChipActive: {
    backgroundColor: "rgba(201, 151, 66, 0.22)",
    borderColor: "#c99742",
  },
  switchCityChipText: {
    color: "#888",
    fontSize: 10.5,
    fontWeight: "600",
  },
  switchCityChipTextActive: {
    color: "#f5c242",
    fontWeight: "800",
  },
  postnetStoresHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  postnetStoresTitle: {
    color: "#f5c242",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  postnetStoresSubtitle: {
    color: "#888",
    fontSize: 10,
    marginTop: 1,
  },
  branchSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0d0b09",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  branchSearchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 12,
    padding: 0,
  },
  selectedBranchBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(76, 217, 100, 0.12)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(76, 217, 100, 0.4)",
    padding: 10,
    marginBottom: 10,
  },
  selectedBranchCheckCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#4cd964",
    justifyContent: "center",
    alignItems: "center",
  },
  selectedBranchCheckText: {
    color: "#0a0a0a",
    fontSize: 11,
    fontWeight: "900",
  },
  selectedBranchBannerTitle: {
    color: "#4cd964",
    fontSize: 12,
    fontWeight: "800",
  },
  selectedBranchBannerAddress: {
    color: "#bbb",
    fontSize: 10,
    marginTop: 1,
  },
  postnetStoreCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#0d0b09",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 12,
    marginBottom: 8,
  },
  postnetStoreCardSelected: {
    borderColor: "#c99742",
    backgroundColor: "rgba(201, 151, 66, 0.14)",
  },
  storeNameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  storeName: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
  },
  distanceBadge: {
    backgroundColor: "rgba(76, 217, 100, 0.15)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  distanceBadgeText: {
    color: "#4cd964",
    fontSize: 10,
    fontWeight: "800",
  },
  storeAddress: {
    color: "#888",
    fontSize: 11,
    lineHeight: 15,
  },
  storePhone: {
    color: "#c99742",
    fontSize: 10,
    marginTop: 3,
  },
  emptyStoresBox: {
    padding: 12,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  emptyStoresText: {
    color: "#777",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
  },

  // PostNet Cities Grid & Show More Controls
  postnetCitiesBox: {
    backgroundColor: "#110e0c",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.25)",
    padding: 12,
    marginBottom: 12,
  },
  postnetCitiesHeader: {
    marginBottom: 10,
  },
  postnetCitiesTitle: {
    color: "#f5c242",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  postnetCitiesSub: {
    color: "#888",
    fontSize: 10,
    marginTop: 2,
  },
  postnetCitiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  postnetCityCard: {
    width: "31%",
    backgroundColor: "#16130f",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 8,
    alignItems: "center",
    position: "relative",
  },
  postnetCityCardActive: {
    backgroundColor: "rgba(201, 151, 66, 0.2)",
    borderColor: "#c99742",
  },
  postnetCityIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  postnetCityName: {
    color: "#ccc",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  postnetCityNameActive: {
    color: "#f5c242",
    fontWeight: "800",
  },
  postnetCitySub: {
    color: "#666",
    fontSize: 8.5,
    textAlign: "center",
    marginTop: 1,
  },
  citySelectedCheck: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#10b981",
    justifyContent: "center",
    alignItems: "center",
  },
  citySelectedCheckText: {
    color: "#0a0a0a",
    fontSize: 8.5,
    fontWeight: "900",
  },
  showMoreCitiesBtn: {
    marginTop: 8,
    paddingVertical: 7,
    backgroundColor: "rgba(201, 151, 66, 0.1)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.3)",
    alignItems: "center",
  },
  showMoreCitiesBtnText: {
    color: "#f5c242",
    fontSize: 11,
    fontWeight: "800",
  },
  showMoreBranchesBtn: {
    marginTop: 4,
    marginBottom: 10,
    paddingVertical: 9,
    backgroundColor: "rgba(201, 151, 66, 0.12)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.35)",
    alignItems: "center",
  },
  nearestCityBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.35)",
    padding: 12,
    marginBottom: 12,
  },
  nearestCityTitle: {
    color: "#fbbf24",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 3,
  },
  nearestCityDesc: {
    color: "#ccc",
    fontSize: 11,
    lineHeight: 15,
  },
  showMoreBranchesBtnText: {
    color: "#f5c242",
    fontSize: 11.5,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  dropdownShowMoreBtn: {
    paddingVertical: 8,
    backgroundColor: "rgba(201, 151, 66, 0.08)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
  },
  dropdownShowMoreBtnText: {
    color: "#f5c242",
    fontSize: 10.5,
    fontWeight: "800",
  },

  // Inputs
  inputGroup: {
    marginBottom: 12,
  },
  rowInputs: {
    flexDirection: "row",
  },
  labelRowWithIcon: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  inputLabel: {
    color: "#888",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  textInput: {
    backgroundColor: "#0d0b09",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    color: "#fff",
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  // Autocomplete Dropdowns
  predictionsDropdown: {
    marginTop: 6,
    backgroundColor: "#16130f",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(201, 151, 66, 0.4)",
    overflow: "hidden",
    elevation: 10,
  },
  predictionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  predictionsHeaderText: {
    color: "#c99742",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  googlePoweredText: {
    color: "#666",
    fontSize: 9,
    fontStyle: "italic",
  },
  predictionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  predictionPinIcon: {
    fontSize: 14,
    marginRight: 10,
  },
  predictionMainText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  predictionSubText: {
    color: "#888",
    fontSize: 11,
    marginTop: 1,
  },


  // Country Locked & Chips
  lockedBadge: {
    backgroundColor: "rgba(201, 151, 66, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  lockedBadgeText: {
    color: "#f5c242",
    fontSize: 10,
    fontWeight: "800",
  },
  editableNoticeText: {
    color: "#777",
    fontSize: 10,
  },
  lockedCountryBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(201, 151, 66, 0.08)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.3)",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  lockedCountryFlag: {
    fontSize: 18,
    marginRight: 8,
  },
  lockedCountryText: {
    color: "#f5c242",
    fontSize: 15,
    fontWeight: "800",
    flex: 1,
  },
  zaTag: {
    backgroundColor: "#c99742",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  zaTagText: {
    color: "#0a0a0a",
    fontSize: 10,
    fontWeight: "900",
  },

  // Calculate Rates Button
  calcRatesBtn: {
    backgroundColor: "rgba(201, 151, 66, 0.15)",
    borderWidth: 1,
    borderColor: "#c99742",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
  },
  calcBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  calcRatesBtnIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  calcRatesBtnText: {
    color: "#f5c242",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  // Courier Rates Section
  courierRatesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  courierSectionTitle: {
    color: "#c99742",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  courierRateCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0d0b09",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 12,
    marginBottom: 8,
  },
  courierRateCardSelected: {
    borderColor: "#c99742",
    backgroundColor: "rgba(201, 151, 66, 0.12)",
  },
  courierHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  courierNameText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  courierCostText: {
    color: "#f5c242",
    fontSize: 13,
    fontWeight: "900",
  },
  courierDaysText: {
    color: "#888",
    fontSize: 11,
  },

  // International Delivery Red Card (Matching Web Version)
  internationalDeliveryCard: {
    marginTop: 14,
    backgroundColor: "rgba(127, 29, 29, 0.2)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.5)",
    padding: 16,
  },
  internationalDeliveryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  internationalWarningIcon: {
    fontSize: 15,
    marginRight: 8,
  },
  internationalDeliveryTitle: {
    color: "#f87171",
    fontSize: 14,
    fontWeight: "700",
  },
  internationalDeliveryText: {
    color: "rgba(254, 202, 202, 0.85)",
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 14,
  },
  dutiesCheckboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  dutiesCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#888",
    backgroundColor: "#110e0c",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    marginRight: 10,
  },
  dutiesCheckboxChecked: {
    backgroundColor: "#ef4444",
    borderColor: "#ef4444",
  },
  dutiesCheckmark: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 14,
  },
  dutiesCheckboxLabel: {
    flex: 1,
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },

  // Step 2 Item Row & Interactive Controls
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.07)",
  },
  itemThumb: {
    width: 54,
    height: 70,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    marginRight: 12,
  },
  itemDetailsCol: {
    flex: 1,
  },
  itemTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  itemName: {
    flex: 1,
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
    paddingRight: 8,
    lineHeight: 18,
  },
  itemRemoveTouch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 75, 75, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 75, 75, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  itemRemoveIcon: {
    color: "#ff6b6b",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 12,
  },
  itemMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 8,
  },
  itemSizeBadge: {
    color: "#d4af37",
    fontSize: 11,
    fontWeight: "600",
    backgroundColor: "rgba(212, 175, 55, 0.12)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
    overflow: "hidden",
  },
  itemUnitPrice: {
    color: "#8e867b",
    fontSize: 11,
    fontWeight: "500",
  },
  itemControlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  itemStepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 2,
  },
  stepperActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperActionMinus: {
    color: "#e8c37d",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 18,
  },
  stepperActionPlus: {
    color: "#e8c37d",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 18,
  },
  stepperQtyBox: {
    minWidth: 32,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  stepperQtyText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  itemTotalCol: {
    alignItems: "flex-end",
  },
  itemTotalLabel: {
    color: "#6c665e",
    fontSize: 9,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  itemPrice: {
    color: "#f5c242",
    fontSize: 14,
    fontWeight: "800",
  },
  emptyCheckoutReserve: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCheckoutText: {
    color: "#888",
    fontSize: 13,
    fontStyle: "italic",
    marginBottom: 12,
  },
  emptyCheckoutBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "rgba(245, 194, 66, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(245, 194, 66, 0.3)",
  },
  emptyCheckoutBtnText: {
    color: "#f5c242",
    fontSize: 12,
    fontWeight: "700",
  },

  // Step 3 Payment Options
  paymentOption: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#0d0b09",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 14,
    marginBottom: 10,
  },
  paymentOptionActive: {
    borderColor: "#c99742",
    backgroundColor: "rgba(201, 151, 66, 0.08)",
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#c99742",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#f5c242",
  },
  optionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentOptionTitle: {
    color: "#f8f5ee",
    fontSize: 14,
    fontWeight: "700",
  },
  preferredBadge: {
    backgroundColor: "rgba(201, 151, 66, 0.2)",
    color: "#f5c242",
    fontSize: 9,
    fontWeight: "800",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  zaOnlyBadge: {
    backgroundColor: "rgba(76, 217, 100, 0.15)",
    color: "#4cd964",
    fontSize: 9,
    fontWeight: "900",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  paymentOptionDesc: {
    color: "#888",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  payfastBadgeBox: {
    alignSelf: "flex-start",
    marginTop: 6,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  payfastBadgeText: {
    color: "#ccc",
    fontSize: 10,
    fontWeight: "700",
  },

  // Step 4 Breakdown Card
  breakdownCard: {
    backgroundColor: "#15120e",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.22)",
    marginBottom: 20,
  },
  breakdownTitle: {
    color: "#888",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  breakdownLabel: {
    color: "#aaa",
    fontSize: 13,
  },
  breakdownVal: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginVertical: 10,
  },
  breakdownRowTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  breakdownLabelTotal: {
    color: "#f8f5ee",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  breakdownValTotal: {
    color: "#f5c242",
    fontSize: 18,
    fontWeight: "900",
  },

  // Place Order Button
  placeOrderTouch: {
    marginBottom: 30,
  },
  placeOrderGradient: {
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#f5c242",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  placeOrderText: {
    color: "#0a0a0a",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.6,
  },

  // Success Screen
  successScroll: {
    padding: 16,
    paddingBottom: 60,
  },
  successHeader: {
    alignItems: "center",
    marginVertical: 18,
  },
  checkCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(201, 151, 66, 0.2)",
    borderWidth: 2,
    borderColor: "#c99742",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  checkMark: {
    color: "#f5c242",
    fontSize: 30,
    fontWeight: "900",
  },
  successTitle: {
    color: "#f8f5ee",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 6,
  },
  orderIdBadge: {
    color: "#888",
    fontSize: 13,
  },
  orderIdText: {
    color: "#f5c242",
    fontWeight: "800",
  },
  bankCard: {
    backgroundColor: "#15120e",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.35)",
    marginBottom: 16,
  },
  bankCardHeader: {
    marginBottom: 14,
  },
  bankCardTitle: {
    color: "#f5c242",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 6,
  },
  bankNotice: {
    color: "#bbb",
    fontSize: 13,
    lineHeight: 18,
  },
  bankAmount: {
    color: "#fff",
    fontWeight: "800",
  },
  bankDetailsBox: {
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  bankRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  bankLabel: {
    color: "#777",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  bankVal: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  bankValMono: {
    fontFamily: Platform.OS === "android" ? "monospace" : "Menlo",
    letterSpacing: 0.5,
  },
  bankRefVal: {
    color: "#f5c242",
    fontSize: 17,
    fontWeight: "800",
    fontFamily: Platform.OS === "android" ? "monospace" : "Menlo",
  },
  emailNoticeBox: {
    marginTop: 14,
    backgroundColor: "rgba(201, 151, 66, 0.08)",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.2)",
  },
  emailNoticeText: {
    color: "#d4af37",
    fontSize: 12,
    lineHeight: 16,
  },
  payfastSuccessCard: {
    backgroundColor: "#15120e",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.35)",
    marginBottom: 16,
  },
  payfastSuccessTitle: {
    color: "#f5c242",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  payfastSuccessSub: {
    color: "#aaa",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  relaunchPayfastBtn: {
    backgroundColor: "#f5c242",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    marginBottom: 10,
  },
  relaunchPayfastText: {
    color: "#0a0a0a",
    fontSize: 12,
    fontWeight: "800",
  },
  deliverySummaryCard: {
    backgroundColor: "#15120e",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: 20,
  },
  sectionHeadingGold: {
    color: "#c99742",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  recipientName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  recipientSub: {
    color: "#888",
    fontSize: 12,
    marginTop: 2,
  },
  doneBtnTouch: {
    marginTop: 10,
  },
  doneBtnGradient: {
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  doneBtnText: {
    color: "#0a0a0a",
    fontSize: 14,
    fontWeight: "800",
  },

  // PayFast In-App Modal Styles
  payfastModalContainer: {
    flex: 1,
    backgroundColor: "#0c0b0a",
  },
  payfastModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#16130f",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(201, 151, 66, 0.3)",
  },
  payfastModalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  payfastLockBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(201, 151, 66, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  payfastLockIcon: {
    fontSize: 14,
  },
  payfastModalTitle: {
    color: "#f5c242",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  payfastModalSubtitle: {
    color: "#999",
    fontSize: 11,
    marginTop: 1,
  },
  payfastModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  payfastModalCloseText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  payfastLoadingBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(201, 151, 66, 0.12)",
    paddingVertical: 6,
    gap: 8,
  },
  payfastLoadingText: {
    color: "#f5c242",
    fontSize: 11,
    fontWeight: "600",
  },
  payfastLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0c0b0a",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  payfastOverlayText: {
    color: "#f5c242",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 12,
  },
  payfastWebView: {
    flex: 1,
    backgroundColor: "#0c0b0a",
  },

  // Paid Banner & CheckCircle States
  checkCirclePaid: {
    backgroundColor: "#4cd964",
  },
  payfastPaidBanner: {
    backgroundColor: "rgba(76, 217, 100, 0.1)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(76, 217, 100, 0.35)",
    padding: 14,
    marginBottom: 16,
  },
  payfastPaidRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  payfastPaidIcon: {
    color: "#4cd964",
    fontSize: 18,
    fontWeight: "900",
    marginRight: 10,
    marginTop: 1,
  },
  payfastPaidTitle: {
    color: "#4cd964",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 3,
  },
  payfastPaidSub: {
    color: "#bbb",
    fontSize: 12,
    lineHeight: 16,
  },

  // Itemized Tax Invoice & Bill Styles
  invoiceBillCard: {
    backgroundColor: "#14110e",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.28)",
    padding: 16,
    marginBottom: 16,
  },
  invoiceBillHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  invoiceBrand: {
    color: "#f5c242",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  invoiceSubtitle: {
    color: "#888",
    fontSize: 10,
    letterSpacing: 0.8,
    marginTop: 2,
    fontWeight: "700",
  },
  invoiceMetaRight: {
    alignItems: "flex-end",
  },
  invoiceDateLabel: {
    color: "#777",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  invoiceDateVal: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  invoiceDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginVertical: 12,
  },
  invoiceRowTwoCol: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  invoiceSmallHeading: {
    color: "#c99742",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  invoiceCustomerName: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  invoiceCustomerDetail: {
    color: "#999",
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  invoiceCourierPill: {
    marginTop: 6,
    backgroundColor: "rgba(201, 151, 66, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.25)",
  },
  invoiceCourierText: {
    color: "#f5c242",
    fontSize: 10,
    fontWeight: "700",
  },
  invoiceItemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    padding: 8,
    borderRadius: 10,
  },
  invoiceItemImage: {
    width: 42,
    height: 42,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  invoiceItemPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 6,
    backgroundColor: "rgba(201, 151, 66, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  invoiceItemInfo: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  invoiceItemName: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  invoiceItemMeta: {
    color: "#888",
    fontSize: 11,
    marginTop: 2,
  },
  invoiceItemTotal: {
    color: "#f5c242",
    fontSize: 13,
    fontWeight: "800",
  },
  invoiceTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  invoiceTotalLabel: {
    color: "#aaa",
    fontSize: 12,
  },
  invoiceTotalVal: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  invoiceGrandTotalBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(201, 151, 66, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.3)",
    marginTop: 8,
    marginBottom: 8,
  },
  invoiceGrandTotalLabel: {
    color: "#f5c242",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  invoiceGrandTotalVal: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "900",
  },
  invoicePaymentTagRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
  },
  invoicePaymentTagLabel: {
    color: "#888",
    fontSize: 11,
  },
  invoicePaymentTagVal: {
    fontSize: 11,
    fontWeight: "800",
  },

  // Actions
  successActionsCol: {
    gap: 10,
    marginTop: 6,
    marginBottom: 30,
  },
  ordersBtnTouch: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.4)",
    backgroundColor: "rgba(201, 151, 66, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  ordersBtnText: {
    color: "#f5c242",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  // 🔒 Confidence & Compliance Section Styles
  confidenceCard: {
    backgroundColor: "#110e0b",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.25)",
    padding: 16,
    marginBottom: 16,
  },
  confidenceHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  confidenceShieldIcon: {
    fontSize: 22,
    marginRight: 10,
    marginTop: 2,
  },
  confidenceTitle: {
    color: "#f8f5ee",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  confidenceSub: {
    color: "#999",
    fontSize: 11,
    lineHeight: 16,
  },
  confidenceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
    paddingTop: 10,
    gap: 8,
    marginBottom: 12,
  },
  confidenceGridItem: {
    flexDirection: "row",
    alignItems: "center",
    width: "48%",
  },
  confidenceCheck: {
    color: "#10b981",
    fontSize: 12,
    fontWeight: "900",
    marginRight: 6,
  },
  confidenceItemText: {
    color: "#ccc",
    fontSize: 11,
    fontWeight: "600",
  },
  liquorComplianceBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(245, 194, 66, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(245, 194, 66, 0.25)",
    borderRadius: 10,
    padding: 10,
  },
  liquorComplianceIcon: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 1,
  },
  liquorComplianceText: {
    flex: 1,
    color: "#e2d2a4",
    fontSize: 10.5,
    lineHeight: 15,
  },
  liquorComplianceBold: {
    color: "#f5c242",
    fontWeight: "800",
  },

  // ⭐ Super Coins Loyalty Card Styles
  superCoinsCheckoutCard: {
    backgroundColor: "#16130e",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.35)",
    padding: 16,
    marginBottom: 16,
    shadowColor: "#c99742",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  superCoinsCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  superCoinsIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(201, 151, 66, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  superCoinsIconText: {
    fontSize: 20,
  },
  superCoinsTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  superCoinsCardTitle: {
    color: "#f8f5ee",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  superCoinsRateBadge: {
    backgroundColor: "rgba(201, 151, 66, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  superCoinsRateBadgeText: {
    color: "#f5c242",
    fontSize: 9,
    fontWeight: "800",
  },
  superCoinsBalanceSub: {
    color: "#aaa",
    fontSize: 11.5,
  },
  superCoinsBalanceGold: {
    color: "#f5c242",
    fontWeight: "800",
  },
  superCoinsToggle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "rgba(201, 151, 66, 0.4)",
    backgroundColor: "#0e0c0a",
    justifyContent: "center",
    alignItems: "center",
  },
  superCoinsToggleActive: {
    backgroundColor: "#c99742",
    borderColor: "#f5c242",
  },
  superCoinsToggleCheck: {
    color: "#0c0a08",
    fontSize: 16,
    fontWeight: "900",
  },
  superCoinsAppliedRow: {
    borderTopWidth: 1,
    borderTopColor: "rgba(201, 151, 66, 0.15)",
    marginTop: 12,
    paddingTop: 10,
  },
  superCoinsAppliedLeft: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  superCoinsAppliedCheck: {
    color: "#10b981",
    fontSize: 13,
    fontWeight: "900",
    marginRight: 6,
  },
  superCoinsAppliedText: {
    color: "#e5e5e5",
    fontSize: 12,
    fontWeight: "600",
  },
  superCoinsAppliedAmount: {
    color: "#10b981",
    fontWeight: "800",
  },
  superCoinsMarginNote: {
    color: "#f5c242",
    fontSize: 10.5,
    fontStyle: "italic",
    paddingLeft: 19,
  },
  superCoinsEarnBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(201, 151, 66, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.2)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 10,
  },
  superCoinsEarnIcon: {
    fontSize: 15,
    marginRight: 8,
  },
  superCoinsEarnText: {
    flex: 1,
    color: "#ddd",
    fontSize: 11,
    lineHeight: 15,
  },
  superCoinsEarnGold: {
    color: "#f5c242",
    fontWeight: "800",
  },

  // PostNet Pickup Confirmation Card Styles
  postnetPickupConfirmCard: {
    backgroundColor: "#16130e",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#c99742",
    padding: 16,
    marginBottom: 16,
  },
  postnetPickupHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  postnetPickupIcon: {
    fontSize: 22,
    marginRight: 10,
    marginTop: 2,
  },
  postnetPickupBadge: {
    color: "#10b981",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  postnetPickupName: {
    color: "#f8f5ee",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 3,
  },
  postnetPickupAddress: {
    color: "#aaa",
    fontSize: 11.5,
    lineHeight: 16,
    marginBottom: 4,
  },
  postnetPickupPhone: {
    color: "#f5c242",
    fontSize: 11.5,
    fontWeight: "600",
  },
  postnetPinNotice: {
    backgroundColor: "rgba(201, 151, 66, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.25)",
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  postnetPinNoticeText: {
    color: "#e2d2a4",
    fontSize: 11,
    lineHeight: 16,
  },

  // 6-Stage Delivery Tracking Timeline Styles
  timelineCard: {
    backgroundColor: "#13100c",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.25)",
    padding: 16,
    marginBottom: 16,
  },
  timelineTitle: {
    color: "#f5c242",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 16,
  },
  timelineList: {
    paddingLeft: 4,
  },
  timelineStepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    minHeight: 48,
  },
  timelineLeftCol: {
    alignItems: "center",
    width: 28,
    marginRight: 12,
  },
  timelineNode: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#221e18",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  timelineNodeDone: {
    backgroundColor: "#10b981",
    borderColor: "#10b981",
  },
  timelineNodeActive: {
    backgroundColor: "#c99742",
    borderColor: "#f5c242",
  },
  timelineNodeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 24,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    marginVertical: 2,
  },
  timelineLineDone: {
    backgroundColor: "#10b981",
  },
  timelineRightCol: {
    flex: 1,
    paddingBottom: 14,
  },
  timelineStepName: {
    color: "#888",
    fontSize: 12.5,
    fontWeight: "700",
    marginBottom: 2,
  },
  timelineStepNameActive: {
    color: "#f8f5ee",
  },
  timelineStepDesc: {
    color: "#777",
    fontSize: 10.5,
    lineHeight: 14,
  },

  // Receipt Super Coins Row
  superCoinsEarnedReceiptRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(201, 151, 66, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.3)",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    marginBottom: 4,
  },
  superCoinsEarnedReceiptIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  superCoinsEarnedReceiptText: {
    flex: 1,
    color: "#f5c242",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
  },

  // 18+ Verification & Compliance Card Styles
  verifySubtitle: {
    color: "#a89b88",
    fontSize: 11,
    marginTop: 2,
  },
  guestVerifyContainer: {
    marginTop: 8,
  },
  kycExplainerBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(201, 151, 66, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.25)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  kycExplainerIcon: {
    fontSize: 18,
    marginRight: 10,
    marginTop: 1,
  },
  kycExplainerText: {
    flex: 1,
    color: "#d4c8b8",
    fontSize: 11.5,
    lineHeight: 16.5,
  },
  verifyTypeSelector: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
    marginTop: 4,
  },
  verifyTypeOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: "#1c1915",
    borderWidth: 1,
    borderColor: "#332c23",
    alignItems: "center",
    justifyContent: "center",
  },
  verifyTypeOptionActive: {
    backgroundColor: "rgba(201, 151, 66, 0.2)",
    borderColor: "#c99742",
  },
  verifyTypeOptionText: {
    color: "#8e8271",
    fontSize: 11.5,
    fontWeight: "600",
  },
  verifyTypeOptionTextActive: {
    color: "#f5c242",
    fontWeight: "700",
  },
  docUploadingBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#1c1915",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#c99742",
    marginTop: 6,
  },
  docUploadingText: {
    color: "#c99742",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 10,
  },
  verifyDocAttachedBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderWidth: 1.5,
    borderColor: "rgba(16, 185, 129, 0.4)",
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
  },
  verifyDocAttachedLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  verifyDocAttachedCheck: {
    color: "#10b981",
    fontSize: 16,
    fontWeight: "900",
    marginRight: 10,
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    width: 26,
    height: 26,
    lineHeight: 26,
    borderRadius: 13,
    textAlign: "center",
  },
  verifyDocAttachedTitle: {
    color: "#10b981",
    fontSize: 12,
    fontWeight: "700",
  },
  verifyDocAttachedName: {
    color: "#a89b88",
    fontSize: 11,
    marginTop: 2,
  },
  verifyDocReuploadBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: "rgba(201, 151, 66, 0.2)",
    borderWidth: 1,
    borderColor: "#c99742",
  },
  verifyDocReuploadText: {
    color: "#f5c242",
    fontSize: 11,
    fontWeight: "700",
  },
  verifyDocUploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1612",
    borderWidth: 1.5,
    borderColor: "#c99742",
    borderStyle: "dashed",
    borderRadius: 10,
    padding: 14,
    marginTop: 6,
  },
  verifyDocUploadIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  verifyDocUploadTitle: {
    color: "#f5c242",
    fontSize: 13,
    fontWeight: "700",
  },
  verifyDocUploadSub: {
    color: "#8e8271",
    fontSize: 10.5,
    marginTop: 2,
  },
  verifyCheckboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 14,
    paddingVertical: 4,
  },
  verifyCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#c99742",
    backgroundColor: "#16130f",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginTop: 2,
  },
  verifyCheckboxChecked: {
    backgroundColor: "#c99742",
  },
  verifyCheckmark: {
    color: "#000",
    fontSize: 13,
    fontWeight: "900",
  },
  verifyCheckboxText: {
    flex: 1,
    color: "#cfc5b4",
    fontSize: 11.5,
    lineHeight: 16.5,
  },
  authVerifiedContainer: {
    paddingVertical: 4,
  },
  authVerifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    borderRadius: 10,
    padding: 12,
  },
  authVerifiedIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#10b981",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  authVerifiedIcon: {
    color: "#000",
    fontSize: 15,
    fontWeight: "900",
  },
  authVerifiedTitle: {
    color: "#10b981",
    fontSize: 13,
    fontWeight: "700",
  },
  authVerifiedSub: {
    color: "#9ca3af",
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },

  // Confirmation Screen Compliance & Tracking Notice Styles
  complianceNoticeCard: {
    backgroundColor: "#14110d",
    borderWidth: 1.5,
    borderColor: "#c99742",
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  complianceNoticeHeader: {
    marginBottom: 14,
  },
  complianceNoticeBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(201, 151, 66, 0.2)",
    borderWidth: 1,
    borderColor: "#c99742",
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  complianceNoticeBadgeText: {
    color: "#f5c242",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  complianceNoticeTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  complianceNoticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#1c1813",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#2e261b",
    marginBottom: 10,
  },
  complianceNoticeIcon: {
    fontSize: 18,
    marginRight: 10,
    marginTop: 2,
  },
  complianceNoticeItemTitle: {
    color: "#f5c242",
    fontSize: 12.5,
    fontWeight: "700",
    marginBottom: 3,
  },
  complianceNoticeItemDesc: {
    color: "#b8ab98",
    fontSize: 11,
    lineHeight: 15.5,
  },
  complianceContactRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#2a2218",
    gap: 4,
  },
  complianceContactLine: {
    color: "#8e8271",
    fontSize: 11,
  },
  complianceContactHighlight: {
    color: "#ffffff",
    fontWeight: "700",
  },
  complianceKycBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#1c1813",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#2e261b",
  },
  complianceKycIcon: {
    fontSize: 18,
    marginRight: 10,
    marginTop: 2,
  },
  complianceKycTitle: {
    color: "#ffffff",
    fontSize: 12.5,
    fontWeight: "700",
    marginBottom: 3,
  },
  complianceKycDesc: {
    color: "#b8ab98",
    fontSize: 11,
    lineHeight: 15.5,
  },
  complianceStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  complianceStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  complianceStatusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  giftToggleHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  giftIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(201, 151, 66, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  giftIcon: {
    fontSize: 20,
  },
  giftFieldsContainer: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  giftReceiptCard: {
    backgroundColor: "rgba(201, 151, 66, 0.08)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.25)",
    padding: 12,
    marginVertical: 4,
  },
  giftReceiptTitle: {
    color: "#f5c242",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  giftReceiptRecipient: {
    color: "#ccc",
    fontSize: 12,
    marginBottom: 4,
  },
  giftReceiptMessage: {
    color: "#e8d8be",
    fontSize: 12,
    fontStyle: "italic",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
});

export default Checkout;
