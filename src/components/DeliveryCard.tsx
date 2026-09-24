import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert, Image } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Delivery } from '../types';

interface Props {
  delivery: Delivery;
  onDelete?: (id: string) => void;
  onPress?: (delivery: Delivery) => void;
  onEdit?: (delivery: Delivery) => void;
  onEditArabicAddress?: (delivery: Delivery) => void;
  onStatusChange?: (id: string, status: 'NEW' | 'DELIVERED' | 'FAILED') => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
}

const numberToLetter = (n: number): string => {
  if (n < 1 || n > 26) return '?';
  return String.fromCharCode(64 + n); // 1=A, 2=B, ...
};

const DeliveryCard: React.FC<Props> = ({ delivery, onDelete, onPress, onEdit, onEditArabicAddress, onStatusChange, onMoveUp, onMoveDown }) => {
  const handleCall = () => {
    if (!delivery.phone || delivery.phone === 'غير معروف') {
      Alert.alert('تنبيه', 'لا يوجد رقم هاتف لهذه الكولية.');
      return;
    }
    const cleanPhone = delivery.phone.replace(/\s/g, '');
    const phoneUrl = `tel:${cleanPhone}`;
    Linking.canOpenURL(phoneUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(phoneUrl);
        } else {
          handleCopyPhone();
        }
      })
      .catch(() => handleCopyPhone());
  };

  const handleCopyPhone = async () => {
    if (!delivery.phone || delivery.phone === 'غير معروف') {
      Alert.alert('تنبيه', 'لا يوجد رقم هاتف.');
      return;
    }
    await Clipboard.setStringAsync(delivery.phone);
    Alert.alert('تم النسخ', `تم نسخ الرقم: ${delivery.phone}`);
  };

  const handleDeletePress = (e: any) => {
    e.stopPropagation?.();
    if (onDelete) {
      Alert.alert(
        'تأكيد الحذف',
        'هل تريد حذف هذه الكولية؟',
        [
          { text: 'إلغاء', style: 'cancel' },
          { text: 'نعم', style: 'destructive', onPress: () => onDelete(delivery.id) },
        ]
      );
    }
  };

  const handleEditPress = (e: any) => {
    e.stopPropagation?.();
    if (onEdit) {
      onEdit(delivery);
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(delivery)}
      activeOpacity={0.7}
    >
      <View style={styles.orderBadge}>
        <Text style={styles.orderText}>
          {delivery.order} ({numberToLetter(delivery.order)})
        </Text>
      </View>
      <View style={styles.info}>
        <View style={styles.headerRow}>
          <Text style={styles.name}>{delivery.name}</Text>
          <TouchableOpacity onPress={handleEditPress} style={styles.editButton}>
            <Text style={styles.editText}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeletePress} style={styles.deleteButton}>
            <Text style={styles.deleteText}>🗑️</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.address}>{delivery.address}</Text>
        {delivery.imagePath && (
          <Image
            source={{ uri: delivery.imagePath }}
            style={styles.deliveryImage}
            resizeMode="cover"
          />
        )}
        <TouchableOpacity
          onPress={() => onEditArabicAddress?.(delivery)}
          style={styles.arabicAddressButton}
        >
          <Text style={styles.arabicAddressText}>
            {delivery.arabicAddress ? `📍 ${delivery.arabicAddress}` : '➕ إضافة عنوان عربي'}
          </Text>
        </TouchableOpacity>
        <View style={styles.phoneRow}>
          <TouchableOpacity onPress={handleCall} style={styles.phoneButton}>
            <Text style={styles.phoneText}>📞 {delivery.phone}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCopyPhone} style={styles.copyButton}>
            <Text style={styles.copyText}>📋</Text>
          </TouchableOpacity>
        </View>
        {delivery.status && (
          <View style={styles.statusRow}>
            <View style={[
              styles.statusBadge,
              delivery.status === 'DELIVERED' ? styles.statusDelivered :
              delivery.status === 'FAILED' ? styles.statusFailed :
              styles.statusNew
            ]}>
              <Text style={styles.statusText}>
                {delivery.status === 'DELIVERED' ? '✓ تم التسليم' :
                 delivery.status === 'FAILED' ? '✗ فشل' : '⏳ جديد'}
              </Text>
            </View>
          </View>
        )}
        <View style={styles.statusButtonsRow}>
          <TouchableOpacity
            style={[styles.statusButton, styles.deliveredButton]}
            onPress={() => onStatusChange?.(delivery.id, 'DELIVERED')}
          >
            <Text style={styles.statusButtonText}>✓ تم</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statusButton, styles.failedButton]}
            onPress={() => onStatusChange?.(delivery.id, 'FAILED')}
          >
            <Text style={styles.statusButtonText}>✗ فشل</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.actionsRow}>
          <TouchableOpacity onPress={() => onMoveUp?.(delivery.id)} style={styles.arrowButton}>
            <Text style={styles.arrowText}>▲</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onMoveDown?.(delivery.id)} style={styles.arrowButton}>
            <Text style={styles.arrowText}>▼</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row-reverse',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'flex-start',
  },
  orderBadge: {
    backgroundColor: '#001F3F',
    minWidth: 55,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginLeft: 12,
  },
  orderText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  info: { flex: 1, alignItems: 'flex-end' },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  name: { fontSize: 16, fontWeight: 'bold', color: '#001F3F', marginBottom: 4 },
  deleteButton: { padding: 4 },
  deleteText: { fontSize: 18 },
  actionsRow: {
    flexDirection: 'column',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  arrowButton: {
    padding: 4,
  },
  arrowText: {
    fontSize: 16,
    color: '#001F3F',
    fontWeight: 'bold',
  },
  editButton: { padding: 4 },
  editText: { fontSize: 18 },
  address: { fontSize: 14, color: '#666', marginBottom: 6, textAlign: 'right' },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
    marginTop: 6,
    backgroundColor: '#eef2f6',
  },
  deliveryImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    marginTop: 8,
  },
  phoneRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 4 },
  phoneButton: {
    backgroundColor: '#e6f2ff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  phoneText: { fontSize: 14, color: '#007AFF', fontWeight: 'bold' },
  copyButton: {
    backgroundColor: '#e6f2ff',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  copyText: { fontSize: 16 },
  arabicAddressButton: {
    backgroundColor: '#fff2e6',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  arabicAddressText: {
    fontSize: 13,
    color: '#FF6B00',
    fontWeight: 'bold',
  },
  statusRow: { marginTop: 6, alignItems: 'flex-end' },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
  statusNew: { backgroundColor: '#E3F2FD' },
  statusDelivered: { backgroundColor: '#E8F5E9' },
  statusFailed: { backgroundColor: '#FFEBEE' },
  statusText: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  statusButtonsRow: { flexDirection: 'row-reverse', gap: 8, marginTop: 8 },
  statusButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, flex: 1, alignItems: 'center' },
  deliveredButton: { backgroundColor: '#34C759' },
  failedButton: { backgroundColor: '#FF3B30' },
  statusButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
});

export const DeliveryCardMemo = memo(DeliveryCard);