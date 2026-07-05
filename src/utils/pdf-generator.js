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
                <div class="clinic-logo">PortalDent <span>Digital</span></div>
                <div class="doc-title">
                    <h1>Resumen de Historial Clínico</h1>
                    <p>Documento Oficial Firmado Electrónicamente</p>
                </div>
            </div>

            \${patient.allergies && patient.allergies.toLowerCase() !== 'ninguna' && patient.allergies.toLowerCase() !== 'ninguno' ? \`
                <div class="alert-box">
                    <span style="font-size: 16px;">⚠</span> ALERTA MÉDICA: Paciente registra sensibilidad o alergias conocidas: \${patient.allergies}
                </div>
            \` : ''}

            <div class="grid-info">
                <div class="info-card">
                    <h3>Datos de Identificación</h3>
                    <p><strong>Paciente:</strong> \${patient.firstname} \${patient.lastname}</p>
                    <p><strong>Documento Identidad (DNI):</strong> \${patient.dni}</p>
                    <p><strong>N° Historia Clínica:</strong> HC-\${patient.historyNumber}</p>
                    <p><strong>Fecha Nacimiento:</strong> \${dobFormatted}</p>
                </div>
                <div class="info-card">
                    <h3>Contacto y Antecedentes</h3>
                    <p><strong>Celular:</strong> \${patient.phone}</p>
                    <p><strong>Correo Electrónico:</strong> \${patient.email}</p>
                    <p><strong>Dirección:</strong> \${patient.address}</p>
                    <p><strong>Antecedentes Médicos:</strong> \${patient.chronic || 'Ninguno especificado'}</p>
                </div>
            </div>

            <div class="section-title">Evolución Clínica y Tratamientos (Odontograma)</div>
            \${odontogramSummaryHTML}

            <div class="section-title">Historial de Notas de Evolución</div>
            \${notesHTML}

            <div class="footer-container">
                <div>
                    <p style="font-size: 10px; color: #64748b; margin: 0;">PortalDent Digital Software, version 2.0</p>
                    <p style="font-size: 10px; color: #64748b; margin: 2px 0 0 0;">ID de Seguridad Documentaria: SEC-\${Date.now().toString().slice(-8)}</p>
                </div>
                
                <div class="signature-line">
                    Firma Electrónica Autorizada
                </div>

                <div class="clinic-seal">
                    <div class="seal-title">PORTALDENT</div>
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
    \`);
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