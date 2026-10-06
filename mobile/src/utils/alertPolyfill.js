import { Alert, Platform } from 'react-native';

/**
 * Universal Alert Polyfill for React Native Web.
 * Fixes React Native Web's default Alert.alert dropping buttons array and ignoring onPress handlers.
 */
if (Platform.OS === 'web') {
  Alert.alert = (title, message, buttons) => {
    const text = [title, message].filter(Boolean).join('\n\n');

    if (!buttons || buttons.length === 0) {
      if (typeof window !== 'undefined') window.alert(text);
      return;
    }

    if (buttons.length === 1) {
      if (typeof window !== 'undefined') window.alert(text);
      try {
        buttons[0]?.onPress?.();
      } catch (err) {
        console.error('Alert button callback error:', err);
      }
      return;
    }

    // 2 or more buttons: identify cancel button if present
    const cancelIndex = buttons.findIndex(
      (b) => b.style === 'cancel' || /^(cancel|no|not now|not yet|keep|keep seat|done)$/i.test((b.text || '').trim())
    );

    if (cancelIndex !== -1 && buttons.length === 2) {
      const confirmIndex = cancelIndex === 0 ? 1 : 0;
      const confirmed = typeof window !== 'undefined' ? window.confirm(text) : true;
      if (confirmed) {
        buttons[confirmIndex]?.onPress?.();
      } else {
        buttons[cancelIndex]?.onPress?.();
      }
      return;
    }

    // Multiple action options (e.g. Leave a Review vs Done)
    const promptText = buttons.length === 2
      ? `${text}\n\n• [OK]: ${buttons[0]?.text || 'Confirm'}\n• [Cancel]: ${buttons[1]?.text || 'Close'}`
      : text;

    const confirmed = typeof window !== 'undefined' ? window.confirm(promptText) : true;
    if (confirmed) {
      buttons[0]?.onPress?.();
    } else if (buttons[1]) {
      buttons[1]?.onPress?.();
    }
  };
}
