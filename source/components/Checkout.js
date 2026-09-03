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
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import AppHeader from "../widgets/AppHeader";
import tmh_styles from "../styles/tmh_styles";
import { HEADER_HEIGHT_THRESHOLD, API_BASE } from "../resources/data/Constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

const GOOGLE_MAPS_API_KEY = "AIzaSyBGtqdVoKgd9sCmz2Y8wxuwa0WfDBaymGk";
const IMAGE_BASE_URL = "https://ik.imagekit.io/thegrandstore/images/products/";

const showMessage = (msg) => {
  if (Platform.OS === "android") ToastAndroid.show(msg, ToastAndroid.SHORT);
  else Alert.alert("", msg);
};

// Top South African cities for instant suggestion
const DEFAULT_SA_CITIES = [
  { description: "Sandton, South Africa", main_text: "Sandton" },
  { description: "Johannesburg, South Africa", main_text: "Johannesburg" },
  { description: "Cape Town, South Africa", main_text: "Cape Town" },
  { description: "Durban, South Africa", main_text: "Durban" },
  { description: "Pretoria, South Africa", main_text: "Pretoria" },
  { description: "Stellenbosch, South Africa", main_text: "Stellenbosch" },
  { description: "Centurion, South Africa", main_text: "Centurion" },
  { description: "Gqeberha (Port Elizabeth), South Africa", main_text: "Gqeberha" },
  { description: "Bloemfontein, South Africa", main_text: "Bloemfontein" },
  { description: "East London, South Africa", main_text: "East London" },
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
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Johannesburg");
  const [postalCode, setPostalCode] = useState("2000");
  const [country, setCountry] = useState("South Africa");
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);

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

  // Delivery Preference: 'home' (Door Courier), 'postnet' (PostNet Pickup), 'best' (Compare All)
  const [deliveryPreference, setDeliveryPreference] = useState("home");

  // PostNet Branch Locator State
  const [postnetStores, setPostnetStores] = useState(FALLBACK_POSTNET_STORES["johannesburg"]);
  const [preferredPostnetStore, setPreferredPostnetStore] = useState(
    FALLBACK_POSTNET_STORES["johannesburg"]?.[0] || null
  );
  const [isLoadingPostnet, setIsLoadingPostnet] = useState(false);
  const [branchSearch, setBranchSearch] = useState("");

  // Delivery Quote State (from backend /api/checkout/quote)
  const [quote, setQuote] = useState(null);
  const [isCalculatingQuote, setIsCalculatingQuote] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState(null);

  // Payment Method: 'payfast' or 'bank_transfer'
  const [paymentMethod, setPaymentMethod] = useState("payfast");

  // Order Completion State
  const [orderCompleted, setOrderCompleted] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);

  const getImageUrl = (imagePath) => {
    if (!imagePath || typeof imagePath !== "string") return "";
    return imagePath.startsWith("http") ? imagePath : `${IMAGE_BASE_URL}${imagePath}`;
  };

  const isSouthAfrica =
    country.trim().toLowerCase() === "south africa" ||
    country.trim().toLowerCase() === "za";

  // Load items and pre-fill user profile info
  useEffect(() => {
    const initializeCheckout = async () => {
      try {
        setLoading(true);

        // Pre-fill user data if logged in
        const userInfoRaw = await AsyncStorage.getItem("userInfo");
        if (userInfoRaw) {
          const user = JSON.parse(userInfoRaw);
          if (user.name) setFullName(user.name);
          if (user.email) setEmail(user.email);
          if (user.phone) {
            // Keep only digits for phone number
            setPhone(String(user.phone).replace(/[^0-9]/g, ""));
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

  // Fetch PostNet branches when PostNet is selected or city changes
  useEffect(() => {
    if (isSouthAfrica && city) {
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
    const cleanCity = (searchCity || "Sandton").trim();
    const lowerCity = cleanCity.toLowerCase();

    // 1. Instantly populate curated fallback branches so locations are NEVER hidden
    let initialStores = FALLBACK_POSTNET_STORES[lowerCity] || [];
    if (initialStores.length === 0) {
      const matchKey = Object.keys(FALLBACK_POSTNET_STORES).find(
        (k) => lowerCity.includes(k) || k.includes(lowerCity)
      );
      if (matchKey) initialStores = FALLBACK_POSTNET_STORES[matchKey];
      else initialStores = FALLBACK_POSTNET_STORES["sandton"];
    }

    setPostnetStores(initialStores);
    if (!preferredPostnetStore && initialStores.length > 0) {
      setPreferredPostnetStore(initialStores[0]);
    }

    // 2. Query official PostNet store locator network API
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
          if (!preferredPostnetStore) {
            setPreferredPostnetStore(formatted[0]);
          }
        }
      }
    } catch (err) {
      console.log("PostNet live locator fetch error, kept local stores:", err.message);
    } finally {
      setIsLoadingPostnet(false);
    }
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

    // Look up various postal codes for this selected city
    const lowerCity = cityName.toLowerCase();
    const mappedCodes = CITY_POSTAL_CODES_MAP[lowerCity];

    if (mappedCodes && mappedCodes.length > 0) {
      setCurrentCityPostalCodes(mappedCodes);
      setPostalCode(mappedCodes[0].code);
      showMessage(`🏙️ ${cityName} selected — ${mappedCodes.length} postal codes available`);
    } else {
      fetchDynamicPostalCodesForCity(cityName);
    }

    // Immediately reload PostNet branches for the new city
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

      const res = await fetch(`${API_BASE}/checkout/quote`, {
        method: "POST",
        headers,
        body: JSON.stringify(quotePayload),
      });

      const data = await res.json();

      if (data && data.shipments && data.shipments.length > 0) {
        setQuote(data);
        const shipment = data.shipments[0];
        const quotesList = shipment.shippingQuotes || [];

        // Auto-select preferred courier
        if (deliveryPreference === "postnet") {
          const pn = quotesList.find((q) => q.courierName === "PostNet");
          setSelectedCourier(pn || quotesList[0]);
        } else if (effectiveCountry.toLowerCase() === "south africa") {
          const cg = quotesList.find((q) => q.courierName === "Courier Guy");
          setSelectedCourier(cg || quotesList[0]);
        } else {
          // International -> DHL Express
          const dhl = quotesList.find((q) => q.courierName.includes("DHL"));
          setSelectedCourier(dhl || quotesList[0]);
        }

        showMessage("✅ Live courier rates calculated!");
      } else {
        console.log("Quote response:", data);
      }
    } catch (err) {
      console.log("Delivery quote error:", err);
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

  // Dynamic shipping fee based on live calculated quote or standard fallback
  let shippingFee = 0;
  if (selectedCourier) {
    shippingFee = Number(selectedCourier.cost) || 0;
  } else if (deliveryPreference === "postnet") {
    shippingFee = 250;
  } else if (isSouthAfrica) {
    shippingFee = subtotal >= 1000 || subtotal === 0 ? 0 : 150;
  } else {
    // International DHL Express flat rate
    shippingFee = 1800;
  }

  // DHL Landed Cost Estimates for international orders (from backend quote or mock formula)
  const dhlLandedCost =
    !isSouthAfrica && quote?.shipments?.[0]?.landedCostEstimates
      ? quote.shipments[0].landedCostEstimates
      : !isSouthAfrica
      ? {
          estimatedDuties: parseFloat((subtotal * 0.15).toFixed(2)),
          estimatedTaxes: parseFloat((subtotal * 0.2).toFixed(2)),
          customsFees: 250,
          totalImportCharges: parseFloat((subtotal * 0.35 + 250).toFixed(2)),
        }
      : null;

  const grandTotal = Math.max(0, subtotal - discount + shippingFee);

  // Submit Order & Launch PayFast Sandbox or EFT Instructions
  const handlePlaceOrder = async () => {
    if (!fullName.trim()) {
      showMessage("Please enter recipient full name");
      return;
    }
    if (!phone.trim()) {
      showMessage("Please enter a phone number for courier tracking");
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

    try {
      setIsSubmitting(true);

      const token = await AsyncStorage.getItem("userToken");
      const generatedOrderId = `GS-${Date.now().toString().slice(-6).toUpperCase()}`;

      const finalShippingAddress = {
        address:
          deliveryPreference === "postnet" && preferredPostnetStore
            ? preferredPostnetStore.address
            : address.trim(),
        city: city.trim() || "Johannesburg",
        postalCode: postalCode.trim() || "2000",
        country: isSouthAfrica ? "South Africa" : country.trim(),
      };

      let finalOrderId = generatedOrderId;
      let payfastLaunched = false;

      // Submit order to backend /api/orders
      if (token) {
        try {
          let finalQuote = quote;
          if (!finalQuote) {
            const quoteRes = await fetch(`${API_BASE}/checkout/quote`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                cartItems: checkoutItems.map((item) => ({
                  product: item.productid || item.id,
                  name: item.name,
                  quantity: item.quantity,
                  price: item.price,
                })),
                shippingAddress: finalShippingAddress,
                deliveryPreference,
              }),
            });
            finalQuote = await quoteRes.json();
          }

          if (finalQuote && finalQuote.shipments) {
            if (selectedCourier) {
              finalQuote.shipments[0].selectedCourier = selectedCourier;
            }
            if (preferredPostnetStore) {
              finalQuote.shipments[0].selectedPickupStore = preferredPostnetStore;
            }

            const orderPayload = {
              quote: finalQuote,
              shippingAddress: finalShippingAddress,
              deliveryPreference,
              paymentMethod: paymentMethod === "payfast" ? "PayFast" : "Bank Transfer",
            };

            const orderRes = await fetch(`${API_BASE}/orders`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(orderPayload),
            });

            const orderData = await orderRes.json();
            if (orderData && (orderData._id || orderData.orderId)) {
              finalOrderId = orderData.orderId || orderData._id;
            }
          }

          // If PayFast selected, generate sandbox payment URL and launch
          if (paymentMethod === "payfast" && finalOrderId) {
            try {
              const pfRes = await fetch(`${API_BASE}/payfast/generate-shop`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ orderId: finalOrderId }),
              });
              const pfData = await pfRes.json();

              if (pfData && pfData.url && pfData.data) {
                const queryStr = Object.entries(pfData.data)
                  .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
                  .join("&");
                const fullUrl = `${pfData.url}?${queryStr}`;

                Linking.openURL(fullUrl).catch((err) => {
                  console.log("Could not open PayFast URL:", err);
                });
                payfastLaunched = true;
              }
            } catch (pfErr) {
              console.log("PayFast sandbox generation error:", pfErr);
            }
          }
        } catch (apiErr) {
          console.log("Backend API order submission skipped:", apiErr.message);
        }
      }

      // Clear local cart if not buy now
      if (!singleItemCheckout) {
        await AsyncStorage.setItem("grand-store-cart", JSON.stringify([]));
        DeviceEventEmitter.emit("cartUpdated", 0);
      }

      setCreatedOrder({
        orderId: finalOrderId,
        date: new Date().toLocaleDateString("en-ZA", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
        subtotal,
        shippingFee,
        discount,
        grandTotal,
        paymentMethod:
          paymentMethod === "payfast"
            ? "PayFast Sandbox (Instant Cards / EFT)"
            : "Manual Bank Transfer (Standard Bank)",
        courierName: selectedCourier ? `${selectedCourier.courierName} (${selectedCourier.serviceLevel})` : (deliveryPreference === "postnet" ? "PostNet" : "Courier Guy"),
        pickupStore: preferredPostnetStore,
        bankDetails: {
          bankName: "Standard Bank",
          accountName: "The Grand Store PTY LTD",
          accountNumber: "0123456789",
          branchCode: "051001",
          reference: finalOrderId.slice(-8).toUpperCase(),
        },
        recipient: {
          fullName,
          phone,
          email,
          address:
            deliveryPreference === "postnet" && preferredPostnetStore
              ? `Pickup: ${preferredPostnetStore.name} — ${preferredPostnetStore.address}`
              : `${finalShippingAddress.address}, ${finalShippingAddress.city}, ${finalShippingAddress.postalCode}, ${finalShippingAddress.country}`,
        },
        payfastLaunched,
      });

      setOrderCompleted(true);
      showMessage("🎉 Order placed successfully!");
    } catch (err) {
      showMessage("Order placement encountered an issue. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render Success / Bank Transfer / PayFast Screen
  if (orderCompleted && createdOrder) {
    const isBank = paymentMethod === "bank_transfer";

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
          <View style={styles.successHeader}>
            <View style={styles.checkCircle}>
              <Text style={styles.checkMark}>✓</Text>
            </View>
            <Text style={styles.successTitle}>Order Placed Successfully</Text>
            <Text style={styles.orderIdBadge}>
              Order Ref: <Text style={styles.orderIdText}>{createdOrder.orderId}</Text>
            </Text>
          </View>

          {isBank ? (
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
          ) : (
            <View style={styles.payfastSuccessCard}>
              <Text style={styles.payfastSuccessTitle}>💳 PayFast Sandbox Gateway</Text>
              <Text style={styles.payfastSuccessSub}>
                Your order has been recorded. If the PayFast sandbox window did not launch automatically, tap below to test payment.
              </Text>
              <TouchableOpacity
                style={styles.relaunchPayfastBtn}
                onPress={() => handlePlaceOrder()}
                activeOpacity={0.8}
              >
                <Text style={styles.relaunchPayfastText}>🔗 Open PayFast Sandbox Payment</Text>
              </TouchableOpacity>
              <View style={styles.emailNoticeBox}>
                <Text style={styles.emailNoticeText}>
                  ✉️ An order summary and receipt have been emailed to{" "}
                  <Text style={{ color: "#fff", fontWeight: "700" }}>{email}</Text>.
                </Text>
              </View>
            </View>
          )}

          <View style={styles.deliverySummaryCard}>
            <Text style={styles.sectionHeadingGold}>Delivery Information</Text>
            <Text style={styles.recipientName}>{createdOrder.recipient.fullName}</Text>
            <Text style={styles.recipientSub}>{createdOrder.recipient.phone}</Text>
            <Text style={styles.recipientSub}>{createdOrder.recipient.address}</Text>
            <Text style={[styles.recipientSub, { color: "#f5c242", marginTop: 4 }]}>
              Courier: {createdOrder.courierName}
            </Text>
          </View>

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
              <Text style={styles.doneBtnText}>Return to Grand Store</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
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
          {/* Delivery Method Selection (Matching Web Version) */}
          <View style={styles.sectionCard}>
            <View style={styles.stepHeader}>
              <View style={styles.stepNumberCircle}>
                <Text style={styles.stepNumber}>📦</Text>
              </View>
              <Text style={styles.stepTitle}>Delivery Method</Text>
            </View>

            <Text style={styles.subtleHelperText}>
              Choose how you want to receive your bottles before entering address details:
            </Text>

            <View style={styles.deliveryMethodsRow}>
              {/* Home Door Delivery (Local & Global) */}
              <TouchableOpacity
                style={[
                  styles.deliveryMethodCard,
                  deliveryPreference === "home" && styles.deliveryMethodCardActive,
                ]}
                onPress={() => setDeliveryPreference("home")}
                activeOpacity={0.8}
              >
                <Text style={styles.deliveryMethodIcon}>🏠</Text>
                <Text style={styles.deliveryMethodTitle}>Door Delivery</Text>
                <Text style={styles.deliveryMethodDesc}>
                  Courier Guy locally, or DHL Express worldwide
                </Text>
              </TouchableOpacity>

              {/* PostNet Pickup */}
              <TouchableOpacity
                style={[
                  styles.deliveryMethodCard,
                  deliveryPreference === "postnet" && styles.deliveryMethodCardActive,
                ]}
                onPress={() => {
                  setDeliveryPreference("postnet");
                  setCountry("South Africa");
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.deliveryMethodIcon}>📦</Text>
                <Text style={styles.deliveryMethodTitle}>PostNet</Text>
                <Text style={styles.deliveryMethodDesc}>
                  Branch pickup (South Africa only)
                </Text>
              </TouchableOpacity>

              {/* Compare All */}
              <TouchableOpacity
                style={[
                  styles.deliveryMethodCard,
                  deliveryPreference === "best" && styles.deliveryMethodCardActive,
                ]}
                onPress={() => setDeliveryPreference("best")}
                activeOpacity={0.8}
              >
                <Text style={styles.deliveryMethodIcon}>⚡</Text>
                <Text style={styles.deliveryMethodTitle}>Compare All</Text>
                <Text style={styles.deliveryMethodDesc}>
                  See all Courier Guy, PostNet & DHL rates
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Step 1: Delivery Address & Google Places Autocomplete */}
          <View style={styles.sectionCard}>
            <View style={styles.stepHeader}>
              <View style={styles.stepNumberCircle}>
                <Text style={styles.stepNumber}>1</Text>
              </View>
              <Text style={styles.stepTitle}>Recipient & Delivery Address</Text>
            </View>

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

            <View style={styles.rowInputs}>
              {/* Phone Number Input (Only Numbers As Key) */}
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>PHONE NUMBER (DIGITS ONLY) *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 0821234567"
                  placeholderTextColor="#666"
                  keyboardType="number-pad"
                  value={phone}
                  onChangeText={(text) => {
                    const numbersOnly = text.replace(/[^0-9]/g, "");
                    setPhone(numbersOnly);
                  }}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
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

            {/* Street Address or PostNet Banner */}
            {deliveryPreference !== "postnet" ? (
              <View style={styles.inputGroup}>
                <View style={styles.labelRowWithIcon}>
                  <Text style={styles.inputLabel}>
                    STREET ADDRESS (LOCAL & WORLDWIDE AUTOCOMPLETE) *
                  </Text>
                  {isSearchingAddress && (
                    <ActivityIndicator size="small" color="#c99742" style={{ marginLeft: 6 }} />
                  )}
                </View>

                <TextInput
                  style={styles.textInput}
                  placeholder="Start typing street address, house, or building (any country)..."
                  placeholderTextColor="#666"
                  value={address}
                  onChangeText={handleAddressChange}
                />

                {/* Street Address Dropdown */}
                {showAddressDropdown && addressPredictions.length > 0 && (
                  <View style={styles.predictionsDropdown}>
                    <View style={styles.predictionsHeader}>
                      <Text style={styles.predictionsHeaderText}>SUGGESTED ADDRESSES</Text>
                      <Text style={styles.googlePoweredText}>Powered by Google Maps</Text>
                    </View>
                    {addressPredictions.map((p, idx) => (
                      <TouchableOpacity
                        key={p.place_id || idx}
                        style={[
                          styles.predictionItem,
                          idx === addressPredictions.length - 1 && { borderBottomWidth: 0 },
                        ]}
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
            ) : (
              <View style={styles.postnetNoticeBox}>
                <Text style={styles.postnetNoticeIcon}>📦</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.postnetNoticeTitle}>
                    {preferredPostnetStore
                      ? `Pickup: ${preferredPostnetStore.name}`
                      : "PostNet Counter Pickup"}
                  </Text>
                  <Text style={styles.postnetNoticeDesc}>
                    {preferredPostnetStore
                      ? `${preferredPostnetStore.address} (Tel: ${preferredPostnetStore.telephone || "N/A"})`
                      : "No street address needed. Select your nearby PostNet branch from the list below."}
                  </Text>
                </View>
              </View>
            )}

            {/* City & Postal Code Inputs */}
            <View style={styles.rowInputs}>
              {/* City Input with Autocomplete Dropdown */}
              <View style={[styles.inputGroup, { flex: 1.2, marginRight: 8 }]}>
                <View style={styles.labelRowWithIcon}>
                  <Text style={styles.inputLabel}>CITY (DROPDOWN) *</Text>
                  {isSearchingCity && (
                    <ActivityIndicator size="small" color="#c99742" style={{ marginLeft: 4 }} />
                  )}
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Cape Town, London, Dubai"
                  placeholderTextColor="#666"
                  value={city}
                  onFocus={() => {
                    if (cityPredictions.length === 0) setCityPredictions(DEFAULT_SA_CITIES);
                    setShowCityDropdown(true);
                  }}
                  onChangeText={handleCityInputChange}
                />

                {/* City Autocomplete Dropdown */}
                {showCityDropdown && (
                  <View style={styles.predictionsDropdown}>
                    <View style={styles.predictionsHeader}>
                      <Text style={styles.predictionsHeaderText}>SUGGESTED CITIES</Text>
                      <TouchableOpacity onPress={() => setShowCityDropdown(false)}>
                        <Text style={{ color: "#aaa", fontSize: 11 }}>✕ Close</Text>
                      </TouchableOpacity>
                    </View>
                    {(cityPredictions.length > 0 ? cityPredictions : DEFAULT_SA_CITIES).map(
                      (p, idx) => {
                        const cityName =
                          p.structured_formatting?.main_text ||
                          p.main_text ||
                          p.description?.split(",")[0] ||
                          "";
                        const subName =
                          p.structured_formatting?.secondary_text ||
                          p.description ||
                          "";
                        return (
                          <TouchableOpacity
                            key={p.place_id || idx}
                            style={[
                              styles.predictionItem,
                              idx === cityPredictions.length - 1 && { borderBottomWidth: 0 },
                            ]}
                            onPress={() => handleSelectCity(p)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.predictionPinIcon}>🏙️</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.predictionMainText} numberOfLines={1}>
                                {cityName}
                              </Text>
                              {subName ? (
                                <Text style={styles.predictionSubText} numberOfLines={1}>
                                  {subName}
                                </Text>
                              ) : null}
                            </View>
                          </TouchableOpacity>
                        );
                      }
                    )}
                  </View>
                )}
              </View>

              {/* Postal Code Input with Dropdown */}
              <View style={[styles.inputGroup, { flex: 0.8 }]}>
                <View style={styles.labelRowWithIcon}>
                  <Text style={styles.inputLabel}>POSTAL CODE *</Text>
                  {isSearchingPostal && (
                    <ActivityIndicator size="small" color="#c99742" style={{ marginLeft: 4 }} />
                  )}
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 2196, SW1A 1AA"
                  placeholderTextColor="#666"
                  value={postalCode}
                  onChangeText={handlePostalCodeChange}
                />

                {/* Postal Code Dropdown */}
                {showPostalDropdown && postalPredictions.length > 0 && (
                  <View style={styles.predictionsDropdown}>
                    <View style={styles.predictionsHeader}>
                      <Text style={styles.predictionsHeaderText}>MATCHING POSTAL CODES</Text>
                      <Text style={styles.googlePoweredText}>Google Places</Text>
                    </View>
                    {postalPredictions.map((p, idx) => (
                      <TouchableOpacity
                        key={p.place_id || idx}
                        style={[
                          styles.predictionItem,
                          idx === postalPredictions.length - 1 && { borderBottomWidth: 0 },
                        ]}
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

            {/* Various Postal Codes for the Selected City */}
            {currentCityPostalCodes && currentCityPostalCodes.length > 0 && (
              <View style={styles.variousPostalCodesCard}>
                <View style={styles.variousPostalHeader}>
                  <Text style={styles.variousPostalTitle}>
                    📮 VARIOUS POSTAL CODES FOR {city.toUpperCase()}
                  </Text>
                  <Text style={styles.variousPostalSubtitle}>Tap to switch area</Text>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginTop: 6 }}
                >
                  {currentCityPostalCodes.map((item) => {
                    const isSelected = postalCode === item.code;
                    return (
                      <TouchableOpacity
                        key={item.code}
                        style={[
                          styles.cityPostalCodeChip,
                          isSelected && styles.cityPostalCodeChipActive,
                        ]}
                        onPress={() => {
                          setPostalCode(item.code);
                          setQuote(null);
                          showMessage(`📮 ${city} — ${item.code} (${item.area}) selected`);
                        }}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[
                            styles.cityPostalCodeNumber,
                            isSelected && styles.cityPostalCodeNumberActive,
                          ]}
                        >
                          {item.code}
                        </Text>
                        <Text
                          style={[
                            styles.cityPostalCodeArea,
                            isSelected && styles.cityPostalCodeAreaActive,
                          ]}
                          numberOfLines={1}
                        >
                          {item.area}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* AVAILABLE POSTNET PICKUP LOCATIONS (PROMINENT, GUARANTEED VISIBLE) */}
            {deliveryPreference === "postnet" && (
              <View style={styles.postnetStoresSection}>
                <View style={styles.postnetStoresHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.postnetStoresTitle}>
                      📍 AVAILABLE POSTNET BRANCHES ({city.toUpperCase()})
                    </Text>
                    <Text style={styles.postnetStoresSubtitle}>
                      Choose your preferred branch for safe counter collection
                    </Text>
                  </View>
                  {isLoadingPostnet && (
                    <ActivityIndicator size="small" color="#c99742" />
                  )}
                </View>

                {/* Filter / Search Branch */}
                <View style={styles.branchSearchBox}>
                  <Text style={{ fontSize: 13, marginRight: 6 }}>🔍</Text>
                  <TextInput
                    style={styles.branchSearchInput}
                    placeholder="Filter branch by mall, area or street..."
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

                {/* Selected PostNet Confirmation Banner */}
                {preferredPostnetStore && (
                  <View style={styles.selectedBranchBanner}>
                    <View style={styles.selectedBranchCheckCircle}>
                      <Text style={styles.selectedBranchCheckText}>✓</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.selectedBranchBannerTitle}>
                        {preferredPostnetStore.name} ({preferredPostnetStore.distance} km away)
                      </Text>
                      <Text style={styles.selectedBranchBannerAddress} numberOfLines={1}>
                        {preferredPostnetStore.address}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Branch Cards List */}
                {filteredPostnetStores.length > 0 ? (
                  filteredPostnetStores.map((store, idx) => {
                    const isSelected = preferredPostnetStore?.id === store.id;
                    return (
                      <TouchableOpacity
                        key={store.id || idx}
                        style={[
                          styles.postnetStoreCard,
                          isSelected && styles.postnetStoreCardSelected,
                        ]}
                        onPress={() => {
                          setPreferredPostnetStore(store);
                          if (store.postalCode) setPostalCode(store.postalCode);
                          showMessage(`📍 Selected ${store.name}`);
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={styles.radioCircle}>
                          {isSelected && <View style={styles.radioDot} />}
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <View style={styles.storeNameRow}>
                            <Text style={styles.storeName}>{store.name}</Text>
                            {store.distance !== null && store.distance !== undefined && (
                              <View style={styles.distanceBadge}>
                                <Text style={styles.distanceBadgeText}>
                                  {store.distance} km away
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.storeAddress}>{store.address}</Text>
                          {store.telephone ? (
                            <Text style={styles.storePhone}>📞 {store.telephone}</Text>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <View style={styles.emptyStoresBox}>
                    <Text style={styles.emptyStoresText}>
                      No PostNet branches matching "{branchSearch}". Try searching another area or clear the search.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Country Selector: Locked to South Africa for PostNet/PayFast, Selectable Worldwide for Door Delivery */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRowWithIcon}>
                <Text style={styles.inputLabel}>COUNTRY *</Text>
                {deliveryPreference === "postnet" || (paymentMethod === "payfast" && isSouthAfrica) ? (
                  <View style={styles.lockedBadge}>
                    <Text style={styles.lockedBadgeText}>
                      {deliveryPreference === "postnet" ? "🔒 South Africa Only (PostNet)" : "🔒 South Africa (PayFast ZAR)"}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.editableNoticeText}>✏️ Worldwide Delivery Supported</Text>
                )}
              </View>

              {deliveryPreference === "postnet" ? (
                <View style={styles.lockedCountryBox}>
                  <Text style={styles.lockedCountryFlag}>🇿🇦</Text>
                  <Text style={styles.lockedCountryText}>South Africa</Text>
                  <View style={styles.zaTag}>
                    <Text style={styles.zaTagText}>PostNet Branch</Text>
                  </View>
                </View>
              ) : (
                <>
                  <TextInput
                    style={[styles.textInput, { color: "#f5c242", fontWeight: "700" }]}
                    value={country}
                    placeholder="e.g. South Africa, United Kingdom, United States"
                    placeholderTextColor="#666"
                    onChangeText={(t) => {
                      setCountry(t);
                      setQuote(null);
                      const isSA = t.trim().toLowerCase() === "south africa" || t.trim().toLowerCase() === "za";
                      if (!isSA && paymentMethod === "payfast") {
                        setPaymentMethod("bank_transfer");
                        showMessage("🌍 Switched to Bank Transfer (EFT) & DHL Express for international shipping");
                      }
                    }}
                  />

                  {/* Quick Select Country Pills for Door Delivery */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.countryChipsScroll}
                  >
                    {[
                      { name: "South Africa", flag: "🇿🇦" },
                      { name: "United Kingdom", flag: "🇬🇧" },
                      { name: "United States", flag: "🇺🇸" },
                      { name: "United Arab Emirates", flag: "🇦🇪" },
                      { name: "Namibia", flag: "🇳🇦" },
                      { name: "Australia", flag: "🇦🇺" },
                      { name: "Germany", flag: "🇩🇪" },
                      { name: "France", flag: "🇫🇷" },
                    ].map((c) => (
                      <TouchableOpacity
                        key={c.name}
                        style={[
                          styles.countryChip,
                          country.toLowerCase() === c.name.toLowerCase() && styles.countryChipActive,
                        ]}
                        onPress={() => {
                          setCountry(c.name);
                          setQuote(null);
                          if (c.name !== "South Africa" && paymentMethod === "payfast") {
                            setPaymentMethod("bank_transfer");
                            showMessage(`🌍 Selected ${c.name} — Switched to Bank Transfer & DHL Express`);
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.countryChipFlag}>{c.flag}</Text>
                        <Text
                          style={[
                            styles.countryChipText,
                            country.toLowerCase() === c.name.toLowerCase() &&
                              styles.countryChipTextActive,
                          ]}
                        >
                          {c.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}
            </View>

            {/* Calculate Delivery Rates Action Button */}
            <TouchableOpacity
              style={styles.calcRatesBtn}
              onPress={calculateDeliveryQuote}
              disabled={isCalculatingQuote}
              activeOpacity={0.8}
            >
              {isCalculatingQuote ? (
                <View style={styles.calcBtnContent}>
                  <ActivityIndicator size="small" color="#0a0a0a" style={{ marginRight: 8 }} />
                  <Text style={styles.calcRatesBtnText}>Calculating Courier Rates...</Text>
                </View>
              ) : (
                <View style={styles.calcBtnContent}>
                  <Text style={styles.calcRatesBtnIcon}>🚚</Text>
                  <Text style={styles.calcRatesBtnText}>Calculate Live Courier Rates</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Courier Selection & Live Rates */}
            {quote && quote.shipments && quote.shipments.length > 0 && (
              <View style={styles.courierRatesContainer}>
                <Text style={styles.courierSectionTitle}>
                  AVAILABLE COURIER SERVICES ({isSouthAfrica ? "SOUTH AFRICA" : "INTERNATIONAL"})
                </Text>

                {quote.shipments[0].shippingQuotes?.map((opt, idx) => {
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
            )}

            {/* DHL International Express Landed Cost Breakdown */}
            {!isSouthAfrica && dhlLandedCost && (
              <View style={styles.dhlLandedCostCard}>
                <View style={styles.dhlHeaderRow}>
                  <Text style={styles.dhlTitle}>✈️ DHL EXPRESS INTERNATIONAL LANDED COST</Text>
                  <View style={styles.dhlBadge}>
                    <Text style={styles.dhlBadgeText}>DHL PRIORITY</Text>
                  </View>
                </View>

                <View style={styles.dhlRow}>
                  <Text style={styles.dhlLabel}>DHL International Express Courier</Text>
                  <Text style={styles.dhlVal}>R{shippingFee.toFixed(2)}</Text>
                </View>
                <View style={styles.dhlRow}>
                  <Text style={styles.dhlLabel}>Estimated Import Duties (15%)</Text>
                  <Text style={styles.dhlVal}>R{dhlLandedCost.estimatedDuties?.toFixed(2) || "0.00"}</Text>
                </View>
                <View style={styles.dhlRow}>
                  <Text style={styles.dhlLabel}>Destination Import VAT / Taxes (20%)</Text>
                  <Text style={styles.dhlVal}>R{dhlLandedCost.estimatedTaxes?.toFixed(2) || "0.00"}</Text>
                </View>
                <View style={styles.dhlRow}>
                  <Text style={styles.dhlLabel}>Customs Clearance & Handling Fee</Text>
                  <Text style={styles.dhlVal}>R{dhlLandedCost.customsFees?.toFixed(2) || "250.00"}</Text>
                </View>
                <View style={styles.dhlNoticeBox}>
                  <Text style={styles.dhlNoticeText}>
                    ℹ️ Standard cross-border DHL DAP terms. International customs duties and local taxes may be collected by DHL upon arrival.
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Step 2: Bottle Reserve Summary */}
          <View style={styles.sectionCard}>
            <View style={styles.stepHeader}>
              <View style={styles.stepNumberCircle}>
                <Text style={styles.stepNumber}>2</Text>
              </View>
              <Text style={styles.stepTitle}>Bottle Reserve ({checkoutItems.length})</Text>
            </View>

            {checkoutItems.map((item, idx) => (
              <View key={idx} style={styles.itemRow}>
                <Image
                  source={{ uri: getImageUrl(item.image) }}
                  style={styles.itemThumb}
                  resizeMode="contain"
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={styles.itemQty}>
                    {item.size || "750ml"} • Qty: {item.quantity}
                  </Text>
                  <Text style={styles.itemPrice}>R{(item.price * item.quantity).toFixed(2)}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Step 3: Payment Method Selection */}
          <View style={styles.sectionCard}>
            <View style={styles.stepHeader}>
              <View style={styles.stepNumberCircle}>
                <Text style={styles.stepNumber}>3</Text>
              </View>
              <Text style={styles.stepTitle}>Payment Method</Text>
            </View>

            {/* Option A: PayFast (Instant Cards & Instant EFT - South Africa) */}
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
                  Visa, Mastercard, Debit, and Instant EFT. Operates via PayFast Sandbox for immediate order dispatch.
                </Text>
                <View style={styles.payfastBadgeBox}>
                  <Text style={styles.payfastBadgeText}>🔒 Powered by PayFast Sandbox</Text>
                </View>
              </View>
            </TouchableOpacity>

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
                  Transfer directly to our Standard Bank account. Details & Reference displayed upon order. Supports local & international banking.
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Step 4: Final Financial Breakdown */}
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

            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                {selectedCourier
                  ? `${selectedCourier.courierName} (${selectedCourier.serviceLevel})`
                  : deliveryPreference === "postnet"
                  ? "PostNet Pickup Delivery"
                  : isSouthAfrica
                  ? "Courier Guy Door Delivery"
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

          {/* Submit Action */}
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
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0c0a08" },
  loadingCenter: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { padding: 14, paddingBottom: 60 },

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

  // Various Postal Codes for City Card
  variousPostalCodesCard: {
    backgroundColor: "rgba(201, 151, 66, 0.06)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.25)",
    padding: 10,
    marginBottom: 12,
  },
  variousPostalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  variousPostalTitle: {
    color: "#f5c242",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  variousPostalSubtitle: {
    color: "#888",
    fontSize: 9,
  },
  cityPostalCodeChip: {
    backgroundColor: "#110e0c",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    alignItems: "center",
    minWidth: 90,
  },
  cityPostalCodeChipActive: {
    borderColor: "#c99742",
    backgroundColor: "rgba(201, 151, 66, 0.22)",
  },
  cityPostalCodeNumber: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  cityPostalCodeNumberActive: {
    color: "#f5c242",
  },
  cityPostalCodeArea: {
    color: "#777",
    fontSize: 9,
    marginTop: 2,
    textAlign: "center",
    maxWidth: 110,
  },
  cityPostalCodeAreaActive: {
    color: "#ddd",
    fontWeight: "600",
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
  countryChipsScroll: {
    marginTop: 8,
  },
  countryChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#110e0c",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
  },
  countryChipActive: {
    borderColor: "#c99742",
    backgroundColor: "rgba(201, 151, 66, 0.18)",
  },
  countryChipFlag: {
    fontSize: 13,
    marginRight: 4,
  },
  countryChipText: {
    color: "#999",
    fontSize: 11,
    fontWeight: "700",
  },
  countryChipTextActive: {
    color: "#f5c242",
    fontWeight: "800",
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

  // DHL Landed Cost Breakdown Card
  dhlLandedCostCard: {
    marginTop: 14,
    backgroundColor: "#110e0c",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(201, 151, 66, 0.35)",
    padding: 14,
  },
  dhlHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
    paddingBottom: 8,
  },
  dhlTitle: {
    color: "#f5c242",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  dhlBadge: {
    backgroundColor: "#c99742",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  dhlBadgeText: {
    color: "#0a0a0a",
    fontSize: 9,
    fontWeight: "900",
  },
  dhlRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  dhlLabel: {
    color: "#aaa",
    fontSize: 12,
  },
  dhlVal: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  dhlNoticeBox: {
    marginTop: 8,
    backgroundColor: "rgba(201, 151, 66, 0.08)",
    borderRadius: 8,
    padding: 8,
  },
  dhlNoticeText: {
    color: "#d4af37",
    fontSize: 10,
    lineHeight: 14,
  },

  // Step 2 Item Row
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  itemThumb: {
    width: 48,
    height: 60,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  itemName: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  itemQty: {
    color: "#777",
    fontSize: 11,
    marginVertical: 2,
  },
  itemPrice: {
    color: "#f5c242",
    fontSize: 13,
    fontWeight: "800",
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
});

export default Checkout;
