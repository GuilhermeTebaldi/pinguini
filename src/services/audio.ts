import { Audio } from 'expo-av';

const soundSources = {
  launchStrong: require('../../assets/sounds/sombom1.mp3'),
  launchNice: require('../../assets/sounds/somlegal2.mp3'),
  launchBad: require('../../assets/sounds/sommal3.mp3'),
  headCrash: require('../../assets/sounds/somdecabeca.mp3'),
  ambient: require('../../assets/sounds/ambiente.mp3'),
  ambient2: require('../../assets/sounds/ambiente2.mp3'),
  arrival: require('../../assets/sounds/somchegada.mp3'),
} as const;

type SoundKey = keyof typeof soundSources;
type LaunchVariant = 'strong' | 'nice' | 'bad';
type AmbientVariant = 'primary' | 'secondary';

const variantKeyMap: Record<LaunchVariant, SoundKey> = {
  strong: 'launchStrong',
  nice: 'launchNice',
  bad: 'launchBad',
};

const soundInstances: Partial<Record<SoundKey, Audio.Sound>> = {};
const loadPromises: Partial<Record<SoundKey, Promise<Audio.Sound | undefined>>> = {};
let ambientSound: Audio.Sound | undefined;
let audioConfigured = false;
let ambientUnlockListener: (() => void) | null = null;
let pendingAmbientVariant: AmbientVariant = 'primary';

async function ensureAudioMode() {
  if (audioConfigured) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      allowsRecordingIOS: false,
    });
  } catch (error) {
    console.warn('[Audio] failed to configure audio mode', error);
  }
  audioConfigured = true;
}

async function loadSound(key: SoundKey): Promise<Audio.Sound | undefined> {
  if (soundInstances[key]) return soundInstances[key];
  if (!loadPromises[key]) {
    loadPromises[key] = Audio.Sound.createAsync(soundSources[key])
      .then(({ sound }) => {
        soundInstances[key] = sound;
        return sound;
      })
      .catch((error) => {
        console.warn(`[Audio] failed to load ${key}`, error);
        return undefined;
      });
  }
  return loadPromises[key];
}

function setupAmbientUnlock() {
  if (ambientSound || ambientUnlockListener) return;
  if (typeof document === 'undefined' || !document.addEventListener) return;

  const handler = () => {
    if (ambientUnlockListener) {
      ambientUnlockListener();
      ambientUnlockListener = null;
    }
    void startAmbientSound(pendingAmbientVariant);
  };

  document.addEventListener('pointerdown', handler, { once: true });
  ambientUnlockListener = () => document.removeEventListener('pointerdown', handler);
}

async function playSound(key: SoundKey) {
  try {
    await ensureAudioMode();
    const sound = await loadSound(key);
    if (!sound) return;
    await sound.replayAsync();
  } catch (error) {
    console.warn(`[Audio] failed to play ${key}`, error);
  }
}

export async function configureAudio() {
  await ensureAudioMode();
  // preload ambient tracks so the gesture handler can play them immediately
  void loadSound('ambient');
  void loadSound('ambient2');
}

const ambientKeyMap: Record<AmbientVariant, SoundKey> = {
  primary: 'ambient',
  secondary: 'ambient2',
};

const AMBIENT_VOLUME = 0.2;

export async function startAmbientSound(variant: AmbientVariant = 'primary') {
  pendingAmbientVariant = variant;
  const key = ambientKeyMap[variant];
  const cached = ambientSound ?? soundInstances[key];
  if (!cached) {
    void loadSound(key);
    setupAmbientUnlock();
    return;
  }

  ambientSound = cached;
  try {
    await ensureAudioMode();
    await ambientSound.setIsLoopingAsync(true);
    await ambientSound.setVolumeAsync(AMBIENT_VOLUME);
    await ambientSound.playAsync();
  } catch (error) {
    console.warn('[Audio] failed to start ambient sound', error);
    setupAmbientUnlock();
  }
}

export async function startSecondaryAmbientSound() {
  await startAmbientSound('secondary');
}

export async function stopAmbientSound() {
  if (!ambientSound) return;
  try {
    await ambientSound.stopAsync();
    await ambientSound.setPositionAsync(0);
    ambientSound = undefined;
  } catch (error) {
    console.warn('[Audio] failed to stop ambient sound', error);
  }
  if (ambientUnlockListener) {
    ambientUnlockListener();
    ambientUnlockListener = null;
  }
}

export async function cleanupSounds() {
  await stopAmbientSound();
  const sounds = Object.values(soundInstances).filter(Boolean) as Audio.Sound[];
  await Promise.all(sounds.map((sound) => sound.unloadAsync()));
  Object.keys(soundInstances).forEach((key) => delete soundInstances[key as SoundKey]);
  Object.keys(loadPromises).forEach((key) => delete loadPromises[key as SoundKey]);
  ambientSound = undefined;
  audioConfigured = false;
}

const EFFECT_VOLUME = 0.20;

async function playEffectByKey(key: SoundKey) {
  await playSound(key);
  const sound = soundInstances[key];
  if (!sound) return;
  try {
    await sound.setVolumeAsync(EFFECT_VOLUME);
  } catch {}
}

export async function playLaunchSound(variant: LaunchVariant) {
  await playEffectByKey(variantKeyMap[variant]);
}

export async function playHeadCrash() {
  await playEffectByKey('headCrash');
}

export async function playArrivalSound() {
  await playEffectByKey('arrival');
}
