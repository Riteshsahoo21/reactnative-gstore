import React from "react";
import { View, TextInput, Image, StyleSheet, TouchableOpacity, Text } from "react-native";
import Colors from "../resources/colors/Colors";
import SearchAutoRecommend from "./SearchAutoRecommend";

const SearchBar = ({
  query,
  setQuery,
  placeholder = "Search anything...",
  products,
  navigation,
  categories,
  onSelectProduct,
  onSearchSubmit,
}) => {
  if (products && products.length > 0) {
    return (
      <SearchAutoRecommend
        query={query}
        setQuery={setQuery}
        placeholder={placeholder}
        products={products}
        navigation={navigation}
        categories={categories}
        onSelectProduct={onSelectProduct}
        onSearchSubmit={onSearchSubmit}
      />
    );
  }

  return (
    <View style={styles.searchContainer}>
      <Image
        source={require("../resources/assets/discover.png")}
        style={styles.icon}
      />
      <TextInput
        style={styles.searchInput}
        placeholder={placeholder}
        placeholderTextColor={Colors.input_border1_color}
        value={query}
        onChangeText={setQuery}
      />
      {query && query.length > 0 && (
        <TouchableOpacity onPress={() => setQuery("")} style={{ paddingHorizontal: 6 }}>
          <Text style={{ color: "#777777", fontSize: 16 }}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1c1c1c",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    width: "95%",
    alignSelf: "center",
    marginVertical: 15,
    borderColor: "#c99742",
    borderWidth: 1,
  },
  icon: {
    width: 17,
    height: 17,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#d7d7d7ff",
  },
});

export default SearchBar;
