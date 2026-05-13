class DataProcessor {
    constructor(sheetId) {
        this.sheetId = sheetId;
        this.glBalances = {};
        this.bsData = [];
        this.results = {}; // Map code -> value
    }

    async fetchData(sheetName) {
        const url = `https://docs.google.com/spreadsheets/d/${this.sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
        const response = await fetch(url);
        const text = await response.text();
        return this.parseCSV(text);
    }

    parseCSV(text) {
        const lines = text.split('\n');
        const headers = lines[0].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g).map(h => h.replace(/"/g, ''));
        const results = [];

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            // Simple CSV split (handles quotes)
            const values = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g).map(v => v.replace(/"/g, ''));
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
        glJournal.forEach(row => {
            const drAcc = row.Dr_Account;
            const crAcc = row.Cr_Account;
            const amount = parseFloat((row.Amount || "0").replace(/,/g, ''));

            if (drAcc) {
                this.glBalances[drAcc] = (this.glBalances[drAcc] || 0) + amount;
            }
            if (crAcc) {
                this.glBalances[crAcc] = (this.glBalances[crAcc] || 0) - amount;
            }
        });
        console.log("GL Balances:", this.glBalances);
    }

    getAccountValue(rule) {
        if (!rule) return 0;
        const accounts = rule.split(',').map(a => a.trim());
        let total = 0;
        accounts.forEach(acc => {
            // Match main account (e.g. 111 matches 1111, 1112)
            for (const glAcc in this.glBalances) {
                if (glAcc.startsWith(acc)) {
                    total += this.glBalances[glAcc];
                }
            }
        });
        return total;
    }

    evaluateRule(rule) {
        // Simple evaluator for rules like "110+120-130"
        if (!rule) return 0;
        
        // Replace codes with their values
        // We use a regex to find all numeric codes
        let expression = rule.replace(/[0-9]+/g, (match) => {
            return this.results[match] || 0;
        });

        try {
            // Security: only allow basic math characters
            if (/^[0-9+\-*/(). ]+$/.test(expression)) {
                return eval(expression);
            }
        } catch (e) {
            console.error("Error evaluating rule:", rule, expression);
        }
        return 0;
    }

    async process() {
        const glJournal = await this.fetchData("GL_Journal");
        const bsDefinition = await this.fetchData("Balance_Sheet_Definition");

        this.calculateGLBalances(glJournal);
        this.bsData = bsDefinition;

        // Pass 1: Calculate all "Account" types
        this.bsData.forEach(item => {
            if (item.Type === "Account") {
                this.results[item.Code] = this.getAccountValue(item.Rule);
            }
        });

        // Pass 2: Calculate "Calculation" types (multiple passes to handle dependencies)
        // A better way is recursive or topological sort, but for BS 5 passes is usually enough
        for (let pass = 0; pass < 5; pass++) {
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
