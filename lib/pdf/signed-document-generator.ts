import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface SignedQuoteData {
  id: string;
  clientName: string;
  clientEmail: string;
  clientCompany?: string;
  projectName: string;
  amountMin: string | number;
  amountMax: string | number;
  validUntil: string;
  createdAt: string;
  signedAt?: string;
  signature: {
    signerName: string;
    signerEmail: string;
    signerTitle: string;
    signatureImage: string;
    signedAt: string;
    ipAddress?: string;
  };
  metadata?: {
    generatedHtml?: string;
    [key: string]: any;
  };
}

export async function generateSignedPDF(quote: SignedQuoteData): Promise<Uint8Array> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPosition = margin;

  // Helper function to add text with wrapping
  const addText = (text: string, fontSize: number = 12, isBold: boolean = false, color: [number, number, number] = [0, 0, 0]) => {
    pdf.setFontSize(fontSize);
    pdf.setTextColor(...color);
    if (isBold) {
      pdf.setFont('helvetica', 'bold');
    } else {
      pdf.setFont('helvetica', 'normal');
    }
    
    const lines = pdf.splitTextToSize(text, contentWidth);
    pdf.text(lines, margin, yPosition);
    yPosition += lines.length * (fontSize * 0.4);
    return lines.length;
  };

  // Add watermark
  pdf.setTextColor(26, 115, 232, 0.1);
  pdf.setFontSize(80);
  pdf.setFont('helvetica', 'bold');
  const watermarkText = 'SIGNED';
  const textWidth = pdf.getTextWidth(watermarkText);
  pdf.saveGraphicsState();
  pdf.setGState(new pdf.GState({ opacity: 0.1 }));
  
  // Rotate and center the watermark
  const centerX = pageWidth / 2;
  const centerY = pageHeight / 2;
  pdf.text(watermarkText, centerX, centerY, {
    align: 'center',
    angle: 45
  });
  pdf.restoreGraphicsState();

  // Reset text color for content
  pdf.setTextColor(0, 0, 0);

  // Add AImpact logo (using base64 encoded image)
  const logoBase64 = 'data:image/png;base64,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';
  
  try {
    // Add logo to the top left corner (increased size from 25x25 to 35x35)
    pdf.addImage(logoBase64, 'PNG', margin, yPosition - 10, 35, 35);
  } catch (error) {
    console.error('Error adding logo to signed PDF:', error);
  }
  
  // Adjust header position to account for larger logo
  const headerX = margin + 40;
  pdf.setFontSize(24);
  pdf.setTextColor(26, 115, 232);
  pdf.setFont('helvetica', 'bold');
  pdf.text('AImpact Nexus', headerX, yPosition);
  yPosition += 8;
  pdf.setFontSize(12);
  pdf.setTextColor(102, 102, 102);
  pdf.setFont('helvetica', 'normal');
  pdf.text('AI Orchestration & Automation for Enterprise', headerX, yPosition);
  yPosition += 10;

  // Add green "SIGNED" badge
  pdf.setFillColor(76, 175, 80);
  pdf.roundedRect(pageWidth - margin - 30, margin - 5, 30, 10, 2, 2, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('SIGNED', pageWidth - margin - 15, margin, { align: 'center' });
  pdf.setTextColor(0, 0, 0);

  yPosition += 10;

  // Quote details box
  pdf.setDrawColor(26, 115, 232);
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;

  addText(`Quote #${quote.id}`, 16, true);
  addText(`Created: ${new Date(quote.createdAt).toLocaleDateString()}`, 10, false, [102, 102, 102]);
  addText(`Valid Until: ${new Date(quote.validUntil).toLocaleDateString()}`, 10, false, [102, 102, 102]);
  addText(`Signed: ${new Date(quote.signature.signedAt).toLocaleDateString()}`, 10, true, [76, 175, 80]);
  yPosition += 10;

  // Client Information
  addText('Client Information', 16, true, [26, 115, 232]);
  yPosition += 2;
  pdf.setFillColor(248, 249, 250);
  pdf.roundedRect(margin, yPosition - 5, contentWidth, 25, 2, 2, 'F');
  yPosition += 2;
  addText(`Client Name: ${quote.clientName}`, 12);
  addText(`Company: ${quote.clientCompany || 'N/A'}`, 12);
  addText(`Email: ${quote.clientEmail}`, 12);
  yPosition += 10;

  // Project Information
  addText(`Project: ${quote.projectName}`, 18, true, [26, 115, 232]);
  yPosition += 5;

  // Price box
  const depositAmount = parseFloat(quote.amountMin.toString()) * 0.5;
  pdf.setFillColor(232, 240, 254);
  pdf.roundedRect(margin, yPosition - 5, contentWidth, 30, 2, 2, 'F');
  yPosition += 5;
  const minAmount = parseFloat(quote.amountMin.toString()).toLocaleString();
  const maxAmount = parseFloat(quote.amountMax.toString()).toLocaleString();
  addText(`$${minAmount} - $${maxAmount}`, 24, true, [26, 115, 232]);
  addText(`Quote valid until ${new Date(quote.validUntil).toLocaleDateString()}`, 12, false, [102, 102, 102]);
  yPosition += 10;

  // Payment Terms
  addText('Payment Terms', 14, true);
  yPosition += 2;
  pdf.setFillColor(255, 243, 205);
  pdf.setDrawColor(255, 238, 186);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(margin, yPosition - 5, contentWidth, 20, 2, 2, 'FD');
  yPosition += 2;
  addText(`50% Deposit Required: $${depositAmount.toLocaleString()} upon contract execution`, 12);
  addText(`50% Final Payment: Due upon project completion`, 12);
  yPosition += 10;

  // Check if we need a new page for signature section
  if (yPosition > pageHeight - 80) {
    pdf.addPage();
    yPosition = margin;
  }

  // Signature Section
  addText('Quote Acceptance - Digitally Signed', 16, true, [26, 115, 232]);
  yPosition += 5;

  // Signature box with blue border
  pdf.setFillColor(240, 249, 255);
  pdf.setDrawColor(26, 115, 232);
  pdf.setLineWidth(1);
  pdf.roundedRect(margin, yPosition - 5, contentWidth, 60, 3, 3, 'FD');
  yPosition += 5;

  addText('This quote has been electronically signed and accepted by:', 12);
  yPosition += 10;

  // Signature details in two columns
  const col1X = margin + 5;
  const col2X = margin + contentWidth/2 + 5;
  
  // Left column - Signature
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(col1X, yPosition, contentWidth/2 - 10, 30, 2, 2, 'F');
  
  // Add signature image if it's a base64 string
  if (quote.signature.signatureImage && quote.signature.signatureImage.startsWith('data:image')) {
    try {
      pdf.addImage(quote.signature.signatureImage, 'PNG', col1X + 5, yPosition + 2, contentWidth/2 - 20, 20);
    } catch (error) {
      console.error('Error adding signature image:', error);
      pdf.setFontSize(10);
      pdf.text('[Signature]', col1X + 5, yPosition + 15);
    }
  }
  
  // Signer details below signature
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${quote.signature.signerName}`, col1X + 5, yPosition + 25);
  pdf.text(`${quote.signature.signerTitle}`, col1X + 5, yPosition + 29);
  
  // Right column - Metadata
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(col2X, yPosition, contentWidth/2 - 10, 30, 2, 2, 'F');
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Date Signed:', col2X + 5, yPosition + 5);
  pdf.setFont('helvetica', 'normal');
  pdf.text(new Date(quote.signature.signedAt).toLocaleDateString(), col2X + 35, yPosition + 5);
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('Time:', col2X + 5, yPosition + 10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(new Date(quote.signature.signedAt).toLocaleTimeString(), col2X + 35, yPosition + 10);
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('IP Address:', col2X + 5, yPosition + 15);
  pdf.setFont('helvetica', 'normal');
  pdf.text(quote.signature.ipAddress || 'Not recorded', col2X + 35, yPosition + 15);
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('Document ID:', col2X + 5, yPosition + 20);
  pdf.setFont('helvetica', 'normal');
  pdf.text(quote.id, col2X + 35, yPosition + 20);
  
  yPosition += 35;

  // Legal acknowledgment
  yPosition += 5;
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(224, 224, 224);
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;
  
  pdf.setFontSize(9);
  pdf.setTextColor(102, 102, 102);
  const legalText = `Legal Acknowledgment: By signing this document electronically, ${quote.signature.signerName} has agreed to the terms and conditions outlined in this quote and authorized the 50% deposit payment of $${depositAmount.toLocaleString()} to commence work upon contract execution.`;
  const legalLines = pdf.splitTextToSize(legalText, contentWidth);
  pdf.text(legalLines, margin, yPosition);
  yPosition += legalLines.length * 4;

  // Success message
  yPosition += 5;
  pdf.setFillColor(232, 245, 233);
  pdf.roundedRect(margin, yPosition - 3, contentWidth, 10, 2, 2, 'F');
  pdf.setTextColor(46, 125, 50);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('✓ This document has been digitally signed and is legally binding', margin + 5, yPosition + 2);

  // Footer
  const footerY = pageHeight - 15;
  pdf.setTextColor(102, 102, 102);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Prepared by: Mike Zozulia & Andy Oberlin, AImpact AI Specialists', pageWidth / 2, footerY - 10, { align: 'center' });
  pdf.text('AImpact Nexus - Fort AI Agency', pageWidth / 2, footerY - 6, { align: 'center' });
  pdf.text('Email: info@thefortaiagency.ai | Website: thefortaiagency.ai', pageWidth / 2, footerY - 2, { align: 'center' });
  pdf.setFontSize(8);
  pdf.text(`Document generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, pageWidth / 2, footerY + 2, { align: 'center' });

  // Return the PDF as Uint8Array
  return pdf.output('arraybuffer') as Uint8Array;
}

// Helper function to convert HTML to PDF (if there's custom HTML content)
export async function htmlToSignedPDF(htmlContent: string, signature: any): Promise<Uint8Array> {
  // Create a temporary container
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.width = '210mm'; // A4 width
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  try {
    // Use html2canvas to capture the HTML
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false
    });

    // Create PDF and add the canvas as image
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pageHeight = 297; // A4 height in mm
    let position = 0;

    // Add pages as needed
    if (imgHeight <= pageHeight) {
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
    } else {
      while (position < imgHeight) {
        if (position > 0) {
          pdf.addPage();
        }
        pdf.addImage(
          canvas.toDataURL('image/png'),
          'PNG',
          0,
          position === 0 ? 0 : -position,
          imgWidth,
          imgHeight
        );
        position += pageHeight;
      }
    }

    return pdf.output('arraybuffer') as Uint8Array;
  } finally {
    // Clean up
    document.body.removeChild(container);
  }
}