
function createAppointmentStore(db) {

    db.createObjectStore("Appointment", {
        keyPath: "appointment_id"
    });

}
