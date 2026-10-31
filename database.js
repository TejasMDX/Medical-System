
let db;

const request = indexedDB.open('CarePointDatabase', 1);

// Create object stores when the database is created or upgraded

request.onupgradeneeded = function(event) {
    db = event.target.result;

    if (!db.objectStoreNames.contains('Admins')) {
        db.createObjectStore('Admins', {keyPath: 'username'});
        console.log('Admins object store created');
    }

    if (!db.objectStoreNames.contains('Doctors')) {
        db.createObjectStore('Doctors', {keyPath: 'id'});
        console.log('Doctors object store created');
    }

    if (!db.objectStoreNames.contains('Medications')) {
        db.createObjectStore('Medications', {keyPath: 'id'});
        console.log('Medications object store created');
    }

    if (!db.objectStoreNames.contains('Patients')) {
        db.createObjectStore('Patients', {keyPath: 'id'});
        console.log('Patients object store created');
    }

    if (!db.objectStoreNames.contains('Accounts')) {
        db.createObjectStore('Accounts', {keyPath: 'username'});
        console.log('Accounts object store created');
    }
};


// Open the database successfully
request.onsuccess = function(event) {
    db = event.target.result;

    console.log('Database opened successfully.');
};

// Handle database errors
request.onerror = function(event) {
    console.error('Database error: ' + event.target.error);
};

//For deleating database if needed
const clean = function(database) {
    database.close();
    indexedDB.deleteDatabase(DB_NAME);
    console.log("Database closed and deleted");
}
