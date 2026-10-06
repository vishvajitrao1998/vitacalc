import { Ionicons, MaterialCommunityIcons as MCI } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, ScrollView, Share, TouchableOpacity, View } from 'react-native';
import { Text } from './fonts';
const NAME = 'VitaCalc';
const KEY = 'vitacalc_history';
// TODO: replace with your real store link
export const APP_LINK = 'https://play.google.com/store/apps/details?id=com.yourname.vitacalc';

export const shareApp = () =>
  Share.share({ message: `Check out ${NAME} – simple, private health calculators: ${APP_LINK}` });

const stamp = (t) => new Date(t).toLocaleString();
const q = (x) => `"${String(x).replace(/"/g, '""')}"`;

/* Writes a real file to the cache folder, then opens the share sheet (save to Files/Drive, send, etc.) */
async function exportFile(ext, text, mime) {
  try {
    const name = `${NAME}-history-${new Date().toISOString().slice(0, 10)}.${ext}`;
    const uri = FileSystem.cacheDirectory + name;
    await FileSystem.writeAsStringAsync(uri, text);
    if (!(await Sharing.isAvailableAsync())) return Alert.alert('Not available', 'File sharing is not supported on this device.');
    await Sharing.shareAsync(uri, { mimeType: mime, dialogTitle: name });
  } catch (e) {
    Alert.alert('Export failed', String((e && e.message) || e));
  }
}

/* Holds the list, persists it, and exposes add / remove / export / clear */
export function useHistory() {
  const [list, setList] = useState([]);
  const ref = useRef([]);
  const put = (n) => { ref.current = n; setList(n); AsyncStorage.setItem(KEY, JSON.stringify(n)).catch(() => {}); };

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((x) => { if (x) { ref.current = JSON.parse(x); setList(ref.current); } }).catch(() => {});
  }, []);

  const add = (calc, vals, res) => {
    const inputs = calc.fields.filter((f) => !f.show || f.show(vals)).map((f) => `${f.label}: ${vals[f.k]}${f.unit ? ' ' + f.unit : ''}`).join(', ');
    const rows = res.rows || [];
    const result = [`${res.main} ${res.unit}`, res.note, ...rows.map(([a, b]) => `${a}: ${b}`)].filter(Boolean);
    put([{ id: String(Date.now()), calc: calc.title, icon: calc.icon, t: Date.now(), inputs, main: res.main, unit: res.unit, note: res.note, rows, chart: res.chart || null, result }, ...ref.current].slice(0, 500));
  };
  const remove = (id) => put(ref.current.filter((x) => x.id !== id));
  const none = () => { if (ref.current.length) return false; Alert.alert('No history', 'Do a calculation first.'); return true; };
  const exportTxt = () => !none() && exportFile('txt', ref.current.map((h) => `[${h.calc}] ${stamp(h.t)}\nInputs: ${h.inputs}\n${h.result.join('\n')}`).join('\n\n----\n\n'), 'text/plain');
  const exportCsv = () => !none() && exportFile('csv', '\uFEFF' + ['Date,Calculator,Inputs,Results', ...ref.current.map((h) => [stamp(h.t), h.calc, h.inputs, h.result.join(' | ')].map(q).join(','))].join('\n'), 'text/csv');
  const clear = () => !none() && Alert.alert('Delete all history?', 'This cannot be undone.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete all', style: 'destructive', onPress: () => put([]) }]);

  return { list, add, remove, exportTxt, exportCsv, clear };
}

export function HistoryScreen({ c, dark, setDark, go, h, Header, IconBtn, Chart }) {
  const [sel, setSel] = useState(null);
  useEffect(() => {
  if (!sel) return;
  const sub = BackHandler.addEventListener('hardwareBackPress', () => { setSel(null); return true; });
  return () => sub.remove();
}, [sel]);
  const card = { backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: 22, padding: 18 };

  if (sel) {
    return (
      <View style={{ flex: 1 }}>
        <Header c={c} dark={dark} setDark={setDark} title={sel.calc} left={<IconBtn c={c} name="chevron-back" label="Back" onPress={() => setSel(null)} />} />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View style={card}>
            <Text style={{ color: c.sub, fontSize: 12 }}>{stamp(sel.t)}</Text>
            <Text style={{ color: c.sub, fontSize: 13, marginTop: 10 }}>Inputs</Text>
            <Text style={{ color: c.text, fontSize: 13, marginTop: 2 }}>{sel.inputs}</Text>
          </View>
          <View style={[card, { marginTop: 16 }]}>
            <Text style={{ color: c.sub, fontSize: 13 }}>Result</Text>
            <Text style={{ color: c.text, fontSize: 44, fontWeight: '800', marginTop: 4 }}>{sel.main ?? sel.result[0]}</Text>
            {!!sel.unit && <Text style={{ color: c.text, fontSize: 15 }}>{sel.unit}</Text>}
            {!!sel.note && <Text style={{ color: c.sub, marginTop: 6 }}>{sel.note}</Text>}
            {sel.chart && <View style={{ marginTop: 20 }}><Chart c={c} ch={sel.chart} /></View>}
            {(sel.rows || []).map(([a, b]) => (
              <View key={a} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderColor: c.line, marginTop: 8 }}>
                <Text style={{ color: c.sub }}>{a}</Text><Text style={{ color: c.text, fontWeight: '600' }}>{b}</Text>
              </View>
            ))}
            {sel.main === undefined && sel.result.slice(1).map((r, i) => <Text key={i} style={{ color: c.text, marginTop: 6 }}>{r}</Text>)}
          </View>
        </ScrollView>
      </View>
    );
  }

  const btns = [['Export TXT', h.exportTxt, '#8B5CF6'], ['Export CSV', h.exportCsv, '#8B5CF6'], ['Delete all', h.clear, '#FF6B5E']];
  return (
    <View style={{ flex: 1 }}>
      <Header c={c} dark={dark} setDark={setDark} title="History" left={<IconBtn c={c} name="chevron-back" label="Back" onPress={() => go('home')} />} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', marginBottom: 16 }}>
          {btns.map(([l, fn, col], i) => (
            <TouchableOpacity key={l} onPress={fn} style={{ flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: col, alignItems: 'center', justifyContent: 'center', marginRight: i < 2 ? 8 : 0 }}>
              <Text style={{ color: col, fontWeight: '700', fontSize: 13 }}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {!h.list.length && <Text style={{ color: c.sub, textAlign: 'center', marginTop: 40 }}>No calculations yet.</Text>}
        {h.list.map((x) => (
          <View key={x.id} style={[card, { padding: 14, borderRadius: 18, marginBottom: 10 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: c.input, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                <MCI name={x.icon} size={20} color="#B79BFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.text, fontWeight: '700' }}>{x.calc}</Text>
                <Text style={{ color: c.sub, fontSize: 11 }}>{stamp(x.t)}</Text>
              </View>
              <TouchableOpacity onPress={() => h.remove(x.id)} accessibilityLabel="Delete entry"><Ionicons name="close" size={20} color={c.sub} /></TouchableOpacity>
            </View>
            <Text style={{ color: c.sub, fontSize: 12, marginTop: 10 }}>{x.inputs}</Text>
            <Text style={{ color: c.text, fontSize: 15, fontWeight: '700', marginTop: 4 }}>{x.result[0]}</Text>
            <TouchableOpacity onPress={() => setSel(x)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 40, borderRadius: 12, borderWidth: 1, borderColor: '#8B5CF6', marginTop: 12 }}>
              <Ionicons name="eye-outline" size={18} color="#8B5CF6" />
              <Text style={{ color: '#8B5CF6', fontWeight: '700', marginLeft: 6 }}>View Details</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}