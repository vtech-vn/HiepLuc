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
    }

    async fetchData(sheetName) {
        const url = `https://docs.google.com/spreadsheets/d/${this.sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
        const response = await fetch(url);
        const text = await response.text();
        return this.parseCSV(text);
    }

    parseCSV(text) {
        const lines = text.split('\n');
        if (lines.length < 1) return [];
        const headers = lines[0].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g).map(h => h.replace(/"/g, ''));
        const results = [];
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const values = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g).map(v => v.replace(/"/g, ''));
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = (values[index] || "").trim();
            });
            results.push(obj);
        }
        return results;
    }

    calculateGLBalances(glJournal) {
        this.glBalances = {};
        const cutoff = this.asOfDate;

        glJournal.forEach(row => {
            // Flexible date parsing
            const rowDate = this.parseSheetDate(row.Accounting_Date);
            if (!rowDate || rowDate > cutoff) return;

            const drAcc = row.Dr_Account;
            const crAcc = row.Cr_Account;
            const amount = parseFloat((row.Amount || "0").replace(/,/g, ''));

            if (drAcc) this.glBalances[drAcc] = (this.glBalances[drAcc] || 0) + amount;
            if (crAcc) this.glBalances[crAcc] = (this.glBalances[crAcc] || 0) - amount;
        });
    }

    parseSheetDate(dateStr) {
        if (!dateStr) return null;
        // Handles multiple formats (DD-Mon-YYYY, M/D/YYYY, YYYY-MM-DD)
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) return d;
        
        // Fallback for custom formats if needed
        return null;
    }

    getAccountValue(rule) {
        if (!rule) return 0;
        const accounts = rule.split(',').map(a => a.trim());
        let total = 0;
        accounts.forEach(acc => {
            for (const glAcc in this.glBalances) {
                if (glAcc.startsWith(acc)) {
                    total += this.glBalances[glAcc];
                }
            }
        });
        return total;
    }

    evaluateRule(rule) {
        if (!rule) return 0;
        let expression = rule.replace(/[0-9]+/g, (match) => {
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

        // Pass 1: Account types
        this.bsData.forEach(item => {
            if (item.Type === "Account") {
                this.results[item.Code] = this.getAccountValue(item.Rule);
            }
        });

        // Pass 2: Calculation types
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
