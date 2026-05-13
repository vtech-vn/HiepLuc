const SHEET_ID = '1DT_CB50Qt_OurUxzX4UwkyIWnu-vqg2nFEpA8mxd_MA';
const processor = new DataProcessor(SHEET_ID);

let assetsChart, capitalChart;

async function init() {
    updateDate();
    await loadData();

    document.getElementById('refresh-btn').addEventListener('click', async () => {
        const btn = document.getElementById('refresh-btn');
        btn.innerHTML = '🔄 Đang cập nhật...';
        btn.disabled = true;
        await loadData();
        btn.innerHTML = '<span class="icon">🔄</span> Làm mới dữ liệu';
        btn.disabled = false;
        showNotification('Dữ liệu đã được cập nhật!');
    });
}

function updateDate() {
    const now = new Date();
    document.getElementById('current-date').innerText = `Cập nhật lúc: ${now.toLocaleDateString('vi-VN')} ${now.toLocaleTimeString('vi-VN')}`;
}

async function loadData() {
    try {
        const report = await processor.process();
        renderTable(report);
        renderSummary(report.values);
        renderCharts(report.values);
    } catch (error) {
        console.error("Error loading data:", error);
        showNotification('Lỗi khi tải dữ liệu. Vui lòng kiểm tra kết nối mạng.', 'error');
    }
}

function formatCurrency(value) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

function renderSummary(values) {
    const assets = values["270"] || 0;
    const liabilities = values["300"] || 0;
    const equity = values["400"] || 0;

    document.getElementById('total-assets').innerText = formatCurrency(assets);
    document.getElementById('total-liabilities').innerText = formatCurrency(liabilities);
    document.getElementById('total-equity').innerText = formatCurrency(equity);

    // Animate numbers (optional enhancement)
}

function renderTable(report) {
    const tbody = document.getElementById('report-body');
    tbody.innerHTML = '';

    report.definition.forEach(item => {
        const value = report.values[item.Code] || 0;
        const row = document.createElement('tr');
        
        // Determine level based on indentation or code hierarchy
        let level = 2;
        if (item.Code.endsWith('00')) level = 0;
        else if (item.Code.endsWith('0')) level = 1;
        
        row.className = `row-level-${level}`;
        
        row.innerHTML = `
            <td>${item.Code}</td>
            <td>${item.Name}</td>
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
        type: 'doughnut',
        data: {
            labels: ['Nợ phải trả', 'Vốn chủ sở hữu'],
            datasets: [{
                data: [liab, equity],
                backgroundColor: ['#f43f5e', '#f59e0b'],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            cutout: '70%',
            plugins: {
                legend: { position: 'bottom', labels: { color: '#94a3b8', font: { family: 'Inter' } } }
            }
        }
    });

    // Asset Breakdown (Simplified)
    const cash = Math.abs(values["110"] || 0);
    const receivables = Math.abs(values["130"] || 0);
    const inventory = Math.abs(values["140"] || 0);
    const fixedAssets = Math.abs(values["220"] || 0);
    const other = Math.abs(values["270"] || 0) - (cash + receivables + inventory + fixedAssets);

    assetsChart = new Chart(ctxAssets, {
        type: 'bar',
        data: {
            labels: ['Tiền', 'Phải thu', 'Tồn kho', 'TSCĐ', 'Khác'],
            datasets: [{
                label: 'Giá trị',
                data: [cash, receivables, inventory, fixedAssets, Math.max(0, other)],
                backgroundColor: '#3b82f6',
                borderRadius: 8
            }]
        },
        options: {
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            },
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

// Initial style for toast
const style = document.createElement('style');
style.textContent = `
    #notification-container { position: fixed; bottom: 20px; right: 20px; z-index: 1000; }
    .toast { background: #13171f; border: 1px solid var(--glass-border); color: white; padding: 12px 24px; border-radius: 12px; margin-top: 10px; transition: opacity 0.5s; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
    .toast-success { border-left: 4px solid var(--accent-emerald); }
    .toast-error { border-left: 4px solid var(--accent-rose); }
`;
document.head.appendChild(style);

init();
