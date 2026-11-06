
// Generates a salted password hash using the same method as register.js.
async function hashPassword(password) {

    const salt = crypto.getRandomValues(new Uint8Array(16));

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

    function toBase64(data) {

        return btoa(
            String.fromCharCode(...new Uint8Array(data))
        );

    }

    return {
        passwordHash: toBase64(hash),
        passwordSalt: toBase64(salt)
    };

}


// Validates admin password strength using the same rules as register.js.
function validateAdminPassword(password) {

    if (password.length < 8) {
        return 'Password must contain at least 8 characters.';
    }

    if (password.length > 128) {
        return 'Password cannot exceed 128 characters.';
    }

    if (!/[A-Z]/.test(password)) {
        return 'Password must contain at least one uppercase letter.';
    }

    if (!/[a-z]/.test(password)) {
        return 'Password must contain at least one lowercase letter.';
    }

    if (!/[0-9]/.test(password)) {
        return 'Password must contain at least one number.';
    }

    if (!/[^A-Za-z0-9\s]/.test(password)) {
        return 'Password must contain at least one special character.';
    }

    if (/[\u0000-\u001F\u007F]/.test(password)) {
        return 'Password contains invalid characters.';
    }

    return '';

}


// Displays all the admin usernames saved in the database.
function showAllAdmins() {

    const transaction = db.transaction(["Admin"], "readonly");

    const adminStore = transaction.objectStore("Admin");

    const request = adminStore.getAll();

    request.onsuccess = function() {

        const admins = request.result;

        let html = `<table border="1">
            <tr>
                <th>Username</th>
            </tr>`;

        admins.forEach(a => {
            html += `<tr>
                <td>${a.username}</td>
            </tr>`;
        });

        html += `</table>`;

        document.getElementById("adminOutput").innerHTML = html;
    };
}


// Adds a new admin account.
function addAdmin() {

    document.getElementById("adminForm").addEventListener("submit", async function(event) {

        event.preventDefault();

        const username = document.getElementById("adminUsernameInput").value.trim();

        const password = document.getElementById("adminPasswordInput").value;

        // Checks password strength.
        const passwordError = validateAdminPassword(password);

        if (passwordError) {

            alert(passwordError);
            return;

        }

        try {

            // Generates password hash and salt.
            const passwordData = await hashPassword(password);

            // Starts a transaction.
            const transaction = db.transaction(["Admin"], "readwrite");

            const adminStore = transaction.objectStore("Admin");

            // Stores the username, password hash and salt.
            const admin = {

                username: username,
                passwordHash: passwordData.passwordHash,
                passwordSalt: passwordData.passwordSalt

            };

            const addRequest = adminStore.add(admin);

            addRequest.onerror = function() {
                alert("Could not add admin. This username may already exist.");
            };

            transaction.oncomplete = function() {

                document.getElementById("adminForm").reset();

                showAllAdmins();

                alert("Admin added");

            };

        }
        catch (error) {

            console.error("Admin creation error:", error);

            alert("Unable to secure the admin password. Please try again.");

        }

    });
}


// Deletes an admin account using its username.
function deleteAdmin() {

    const username = document.getElementById("deleteAdminUsername").value.trim();

    const transaction = db.transaction(["Admin"], "readwrite");

    const adminStore = transaction.objectStore("Admin");

    let adminFound = false;

    const request = adminStore.get(username);

    request.onsuccess = function() {

        if (request.result) {

            adminFound = true;

            adminStore.delete(username);
        }
    };

    transaction.oncomplete = function() {

        document.getElementById("deleteAdminUsername").value = "";

        if (adminFound) {

            showAllAdmins();

            alert("Admin deleted");

        } else {

            alert("Admin not found");
        }
    };
}


// Set up the admin registration form.
addAdmin();
