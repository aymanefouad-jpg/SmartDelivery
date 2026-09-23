import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { compressForOCR } from '../utils/cameraHelper';
import { t } from '../i18n';

const accentOrange = '#FF6B00';

interface Props {
  onCapture: (photoUri: string) => void;
  onCancel: () => void;
  processing?: boolean;
}

export const CameraScreen: React.FC<Props> = ({ onCapture, onCancel, processing }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState<'on' | 'off' | 'auto'>('auto');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  // Release camera ref only on true unmount (separate effect so changing
  // permission does NOT null the ref while the camera is visible)
  useEffect(() => {
    return () => {
      (cameraRef as any).current = null;
    };
  }, []);

  const toggleFlash = () => {
    setFlash((prev) => {
      if (prev === 'auto') return 'on';
      if (prev === 'on') return 'off';
      return 'auto';
    });
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>{t('cameraPermission')}</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Allow</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.buttonText}>{t('cancel')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (!cameraRef.current || !isCameraReady || processing || isCapturing) {
      return;
    }
    setIsCapturing(true);
    try {
      const raw = await cameraRef.current.takePictureAsync({ quality: 0.3, exif: false });
      if (raw?.uri) {
        // IMMEDIATELY compress: resize to 800px MAX, quality 0.4.
        // Return ONLY the file URI — never keep the bitmap in memory.
        const compressedUri = await compressForOCR(raw.uri);
        onCapture(compressedUri);
      }
    } catch {
      // Silent on low-end devices — avoid console overhead
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        ref={cameraRef}
        facing="back"
        flash={flash}
        onCameraReady={() => setIsCameraReady(true)}
      >
        <View style={styles.overlay}>
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.flashButton} onPress={toggleFlash}>
              <Text style={styles.flashIcon}>
                {flash === 'on' ? '⚡' : flash === 'off' ? '⚡⃠' : '⚡A'}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.buttonText}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.shutterContainer}>
          <TouchableOpacity
            style={[styles.shutter, (!isCameraReady || isCapturing || processing) && styles.shutterDisabled]}
            onPress={takePicture}
            disabled={!isCameraReady || isCapturing || processing}
          >
            {isCapturing ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : (
              <View style={styles.shutterInner} />
            )}
          </TouchableOpacity>
          {!isCameraReady && <Text style={styles.readyText}>Preparing camera…</Text>}
        </View>
        {processing && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color={accentOrange} />
            <Text style={styles.processingText}>جاري قراءة النص...</Text>
          </View>
        )}
      </CameraView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1, justifyContent: 'space-between' },
  overlay: { padding: 20, alignItems: 'flex-start' },
  topBar: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
  },
  flashButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flashIcon: {
    fontSize: 24,
    color: '#fff',
  },
  text: { color: '#fff', fontSize: 16, textAlign: 'center', marginTop: 50, padding: 20 },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    marginVertical: 10,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  shutterContainer: { alignItems: 'center', paddingBottom: 40 },
  shutter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInner: {
    width: 65,
    height: 65,
    borderRadius: 35,
    backgroundColor: '#fff',
  },
  shutterDisabled: {
    opacity: 0.5,
  },
  readyText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 8,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 100,
  },
  processingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 12,
    fontWeight: 'bold',
  },
});