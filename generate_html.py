import base64
import os

try:
    with open('logo_0.png', 'rb') as f:
        logo_b64 = base64.b64encode(f.read()).decode('utf-8')
except FileNotFoundError:
    logo_b64 = ""

html_content = f"""<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Báo Giá - Hiệp Lực</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        @page {{ size: A4; margin: 0; }}
        * {{ box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
        body {{
            margin: 0; padding: 0;
            font-family: 'Inter', 'Segoe UI', sans-serif;
            font-size: 13px;
            background-color: #f4f7f6;
            color: #2c3e50;
            line-height: 1.5;
        }}
        .page {{
            width: 210mm; min-height: 297mm;
            padding: 20mm 15mm;
            margin: 10mm auto;
            background: #ffffff;
            box-shadow: 0 10px 30px rgba(0,0,0,0.08);
            position: relative;
            border-radius: 8px;
            overflow: hidden;
        }}
        @media print {{
            body {{ background-color: white; }}
            .page {{
                margin: 0; box-shadow: none; border-radius: 0;
                width: 100%; min-height: 100%; padding: 15mm 15mm;
            }}
        }}

        /* Decorative top accent */
        .top-accent {{
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 6px;
            background: linear-gradient(90deg, #004269, #336887, #004269);
        }}

        /* Header Section */
        .header {{
            display: flex;
            align-items: center;
            margin-bottom: 35px;
            padding-bottom: 15px;
            border-bottom: 1px solid #e1e8ed;
        }}
        .logo-container {{
            width: 120px;
            margin-right: 25px;
            flex-shrink: 0;
        }}
        .logo-container img {{
            max-width: 100%;
            height: auto;
            display: block;
        }}
        .company-info {{ flex-grow: 1; }}
        .company-name {{
            font-size: 19px;
            font-weight: 700;
            color: #004269;
            margin: 0 0 4px 0;
            letter-spacing: 0.5px;
        }}
        .slogan {{
            font-size: 13px;
            font-style: italic;
            color: #e67e22;
            margin: 0 0 8px 0;
            font-weight: 500;
        }}
        .company-details p {{
            margin: 2px 0;
            font-size: 11.5px;
            color: #556b7d;
        }}

        /* Title */
        .title-section {{
            text-align: center;
            margin-bottom: 30px;
        }}
        .title-section h1 {{
            font-size: 28px;
            color: #004269;
            margin: 0 0 5px 0;
            text-transform: uppercase;
            letter-spacing: 2px;
            font-weight: 800;
        }}
        .title-section h2 {{
            font-size: 15px;
            margin: 0;
            font-weight: 500;
            color: #7f8c8d;
            text-transform: uppercase;
            letter-spacing: 1px;
        }}

        /* Info Boxes */
        .info-grid {{
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            gap: 20px;
        }}
        .info-box {{
            width: calc(50% - 10px);
            border: 1px solid #e1e8ed;
            padding: 15px;
            border-radius: 8px;
            background: linear-gradient(180deg, #fafbfc 0%, #ffffff 100%);
            box-shadow: 0 2px 5px rgba(0,0,0,0.02);
        }}
        .info-row {{
            display: flex;
            margin-bottom: 8px;
            font-size: 12.5px;
        }}
        .info-row:last-child {{ margin-bottom: 0; }}
        .info-label {{
            font-weight: 600;
            width: 130px;
            color: #34495e;
            display: flex;
            align-items: center;
        }}
        .info-value {{
            flex-grow: 1;
            color: #2c3e50;
            font-weight: 500;
        }}
        .highlight-box {{
            background: #f0f4f8;
            border: 1px solid #d9e2ec;
        }}

        /* Table */
        table {{
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            margin-bottom: 25px;
            border: 1px solid #e1e8ed;
            border-radius: 8px;
            overflow: hidden;
        }}
        th, td {{
            padding: 10px 12px;
            text-align: center;
            border-bottom: 1px solid #e1e8ed;
            border-right: 1px solid #e1e8ed;
        }}
        th:last-child, td:last-child {{ border-right: none; }}
        tbody tr:last-child td {{ border-bottom: none; }}
        
        th {{
            background-color: #004269;
            color: #ffffff;
            font-weight: 600;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        tbody tr:nth-child(even) {{ background-color: #f8fafc; }}
        
        td.left-align {{ text-align: left; }}
        td.right-align {{ text-align: right; font-variant-numeric: tabular-nums; }}

        /* Table totals */
        .totals-row td {{
            font-weight: 600;
            background-color: #ffffff;
        }}
        .totals-row.final-total td {{
            background-color: #004269;
            color: #ffffff;
            font-weight: 700;
            font-size: 14px;
        }}
        
        /* Spacer */
        .spacer-row td {{
            height: 30px;
            background-color: #ffffff !important;
        }}

        /* Footer Info */
        .footer-info {{
            display: flex;
            justify-content: space-between;
            margin-bottom: 25px;
            font-size: 12.5px;
        }}
        .contact-person {{
            width: 48%;
            background: #f8fafc;
            padding: 12px;
            border-radius: 6px;
            border-left: 3px solid #004269;
        }}
        .contact-person p {{ margin: 4px 0; }}
        
        .notes {{ width: 48%; }}
        .notes p {{ margin: 4px 0; font-weight: 600; color: #34495e;}}
        .notes-line {{
            height: 30px;
            border-bottom: 1px dashed #bdc3c7;
            margin-top: 10px;
        }}

        /* General Notes */
        .general-notes {{
            margin-bottom: 40px;
            font-size: 12px;
            color: #556b7d;
        }}
        .general-notes p {{ margin: 5px 0; }}
        .thanks {{
            font-weight: 700;
            color: #004269;
            font-size: 13px;
        }}
        
        .note-list {{
            margin-top: 12px;
            background: #f8fafc;
            padding: 10px 15px;
            border-radius: 6px;
            border: 1px solid #e1e8ed;
        }}
        .note-list p {{ margin: 4px 0; }}

        /* Signatures */
        .signatures {{
            display: flex;
            justify-content: space-around;
            margin-bottom: 40px;
        }}
        .signature-box {{
            text-align: center;
            width: 200px;
        }}
        .signature-box strong {{
            display: block;
            margin-bottom: 5px;
            font-size: 14px;
            color: #004269;
        }}
        .signature-box .sub {{
            font-style: italic;
            color: #7f8c8d;
            font-size: 12px;
        }}
        
        /* Bottom Footer */
        .bottom-footer {{
            position: absolute;
            bottom: 15mm; left: 15mm; right: 15mm;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #95a5a6;
            border-top: 1px solid #e1e8ed;
            padding-top: 8px;
        }}

        .highlight-text {{ font-weight: 700; color: #004269; }}
        .icon {{ width: 14px; margin-right: 6px; vertical-align: middle; color: #336887; }}
    </style>
</head>
<body>
    <div class="page">
        <div class="top-accent"></div>
        
        <!-- Header -->
        <div class="header">
            <div class="logo-container">
                <img src="data:image/png;base64,{logo_b64}" alt="Logo Hiệp Lực">
            </div>
            <div class="company-info">
                <h1 class="company-name">CTY TNHH CƠ KHÍ CHẾ TẠO TM HIỆP LỰC</h1>
                <p class="slogan">"Hiệp lực giá trị thực cho cuộc sống"</p>
                <div class="company-details">
                    <p><b>MST:</b> 0304237988 &nbsp;|&nbsp; <b>STK:</b> 117000018926 - NGÂN HÀNG CÔNG THƯƠNG, CN ĐÔNG SÀI GÒN</p>
                    <p><b>Địa chỉ:</b> Số 37 đường 357, Khu nhà ở Phước Long B, Phường Phước Long B, TP.Thủ Đức, TPHCM</p>
                </div>
            </div>
        </div>

        <!-- Title -->
        <div class="title-section">
            <h1>Báo Giá</h1>
            <h2>Kính Gửi Đến Khách Hàng</h2>
        </div>

        <!-- Info Boxes -->
        <div class="info-grid">
            <div class="info-box">
                <div class="info-row">
                    <div class="info-label">Khách hàng:</div>
                    <div class="info-value highlight-text">Chị Minh</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Điện thoại:</div>
                    <div class="info-value">0919 969979</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Email:</div>
                    <div class="info-value">minh.bui@coats.com</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Công ty:</div>
                    <div class="info-value">TNHH Coats Phong Phú</div>
                </div>
            </div>
            
            <div class="info-box highlight-box">
                <div class="info-row">
                    <div class="info-label">Ngày báo giá:</div>
                    <div class="info-value">10/04/2026</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Mã khách hàng:</div>
                    <div class="info-value">Co-01002</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Hiệu lực đến:</div>
                    <div class="info-value">25/04/2026</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Số Báo Giá:</div>
                    <div class="info-value highlight-text" style="font-size: 14px;">26-04/3770</div>
                </div>
            </div>
        </div>

        <!-- Table -->
        <table>
            <thead>
                <tr>
                    <th style="width: 6%;">STT</th>
                    <th style="width: 36%;">Nội dung/ Công Việc</th>
                    <th style="width: 8%;">ĐVT</th>
                    <th style="width: 10%;">Số lượng</th>
                    <th style="width: 15%;">Đơn giá</th>
                    <th style="width: 15%;">Thành Tiền (VNĐ)</th>
                    <th style="width: 10%;">Ghi Chú</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>1</td>
                    <td class="left-align">Thay the ong tam carier DYE18D</td>
                    <td>Cái</td>
                    <td>1</td>
                    <td class="right-align">2.000.000</td>
                    <td class="right-align">2.000.000</td>
                    <td></td>
                </tr>
                <tr>
                    <td>2</td>
                    <td class="left-align">Sua chua motor, truc khuay may DYE4P3</td>
                    <td>Cái</td>
                    <td>1</td>
                    <td class="right-align">3.312.000</td>
                    <td class="right-align">3.312.000</td>
                    <td></td>
                </tr>
                <tr>
                    <td>3</td>
                    <td class="left-align">PR 9511826 Sua chua canh quat bom may DYE24I</td>
                    <td>Cái</td>
                    <td>1</td>
                    <td class="right-align">2.470.000</td>
                    <td class="right-align">2.470.000</td>
                    <td></td>
                </tr>
                <tr>
                    <td>4</td>
                    <td class="left-align">Han lai diem xi tren nap may DYE10A</td>
                    <td>Cái</td>
                    <td>1</td>
                    <td class="right-align">4.550.000</td>
                    <td class="right-align">4.550.000</td>
                    <td></td>
                </tr>
                
                <tr class="spacer-row"><td colspan="7"></td></tr>
                
                <tr class="totals-row">
                    <td colspan="5" class="right-align">Tổng tiền chưa thuế</td>
                    <td class="right-align">12.332.000</td>
                    <td></td>
                </tr>
                <tr class="totals-row">
                    <td colspan="5" class="right-align">Thuế VAT (8%)</td>
                    <td class="right-align">986.560</td>
                    <td></td>
                </tr>
                <tr class="totals-row final-total">
                    <td colspan="5" class="right-align">TỔNG CỘNG THÀNH TIỀN (VNĐ)</td>
                    <td class="right-align">13.318.560</td>
                    <td></td>
                </tr>
            </tbody>
        </table>

        <!-- Footer Info -->
        <div class="footer-info">
            <div class="contact-person">
                <p><b>Người phụ trách:</b> Phan Văn Khải</p>
                <p><b>Điện thoại liên lạc:</b> 0764 217 145</p>
                <p><b>Email:</b> hc.hiepluc@gmail.com</p>
            </div>
            <div class="notes">
                <p>Ghi chú đặc biệt của khách hàng nếu có:</p>
                <div class="notes-line"></div>
            </div>
        </div>

        <!-- General Notes -->
        <div class="general-notes">
            <p class="thanks">Cám ơn sự hợp tác của quý khách hàng!</p>
            <p>Mọi thông tin liên quan, quý khách vui lòng liên hệ: <span class="highlight-text">Lê Hoàng Thông (Mr)</span></p>
            <p>Điện thoại: <b>0919 370 575</b> &nbsp;|&nbsp; Email: <b>congtyhiepluc@yahoo.com</b></p>
            
            <div class="note-list">
                <p><b>Lưu ý:</b></p>
                <p>1. Thời gian thực hiện: <b>1-2 tuần.</b></p>
                <p>2. Hình thức thanh toán: <b>Chuyển khoản trong khoảng thời gian 90 ngày sau ngày hóa đơn.</b></p>
            </div>
        </div>

        <!-- Signatures -->
        <div class="signatures">
            <div class="signature-box">
                <strong>Kế toán</strong>
                <span class="sub">(Ký, ghi rõ họ tên)</span>
            </div>
            <div class="signature-box">
                <strong>Giám đốc</strong>
                <span class="sub">(Ký, ghi rõ họ tên & đóng dấu)</span>
            </div>
        </div>

        <!-- Bottom Footer -->
        <div class="bottom-footer">
            <span>D:/HL/QT</span>
            <span>Trang 1/1</span>
            <span>F-FL-QT-01</span>
        </div>
    </div>
</body>
</html>"""

with open('PR_template.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

print("Created PR_template.html successfully")
