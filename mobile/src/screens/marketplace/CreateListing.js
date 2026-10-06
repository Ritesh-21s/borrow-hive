import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { listingAPI } from '../../api';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Chip from '../../components/common/Chip';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { uploadImageToCloudinary } from '../../utils/imageUpload';
import SuccessModal from '../../components/common/SuccessModal';

const CATEGORIES = ['electronics', 'books', 'clothing', 'furniture', 'sports', 'tools', 'kitchen', 'other'];
const CONDITIONS = ['new', 'like_new', 'good', 'fair', 'poor'];
const CONDITION_LABELS = {
  new: 'Brand New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
};

export default function CreateListing({ navigation, route }) {
  const existingListing = route.params?.listing;
  const isEdit = !!existingListing;

  const initialType = route.params?.type || (existingListing?.type === 'buy' ? 'buy' : 'sell');
  const [type, setType] = useState(initialType);
  const isBuy = type === 'buy';

  const [title, setTitle] = useState(existingListing?.title || '');
  const [description, setDescription] = useState(existingListing?.description || '');
  // BUG 7: no risky preselects — start blank so user must actively choose
  const [category, setCategory] = useState(existingListing?.category || '');
  // BUG 4: price starts empty, not '0'
  const [price, setPrice] = useState(
    existingListing?.price ? existingListing.price.toString()
    : existingListing?.budget ? existingListing.budget.toString()
    : ''
  );
  // BUG 7: condition starts unselected for new listings
  const [condition, setCondition] = useState(existingListing?.condition || '');
  const [acceptedConditions, setAcceptedConditions] = useState(
    existingListing?.acceptedConditions && existingListing.acceptedConditions.length > 0
      ? existingListing.acceptedConditions
      : []
  );
  const [images, setImages] = useState(
    existingListing?.images?.length > 0
      ? existingListing.images
      : existingListing?.imageUrl
      ? [{ url: existingListing.imageUrl, publicId: '' }]
      : []
  );
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);

  // BUG 6: safe-area inset for bottom button visibility
  const insets = useSafeAreaInsets();

  const toggleAcceptedCondition = (cond) => {
    setAcceptedConditions((prev) =>
      prev.includes(cond)
        ? prev.length > 1 ? prev.filter((c) => c !== cond) : prev
        : [...prev, cond]
    );
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!result.canceled && result.assets?.[0]) {
      setUploading(true);
      try {
        const uploaded = await uploadImageToCloudinary(result.assets[0].uri);
        setImages((prev) => [...prev, uploaded]);
      } catch (err) {
        // BUG 2: friendly message — raw error is already logged inside uploadImageToCloudinary
        Alert.alert('Photo upload failed', err.message || "Couldn't upload your photo. Please try again.");
      } finally {
        setUploading(false);
      }
    }
  };

  const validate = () => {
    const e = {};
    if (!title.trim()) e.title = 'Product name is required';
    // BUG 7: category is now required
    if (!category) e.category = 'Please select a category.';
    if (!isBuy && images.length === 0) {
      e.image = 'At least 1 product image is required for a Sell Request.';
    }
    if (!isBuy && (!price || parseFloat(price) <= 0)) {
      e.price = 'Please enter a valid price.';
    }
    // BUG 7: condition required for sell listings
    if (!isBuy && !condition) e.condition = 'Please select a condition.';
    if (isBuy && acceptedConditions.length === 0) {
      e.condition = 'Select at least one accepted condition.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const parsedPrice = parseFloat(price) || 0;
      const primaryImageUrl = images[0]?.url || '';

      const payload = {
        title: title.trim(),
        description: description.trim(),
        category,
        price: parsedPrice,
        budget: parsedPrice,
        condition: isBuy ? acceptedConditions[0] : condition,
        acceptedConditions: isBuy ? acceptedConditions : [condition],
        type,
        images,
        imageUrl: primaryImageUrl,
      };

      if (isEdit) {
        await listingAPI.updateListing(existingListing._id, payload);
      } else {
        await listingAPI.createListing(payload);
      }
      setShowSuccess(true);
    } catch (err) {
      Alert.alert('Error', err.userMessage || 'Failed to save listing.');
    } finally {
      setLoading(false);
    }
  };

  return (
    // BUG 5: 'height' on Android adjusts the view height so the focused field is never hidden
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 24, 40) }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Type Switcher */}
        {!isEdit && (
          <View style={styles.typeSwitcher}>
            <TouchableOpacity
              style={[styles.typeBtn, !isBuy && styles.typeBtnActiveSell]}
              onPress={() => setType('sell')}
            >
              <Text style={[styles.typeBtnText, !isBuy && styles.typeBtnTextActive]}>
                🏷️ Sell Request
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, isBuy && styles.typeBtnActiveBuy]}
              onPress={() => setType('buy')}
            >
              <Text style={[styles.typeBtnText, isBuy && styles.typeBtnTextActive]}>
                🔍 Buy Request
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Photos */}
        <View style={styles.sectionHeader}>
          <Text style={styles.label}>
            {isBuy ? 'Reference Image (Optional)' : 'Product Image *'}
          </Text>
        </View>
        <View style={styles.photoRow}>
          {images.map((img, i) => (
            <View key={i} style={styles.photoThumb}>
              <Image source={{ uri: img.url }} style={styles.photoImg} />
              <TouchableOpacity
                style={styles.photoRemove}
                onPress={() => setImages((p) => p.filter((_, j) => j !== i))}
              >
                <Text style={styles.photoRemoveText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          {images.length < 4 && (
            <TouchableOpacity style={styles.photoAdd} onPress={pickImage} disabled={uploading}>
              <Text style={styles.photoAddText}>{uploading ? '…' : '+'}</Text>
            </TouchableOpacity>
          )}
        </View>
        {errors.image ? <Text style={styles.errorText}>{errors.image}</Text> : null}

        {/* Product Name */}
        <Input
          label={isBuy ? 'What product are you looking to buy? *' : 'Product name *'}
          value={title}
          onChangeText={setTitle}
          placeholder={isBuy ? 'e.g. Casio fx-991CW Calculator' : 'e.g. Ergonomic Desk Lamp'}
          autoCapitalize="sentences"
          error={errors.title}
        />

        {/* Category */}
        <Text style={styles.label}>Category *</Text>
        <View style={styles.chipWrap}>
          {CATEGORIES.map((c) => (
            <Chip
              key={c}
              label={c.charAt(0).toUpperCase() + c.slice(1)}
              active={category === c}
              onPress={() => setCategory(c)}
              style={styles.chipItem}
            />
          ))}
        </View>
        {errors.category ? <Text style={styles.errorText}>{errors.category}</Text> : null}

        {/* Price / Budget — BUG 3: numeric keyboard, BUG 4: empty default with placeholder */}
        <Input
          label={isBuy ? 'Your Budget ₹ (Optional)' : 'Price ₹ *'}
          value={price}
          onChangeText={(text) => {
            // Allow digits and a single decimal point only
            const sanitized = text.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
            setPrice(sanitized);
          }}
          placeholder="e.g. 499"
          keyboardType="decimal-pad"
          error={errors.price}
        />

        {/* Condition */}
        {!isBuy ? (
          <View style={{ marginBottom: Spacing.md }}>
            <Text style={styles.label}>Condition *</Text>
            <View style={styles.chipWrap}>
              {CONDITIONS.map((c) => (
                <Chip
                  key={c}
                  label={CONDITION_LABELS[c] || c}
                  active={condition === c}
                  onPress={() => setCondition(c)}
                  style={styles.chipItemSm}
                />
              ))}
            </View>
            {errors.condition && !isBuy ? <Text style={styles.errorText}>{errors.condition}</Text> : null}
          </View>
        ) : (
          <View style={{ marginBottom: Spacing.md }}>
            <Text style={styles.label}>Accepted Condition(s) *</Text>
            <Text style={styles.helperText}>Select all conditions you would accept:</Text>
            <View style={styles.chipWrap}>
              {CONDITIONS.map((c) => {
                const isSelected = acceptedConditions.includes(c);
                return (
                  <Chip
                    key={c}
                    label={`${isSelected ? '✓ ' : ''}${CONDITION_LABELS[c] || c}`}
                    active={isSelected}
                    onPress={() => toggleAcceptedCondition(c)}
                    style={styles.chipItemSm}
                  />
                );
              })}
            </View>
            {errors.condition ? <Text style={styles.errorText}>{errors.condition}</Text> : null}
          </View>
        )}

        {/* Description */}
        <Input
          label="Description (optional)"
          value={description}
          onChangeText={setDescription}
          placeholder={
            isBuy
              ? 'Any specific model requirements, condition preferences, or timeline…'
              : 'Add details about the condition, accessories included, reason for selling…'
          }
          multiline
          numberOfLines={3}
        />

        <Button
          title={isEdit ? 'Save Changes' : isBuy ? 'Post Buy Request' : 'Publish Sell Listing'}
          onPress={handleSubmit}
          loading={loading}
          style={styles.submitBtn}
        />
      </ScrollView>

      <SuccessModal
        visible={showSuccess}
        icon={isBuy ? '🔍' : '🏷️'}
        title={isEdit ? 'Listing Updated!' : isBuy ? 'Buy Request Posted!' : 'Item Listed for Sale!'}
        message={
          isBuy
            ? 'Your buy request is now visible. Members with this item can tap "I have this" to chat with you.'
            : 'Your item is now live. Buyers can contact you directly.'
        }
        details={[
          { label: 'Type', value: isBuy ? 'Buy Request' : 'Sell Request' },
          { label: 'Product', value: title },
          { label: 'Category', value: category },
          { label: isBuy ? 'Budget' : 'Price', value: price ? `₹${price}` : 'Open' },
        ]}
        primaryBtnText="View Marketplace"
        onPrimaryPress={() => {
          setShowSuccess(false);
          navigation.goBack();
        }}
        secondaryBtnText="Back"
        onSecondaryPress={() => {
          setShowSuccess(false);
          navigation.goBack();
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, paddingBottom: 50 },
  typeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#EBEBE6',
    borderRadius: Radius.md,
    padding: 3,
    marginBottom: Spacing.lg,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: Radius.sm,
  },
  typeBtnActiveSell: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  typeBtnActiveBuy: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  typeBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.muted,
  },
  typeBtnTextActive: {
    color: Colors.ink,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  label: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: Colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.muted,
    marginBottom: 8,
  },
  photoRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md, flexWrap: 'wrap' },
  photoThumb: { width: 68, height: 68, borderRadius: 8, overflow: 'hidden', position: 'relative' },
  photoImg: { width: '100%', height: '100%' },
  photoRemove: {
    position: 'absolute', top: 2, right: 2,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10,
    width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
  },
  photoRemoveText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  photoAdd: {
    width: 68, height: 68, borderRadius: 8,
    borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface,
  },
  photoAddText: { fontSize: 24, color: Colors.muted, marginTop: -2 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.md },
  chipItem: { marginBottom: 4 },
  chipItemSm: { marginBottom: 4 },
  errorText: { fontSize: 11, color: Colors.error, marginTop: -4, marginBottom: 8, fontFamily: 'Inter_500Medium' },
  submitBtn: { marginTop: Spacing.md },
});
