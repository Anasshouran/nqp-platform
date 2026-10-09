/** جذر التطبيق — Provider + قشرة التنقل + تطبيق RTL. */
import { I18nManager, StyleSheet, View } from 'react-native';
import { Provider } from 'react-redux';
import { store } from './src/state';
import { AppShell } from './src/navigation/AppShell';
import { StatusBar } from 'expo-status-bar';

// عربي أول: تفعيل RTL البيئي عند الإمكان. ملاحظة: تغيير اللغة ديناميكياً على
// منصة أصلية يتطلب إعادة تحميل كاملة في بعض إصدارات RN — نطبّق التخطيط
// الاتجاهي على مستوى المكوّنات (rowReverse/درع RTL) للمزامنة الفورية.
try {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
} catch {
  // منصة بلا I18nManager — التخطيط الاتجاهي يعمل على مستوى المكوّنات.
}

export default function App() {
  return (
    <Provider store={store}>
      <View style={styles.root} testID="app-root">
        <StatusBar style="auto" />
        <AppShell />
      </View>
    </Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});