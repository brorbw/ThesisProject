#include <Particle.h>


void sixteenRandomBytes(unsigned char buf[16]) {
  for (int i = 0; i < 16; i++) {
    buf[i] = rand() & 0xff;
  }
}

// PKCS #7 padding
// Do this before encrypting to get the message
// up to a multiple of 16 bytes.
size_t pad(unsigned char *buf, size_t messageLength) {
  size_t paddedLength = (messageLength & ~15) + 16;
  char pad = paddedLength - messageLength;
  memset(buf + messageLength, pad, pad);
  return paddedLength;
}

void hexPrint(const unsigned char *buf, size_t len) {
  const char hex[] = "0123456789ABCDEF";
  for (size_t i = 0; i < len; i++) {
    char c = buf[i];
    char hexDigit = hex[(c >> 4) & 0xF];
    Serial.write(hexDigit);
    hexDigit = hex[c & 0xF];
    Serial.write(hexDigit);
    Serial.write(' ');
  }
  Serial.print("\r\n");
}

void demoAES() {
  aes_context aes;
  unsigned char key[16];
  unsigned char iv[16];
  unsigned char originalIV[16];
  unsigned char buf[48];

  // Create a new random key and initialization vector
  // every time this is called, just for fun.
  sixteenRandomBytes(key);
  sixteenRandomBytes(iv);
  memcpy(originalIV, iv, 16);

  Serial.println("Key:");
  hexPrint(key, 16);

  Serial.println("\nIV:");
  hexPrint(iv, 16);

  // Our super secret message goes into buf
  const char *original = "Hey! What a great demo! I can do encryption!";
  int length = strlen(original) + 1; // include null terminating byte
  memcpy(buf, original, length);

  // Esoterica: add PKCS #7 padding
  size_t paddedLength = pad(buf, length);

  // Print the plaintext directly
  Serial.println("\nPlaintext:");
  Serial.println((const char *)buf);

  // Print the plaintext as hex
  hexPrint(buf, paddedLength);

  // Encrypt
  aes_setkey_enc(&aes, key, 128);
  aes_crypt_cbc(&aes, AES_ENCRYPT, paddedLength, iv, buf, buf);

  // Print the ciphertext directly
  Serial.println("\nCiphertext:");
  Serial.println((const char *)buf);

  // Print the ciphertext as hex
  hexPrint(buf, paddedLength);

  // Decrypt
  // IV has been modified, so use original copy
  aes_setkey_dec(&aes, key, 128);
  aes_crypt_cbc(&aes, AES_DECRYPT, paddedLength, originalIV, buf, buf);

  // Print the plaintext directly
  Serial.println("\nPlaintext (after decrypting):");
  Serial.println((const char *)buf);

  // Print the plaintext as hex
  hexPrint(buf, paddedLength);

  Serial.println("\n-------------\n");
}

void setup() {
  Serial.begin(115200);
}

void loop() {
  static int t = millis();
  if (millis() - t > 10000) {
    demoAES();
    t = millis();
  }
}
