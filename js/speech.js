// Reading Spanish aloud with the browser's own voices (the Web Speech API):
// no server and no cost, but which voices exist depends on the device.

const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
const LOCALE = { mx: 'es-MX', es: 'es-ES' };
// Latin American voices other than Mexico's are closer to it than Spain's.
const NEAR_MEXICO = /^es-(us|419|co|ar|cl|pe|ve)$/;

export const RATE = 0.9; // a little slower than conversation
export const SLOW_RATE = 0.6;

export const canSpeak = () => Boolean(synth && typeof window.SpeechSynthesisUtterance === 'function');

const langOf = (voice) => voice.lang.replace('_', '-').toLowerCase();

/**
 * The best voice for a region: its own country, then (for Mexico) another
 * Latin American one, then any Spanish voice. Undefined while the browser is
 * still loading its voices; null when it has no Spanish voice at all.
 */
function voiceFor(region) {
  const voices = synth.getVoices();
  if (!voices.length) return undefined;
  const want = LOCALE[region] ?? LOCALE.mx;
  const spanish = voices.filter((v) => langOf(v).startsWith('es'));
  return (
    spanish.find((v) => langOf(v) === want.toLowerCase()) ??
    (region !== 'es' ? spanish.find((v) => NEAR_MEXICO.test(langOf(v))) : undefined) ??
    spanish[0] ??
    null
  );
}

/**
 * Read `text` aloud in the accent of `region` ('mx', 'es'; 'both' reads as
 * Mexico). Returns false when the device has no Spanish voice.
 */
export function speak(text, { region = 'mx', rate = RATE } = {}) {
  if (!canSpeak()) return false;
  const voice = voiceFor(region);
  if (voice === null) return false;
  synth.cancel(); // a new request replaces whatever is playing
  const u = new SpeechSynthesisUtterance(text);
  u.lang = voice?.lang ?? LOCALE[region] ?? LOCALE.mx;
  if (voice) u.voice = voice;
  u.rate = rate;
  synth.speak(u);
  return true;
}

export function stopSpeaking() {
  if (canSpeak()) synth.cancel();
}
