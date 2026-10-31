
const DB_NAME = 'CarePointDatabase';

let db;

// Open the existing CarePoint database
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

// Handle admin login
function setupAdminLogin() {

    const form = document.getElementById('adminLoginForm');

    form.addEventListener('submit', function(event) {

        event.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const message = document.getElementById('loginMessage');

        // Ensure the database is available
        if (!db) {
            message.textContent = 'Database is not ready.';
            return;
        }

        // Access the Admin object store
        const transaction = db.transaction(['Admin'], 'readonly');
        const adminStore = transaction.objectStore('Admin');

        // Find the admin using the entered username
        const request = adminStore.get(username);

        request.onsuccess = function() {

            const admin = request.result;

            // Check the password
            if (admin && admin.password === password) {

                sessionStorage.setItem('adminLoggedIn', 'true');

                window.location.href = 'admin.html';

            }
            else {

                message.textContent = 'Incorrect username or password.';

            }
        };

        request.onerror = function() {

            message.textContent = 'Unable to verify login details.';

        };

    });
}

// Start the database connection
openDatabase();

// Set up the login form
setupAdminLogin();
