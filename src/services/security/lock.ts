/**
 * PIN + biometric storage via react-native-keychain (OS Keystore/Keychain-backed, encrypted at
 * rest). The PIN itself is stored as the Keychain password rather than a separate SHA-256 hash —
 * the OS-level encryption already protects it at least as well as an unsalted hash would.
 */
import * as Keychain from 'react-native-keychain';

const PIN_SERVICE = 'apnahisab.pin';
const BIOMETRIC_SERVICE = 'apnahisab.biometric';

export async function hasHardwareBiometrics(): Promise<boolean> {
  const type = await Keychain.getSupportedBiometryType();
  return type !== null;
}

export async function setPin(pin: string): Promise<void> {
  await Keychain.setGenericPassword('pin', pin, { service: PIN_SERVICE });
}

export async function verifyPin(pin: string): Promise<boolean> {
  const result = await Keychain.getGenericPassword({ service: PIN_SERVICE });
  return result !== false && result.password === pin;
}

export async function hasPin(): Promise<boolean> {
  return Keychain.hasGenericPassword({ service: PIN_SERVICE });
}

export async function clearPin(): Promise<void> {
  await Keychain.resetGenericPassword({ service: PIN_SERVICE });
}

/** Enrols a biometry-gated credential; reading it back (unlockWithBiometrics) prompts Face/Fingerprint. */
export async function enableBiometrics(): Promise<void> {
  await Keychain.setGenericPassword('biometric', 'enabled', {
    service: BIOMETRIC_SERVICE,
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
  });
}

export async function disableBiometrics(): Promise<void> {
  await Keychain.resetGenericPassword({ service: BIOMETRIC_SERVICE });
}

/** Resolves true on a successful biometric prompt, false on cancel/failure. */
export async function unlockWithBiometrics(): Promise<boolean> {
  try {
    const result = await Keychain.getGenericPassword({ service: BIOMETRIC_SERVICE });
    return result !== false;
  } catch {
    return false;
  }
}
