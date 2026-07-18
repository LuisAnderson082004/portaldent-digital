/* pdf-generator.js - Custom Report Compiler & Printer Engine */

export function exportPatientPDFDirect(patientId, state) {
    const patient = state.patients.find(p => p.id === patientId);
    if (!patient) return;

    // Compile clinical notes
    let notesHTML = '';
    const sortedNotes = [...patient.evolutionNotes].sort((a, b) => b.version - a.version);
    
    if (sortedNotes.length === 0) {
        notesHTML = '<p>No se registran notas de evolución en esta historia clínica.</p>';
    } else {
        notesHTML = `
            <table class="print-table">
                <thead>
                    <tr>
                        <th style="width: 10%;">Versión</th>
                        <th style="width: 25%;">Fecha y Hora</th>
                        <th style="width: 20%;">Profesional</th>
                        <th style="width: 45%;">Evolución / Detalle Clínico</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedNotes.map(n => {
                        const d = new Date(n.timestamp);
                        return `
                            <tr>
                                <td><strong>V${n.version}</strong></td>
                                <td><code>${d.toLocaleString('es-PE')}</code></td>
                                <td>${n.author}</td>
                                <td>${n.content}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    // Compile Odontogram summary
    let odontogramSummaryHTML = '';
    const baselineAbsent = Object.keys(patient.odontogram.baseline).filter(k => patient.odontogram.baseline[k] === 'absent');
    const evolutionExtracted = Object.keys(patient.odontogram.evolution).filter(k => patient.odontogram.evolution[k].status === 'extracted');
    
    const treatments = [];
    Object.keys(patient.odontogram.evolution).forEach(tId => {
        const item = patient.odontogram.evolution[tId];
        if (item.surfaces) {
            Object.keys(item.surfaces).forEach(surf => {
                treatments.push({
                    tooth: tId,
                    surface: surf,
                    type: item.surfaces[surf],
                    note: item.notes[surf] || ''
                });
            });
        }
    });

    if (baselineAbsent.length === 0 && evolutionExtracted.length === 0 && treatments.length === 0) {
        odontogramSummaryHTML = '<p class="no-records">Odontograma sin hallazgos registrados (Dentadura completa y sana).</p>';
    } else {
        odontogramSummaryHTML = `
            <table class="print-table">
                <thead>
                    <tr>
                        <th style="width: 15%;">Pieza Dental</th>
                        <th style="width: 25%;">Estado / Superficie</th>
                        <th style="width: 20%;">Categoría</th>
                        <th style="width: 40%;">Detalle Clínico / Diagnóstico</th>
                    </tr>
                </thead>
                <tbody>
                    ${baselineAbsent.map(t => `
                        <tr>
                            <td><strong>Pieza ${t}</strong></td>
                            <td>Toda la pieza</td>
                            <td><span class="badge-print badge-danger">Ausente Inicial</span></td>
                            <td>Ausencia registrada en la ficha de admisión clínica.</td>
                        </tr>
                    `).join('')}
                    ${evolutionExtracted.map(t => `
                        <tr>
                            <td><strong>Pieza ${t}</strong></td>
                            <td>Toda la pieza</td>
                            <td><span class="badge-print badge-danger">Extracción</span></td>
                            <td>Extracción quirúrgica realizada durante evolución.</td>
                        </tr>
                    `).join('')}
                    ${treatments.map(t => `
                        <tr>
                            <td><strong>Pieza ${t.tooth}</strong></td>
                            <td>Superficie ${getSurfaceNameSpanishPrint(t.surface)}</td>
                            <td><span class="badge-print badge-${t.type}">${getTreatmentNameSpanishPrint(t.type)}</span></td>
                            <td>${t.note}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    const dobObj = new Date(patient.dob + "T12:00:00");
    const dobFormatted = dobObj.toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' });

    // Render inside temporary iframe for high fidelity printing
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow.document;
    doc.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Resumen Clínico - Historia Clínica #${patient.historyNumber}</title>
            <style>
                body {
                    font-family: 'Segoe UI', Arial, sans-serif;
                    color: #1e293b;
                    background-color: #ffffff;
                    margin: 40px;
                    font-size: 13px;
                    line-height: 1.5;
                }
                .print-header {
                    border-bottom: 3px solid #0284c7;
                    padding-bottom: 15px;
                    margin-bottom: 25px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .clinic-logo {
                    font-size: 20px;
                    font-weight: 700;
                    color: #0284c7;
                }
                .clinic-logo span {
                    color: #1e293b;
                }
                .doc-title {
                    text-align: right;
                }
                .doc-title h1 {
                    font-size: 18px;
                    margin: 0;
                    color: #1e293b;
                    text-transform: uppercase;
                }
                .doc-title p {
                    margin: 3px 0 0 0;
                    font-size: 11px;
                    color: #64748b;
                }
                .grid-info {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px;
                    margin-bottom: 25px;
                }
                .info-card {
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    padding: 12px;
                    background-color: #f8fafc;
                }
                .info-card h3 {
                    margin: 0 0 8px 0;
                    font-size: 12px;
                    text-transform: uppercase;
                    color: #0284c7;
                    border-bottom: 1px solid #e2e8f0;
                    padding-bottom: 4px;
                }
                .info-card p {
                    margin: 4px 0;
                    font-size: 11.5px;
                }
                .info-card p strong {
                    color: #475569;
                }
                .alert-box {
                    border: 2px solid #ef4444;
                    background-color: #fee2e2;
                    color: #991b1b;
                    border-radius: 8px;
                    padding: 12px;
                    margin-bottom: 25px;
                    font-weight: bold;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .section-title {
                    font-size: 13px;
                    font-weight: 700;
                    color: #1e293b;
                    text-transform: uppercase;
                    margin: 25px 0 10px 0;
                    border-bottom: 2px solid #e2e8f0;
                    padding-bottom: 5px;
                }
                .print-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 11.5px;
                    margin-bottom: 20px;
                }
                .print-table th {
                    background-color: #f1f5f9;
                    border: 1px solid #cbd5e1;
                    padding: 8px;
                    text-align: left;
                    font-weight: bold;
                    color: #475569;
                }
                .print-table td {
                    border: 1px solid #cbd5e1;
                    padding: 8px;
                }
                .badge-print {
                    display: inline-block;
                    padding: 2px 6px;
                    font-size: 9px;
                    font-weight: bold;
                    border-radius: 4px;
                    text-transform: uppercase;
                }
                .badge-danger { background-color: #fee2e2; color: #991b1b; }
                .badge-curation { background-color: #dbeafe; color: #1e40af; }
                .badge-sealant { background-color: #d1fae5; color: #065f46; }
                .badge-pathology { background-color: #fef3c7; color: #92400e; }
                
                .footer-container {
                    margin-top: 50px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-top: 1px solid #e2e8f0;
                    padding-top: 20px;
                }
                .clinic-seal {
                    border: 2px dashed #0284c7;
                    border-radius: 50%;
                    width: 110px;
                    height: 110px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    color: #0284c7;
                    font-weight: bold;
                    font-size: 8px;
                    transform: rotate(-10deg);
                    background-color: rgba(2, 132, 199, 0.05);
                }
                .seal-title {
                    font-size: 9px;
                    letter-spacing: 0.5px;
                    text-transform: uppercase;
                }
                .signature-line {
                    width: 200px;
                    border-top: 1px solid #475569;
                    text-align: center;
                    padding-top: 5px;
                    font-size: 11px;
                    font-weight: bold;
                    margin-top: 40px;
                }
                @media print {
                    body { margin: 20px; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="print-header">
                <div class="clinic-logo">Portal <span>Dentistas</span></div>
                <div class="doc-title">
                    <h1>Resumen de Historial Clínico</h1>
                    <p>Documento Oficial Firmado Electrónicamente</p>
                </div>
            </div>

            ${patient.allergies && patient.allergies.toLowerCase() !== 'ninguna' && patient.allergies.toLowerCase() !== 'ninguno' ? `
                <div class="alert-box">
                    <span style="font-size: 16px;">⚠</span> ALERTA MÉDICA: Paciente registra sensibilidad o alergias conocidas: ${patient.allergies}
                </div>
            ` : ''}

            <div class="grid-info">
                <div class="info-card">
                    <h3>Datos de Identificación</h3>
                    <p><strong>Paciente:</strong> ${patient.firstname} ${patient.lastname}</p>
                    <p><strong>Documento Identidad (DNI):</strong> ${patient.dni}</p>
                    <p><strong>N° Historia Clínica:</strong> HC-${patient.historyNumber}</p>
                    <p><strong>Fecha Nacimiento:</strong> ${dobFormatted}</p>
                </div>
                <div class="info-card">
                    <h3>Contacto y Antecedentes</h3>
                    <p><strong>Celular:</strong> ${patient.phone}</p>
                    <p><strong>Correo Electrónico:</strong> ${patient.email}</p>
                    <p><strong>Dirección:</strong> ${patient.address}</p>
                    <p><strong>Antecedentes Médicos:</strong> ${patient.chronic || 'Ninguno especificado'}</p>
                </div>
            </div>

            <div class="section-title">Evolución Clínica y Tratamientos (Odontograma)</div>
            ${odontogramSummaryHTML}

            <div class="section-title">Historial de Notas de Evolución</div>
            ${notesHTML}

            <div class="footer-container">
                <div>
                    <p style="font-size: 10px; color: #64748b; margin: 0;">Portal Dentistas Software, version 2.0</p>
                    <p style="font-size: 10px; color: #64748b; margin: 2px 0 0 0;">ID de Seguridad Documentaria: SEC-${Date.now().toString().slice(-8)}</p>
                </div>
                
                <div class="signature-line">
                    Firma Electrónica Autorizada
                </div>

                <div class="clinic-seal">
                    <div class="seal-title">PORTAL DENTISTAS</div>
                    <div style="font-size: 7px; margin: 2px 0;">SELLO DIGITAL</div>
                    <div style="font-size: 6px;">VALIDEZ LEGAL</div>
                    <div style="font-size: 5px; color: #64748b; margin-top: 4px;">COD-948201</div>
                </div>
            </div>

            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() {
                        window.frameElement.remove();
                    }, 1000);
                }
            </script>
        </body>
        </html>
    `);
    doc.close();
}

function getSurfaceNameSpanishPrint(surf) {
    switch (surf) {
        case 'buccal': return 'Vestibular (Bucal)';
        case 'lingual': return 'Lingual / Palatino';
        case 'mesial': return 'Mesial';
        case 'distal': return 'Distal';
        case 'occlusal': return 'Oclusal / Incisal';
        default: return surf;
    }
}

function getTreatmentNameSpanishPrint(type) {
    switch (type) {
        case 'curation': return 'Curación';
        case 'sealant': return 'Sellante';
        case 'pathology': return 'Patología / Caries';
        case 'extraction': return 'Extracción';
        default: return type;
    }
}

export function printBudgetSheet(patientId, state) {
    const patient = state.patients.find(p => p.id === patientId);
    if (!patient) return;

    // Get rows from DOM to capture live values (including unsaved discount changes)
    const rows = [];
    const tableRows = document.querySelectorAll('#budget-table-body tr');
    tableRows.forEach(tr => {
        if (!tr.dataset.basePrice) return;
        const name = tr.cells[0].innerText;
        const tooth = tr.cells[1].innerText;
        const basePrice = parseFloat(tr.dataset.basePrice);
        const input = tr.querySelector('.budget-discount-input');
        const discountPercent = input ? (parseFloat(input.value) || 0) : 0;
        const discountAmount = basePrice * (discountPercent / 100);
        const finalPrice = Math.max(0, basePrice - discountAmount);
        
        rows.push({
            name,
            tooth,
            basePrice,
            discountPercent,
            finalPrice
        });
    });

    const hasDeposit = state.appointments.some(appt => appt.patientId === patientId && appt.depositPaid);
    const depositAmount = hasDeposit ? 50.00 : 0.00;
    
    let subtotal = 0;
    rows.forEach(r => subtotal += r.finalPrice);
    const finalTotal = Math.max(0, subtotal - depositAmount);

    const now = state.systemTime || new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const dateFormatted = `${day}/${month}/${year}`;

    // Try to get a dentist name from appointments or local state
    const dentistAppt = state.appointments.find(a => a.patientId === patientId);
    const dentistName = dentistAppt ? dentistAppt.dentistName : (state.currentUser && state.currentUser.role === 'dentist' ? state.currentUser.name : '');

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow.document;
    doc.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Hoja de Presupuesto - ${patient.firstname} ${patient.lastname}</title>
            <style>
                @page {
                    size: A4;
                    margin: 15mm;
                }
                body {
                    font-family: 'Segoe UI', Arial, sans-serif;
                    color: #1c1a17;
                    background-color: #ffffff;
                    margin: 0;
                    padding: 0;
                    font-size: 13px;
                    line-height: 1.4;
                }
                .budget-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    border-bottom: 2px solid #e2d7be;
                    padding-bottom: 15px;
                    margin-bottom: 30px;
                }
                .logo-container {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }
                .logo-img {
                    height: 70px;
                    width: auto;
                    border-radius: 8px;
                }
                .brand-info h2 {
                    margin: 0;
                    font-size: 16px;
                    font-weight: 700;
                    color: #1c1a17;
                }
                .brand-info p {
                    margin: 2px 0 0 0;
                    font-size: 10px;
                    color: #6b6355;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .title-container {
                    text-align: right;
                }
                .title-container h1 {
                    margin: 0;
                    font-size: 22px;
                    font-weight: 300;
                    color: #1b4332; /* elegant clinic green */
                    font-family: Georgia, serif;
                }
                .title-container h1 span {
                    font-weight: 700;
                    color: #cbb27a; /* elegant clinic gold */
                    display: block;
                    font-size: 16px;
                    font-family: inherit;
                    margin-top: 2px;
                }
                .date-box {
                    font-size: 12px;
                    font-weight: bold;
                    margin-top: 10px;
                    color: #4a453e;
                }
                
                .details-grid {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    margin-bottom: 35px;
                    font-size: 13px;
                }
                .detail-row {
                    display: flex;
                    align-items: center;
                }
                .detail-label {
                    font-weight: bold;
                    color: #4a453e;
                    width: 180px;
                    text-transform: uppercase;
                    font-size: 11px;
                    letter-spacing: 0.5px;
                }
                .detail-value {
                    flex-grow: 1;
                    border-bottom: 1px dotted #ab8f51;
                    padding-bottom: 2px;
                    font-weight: 600;
                }

                .budget-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 35px;
                }
                .budget-table th {
                    border: 1.5px solid #1c1a17;
                    background-color: #f7f4ed;
                    padding: 8px 10px;
                    font-weight: bold;
                    text-transform: uppercase;
                    font-size: 11px;
                    color: #1c1a17;
                    letter-spacing: 0.5px;
                    text-align: left;
                }
                .budget-table td {
                    border: 1.5px solid #1c1a17;
                    padding: 9px 10px;
                    font-size: 12px;
                }
                .text-center { text-align: center; }
                .text-right { text-align: right; }

                .total-label-cell {
                    font-weight: bold;
                    text-transform: uppercase;
                    text-align: right;
                }
                .total-amount-cell {
                    font-weight: 800;
                    font-size: 13px;
                    background-color: #f7f4ed;
                }

                .budget-footer {
                    margin-top: 60px;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                }
                .validity-text {
                    font-size: 11px;
                    color: #6b6355;
                    font-style: italic;
                    max-width: 300px;
                    line-height: 1.4;
                }
                .signature-box {
                    text-align: center;
                    width: 250px;
                }
                .signature-line {
                    border-top: 1px solid #1c1a17;
                    margin-bottom: 5px;
                }
                .signature-label {
                    font-size: 11px;
                    font-weight: bold;
                    color: #4a453e;
                    text-transform: uppercase;
                }
            </style>
        </head>
        <body>
            <div class="budget-header">
                <div class="logo-container">
                    <img src="assets/images/logo.png" class="logo-img" alt="Logo">
                    <div class="brand-info">
                        <h2>Portal Dentistas</h2>
                        <p>Consultorio Odontológico</p>
                    </div>
                </div>
                <div class="title-container">
                    <h1>Odontología <span>Hoja de Presupuesto</span></h1>
                    <div class="date-box">FECHA: ${dateFormatted}</div>
                </div>
            </div>

            <div class="details-grid">
                <div class="detail-row">
                    <span class="detail-label">Nombre del Paciente:</span>
                    <span class="detail-value">${patient.firstname} ${patient.lastname}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Nombre del Dentista:</span>
                    <span class="detail-value">${dentistName || '__________________________________________________'}</span>
                </div>
            </div>

            <table class="budget-table">
                <thead>
                    <tr>
                        <th style="width: 10%;" class="text-center">Cant.</th>
                        <th style="width: 50%;">Estudio / Servicio</th>
                        <th style="width: 15%;" class="text-center">Fecha de Cita</th>
                        <th style="width: 12.5%;" class="text-right">Unitario</th>
                        <th style="width: 12.5%;" class="text-right">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.map(r => {
                        const serviceName = r.discountPercent > 0 
                            ? `${r.name} (${r.tooth}) <span style="font-size: 10px; color: #6b6355; font-style: italic;">- Dcto. ${r.discountPercent}%</span>`
                            : `${r.name} (${r.tooth})`;
                        return `
                            <tr>
                                <td class="text-center">01</td>
                                <td>${serviceName}</td>
                                <td class="text-center" style="color: #cbd5e1;">___________</td>
                                <td class="text-right">S/ ${r.basePrice.toFixed(2)}</td>
                                <td class="text-right">S/ ${r.finalPrice.toFixed(2)}</td>
                            </tr>
                        `;
                    }).join('')}
                    
                    ${hasDeposit ? `
                        <tr>
                            <td class="text-center">01</td>
                            <td>Abono por Separación de Cita (Previo)</td>
                            <td class="text-center" style="color: #cbd5e1;">___________</td>
                            <td class="text-right">-S/ 50.00</td>
                            <td class="text-right">-S/ 50.00</td>
                        </tr>
                    ` : ''}

                    <tr>
                        <td colspan="3" class="total-label-cell">Total</td>
                        <td colspan="2" class="total-amount-cell text-right">S/ ${finalTotal.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>

            <div class="budget-footer">
                <div class="validity-text">
                    Este documento tiene validez de 30 días después de su elaboración.
                </div>
                <div class="signature-box">
                    <div class="signature-line"></div>
                    <div class="signature-label">Firma del Dentista</div>
                    ${dentistName ? `<div style="font-size: 10px; color: #6b6355; margin-top: 2px;">${dentistName}</div>` : ''}
                </div>
            </div>

            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() {
                        window.frameElement.remove();
                    }, 1000);
                }
            </script>
        </body>
        </html>
    `);
    doc.close();
}

export function printOrthoControlSheet(control, patient) {
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow.document;

    const parseCheckbox = (val) => val ? '[X]' : '[  ]';
    const parseYesNo = (val) => val === 'SI' ? '[X] SÍ  [  ] NO' : val === 'NO' ? '[  ] SÍ  [X] NO' : '[  ] SÍ  [  ] NO';
    
    // Format dates
    const dParts = control.date.split('-');
    const dateFormatted = `${dParts[2]}/${dParts[1]}/${dParts[0]}`;

    doc.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Seguimiento Ortodoncia - ${patient.firstname} ${patient.lastname}</title>
            <style>
                @page {
                    size: A4;
                    margin: 15mm;
                }
                body {
                    font-family: 'Segoe UI', Arial, sans-serif;
                    color: #1c1a17;
                    background-color: #ffffff;
                    margin: 0;
                    padding: 0;
                    font-size: 11px;
                    line-height: 1.35;
                }
                .header-table {
                    width: 100%;
                    border-bottom: 2px solid #1c1a17;
                    padding-bottom: 10px;
                    margin-bottom: 15px;
                }
                .logo-brand {
                    font-size: 18px;
                    font-weight: bold;
                    color: #1b4332;
                }
                .header-info {
                    text-align: right;
                    font-size: 9px;
                    color: #4a453e;
                }
                .title-doc {
                    text-align: center;
                    font-size: 15px;
                    font-weight: 800;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                    margin: 15px 0;
                    color: #1c1a17;
                    border-bottom: 1.5px solid #1c1a17;
                    padding-bottom: 3px;
                }
                .details-grid {
                    display: grid;
                    grid-template-columns: 1.5fr 1fr;
                    gap: 10px;
                    margin-bottom: 20px;
                }
                .detail-line {
                    border-bottom: 1px dotted #ab8f51;
                    font-weight: 600;
                }
                .section-title {
                    font-weight: bold;
                    text-transform: uppercase;
                    margin-bottom: 10px;
                    border-bottom: 1px solid #1c1a17;
                    padding-bottom: 2px;
                    font-size: 11px;
                }
                .control-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }
                .control-list li {
                    margin-bottom: 7px;
                    display: flex;
                    align-items: flex-start;
                }
                .checkbox-indicator {
                    font-family: monospace;
                    margin-right: 8px;
                    font-weight: bold;
                }
                .field-desc {
                    flex-grow: 1;
                }
                .obs-box {
                    border: 1px solid #1c1a17;
                    padding: 10px;
                    min-height: 80px;
                    margin-top: 15px;
                    font-size: 11px;
                    white-space: pre-wrap;
                }
                .footer-sign {
                    margin-top: 50px;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                }
                .sig-box {
                    border-top: 1px solid #1c1a17;
                    width: 220px;
                    text-align: center;
                    padding-top: 5px;
                    font-size: 10px;
                    font-weight: bold;
                }
            </style>
        </head>
        <body>
            <table class="header-table">
                <tr>
                    <td>
                        <div class="logo-brand">EDENTS E.I.R.L.</div>
                        <div style="font-size: 9px; color: #6b6355;">Calle Aricota 106 oficina 202 Chacarilla Surco Lima</div>
                    </td>
                    <td class="header-info">
                        <strong>RUC:</strong> 20602845690 | <strong>TELF:</strong> 992145641<br>
                        <strong>e-mail:</strong> Clinicacedents@gmail.com<br>
                        <strong>HC:</strong> ${patient.historyNumber || '______'} &nbsp;&nbsp;&nbsp; <strong>FECHA:</strong> ${dateFormatted}
                    </td>
                </tr>
            </table>

            <div class="title-doc">Seguimiento Ortodoncia</div>

            <div class="details-grid">
                <div><strong>Nombre del paciente:</strong> <span class="detail-line">&nbsp;${patient.firstname} ${patient.lastname}&nbsp;</span></div>
                <div><strong>Fecha/Hora Control:</strong> <span class="detail-line">&nbsp;${dateFormatted} ${control.time || ''}&nbsp;</span></div>
                <div><strong>Dr tratante:</strong> <span class="detail-line">&nbsp;${control.dentist_name || '________________________'}&nbsp;</span></div>
                <div><strong>COP:</strong> <span class="detail-line">&nbsp;${control.dentist_cop || '________'}&nbsp;</span></div>
                <div style="grid-column: span 2;"><strong>Tipo de visita:</strong> <span class="detail-line">&nbsp;${control.visit_type || 'Control'}&nbsp;</span></div>
            </div>

            <div class="section-title">1. Control y Evolución Ortodoncia (Trabajo Realizado)</div>
            
            <ul class="control-list">
                <li>
                    <span class="checkbox-indicator">[ ]</span>
                    <span class="field-desc"><strong>Separadores:</strong> Superior ${parseCheckbox(control.separators?.sup)} &nbsp; Inferior ${parseCheckbox(control.separators?.inf)} &nbsp; No requiere ${parseCheckbox(control.separators?.none)}</span>
                </li>
                <li>
                    <span class="checkbox-indicator">[ ]</span>
                    <span class="field-desc"><strong>Cementado de Brackets:</strong> Superior ${parseCheckbox(control.brackets_bonding?.sup)} &nbsp; Inferior ${parseCheckbox(control.brackets_bonding?.inf)}</span>
                </li>
                <li>
                    <span class="checkbox-indicator">[ ]</span>
                    <span class="field-desc"><strong>Tubos:</strong> Superior ${parseCheckbox(control.tubes?.sup)} &nbsp; Inferior ${parseCheckbox(control.tubes?.inf)} &nbsp; No requiere ${parseCheckbox(control.tubes?.none)} &nbsp;&nbsp;&nbsp; ${control.tubes_motif ? `<strong>Motivo:</strong> ${control.tubes_motif}` : ''}</span>
                </li>
                <li>
                    <span class="checkbox-indicator">[ ]</span>
                    <span class="field-desc"><strong>Bandas:</strong> Superior ${parseCheckbox(control.bands?.sup)} &nbsp; Inferior ${parseCheckbox(control.bands?.inf)} &nbsp; No requiere ${parseCheckbox(control.bands?.none)} &nbsp;&nbsp;&nbsp; ${control.bands_motif ? `<strong>Motivo:</strong> ${control.bands_motif}` : ''}</span>
                </li>
                <li>
                    <span class="checkbox-indicator">[ ]</span>
                    <span class="field-desc"><strong>Arco superior detalles:</strong> ${control.arch_upper_details || '__________________________________________________'}</span>
                </li>
                <li>
                    <span class="checkbox-indicator">[ ]</span>
                    <span class="field-desc"><strong>Arco inferior detalles:</strong> ${control.arch_lower_details || '__________________________________________________'}</span>
                </li>
                <li>
                    <span class="checkbox-indicator">[ ]</span>
                    <span class="field-desc"><strong>Uso de ligas intermaxilares:</strong> ${parseYesNo(control.ligatures_use?.yes_no)} &nbsp;&nbsp;&nbsp; ${control.ligatures_use?.num ? `<strong>n°:</strong> ${control.ligatures_use.num}` : ''}</span>
                </li>
                <li>
                    <span class="checkbox-indicator">[ ]</span>
                    <span class="field-desc"><strong>Paciente utiliza ligas intermaxilares:</strong> ${parseYesNo(control.ligatures_patient?.yes_no)} &nbsp;&nbsp;&nbsp; ${control.ligatures_motif ? `<strong>Motivo:</strong> ${control.ligatures_motif}` : ''}</span>
                </li>
                <li>
                    <span class="checkbox-indicator">[ ]</span>
                    <span class="field-desc"><strong>Cambio de Elastic:</strong> ${parseYesNo(control.elastic_change)}</span>
                </li>
                <li>
                    <span class="checkbox-indicator">[ ]</span>
                    <span class="field-desc"><strong>Repegado de Brackets:</strong> ${parseYesNo(control.brackets_rebound?.yes_no)} &nbsp;&nbsp;&nbsp; ${control.brackets_rebound?.pieces ? `<strong>Piezas:</strong> ${control.brackets_rebound.pieces}` : ''}</span>
                </li>
                <li>
                    <span class="checkbox-indicator">[ ]</span>
                    <span class="field-desc"><strong>Repegado de Tubos:</strong> ${parseYesNo(control.tubes_rebound?.yes_no)} &nbsp;&nbsp;&nbsp; ${control.tubes_rebound?.pieces ? `<strong>Piezas:</strong> ${control.tubes_rebound.pieces}` : ''}</span>
                </li>
                <li>
                    <span class="checkbox-indicator">[ ]</span>
                    <span class="field-desc"><strong>Repegado de Bandas:</strong> ${parseYesNo(control.bands_rebound?.yes_no)} &nbsp;&nbsp;&nbsp; ${control.bands_rebound?.pieces ? `<strong>Piezas:</strong> ${control.bands_rebound.pieces}` : ''}</span>
                </li>
                <li>
                    <span class="checkbox-indicator">[ ]</span>
                    <span class="field-desc"><strong>Higiene del paciente:</strong> Buena ${parseCheckbox(control.hygiene === 'Buena')} &nbsp; Mala ${parseCheckbox(control.hygiene === 'Mala')} &nbsp;&nbsp;&nbsp; ${control.hygiene_profilaxis ? '<strong>[X] Se deriva a profilaxis</strong>' : '[  ] Se deriva a profilaxis'}</span>
                </li>
                <li>
                    <span class="checkbox-indicator">[ ]</span>
                    <span class="field-desc"><strong>Presencia de caries:</strong> SÍ ${parseCheckbox(control.caries === 'SI')} &nbsp; NO ${parseCheckbox(control.caries === 'NO')} &nbsp;&nbsp;&nbsp; ${control.caries_cure ? '<strong>[X] Se deriva a curar</strong>' : '[  ] Se deriva a curar'}</span>
                </li>
                ${control.referrals && control.referrals.length > 0 ? `
                <li>
                    <span class="checkbox-indicator">[X]</span>
                    <span class="field-desc"><strong>Se deriva a:</strong> ${control.referrals.join(', ')} &nbsp;&nbsp;&nbsp; ${control.referral_specs ? `<strong>Especif:</strong> ${control.referral_specs}` : ''}</span>
                </li>
                ` : ''}
                <li>
                    <span class="checkbox-indicator">[ ]</span>
                    <span class="field-desc"><strong>Recomendaciones limpieza:</strong> ${(control.recommendations || []).join(', ') || 'Pasta dental, Cepillo ortodóntico'}</span>
                </li>
                <li>
                    <span class="checkbox-indicator">[ ]</span>
                    <span class="field-desc"><strong>Retiro de Brackets:</strong> Superior ${parseCheckbox(control.brackets_removal?.sup)} &nbsp; Inferior ${parseCheckbox(control.brackets_removal?.inf)} &nbsp;&nbsp;&nbsp; ${control.brackets_removal?.date ? `<strong>Fecha:</strong> ${control.brackets_removal.date}` : ''}</span>
                </li>
                <li>
                    <span class="checkbox-indicator">[ ]</span>
                    <span class="field-desc"><strong>Colocación de contención:</strong> Superior ${parseCheckbox(control.retention?.sup)} &nbsp; Inferior ${parseCheckbox(control.retention?.inf)} &nbsp; Fija ${parseCheckbox(control.retention?.fija)} &nbsp; Removible ${parseCheckbox(control.retention?.removible)} &nbsp;&nbsp;&nbsp; ${control.retention?.date ? `<strong>Fecha:</strong> ${control.retention.date}` : ''}</span>
                </li>
            </ul>

            <div class="section-title" style="margin-top: 15px;">Observaciones</div>
            <div class="obs-box">${control.observations || 'Sin observaciones registradas.'}</div>

            <div class="footer-sign">
                <div>
                    <strong>Próxima cita fecha:</strong> <span class="detail-line">&nbsp;${control.next_appt_date || '___________'}&nbsp;</span> &nbsp;&nbsp;&nbsp;
                    <strong>Hora:</strong> <span class="detail-line">&nbsp;${control.next_appt_time || '___________'}&nbsp;</span>
                </div>
                <div class="sig-box">
                    Firma y Sello del Odontólogo
                </div>
            </div>

            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() {
                        window.frameElement.remove();
                    }, 1000);
                }
            </script>
        </body>
        </html>
    `);
    doc.close();
}
