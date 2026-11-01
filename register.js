const DB_NAME = 'CarePointDatabase';

let selectedType = '';


// Select whether the user is a Doctor or Patient
document.querySelectorAll('.account-option').forEach(function(button) {

    button.addEventListener('click', function() {

        selectedType = button.dataset.type;

        document.getElementById('accountTypeSection').hidden = true;
        document.getElementById('registerForm').hidden = false;

        document.getElementById('formTitle').textContent =
            selectedType + ' Registration';

        // Date of birth is required only for patients
        const dobField = document.getElementById('dobField');
        const dobInput = document.getElementById('date_of_birth');

        if (selectedType === 'Patient') {

            dobField.hidden = false;
            dobInput.required = true;

        }
        else {

            dobField.hidden = true;
            dobInput.required = false;
            dobInput.value = '';

        }

    });

});


// Allow the user to change account type
document.getElementById('changeAccountType').addEventListener(
    'click',
    function() {

        document.getElementById('registerForm').reset();

        document.getElementById('registerForm').hidden = true;
        document.getElementById('accountTypeSection').hidden = false;

        document.getElementById('registerMessage').textContent = '';

        selectedType = '';

    }
);


// Open the existing database without importing JSON files
async function openExistingDatabase() {

    if (typeof indexedDB.databases !== 'function') {
        throw new Error('Unable to check existing database.');
    }

    const databases = await indexedDB.databases();

    const exists = databases.some(function(database) {
        return database.name === DB_NAME;
    });

    if (!exists) {
        throw new Error('Database not found. Please open the homepage first.');
    }

    return new Promise(function(resolve, reject) {

        const request = indexedDB.open(DB_NAME);

        request.onsuccess = function(event) {

            const database = event.target.result;

            const storeName =
                selectedType === 'Doctor' ? 'Doctor' : 'Patients';

            if (!database.objectStoreNames.contains(storeName)) {

                database.close();

                reject(new Error('Required object store not found.'));
                return;

            }

            resolve(database);

        };

        request.onerror = function() {

            reject(request.error);

        };

    });
}


// Normalise text before comparing information
function normaliseText(value) {

    return String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');

}


// Normalise phone numbers
function normalisePhone(value) {

    return String(value ?? '').replace(/\D/g, '');

}


// Convert dates to YYYY-MM-DD format
function normaliseDate(value) {

    const date = String(value ?? '').trim();

    // Already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
    }

    // Convert DD/MM/YYYY or DD-MM-YYYY
    const match = date.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);

    if (match) {

        return match[3] + '-' +
            match[2].padStart(2, '0') + '-' +
            match[1].padStart(2, '0');

    }

    return '';

}


// Check whether the entered information matches an existing record
function detailsMatch(record, details) {

    let firstName;
    let lastName;
    let email;
    let gender;
    let address;
    let telephone;

    if (selectedType === 'Doctor') {

        firstName = record.first_name;
        lastName = record.last_name;
        email = record.email;
        gender = record.gender;
        address = record.Address;
        telephone = record.Telephone;

    }
    else {

        firstName = record.First;
        lastName = record.Last;
        email = record.Email;
        gender = record.Gender;
        address = record.Address;
        telephone = record.Telephone;

    }

    const commonDetailsMatch = (

        normaliseText(firstName) === normaliseText(details.first_name) &&

        normaliseText(lastName) === normaliseText(details.last_name) &&

        normaliseText(email) === normaliseText(details.email) &&

        normaliseText(gender) === normaliseText(details.gender) &&

        normaliseText(address) === normaliseText(details.address) &&

        normalisePhone(telephone) === normalisePhone(details.phone_number)

    );

    // Patients must also match their date of birth
    if (selectedType === 'Patient') {

        return commonDetailsMatch &&
            normaliseDate(record.DOB) ===
            normaliseDate(details.date_of_birth);

    }

    return commonDetailsMatch;

}


// Generate a salted password hash
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


// Handle registration form submission
document.getElementById('registerForm').addEventListener(
    'submit',
    async function(event) {

        event.preventDefault();

        const message = document.getElementById('registerMessage');

        message.textContent = '';

        const details = {

            first_name: document.getElementById('first_name').value.trim(),

            last_name: document.getElementById('last_name').value.trim(),

            email: document.getElementById('email').value.trim(),

            gender: document.getElementById('gender').value.trim(),

            address: document.getElementById('address').value.trim(),

            phone_number: document.getElementById('phone_number').value.trim(),

            date_of_birth:
                document.getElementById('date_of_birth').value

        };

        const password = document.getElementById('password').value;

        const confirmPassword =
            document.getElementById('confirm_password').value;


        // Check the passwords
        if (password !== confirmPassword) {

            message.textContent = 'Passwords do not match.';
            return;

        }

        if (password.length < 8) {

            message.textContent =
                'Password must contain at least 8 characters.';

            return;

        }


        let database;

        try {

            // Open the existing database
            database = await openExistingDatabase();

            // Generate password hash
            const passwordData = await hashPassword(password);

            const storeName =
                selectedType === 'Doctor' ? 'Doctor' : 'Patients';

            // Start a transaction
            const transaction = database.transaction(
                [storeName],
                'readwrite'
            );

            const store = transaction.objectStore(storeName);

            // Get existing records
            const request = store.getAll();

            let resultMessage = '';
            let registrationSaved = false;

            request.onsuccess = function() {

                const records = request.result;

                // Find the matching record
                const matchingRecords = records.filter(function(record) {

                    return detailsMatch(record, details);

                });


                if (matchingRecords.length === 0) {

                    resultMessage =
                        'No matching record found. Please check your information.';

                    return;

                }


                if (matchingRecords.length > 1) {

                    resultMessage =
                        'Multiple matching records found. Please contact the clinic.';

                    return;

                }


                const existingRecord = matchingRecords[0];


                // Check whether the account is already registered
                if (
                    existingRecord.passwordHash ||
                    existingRecord.passwordSalt ||
                    existingRecord.password
                ) {

                    resultMessage =
                        'This account is already registered. Please log in.';

                    return;

                }


                // Add credentials to the existing record
                const updatedRecord = {

                    ...existingRecord,

                    passwordHash: passwordData.passwordHash,

                    passwordSalt: passwordData.passwordSalt

                };


                // Update the existing database record
                const updateRequest = store.put(updatedRecord);

                updateRequest.onsuccess = function() {

                    registrationSaved = true;

                    resultMessage =
                        'Registration successful! You can now log in.';

                };

            };


            request.onerror = function() {

                resultMessage = 'Unable to retrieve existing records.';

            };


            transaction.oncomplete = function() {

                message.textContent = resultMessage;

                if (registrationSaved) {

                    document.getElementById('registerForm').reset();

                }

                database.close();

            };


            transaction.onerror = function() {

                message.textContent =
                    'Registration failed. Please try again.';

                database.close();

            };


            transaction.onabort = function() {

                message.textContent = 'Registration was cancelled.';

                database.close();

            };

        }
        catch (error) {

            console.error('Registration error:', error);

            message.textContent =
                'Unable to access the database. Please try again.';

            if (database) {
                database.close();
            }

        }

    }
);