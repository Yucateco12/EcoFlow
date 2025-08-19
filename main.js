document.getElementById("archivoExcel").addEventListener("change", handleFile);
document.getElementById("exportarPDF").addEventListener("click", exportarResumenPDF);
document.getElementById("modoToggle").addEventListener("click", alternarModo);
document.getElementById("actualizarMetaBtn").addEventListener("click", actualizarMeta);
document.getElementById("btnSemana").addEventListener("click", () => cambiarPeriodo("semanal"));
document.getElementById("btnQuincena").addEventListener("click", () => cambiarPeriodo("quincenal"));
document.getElementById("btnMes").addEventListener("click", () => cambiarPeriodo("mensual"));

let resumenActual = {
  ingresos: 0,
  servicios: 0,
  alimentos: 0,
  salud: 0,
  prestamos: 0,
  otros: 0,
  totalGastos: 0,
  balance: 0
};

let metaMensual = 0;
let periodoSeleccionado = "mensual";
let modo = "claro"; // valor inicial para seguimiento interno

const factoresPeriodo = { semanal: 1 / 4, quincenal: 1 / 2, mensual: 1 };

function alternarModo() {
  const body = document.body;
  if (body.classList.contains("modo-oscuro")) {
    body.classList.remove("modo-oscuro");
    modo = "claro";
  } else {
    body.classList.add("modo-oscuro");
    modo = "oscuro";
  }

  if (resumenActual.ingresos > 0) actualizarUI();
}

function getGraficoColorTexto() {
  return modo === "oscuro" ? "#f0f0f0" : "#000000";
}

function cambiarPeriodo(nuevoPeriodo) {
  periodoSeleccionado = nuevoPeriodo;
  if (resumenActual.ingresos > 0) {
    actualizarUI();
  }
}

function actualizarMeta() {
  const nuevaMeta = parseFloat(document.getElementById("metaAhorro").value);
  if (!isNaN(nuevaMeta) && nuevaMeta >= 0) {
    metaMensual = nuevaMeta;
    actualizarUI();
  }
}

function handleFile(event) {
  const archivo = event.target.files[0];
  if (!archivo) return;

  const reader = new FileReader();

  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet);
    procesarDatos(json);
  };

  reader.readAsArrayBuffer(archivo);
}

function procesarDatos(datos) {
  let ingresos = 0,
    servicios = 0,
    alimentos = 0,
    salud = 0,
    prestamos = 0,
    otros = 0;

  datos.forEach((row) => {
    const tipo = (row["Tipo"] || "").toString().toLowerCase();
    const categoria = (row["Categoría"] || "").toString().toLowerCase();
    const monto = parseFloat(row["Monto"]) || 0;

    if (tipo === "ingreso") {
      ingresos += monto;
    } else if (tipo === "gasto") {
      if (["agua", "luz", "internet", "señal", "netflix", "gas"].includes(categoria)) {
        servicios += monto;
      } else if (categoria === "alimentos") {
        alimentos += monto;
      } else if (categoria === "salud") {
        salud += monto;
      } else if (categoria === "prestamos") {
        prestamos += monto;
      } else {
        otros += monto;
      }
    }
  });

  const totalGastos = servicios + alimentos + salud + prestamos + otros;
  const balance = ingresos - totalGastos;

  resumenActual = { ingresos, servicios, alimentos, salud, prestamos, otros, totalGastos, balance };
  actualizarUI();
}

function actualizarUI() {
  const factor = factoresPeriodo[periodoSeleccionado];
  const r = resumenActual;

  document.getElementById("valorIngresos").textContent = `S/ ${(r.ingresos * factor).toFixed(2)}`;
  document.getElementById("valorServicios").textContent = `S/ ${(r.servicios * factor).toFixed(2)}`;
  document.getElementById("valorAlimentos").textContent = `S/ ${(r.alimentos * factor).toFixed(2)}`;
  document.getElementById("valorSalud").textContent = `S/ ${(r.salud * factor).toFixed(2)}`;
  document.getElementById("valorPrestamos").textContent = `S/ ${(r.prestamos * factor).toFixed(2)}`;
  document.getElementById("valorOtros").textContent = `S/ ${(r.otros * factor).toFixed(2)}`;
  document.getElementById("valorGastos").textContent = `S/ ${(r.totalGastos * factor).toFixed(2)}`;
  document.getElementById("valorBalance").textContent = `S/ ${(r.balance * factor).toFixed(2)}`;

  mostrarGrafica({
    servicios: r.servicios * factor,
    alimentos: r.alimentos * factor,
    salud: r.salud * factor,
    prestamos: r.prestamos * factor,
    otros: r.otros * factor,
  });

  mostrarGraficaBarra(r.ingresos * factor, r.totalGastos * factor);
  actualizarProgreso(r.balance * factor);
}

function mostrarGrafica(gastos) {
  const ctx = document.getElementById("graficaGastos").getContext("2d");
  if (window.pieChart) window.pieChart.destroy();

  const etiquetas = Object.keys(gastos);
  const valores = Object.values(gastos);
  const total = valores.reduce((a, b) => a + b, 0);
  const etiquetasConPorcentaje = etiquetas.map(
    (etiqueta, i) => `${etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1)} (${total > 0 ? ((valores[i] / total) * 100).toFixed(1) : 0}%)`
  );

  window.pieChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: etiquetasConPorcentaje,
      datasets: [
        {
          data: valores,
          backgroundColor: ["#4e79a7", "#f28e2b", "#76b7b2", "#e15759", "#edc948"],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: getGraficoColorTexto() },
        },
        title: {
          display: true,
          text: "Distribución de Gastos",
          color: getGraficoColorTexto(),
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = etiquetas[context.dataIndex] || "";
              const value = valores[context.dataIndex];
              return `${label.charAt(0).toUpperCase() + label.slice(1)}: S/ ${value.toFixed(2)}`;
            },
          },
        },
      },
    },
  });
}

function mostrarGraficaBarra(ingresos, gastosTotales) {
  const ctx = document.getElementById("graficaBarra").getContext("2d");
  if (window.barChart) window.barChart.destroy();

  window.barChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Ingresos", "Gastos"],
      datasets: [
        {
          data: [ingresos, gastosTotales],
          backgroundColor: ["green", "red"],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false,
          labels: { color: getGraficoColorTexto() },
        },
        title: {
          display: true,
          text: "Ingresos vs Gastos Totales",
          color: getGraficoColorTexto(),
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: getGraficoColorTexto() },
        },
        x: {
          ticks: { color: getGraficoColorTexto() },
        },
      },
    },
  });
}

function actualizarProgreso(ahorro) {
  const meta = metaMensual;
  const porcentaje = meta > 0 ? Math.min((ahorro / meta) * 100, 100) : 0;

  const barra = document.getElementById("progresoMeta");
  barra.value = porcentaje;

  // Cambiar color barra progreso según modo
  if (modo === "oscuro") {
    barra.style.setProperty("--progress-color", "#3cb371");
  } else {
    barra.style.setProperty("--progress-color", "#4caf50");
  }

  const texto = document.getElementById("textoProgreso");
  texto.textContent = `${porcentaje.toFixed(0)}% (S/ ${ahorro.toFixed(2)} / S/ ${meta.toFixed(2)})`;
}

function exportarResumenPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const fecha = new Date().toLocaleDateString();
  const factor = factoresPeriodo[periodoSeleccionado];
  const r = resumenActual;

  // Si tienes un logo, cambia la ruta aquí, si no, lo quitamos
  // const logoPath = "logo.png";
  // const img = new Image();
  // img.src = logoPath;
  // img.onload = function () { /* dibujar logo y resto */ };

  // Vamos a exportar sin imagen para evitar complicaciones:
  doc.setFontSize(24);
  doc.setTextColor(78, 121, 167);
  doc.text("Informe de Presupuesto Personal", 105, 20, { align: "center" });

  doc.setFontSize(14);
  doc.setTextColor(80);
  doc.text("Resumen detallado generado por el sistema", 105, 30, { align: "center" });

  doc.setFontSize(12);
  doc.setTextColor(50);
  doc.text("Fecha de generación: " + fecha, 105, 38, { align: "center" });

  doc.setDrawColor(78, 121, 167);
  doc.line(40, 45, 170, 45);

  const datosTabla = [
    ["Ingresos", "S/ " + (r.ingresos * factor).toFixed(2)],
    ["Servicios", "S/ " + (r.servicios * factor).toFixed(2)],
    ["Alimentos", "S/ " + (r.alimentos * factor).toFixed(2)],
    ["Salud", "S/ " + (r.salud * factor).toFixed(2)],
    ["Préstamos", "S/ " + (r.prestamos * factor).toFixed(2)],
    ["Otros", "S/ " + (r.otros * factor).toFixed(2)],
    ["Total Gastos", "S/ " + (r.totalGastos * factor).toFixed(2)],
    ["Balance", "S/ " + (r.balance * factor).toFixed(2)],
  ];

  doc.autoTable({ head: [["Categoría", "Monto"]], body: datosTabla, startY: 55 });

  const ahorro = r.balance * factor;
  const porcentaje = metaMensual > 0 ? Math.min((ahorro / metaMensual) * 100, 100).toFixed(1) : "0";

  doc.autoTable({
    head: [["Meta de Ahorro", "Ahorro Actual", "Progreso"]],
    body: [[`S/ ${metaMensual.toFixed(2)}`, `S/ ${ahorro.toFixed(2)}`, `${porcentaje}%`]],
    startY: doc.lastAutoTable.finalY + 10,
  });

  const comentario =
    ahorro >= 0
      ? "✅ ¡Buen trabajo! Tienes un balance positivo."
      : "⚠️ Cuidado, estás gastando más de lo que ganas.";

  doc.setFontSize(12);
  doc.text(comentario, 20, doc.lastAutoTable.finalY + 25);

  doc.save("resumen_presupuesto.pdf");
}
