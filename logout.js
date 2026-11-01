const loginButton = document.getElementById("loginButton")
const currentUserRole = sessionStorage.getItem("userRole")

if (loginButton && currentUserRole) {
    loginButton.textContent = "Logout"

    loginButton.addEventListener("click", function(event) {
    event.preventDefault();

    sessionStorage.removeItem("userRole");

    sessionStorage.removeItem("patientLoggedIn");
    sessionStorage.removeItem("patientId");

    sessionStorage.removeItem("doctorLoggedIn");
    sessionStorage.removeItem("doctorId");

    sessionStorage.removeItem("adminLoggedIn");

    window.location.href = "index.html"
});
}

