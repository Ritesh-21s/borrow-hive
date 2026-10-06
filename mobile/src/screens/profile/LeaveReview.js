import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, TextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { reviewAPI } from '../../api';
import Avatar from '../../components/common/Avatar';
import { Colors, Spacing, Shadow } from '../../constants/theme';

const QUICK_TAGS = {
  borrow: ['Punctual', 'Careful', 'Responsive', 'Trustworthy', 'Friendly'],
  ride:   ['Safe driver', 'On time', 'Comfortable', 'Friendly', 'Communicative'],
  favor:  ['Helpful', 'Reliable', 'Friendly', 'Quick', 'Went above & beyond'],
  sale:   ['Honest', 'Fast shipping', 'Great condition', 'Responsive', 'Trustworthy'],
};

const StarRow = ({ rating, onRate }) => (
  <View style={styles.starRow}>
    {[1, 2, 3, 4, 5].map((n) => (
      <TouchableOpacity key={n} onPress={() => onRate(n)} activeOpacity={0.7}>
        <Text style={[styles.star, n <= rating && styles.starFilled]}>{n <= rating ? '★' : '☆'}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

export default function LeaveReview({ navigation, route }) {
  const {
    revieweeId,
    revieweeName,
    revieweeAvatar,
    transactionType,
    transactionId,
    context,
  } = route.params;

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const tags = QUICK_TAGS[transactionType] || [];

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating required', 'Please select a star rating before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      await reviewAPI.createReview({
        revieweeId,
        rating,
        comment: comment.trim(),
        tags: selectedTags,
        transactionType,
        transactionId,
      });
      Alert.alert('Review submitted! ⭐', `Your review for ${revieweeName} has been saved.`, [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      const msg = err.response?.data?.message || err.userMessage || 'Failed to submit review.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <Avatar uri={revieweeAvatar?.url} name={revieweeName} size={64} />
          <Text style={styles.heading}>Rate {revieweeName}</Text>
          {context ? <Text style={styles.context}>{context}</Text> : null}
        </View>

        {/* Stars */}
        <Text style={styles.sectionLabel}>Your rating</Text>
        <StarRow rating={rating} onRate={setRating} />
        <Text style={styles.ratingHint}>
          {rating === 0 ? 'Tap a star' : ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][rating]}
        </Text>

        {/* Quick tags */}
        {tags.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Quick tags (optional)</Text>
            <View style={styles.tagsRow}>
              {tags.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tag, selectedTags.includes(tag) && styles.tagActive]}
                  onPress={() => toggleTag(tag)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.tagText, selectedTags.includes(tag) && styles.tagTextActive]}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Comment */}
        <Text style={styles.sectionLabel}>Write a review (optional)</Text>
        <TextInput
          style={styles.commentBox}
          placeholder={`What was your experience with ${revieweeName}?`}
          placeholderTextColor={Colors.muted}
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={4}
          maxLength={400}
        />
        <Text style={styles.charCount}>{comment.length}/400</Text>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, (rating === 0 || submitting) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={rating === 0 || submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#2A1503" />
          ) : (
            <Text style={styles.submitText}>Submit Review</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, paddingBottom: 48 },
  header: { alignItems: 'center', marginBottom: Spacing.xl },
  heading: { fontFamily: 'Fraunces_600SemiBold', fontSize: 22, color: Colors.ink, marginTop: Spacing.md },
  context: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.muted, marginTop: 4 },
  sectionLabel: {
    fontFamily: 'Inter_700Bold', fontSize: 11, color: Colors.ink,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm, marginTop: Spacing.lg,
  },
  starRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm, marginBottom: 4 },
  star: { fontSize: 40, color: Colors.border },
  starFilled: { color: Colors.accent },
  ratingHint: {
    fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.muted,
    textAlign: 'center', marginBottom: Spacing.sm, minHeight: 18,
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  tagActive: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  tagText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: Colors.ink },
  tagTextActive: { color: '#fff' },
  commentBox: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 10, padding: Spacing.md,
    fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.ink,
    minHeight: 100, textAlignVertical: 'top',
    ...Shadow.card,
  },
  charCount: { fontFamily: 'Inter_400Regular', fontSize: 10, color: Colors.muted, textAlign: 'right', marginTop: 4 },
  submitBtn: {
    marginTop: Spacing.xl, backgroundColor: Colors.accent,
    borderRadius: 10, padding: Spacing.md + 2, alignItems: 'center',
    ...Shadow.btn,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { fontFamily: 'Inter_700Bold', fontSize: 15, color: '#2A1503' },
  skipBtn: { marginTop: Spacing.md, alignItems: 'center', padding: Spacing.sm },
  skipText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.muted },
});
