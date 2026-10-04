import { useState } from 'react';
import { Platform, View } from 'react-native';

/* The native module is missing in Expo Go; loading it safely means the app still runs there, just without ads. */
let Ads = null;
try { Ads = require('react-native-google-mobile-ads'); } catch (e) { Ads = null; }

/* ===== Switch to real ads: set TEST = false and fill in your own unit IDs below ===== */
const TEST = true;
const REAL = {
  banner: Platform.select({ android: 'ca-app-pub-XXXXXXXXXXXXXXXX/BBBBBBBBBB', ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/BBBBBBBBBB' }),
  interstitial: Platform.select({ android: 'ca-app-pub-XXXXXXXXXXXXXXXX/IIIIIIIIII', ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/IIIIIIIIII' }),
};
const unit = (k) => (TEST || !Ads ? (k === 'banner' ? Ads?.TestIds.BANNER : Ads?.TestIds.INTERSTITIAL) : REAL[k]);

/* ---------- Banner ---------- */
export function AdBanner() {
  const [failed, setFailed] = useState(false);
  if (!Ads || failed) return null;
  const { BannerAd, BannerAdSize } = Ads;
  return (
    <View style={{ alignItems: 'center', minHeight: 50 }}>
      <BannerAd
        unitId={unit('banner')}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
}

/* ---------- Interstitial ---------- */
let inter = null, ready = false, count = 0;

function load() {
  if (!Ads) return;
  try {
    inter = Ads.InterstitialAd.createForAdRequest(unit('interstitial'), { requestNonPersonalizedAdsOnly: true });
    inter.addAdEventListener(Ads.AdEventType.LOADED, () => { ready = true; });
    inter.addAdEventListener(Ads.AdEventType.CLOSED, () => { ready = false; load(); });
    inter.addAdEventListener(Ads.AdEventType.ERROR, () => { ready = false; setTimeout(load, 30000); });
    inter.load();
  } catch (e) {}
}

export const initAds = () => {
  if (!Ads) return;
  Ads.default().initialize().then(load).catch(() => {});
};

/* Call each time the user finishes a calculation; shows an ad every `every` calls if one is ready */
export const maybeShowInterstitial = (every = 3) => {
  count += 1;
  if (ready && inter && count % every === 0) { try { inter.show(); } catch (e) {} }
};