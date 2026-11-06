const DB_NAME = 'CarePointDatabase';

let db;

// Encrypt a username and store it as a string.
async function encryptAdminUsername(username) {

    const encrypted = await encryptText(username);

    return "ENC:" + JSON.stringify(encrypted);
}

// Decrypt a username, including support for older plaintext records.
async function decryptAdminUsername(username) {

    if (!username.startsWith("ENC:")) {
        return username;
    }

    const encrypted = JSON.parse(username.substring(4));

    return await decryptText(encrypted);
}

// Retrieve all admin accounts.
function getAllAdmins() {

    return new Promise(function(resolve, reject) {

        const transaction = db.transaction(["Admin"], "readonly");
        const store = transaction.objectStore("Admin");
        const request = store.getAll();

        request.onsuccess = function() {
            resolve(request.result);
        };

        request.onerror = function() {
            reject(request.error);
        };

    });
}

// Encrypt existing admin usernames.
async function migrateAdminUsernames() {

    const admins = await getAllAdmins();
    const recordsToUpdate = [];

    for (const admin of admins) {

        if (!admin.username.startsWith("ENC:")) {

            const encryptedUsername =
                await encryptAdminUsername(admin.username);

            recordsToUpdate.push({
                oldUsername: admin.username,
                newRecord: {
                    ...admin,
                    username: encryptedUsername
                }
            });

        }

    }

    if (recordsToUpdate.length === 0) {
        return;
    }

    return new Promise(function(resolve, reject) {

        const transaction = db.transaction(["Admin"], "readwrite");
        const store = transaction.objectStore("Admin");

        recordsToUpdate.forEach(function(record) {

            // Remove the old plaintext key.
            store.delete(record.oldUsername);

            // Save the encrypted username instead.
            store.add(record.newRecord);

        });

        transaction.oncomplete = resolve;

        transaction.onerror = function() {
            reject(transaction.error);
        };

        transaction.onabort = function() {
            reject(transaction.error);
        };

    });
}

// Open the existing CarePoint database.
function openDatabase() {

    const request = indexedDB.open(DB_NAME, 1);

    request.onsuccess = async function(event) {

        db = event.target.result;

        try {

            // Migrate existing admin usernames.
            await migrateAdminUsernames();

            console.log("Admin usernames encrypted successfully.");
            console.log("CarePointDatabase opened successfully.");

        }
        catch (error) {

            console.error("Username encryption error:", error);

        }

    };

    request.onerror = function() {

        console.error('Unable to open CarePointDatabase.');

    };
}

// Handles admin login.
function setupAdminLogin() {

    const form = document.getElementById('adminLoginForm');

    form.addEventListener('submit', async function(event) {

        event.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const message = document.getElementById('loginMessage');

        if (!db) {

            message.textContent = 'Database is not ready.';
            return;

        }

        try {

            // Retrieve all admin records.
            const admins = await getAllAdmins();

            let matchingAdmin = null;

            // Decrypt usernames to find the matching account.
            for (const admin of admins) {

                const decryptedUsername =
                    await decryptAdminUsername(admin.username);

                if (decryptedUsername === username) {

                    matchingAdmin = admin;
                    break;

                }

            }

            // Check the password without changing it.
            if (matchingAdmin && matchingAdmin.password === password) {

                sessionStorage.setItem('adminLoggedIn', 'true');
                sessionStorage.setItem('userRole', 'admin');

                window.location.href = 'admin.html';

            }
            else {

                message.textContent = 'Incorrect username or password.';

            }

        }
        catch (error) {

            console.error("Admin login error:", error);

            message.textContent = 'Unable to verify login details.';

        }

    });
}

// Start the database connection.
openDatabase();

// Set up the login form.
setupAdminLogin();
