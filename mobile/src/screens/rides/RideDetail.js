import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { rideAPI, chatAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Avatar from '../../components/common/Avatar';
import ConfirmModal from '../../components/common/ConfirmModal';
import { LoadingState, ErrorState } from '../../components/common/States';
import { Colors, Spacing, Shadow, Radius } from '../../constants/theme';
import SuccessModal from '../../components/common/SuccessModal';

const fmt = (d) =>
  new Date(d).toLocaleString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

function formatRelative(date) {
  if (!date) return 'just now';
  const diff = Math.floor((Date.now() - new Date(date)) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff} min ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)} hr ago`;
  return `${Math.floor(diff / 1440)} days ago`;
}

export default function RideDetail({ navigation, route }) {
  const { rideId } = route.params;
  const { user } = useAuth();

  const [ride, setRide] = useState(null);
  const [passengers, setPassengers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [seats, setSeats] = useState('1');
  const [requesting, setRequesting] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [cancellingRide, setCancellingRide] = useState(false);
  const [completingRide, setCompletingRide] = useState(false);
  const [startingRide, setStartingRide] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [cancellingBooking, setCancellingBooking] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState(null);

  // Live Location State (Text only, no map)
  const [sharingLocation, setSharingLocation] = useState(false);
  const watchIdRef = useRef(null);
  const lastGeocodeTimeRef = useRef(0);

  const loadRideData = useCallback(async () => {
    try {
      const res = await rideAPI.getRide(rideId);
      setRide(res.data.data.ride);
      setPassengers(res.data.data.passengers || []);

      const ownerIdStr = (res.data.data.ride?.driverId?._id || res.data.data.ride?.ownerId?._id || res.data.data.ride?.requesterId?._id)?.toString();
      if (ownerIdStr === user?._id?.toString()) {
        const reqRes = await rideAPI.getRideRequests(rideId);
        setRequests(reqRes.data.data.requests || []);
      }
    } catch (err) {
      setError(err.userMessage || 'Failed to load ride details.');
    } finally {
      setLoading(false);
    }
  }, [rideId, user?._id]);

  useEffect(() => {
    loadRideData();
    return () => {
      // Clean up location watcher if active
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [loadRideData]);

  // Reverse Geocoding with Nominatim (locality name only, max 1 req / 30s)
  const reverseGeocodeLocality = async (lat, lon) => {
    try {
      const headers = Platform.OS === 'web' ? {} : { 'User-Agent': 'BorrowHive-App' };
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14`,
        { headers }
      );
      const data = await res.json();
      const addr = data.address || {};
      const locality =
        addr.suburb ||
        addr.neighbourhood ||
        addr.residential ||
        addr.city_district ||
        addr.town ||
        addr.village ||
        addr.city ||
        addr.county ||
        'En route';
      return locality;
    } catch (err) {
      return 'En route';
    }
  };

  const startLocationSharing = async () => {
    setSharingLocation(true);

    const onPos = async (position) => {
      const now = Date.now();
      if (now - lastGeocodeTimeRef.current < 25000) return;
      lastGeocodeTimeRef.current = now;

      const { latitude, longitude } = position.coords;
      const localityName = await reverseGeocodeLocality(latitude, longitude);

      try {
        await rideAPI.updateLocation(rideId, localityName);
        setRide((prev) => ({
          ...prev,
          currentLocationText: localityName,
          locationUpdatedAt: new Date().toISOString(),
        }));
      } catch (_) {}
    };

    const onErr = async () => {
      const fallbackLocality = ride?.from ? `En route near ${ride.from}` : 'En route';
      try {
        await rideAPI.updateLocation(rideId, fallbackLocality);
        setRide((prev) => ({
          ...prev,
          currentLocationText: fallbackLocality,
          locationUpdatedAt: new Date().toISOString(),
        }));
      } catch (_) {}
    };

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(onPos, onErr, {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000,
      });

      watchIdRef.current = navigator.geolocation.watchPosition(onPos, onErr, {
        enableHighAccuracy: false,
        maximumAge: 30000,
        timeout: 27000,
      });
    } else {
      const fallbackLocality = ride?.from ? `En route near ${ride.from}` : 'En route';
      try {
        await rideAPI.updateLocation(rideId, fallbackLocality);
        setRide((prev) => ({
          ...prev,
          currentLocationText: fallbackLocality,
          locationUpdatedAt: new Date().toISOString(),
        }));
      } catch (_) {}
    }
  };

  const stopLocationSharing = async () => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setSharingLocation(false);
    try {
      await rideAPI.updateLocation(rideId, '');
      setRide((prev) => ({
        ...prev,
        currentLocationText: '',
        locationUpdatedAt: null,
      }));
    } catch (_) {}
  };

  const handleToggleLocationSharing = () => {
    if (sharingLocation) {
      stopLocationSharing();
    } else {
      startLocationSharing();
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!ride) return null;

  const isRequest = ride.type === 'request';
  const creator = ride.driverId || ride.ownerId || ride.requesterId;
  const creatorIdStr = (creator?._id || creator)?.toString();
  const currentUserIdStr = (user?._id || user?.id)?.toString();
  const isCreator = !!(creatorIdStr && currentUserIdStr && creatorIdStr === currentUserIdStr);
  const seatsLeft = ride.seatsLeft !== undefined ? ride.seatsLeft : ride.availableSeats;
  const isFull = !isRequest && (ride.status === 'full' || seatsLeft === 0);
  const isPast = new Date(ride.departureTime || ride.startTime) < new Date();
  const isClosed = ride.status === 'closed' || ride.status === 'cancelled';
  const isCompleted = ride.status === 'completed';
  const isStarted = ride.status === 'started';

  const myAcceptedBooking = passengers.find(
    (p) => p.user?._id?.toString() === user?._id?.toString()
  );
  const myPendingRequest = requests.find(
    (r) => r.requesterId?._id?.toString() === user?._id?.toString() && r.status === 'PENDING'
  );

  const handleRequestSeat = async () => {
    const n = parseInt(seats, 10);
    if (!n || n < 1) {
      Alert.alert('Error', 'Enter a valid seat count.');
      return;
    }
    setRequesting(true);
    try {
      await rideAPI.requestSeat(rideId, n);
      setShowSuccess(true);
      await loadRideData();
    } catch (err) {
      if (err.response?.status === 409) {
        Alert.alert('Join Request Issue', err.response.data?.message || 'Not enough seats available.');
      } else {
        Alert.alert('Error', err.userMessage || 'Request failed.');
      }
    } finally {
      setRequesting(false);
    }
  };

  const handleAcceptRequest = async (requestId, passengerName) => {
    setActionId(requestId);
    try {
      const res = await rideAPI.acceptRequest(rideId, requestId);
      Alert.alert('Accepted', `${passengerName} has joined your ride!`);
      await loadRideData();

      if (res.data.data.conversationId) {
        navigation.navigate('Conversation', {
          conversationId: res.data.data.conversationId,
          title: passengerName,
          deal: {
            icon: '🚗',
            title: `Ride: ${ride.from} → ${ride.to}`,
            statusLabel: 'Confirmed Passenger',
            status: 'accepted',
            screen: 'RideDetail',
            screenParams: { rideId: ride._id },
          },
        });
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err.userMessage || 'Failed to accept.');
    } finally {
      setActionId(null);
    }
  };

  const handleRejectRequest = async (requestId, passengerName) => {
    setActionId(requestId);
    try {
      await rideAPI.rejectRequest(rideId, requestId);
      Alert.alert('Declined', `Request from ${passengerName} was declined.`);
      await loadRideData();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err.userMessage || 'Failed to decline.');
    } finally {
      setActionId(null);
    }
  };

  const handleCancelMyBooking = () => {
    setConfirmConfig({
      icon: '🎫',
      title: 'Cancel Seat Booking',
      message: 'Are you sure you want to cancel your seat on this ride? 1 seat will be restored.',
      confirmText: 'Cancel Booking',
      destructive: true,
      loading: cancellingBooking,
      onConfirm: async () => {
        setCancellingBooking(true);
        try {
          await rideAPI.cancelBooking(rideId);
          setConfirmConfig(null);
          Alert.alert('Booking Cancelled', 'Your seat has been released.');
          await loadRideData();
        } catch (err) {
          Alert.alert('Error', err.userMessage || 'Failed to cancel booking.');
        } finally {
          setCancellingBooking(false);
        }
      },
      onCancel: () => setConfirmConfig(null),
    });
  };

  const handleStartRide = () => {
    setConfirmConfig({
      icon: '🚗',
      title: 'Start Ride',
      message: 'Mark this ride as started? Passengers will be notified and no new riders can join.',
      confirmText: 'Start Ride 🚗',
      destructive: false,
      loading: startingRide,
      onConfirm: async () => {
        setStartingRide(true);
        try {
          await rideAPI.startRide(rideId);
          setConfirmConfig(null);
          Alert.alert('Ride Started!', 'Your ride is now in progress.');
          await loadRideData();
        } catch (err) {
          Alert.alert('Error', err.userMessage || 'Failed to start ride.');
        } finally {
          setStartingRide(false);
        }
      },
      onCancel: () => setConfirmConfig(null),
    });
  };

  const handleCompleteRide = () => {
    setConfirmConfig({
      icon: '🏁',
      title: 'Complete Ride',
      message: 'Are you sure you want to complete this ride? Location sharing will stop automatically.',
      confirmText: 'Complete Ride ✓',
      destructive: false,
      loading: completingRide,
      onConfirm: async () => {
        setCompletingRide(true);
        stopLocationSharing();
        try {
          await rideAPI.completeRide(rideId);
          setRide((prev) => ({ ...prev, status: 'completed' }));
          setConfirmConfig(null);

          Alert.alert(
            'Ride Completed!',
            'Great job! Please take a moment to rate your passengers.',
            [
              {
                text: 'Leave Reviews ⭐',
                onPress: () => {
                  navigation.navigate('LeaveReview', {
                    revieweeId: passengers[0]?.user?._id || creator?._id,
                    revieweeName: passengers[0]?.user?.name || creator?.name,
                    revieweeAvatar: passengers[0]?.user?.avatar?.url || creator?.avatar?.url,
                    transactionType: 'ride',
                    transactionId: ride._id,
                    context: `${ride.from} → ${ride.to}`,
                  });
                },
              },
              {
                text: 'Done',
                onPress: () => navigation.goBack(),
              },
            ]
          );
        } catch (err) {
          Alert.alert('Error', err.response?.data?.message || err.userMessage || 'Failed to complete.');
        } finally {
          setCompletingRide(false);
        }
      },
      onCancel: () => setConfirmConfig(null),
    });
  };

  const handleCloseRide = () => {
    const isReq = ride.type === 'request';
    setConfirmConfig({
      icon: '🚫',
      title: 'Close Ride',
      message: isReq
        ? 'Are you sure you want to close this ride request? It will be removed from listings.'
        : 'Are you sure you want to cancel and close this ride? Confirmed riders will be notified.',
      confirmText: 'Close Ride',
      destructive: true,
      loading: cancellingRide,
      onConfirm: async () => {
        setCancellingRide(true);
        stopLocationSharing();
        try {
          await rideAPI.closeRide(rideId);
          setConfirmConfig(null);
          Alert.alert('Ride Closed', 'The ride has been closed and removed from listings.');
          navigation.goBack();
        } catch (err) {
          Alert.alert('Error', err.userMessage || 'Could not close ride.');
        } finally {
          setCancellingRide(false);
        }
      },
      onCancel: () => setConfirmConfig(null),
    });
  };

  const handleMessageRequester = async () => {
    setChatLoading(true);
    try {
      const res = await chatAPI.createConversation({
        participantId: creator._id,
        contextType: 'ride',
        contextId: ride._id,
      });

      navigation.navigate('Conversation', {
        conversationId: res.data.data.conversation._id,
        title: creator.name,
        deal: {
          icon: '🚗',
          title: `Ride: ${ride.from} → ${ride.to}`,
          statusLabel: 'Ride Request',
          status: ride.status,
          screen: 'RideDetail',
          screenParams: { rideId: ride._id },
        },
      });
    } catch (err) {
      Alert.alert('Error', err.userMessage || 'Could not start conversation.');
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Closed or Completed Banner */}
        {isCompleted && (
          <View style={styles.completedBanner}>
            <Text style={styles.completedText}>✅ Ride completed</Text>
          </View>
        )}
        {isClosed && (
          <View style={styles.closedBanner}>
            <Text style={styles.closedText}>🔒 Ride closed</Text>
          </View>
        )}

        {/* Live Location Line (TEXT ONLY, NO MAP) */}
        {ride.currentLocationText ? (
          <View style={styles.liveLocationBanner}>
            <Text style={styles.liveLocationText}>
              📍 Driver is currently in <Text style={{ fontWeight: '700' }}>{ride.currentLocationText}</Text>
              {ride.locationUpdatedAt ? ` · updated ${formatRelative(ride.locationUpdatedAt)}` : ''}
            </Text>
          </View>
        ) : null}

        {/* Route Card */}
        <View style={styles.card}>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.typeBadge,
                { backgroundColor: isRequest ? '#F3E8FF' : '#FEF3C7' },
              ]}
            >
              <Text
                style={[
                  styles.typeBadgeText,
                  { color: isRequest ? '#7E22CE' : '#B45309' },
                ]}
              >
                {isRequest ? 'RIDE REQUEST' : 'RIDE OFFER'}
              </Text>
            </View>

            {isStarted && (
              <View style={styles.startedBadge}>
                <Text style={styles.startedBadgeText}>IN PROGRESS</Text>
              </View>
            )}
            {isFull && (
              <View style={styles.fullBadge}>
                <Text style={styles.fullBadgeText}>FULL</Text>
              </View>
            )}
          </View>

          <Text style={styles.routeHeader}>{ride.from} → {ride.to}</Text>
          <Text style={styles.timeHeader}>
            ⏱ {fmt(ride.departureTime || ride.startTime)}
          </Text>

          {!isRequest ? (
            <View style={styles.seatsRow}>
              <Text style={styles.seatsText}>
                {seatsLeft} seat{seatsLeft !== 1 ? 's' : ''} available (of {ride.totalSeats})
              </Text>
              <Text style={styles.costText}>
                {ride.pricePerSeat || ride.cost ? `₹${ride.pricePerSeat || ride.cost} / seat` : 'Free'}
              </Text>
            </View>
          ) : null}

          {ride.notes ? (
            <View style={styles.notesWrap}>
              <Text style={styles.notesLabel}>Notes</Text>
              <Text style={styles.notesBody}>{ride.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* Creator Info Card */}
        <TouchableOpacity
          style={styles.driverRow}
          onPress={() => creator?._id && navigation.navigate('UserProfile', { userId: creator._id })}
          activeOpacity={0.8}
        >
          <Avatar uri={creator?.avatar?.url} name={creator?.name} size={42} />
          <View style={{ flex: 1 }}>
            <Text style={styles.driverName}>{creator?.name}</Text>
            <Text style={styles.driverSub}>
              {isRequest ? 'Ride Requester' : 'Driver'} · ★{creator?.rating?.toFixed(1) || '5.0'} ({creator?.reviewCount || 0} reviews)
            </Text>
          </View>
          <View style={styles.communityBadge}>
            <Text style={styles.communityBadgeText}>Community Verified</Text>
          </View>
        </TouchableOpacity>

        {/* Confirmed Passengers (Offer only) */}
        {!isRequest && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Confirmed Passengers ({passengers.length}/{ride.totalSeats})
            </Text>
            {passengers.length === 0 ? (
              <Text style={styles.emptySub}>No confirmed passengers yet.</Text>
            ) : (
              passengers.map((p, idx) => (
                <View key={idx} style={styles.passengerItem}>
                  <Avatar uri={p.user?.avatar?.url} name={p.user?.name} size={32} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.passengerName}>{p.user?.name}</Text>
                    <Text style={styles.passengerMeta}>{p.seats || 1} seat(s) confirmed</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Driver Pending Join Requests */}
        {isCreator && !isRequest && !isClosed && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Join Requests ({requests.filter((r) => r.status === 'PENDING').length})
            </Text>
            {requests.filter((r) => r.status === 'PENDING').length === 0 ? (
              <Text style={styles.emptySub}>No pending requests.</Text>
            ) : (
              requests
                .filter((r) => r.status === 'PENDING')
                .map((req) => (
                  <View key={req._id} style={styles.requestItem}>
                    <Avatar uri={req.requesterId?.avatar?.url} name={req.requesterId?.name} size={36} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reqName}>{req.requesterId?.name}</Text>
                      <Text style={styles.reqSeats}>Requested {req.seatsRequested} seat(s)</Text>
                    </View>
                    <View style={styles.reqBtnRow}>
                      <Button
                        title="Accept"
                        size="sm"
                        onPress={() => handleAcceptRequest(req._id, req.requesterId?.name)}
                        loading={actionId === req._id}
                      />
                      <Button
                        title="Decline"
                        variant="outline"
                        size="sm"
                        onPress={() => handleRejectRequest(req._id, req.requesterId?.name)}
                        loading={actionId === req._id}
                      />
                    </View>
                  </View>
                ))
            )}
          </View>
        )}

        {/* Rider Status Banners */}
        {myAcceptedBooking && (
          <View style={styles.confirmedBanner}>
            <Text style={styles.confirmedBannerText}>
              ✓ You are confirmed on this ride! ({myAcceptedBooking.seats} seat(s))
            </Text>
            {!isCompleted && !isClosed && (
              <Button
                title={cancellingBooking ? 'Cancelling…' : 'Cancel My Seat'}
                variant="outline"
                size="sm"
                onPress={handleCancelMyBooking}
                loading={cancellingBooking}
                style={{ marginTop: 8 }}
              />
            )}
          </View>
        )}

        {myPendingRequest && (
          <View style={styles.pendingBanner}>
            <Text style={styles.pendingBannerText}>
              ⏳ Your seat request is waiting for the driver's approval.
            </Text>
          </View>
        )}

        {/* Location Sharing indicator for owner */}
        {isCreator && sharingLocation && (
          <View style={styles.locationActiveNotice}>
            <Text style={styles.locationActiveText}>
              🟢 Location sharing is ON (Locality text updating). Keep screen open in foreground.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Driver / Creator Floating CTA */}
      {isCreator && !isClosed && (
        <View style={styles.cta}>
          {!isRequest ? (
            <>
              {/* Offer controls */}
              {!isStarted && !isCompleted && (
                <Button
                  title={startingRide ? 'Starting…' : 'Start ride 🚗'}
                  onPress={handleStartRide}
                  loading={startingRide}
                />
              )}

              {/* Live Location Button */}
              {!isCompleted && (
                <Button
                  title={sharingLocation ? 'Stop Sharing Location' : 'Share Live Location (Text)'}
                  variant={sharingLocation ? 'secondary' : 'outline'}
                  onPress={handleToggleLocationSharing}
                />
              )}

              {!isCompleted && (
                <Button
                  title={completingRide ? 'Completing…' : 'Complete ride ✓'}
                  onPress={handleCompleteRide}
                  loading={completingRide}
                />
              )}

              {!isStarted && !isCompleted && (
                <Button
                  title={cancellingRide ? 'Closing…' : 'Close ride'}
                  variant="outline"
                  onPress={handleCloseRide}
                  loading={cancellingRide}
                  style={styles.cancelBtn}
                />
              )}
            </>
          ) : (
            <>
              {/* Request controls for requester */}
              <Button
                title={cancellingRide ? 'Closing…' : 'Close ride (Found a ride) ✓'}
                onPress={handleCloseRide}
                loading={cancellingRide}
              />
            </>
          )}
        </View>
      )}

      {/* Non-Creator CTAs */}
      {!isCreator && !isClosed && (
        <View style={styles.cta}>
          {isRequest ? (
            <Button
              title={chatLoading ? 'Opening…' : 'Message requester (Offer ride)'}
              onPress={handleMessageRequester}
              loading={chatLoading}
            />
          ) : (
            <>
              {!myAcceptedBooking && !myPendingRequest && !isFull && !isPast && (
                <Button
                  title={requesting ? 'Sending…' : 'Request to join'}
                  onPress={handleRequestSeat}
                  loading={requesting}
                />
              )}
              {isFull && !myAcceptedBooking && (
                <View style={styles.fullNotice}>
                  <Text style={styles.fullNoticeText}>This ride is currently full.</Text>
                </View>
              )}
            </>
          )}
        </View>
      )}

      <SuccessModal
        visible={showSuccess}
        icon="🚗"
        title="Join Request Sent!"
        message="The driver has received your notification. Once they accept, a chat will open and your seat is confirmed."
        details={[
          { label: 'Route', value: `${ride.from} → ${ride.to}` },
          { label: 'Time', value: fmt(ride.departureTime || ride.startTime) },
          { label: 'Driver', value: creator?.name || 'Driver' },
        ]}
        primaryBtnText="Got it"
        onPrimaryPress={() => setShowSuccess(false)}
        secondaryBtnText="Back to Rides"
        onSecondaryPress={() => {
          setShowSuccess(false);
          navigation.goBack();
        }}
      />

      {confirmConfig && (
        <ConfirmModal
          visible={!!confirmConfig}
          icon={confirmConfig.icon}
          title={confirmConfig.title}
          message={confirmConfig.message}
          confirmText={confirmConfig.confirmText}
          destructive={confirmConfig.destructive}
          loading={confirmConfig.loading}
          onConfirm={confirmConfig.onConfirm}
          onCancel={confirmConfig.onCancel}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingBottom: 150 },
  completedBanner: {
    backgroundColor: '#DFF3EA',
    padding: Spacing.md,
    alignItems: 'center',
    margin: Spacing.lg,
    borderRadius: Radius.md,
  },
  completedText: { fontFamily: 'Inter_700Bold', fontSize: 13, color: Colors.success },
  closedBanner: {
    backgroundColor: '#F1F1EF',
    padding: Spacing.md,
    alignItems: 'center',
    margin: Spacing.lg,
    borderRadius: Radius.md,
  },
  closedText: { fontFamily: 'Inter_700Bold', fontSize: 13, color: Colors.muted },
  liveLocationBanner: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: Radius.md,
  },
  liveLocationText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#1E40AF' },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.card,
    padding: Spacing.lg,
    margin: Spacing.lg,
    ...Shadow.card,
  },
  badgeRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  typeBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 0.5 },
  startedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  startedBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 10, color: '#15803D' },
  fullBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  fullBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 10, color: '#B91C1C' },
  routeHeader: { fontFamily: 'Fraunces_600SemiBold', fontSize: 20, color: Colors.ink, marginBottom: 4 },
  timeHeader: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.muted, marginBottom: Spacing.sm },
  seatsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.xs },
  seatsText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.ink },
  costText: { fontFamily: 'Inter_800ExtraBold', fontSize: 16, color: Colors.accentDark },
  notesWrap: { marginTop: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  notesLabel: { fontFamily: 'Inter_700Bold', fontSize: 11, color: Colors.muted, marginBottom: 2 },
  notesBody: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.ink },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  driverName: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.ink },
  driverSub: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.muted },
  communityBadge: { backgroundColor: Colors.successLight, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  communityBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 9, color: Colors.success },
  section: { marginHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 12, color: Colors.ink, textTransform: 'uppercase', marginBottom: Spacing.sm },
  emptySub: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.muted },
  passengerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xs,
  },
  passengerName: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.ink },
  passengerMeta: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.muted },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xs,
  },
  reqName: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.ink },
  reqSeats: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.muted },
  reqBtnRow: { flexDirection: 'row', gap: 6 },
  confirmedBanner: {
    backgroundColor: '#DFF3EA',
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  confirmedBannerText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#0E8A5F' },
  pendingBanner: {
    backgroundColor: '#FEF3C7',
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  pendingBannerText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#B45309' },
  locationActiveNotice: {
    backgroundColor: '#DCFCE7',
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  locationActiveText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#15803D' },
  cta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 8,
  },
  cancelBtn: { borderColor: '#E53E3E' },
  fullNotice: { padding: Spacing.md, alignItems: 'center' },
  fullNoticeText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.muted },
});
