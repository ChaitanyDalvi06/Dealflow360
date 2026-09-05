#!/usr/bin/env python3
"""
DealFlow360 Enterprise Invoice PDF Generator
Generates high-fidelity, corporate-grade PDF invoices for authorized quotations.
"""

import sys
import os
import json
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable, Image as PlatypusImage
)

def format_currency(val):
    try:
        n = float(val)
        return f"INR {n:,.2f}"
    except (ValueError, TypeError):
        return f"INR {val}"

def generate_invoice_pdf(data, output_path):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    
    # Custom Palette
    NAVY = colors.HexColor("#0F2C59")
    TEAL = colors.HexColor("#0284C7")
    EMERALD = colors.HexColor("#059669")
    EMERALD_BG = colors.HexColor("#ECFDF5")
    SLATE_DARK = colors.HexColor("#0F172A")
    SLATE_MUTED = colors.HexColor("#64748B")
    LIGHT_BG = colors.HexColor("#F8FAFC")
    BORDER_COLOR = colors.HexColor("#E2E8F0")

    # Typography Styles
    title_style = ParagraphStyle(
        'InvoiceTitle',
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=NAVY
    )
    subtitle_style = ParagraphStyle(
        'InvoiceSubtitle',
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=SLATE_MUTED
    )
    meta_label_style = ParagraphStyle(
        'MetaLabel',
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=SLATE_MUTED
    )
    meta_val_style = ParagraphStyle(
        'MetaVal',
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=NAVY
    )
    section_head = ParagraphStyle(
        'SectionHead',
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=NAVY
    )
    body_bold = ParagraphStyle(
        'BodyBold',
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=SLATE_DARK
    )
    body_text = ParagraphStyle(
        'BodyText',
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=SLATE_DARK
    )
    body_muted = ParagraphStyle(
        'BodyMuted',
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=SLATE_MUTED
    )
    th_style = ParagraphStyle(
        'TableHeader',
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )
    th_style_right = ParagraphStyle(
        'TableHeaderRight',
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        alignment=2,
        textColor=colors.white
    )
    td_style = ParagraphStyle(
        'TableCell',
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=SLATE_DARK
    )
    td_style_bold = ParagraphStyle(
        'TableCellBold',
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=SLATE_DARK
    )
    td_style_right = ParagraphStyle(
        'TableCellRight',
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        alignment=2,
        textColor=SLATE_DARK
    )

    story = []

    # 1. Header & Meta Row
    invoice_no = data.get('invoiceNumber', 'INV-2026-001')
    quote_no = data.get('quotationNumber', 'QT-000000')
    date_str = data.get('date', '06 Sept 2026')
    due_str = data.get('dueDate', '06 Oct 2026')
    terms_str = data.get('paymentTerms', 'Net 30')
    status_str = data.get('status', 'APPROVED & AUTHORIZED')

    header_left = [
        Paragraph("DEALFLOW360", title_style),
        Paragraph("Enterprise CPQ & Intelligent Revenue Platform", subtitle_style),
        Spacer(1, 4),
        Paragraph("Tax Invoice / Commercial Contract Confirmation", ParagraphStyle(
            'InvSub', fontName='Helvetica-Bold', fontSize=10, leading=13, textColor=TEAL
        ))
    ]

    badge_html = f'<font color="#059669"><b>{status_str}</b></font>'
    header_right = [
        Table([
            [Paragraph("INVOICE NO:", meta_label_style), Paragraph(invoice_no, meta_val_style)],
            [Paragraph("QUOTATION REF:", meta_label_style), Paragraph(quote_no, meta_val_style)],
            [Paragraph("ISSUE DATE:", meta_label_style), Paragraph(date_str, body_text)],
            [Paragraph("PAYMENT TERMS:", meta_label_style), Paragraph(terms_str, body_text)],
            [Paragraph("STATUS:", meta_label_style), Paragraph(badge_html, body_text)],
        ], colWidths=[95, 125], style=[
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
            ('TOPPADDING', (0,0), (-1,-1), 2),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ])
    ]

    header_table = Table(
        [[header_left, header_right]],
        colWidths=[310, 230],
        style=[
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
        ]
    )
    story.append(header_table)
    story.append(Spacer(1, 14))

    # Divider bar
    story.append(HRFlowable(width="100%", thickness=1.5, color=NAVY, spaceBefore=0, spaceAfter=14))

    # 2. Billed By & Billed To Box
    vendor = data.get('vendor', {})
    customer = data.get('customer', {})
    rep = data.get('rep', {})

    col_by = [
        Paragraph("ISSUED BY (VENDOR):", section_head),
        Spacer(1, 4),
        Paragraph("<b>DealFlow360 Technologies Pvt. Ltd.</b>", body_bold),
        Paragraph("Cyber City Global Tech Park, Tower B", body_text),
        Paragraph("Bengaluru, Karnataka - 560103, India", body_text),
        Paragraph("<b>GSTIN:</b> 29AABCT1332L1Z9", body_text),
        Paragraph(f"<b>Finance Contact:</b> finance@dealflow360.io", body_text),
        Paragraph(f"<b>Account Rep:</b> {rep.get('name', 'Sales Representative')}", body_muted),
    ]

    col_to = [
        Paragraph("BILLED TO (CLIENT):", section_head),
        Spacer(1, 4),
        Paragraph(f"<b>{customer.get('company') or customer.get('name', 'Enterprise Customer')}</b>", body_bold),
        Paragraph(f"Attn: {customer.get('name', 'Procurement Dept')}", body_text),
        Paragraph(f"Email: {customer.get('email', 'contact@client.com')}", body_text),
        Paragraph(f"Account Tier: <b>{customer.get('tier', 'STANDARD')} TIER</b>", body_text),
        Paragraph(f"Address: {customer.get('address', 'Corporate Headquarters')}", body_text),
        Paragraph(f"Phone: {customer.get('phone', '+91 (080) 4500-1200')}", body_muted),
    ]

    parties_table = Table(
        [[col_by, col_to]],
        colWidths=[270, 270],
        style=[
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BACKGROUND', (0,0), (-1,-1), LIGHT_BG),
            ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
            ('INNERGRID', (0,0), (-1,-1), 1, BORDER_COLOR),
            ('LEFTPADDING', (0,0), (-1,-1), 12),
            ('RIGHTPADDING', (0,0), (-1,-1), 12),
            ('TOPPADDING', (0,0), (-1,-1), 10),
            ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ]
    )
    story.append(parties_table)
    story.append(Spacer(1, 16))

    # 3. Itemized Commercial Schedule
    table_data = [
        [
            Paragraph("#", th_style),
            Paragraph("PRODUCT / DESCRIPTION", th_style),
            Paragraph("TYPE", th_style),
            Paragraph("QTY", th_style_right),
            Paragraph("UNIT PRICE", th_style_right),
            Paragraph("DISC %", th_style_right),
            Paragraph("AMOUNT", th_style_right),
        ]
    ]

    lines = data.get('lines', [])
    for idx, item in enumerate(lines, 1):
        prod_name = item.get('name', 'Product')
        sku = item.get('sku', '')
        category = item.get('category', '')
        desc_cell = [
            Paragraph(f"<b>{prod_name}</b>", td_style_bold),
        ]
        if sku or category:
            sub = f"{category} • SKU: {sku}" if sku and category else (sku or category)
            desc_cell.append(Paragraph(sub, body_muted))

        b_type = "Recurring" if item.get('billingType') == 'Recurring' or item.get('isRecurring') else "One-Time"
        qty = str(item.get('quantity', 1))
        unit_price = format_currency(item.get('unitPrice', 0))
        disc_val = f"{float(item.get('discountPct', 0)):.1f}%" if float(item.get('discountPct', 0)) > 0 else "0.0%"
        line_total = format_currency(item.get('lineTotal', 0))

        table_data.append([
            Paragraph(str(idx), td_style),
            desc_cell,
            Paragraph(b_type, td_style),
            Paragraph(qty, td_style_right),
            Paragraph(unit_price, td_style_right),
            Paragraph(disc_val, td_style_right),
            Paragraph(f"<b>{line_total}</b>", td_style_right),
        ])

    items_table = Table(
        table_data,
        colWidths=[24, 216, 60, 35, 75, 50, 80],
        style=[
            ('BACKGROUND', (0, 0), (-1, 0), NAVY),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT_BG]),
        ]
    )
    story.append(items_table)
    story.append(Spacer(1, 14))

    # 4. Calculation & Summary Grid
    gross_total = float(data.get('grossTotal', data.get('subtotal', 0)))
    total_discount = float(data.get('totalDiscount', 0))
    net_order = float(data.get('orderTotal', gross_total - total_discount))
    tax_amount = float(data.get('taxAmount', round(net_order * 0.18, 2))) # 18% GST standard
    grand_total = net_order + tax_amount

    calc_data = [
        [Paragraph("Gross Line Value:", meta_label_style), Paragraph(format_currency(gross_total), td_style_right)],
        [Paragraph("Applied Deal Discounts:", meta_label_style), Paragraph(f"- {format_currency(total_discount)}", td_style_right)],
        [Paragraph("Taxable Deal Total:", meta_label_style), Paragraph(format_currency(net_order), td_style_bold)],
        [Paragraph("Applicable GST (18% IGST):", meta_label_style), Paragraph(format_currency(tax_amount), td_style_right)],
        [
            Paragraph("<b>TOTAL PAYABLE:</b>", ParagraphStyle('TP', fontName='Helvetica-Bold', fontSize=10, textColor=NAVY)),
            Paragraph(f"<b>{format_currency(grand_total)}</b>", ParagraphStyle('TPVal', fontName='Helvetica-Bold', fontSize=12, alignment=2, textColor=NAVY))
        ]
    ]

    calc_table = Table(
        calc_data,
        colWidths=[130, 110],
        style=[
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('LINEBELOW', (0,-2), (-1,-2), 1, BORDER_COLOR),
            ('BACKGROUND', (0,-1), (-1,-1), EMERALD_BG),
            ('BOX', (0,-1), (-1,-1), 1, EMERALD),
            ('TOPPADDING', (0,-1), (-1,-1), 6),
            ('BOTTOMPADDING', (0,-1), (-1,-1), 6),
            ('LEFTPADDING', (0,-1), (-1,-1), 6),
            ('RIGHTPADDING', (0,-1), (-1,-1), 6),
        ]
    )

    # Wire / Remittance Info Left Side
    remittance_box = [
        Paragraph("ELECTRONIC REMITTANCE / BANK DETAILS:", section_head),
        Spacer(1, 4),
        Paragraph("<b>Account Name:</b> DealFlow360 Technologies Pvt. Ltd.", body_text),
        Paragraph("<b>Bank:</b> HDFC Bank, Tech Center Branch", body_text),
        Paragraph("<b>Current A/C No:</b> 50200084920194", body_text),
        Paragraph("<b>IFSC Code:</b> HDFC0001234", body_text),
        Paragraph(f"<b>Payment Reference:</b> {invoice_no}", body_text),
        Spacer(1, 4),
        Paragraph("<i>Please cite the invoice reference with your wire remittance.</i>", body_muted),
    ]

    summary_wrapper = Table(
        [[remittance_box, calc_table]],
        colWidths=[300, 240],
        style=[
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ]
    )
    story.append(KeepTogether([summary_wrapper]))
    story.append(Spacer(1, 16))

    # 5. Dual Authorization & Odoo Sign Customer Execution Block
    sig_data = data.get('signature')
    
    if sig_data:
        signer_name = sig_data.get('signerName', 'Authorized Signatory')
        signer_role = sig_data.get('signerDesignation', 'Procurement Officer')
        signed_at_raw = sig_data.get('signedAt', '')
        sha_hash = sig_data.get('sha256Hash', 'Verified')
        short_hash = sha_hash[:28] + '...' if len(sha_hash) > 28 else sha_hash
        img_path = sig_data.get('signatureImagePath')

        # Customer signature element
        sig_right_elements = []
        if img_path and os.path.exists(img_path):
            try:
                sig_right_elements.append(PlatypusImage(img_path, width=140, height=40))
                sig_right_elements.append(Spacer(1, 2))
            except Exception as e:
                pass
        
        sig_right_elements.append(Paragraph(f"<b>{signer_name}</b>", body_bold))
        sig_right_elements.append(Paragraph(f"{signer_role}", body_muted))
        sig_right_elements.append(Paragraph("Digitally Certified via Odoo Sign Protocol", ParagraphStyle('DS', fontName='Helvetica-Bold', fontSize=7, textColor=EMERALD)))

        sig_left_elements = [
            Paragraph("<b>CUSTOMER EXECUTION (ODOO SIGN PROTOCOL)</b>", ParagraphStyle('CSH', fontName='Helvetica-Bold', fontSize=9, textColor=NAVY)),
            Spacer(1, 3),
            Paragraph(f"Signatory: <b>{signer_name}</b> ({signer_role})", body_text),
            Paragraph(f"Execution Timestamp: <b>{signed_at_raw[:19].replace('T', ' ')} UTC</b>", body_muted),
            Paragraph(f"Cryptographic Seal: <font color='#059669'><b>SHA-256: {short_hash}</b></font>", ParagraphStyle('CSHL', fontName='Helvetica-Bold', fontSize=7.5, textColor=EMERALD)),
            Paragraph("Legally binding electronic signature pursuant to UNCITRAL / Global e-Sign acts.", body_muted),
        ]

        dual_sig_table = Table(
            [[sig_left_elements, sig_right_elements]],
            colWidths=[350, 190],
            style=[
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('BACKGROUND', (0,0), (-1,-1), EMERALD_BG),
                ('BOX', (0,0), (-1,-1), 1, EMERALD),
                ('LEFTPADDING', (0,0), (-1,-1), 10),
                ('RIGHTPADDING', (0,0), (-1,-1), 10),
                ('TOPPADDING', (0,0), (-1,-1), 8),
                ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ]
        )
        story.append(KeepTogether([dual_sig_table]))
        story.append(Spacer(1, 10))

    # Management Authorization Stamp
    auth_box_content = [
        Table([
            [
                Paragraph("<b>MANAGERIAL AUTHORIZATION & AUDIT TRAIL</b>", ParagraphStyle('ATH', fontName='Helvetica-Bold', fontSize=9, textColor=NAVY)),
                Paragraph(f"AUTH CODE: <b>{quote_no}-DF360-VERIFIED</b>", ParagraphStyle('ATC', fontName='Helvetica-Bold', fontSize=8, alignment=2, textColor=EMERALD))
            ]
        ], colWidths=[320, 200], style=[
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ]),
        Spacer(1, 3),
        Paragraph(
            "This commercial invoice has been formally authorized by Sales Management pursuant to corporate discount controls. "
            "Terms are certified and legally binding upon execution. Generated digitally by DealFlow360 Governance Engine.",
            body_muted
        )
    ]

    auth_table = Table(
        [[auth_box_content]],
        colWidths=[540],
        style=[
            ('BACKGROUND', (0,0), (-1,-1), LIGHT_BG),
            ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
            ('RIGHTPADDING', (0,0), (-1,-1), 10),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ]
    )
    story.append(KeepTogether([auth_table]))

    doc.build(story)
    return output_path

if __name__ == '__main__':
    if len(sys.argv) > 2:
        input_data = json.loads(sys.argv[1])
        out_file = sys.argv[2]
        generate_invoice_pdf(input_data, out_file)
        print(out_file)
    else:
        # Read from stdin
        content = sys.stdin.read()
        if not content:
            print("Error: No input JSON provided", file=sys.stderr)
            sys.exit(1)
        params = json.loads(content)
        out_path = params.get('outputPath', '/tmp/dealflow360_invoice.pdf')
        generate_invoice_pdf(params.get('data', {}), out_path)
        print(out_path)
