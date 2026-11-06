
// Database name
const DB_NAME = 'CarePointDatabase';

let db;


// Opens the existing CarePoint database
function openDatabase() {

    const request = indexedDB.open(DB_NAME, 1);

    request.onsuccess = function(event) {

        db = event.target.result;

        console.log('CarePointDatabase opened successfully.');

    };

    request.onerror = function() {

        console.error('Unable to open CarePointDatabase.');

    };
}


// Convert Base64 salt back into a Uint8Array
function fromBase64(value) {

    const binary = atob(value);

    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {

        bytes[i] = binary.charCodeAt(i);

    }

    return bytes;

}


// Verify the entered password against the stored hash
async function verifyPassword(password, passwordHash, passwordSalt) {

    const salt = fromBase64(passwordSalt);

    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
    );

    const hash = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 150000,
            hash: 'SHA-256'
        },
        key,
        256
    );

    const enteredHash = btoa(
        String.fromCharCode(...new Uint8Array(hash))
    );

    return enteredHash === passwordHash;

}


// Handles successful admin login
function completeAdminLogin() {

    sessionStorage.setItem('adminLoggedIn', 'true');
    sessionStorage.setItem('userRole', 'admin');

    window.location.href = 'admin.html';

}


// Handles admin login
function setupAdminLogin() {

    const form = document.getElementById('adminLoginForm');

    form.addEventListener('submit', function(event) {

        event.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const message = document.getElementById('loginMessage');

        message.textContent = '';

        // Ensures the database is available
        if (!db) {

            message.textContent = 'Database is not ready.';
            return;

        }

        // Accesses the Admin object store
        const transaction = db.transaction(['Admin'], 'readonly');

        const adminStore = transaction.objectStore('Admin');

        // Finds the admin using the entered username
        const request = adminStore.get(username);

        request.onsuccess = async function() {

            const admin = request.result;

            // Checks whether the admin exists and has hashed credentials
            if (!admin || !admin.passwordHash || !admin.passwordSalt) {

                message.textContent = 'Incorrect username or password.';
                return;

            }

            try {

                // Verify the entered password
                const passwordMatches = await verifyPassword(
                    password,
                    admin.passwordHash,
                    admin.passwordSalt
                );

                if (passwordMatches) {

                    completeAdminLogin();

                }
                else {

                    message.textContent = 'Incorrect username or password.';

                }

            }
            catch (error) {

                console.error('Admin password verification error:', error);

                message.textContent = 'Unable to verify login details.';

            }

        };

        request.onerror = function() {

            message.textContent = 'Unable to verify login details.';

        };

    });
}


// Starts the database connection
openDatabase();

// Set up the login form
setupAdminLogin();
