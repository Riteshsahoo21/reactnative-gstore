const categoryImages = {
  Beer: require("../resources/assets/CATEGORIES_ICON/Beer.png"),
  Beers: require("../resources/assets/CATEGORIES_ICON/Beer.png"),
  Bitters: require("../resources/assets/CATEGORIES_ICON/Bitters.png"),
  Brandy: require("../resources/assets/CATEGORIES_ICON/Brandy.png"),
  Champagne: require("../resources/assets/CATEGORIES_ICON/Champagne.png"),
  Whisky: require("../resources/assets/CATEGORIES_ICON/Whisky.png"),
  Whiskey: require("../resources/assets/CATEGORIES_ICON/Whisky.png"),
  Ciders: require("../resources/assets/CATEGORIES_ICON/Ciders.png"),
  Cider: require("../resources/assets/CATEGORIES_ICON/Ciders.png"),
  Cigar: require("../resources/assets/CATEGORIES_ICON/Cigar.png"),
  Cigars: require("../resources/assets/CATEGORIES_ICON/Cigar.png"),
  Cognac: require("../resources/assets/CATEGORIES_ICON/Cognac.png"),
  Gin: require("../resources/assets/CATEGORIES_ICON/Gin.png"),
  Liqueur: require("../resources/assets/CATEGORIES_ICON/Liqueur.png"),
  Liqueurs: require("../resources/assets/CATEGORIES_ICON/Liqueur.png"),
  Mixer: require("../resources/assets/CATEGORIES_ICON/Mixer.png"),
  Mixers: require("../resources/assets/CATEGORIES_ICON/Mixer.png"),
  Rum: require("../resources/assets/CATEGORIES_ICON/Rum.png"),
  Tequila: require("../resources/assets/CATEGORIES_ICON/Tequila.png"),
  Vodka: require("../resources/assets/CATEGORIES_ICON/Vodka.png"),
  Wine: require("../resources/assets/CATEGORIES_ICON/Wine.png"),
  Wines: require("../resources/assets/CATEGORIES_ICON/Wine.png"),
};

export const getCategoryIcon = (name) => {
  if (!name || typeof name !== 'string') {
    return require("../resources/assets/CATEGORIES_ICON/Wine.png");
  }
  const cleanName = name.trim().toLowerCase();
  const matchKey = Object.keys(categoryImages).find(
    (key) => key.toLowerCase() === cleanName
  );
  return matchKey
    ? categoryImages[matchKey]
    : require("../resources/assets/CATEGORIES_ICON/Wine.png");
};

export default categoryImages;
