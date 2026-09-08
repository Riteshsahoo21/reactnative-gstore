/* eslint-disable prettier/prettier */
/* eslint-disable quotes */
import React from "react";
import { Image, Platform, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

const logo = require("../../resources/assets/auction-grandstore-logo.png");
const serif = Platform.select({ ios: "Georgia", android: "serif" });

export default function AuctionAcquisitionCertificate({ lot, user }) {
  return (
    <View style={styles.document}>
      <View style={styles.topCorner} pointerEvents="none" />
      <View style={styles.bottomCorner} pointerEvents="none" />
      <View style={styles.watermark} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Image source={logo} style={styles.watermarkLogo} resizeMode="contain" />
        <Text style={styles.watermarkText}>THE GRAND STORE</Text>
      </View>

      <View style={styles.content}>
        <Image source={logo} style={styles.logo} resizeMode="contain" accessibilityLabel="The Grand Store — Crafting Moments, Raising Spirits" />
        <View style={styles.eyebrowRow}>
          <View style={styles.rule} />
          <Text style={styles.eyebrow}>THE AUCTION COLLECTION</Text>
          <View style={styles.rule} />
        </View>

        <View style={styles.heading}>
          <Text style={styles.title}>Certificate</Text>
          <Text style={styles.subtitle}>OF ACQUISITION</Text>
        </View>

        <Text style={[styles.label, styles.center]}>PROUDLY PRESENTED TO</Text>
        <Text style={styles.winner}>
          {user?.name || (typeof lot.winner === "object" ? lot.winner?.name : lot.winner) || "Distinguished Patron"}
        </Text>
        <View style={styles.winnerRule} />

        <View style={styles.proclamation}>
          <Text style={styles.proclamationText}>In recognition of your successful bid and acquisition in The Grand Store Auction.</Text>
          <Text style={styles.proclamationText}>Your passion for exceptional spirits and rare collections is truly appreciated.</Text>
        </View>

        <View style={styles.record}>
          <Text style={styles.label}>CATALOGUE LOT #{lot.lotNumber || lot._id.slice(-6).toUpperCase()}</Text>
          <Text style={styles.lotTitle}>{lot.title}</Text>
          <View style={styles.bid}>
            <Text style={styles.label}>WINNING HAMMER BID</Text>
            <Text style={styles.price}>R{Number(lot.winningBid || 0).toLocaleString("en-ZA")}</Text>
          </View>
          <View style={styles.authentication}>
            <Text style={styles.authenticationText}>Authentication: The Grand Store Private Vault</Text>
            <Text style={styles.trust}>CPA Section 45 Trust Secured</Text>
          </View>
        </View>

        <View style={styles.registry}>
          <View style={styles.registryColumn}>
            <Text style={styles.label}>DATE OF ISSUE</Text>
            <Text style={styles.registryValue}>
              {(lot.endDate ? new Date(lot.endDate) : new Date()).toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" })}
            </Text>
          </View>
          <View style={styles.registryColumn}>
            <Text style={styles.label}>CERTIFICATE REFERENCE</Text>
            <Text style={styles.registryValue}>{lot.gsReference || `GSC-${lot._id.slice(-6).toUpperCase()}`}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.sealOuter}>
            <View style={styles.sealInner}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#977439" strokeWidth={1.25}>
                <Path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z" strokeLinejoin="round" />
                <Path d="m8 12 3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
          </View>
          <Text style={[styles.label, styles.center]}>CERTIFIED PROVENANCE</Text>
          <Text style={styles.cheers}>Cheers to Great Choices!</Text>
          <Text style={styles.archive}>THE GRAND STORE · VAULT ARCHIVE</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  document: { position: "relative", overflow: "hidden", borderWidth: 1, borderColor: "#d7c5a1", paddingHorizontal: 16, paddingTop: 20, paddingBottom: 18 },
  content: { zIndex: 1 },
  topCorner: { position: "absolute", top: 4, left: 4, width: 24, height: 24, borderTopWidth: 2, borderLeftWidth: 2, borderColor: "#a4864b" },
  bottomCorner: { position: "absolute", bottom: 4, right: 4, width: 24, height: 24, borderBottomWidth: 2, borderRightWidth: 2, borderColor: "#a4864b" },
  watermark: { position: "absolute", top: "34%", left: "4%", width: "92%", opacity: 0.065, transform: [{ rotate: "-18deg" }] },
  // Local Image assets carry their original height; explicitly bound both logos.
  watermarkLogo: { width: "100%", height: 100 },
  watermarkText: { color: "#8a6930", fontFamily: serif, fontSize: 24, textAlign: "center", letterSpacing: 1, marginTop: 12 },
  logo: { width: "100%", maxWidth: 230, height: 73, alignSelf: "center", marginBottom: 12 },
  eyebrowRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  rule: { height: 1, backgroundColor: "#d7c5a1", flex: 1, maxWidth: 24 },
  eyebrow: { color: "#806735", fontSize: 8, fontWeight: "600", letterSpacing: 1.2, textAlign: "center", flexShrink: 1 },
  heading: { alignItems: "center", marginTop: 18, marginBottom: 20 },
  title: { color: "#29261f", fontFamily: serif, fontSize: 30, textAlign: "center" },
  subtitle: { color: "#8a6930", fontSize: 9, fontWeight: "600", letterSpacing: 2.5, marginTop: 8, textAlign: "center" },
  label: { color: "#806735", fontSize: 9, fontWeight: "600", letterSpacing: 0.8, lineHeight: 15 },
  center: { textAlign: "center" },
  winner: { color: "#29261f", fontFamily: serif, fontSize: 24, lineHeight: 32, textAlign: "center", marginTop: 8 },
  winnerRule: { width: 72, height: 1, backgroundColor: "#b99b60", alignSelf: "center", marginTop: 10 },
  proclamation: { marginVertical: 16, gap: 4 },
  proclamationText: { color: "#5f584b", fontFamily: serif, fontSize: 12, lineHeight: 19, textAlign: "center" },
  record: { backgroundColor: "rgba(239,232,217,0.4)", borderTopWidth: 1, borderTopColor: "#c7b080", borderBottomWidth: 1, borderBottomColor: "#d7c5a1", padding: 12 },
  lotTitle: { color: "#29261f", fontFamily: serif, fontSize: 17, lineHeight: 24, marginTop: 5 },
  bid: { marginTop: 12 },
  price: { color: "#29261f", fontFamily: serif, fontSize: 24, marginTop: 5 },
  authentication: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#d7c5a1", gap: 5 },
  authenticationText: { color: "#756d5e", fontSize: 10, lineHeight: 17 },
  trust: { color: "#58654c", fontSize: 10, lineHeight: 17 },
  registry: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginVertical: 18 },
  registryColumn: { flexGrow: 1, flexBasis: 110, minWidth: 0, borderBottomWidth: 1, borderBottomColor: "#d7c5a1", paddingBottom: 8 },
  registryValue: { color: "#29261f", fontFamily: serif, fontSize: 12, lineHeight: 19, marginTop: 6 },
  footer: { alignItems: "center" },
  sealOuter: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: "#d7c5a1", padding: 3, marginBottom: 12 },
  sealInner: { flex: 1, borderRadius: 18, borderWidth: 1, borderColor: "#b99b60", alignItems: "center", justifyContent: "center" },
  cheers: { color: "#8a6930", fontFamily: serif, fontStyle: "italic", fontSize: 15, marginTop: 10, textAlign: "center" },
  archive: { color: "#756d5e", fontSize: 8, lineHeight: 14, letterSpacing: 1, marginTop: 12, textAlign: "center" },
});
