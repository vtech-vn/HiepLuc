const SHEET_ID = '1DT_CB50Qt_OurUxzX4UwkyIWnu-vqg2nFEpA8mxd_MA';
const processor = new DataProcessor(SHEET_ID);

let assetsChart, capitalChart;

async function init() {
    // Set default date to today
    const dateInput = document.getElementById('as-of-date');
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    processor.setAsOfDate(today);

    await loadData();

    document.getElementById('refresh-btn').addEventListener('click', async () => {
        processor.setAsOfDate(dateInput.value);
        await loadData();
        showNotification('Đã cập nhật số liệu!');
    });

    dateInput.addEventListener('change', () => {
        // Option: Auto-refresh on date change
    });
}

async function loadData() {
    const loader = document.getElementById('report-body');
    loader.innerHTML = '<tr><td colspan="4" class="text-center">🔄 Đang tính toán dữ liệu...</td></tr>';
    
    try {
        const report = await processor.process();
        renderTable(report);
        renderSummary(report.values);
        renderCharts(report.values);
    } catch (error) {
        console.error(error);
        showNotification('Lỗi khi tải dữ liệu', 'error');
    }
}

function formatCurrency(value) {
    return new Intl.NumberFormat('vi-VN', { 
        style: 'decimal', 
        minimumFractionDigits: 0,
        maximumFractionDigits: 0 
    }).format(value) + ' ₫';
}

function renderSummary(values) {
    document.getElementById('total-assets').innerText = formatCurrency(values["270"] || 0);
    document.getElementById('total-liabilities').innerText = formatCurrency(values["300"] || 0);
    document.getElementById('total-equity').innerText = formatCurrency(values["400"] || 0);
}

function renderTable(report) {
    const tbody = document.getElementById('report-body');
    tbody.innerHTML = '';

    report.definition.forEach(item => {
        const value = report.values[item.Code] || 0;
        if (!item.Code && !item.Name) return;

        const row = document.createElement('tr');
        let level = 2;
        if (item.Code.endsWith('00')) level = 0;
        else if (item.Code.endsWith('0')) level = 1;
        
        row.className = `row-level-${level}`;
        row.innerHTML = `
            <td>${item.Code || ''}</td>
            <td style="padding-left: ${level * 20 + 16}px">${item.Name}</td>
            <td class="text-right ${value < 0 ? 'negative-value' : ''}">${formatCurrency(value)}</td>
            <td class="text-right">0 ₫</td>
        `;
        tbody.appendChild(row);
    });
}

function renderCharts(values) {
    const ctxCapital = document.getElementById('capital-chart').getContext('2d');
    const ctxAssets = document.getElementById('assets-chart').getContext('2d');

    if (capitalChart) capitalChart.destroy();
    if (assetsChart) assetsChart.destroy();

    const liab = Math.abs(values["300"] || 0);
    const equity = Math.abs(values["400"] || 0);

    capitalChart = new Chart(ctxCapital, {
        type: 'pie',
        data: {
            labels: ['Nợ phải trả', 'Vốn chủ sở hữu'],
            datasets: [{
                data: [liab, equity],
                backgroundColor: ['#ef4444', '#f59e0b'],
                borderWidth: 0
            }]
        },
        options: {
            plugins: { legend: { position: 'bottom' } }
        }
    });

    const cash = Math.abs(values["110"] || 0);
    const rec = Math.abs(values["130"] || 0);
    const inv = Math.abs(values["140"] || 0);
    const fixed = Math.abs(values["220"] || 0);

    assetsChart = new Chart(ctxAssets, {
        type: 'bar',
        data: {
            labels: ['Tiền', 'Phải thu', 'Tồn kho', 'TSCĐ'],
            datasets: [{
                label: 'Giá trị',
                data: [cash, rec, inv, fixed],
                backgroundColor: '#2563eb',
                borderRadius: 4
            }]
        },
        options: {
            scales: { y: { beginAtZero: true } },
            plugins: { legend: { display: false } }
        }
    });
}

function showNotification(message, type = 'success') {
    const container = document.getElementById('notification-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// Minimal notification style
const style = document.createElement('style');
style.textContent = `
    #notification-container { position: fixed; bottom: 20px; right: 20px; z-index: 1000; }
    .toast { background: white; border: 1px solid #e2e8f0; color: #1e293b; padding: 10px 20px; border-radius: 8px; margin-top: 10px; transition: opacity 0.5s; box-shadow: var(--shadow-lg); border-left: 4px solid #2563eb; }
    .toast-error { border-left-color: #ef4444; }
`;
document.head.appendChild(style);

init();
