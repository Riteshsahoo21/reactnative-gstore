import React, { useState, useEffect } from 'react';
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import axios from 'axios';
import AppHeader from '../widgets/AppHeader';
import tmh_styles from '../styles/tmh_styles';
import SearchBar from './SearchBar';
import { API_BASE } from "../resources/data/Constants";
import { getCategoryIcon } from "../helpers/categoryIcons";

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

const Categories = ({ navigation }) => {
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchCategories = async () => {
    try {
      const candidates = [
        `${API_BASE}/categories`,
        'http://localhost:5000/api/categories',
        'http://192.168.1.9:5000/api/categories',
        'http://10.0.2.2:5000/api/categories',
      ];
      const uniqueCandidates = [...new Set(candidates)];
      let response = null;

      for (const url of uniqueCandidates) {
        try {
          response = await axios.get(url, { timeout: 3000 });
          if (response?.data) break;
        } catch (e) {
          // try next
        }
      }

      if (response && response.data) {
        const list = Array.isArray(response.data.data)
          ? response.data.data
          : Array.isArray(response.data)
            ? response.data
            : [];
        setCategories(list);
      }
    } catch (err) {
      console.error("Failed to fetch categories from web backend:", err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const filteredCategories = categories.filter((cat) => {
    if (!searchQuery.trim()) return true;
    return cat.name && cat.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
  });

  return (
    <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
      <AppHeader
        title={"Categories"}
        isGradient={false}
        backgroundColor="#c99742"
        titleStyle={tmh_styles.header_title_tmb}
        isShowShadow={true}
        isBack={true}
        backButtonStyle={{ width: 35, height: 25, alignItems: "center" }}
        backIconColor="black"
        logoImage={null}
        navigation={navigation}
        onBack={() => navigation.navigate("Home")}
      />
      <SearchBar query={searchQuery} setQuery={setSearchQuery} placeholder="Search categories..." />

      {loading ? (
        <ActivityIndicator size="large" color="#c99742" style={{ marginTop: 50 }} />
      ) : (
        <View style={styles.grid}>
          {filteredCategories.map((item, index) => (
            <TouchableOpacity
              key={item.id || item._id || index}
              activeOpacity={0.78}
              style={styles.cardWrapper}
              onPress={() =>
                navigation.navigate("ViewAll", {
                  category_title: item.name,
                  category_id: item.id || item._id,
                })
              }
            >
              <LinearGradient
                colors={['#241f17', '#15120d', '#0d0b09']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.card}
              >
                {/* Glowing pedestal for bottle icon */}
                <LinearGradient
                  colors={['#3d3120', '#201911', '#14100b']}
                  start={{ x: 0.2, y: 0 }}
                  end={{ x: 0.8, y: 1 }}
                  style={styles.pedestal}
                >
                  <Image
                    source={getCategoryIcon(item.name)}
                    style={styles.icon}
                    resizeMode="contain"
                  />
                </LinearGradient>

                {/* Category Title */}
                <Text style={styles.title} numberOfLines={1}>
                  {item.name}
                </Text>

                {/* Subtitle / Explore Pill */}
                <View style={styles.pillContainer}>
                  <Text style={styles.pillText}>
                    {item.subcategories && item.subcategories.length > 0
                      ? `${item.subcategories.length} Styles`
                      : 'Explore'}
                  </Text>
                  <Text style={styles.pillArrow}>→</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const cardWidth = (Dimensions.get('window').width - 40) / 2;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0c0a08',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    paddingBottom: 40,
  },
  cardWrapper: {
    width: cardWidth,
    marginBottom: 16,
    borderRadius: 18,
    shadowColor: '#c99742',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  card: {
    borderRadius: 18,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderWidth: 1.2,
    borderColor: 'rgba(201, 151, 66, 0.35)',
  },
  pedestal: {
    width: 82,
    height: 82,
    borderRadius: 41,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(201, 151, 66, 0.65)',
    shadowColor: '#f5c242',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
    marginBottom: 14,
  },
  icon: {
    width: 54,
    height: 54,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8f4ec',
    textAlign: 'center',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(201, 151, 66, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 0.8,
    borderColor: 'rgba(201, 151, 66, 0.4)',
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#d4af37',
    letterSpacing: 0.4,
    marginRight: 4,
  },
  pillArrow: {
    fontSize: 11,
    fontWeight: '700',
    color: '#d4af37',
  },
});

export default Categories;
