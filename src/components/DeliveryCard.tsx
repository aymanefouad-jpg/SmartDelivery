import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert, Image } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Delivery } from '../types';

interface Props {
  delivery: Delivery;
  onDelete?: (id: string) => void;
  onPress?: (delivery: Delivery) => void;
  onEdit?: (delivery: Delivery) => void;
}

const DeliveryCard: React.FC<Props> = ({ delivery, onDelete, onPress, onEdit }) => {
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
        <Text style={styles.orderText}>{delivery.order}</Text>
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
        <View style={styles.phoneRow}>
          <TouchableOpacity onPress={handleCall} style={styles.phoneButton}>
            <Text style={styles.phoneText}>📞 {delivery.phone}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCopyPhone} style={styles.copyButton}>
            <Text style={styles.copyText}>📋</Text>
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
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  orderText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
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
});

export const DeliveryCardMemo = memo(DeliveryCard);