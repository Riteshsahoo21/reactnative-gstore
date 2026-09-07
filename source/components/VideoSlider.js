/* eslint-disable quotes */
/* eslint-disable prettier/prettier */
/* eslint-disable react-native/no-inline-styles */
import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Dimensions,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Text,
} from "react-native";
import Video from "react-native-video";
import axios from "axios";
import { APP_FONT } from "../resources/data/Fonts";

const { width } = Dimensions.get("screen");
const VIDEO_HEIGHT = 200;
const hardcodedVideos = [
  { 
    id: '1', 
    url: 'https://res.cloudinary.com/oioqrgj0/video/upload/v1787829304/grand-store/hero-react-native/grand-store-hero-scrub.mp4',
    title: 'Not simply poured.',
    subtitle: 'Remembered.',
    buttonText: 'Explore the collection →'
  },
  { 
    id: '2', 
    url: 'https://res.cloudinary.com/oioqrgj0/video/upload/v1787829318/grand-store/hero-react-native/grand-store-hero-cellar-hd.mp4',
    title: 'Bid on the rarest.',
    subtitle: 'Live Auctions.',
    buttonText: 'Enter the auction house →'
  },
  { 
    id: '3', 
    url: 'https://res.cloudinary.com/oioqrgj0/video/upload/v1787829323/grand-store/hero-react-native/grand-store-hero-third.mp4',
    title: 'An evening of refinement.',
    subtitle: 'Exclusive Tastings.',
    buttonText: 'Book an event →'
  }
];

const VideoSlider = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef();

  const onViewRef = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  });

  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 50 });

  // Auto-scroll logic
  useEffect(() => {
    const timer = setInterval(() => {
      let nextIndex = currentIndex + 1;
      if (nextIndex >= hardcodedVideos.length) {
        nextIndex = 0;
      }
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    }, 8000); // 8 seconds per video

    return () => clearInterval(timer);
  }, [currentIndex]);

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={hardcodedVideos}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, index }) => (
          <Video
            source={{ uri: item.url }}
            style={styles.video}
            resizeMode="cover"
            paused={currentIndex !== index} // Play only current video
            repeat
          />
        )}
        onViewableItemsChanged={onViewRef.current}
        viewabilityConfig={viewConfigRef.current}
      />
      
      {/* Dark Overlay for Text Visibility */}
      <View style={styles.overlayShade} pointerEvents="none" />

      {/* Text Overlay */}
      <View style={styles.overlayContent} pointerEvents="none">
        <Text style={styles.titleText}>{hardcodedVideos[currentIndex]?.title || 'Not simply poured.'}</Text>
        <Text style={[styles.titleText, { fontStyle: 'italic', color: '#c99742' }]}>{hardcodedVideos[currentIndex]?.subtitle || 'Remembered.'}</Text>
        
        <View style={styles.buttonPlaceholder}>
          <Text style={styles.buttonText}>{hardcodedVideos[currentIndex]?.buttonText || 'Explore the collection →'}</Text>
        </View>
      </View>

      {/* Pagination dots */}
      <View style={styles.pagination}>
        {hardcodedVideos.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, { opacity: i === currentIndex ? 1 : 0.3 }]}
          />
        ))}
      </View>
    </View>
  );
};

export default VideoSlider;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    marginTop: 25,
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden'
  },
  video: {
    width: width - 30, // Accounting for HomeScreen padding (15 on each side)
    height: VIDEO_HEIGHT + 60,
  },
  overlayShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.42)', // Darken video for text contrast
  },
  overlayContent: {
    position: 'absolute',
    bottom: 18,
    left: 15,
    right: 15,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  titleText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
    fontFamily: APP_FONT,
    letterSpacing: 0.5,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    lineHeight: 26,
  },
  buttonPlaceholder: {
    marginTop: 8,
    backgroundColor: '#c99742',
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignSelf: 'center',
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 3,
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
    fontFamily: APP_FONT,
    fontSize: 12.5,
    textAlign: 'center',
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    position: "absolute",
    bottom: 4,
    width: '100%',
  },
  dot: {
    height: 6,
    width: 6,
    borderRadius: 3,
    backgroundColor: "#c99742",
    marginHorizontal: 3,
  },
});
