// AES-256-GCM encryption for medical records

const ENCRYPTION_DB = "CarePointEncryptionKeys";
const KEY_ID = "medical-records-key";

let encryptionKey;
let keyPromise;

// Opens the encryption key database.
function openKeyDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(ENCRYPTION_DB, 1);

        request.onupgradeneeded = function(event) {
            const database = event.target.result;

            database.createObjectStore("keys", {
                keyPath: "id"
            });
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Get or generate the AES-256 encryption key.
async function getEncryptionKey() {

    if (encryptionKey) return encryptionKey;

    if (!keyPromise) {
        keyPromise = (async function() {

            const database = await openKeyDatabase();

            const existingKey = await new Promise((resolve, reject) => {
                const transaction = database.transaction("keys", "readonly");
                const request = transaction.objectStore("keys").get(KEY_ID);

                request.onsuccess = () => resolve(request.result?.key);
                request.onerror = () => reject(request.error);
            });

            if (existingKey) {
                database.close();
                return existingKey;
            }

            const newKey = await crypto.subtle.generateKey(
                {
                    name: "AES-GCM",
                    length: 256
                },
                false,
                ["encrypt", "decrypt"]
            );

            await new Promise((resolve, reject) => {
                const transaction = database.transaction("keys", "readwrite");

                transaction.objectStore("keys").put({
                    id: KEY_ID,
                    key: newKey
                });

                transaction.oncomplete = resolve;
                transaction.onerror = () => reject(transaction.error);
            });

            database.close();
            return newKey;

        })().catch(error => {
            keyPromise = null;
            throw error;
        });
    }

    encryptionKey = await keyPromise;
    return encryptionKey;
}

// Converts bytes to Base64.
function bytesToBase64(bytes) {
    let binary = "";

    bytes.forEach(byte => {
        binary += String.fromCharCode(byte);
    });

    return btoa(binary);
}

// Convert Base64 to bytes.
function base64ToBytes(value) {
    const binary = atob(value);

    return Uint8Array.from(binary, character =>
        character.charCodeAt(0)
    );
}

// Encrypts medical information.
async function encryptText(text) {

    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        new TextEncoder().encode(String(text ?? ""))
    );

    return {
        encrypted: true,
        algorithm: "AES-256-GCM",
        iv: bytesToBase64(iv),
        data: bytesToBase64(new Uint8Array(encrypted))
    };
}

// Decrypts stored medical information.
async function decryptText(record) {

    if (record === null || record === undefined) {
        return "";
    }

    // Supports older records that were saved without encryption.
    if (typeof record === "string") {
        return record;
    }

    const key = await getEncryptionKey();

    const decrypted = await crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: base64ToBytes(record.iv)
        },
        key,
        base64ToBytes(record.data)
    );

    return new TextDecoder().decode(decrypted);
}
