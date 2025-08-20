interface WelcomeEmailPayload {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
}

export async function sendWelcomeEmail(payload: WelcomeEmailPayload): Promise<boolean> {
  const url = "https://prod-48.westus.logic.azure.com:443/workflows/a5e6afa50a7c49c0a6134f939b9ceed9/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=ZaLKZzwnfu_aeNake-YnqBo88MWICO25FUcs0W08KPE";
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Failed to send welcome email:', response.status, response.statusText);
      return false;
    }

    console.log('Welcome email sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
}