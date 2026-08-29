/* eslint-disable quotes */
/* eslint-disable react-native/no-inline-styles */
/* eslint-disable prettier/prettier */
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
} from 'react-native';
import axios from 'axios';
import AppHeader from '../widgets/AppHeader';
import tmh_styles from '../styles/tmh_styles';
import SearchBar from './SearchBar';
import { API_BASE } from "../resources/data/Constants";

const API_URL = `${API_BASE}/categories`;

const Categories = ({navigation}) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Map category names to static images
  const categoryImages = {
    Beer: require("../resources/assets/CATEGORIES_ICON/Beer.png"),
    Bitters: require("../resources/assets/CATEGORIES_ICON/Bitters.png"),
    Brandy: require("../resources/assets/CATEGORIES_ICON/Brandy.png"),
    Champagne: require("../resources/assets/CATEGORIES_ICON/Champagne.png"),
    Whisky: require("../resources/assets/CATEGORIES_ICON/Whisky.png"),
    Ciders: require("../resources/assets/CATEGORIES_ICON/Ciders.png"),
    Cognac: require("../resources/assets/CATEGORIES_ICON/Cognac.png"),
    Gin: require("../resources/assets/CATEGORIES_ICON/Gin.png"),
    Liqueur: require("../resources/assets/CATEGORIES_ICON/Liqueur.png"),
    Mixer: require("../resources/assets/CATEGORIES_ICON/Mixer.png"),
    Rum: require("../resources/assets/CATEGORIES_ICON/Rum.png"),
    Tequila: require("../resources/assets/CATEGORIES_ICON/Tequila.png"),
    Vodka: require("../resources/assets/CATEGORIES_ICON/Vodka.png"),
    Wine: require("../resources/assets/CATEGORIES_ICON/Wine.png"),
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(API_URL);
      setCategories(response.data.data || []);
     // console.log(response.data.data);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#121212' }}>
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
      <SearchBar query={""} setQuery={() => {}} />

      {loading ? (
        <ActivityIndicator size="large" color="#c99742" style={{ marginTop: 50 }} />
      ) : (
        <View style={styles.grid}>
          {categories.map((item) => (
            <TouchableOpacity key={item.id} style={styles.card}
                    onPress={() => navigation.navigate("ViewAll", {  category_title: item.name, // just pass the name
      category_id: item.id, })}>
              <Image
                source={categoryImages[item.name] || require("../resources/assets/CATEGORIES_ICON/Beer.png")}
                style={styles.icon}
                resizeMode="contain"
              />
              <Text style={styles.title}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  card: {
    width: Dimensions.get('window').width / 2.4,
    backgroundColor: '#1e1e1e',
    margin: 8,
    borderRadius: 12,
    alignItems: 'center',
    padding: 16,
    elevation: 3,
  },
  icon: {
    width: 60,
    height: 60,
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
  },
});

export default Categories;
