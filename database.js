
// Database name
const DB_NAME = 'CarePointDatabase';

let db;


// Cleans the existing database
const clean = function(database) {

    if (database) {
        database.close();
    }

    const deleteRequest = indexedDB.deleteDatabase(DB_NAME);

    deleteRequest.onsuccess = function() {
        console.log("Database closed and deleted");
    };
};


// Hash an admin password using the same settings as register.js
async function hashAdminPassword(password) {

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


// Loads the JSON files
async function loadJSON() {

    const response1 = await fetch("json/admin.json");
    const admin = await response1.json();

    const response2 = await fetch("json/doctors.json");
    const doctors = await response2.json();

    const response3 = await fetch("json/medicines.json");
    const medicines = await response3.json();

    const response4 = await fetch("json/patients.json");
    const patients = await response4.json();

    await adding_to_db(admin, doctors, medicines, patients);
}


// Adds JSON data to IndexedDB
async function adding_to_db(admin, doctor, medicine, patients) {

    // Hash admin passwords before storing them.
    const hashedAdmins = await Promise.all(admin.map(async function(a) {

        const passwordData = await hashAdminPassword(a.password);

        const adminRecord = {
            ...a,
            passwordHash: passwordData.passwordHash,
            passwordSalt: passwordData.passwordSalt
        };

        delete adminRecord.password;

        return adminRecord;

    }));

    // Step 1: Start a transaction
    const transaction = db.transaction(
        ['Admin', 'Doctor', 'Medicine', 'Patients'],
        'readwrite'
    );

    // Access the object stores
    const adminStore = transaction.objectStore('Admin');
    const doctorStore = transaction.objectStore('Doctor');
    const medicineStore = transaction.objectStore('Medicine');
    const patientsStore = transaction.objectStore('Patients');

    // Step 2: Add the JSON data
    hashedAdmins.forEach(function(a) {
        adminStore.add(a);
    });

    doctor.forEach(function(d) {
        doctorStore.add(d);
    });

    medicine.forEach(function(m) {
        medicineStore.add(m);
    });

    patients.forEach(function(p) {
        patientsStore.add(p);
    });

    // Step 3: Complete the transaction
    transaction.oncomplete = function() {
        console.log('All JSON data added successfully.');
    };

    transaction.onerror = function(event) {
        console.error('Transaction failed:', event.target.error);
    };
}


// Restarts the database
async function restart_db() {

    // Closes the database before deleting it
    if (db) {
        db.close();
        db = null;
    }

    // Deletes the existing database first
    const deleteRequest = indexedDB.deleteDatabase(DB_NAME);

    deleteRequest.onsuccess = function() {
        console.log('Database deleted successfully.');

        // Starts the database again
        start_db();
    };

}


// Starts the database
async function start_db() {

    let newDatabase = false;

    // Opens the CarePoint database
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = function(event) {
        db = event.target.result;

        newDatabase = true;

        db.createObjectStore("Admin", { keyPath: "username" });
        db.createObjectStore("Doctor", { keyPath: "id" });
        db.createObjectStore("Medicine", { keyPath: "id" });
        db.createObjectStore("Patients", { keyPath: "id" });
        db.createObjectStore("Appointment", {keyPath: "appointment_id"});
        db.createObjectStore("Prescription", {keyPath: "prescription_id"});
        db.createObjectStore("MedicalHistory", {keyPath: "history_id"});

    };

    request.onsuccess = function(event) {
        db = event.target.result;

        console.log('Database opened successfully.');

        if (newDatabase) {
            console.log('Database created successfully.');
            loadJSON();
        }
        else {
            console.log('Database already exists. No changes made.');
        }
    };
}


start_db();
