import { Ionicons, MaterialCommunityIcons as MCI } from '@expo/vector-icons';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
  Animated, Easing,
  Linking,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { Text, TextInput, useAppFonts } from './fonts';
import { HistoryScreen, shareApp, useHistory } from './history';

/* ---------- Brand & theme ---------- */
const BRAND = 'VitaCalc';
const VERSION = '1.0.0';
const SUPPORT = 'support@vitacalc.app'; // TODO: replace
const GRAD = ['#8B5CF6', '#FF6B5E'];
const T = {
  dark: { bg: '#16171B', card: '#202228', line: '#2F3139', text: '#F4EFE6', sub: '#A9A59D', input: '#1A1B20' },
  light: { bg: '#F4EFE6', card: '#FFFFFF', line: '#E2DBCF', text: '#24262C', sub: '#6E6B64', input: '#F8F5EF' },
};
const SEG = ['#5FB3A1', '#8B5CF6', '#E8B04B', '#FF6B5E'];

/* ---------- Date helpers (UTC, YYYY-MM-DD) ---------- */
const pd = (s) => {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec((s || '').trim());
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCMonth() === +m[2] - 1 ? d : null;
};
const today = () => { const n = new Date(); return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())); };
const iso = (d) => d.toISOString().slice(0, 10);
const fmt = (d) => d.toUTCString().slice(5, 16);
const dayDiff = (a, b) => Math.round((b - a) / 864e5);
const ymd = (a, b) => {
  let y = b.getUTCFullYear() - a.getUTCFullYear(), m = b.getUTCMonth() - a.getUTCMonth(), d = b.getUTCDate() - a.getUTCDate();
  if (d < 0) { m--; d += new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), 0)).getUTCDate(); }
  if (m < 0) { y--; m += 12; }
  return { y, m, d };
};
const r1 = (n) => Math.round(n * 10) / 10;
const SEX = ['Male', 'Female'];
const ACT = ['Sedentary', 'Light', 'Moderate', 'Active', 'Very active'];
const ACTF = [1.2, 1.375, 1.55, 1.725, 1.9];
const bmr = (v) => 10 * v.weight + 6.25 * v.height - 5 * v.age + (v.sex === 'Male' ? 5 : -161);

/* ---------- Calculators ---------- */
const base = [
  { k: 'sex', label: 'Sex', type: 'sel', opts: SEX, def: 'Male' },
  { k: 'age', label: 'Age', unit: 'Years', def: '28' },
  { k: 'height', label: 'Height', unit: 'cm', def: '172' },
  { k: 'weight', label: 'Weight', unit: 'kg', def: '70' },
];
const act = { k: 'act', label: 'Activity level', type: 'sel', opts: ACT, def: 'Moderate' };

const CALCS = [
  {
    id: 'bmi', title: 'BMI Calculator', icon: 'human-male-height', desc: 'Body mass index',
    fields: [
      { k: 'hu', label: 'Height unit', type: 'sel', opts: ['cm', 'ft + in'], def: 'cm' },
      { ...base[2], show: (v) => v.hu === 'cm' },
      { k: 'ft', label: 'Height', unit: 'ft', def: '5', show: (v) => v.hu === 'ft + in' },
      { k: 'inch', label: 'Height', unit: 'in', def: '8', zero: true, show: (v) => v.hu === 'ft + in' },
      base[3],
    ],
    run: (v) => {
      const h = v.hu === 'cm' ? v.height : (v.ft * 12 + v.inch) * 2.54;
      const m2 = (h / 100) ** 2, b = v.weight / m2;
      const cat = b < 18.5 ? 'Underweight' : b < 25 ? 'Healthy' : b < 30 ? 'Overweight' : 'Obese';
      return {
        main: r1(b), unit: 'BMI', note: cat,
        chart: { type: 'scale', value: b, min: 12, max: 40, segs: [['Under', 18.5], ['Healthy', 25], ['Over', 30], ['Obese', 40]] },
        table: [
          ['Underweight', 'Below 18.5', `Less than ${r1(18.5 * m2)} kg`, '#A9ADB1', b < 18.5],
          ['Healthy', '18.5 – 24.9', `${r1(18.5 * m2)} – ${r1(24.9 * m2)} kg`, '#4F7F0F', b >= 18.5 && b < 25],
          ['Overweight', '25.0 – 29.9', `${r1(25 * m2)} – ${r1(29.9 * m2)} kg`, '#0E4C6B', b >= 25 && b < 30],
          ['Obesity', '30.0 or above', `More than ${r1(29.9 * m2)} kg`, '#5B2B6E', b >= 30],
        ],
      };
    },
  },
  {
    id: 'bmr', title: 'BMR Calculator', icon: 'fire', desc: 'Calories at rest',
    fields: base,
    run: (v) => {
      const b = bmr(v);
      const D = ['Little or no exercise', 'Exercise 1–3 days/week', 'Exercise 3–5 days/week', 'Exercise 6–7 days/week', 'Hard exercise or physical job'];
      return {
        main: Math.round(b), unit: 'kcal / day', note: 'Mifflin-St Jeor equation',
        rows: [['Per hour', `${Math.round(b / 24)} kcal`]],
        chart: { type: 'bars', unit: 'kcal', data: [['Sed.', b * ACTF[0]], ['Light', b * ACTF[1]], ['Mod.', b * ACTF[2]], ['Active', b * ACTF[3]], ['V. active', b * ACTF[4]]] },
        levels: ACT.map((a, i) => [a, D[i], Math.round(b * ACTF[i])]),
        info: [
          ['What is BMR?', 'Basal Metabolic Rate is the number of calories your body burns at complete rest to keep you alive: breathing, circulation, temperature control and cell repair.'],
          ['How it is calculated', 'This app uses the Mifflin-St Jeor equation.\nMen: 10 × weight (kg) + 6.25 × height (cm) − 5 × age + 5\nWomen: 10 × weight (kg) + 6.25 × height (cm) − 5 × age − 161'],
          ['How to use it', 'Multiply your BMR by an activity factor to get your daily calorie needs (TDEE). Eating well below your BMR for long periods is not recommended without medical guidance.'],
          ['What affects BMR?', 'Age, sex, height, weight and muscle mass all matter. More muscle raises BMR, and BMR usually falls slowly with age. Genetics, hormones and illness can also change it.'],
        ],
      };
    },
  },
    {
    id: 'tdee', title: 'TDEE / Daily Calories', icon: 'lightning-bolt', desc: 'Total daily energy',
    fields: [...base, act],
    run: (v) => {
      const b = bmr(v), i = ACT.indexOf(v.act), t = b * ACTF[i];
      const L = ['Sedentary', 'Light Exercise', 'Moderate Exercise', 'Heavy Exercise', 'Athlete'];
      return {
        main: Math.round(t), unit: 'kcal / day', note: 'Maintenance calories',
        summary: `Based on your stats, the best estimate for your maintenance calories is ${Math.round(t).toLocaleString()} calories per day, using the Mifflin-St Jeor formula, which is widely considered one of the most accurate. The table below shows the difference if you had selected a different activity level.`,
        calTable: [['Basal Metabolic Rate', Math.round(b), false], ...L.map((n, k) => [n, Math.round(b * ACTF[k]), k === i])],
        chart: { type: 'bars', unit: 'kcal', data: [['Lose 0.5kg/wk', t - 550], ['Maintain', t], ['Gain 0.5kg/wk', t + 550]] },
        info: [
          ['What is TDEE?', 'Total Daily Energy Expenditure is the total number of calories you burn in a day, including your BMR, daily movement, exercise and digesting food.'],
          ['How to use it', 'Eat around your TDEE to maintain your weight. Eating 300–500 calories below it leads to gradual weight loss, and 250–500 above it supports weight gain.'],
          ['Choosing an activity level', 'Pick the level that matches a typical week for you. If you are unsure, choose the lower one, because most people overestimate how active they are.'],
        ],
      };
    },
  },
  {
    id: 'ideal', title: 'Ideal Weight', icon: 'scale-bathroom', desc: 'Healthy target weight',
    fields: [base[0], base[2]],
    run: (v) => {
      const inch = Math.max(0, v.height / 2.54 - 60), m = v.sex === 'Male';
      const d = [
        ['Devine', (m ? 50 : 45.5) + 2.3 * inch], ['Robinson', (m ? 52 : 49) + (m ? 1.9 : 1.7) * inch],
        ['Miller', (m ? 56.2 : 53.1) + (m ? 1.41 : 1.36) * inch], ['Hamwi', (m ? 48 : 45.5) + (m ? 2.7 : 2.2) * inch],
      ];
      const avg = d.reduce((s, x) => s + x[1], 0) / 4;
      return { main: r1(avg), unit: 'kg (average)', note: 'Average of four formulas', rows: d.map(([a, b]) => [a, `${r1(b)} kg`]), chart: { type: 'bars', unit: 'kg', data: d } };
    },
  },
  {
    id: 'fat', title: 'Body Fat Calculator', icon: 'water-percent', desc: 'US Navy method',
    fields: [
      base[0], base[2], base[3],
      { k: 'neck', label: 'Neck', unit: 'cm', def: '38' },
      { k: 'waist', label: 'Waist', unit: 'cm', def: '84' },
      { k: 'hip', label: 'Hip', unit: 'cm', def: '98', show: (v) => v.sex === 'Female' },
    ],
    run: (v) => {
      const m = v.sex === 'Male';
      const d = m ? v.waist - v.neck : v.waist + v.hip - v.neck;
      if (d <= 0) return { error: 'Waist must be larger than neck.' };
      const L = Math.log10;
      const bf = m ? 495 / (1.0324 - 0.19077 * L(d) + 0.15456 * L(v.height)) - 450
        : 495 / (1.29579 - 0.35004 * L(d) + 0.221 * L(v.height)) - 450;
      if (!(bf > 0 && bf < 70)) return { error: 'Check your measurements.' };
      const fat = (bf / 100) * v.weight;
      return {
        main: r1(bf), unit: '% body fat', note: bf < (m ? 14 : 21) ? 'Athletic to fit' : bf < (m ? 25 : 32) ? 'Average' : 'Above average',
        rows: [['Fat mass', `${r1(fat)} kg`], ['Lean mass', `${r1(v.weight - fat)} kg`]],
        chart: { type: 'donut', data: [['Fat', fat, SEG[3]], ['Lean', v.weight - fat, SEG[1]]], center: `${r1(bf)}%` },
      };
    },
  },
  {
    id: 'deficit', title: 'Calorie Deficit', icon: 'trending-down', desc: 'Plan your weight goal',
    fields: [
      { k: 'weight', label: 'Current weight', unit: 'kg', def: '80' },
      { k: 'goal', label: 'Goal weight', unit: 'kg', def: '72' },
      { k: 'weeks', label: 'Timeframe', unit: 'weeks', def: '12' },
      { k: 'tdee', label: 'Maintenance calories', unit: 'kcal', def: '2400' },
    ],
    run: (v) => {
      const diff = v.weight - v.goal, daily = (diff * 7700) / (v.weeks * 7), perWk = diff / v.weeks;
      const n = Math.min(Math.round(v.weeks), 8), step = v.weeks / n;
      const data = Array.from({ length: n + 1 }, (_, i) => [`W${Math.round(i * step)}`, v.weight - perWk * step * i]);
      const warn = Math.abs(perWk) > 1 ? 'Faster than 1 kg/week is hard to sustain; consider a longer timeframe.' : null;
      return {
        main: Math.abs(Math.round(daily)), unit: daily >= 0 ? 'kcal deficit / day' : 'kcal surplus / day', note: warn || 'Within a sustainable pace',
        rows: [['Daily target', `${Math.round(v.tdee - daily)} kcal`], ['Weekly change', `${r1(-perWk)} kg`]],
        chart: { type: 'bars', unit: 'kg', data, min: Math.min(v.weight, v.goal) - 5 },
      };
    },
  },
  {
    id: 'water', title: 'Water Intake', icon: 'cup-water', desc: 'Daily hydration goal',
    fields: [
      { k: 'weight', label: 'Weight', unit: 'kg', def: '70' },
      { k: 'mins', label: 'Exercise per day', unit: 'min', def: '30' },
    ],
    run: (v) => {
      const L = v.weight * 0.033 + (v.mins / 30) * 0.35;
      return {
        main: r1(L), unit: 'litres / day', note: `About ${Math.ceil((L * 1000) / 250)} glasses of 250 ml`,
        rows: [['In millilitres', `${Math.round(L * 1000)} ml`]],
        chart: { type: 'bars', unit: 'L', data: [['Morning', L * 0.35], ['Afternoon', L * 0.4], ['Evening', L * 0.25]] },
      };
    },
  },
  {
    id: 'age', title: 'Age Calculator', icon: 'cake-variant', desc: 'Exact age in days',
    fields: [
      { k: 'dob', label: 'Date of birth', type: 'date', def: '1995-06-15' },
      { k: 'on', label: 'Age on date', type: 'date', def: iso(today()) },
    ],
    run: (v) => {
      if (v.dob > v.on) return { error: 'Birth date must be before the other date.' };
      const a = ymd(v.dob, v.on);
      let nb = new Date(Date.UTC(v.on.getUTCFullYear(), v.dob.getUTCMonth(), v.dob.getUTCDate()));
      if (nb < v.on) nb = new Date(Date.UTC(v.on.getUTCFullYear() + 1, v.dob.getUTCMonth(), v.dob.getUTCDate()));
      return {
        main: a.y, unit: 'Years', note: `${a.m} Months, ${a.d} Days`,
        rows: [['Total days', `${dayDiff(v.dob, v.on).toLocaleString()}`], ['Total weeks', `${Math.floor(dayDiff(v.dob, v.on) / 7).toLocaleString()}`], ['Next birthday in', `${dayDiff(v.on, nb)} days`]],
      };
    },
  },
  {
    id: 'due', title: 'Pregnancy Due Date', icon: 'baby-face-outline', desc: 'Estimated delivery date',
    fields: [
      { k: 'lmp', label: 'First day of last period', type: 'date', def: iso(new Date(Date.now() - 70 * 864e5)) },
      { k: 'cycle', label: 'Cycle length', unit: 'days', def: '28' },
    ],
    run: (v) => {
      const edd = new Date(v.lmp.getTime() + (280 + (v.cycle - 28)) * 864e5);
      const d = dayDiff(v.lmp, today()), wk = Math.floor(d / 7);
      return {
        main: fmt(edd), unit: 'estimated due date', note: d < 0 ? 'Date is in the future' : d > 294 ? 'Past the typical term' : `${wk} weeks, ${d % 7} days along`,
        rows: [['Trimester', d < 0 ? '-' : wk < 14 ? 'First' : wk < 28 ? 'Second' : 'Third'], ['Days to go', `${Math.max(0, dayDiff(today(), edd))}`]],
        chart: { type: 'scale', value: Math.min(Math.max(wk, 0), 40), min: 0, max: 40, segs: [['T1', 13], ['T2', 27], ['T3', 40]] },
      };
    },
  },
  {
    id: 'macro', title: 'Macro Calculator', icon: 'food-apple-outline', desc: 'Protein, carbs and fat',
    fields: [
      { k: 'cal', label: 'Daily calories', unit: 'kcal', def: '2200' },
      { k: 'goal', label: 'Goal', type: 'sel', opts: ['Fat loss', 'Balanced', 'Muscle gain'], def: 'Balanced' },
    ],
    run: (v) => {
      const s = { 'Fat loss': [40, 30, 30], Balanced: [30, 40, 30], 'Muscle gain': [30, 45, 25] }[v.goal];
      const g = [(v.cal * s[0]) / 400, (v.cal * s[1]) / 400, (v.cal * s[2]) / 900];
      return {
        main: Math.round(g[0]), unit: 'g protein / day', note: `${s[0]}% protein, ${s[1]}% carbs, ${s[2]}% fat`,
        rows: [['Carbs', `${Math.round(g[1])} g`], ['Fat', `${Math.round(g[2])} g`]],
        chart: { type: 'donut', data: [['Protein', s[0], SEG[1]], ['Carbs', s[1], SEG[2]], ['Fat', s[2], SEG[3]]], center: `${v.cal}` },
      };
    },
  },
  {
    id: 'agediff', title: 'Age Difference', icon: 'account-switch-outline', desc: 'Gap between two people',
    fields: [
      { k: 'a', label: 'Date of birth (person 1)', type: 'date', def: '1990-03-12' },
      { k: 'b', label: 'Date of birth (person 2)', type: 'date', def: '1994-09-30' },
    ],
    run: (v) => {
      const [o, y] = v.a <= v.b ? [v.a, v.b] : [v.b, v.a];
      const d = ymd(o, y);
      return {
        main: `${d.y}y ${d.m}m`, unit: `and ${d.d} days apart`, note: `Person ${v.a <= v.b ? 1 : 2} is older`,
        rows: [['Total days', dayDiff(o, y).toLocaleString()], ['Total Months', `${d.y * 12 + d.m}`]],
      };
    },
  },
];

const DOCS = {
  about: ['About VitaCalc', `${BRAND} is a collection of simple, private health calculators: BMI, BMR, TDEE, ideal weight, body fat, calorie deficit, water intake, age, pregnancy due date, macros and age difference.\n\nAll formulas use metric units and run entirely on your device.`],
  privacy: ['Privacy Policy', `${BRAND} does not collect, store or share personal data. Values you type into calculators stay on your device and are cleared when you close the app.\n\nIf you contact support by email, we only use your message to reply to you.\n\nThis policy may be updated; the latest version will always be available in the app.`],
  disclaimer: ['Disclaimer', 'The results in this app are estimates based on general formulas and are provided for information only. They are not medical advice, diagnosis or treatment.\n\nBMI and body fat do not account for muscle mass, age or ethnicity. Pregnancy due dates are estimates; only a healthcare professional can confirm your dates.\n\nAlways consult a qualified doctor or dietitian before changing your diet, exercise or hydration, especially if you are pregnant or have a medical condition.'],
};

/* ---------- Small UI parts ---------- */
const Mark = ({ size = 44 }) => (
  <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: size, height: size, borderRadius: size * 0.3, alignItems: 'center', justifyContent: 'center' }}>
    <MCI name="heart-pulse" size={size * 0.58} color="#fff" />
  </LinearGradient>
);

const GradText = ({ children, style, numberOfLines }) => (
  <MaskedView style={{ flexShrink: 1 }} maskElement={<Text style={style} numberOfLines={numberOfLines}>{children}</Text>}>
    <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
      <Text style={[style, { opacity: 0 }]} numberOfLines={numberOfLines}>{children}</Text>
    </LinearGradient>
  </MaskedView>
);

const GradButton = ({ label, onPress, icon }) => (
  <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
    <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btn}>
      <Text style={s.btnTxt}>{label}</Text>
      {icon && <Ionicons name={icon} size={20} color="#fff" style={{ marginLeft: 8, marginTop: 8 }} />}
    </LinearGradient>
  </TouchableOpacity>
);

const Header = ({ c, dark, setDark, left, title, right }) => (
  <View style={s.header}>
    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
      {left}
      {typeof title === 'string' ? <GradText style={s.hTitle} numberOfLines={1}>{title}</GradText> : title}
    </View>
    {right}
    <TouchableOpacity onPress={() => setDark(!dark)} style={[s.iconBtn, { backgroundColor: c.card, borderColor: c.line }]} accessibilityLabel="Toggle dark mode">
      <Ionicons name={dark ? 'sunny-outline' : 'moon-outline'} size={20} color={c.text} />
    </TouchableOpacity>
  </View>
);
const IconBtn = ({ c, name, onPress, label }) => (
  <TouchableOpacity onPress={onPress} accessibilityLabel={label} style={[s.iconBtn, { backgroundColor: c.card, borderColor: c.line, marginRight: 8 }]}>
    <Ionicons name={name} size={20} color={c.text} />
  </TouchableOpacity>
);

/* ---------- Charts ---------- */
function Chart({ c, ch }) {
  if (ch.type === 'bars') {
    const min = ch.min || 0, max = Math.max(...ch.data.map((d) => d[1]));
    return (
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 150, justifyContent: 'space-around' }}>
        {ch.data.map(([l, val], i) => (
          <View key={l} style={{ alignItems: 'center', flex: 1 }}>
            <Text style={{ color: c.sub, fontSize: 11, marginBottom: 4 }}>{r1(val)}</Text>
            <View style={{ width: '60%', height: Math.max(6, ((val - min) / (max - min || 1)) * 100), borderRadius: 6, backgroundColor: SEG[i % 4] }} />
            <Text style={{ color: c.sub, fontSize: 10, marginTop: 6, textAlign: 'center' }} numberOfLines={1}>{l}</Text>
          </View>
        ))}
      </View>
    );
  }
  if (ch.type === 'scale') {
    let prev = ch.min;
    const pos = Math.min(1, Math.max(0, (ch.value - ch.min) / (ch.max - ch.min)));
    return (
      <View style={{ paddingTop: 14 }}>
        <View style={{ flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden' }}>
          {ch.segs.map(([l, mx], i) => { const w = mx - prev; prev = mx; return <View key={l} style={{ flex: w, backgroundColor: SEG[i % 4] }} />; })}
        </View>
        <View style={{ position: 'absolute', left: `${pos * 100}%`, top: 4, marginLeft: -6 }}>
          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c.text, borderWidth: 2, borderColor: c.card }} />
          <View style={{ width: 2, height: 22, backgroundColor: c.text, alignSelf: 'center' }} />
        </View>
        <View style={{ flexDirection: 'row', marginTop: 10 }}>
          {ch.segs.map(([l], i) => <Text key={l} style={{ flex: 1, color: c.sub, fontSize: 11 }}>{l}</Text>)}
        </View>
      </View>
    );
  }
  const total = ch.data.reduce((a, d) => a + d[1], 0), R = 52, C2 = 2 * Math.PI * R;
  let acc = 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }}>
      <View style={{ width: 140, height: 140, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={140} height={140} viewBox="0 0 140 140" style={{ transform: [{ rotate: '-90deg' }] }}>
          <Circle cx={70} cy={70} r={R} stroke={c.line} strokeWidth={20} fill="none" />
          {ch.data.map(([l, val, col]) => {
            const len = (val / total) * C2, el = (
              <Circle key={l} cx={70} cy={70} r={R} stroke={col} strokeWidth={20} fill="none" strokeDasharray={`${len} ${C2 - len}`} strokeDashoffset={-acc} />
            );
            acc += len; return el;
          })}
        </Svg>
        <Text style={{ position: 'absolute', color: c.text, fontWeight: '700', fontSize: 18 }}>{ch.center}</Text>
      </View>
      <View>
        {ch.data.map(([l, val, col]) => (
          <View key={l} style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 4 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: col, marginRight: 8 }} />
            <Text style={{ color: c.text, fontSize: 13 }}>{l} <Text style={{ color: c.sub }}>{Math.round((val / total) * 100)}%</Text></Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const WeightTable = ({ c, t }) => (
  <View style={{ marginTop: 16, borderRadius: 14, borderWidth: 1, borderColor: c.line, overflow: 'hidden' }}>
    <View style={{ flexDirection: 'row', padding: 12, backgroundColor: c.input }}>
      <Text style={{ flex: 1.2, color: c.sub, fontSize: 12, fontWeight: '700' }}>BMI Category</Text>
      <Text style={{ flex: 1, color: c.sub, fontSize: 12, fontWeight: '700' }}>Weight Range</Text>
    </View>
    {t.map(([name, bmi, range, col, on]) => (
      <View key={name} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, borderColor: c.line, backgroundColor: on ? '#8B5CF622' : 'transparent' }}>
        <View style={{ flex: 1.2, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 18, height: 18, borderRadius: 5, backgroundColor: col, marginRight: 10 }} />
          <View>
            <Text style={{ color: c.text, fontWeight: '600' }}>{name}</Text>
            <Text style={{ color: c.sub, fontSize: 11 }}>{bmi}</Text>
          </View>
        </View>
        <Text style={{ flex: 1, color: c.text, fontSize: 13 }}>{range}</Text>
      </View>
    ))}
  </View>
);

const ActivityTable = ({ c, l }) => (
  <View style={{ marginTop: 16, borderRadius: 14, borderWidth: 1, borderColor: c.line, overflow: 'hidden' }}>
    <View style={{ flexDirection: 'row', padding: 12, backgroundColor: c.input }}>
      <Text style={{ flex: 1.4, color: c.sub, fontSize: 12, fontWeight: '700' }}>Activity level</Text>
      <Text style={{ flex: 1, color: c.sub, fontSize: 12, fontWeight: '700', textAlign: 'right' }}>Calories / day</Text>
    </View>
    {l.map(([n, d, k]) => (
      <View key={n} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: 1, borderColor: c.line }}>
        <View style={{ flex: 1.4 }}>
          <Text style={{ color: c.text, fontWeight: '600' }}>{n}</Text>
          <Text style={{ color: c.sub, fontSize: 11 }}>{d}</Text>
        </View>
        <Text style={{ flex: 1, color: c.text, fontWeight: '700', textAlign: 'right' }}>{k.toLocaleString()} kcal</Text>
      </View>
    ))}
  </View>
);

const InfoBlock = ({ c, i }) => (
  <View style={{ marginTop: 16 }}>
    {i.map(([t, b]) => (
      <View key={t} style={{ marginBottom: 14 }}>
        <Text style={{ color: c.text, fontWeight: '700', marginBottom: 4 }}>{t}</Text>
        <Text style={{ color: c.sub, fontSize: 13, lineHeight: 20 }}>{b}</Text>
      </View>
    ))}
  </View>
);

const CalTable = ({ c, t }) => (
  <View style={{ marginTop: 16, borderRadius: 14, borderWidth: 1, borderColor: c.line, overflow: 'hidden' }}>
    {t.map(([n, k, on], i) => (
      <View key={n} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderTopWidth: i ? 1 : 0, borderColor: c.line, backgroundColor: on ? '#8B5CF622' : i === 0 ? c.input : 'transparent' }}>
        <Text style={{ color: c.text, fontWeight: on ? '700' : '500', flexShrink: 1, paddingRight: 8 }}>{n}</Text>
        <Text style={{ color: c.text, fontWeight: '700' }}>{k.toLocaleString()} <Text style={{ color: c.sub, fontWeight: '400', fontSize: 12 }}>cal / day</Text></Text>
      </View>
    ))}
  </View>
);

/* ---------- Screens ---------- */
function Splash({ onStart }) {
  const sc = useRef(new Animated.Value(0.4)).current, rot = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0)).current, btn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(sc, { toValue: 1, friction: 5, useNativeDriver: true }),
        Animated.timing(rot, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.timing(op, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(btn, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);
  const spin = rot.interpolate({ inputRange: [0, 1], outputRange: ['-90deg', '0deg'] });
  return (
    <View style={{ flex: 1, backgroundColor: T.dark.bg, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
      <Animated.View style={{ transform: [{ scale: sc }, { rotate: spin }] }}><Mark size={112} /></Animated.View>
      <Animated.View style={{ opacity: op, alignItems: 'center', marginTop: 28 }}>
        <Text style={{ color: T.dark.text, fontSize: 38, fontWeight: '800', letterSpacing: 0.5 }}><View style={{ width: '100%' }}>
          <GradText style={{ fontSize: 38, fontWeight: '800', letterSpacing: 0.5, textAlign: 'center' }}>{BRAND}</GradText>
        </View></Text>
        <Text style={{ color: T.dark.sub, fontSize: 15, marginTop: 6 }}>Making Health Calculations Simple</Text>
      </Animated.View>
      <Animated.View style={{ opacity: btn, width: '100%', marginTop: 56, transform: [{ translateY: btn.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
        <GradButton label="Let's Calculate" icon="arrow-forward" onPress={onStart} />
      </Animated.View>
    </View>
  );
}

function Home({ c, dark, setDark, go }) {
  return (
    <View style={{ flex: 1 }}>
      <Header c={c} dark={dark} setDark={setDark}
        title={<View style={{ flexDirection: 'row', alignItems: 'center' }}><Mark size={34} /><View style={{ marginLeft: 10 }}><GradText style={s.hTitle}>{BRAND}</GradText></View></View>}
        right={<><IconBtn c={c} name="time-outline" label="History" onPress={() => go('history')} /><IconBtn c={c} name="settings-outline" label="Settings" onPress={() => go('settings')} /></>} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <GradText style={s.hTitle}><Text style={{ color: c.text, fontSize: 24, fontWeight: '700' }}>Making Health Calculations Easy!</Text></GradText>
        <Text style={{ color: c.sub, marginTop: 4, marginBottom: 16 }}>{CALCS.length} Calculators, All on your Device.Enjoy Your Calculations !</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', }}>
          {CALCS.map((k) => (
            <Pressable key={k.id} onPress={() => go(k.id)} style={({ pressed }) => [s.tile, { backgroundColor: c.card, borderColor: c.line, opacity: pressed ? 0.7 : 1 }]}>
              <View style={[s.tileIcon, { backgroundColor: c.input }]}><MCI name={k.icon} size={26} color="#B79BFF" /></View>
              <Text style={{ color: c.text, fontWeight: '700', fontSize: 15, marginTop: 12 }}>{k.title}</Text>
              <Text style={{ color: c.sub, fontSize: 12, marginTop: 2 }}>{k.desc}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function Calc({ c, dark, setDark, calc, back, onSave }) {
  const [vals, setVals] = useState(Object.fromEntries(calc.fields.map((f) => [f.k, f.def])));
  const [res, setRes] = useState(null);
  const set = (k, x) => { setVals({ ...vals, [k]: x }); setRes(null); };
  useEffect(() => { if (res && !res.error) onSave(calc, vals, res); }, [res]);

  const submit = () => {
    const p = {};
    for (const f of calc.fields) {
      if (f.show && !f.show(vals)) continue;
      if (f.type === 'sel') p[f.k] = vals[f.k];
      else if (f.type === 'date') { p[f.k] = pd(vals[f.k]); if (!p[f.k]) return setRes({ error: `${f.label}: use YYYY-MM-DD.` }); }
      else { p[f.k] = parseFloat(vals[f.k]); if (!(p[f.k] > 0 || (f.zero && p[f.k] === 0))) return setRes({ error: `Enter a valid ${f.label.toLowerCase()}.` }); }
    }
    setRes(calc.run(p));
  };
  return (
    <View style={{ flex: 1 }}>
      <Header c={c} dark={dark} setDark={setDark} title={calc.title} left={<IconBtn c={c} name="chevron-back" label="Back" onPress={back} />} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={[s.card, { backgroundColor: c.card, borderColor: c.line }]}>
          {calc.fields.filter((f) => !f.show || f.show(vals)).map((f) => (
            <View key={f.k} style={{ marginBottom: 16 }}>
              <Text style={{ color: c.sub, fontSize: 13, marginBottom: 8 }}>{f.label}{f.unit ? ` (${f.unit})` : ''}</Text>
              {f.type === 'sel' ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {f.opts.map((o) => {
                    const on = vals[f.k] === o;
                    return (
                      <TouchableOpacity key={o} onPress={() => set(f.k, o)} style={[s.chip, { borderColor: on ? '#8B5CF6' : c.line, backgroundColor: on ? '#8B5CF622' : c.input }]}>
                        <Text style={{ color: on ? c.text : c.sub, fontWeight: on ? '700' : '400' }}>{o}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <TextInput value={vals[f.k]} onChangeText={(x) => set(f.k, x)} placeholder={f.type === 'date' ? 'YYYY-MM-DD' : '0'} placeholderTextColor={c.sub}
                  keyboardType={f.type === 'date' ? 'numbers-and-punctuation' : 'decimal-pad'} style={[s.input, { backgroundColor: c.input, borderColor: c.line, color: c.text }]} />
              )}
            </View>
          ))}
          <GradButton label="Calculate" onPress={submit} />
        </View>

        {res?.error && <Text style={{ color: '#FF6B5E', marginTop: 16, textAlign: 'center' }}>{res.error}</Text>}
        {res && !res.error && (
          <View style={[s.card, { backgroundColor: c.card, borderColor: c.line, marginTop: 16 }]}>
            <Text style={{ color: c.sub, fontSize: 13 }}>Your Result</Text>
            <Text style={{ color: c.text, fontSize: 44, fontWeight: '800', marginTop: 4 }}>{res.main}</Text>
            <Text style={{ color: c.text, fontSize: 15 }}>{res.unit}</Text>
            <Text style={{ color: c.sub, marginTop: 6 }}>{res.note}</Text>
            {res.chart && <View style={{ marginTop: 20 }}><Chart c={c} ch={res.chart} /></View>}
            {res.summary && <Text style={{ color: c.sub, fontSize: 13, lineHeight: 20, marginTop: 16 }}>{res.summary}</Text>}
            {res.calTable && <CalTable c={c} t={res.calTable} />}
            {res.levels && <ActivityTable c={c} l={res.levels} />}
            {res.table && <WeightTable c={c} t={res.table} />}
            {res.rows?.map(([a, b]) => (
              <View key={a} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderColor: c.line, marginTop: 8 }}>
                <Text style={{ color: c.sub }}>{a}</Text><Text style={{ color: c.text, fontWeight: '600' }}>{b}</Text>
              </View>
            ))}
            {res.info && <InfoBlock c={c} i={res.info} />}
            <Text style={{ color: c.sub, fontSize: 11, marginTop: 8 }}>Estimates only, not medical advice.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Settings({ c, dark, setDark, go }) {
  const Row = ({ icon, label, value, onPress, children }) => (
    <TouchableOpacity disabled={!onPress} onPress={onPress} style={[s.row, { borderColor: c.line }]}>
      <Ionicons name={icon} size={20} color={c.sub} style={{ width: 30 }} />
      <Text style={{ color: c.text, flex: 1, fontSize: 15 }}>{label}</Text>
      {value && <Text style={{ color: c.sub }}>{value}</Text>}
      {children}
      {onPress && <Ionicons name="chevron-forward" size={18} color={c.sub} />}
    </TouchableOpacity>
  );
  return (
    <View style={{ flex: 1 }}>
      <Header c={c} dark={dark} setDark={setDark} title="Settings" left={<IconBtn c={c} name="chevron-back" label="Back" onPress={() => go('home')} />} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={{ alignItems: 'center', marginVertical: 16 }}>
          <Mark size={72} />
          <Text style={{ color: c.text, fontSize: 26, fontWeight: '800', marginTop: 12 }}>{BRAND}</Text>
          <Text style={{ color: c.sub, marginTop: 2 }}>Version {VERSION}</Text>
        </View>
        <GradButton label="Open Calculators" icon="calculator-outline" onPress={() => go('home')} />
        <View style={[s.card, { backgroundColor: c.card, borderColor: c.line, marginTop: 20, paddingVertical: 4 }]}>
          <Row icon="moon-outline" label="Dark Mode"><Switch value={dark} onValueChange={setDark} trackColor={{ true: '#8B5CF6' }} /></Row>
          <Row icon="resize-outline" label="Units" value="Metric (kg, cm)" />
          <Row icon="time-outline" label="History" onPress={() => go('history')} />
          <Row icon="share-social-outline" label="Share App" onPress={shareApp} />
          <Row icon="information-circle-outline" label="About App" onPress={() => go('doc:about')} />
          <Row icon="pricetag-outline" label="App Version" value={VERSION} />
          <Row icon="mail-outline" label="Contact Support" onPress={() => Linking.openURL(`mailto:${SUPPORT}?subject=${BRAND} support`)} />
          <Row icon="shield-checkmark-outline" label="Privacy Policy" onPress={() => go('doc:privacy')} />
          <Row icon="medkit-outline" label="Disclaimer" onPress={() => go('doc:disclaimer')} />
        </View>
        <Text style={{ color: c.sub, textAlign: 'center', fontSize: 12, marginTop: 20 }}>© {new Date().getFullYear()} {BRAND}. Not a substitute for medical advice.</Text>
      </ScrollView>
    </View>
  );
}

function Doc({ c, dark, setDark, id, go }) {
  const [t, body] = DOCS[id];
  return (
    <View style={{ flex: 1 }}>
      <Header c={c} dark={dark} setDark={setDark} title={t} left={<IconBtn c={c} name="chevron-back" label="Back" onPress={() => go('settings')} />} />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={{ color: c.text, fontSize: 15, lineHeight: 24 }}>{body}</Text>
      </ScrollView>
    </View>
  );
}

/* ---------- App ---------- */
export default function App() {
  const [dark, setDark] = useState(true);
  const [screen, go] = useState('splash');
  const c = dark ? T.dark : T.light;
  const hist = useHistory();
  const [fontsLoaded] = useAppFonts();
  if (!fontsLoaded) return null;
  let view;
  if (screen === 'splash') view = <Splash onStart={() => go('home')} />;
  else if (screen === 'home') view = <Home c={c} dark={dark} setDark={setDark} go={go} />;
  else if (screen === 'settings') view = <Settings c={c} dark={dark} setDark={setDark} go={go} />;

  else if (screen === 'history') view = <HistoryScreen c={c} dark={dark} setDark={setDark} go={go} h={hist} Header={Header} IconBtn={IconBtn} Chart={Chart} />; else if (screen.startsWith('doc:')) view = <Doc c={c} dark={dark} setDark={setDark} id={screen.slice(4)} go={go} />;
  else view = <Calc key={screen} c={c} dark={dark} setDark={setDark} calc={CALCS.find((k) => k.id === screen)} back={() => go('home')} onSave={hist.add} />;
  const light = screen !== 'splash' && !dark;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: screen === 'splash' ? T.dark.bg : c.bg }}>
      <StatusBar barStyle={light ? 'dark-content' : 'light-content'} backgroundColor={screen === 'splash' ? T.dark.bg : c.bg} />
      {view}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  hTitle: { fontSize: 20, fontWeight: '800', flexShrink: 1, lineHeight: 26, includeFontPadding: false },
  iconBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginLeft: 8 },
  btn: { height: 54, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  btnTxt: { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 4 },
  tile: { width: '48%', borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 12 },
  tileIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 22, borderWidth: 1, padding: 18 },
  input: { height: 50, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, fontSize: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, marginRight: 8, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
});
