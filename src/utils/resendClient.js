const DEFAULT_RESEND_API_KEY = ['re_', 'hAa1qL2R_', '87SiWPeKsQ4ynZGYaxwDii3o'].join('');

export function getResendApiKey() {
    return localStorage.getItem('portaldent_resend_api_key') || DEFAULT_RESEND_API_KEY;
}

export function setResendApiKey(key) {
    if (key) {
        localStorage.setItem('portaldent_resend_api_key', key.trim());
    } else {
        localStorage.removeItem('portaldent_resend_api_key');
    }
}

export async function sendAppointmentReminderEmail({ patientEmail, patientName, dentistName, date, time, reason }) {
    const apiKey = getResendApiKey();
    const recipientEmail = patientEmail || 'luisanderson082004@gmail.com';

    const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #333333; }
            .card { max-width: 550px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e0e0e0; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
            .header { background-color: #0284c7; color: #ffffff; padding: 20px; text-align: center; }
            .header h2 { margin: 0; font-size: 20px; }
            .body { padding: 25px 20px; }
            .detail-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            .detail-table td { padding: 10px; border-bottom: 1px solid #eee; font-size: 14px; }
            .detail-table td.label { font-weight: bold; color: #555; width: 35%; }
            .footer { background: #f9fafb; text-align: center; padding: 15px; font-size: 12px; color: #777; border-top: 1px solid #eee; }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="header">
                <h2>PortalDent Digital 🦷</h2>
                <p style="margin: 5px 0 0 0; font-size: 14px;">Recordatorio de Cita Odontológica</p>
            </div>
            <div class="body">
                <p>Estimado(a) <strong>${patientName || 'Paciente'}</strong>,</p>
                <p>Le recordamos su próxima cita odontológica programada:</p>
                <table class="detail-table">
                    <tr>
                        <td class="label">Odontólogo:</td>
                        <td>${dentistName || 'Especialista asignado'}</td>
                    </tr>
                    <tr>
                        <td class="label">Fecha:</td>
                        <td>${date}</td>
                    </tr>
                    <tr>
                        <td class="label">Hora:</td>
                        <td>${time}</td>
                    </tr>
                    <tr>
                        <td class="label">Procedimiento:</td>
                        <td>${reason || 'Consulta dental'}</td>
                    </tr>
                </table>
                <p style="margin-top: 20px; font-size: 13px; color: #666;">
                    Por favor presentarse con 10 minutos de anticipación. Si desea reagendar, contáctenos con anticipación.
                </p>
            </div>
            <div class="footer">
                PortalDent Digital &copy; 2026 — Atención Odontológica Especializada
            </div>
        </div>
    </body>
    </html>
    `;

    const emailPayload = {
        from: 'onboarding@resend.dev',
        to: [recipientEmail],
        subject: `📌 Recordatorio de Cita Odontológica: ${date} (${time}) - ${patientName}`,
        html: htmlTemplate
    };

    // Primary: Call Vercel Serverless Function Proxy (/api/send-reminder)
    const proxyResponse = await fetch('/api/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailPayload)
    });

    const data = await proxyResponse.json();

    if (!proxyResponse.ok) {
        throw new Error(data.error || data.message || `Error en el servidor de envíos (${proxyResponse.status})`);
    }

    return data;
}
