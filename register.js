
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


// Normalise email addresses
function normaliseEmail(email) {

    return String(email ?? '')
        .normalize('NFC')
        .trim()
        .toLowerCase();

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


// Sanitise text inputs
function sanitiseText(value) {

    return String(value ?? '')
        .normalize('NFC')
        .trim()
        .replace(/\s+/g, ' ');

}


// Check for unwanted control characters
function containsControlCharacters(value) {

    return /[\u0000-\u001F\u007F]/.test(String(value ?? ''));

}


// Validate names
function validName(value) {

    return /^[\p{L}\p{M}]+(?:[ .'-][\p{L}\p{M}]+)*$/u.test(value);

}


// Validate registration information
function validateDetails(details, rawDetails) {

    // Check for unwanted control characters
    if (Object.values(rawDetails).some(containsControlCharacters)) {

        return 'Invalid characters detected in your information.';

    }

    // Validate first and last names
    if (
        details.first_name.length > 60 ||
        details.last_name.length > 60 ||
        !validName(details.first_name) ||
        !validName(details.last_name)
    ) {

        return 'Please enter valid first and last names.';

    }

    // Validate email
    if (
        details.email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(details.email)
    ) {

        return 'Please enter a valid email address.';

    }

    // Validate gender
    if (
        !/^[\p{L}\p{M}]+(?:[ -][\p{L}\p{M}]+)*$/u.test(details.gender) ||
        details.gender.length > 30
    ) {

        return 'Please enter a valid gender.';

    }

    // Validate address
    if (
        details.address.length < 3 ||
        details.address.length > 100 ||
        /[<>]/.test(details.address)
    ) {

        return 'Please enter a valid address.';

    }

    // Validate telephone number
    const phoneDigits = normalisePhone(details.phone_number);

    if (
        !/^\+?[0-9\s().-]+$/.test(details.phone_number) ||
        phoneDigits.length < 7 ||
        phoneDigits.length > 15
    ) {

        return 'Please enter a valid telephone number.';

    }

    // Validate patient date of birth
    if (selectedType === 'Patient') {

        const dob = normaliseDate(details.date_of_birth);

        if (!dob) {

            return 'Please enter a valid date of birth.';

        }

        const [year, month, day] = dob.split('-').map(Number);

        const date = new Date(year, month - 1, day);

        // Check that the date actually exists
        if (
            date.getFullYear() !== year ||
            date.getMonth() !== month - 1 ||
            date.getDate() !== day
        ) {

            return 'Please enter a valid date of birth.';

        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (date > today) {

            return 'Date of birth cannot be in the future.';

        }

    }

    return '';

}


// Validate password strength
function validatePassword(password) {

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

    if (containsControlCharacters(password)) {
        return 'Password contains invalid characters.';
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

        normaliseEmail(email) === normaliseEmail(details.email) &&

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

        const detailsForm = document.getElementById('registerForm');

        if (!detailsForm.checkValidity()) {

            detailsForm.reportValidity();
            return;

        }


        // Collect the original user inputs
        const rawDetails = {

            first_name: document.getElementById('first_name').value,

            last_name: document.getElementById('last_name').value,

            email: document.getElementById('email').value,

            gender: document.getElementById('gender').value,

            address: document.getElementById('address').value,

            phone_number: document.getElementById('phone_number').value,

            date_of_birth: document.getElementById('date_of_birth').value

        };


        // Sanitise the information
        const details = {

            first_name: sanitiseText(rawDetails.first_name),

            last_name: sanitiseText(rawDetails.last_name),

            email: normaliseEmail(rawDetails.email),

            gender: sanitiseText(rawDetails.gender),

            address: sanitiseText(rawDetails.address),

            phone_number: sanitiseText(rawDetails.phone_number),

            date_of_birth: rawDetails.date_of_birth.trim()

        };


        // Validate email using the HTML input
        const emailInput = document.getElementById('email');

        if (!emailInput.checkValidity()) {

            message.textContent = 'Please enter a valid email address.';
            return;

        }


        // Validate personal information
        const detailsError = validateDetails(details, rawDetails);

        if (detailsError) {

            message.textContent = detailsError;
            return;

        }


        const password = document.getElementById('password').value;

        const confirmPassword =
            document.getElementById('confirm_password').value;


        // Check password strength
        const passwordError = validatePassword(password);

        if (passwordError) {

            message.textContent = passwordError;
            return;

        }


        // Check the passwords match
        if (password !== confirmPassword) {

            message.textContent = 'Passwords do not match.';
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

                // Check whether the email already exists
                const emailMatches = records.filter(function(record) {

                    const storedEmail = selectedType === 'Doctor'
                        ? record.email
                        : record.Email;

                    return normaliseEmail(storedEmail) === details.email;

                });

                if (emailMatches.length > 1) {

                    resultMessage =
                        'Multiple records use this email. Please contact the clinic.';

                    return;

                }


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
