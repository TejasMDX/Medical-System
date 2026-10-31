
const DB_NAME = 'CarePointDatabase';


// Open the existing CarePoint database
async function openDatabase() {

    // Check whether the database already exists
    const databases = await indexedDB.databases();

    const exists = databases.some(function(database) {
        return database.name === DB_NAME;
    });

    if (!exists) {
        throw new Error('CarePointDatabase does not exist.');
    }

    return new Promise(function(resolve, reject) {

        const request = indexedDB.open(DB_NAME);

        request.onsuccess = function(event) {

            resolve(event.target.result);

        };

        request.onerror = function() {

            reject(request.error);

        };

    });

}


// Normalise email addresses
function normaliseEmail(email) {

    return String(email ?? '').trim().toLowerCase();

}


// Check the entered password against the stored password hash
async function verifyPassword(password, storedHash, storedSalt) {

    // Convert the stored salt from Base64
    const salt = Uint8Array.from(
        atob(storedSalt),
        function(character) {
            return character.charCodeAt(0);
        }
    );

    // Import the entered password
    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
    );

    // Generate a hash using the same settings as registration
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

    // Convert the generated hash to Base64
    const generatedHash = btoa(
        String.fromCharCode(...new Uint8Array(hash))
    );

    // Compare the generated hash with the stored hash
    return generatedHash === storedHash;

}


// Handle login for Doctors and Patients
document.getElementById('LoginForm').addEventListener(
    'submit',
    async function(event) {

        event.preventDefault();

        const email = document.getElementById('email').value;

        const password = document.getElementById('password').value;

        const message = document.getElementById('loginMessage');

        message.textContent = '';

        let database;

        try {

            // Open the existing database
            database = await openDatabase();

            // Access both object stores
            const transaction = database.transaction(
                ['Patients', 'Doctor'],
                'readonly'
            );

            const patientsStore = transaction.objectStore('Patients');
            const doctorStore = transaction.objectStore('Doctor');

            // Retrieve the existing patient and doctor records
            const patientsRequest = patientsStore.getAll();
            const doctorRequest = doctorStore.getAll();

            const patients = await new Promise(function(resolve, reject) {

                patientsRequest.onsuccess = function() {
                    resolve(patientsRequest.result);
                };

                patientsRequest.onerror = function() {
                    reject(patientsRequest.error);
                };

            });

            const doctors = await new Promise(function(resolve, reject) {

                doctorRequest.onsuccess = function() {
                    resolve(doctorRequest.result);
                };

                doctorRequest.onerror = function() {
                    reject(doctorRequest.error);
                };

            });


            // Find matching patient and doctor accounts
            const matchingAccounts = [];

            // Search the Patients object store
            patients.forEach(function(patient) {

                if (normaliseEmail(patient.Email) === normaliseEmail(email)) {

                    matchingAccounts.push({
                        type: 'Patient',
                        record: patient
                    });

                }

            });

            // Search the Doctor object store
            doctors.forEach(function(doctor) {

                if (normaliseEmail(doctor.email) === normaliseEmail(email)) {

                    matchingAccounts.push({
                        type: 'Doctor',
                        record: doctor
                    });

                }

            });


            // Check whether the email exists
            if (matchingAccounts.length === 0) {

                message.textContent = 'Incorrect email or password.';

                database.close();
                return;

            }


            // Check whether the account has been registered
            const registeredAccounts = matchingAccounts.filter(function(account) {

                return account.record.passwordHash &&
                       account.record.passwordSalt;

            });


            if (registeredAccounts.length === 0) {

                message.textContent =
                    'Please register your account first.';

                database.close();
                return;

            }


            // Verify the password for matching registered accounts
            const validAccounts = [];

            for (const account of registeredAccounts) {

                const validPassword = await verifyPassword(
                    password,
                    account.record.passwordHash,
                    account.record.passwordSalt
                );

                if (validPassword) {
                    validAccounts.push(account);
                }

            }


            // Prevent ambiguous accounts
            if (validAccounts.length > 1) {

                message.textContent =
                    'Multiple matching accounts found. Please contact the clinic.';

                database.close();
                return;

            }


            // Check whether the password is correct
            if (validAccounts.length === 0) {

                message.textContent = 'Incorrect email or password.';

                database.close();
                return;

            }


            const account = validAccounts[0];

            database.close();


            // Redirect according to the account type
            if (account.type === 'Patient') {

                // Save the patient's login session
                sessionStorage.setItem('patientLoggedIn', 'true');
                sessionStorage.setItem('patientId', account.record.id);

                // Redirect to the patient dashboard
                window.location.href = 'patient.html';

            }
            else if (account.type === 'Doctor') {

                // Save the doctor's login session
                sessionStorage.setItem('doctorLoggedIn', 'true');
                sessionStorage.setItem('doctorId', account.record.id);

                // Redirect to the doctor dashboard
                window.location.href = 'doctor.html';

            }

        }
        catch (error) {

            console.error('Login error:', error);

            if (database) {
                database.close();
            }

            message.textContent =
                'Unable to access the database. Please try again.';

        }

    }
);
