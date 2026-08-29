/* eslint-disable no-trailing-spaces */
/* eslint-disable prettier/prettier */
/* eslint-disable quotes */
import React, { useState } from "react";
import { View, FlatList, TouchableOpacity, Text, StyleSheet, Image, Dimensions } from "react-native";
import SearchBar from "./SearchBar";
import Colors from "../resources/colors/Colors";
import AppHeader from '../widgets/AppHeader';
import tmh_styles from "../styles/tmh_styles";
import { BLOCK_HEIGHT_THRESHOLD, HEADER_HEIGHT_THRESHOLD } from "../resources/data/Constants";
import Home from "./Home";

const Search = ({ navigation }) => {
   const windowDimensions = Dimensions.get('window');
    const screenDimensions = Dimensions.get('screen');
  
    const [dimensions, setDimensions] = useState({
      window: windowDimensions,
      screen: screenDimensions,
    });
  const [rightButtons, setRightButtons] = useState([]);
    const [headerHeight, setHeaderHeight] = useState(
      (HEADER_HEIGHT_THRESHOLD * dimensions.screen.height) / 100,
    );
  
    const [blockHeight, setBlockHeight] = useState(
      (BLOCK_HEIGHT_THRESHOLD * dimensions.screen.height) / 100,
    );
  const [query, setQuery] = useState("");
  const [filteredData, setFilteredData] = useState([]);
  const [showPopup, setShowPopup] = useState(false);

  const allData = [
    { id: "1", title: "Home Screen" },
    { id: "2", title: "Profile Settings" },
    { id: "3", title: "Order Details" },
    { id: "4", title: "Products List" },
    { id: "5", title: "Special Offers" },
    { id: "6", title: "Cart Page" },
  ];

  const handleSearch = (text) => {
    setQuery(text);
    if (text.length > 0) {
      const results = allData.filter((item) =>
        item.title.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredData(results);
      setShowPopup(results.length === 0);
    } else {
      setFilteredData([]);
      setShowPopup(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0d0d0d" }}>
     <AppHeader title={"Search"} 
        isGradient={false} 
        backgroundColor={"#c99742"} 
        rightButtons={rightButtons}
        height={headerHeight} 
        titleStyle={tmh_styles.header_title_tmb} 
        isShowShadow={false} 
        navigation={navigation} 
        isBack={true}
        backButtonStyle={{ width: 35, height: 25, alignItems: "center" }} backIconColor={"black"} logoImage={null}
        onBackPress={() => navigation.navigate("Home")} />
      <SearchBar query={query} setQuery={handleSearch} />

      {filteredData.length > 0 && (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.resultItem}>
              <Text style={styles.resultText}>{item.title}</Text>
            </TouchableOpacity>
          )}
          ListFooterComponent={<View style={{ height: 80 }} />}
        />
      )}

      {showPopup && (
        <View style={styles.popupContainer}>
          <Image
            style={styles.popupIcon}
            source={require("../resources/assets/data.png")}
          />
          <Text style={styles.popupTitle}>Data Not Found</Text>
          <Text style={styles.popupMessage}>
            Sorry, the data you're seeking is currently unavailable.
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate(Home)} style={styles.popupButton}>
            <Text style={styles.popupButtonText}>Go to Homepage</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  resultItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.input_border1_color },
  resultText: { fontSize: 16, color: "#fff" },
  popupContainer: {
    backgroundColor: "#c99742",
    borderRadius: 25,
    padding: 20,
    margin: 40,
    alignItems: "center",
  },
  popupIcon: { width: 55, height: 55, marginBottom: 10, resizeMode: "contain" },
  popupTitle: { fontSize: 22, fontWeight: "bold", color: "#000", marginBottom: 8 },
  popupMessage: { fontSize: 19, color: "#333", textAlign: "center", marginBottom: 16 },
  popupButton: { backgroundColor: "#000", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 21 },
  popupButtonText: { color: "#fff", fontSize: 17 },
});

export default Search;
