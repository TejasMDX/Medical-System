// Gets the login button and the current user's role.
const loginButton = document.getElementById("loginButton");
const currentUserRole = sessionStorage.getItem("userRole");

// Changes the Login button to Logout if a user is logged in.
if (loginButton && currentUserRole) {

    loginButton.textContent = "Logout";

    loginButton.addEventListener("click", function(event) {

        // Prevents the link from opening the login page.
        event.preventDefault();

        // Clears the current user's login details.
        sessionStorage.removeItem("userRole");

        sessionStorage.removeItem("patientLoggedIn");
        sessionStorage.removeItem("patientId");

        sessionStorage.removeItem("doctorLoggedIn");
        sessionStorage.removeItem("doctorId");

        sessionStorage.removeItem("adminLoggedIn");

        // Returns to the homepage after logging out.
        window.location.href = "index.html";

    });
}