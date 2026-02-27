import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// When using Resend without a verified domain, emails can only be sent
// from onboarding@resend.dev (Resend's shared domain).
// Once medialert.com.br domain is verified, change this to noreply@medialert.com.br
const FROM_ADDRESS = "MediAlert <onboarding@resend.dev>";

/**
 * Send a commission paid notification email to the doctor.
 */
export async function sendCommissionPaidEmail(
  toEmail: string,
  toName: string | null | undefined,
  amount: string,
  referenceMonth: string,
  paidDate: string,
): Promise<void> {
  const name = toName || "Doutor(a)";
  const [year, month] = referenceMonth.split("-");
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const monthLabel = monthNames[parseInt(month, 10) - 1] + "/" + year;

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: [toEmail],
      subject: `Comissão paga — R$ ${amount} — MediAlert`,
      html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#F0F6FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F6FF;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#16A34A,#15803D);padding:32px 32px 28px;text-align:center;">
          <div style="display:inline-block;width:64px;height:64px;background:rgba(255,255,255,0.2);border-radius:18px;margin-bottom:16px;line-height:64px;font-size:32px;">💰</div>
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;">Comissão Paga!</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Programa de Indicações MediAlert</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;color:#6B7A8D;font-size:15px;line-height:1.6;">Olá, <strong>${name}</strong>!</p>
          <p style="margin:0 0 24px;color:#6B7A8D;font-size:15px;line-height:1.6;">Sua comissão do programa de indicações foi processada e paga com sucesso.</p>
          <div style="background:#F0FFF4;border:2px solid #BBF7D0;border-radius:14px;padding:24px;text-align:center;margin-bottom:24px;">
            <p style="margin:0 0 4px;color:#6B7A8D;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Valor pago</p>
            <p style="margin:0;color:#16A34A;font-size:36px;font-weight:800;line-height:1.2;">R$ ${amount}</p>
            <p style="margin:8px 0 0;color:#6B7A8D;font-size:13px;">Referência: ${monthLabel}</p>
            <p style="margin:4px 0 0;color:#6B7A8D;font-size:13px;">Data do pagamento: ${paidDate}</p>
          </div>
          <p style="margin:0 0 24px;color:#6B7A8D;font-size:13px;line-height:1.6;">Continue indicando colegas para o MediAlert e aumente suas comissões!</p>
          <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0;" />
          <p style="margin:0;color:#9BA8B5;font-size:12px;text-align:center;line-height:1.6;">MediAlert · Programa de Indicações<br />Este é um e-mail automático, não responda.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim(),
    });
    if (error) console.error("[Email] Failed to send commission paid email:", error);
    else console.log(`[Email] Commission paid email sent to ${toEmail}`);
  } catch (e) {
    console.warn("[Email] Error sending commission paid email:", e);
  }
}

/**
 * Send a welcome email to a new doctor after profile setup.
 */
export async function sendDoctorWelcomeEmail(
  toEmail: string,
  toName: string | null | undefined,
  referralCode: string,
): Promise<void> {
  const name = toName || "Doutor(a)";

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: [toEmail],
      subject: `Bem-vindo(a) ao MediAlert, ${name}!`,
      html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#F0F6FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F6FF;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#1A7FE8,#0A3D8F);padding:32px 32px 28px;text-align:center;">
          <div style="display:inline-block;width:64px;height:64px;background:rgba(255,255,255,0.2);border-radius:18px;margin-bottom:16px;line-height:64px;font-size:32px;">🩺</div>
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;">Bem-vindo(a)!</h1>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">MediAlert — Gestão inteligente de saúde</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;color:#0D1B2A;font-size:18px;font-weight:700;">Olá, Dr(a). ${name}!</p>
          <p style="margin:0 0 16px;color:#6B7A8D;font-size:15px;line-height:1.6;">Seu perfil médico foi criado com sucesso no MediAlert. Aqui estão os próximos passos para aproveitar ao máximo a plataforma:</p>
          <div style="background:#F0F6FF;border-radius:12px;padding:20px;margin-bottom:16px;">
            <p style="margin:0 0 12px;color:#0D1B2A;font-size:14px;font-weight:700;">📋 1. Configure seus valores por convênio</p>
            <p style="margin:0;color:#6B7A8D;font-size:13px;line-height:1.5;">Defina o valor de consulta para cada convênio que você atende. Isso permite o acompanhamento preciso da sua receita.</p>
          </div>
          <div style="background:#F0F6FF;border-radius:12px;padding:20px;margin-bottom:16px;">
            <p style="margin:0 0 12px;color:#0D1B2A;font-size:14px;font-weight:700;">👥 2. Adicione seus pacientes</p>
            <p style="margin:0;color:#6B7A8D;font-size:13px;line-height:1.5;">Cadastre pacientes diretamente ou envie convites por e-mail para que eles se vinculem à sua conta.</p>
          </div>
          <div style="background:#F0FFF4;border:2px solid #BBF7D0;border-radius:12px;padding:20px;margin-bottom:24px;">
            <p style="margin:0 0 8px;color:#0D1B2A;font-size:14px;font-weight:700;">💰 3. Indique colegas e ganhe comissões</p>
            <p style="margin:0 0 12px;color:#6B7A8D;font-size:13px;line-height:1.5;">Compartilhe seu código de indicação e ganhe comissões quando médicos indicados começarem a usar a plataforma.</p>
            <div style="background:#DCFCE7;border-radius:10px;padding:14px;text-align:center;">
              <p style="margin:0 0 4px;color:#6B7A8D;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Seu código de indicação</p>
              <p style="margin:0;color:#16A34A;font-size:28px;font-weight:800;letter-spacing:6px;">${referralCode}</p>
            </div>
          </div>
          <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0;" />
          <p style="margin:0;color:#9BA8B5;font-size:12px;text-align:center;line-height:1.6;">MediAlert · Gestão inteligente de saúde<br />Este é um e-mail automático, não responda.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim(),
    });
    if (error) console.error("[Email] Failed to send welcome email:", error);
    else console.log(`[Email] Welcome email sent to ${toEmail}`);
  } catch (e) {
    console.warn("[Email] Error sending welcome email:", e);
  }
}

/**
 * Send a password reset code to the user's email.
 */
export async function sendPasswordResetEmail(
  toEmail: string,
  toName: string | null | undefined,
  resetCode: string,
): Promise<void> {
  const name = toName || "usuário";

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: [toEmail],
    subject: "Código de redefinição de senha — MediAlert",
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Redefinição de Senha</title>
</head>
<body style="margin:0;padding:0;background:#F0F6FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F6FF;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1A7FE8,#0A3D8F);padding:32px 32px 28px;text-align:center;">
              <div style="display:inline-block;width:64px;height:64px;background:rgba(255,255,255,0.2);border-radius:18px;margin-bottom:16px;line-height:64px;font-size:32px;">💊</div>
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">MediAlert</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Controle inteligente de medicamentos</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 8px;color:#0D1B2A;font-size:20px;font-weight:700;">Redefinição de senha</h2>
              <p style="margin:0 0 24px;color:#6B7A8D;font-size:15px;line-height:1.6;">
                Olá, <strong>${name}</strong>! Recebemos uma solicitação para redefinir a senha da sua conta. Use o código abaixo:
              </p>

              <!-- Code Box -->
              <div style="background:#F0F6FF;border:2px solid #D1E3F8;border-radius:14px;padding:24px;text-align:center;margin-bottom:24px;">
                <p style="margin:0 0 8px;color:#6B7A8D;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Seu código de verificação</p>
                <p style="margin:0;color:#1A7FE8;font-size:40px;font-weight:800;letter-spacing:12px;line-height:1.2;">${resetCode}</p>
              </div>

              <p style="margin:0 0 8px;color:#6B7A8D;font-size:13px;line-height:1.6;">
                ⏱ Este código expira em <strong>15 minutos</strong>.
              </p>
              <p style="margin:0 0 24px;color:#6B7A8D;font-size:13px;line-height:1.6;">
                Se você não solicitou a redefinição de senha, ignore este e-mail — sua conta está segura.
              </p>

              <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0;" />
              <p style="margin:0;color:#9BA8B5;font-size:12px;text-align:center;line-height:1.6;">
                MediAlert · Controle inteligente de medicamentos<br />
                Este é um e-mail automático, não responda.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  });

  if (error) {
    console.error("[Email] Failed to send reset email:", error);
    throw new Error("Não foi possível enviar o e-mail. Tente novamente.");
  }

  console.log(`[Email] Password reset code sent to ${toEmail}`);
}
