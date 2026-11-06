
const DB_NAME = 'CarePointDatabase';


// Opens the existing CarePoint database
async function openDatabase() {

    // Checks whether the database already exists
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


// Normalises email addresses
function normaliseEmail(email) {

    return String(email ?? '').trim().toLowerCase();

}


// Checks the entered password against the stored password hash
async function verifyPassword(password, storedHash, storedSalt) {

    // Converts the stored salt from Base64
    const salt = Uint8Array.from(
        atob(storedSalt),
        function(character) {
            return character.charCodeAt(0);
        }
    );

    // Imports the entered password
    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
    );

    // Generates a hash using the same settings as registration
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

    // Converts the generated hash to Base64
    const generatedHash = btoa(
        String.fromCharCode(...new Uint8Array(hash))
    );

    // Compares the generated hash with the stored hash
    return generatedHash === storedHash;

}


// Handles login for Doctors and Patients
document.getElementById('LoginForm').addEventListener(
    'submit',
    async function(event) {

        event.preventDefault();

        // Normalises the email address
        const email = normaliseEmail(
            document.getElementById('email').value
        );

        // Keeps the password unchanged
        const password = document.getElementById('password').value;

        const message = document.getElementById('loginMessage');

        message.textContent = '';

        let database;

        try {

            // Opens the existing database
            database = await openDatabase();

            // Accesses both object stores
            const transaction = database.transaction(
                ['Patients', 'Doctor'],
                'readonly'
            );

            const patientsStore = transaction.objectStore('Patients');
            const doctorStore = transaction.objectStore('Doctor');

            // Retrieves the existing patient and doctor records
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


            // Finds matching patient and doctor accounts
            const matchingAccounts = [];

            // Searches the Patients object store
            patients.forEach(function(patient) {

                if (normaliseEmail(patient.Email) === email) {

                    matchingAccounts.push({
                        type: 'Patient',
                        record: patient
                    });

                }

            });

            // Searches the Doctor object store
            doctors.forEach(function(doctor) {

                if (normaliseEmail(doctor.email) === email) {

                    matchingAccounts.push({
                        type: 'Doctor',
                        record: doctor
                    });

                }

            });


            // Checks whether the email exists
            if (matchingAccounts.length === 0) {

                message.textContent = 'Incorrect email or password.';

                database.close();
                return;

            }


            // Checks whether the account has been registered
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


            // Verifies the password for matching registered accounts
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


            // Prevents ambiguous accounts
            if (validAccounts.length > 1) {

                message.textContent =
                    'Multiple matching accounts found. Please contact the clinic.';

                database.close();
                return;

            }


            // Checks whether the password is correct
            if (validAccounts.length === 0) {

                message.textContent = 'Incorrect email or password.';

                database.close();
                return;

            }


            const account = validAccounts[0];


            database.close();


            // Redirects according to the account type
            if (account.type === 'Patient') {

                // Saves the patient's login session
                sessionStorage.setItem('patientLoggedIn', 'true');
                sessionStorage.setItem('patientId', account.record.id);
                sessionStorage.setItem('userRole', 'patient');

                // Redirects to the patient dashboard
                window.location.href = 'patient.html';

            }
            else if (account.type === 'Doctor') {

                // Saves the doctor's login session
                sessionStorage.setItem('doctorLoggedIn', 'true');
                sessionStorage.setItem('doctorId', account.record.id);
                sessionStorage.setItem('userRole', 'doctor');

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
