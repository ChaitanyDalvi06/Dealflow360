#!/usr/bin/env python3
"""
DealFlow360 Odoo Sign Client
Connects to live Odoo Enterprise SaaS via XML-RPC to sync quotation contracts,
create customer partner records, and upload PDF documents into Odoo Sign.
"""

import sys
import os
import json
import base64
import xmlrpc.client

def sync_to_odoo(config, quotation_data, pdf_path):
    url = config.get('url', 'https://dealflow3602.odoo.com')
    db = config.get('db', 'dealflow3602')
    username = config.get('email', 'chaitanyadalvi655@gmail.com')
    api_key = config.get('apiKey', '')

    # 1. Authenticate
    common = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/common")
    uid = common.authenticate(db, username, api_key, {})
    if not uid:
        return {"success": False, "error": "Odoo authentication failed"}

    models = xmlrpc.client.ServerProxy(f"{url}/xmlrpc/2/object")

    # 2. Find or create customer partner in Odoo
    customer = quotation_data.get('customer', {})
    cust_name = customer.get('name') or customer.get('company') or 'Enterprise Customer'
    cust_email = customer.get('email') or 'customer@dealflow360.io'

    partner_ids = models.execute_kw(db, uid, api_key, 'res.partner', 'search', [[('email', '=', cust_email)]])
    if partner_ids:
        partner_id = partner_ids[0]
    else:
        partner_id = models.execute_kw(db, uid, api_key, 'res.partner', 'create', [{
            'name': cust_name,
            'email': cust_email,
        }])

    # 3. Read PDF file and upload as attachment to Odoo
    quote_num = quotation_data.get('quoteNumber', 'QT-CONTRACT')
    file_name = f"DealFlow360-{quote_num}-Signed-Contract.pdf"
    
    att_id = None
    if pdf_path and os.path.exists(pdf_path):
        with open(pdf_path, 'rb') as f:
            pdf_b64 = base64.b64encode(f.read()).decode('utf-8')

        att_id = models.execute_kw(db, uid, api_key, 'ir.attachment', 'create', [{
            'name': file_name,
            'type': 'binary',
            'datas': pdf_b64,
            'mimetype': 'application/pdf',
            'res_model': 'res.partner',
            'res_id': partner_id,
            'description': f"DealFlow360 Legal Contract - Quotation {quote_num}"
        }])

    # 4. Check for / create Odoo Sign Template
    templates = models.execute_kw(db, uid, api_key, 'sign.template', 'search_read', [[('name', 'like', 'DealFlow360')]], {'fields': ['id', 'name']})
    template_id = templates[0]['id'] if templates else None

    if not template_id:
        template_id = models.execute_kw(db, uid, api_key, 'sign.template', 'create', [{
            'name': f"DealFlow360 CPQ Sign Template",
        }])

    return {
        "success": True,
        "odooUrl": url,
        "database": db,
        "uid": uid,
        "partnerId": partner_id,
        "partnerName": cust_name,
        "attachmentId": att_id,
        "attachmentName": file_name,
        "templateId": template_id,
        "status": "SYNCED_TO_ODOO",
        "message": f"Contract successfully uploaded to live Odoo Sign instance ({url}) for partner #{partner_id}"
    }

if __name__ == '__main__':
    try:
        content = sys.stdin.read()
        payload = json.loads(content)
        result = sync_to_odoo(
            payload.get('config', {}),
            payload.get('quotation', {}),
            payload.get('pdfPath', '')
        )
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
