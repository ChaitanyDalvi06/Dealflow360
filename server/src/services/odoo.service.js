import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../config/db.js';
import { config } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ODOO_CLIENT_PATH = path.resolve(__dirname, 'odoo_client.py');

/**
 * Synchronizes an executed quotation contract to the live Odoo instance.
 * Uploads customer details, attachment PDF, and creates an Odoo Sign record.
 * @param {string} quotationId
 * @param {string} quotationId
 * @param {string} [pdfPath]
 * @param {object} [signerInfo]
 * @returns {Promise<any>}
 */
export async function syncQuotationToOdoo(quotationId, pdfPath = null, signerInfo = null) {
  try {
    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        customer: true,
        rep: { select: { id: true, name: true, email: true } },
      },
    });

    if (!quotation) {
      console.warn(`[Odoo Service] Quotation ${quotationId} not found for sync.`);
      return null;
    }

    const quoteNumber = quotation.quoteNumber || `QT-${quotation.id.slice(-6).toUpperCase()}`;

    // If pdfPath not provided, check if generated in storage
    let resolvedPdfPath = pdfPath;
    if (!resolvedPdfPath) {
      const defaultPdf = path.resolve(__dirname, `../../storage/invoices/DealFlow360-Invoice-${quoteNumber}.pdf`);
      const fs = await import('fs');
      if (fs.existsSync(defaultPdf)) {
        resolvedPdfPath = defaultPdf;
      }
    }

    // Check if there is signature metadata saved in storage/signatures
    let resolvedSigner = signerInfo;
    if (!resolvedSigner) {
      try {
        const sigMetaPath = path.resolve(__dirname, `../../storage/signatures/sig_${quotation.id}.json`);
        const fs = await import('fs');
        if (fs.existsSync(sigMetaPath)) {
          resolvedSigner = JSON.parse(fs.readFileSync(sigMetaPath, 'utf8'));
        }
      } catch (e) {
        // ignore
      }
    }

    const payload = {
      config: config.odoo,
      quotation: {
        id: quotation.id,
        quoteNumber,
        orderTotal: Number(quotation.orderTotal || 0),
        status: quotation.status,
        signer: resolvedSigner ? {
          name: resolvedSigner.signerName,
          designation: resolvedSigner.signerDesignation,
          signedAt: resolvedSigner.signedAt,
          sha256Hash: resolvedSigner.sha256Hash,
        } : null,
        customer: {
          name: quotation.customer?.name || 'Customer',
          company: quotation.customer?.company || 'Corporate Client',
          email: quotation.customer?.email || 'client@dealflow360.io',
          tier: quotation.customer?.tier || 'STANDARD',
        },
      },
      pdfPath: resolvedPdfPath,
    };

    const result = await new Promise((resolve, reject) => {
      const py = spawn('python3', [ODOO_CLIENT_PATH]);
      let stdout = '';
      let stderr = '';

      py.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      py.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      py.on('close', (code) => {
        if (code === 0) {
          try {
            const parsed = JSON.parse(stdout.trim());
            resolve(parsed);
          } catch (e) {
            resolve({ success: false, raw: stdout });
          }
        } else {
          console.warn(`[Odoo Service] Sync script exited with code ${code}:`, stderr);
          resolve({ success: false, error: stderr });
        }
      });

      py.on('error', (err) => {
        console.warn('[Odoo Service] Failed to spawn Odoo client:', err.message);
        resolve({ success: false, error: err.message });
      });

      py.stdin.write(JSON.stringify(payload));
      py.stdin.end();
    });

    console.log(`[Odoo Sign Integration] Result for ${quoteNumber}:`, result);
    return result;
  } catch (err) {
    console.warn('[Odoo Service] Non-blocking sync error:', err.message);
    return { success: false, error: err.message };
  }
}
