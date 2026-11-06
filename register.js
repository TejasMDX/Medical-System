// Database name used to access the clinic's IndexedDB database
const DB_NAME = 'CarePointDatabase';

// Stores the account type selected by the user
let selectedType = '';


// Select whether the user is a Doctor or Patient
document.querySelectorAll('.account-option').forEach(function(button) {

    button.addEventListener('click', function() {

        // Get the account type from the button's data-type attribute
        selectedType = button.dataset.type;

        // Hide the account selection and display the registration form
        document.getElementById('accountTypeSection').hidden = true;
        document.getElementById('registerForm').hidden = false;

        // Update the form heading according to the selected account type
        document.getElementById('formTitle').textContent =
            selectedType + ' Registration';

        // Get the date of birth field and its input element
        const dobField = document.getElementById('dobField');
        const dobInput = document.getElementById('date_of_birth');

        // Date of birth is required only for patients
        if (selectedType === 'Patient') {

            dobField.hidden = false;
            dobInput.required = true;

        }
        else {

            // Hide the date of birth field and remove its required validation
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

        // Reset all registration form inputs
        document.getElementById('registerForm').reset();

        // Return to the account selection section
        document.getElementById('registerForm').hidden = true;
        document.getElementById('accountTypeSection').hidden = false;

        // Clear any previous registration messages
        document.getElementById('registerMessage').textContent = '';

        // Reset the selected account type
        selectedType = '';

    }
);


// Open the existing database without importing JSON files
async function openExistingDatabase() {

    // Check whether the browser supports listing existing IndexedDB databases
    if (typeof indexedDB.databases !== 'function') {
        throw new Error('Unable to check existing database.');
    }

    // Retrieve the databases available in the browser
    const databases = await indexedDB.databases();

    // Check whether the CarePoint database already exists
    const exists = databases.some(function(database) {
        return database.name === DB_NAME;
    });

    // Stop the registration process if the database does not exist
    if (!exists) {
        throw new Error('Database not found. Please open the homepage first.');
    }

    // Open the existing database and handle the result using a Promise
    return new Promise(function(resolve, reject) {

        const request = indexedDB.open(DB_NAME);

        // Execute when the database has been opened successfully
        request.onsuccess = function(event) {

            const database = event.target.result;

            // Select the object store according to the account type
            const storeName =
                selectedType === 'Doctor' ? 'Doctor' : 'Patients';

            // Check that the required object store exists
            if (!database.objectStoreNames.contains(storeName)) {

                // Close the database before rejecting the Promise
                database.close();

                reject(new Error('Required object store not found.'));
                return;

            }

            // Return the opened database to the calling function
            resolve(database);

        };

        // Reject the Promise if the database cannot be opened
        request.onerror = function() {

            reject(request.error);

        };

    });
}


// Normalise text before comparing information
function normaliseText(value) {

    // Convert the value to a string, remove surrounding spaces,
    // convert it to lowercase and replace repeated spaces with one space
    return String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');

}


// Normalise email addresses
function normaliseEmail(email) {

    // Apply Unicode normalisation, remove surrounding spaces
    // and convert the email address to lowercase
    return String(email ?? '')
        .normalize('NFC')
        .trim()
        .toLowerCase();

}


// Normalise phone numbers
function normalisePhone(value) {

    // Remove all characters except digits for phone number comparison
    return String(value ?? '').replace(/\D/g, '');

}


// Convert dates to YYYY-MM-DD format
function normaliseDate(value) {

    // Convert the date to a string and remove surrounding spaces
    const date = String(value ?? '').trim();

    // Already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
    }

    // Convert DD/MM/YYYY or DD-MM-YYYY
    const match = date.match(/^(\d{1,2})[/-]\(\d{1,2})[/-]\(\d{4})$/);

    if (match) {

        // Rearrange the date components into YYYY-MM-DD format
        // padStart ensures that the month and day contain two digits
        return match[3] + '-' +
            match[2].padStart(2, '0') + '-' +
            match[1].padStart(2, '0');

    }

    // Return an empty string if the date format is not recognised
    return '';

}


// Sanitise text inputs
function sanitiseText(value) {

    // Normalise Unicode characters, remove surrounding spaces
    // and replace multiple spaces with a single space
    return String(value ?? '')
        .normalize('NFC')
        .trim()
        .replace(/\s+/g, ' ');

}


// Check for unwanted control characters
function containsControlCharacters(value) {

    // Detect invisible control characters that should not be accepted
    return /[\u0000-\u001F\u007F]/.test(String(value ?? ''));

}


// Validate names
function validName(value) {

    // Check that the name contains permitted Unicode letters
    // and the allowed separators
    return /^[\p{L}\p{M}]+(?:[ .'-][\p{L}\p{M}]+)\*$/u.test(value);

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
        !/^[^\s@]+@[^\s@]+\\.[^\s@]{2,}$/.test(details.email)
    ) {

        return 'Please enter a valid email address.';

    }

    // Validate gender
    if (
        !/^[\p{L}\p{M}]+(?:[ -][\p{L}\p{M}]+)\*$/u.test(details.gender) ||
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
        !/^\\+?[0-9\s().-]+$/.test(details.phone_number) ||
        phoneDigits.length < 7 ||
        phoneDigits.length > 15
    ) {

        return 'Please enter a valid telephone number.';

    }

    // Validate patient date of birth
    if (selectedType === 'Patient') {

        // Convert the date of birth into a consistent format
        const dob = normaliseDate(details.date_of_birth);

        if (!dob) {

            return 'Please enter a valid date of birth.';

        }

        // Separate the year, month and day into numerical values
        const [year, month, day] = dob.split('-').map(Number);

        // Create a Date object to validate the date
        const date = new Date(year, month - 1, day);

        // Check that the date actually exists
        if (
            date.getFullYear() !== year ||
            date.getMonth() !== month - 1 ||
            date.getDate() !== day
        ) {

            return 'Please enter a valid date of birth.';

        }

        // Get the current date and remove its time components
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Prevent registration with a future date of birth
        if (date > today) {

            return 'Date of birth cannot be in the future.';

        }

    }

    // Return an empty string when all information is valid
    return '';

}


// Validate password strength
function validatePassword(password) {

    // Require a minimum password length
    if (password.length < 8) {
        return 'Password must contain at least 8 characters.';
    }

    // Set a maximum password length
    if (password.length > 128) {
        return 'Password cannot exceed 128 characters.';
    }

    // Require at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
        return 'Password must contain at least one uppercase letter.';
    }

    // Require at least one lowercase letter
    if (!/[a-z]/.test(password)) {
        return 'Password must contain at least one lowercase letter.';
    }

    // Require at least one number
    if (!/[0-9]/.test(password)) {
        return 'Password must contain at least one number.';
    }

    // Require at least one special character
    if (!/[^A-Za-z0-9\s]/.test(password)) {
        return 'Password must contain at least one special character.';
    }

    // Reject passwords containing control characters
    if (containsControlCharacters(password)) {
        return 'Password contains invalid characters.';
    }

    // Return an empty string when the password passes validation
    return '';

}


// Check whether the entered information matches an existing record
function detailsMatch(record, details) {

    // Declare variables for the information stored in the database
    let firstName;
    let lastName;
    let email;
    let gender;
    let address;
    let telephone;

    // Retrieve the fields according to the selected account type
    if (selectedType === 'Doctor') {

        // Doctor records use lowercase field names for most details
        firstName = record.first_name;
        lastName = record.last_name;
        email = record.email;
        gender = record.gender;
        address = record.Address;
        telephone = record.Telephone;

    }
    else {

        // Patient records use different field names
        firstName = record.First;
        lastName = record.Last;
        email = record.Email;
        gender = record.Gender;
        address = record.Address;
        telephone = record.Telephone;

    }

    // Compare the normalised personal information
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

    // Return the result of the common information comparison for doctors
    return commonDetailsMatch;

}


// Generate a salted password hash
async function hashPassword(password) {

    // Generate a random 16-byte salt for the password
    const salt = crypto.getRandomValues(new Uint8Array(16));

    // Import the password as a cryptographic key for PBKDF2
    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
    );

    // Use PBKDF2 with SHA-256 and 150000 iterations to derive the hash
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

    // Convert the hash and salt from binary data into Base64 strings
    function toBase64(data) {

        return btoa(
            String.fromCharCode(...new Uint8Array(data))
        );

    }

    // Return both the password hash and its salt for database storage
    return {
        passwordHash: toBase64(hash),
        passwordSalt: toBase64(salt)
    };

}


// Handle registration form submission
document.getElementById('registerForm').addEventListener(
    'submit',
    async function(event) {

        // Prevent the browser from submitting and reloading the page
        event.preventDefault();

        // Get the element used to display registration feedback
        const message = document.getElementById('registerMessage');

        message.textContent = '';

        const detailsForm = document.getElementById('registerForm');

        // Check the HTML form validation rules before processing the inputs
        if (!detailsForm.checkValidity()) {

            // Display the browser's validation messages
            detailsForm.reportValidity();
            return;

        }


        // Collect the original user inputs
        const rawDetails = {

            // Retrieve values from the registration form using element IDs
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

            // Prepare the entered values for validation and comparison
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

        // Stop registration and display the validation error if one exists
        if (detailsError) {

            message.textContent = detailsError;
            return;

        }


        // Retrieve the password and confirmation password
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


        // Declare the database variable so it can be accessed in the catch block
        let database;

        try {

            // Open the existing database
            database = await openExistingDatabase();

            // Generate password hash
            const passwordData = await hashPassword(password);

            // Select the object store according to the selected account type
            const storeName =
                selectedType === 'Doctor' ? 'Doctor' : 'Patients';

            // Start a transaction
            const transaction = database.transaction(
                [storeName],
                'readwrite'
            );

            // Access the selected object store for reading and updating records
            const store = transaction.objectStore(storeName);

            // Get existing records
            const request = store.getAll();

            // Variables used to track the registration result
            let resultMessage = '';
            let registrationSaved = false;

            // Execute when all records have been retrieved
            request.onsuccess = function() {

                const records = request.result;

                // Check whether the email already exists
                const emailMatches = records.filter(function(record) {

                    // Retrieve the email field according to the account type
                    const storedEmail = selectedType === 'Doctor'
                        ? record.email
                        : record.Email;

                    // Compare the stored email with the entered email
                    return normaliseEmail(storedEmail) === details.email;

                });

                // Stop if multiple records already use the same email address
                if (emailMatches.length > 1) {

                    resultMessage =
                        'Multiple records use this email. Please contact the clinic.';

                    return;

                }


                // Find the matching record
                const matchingRecords = records.filter(function(record) {

                    // Compare the registration details with each database record
                    return detailsMatch(record, details);

                });


                // Display an error when no existing record matches
                if (matchingRecords.length === 0) {

                    resultMessage =
                        'No matching record found. Please check your information.';

                    return;

                }


                // Stop if more than one database record matches the details
                if (matchingRecords.length > 1) {

                    resultMessage =
                        'Multiple matching records found. Please contact the clinic.';

                    return;

                }


                // Retrieve the single matching database record
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

                    // Spread operator retains the existing personal information
                    ...existingRecord,

                    // Add the generated password hash and salt
                    passwordHash: passwordData.passwordHash,

                    passwordSalt: passwordData.passwordSalt

                };


                // Update the existing database record
                const updateRequest = store.put(updatedRecord);

                // Execute when the updated record has been stored successfully
                updateRequest.onsuccess = function() {

                    registrationSaved = true;

                    resultMessage =
                        'Registration successful! You can now log in.';

                };

            };


            // Handle errors when retrieving existing records
            request.onerror = function() {

                resultMessage = 'Unable to retrieve existing records.';

            };


            // Execute when the database transaction is completed
            transaction.oncomplete = function() {

                // Display the result of the registration process
                message.textContent = resultMessage;

                // Reset the form only when registration was successful
                if (registrationSaved) {

                    document.getElementById('registerForm').reset();

                }

                // Close the database connection
                database.close();

            };


            // Handle transaction errors
            transaction.onerror = function() {

                message.textContent =
                    'Registration failed. Please try again.';

                database.close();

            };


            // Handle a transaction that has been cancelled or aborted
            transaction.onabort = function() {

                message.textContent = 'Registration was cancelled.';

                database.close();

            };


        }
        catch (error) {

            // Log the technical error in the browser console
            console.error('Registration error:', error);

            // Display a general error message to the user
            message.textContent =
                'Unable to access the database. Please try again.';

            // Close the database if it was successfully opened
            if (database) {
                database.close();
            }

        }

    }
);