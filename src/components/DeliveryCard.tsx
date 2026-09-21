import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import { Delivery } from '../types';

interface DeliveryCardProps {
  delivery: Delivery;
  onDelete: (id: string) => void;
}

export const DeliveryCard: React.FC<DeliveryCardProps> = ({ delivery, onDelete }) => {
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
          Alert.alert('خطأ', 'لا يمكن فتح تطبيق الاتصال.');
        }
      })
      .catch(() => {
        Alert.alert('خطأ', 'حدثت مشكلة أثناء محاولة الاتصال.');
      });
  };

  const handleDelete = () => {
    Alert.alert(
      'تأكيد الحذف',
      'هل تريد حذف هذه الكولية؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'نعم', style: 'destructive', onPress: () => onDelete(delivery.id) },
      ]
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.orderBadge}>
          <Text style={styles.orderText}>{delivery.order}</Text>
        </View>
        <Text style={styles.name} numberOfLines={1}>{delivery.name}</Text>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.divider} />
      <View style={styles.infoRow}>
        <Text style={styles.label}>العنوان:</Text>
        <Text style={styles.value} numberOfLines={2}>{delivery.address}</Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.label}>الهاتف:</Text>
        <TouchableOpacity onPress={handleCall} style={styles.phoneButton}>
          <Text style={styles.phoneText}>📞 {delivery.phone}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e8eef5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e88e5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  orderText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a237e',
    flex: 1,
    textAlign: 'right',
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#e8eef5',
    marginVertical: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#546e7a',
    fontWeight: '500',
    width: 60,
    textAlign: 'right',
  },
  value: {
    fontSize: 14,
    color: '#263238',
    flex: 1,
    textAlign: 'right',
    marginRight: 8,
  },
  phoneWrapper: {
    flex: 1,
    textAlign: 'right',
  },
  phoneButton: {
    backgroundColor: '#e6f2ff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  phoneText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});