const API = "http://localhost:3000";

window.onload = () => {
    const user = localStorage.getItem("usuario");
    if (user) {
        mostrarApp(user);
    }
};

async function register() {
    const usuario = document.getElementById("user").value;
    const password = document.getElementById("pass").value;

    if (!usuario || !password) {
        alert("❌ Completa todos los campos");
        return;
    }

    try {
        const res = await fetch(API + "/auth/register", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ usuario, password })
        });

        const data = await res.json();

        if (res.ok) {
            alert("✅ " + data.mensaje);
            document.getElementById("user").value = "";
            document.getElementById("pass").value = "";
        } else {
            alert("❌ " + data.error);
        }

    } catch (error) {
        console.error("Error:", error);
        alert("❌ Error de conexión. ¿El servidor está corriendo?");
    }
}

async function login() {
    const usuario = document.getElementById("user").value;
    const password = document.getElementById("pass").value;

    if (!usuario || !password) {
        alert("Completa todos los campos");
        return;
    }

    try {
        const res = await fetch(API + "/auth/login", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ usuario, password })
        });

        const data = await res.json();

        if (res.ok) {
            localStorage.setItem("usuario", usuario);
            mostrarApp(usuario);
        } else {
            alert(data.error);
        }
    } catch (error) {
        alert("Error de conexión con el servidor");
        console.error(error);
    }
}

function mostrarApp(usuario) {
    document.getElementById("login").style.display = "none";
    document.getElementById("app").style.display = "block";
    document.getElementById("usuarioNombre").textContent = usuario;
    cargarTareas(usuario);
}

function logout() {
    localStorage.removeItem("usuario");
    location.reload();
}

async function crearTarea() {
    const titulo = document.getElementById("titulo").value;
    if (!titulo.trim()) {
        alert("Escribe un título");
        return;
    }
    
    const usuario = localStorage.getItem("usuario");

    await fetch(API + "/tareas", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ titulo, usuario })
    });

    document.getElementById("titulo").value = "";
    cargarTareas(usuario);
}

async function cargarTareas(usuario) {
    try {
        const res = await fetch(API + "/tareas/" + usuario);
        const tareas = await res.json();

        const lista = document.getElementById("lista");
        lista.innerHTML = "";

        tareas.forEach(t => {
            const li = document.createElement("li");
            li.className = t.estado === "completada" ? "completada" : "";

            li.innerHTML = `
                <span class="tarea-titulo">${t.titulo}</span>
                <span class="tarea-estado">[${t.estado}]</span>
                <button onclick="marcarCompletada(${t.id})" 
                        ${t.estado === "completada" ? "disabled" : ""}>✓</button>
                <button onclick="editarTarea(${t.id})">✏️</button>
                <button onclick="eliminarTarea(${t.id})">❌</button>
            `;

            lista.appendChild(li);
        });
    } catch (error) {
        console.error("Error cargando tareas:", error);
    }
}

async function eliminarTarea(id) {
    if (!confirm("¿Eliminar tarea?")) return;
    
    await fetch(API + "/tareas/" + id, { method: "DELETE" });
    cargarTareas(localStorage.getItem("usuario"));
}

async function editarTarea(id) {
    const nuevo = prompt("Nuevo título:");
    if (nuevo && nuevo.trim()) {
        await fetch(API + "/tareas/" + id, {
            method: "PUT",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ titulo: nuevo, estado: "pendiente" })
        });
        cargarTareas(localStorage.getItem("usuario"));
    }
}

async function marcarCompletada(id) {
    await fetch(API + "/tareas/" + id, {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ estado: "completada" })
    });
    cargarTareas(localStorage.getItem("usuario"));}