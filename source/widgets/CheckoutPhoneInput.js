import React, { useState } from 'react';
import { FlatList, Modal, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { PHONE_COUNTRIES } from '../helpers/phoneNumbers';
import { CountryFlagImage } from '../components/CountryCodePickerModal';

export default function CheckoutPhoneInput({ phone, phoneCountry, onChangePhone, onChangeCountry }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selected = PHONE_COUNTRIES.find((country) => country.country === phoneCountry);
  const query = search.trim().toLowerCase();
  const options = PHONE_COUNTRIES.filter((country) => `${country.name} ${country.country} ${country.dialCode}`.toLowerCase().includes(query));

  return (
    <>
      <View style={styles.inputRow}>
        <Pressable
          style={styles.selector}
          onPress={() => { setSearch(''); setOpen(true); }}
          accessibilityRole="button"
          accessibilityLabel={`Phone country code: ${selected?.name || 'Select country'} ${selected?.dialCode || ''}`}
          accessibilityState={{ expanded: open }}
        >
          <CountryFlagImage iso={selected?.country || phoneCountry || 'ZA'} size={15} />
          <Text style={styles.code}>{selected ? `${selected.dialCode}` : '+27'}</Text>
          <Text style={styles.chevron}>⌄</Text>
        </Pressable>
        <TextInput
          style={styles.number}
          value={phone}
          onChangeText={(value) => onChangePhone(value.replace(/[^0-9]/g, ''))}
          placeholder="Mobile number"
          placeholderTextColor="#777"
          keyboardType="phone-pad"
          autoComplete="tel-national"
          accessibilityLabel="Mobile number"
          maxLength={17}
        />
      </View>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel="Close country selector" accessibilityRole="button" />
          <SafeAreaView style={styles.sheet}>
            <View style={styles.heading}>
              <Text style={styles.title}>Phone country code</Text>
              <Pressable onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel="Close country selector" style={styles.close}>
                <Text style={styles.closeText}>Close</Text>
              </Pressable>
            </View>
            <TextInput
              style={styles.search}
              value={search}
              onChangeText={setSearch}
              placeholder="Search country or code"
              placeholderTextColor="#777"
              autoCorrect={false}
              accessibilityLabel="Search phone country codes"
            />
            <FlatList
              data={options}
              keyExtractor={(item) => item.country}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text style={styles.empty}>No matching countries</Text>}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.option, item.country === phoneCountry && styles.selected]}
                  onPress={() => { onChangeCountry(item.country); setOpen(false); }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: item.country === phoneCountry }}
                >
                  <CountryFlagImage iso={item.country} size={18} />
                  <Text style={styles.countryName}>{item.name}</Text>
                  <Text style={styles.dialCode}>{item.dialCode}</Text>
                </Pressable>
              )}
            />
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  inputRow: { flexDirection: 'row', borderWidth: 1, borderColor: '#333', borderRadius: 10, backgroundColor: '#0d0d0d', overflow: 'hidden', minHeight: 50 },
  selector: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRightWidth: 1, borderRightColor: '#333', backgroundColor: '#1a1712' },
  code: { color: '#d6b575', fontSize: 13, fontWeight: '600' },
  chevron: { color: '#d6b575', fontSize: 17 },
  number: { flex: 1, minWidth: 0, color: '#fff', fontSize: 14, paddingHorizontal: 12, paddingVertical: 12 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: { height: '75%', backgroundColor: '#121212', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderColor: '#3a3020' },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 20, paddingRight: 8, paddingTop: 12 },
  title: { color: '#fff', fontSize: 17, fontWeight: '600' },
  close: { padding: 14 },
  closeText: { color: '#d6b575', fontSize: 14 },
  search: { margin: 16, borderWidth: 1, borderColor: '#383838', borderRadius: 10, color: '#fff', paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#242424' },
  selected: { backgroundColor: '#282115' },
  countryName: { flex: 1, color: '#eee', fontSize: 14 },
  dialCode: { color: '#d6b575', fontSize: 14, fontWeight: '600' },
  empty: { padding: 20, textAlign: 'center', color: '#aaa' },
});
