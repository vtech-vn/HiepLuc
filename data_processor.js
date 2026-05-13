class DataProcessor {
    constructor(sheetId) {
        this.sheetId = sheetId;
        this.glBalances = {};
        this.bsData = [];
        this.results = {};
        this.asOfDate = new Date();
    }

    setAsOfDate(dateStr) {
        this.asOfDate = new Date(dateStr);
        // Set to end of day to include transactions on that day
        this.asOfDate.setHours(23, 59, 59, 999);
    }

    async fetchData(sheetName) {
        const url = `https://docs.google.com/spreadsheets/d/${this.sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
        const response = await fetch(url);
        const text = await response.text();
        return this.parseCSV(text);
    }

    parseCSV(text) {
        const lines = text.split(/\r?\n/);
        if (lines.length < 1) return [];
        
        // Improved CSV parsing to handle commas inside quotes
        const parseLine = (line) => {
            const result = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') inQuotes = !inQuotes;
                else if (char === ',' && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            result.push(current.trim());
            return result.map(v => v.replace(/^"|"$/g, ''));
        };

        const headers = parseLine(lines[0]);
        const results = [];
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const values = parseLine(lines[i]);
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = values[index] || "";
            });
            results.push(obj);
        }
        return results;
    }

    calculateGLBalances(glJournal) {
        this.glBalances = {};
        const cutoff = this.asOfDate;

        glJournal.forEach(row => {
            const rowDate = this.parseSheetDate(row.Accounting_Date);
            if (!rowDate || rowDate > cutoff) return;

            const drAcc = String(row.Dr_Account || "").trim();
            const crAcc = String(row.Cr_Account || "").trim();
            const amount = this.parseAmount(row.Amount);

            if (drAcc) this.glBalances[drAcc] = (this.glBalances[drAcc] || 0) + amount;
            if (crAcc) this.glBalances[crAcc] = (this.glBalances[crAcc] || 0) - amount;
        });
        console.log("Calculated Balances:", this.glBalances);
    }

    parseAmount(val) {
        if (!val) return 0;
        // Remove commas and handle parentheses for negative numbers
        let clean = String(val).replace(/,/g, '');
        if (clean.startsWith('(') && clean.endsWith(')')) {
            clean = '-' + clean.substring(1, clean.length - 1);
        }
        return parseFloat(clean) || 0;
    }

    parseSheetDate(dateStr) {
        if (!dateStr) return null;
        
        // Handle DD-Mon-YYYY (e.g. 20-Mar-2026)
        if (dateStr.includes('-')) {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                const months = {
                    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
                    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
                };
                const day = parseInt(parts[0]);
                const month = months[parts[1]];
                const year = parseInt(parts[2]);
                if (!isNaN(day) && month !== undefined && !isNaN(year)) {
                    return new Date(year, month, day);
                }
            }
        }

        // Handle D/M/YYYY or M/D/YYYY
        // Defaulting to Vietnamese/Common format D/M/YYYY
        if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length === 3) {
                const p1 = parseInt(parts[0]);
                const p2 = parseInt(parts[1]);
                const p3 = parseInt(parts[2]);
                // Assume D/M/YYYY if year is the 3rd part
                if (p3 > 1000) return new Date(p3, p2 - 1, p1);
                // Assume YYYY/M/D if year is the 1st part
                if (p1 > 1000) return new Date(p1, p2 - 1, p3);
            }
        }

        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? null : d;
    }

    getAccountValue(rule) {
        if (!rule) return 0;
        const accounts = rule.split(',').map(a => a.trim());
        let total = 0;
        accounts.forEach(acc => {
            for (const glAcc in this.glBalances) {
                // Exact match or sub-account match (e.g. 111 matches 1111)
                if (glAcc === acc || glAcc.startsWith(acc)) {
                    total += this.glBalances[glAcc];
                }
            }
        });
        return total;
    }

    evaluateRule(rule) {
        if (!rule) return 0;
        // Match numbers that are not part of other words (e.g. 110 but not 1111)
        let expression = rule.replace(/\b[0-9]+\b/g, (match) => {
            return this.results[match] || 0;
        });
        try {
            if (/^[0-9+\-*/(). ]+$/.test(expression)) {
                return eval(expression);
            }
        } catch (e) {}
        return 0;
    }

    async process() {
        const glJournal = await this.fetchData("GL_Journal");
        const bsDefinition = await this.fetchData("Balance_Sheet_Definition");

        this.calculateGLBalances(glJournal);
        this.bsData = bsDefinition;
        this.results = {};

        this.bsData.forEach(item => {
            if (item.Type === "Account") {
                this.results[item.Code] = this.getAccountValue(item.Rule);
            }
        });

        for (let p = 0; p < 5; p++) {
            this.bsData.forEach(item => {
                if (item.Type === "Calculation") {
                    this.results[item.Code] = this.evaluateRule(item.Rule);
                }
            });
        }

        return {
            definition: this.bsData,
            values: this.results
        };
    }
}
