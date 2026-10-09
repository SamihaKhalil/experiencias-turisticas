let experiencias = [];
let reservas = [];
let textoBusqueda = "";
let categoriaActual = "todas";
let ordenActual = "normal";
let precioMaximo = null;
let temporizadorMensaje = null;

const catalogo = document.querySelector("#catalogo");
const buscador = document.querySelector("#buscador");
const filtroCategoria = document.querySelector("#filtroCategoria");
const filtroPrecioMaximo = document.querySelector("#precioMaximo");
const ordenPrecio = document.querySelector("#ordenPrecio");
const listaReservas = document.querySelector("#listaReservas");
const total = document.querySelector("#total");
const totalPersonas = document.querySelector("#totalPersonas");
const estado = document.querySelector("#estado");
const mensaje = document.querySelector("#mensaje");
const btnVaciar = document.querySelector("#btnVaciar");
const confirmacion = document.querySelector("#confirmacion");
const btnConfirmarVaciar = document.querySelector("#btnConfirmarVaciar");
const btnCancelarVaciar = document.querySelector("#btnCancelarVaciar");


function mostrarMensaje(texto, tipo = "error") {
  mensaje.textContent = texto;
  mensaje.className = `mensaje mensaje-${tipo}`;
  clearTimeout(temporizadorMensaje);
  temporizadorMensaje = setTimeout(limpiarMensaje, 4000);
}

function limpiarMensaje() {
  mensaje.textContent = "";
  mensaje.className = "mensaje";
}


async function cargarExperiencias() {
  try {
    estado.textContent = "Cargando experiencias...";
    const respuesta = await fetch("./data/experiencias.json");
    if (!respuesta.ok) throw new Error("No fue posible cargar las experiencias");
    experiencias = await respuesta.json();
    actualizarCatalogo();
  } catch (error) {
    estado.textContent = "Error al cargar la información";
    console.error(error);
  }
}

function obtenerResultados() {
  let resultados = [...experiencias];

  if (categoriaActual !== "todas") {
    resultados = resultados.filter(e => e.categoria === categoriaActual);
  }
  if (textoBusqueda !== "") {
    resultados = resultados.filter(e =>
      e.nombre.toLowerCase().includes(textoBusqueda));
  }
  if (precioMaximo !== null) {
    resultados = resultados.filter(e => e.precio <= precioMaximo);
  }
  if (ordenActual === "ascendente") resultados.sort((a, b) => a.precio - b.precio);
  if (ordenActual === "descendente") resultados.sort((a, b) => b.precio - a.precio);

  return resultados;
}

function actualizarCatalogo() {
  const resultados = obtenerResultados();

  if (resultados.length === 0) {
    catalogo.innerHTML = `<p class="sin-resultados">No se encontraron experiencias</p>`;
    estado.textContent = "0 resultados";
    return;
  }

  catalogo.innerHTML = resultados.map(e => `
    <article class="tarjeta">
      <div class="imagen" aria-hidden="true">${e.icono}</div>
      <div class="informacion">
        <span class="categoria">${e.categoria}</span>
        <h3>${e.nombre}</h3>
        <p>Cupo disponible: ${e.cupo}</p>
        <p class="precio">$${e.precio} MXN</p>
        <label>Personas:
          <input type="number" id="cantidad-${e.id}" min="1" max="${e.cupo}" value="1">
        </label>
        <button class="btn-reservar" type="button" data-id="${e.id}">Agregar</button>
      </div>
    </article>`).join("");

  estado.textContent = `${resultados.length} resultados`;
  agregarEventosReservar();
}

function agregarEventosReservar() {
  document.querySelectorAll(".btn-reservar").forEach(boton => {
    boton.addEventListener("click", () => agregarReserva(boton.dataset.id));
  });
}


function buscarExperiencia(id) {
  return experiencias.find(e => String(e.id) === String(id));
}

function agregarReserva(id) {
  const experiencia = buscarExperiencia(id);
  const cantidad = Number(document.getElementById(`cantidad-${id}`).value);


  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > experiencia.cupo) {
  mostrarMensaje(`Se superó el cupo: "${experiencia.nombre}" admite máximo ${experiencia.cupo} personas.`);
  return;
  }

  const existente = reservas.find(r => String(r.experienciaId) === String(id));
  if (existente) {
    const nuevaCantidad = existente.cantidad + cantidad;
if (nuevaCantidad > experiencia.cupo) {
  mostrarMensaje(`Se superó el cupo: ya tienes ${existente.cantidad} reservadas y el máximo es ${experiencia.cupo}.`);
  return;
}
    existente.cantidad = nuevaCantidad;
    existente.subtotal = nuevaCantidad * experiencia.precio;
  } else {
    reservas.push({
      experienciaId: experiencia.id,
      nombre: experiencia.nombre,
      precio: experiencia.precio,
      cantidad,
      subtotal: experiencia.precio * cantidad
    });
  }

  mostrarMensaje(`"${experiencia.nombre}" agregada a tu reservación.`, "exito");
  mostrarReservas();
}

function cambiarCantidad(id, cambio) {
  const reserva = reservas.find(r => String(r.experienciaId) === String(id));
  const experiencia = buscarExperiencia(id);
  if (!reserva || !experiencia) return;

  const nuevaCantidad = reserva.cantidad + cambio;
  if (nuevaCantidad < 1) {
    mostrarMensaje("La cantidad mínima es 1. Usa Eliminar para quitarla.");
    return;
  }
  if (nuevaCantidad > experiencia.cupo) {
    mostrarMensaje("La cantidad supera el cupo disponible.");
    return;
  }

  reserva.cantidad = nuevaCantidad;
  reserva.subtotal = nuevaCantidad * reserva.precio;
  mostrarReservas();
}

function eliminarReserva(id) {
  reservas = reservas.filter(r => String(r.experienciaId) !== String(id));
  mostrarReservas();
}

function mostrarReservas() {
  const hayReservas = reservas.length > 0;
  btnVaciar.disabled = !hayReservas;

  if (!hayReservas) {
    listaReservas.innerHTML = "<p>No hay experiencias seleccionadas.</p>";
    total.textContent = "$0 MXN";
    totalPersonas.textContent = "0";
    ocultarConfirmacion();
    return;
  }

  listaReservas.innerHTML = reservas.map(r => `
    <article class="item-reserva">
      <div>
        <strong>${r.nombre}</strong>
        <p>${r.cantidad} persona(s) × $${r.precio}</p>
        <div class="control-cantidad">
          <button type="button" class="btn-cantidad" data-accion="restar"
            data-id="${r.experienciaId}" aria-label="Disminuir personas de ${r.nombre}"
            ${r.cantidad <= 1 ? "disabled" : ""}>−</button>
          <span aria-live="polite">${r.cantidad}</span>
          <button type="button" class="btn-cantidad" data-accion="sumar"
            data-id="${r.experienciaId}" aria-label="Aumentar personas de ${r.nombre}">+</button>
        </div>
      </div>
      <div>
        <strong>$${r.subtotal} MXN</strong>
        <button type="button" class="btn-eliminar" data-accion="eliminar"
          data-id="${r.experienciaId}" aria-label="Eliminar ${r.nombre}">Eliminar</button>
      </div>
    </article>`).join("");

  const importeTotal = reservas.reduce((suma, r) => suma + r.subtotal, 0);
  const personasTotal = reservas.reduce((suma, r) => suma + r.cantidad, 0);
  total.textContent = `$${importeTotal} MXN`;
  totalPersonas.textContent = personasTotal;
}

function mostrarConfirmacion() {
  confirmacion.hidden = false;
  btnConfirmarVaciar.focus();
}

function ocultarConfirmacion() {
  confirmacion.hidden = true;
}

function vaciarReservacion() {
  reservas = [];
  mostrarReservas();
  mostrarMensaje("La reservación se vació correctamente.", "exito");
}

listaReservas.addEventListener("click", evento => {
  const boton = evento.target.closest("button[data-accion]");
  if (!boton) return;

  const { accion, id } = boton.dataset;
  if (accion === "sumar") cambiarCantidad(id, 1);
  if (accion === "restar") cambiarCantidad(id, -1);
  if (accion === "eliminar") eliminarReserva(id);
});

btnVaciar.addEventListener("click", mostrarConfirmacion);
btnCancelarVaciar.addEventListener("click", () => {
  ocultarConfirmacion();
  btnVaciar.focus();
});
btnConfirmarVaciar.addEventListener("click", () => {
  vaciarReservacion();
  btnVaciar.focus();
});

buscador.addEventListener("input", () => {
  textoBusqueda = buscador.value.trim().toLowerCase();
  actualizarCatalogo();
});
filtroCategoria.addEventListener("change", () => {
  categoriaActual = filtroCategoria.value;
  actualizarCatalogo();
});
filtroPrecioMaximo.addEventListener("input", () => {
  const valor = filtroPrecioMaximo.value.trim();
  precioMaximo = valor === "" ? null : Number(valor);
  actualizarCatalogo();
});
ordenPrecio.addEventListener("change", () => {
  ordenActual = ordenPrecio.value;
  actualizarCatalogo();
});

cargarExperiencias();