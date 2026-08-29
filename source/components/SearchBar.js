/* eslint-disable prettier/prettier */
import React from "react";
import { View, TextInput, Image, StyleSheet } from "react-native";
import Colors from "../resources/colors/Colors";

const SearchBar = ({ query, setQuery, placeholder = "Search anything..." }) => {
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
