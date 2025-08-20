import { processCommunicationSentiment } from './openai-sentiment';

// Webhook handler for new communications
export async function handleNewCommunication(data: {
  id: string;
  content: string;
  type: string;
  organizationId: string;
  contactId?: string;
  fromAddress: string;
  subject?: string;
}) {
  console.log(`[Sentiment Webhook] Processing new ${data.type} communication: ${data.id}`);

  try {
    // Combine subject and content for emails
    const textToAnalyze = data.type === 'email' && data.subject
      ? `Subject: ${data.subject}\n\n${data.content}`
      : data.content;

    // Skip if content is too short
    if (textToAnalyze.length < 10) {
      console.log(`[Sentiment Webhook] Skipping short content for ${data.id}`);
      return;
    }

    // Process sentiment analysis
    await processCommunicationSentiment(
      data.id,
      textToAnalyze,
      data.organizationId,
      data.contactId
    );

    console.log(`[Sentiment Webhook] Successfully processed ${data.id}`);
  } catch (error) {
    console.error(`[Sentiment Webhook] Error processing ${data.id}:`, error);
  }
}

// Webhook handler for updated communications
export async function handleUpdatedCommunication(data: {
  id: string;
  content: string;
  organizationId: string;
  contactId?: string;
  previousSentiment?: string;
}) {
  console.log(`[Sentiment Webhook] Re-processing updated communication: ${data.id}`);

  try {
    // Re-analyze if content changed significantly
    await processCommunicationSentiment(
      data.id,
      data.content,
      data.organizationId,
      data.contactId
    );

    console.log(`[Sentiment Webhook] Successfully re-processed ${data.id}`);
  } catch (error) {
    console.error(`[Sentiment Webhook] Error re-processing ${data.id}:`, error);
  }
}